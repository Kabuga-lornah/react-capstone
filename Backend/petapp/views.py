import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from .models import (
    AdoptionApplication,
    CommunityComment,
    CommunityPost,
    CommunityReaction,
    Conversation,
    ConversationMessage,
    CustomUser,
    Notification,
    Pet,
    PetWishlist,
)
from .serializers import (
    AdoptionApplicationSerializer,
    ConversationMessageCreateSerializer,
    ConversationSerializer,
    CommunityCommentCreateSerializer,
    CommunityCommentSerializer,
    CommunityPostSerializer,
    NotificationSerializer,
    PetSerializer,
    PetWishlistSerializer,
    RehomerVerificationSubmitSerializer,
    RegisterSerializer,
    GoogleAuthSerializer,
    UserSerializer,
    UserProfileUpdateSerializer,
    VisitPlanUpdateSerializer,
    AppTokenObtainPairSerializer,
)

ALLOWED_PET_MANAGER_ROLES = {'rehomer', 'shelter_admin'}
ADMIN_ROLES = {'shelter_admin', 'platform_admin'}


def ensure_admin(user):
    if user.role not in ADMIN_ROLES:
        raise PermissionDenied('Only admins can access this resource.')


def get_conversation_for_user_or_404(user, pk):
    conversation = generics.get_object_or_404(
        Conversation.objects.select_related('pet', 'adopter', 'rehomer', 'pet__owner', 'pet__shelter')
        .prefetch_related('pet__images', 'messages__sender'),
        pk=pk,
    )

    if conversation.adopter_id != user.id and conversation.rehomer_id != user.id:
        raise PermissionDenied('You do not have access to this conversation.')

    return conversation


def create_notification(
    *,
    recipient,
    actor,
    pet,
    type,
    title,
    message,
    application=None,
    conversation=None,
    allow_self=False,
):
    if not recipient or not actor or (recipient == actor and not allow_self):
        return

    Notification.objects.create(
        recipient=recipient,
        actor=actor,
        pet=pet,
        application=application,
        conversation=conversation,
        type=type,
        title=title,
        message=message,
    )


def issue_auth_payload(user, request):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user, context={'request': request}).data,
    }


def build_unique_username(email):
    base_username = (email or 'google-user').strip().lower() or 'google-user'
    username = base_username
    suffix = 1

    while CustomUser.objects.filter(username__iexact=username).exists():
        username = f'{base_username}-{suffix}'
        suffix += 1

    return username


def verify_google_id_token(id_token):
    query = urlencode({'id_token': id_token})
    url = f'https://oauth2.googleapis.com/tokeninfo?{query}'

    try:
        with urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore') or 'Google rejected the token.'
        raise ValidationError({'detail': detail})
    except URLError:
        raise ValidationError({'detail': 'Unable to verify the Google token right now. Please try again.'})


class AppTokenObtainPairView(TokenObtainPairView):
    serializer_class = AppTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.GOOGLE_OAUTH_CLIENT_IDS:
            raise ValidationError({'detail': 'Google login is not configured on the server yet.'})

        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        google_payload = verify_google_id_token(serializer.validated_data['id_token'])
        audience = (google_payload.get('aud') or '').strip()
        email = (google_payload.get('email') or '').strip().lower()
        email_verified = str(google_payload.get('email_verified', '')).lower() == 'true'

        if audience not in settings.GOOGLE_OAUTH_CLIENT_IDS:
            raise ValidationError({'detail': 'This Google token was issued for a different app.'})

        if not email:
            raise ValidationError({'detail': 'Google did not return an email address for this account.'})

        if not email_verified:
            raise ValidationError({'detail': 'Please use a Google account with a verified email address.'})

        user = CustomUser.objects.filter(email__iexact=email).first()
        if user is None:
            user = CustomUser(
                username=build_unique_username(email),
                email=email,
                first_name=(google_payload.get('given_name') or '').strip(),
                last_name=(google_payload.get('family_name') or '').strip(),
                role=serializer.validated_data['role'],
                profile_photo_url=(google_payload.get('picture') or '').strip(),
                email_verified=True,
            )
            user.set_unusable_password()
            user.save()
        else:
            updated_fields = []

            if not user.first_name and google_payload.get('given_name'):
                user.first_name = google_payload['given_name'].strip()
                updated_fields.append('first_name')

            if not user.last_name and google_payload.get('family_name'):
                user.last_name = google_payload['family_name'].strip()
                updated_fields.append('last_name')

            if not user.profile_photo_url and google_payload.get('picture'):
                user.profile_photo_url = google_payload['picture'].strip()
                updated_fields.append('profile_photo_url')

            if not user.email_verified:
                user.email_verified = True
                updated_fields.append('email_verified')

            if updated_fields:
                user.save(update_fields=updated_fields)

        return Response(issue_auth_payload(user, request), status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return UserProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def partial_update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(UserSerializer(instance, context={'request': request}).data)


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ensure_admin(request.user)

        pending_rehomers = CustomUser.objects.filter(
            role=CustomUser.REHOMER,
            rehomer_verification_status=CustomUser.PENDING,
        ).order_by('-rehomer_verification_submitted_at')

        recent_pets = (
            Pet.objects.select_related('owner', 'shelter')
            .prefetch_related('images')
            .order_by('-created_at')[:12]
        )

        recent_applications = (
            AdoptionApplication.objects.select_related('pet', 'applicant', 'pet__owner', 'pet__shelter')
            .prefetch_related('pet__images')
            .order_by('-created_at')[:12]
        )

        return Response(
            {
                'counts': {
                    'pending_rehomer_reviews': pending_rehomers.count(),
                    'total_rehomers': CustomUser.objects.filter(role=CustomUser.REHOMER).count(),
                    'total_users': CustomUser.objects.count(),
                    'total_pets': Pet.objects.count(),
                    'pending_applications': AdoptionApplication.objects.filter(
                        status=AdoptionApplication.PENDING,
                    ).count(),
                },
                'pending_rehomers': UserSerializer(
                    pending_rehomers,
                    many=True,
                    context={'request': request},
                ).data,
                'recent_pets': PetSerializer(
                    recent_pets,
                    many=True,
                    context={'request': request},
                ).data,
                'recent_applications': AdoptionApplicationSerializer(
                    recent_applications,
                    many=True,
                    context={'request': request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class AdminUserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ensure_admin(self.request.user)
        return CustomUser.objects.all().order_by('-date_joined', '-id')


class AdminPetListView(generics.ListAPIView):
    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        ensure_admin(self.request.user)
        return (
            Pet.objects.select_related('owner', 'shelter')
            .prefetch_related('images')
            .order_by('-created_at')
        )


class AdminRehomerReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ensure_admin(request.user)

        user = generics.get_object_or_404(CustomUser, pk=pk, role=CustomUser.REHOMER)
        next_status = request.data.get('status')
        notes = (request.data.get('notes') or '').strip()

        if next_status not in {CustomUser.VERIFIED, CustomUser.REJECTED}:
            raise ValidationError({'status': 'Status must be verified or rejected.'})

        user.rehomer_verification_status = next_status
        user.rehomer_verification_reviewed_at = timezone.now()
        user.rehomer_verification_notes = notes
        user.save(
            update_fields=[
                'rehomer_verification_status',
                'rehomer_verification_reviewed_at',
                'rehomer_verification_notes',
            ],
        )

        return Response(
            UserSerializer(user, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class RehomerVerificationSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ALLOWED_PET_MANAGER_ROLES:
            raise PermissionDenied('Only rehomers or shelter admins can submit rehomer verification.')

        serializer = RehomerVerificationSubmitSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                'detail': 'Verification submitted. You can list pets once approved.',
                'status': request.user.rehomer_verification_status,
            },
            status=status.HTTP_200_OK,
        )


class AuthHeartbeatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        request.user.last_seen = timezone.now()
        request.user.save(update_fields=['last_seen'])
        return Response(
            {
                'last_seen': request.user.last_seen,
                'is_online': request.user.is_online,
                'activity_status': request.user.activity_status,
            },
            status=status.HTTP_200_OK,
        )


class ConversationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = (
            Conversation.objects.filter(adopter=request.user)
            | Conversation.objects.filter(rehomer=request.user)
        )
        conversations = (
            conversations.select_related('pet', 'adopter', 'rehomer', 'pet__owner', 'pet__shelter')
            .prefetch_related('pet__images', 'messages__sender')
            .distinct()
            .order_by('-updated_at')
        )

        return Response(
            ConversationSerializer(
                conversations,
                many=True,
                context={'request': request},
            ).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        pet_id = request.data.get('pet_id')

        if not pet_id:
            raise ValidationError({'pet_id': 'Pet is required.'})

        pet = generics.get_object_or_404(
            Pet.objects.select_related('owner', 'shelter').prefetch_related('images'),
            pk=pet_id,
        )

        if request.user.role != CustomUser.ADOPTER:
            raise PermissionDenied('Only adopters can start a chat from a pet listing.')

        if pet.owner_id == request.user.id:
            raise ValidationError('You cannot chat with yourself about your own pet.')

        if not pet.owner_id:
            raise ValidationError('This pet does not have an active rehomer yet.')

        conversation, created = Conversation.objects.get_or_create(
            pet=pet,
            adopter=request.user,
            rehomer=pet.owner,
        )

        serializer = ConversationSerializer(conversation, context={'request': request})
        return Response(
            {
                **serializer.data,
                'created': created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ConversationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        conversation = get_conversation_for_user_or_404(request.user, pk)
        unread_messages = conversation.messages.filter(read_at__isnull=True).exclude(sender=request.user)
        unread_messages.update(read_at=timezone.now())
        conversation = get_conversation_for_user_or_404(request.user, pk)

        return Response(
            ConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class ConversationMessageCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        conversation = get_conversation_for_user_or_404(request.user, pk)
        serializer = ConversationMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = ConversationMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            body=serializer.validated_data['body'],
        )
        conversation.save(update_fields=['updated_at'])

        recipient = (
            conversation.rehomer
            if request.user.id == conversation.adopter_id
            else conversation.adopter
        )
        actor_name = request.user.get_full_name().strip() or request.user.username or request.user.email
        linked_application = AdoptionApplication.objects.filter(
            pet=conversation.pet,
            applicant=conversation.adopter,
        ).order_by('-created_at').first()
        create_notification(
            recipient=recipient,
            actor=request.user,
            pet=conversation.pet,
            application=linked_application,
            conversation=conversation,
            type=Notification.CHAT_MESSAGE,
            title=f"New chat reply about {conversation.pet.name}",
            message=f"{actor_name} sent a new message about {conversation.pet.name}.",
        )

        conversation = get_conversation_for_user_or_404(request.user, pk)

        return Response(
            ConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class PetListView(generics.ListAPIView):
    serializer_class = PetSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Pet.objects.filter(status=Pet.AVAILABLE)
        species = self.request.query_params.get('species')
        city = self.request.query_params.get('city')
        state = self.request.query_params.get('state')
        country = self.request.query_params.get('country')
        status = self.request.query_params.get('status')

        if species:
            queryset = queryset.filter(species__iexact=species)
        if city:
            queryset = queryset.filter(city__iexact=city)
        if state:
            queryset = queryset.filter(state__iexact=state)
        if country:
            queryset = queryset.filter(country__iexact=country)
        if status:
            queryset = queryset.filter(status__iexact=status)

        return queryset.order_by('-created_at')


class PetDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer
    allowed_update_fields = {
        'location',
        'description',
        'image_url',
        'additional_image_url',
    }

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        pet = super().get_object()

        if (
            self.request.method != 'GET'
            and pet.owner != self.request.user
            and self.request.user.role not in ADMIN_ROLES
        ):
            raise PermissionDenied('You do not have permission to modify this pet.')

        return pet

    def partial_update(self, request, *args, **kwargs):
        invalid_fields = set(request.data.keys()) - self.allowed_update_fields
        if invalid_fields:
            raise ValidationError(
                f"You can only update listing notes or images. Unsupported fields: {', '.join(sorted(invalid_fields))}."
            )
        return super().partial_update(request, *args, **kwargs)


class MyPetListView(generics.ListAPIView):
    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Pet.objects.filter(owner=self.request.user).order_by('-created_at')


class PetCreateView(generics.CreateAPIView):
    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if request.user.role not in ALLOWED_PET_MANAGER_ROLES and request.user.role not in ADMIN_ROLES:
            raise PermissionDenied('Only rehomers or shelter admins can create pets.')
        if request.user.role == CustomUser.REHOMER and request.user.rehomer_verification_status != CustomUser.VERIFIED:
            raise PermissionDenied('Complete rehomer verification before listing pets.')
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class AdoptionApplicationCreateView(generics.CreateAPIView):
    serializer_class = AdoptionApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        pet = serializer.validated_data['pet']

        if self.request.user.role != 'adopter':
            raise PermissionDenied('Only adopters can submit adoption applications.')

        if pet.owner == self.request.user:
            raise ValidationError('You cannot apply to adopt your own pet.')

        existing_application = AdoptionApplication.objects.filter(
            pet=pet,
            applicant=self.request.user,
            status__in=[AdoptionApplication.PENDING, AdoptionApplication.APPROVED],
        ).exists()
        if existing_application:
            raise ValidationError('You already have an active application for this pet.')

        application = serializer.save(applicant=self.request.user)

        actor_name = self.request.user.get_full_name().strip() or self.request.user.username or self.request.user.email
        create_notification(
            recipient=pet.owner,
            actor=self.request.user,
            pet=pet,
            application=application,
            type=Notification.APPLICATION_SUBMITTED,
            title=f"New adoption request for {pet.name}",
            message=f"{actor_name} submitted an adoption request for {pet.name}.",
        )

        if application.preferred_visit_date or application.meeting_preference or application.meeting_location_notes:
            create_notification(
                recipient=pet.owner,
                actor=self.request.user,
                pet=pet,
                application=application,
                type=Notification.VISIT_PROPOSED,
                title=f"Visit proposed for {pet.name}",
                message=f"{actor_name} suggested a visit plan for {pet.name}.",
            )


class MyApplicationsListView(generics.ListAPIView):
    serializer_class = AdoptionApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AdoptionApplication.objects.filter(applicant=self.request.user).order_by('-created_at')


class ReceivedApplicationsListView(generics.ListAPIView):
    serializer_class = AdoptionApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AdoptionApplication.objects.filter(pet__owner=self.request.user).order_by('-created_at')


class ApplicationApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        application = generics.get_object_or_404(AdoptionApplication, pk=pk)

        if application.pet.owner != request.user:
            raise PermissionDenied('You do not have permission to approve this application.')
        if application.status != AdoptionApplication.PENDING:
            raise ValidationError('Only pending applications can be approved.')

        application.status = AdoptionApplication.APPROVED
        application.save(update_fields=['status', 'updated_at'])

        pet = application.pet
        pet.status = Pet.ADOPTED
        pet.save(update_fields=['status', 'updated_at'])

        AdoptionApplication.objects.filter(
            pet=pet,
            status=AdoptionApplication.PENDING,
        ).exclude(pk=application.pk).update(status=AdoptionApplication.REJECTED)

        actor_name = request.user.get_full_name().strip() or request.user.username or request.user.email
        create_notification(
            recipient=application.applicant,
            actor=request.user,
            pet=pet,
            application=application,
            type=Notification.APPLICATION_APPROVED,
            title=f"Request approved for {pet.name}",
            message=f"{actor_name} approved your adoption request for {pet.name}.",
        )

        serializer = AdoptionApplicationSerializer(application, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ApplicationRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        application = generics.get_object_or_404(AdoptionApplication, pk=pk)

        if application.pet.owner != request.user:
            raise PermissionDenied('You do not have permission to reject this application.')
        if application.status != AdoptionApplication.PENDING:
            raise ValidationError('Only pending applications can be rejected.')

        application.status = AdoptionApplication.REJECTED
        application.save(update_fields=['status', 'updated_at'])

        actor_name = request.user.get_full_name().strip() or request.user.username or request.user.email
        create_notification(
            recipient=application.applicant,
            actor=request.user,
            pet=application.pet,
            application=application,
            type=Notification.APPLICATION_REJECTED,
            title=f"Request updated for {application.pet.name}",
            message=f"{actor_name} marked your adoption request for {application.pet.name} as not approved.",
        )

        serializer = AdoptionApplicationSerializer(application, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ApplicationWithdrawView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        application = generics.get_object_or_404(AdoptionApplication, pk=pk)

        if application.applicant != request.user:
            raise PermissionDenied('You do not have permission to withdraw this application.')

        if application.status != AdoptionApplication.PENDING:
            raise ValidationError('Only active interest can be canceled.')

        application.status = AdoptionApplication.WITHDRAWN
        application.save(update_fields=['status', 'updated_at'])

        actor_name = request.user.get_full_name().strip() or request.user.username or request.user.email
        create_notification(
            recipient=application.pet.owner,
            actor=request.user,
            pet=application.pet,
            application=application,
            type=Notification.APPLICATION_WITHDRAWN,
            title=f"Interest canceled for {application.pet.name}",
            message=f"{actor_name} is no longer interested in {application.pet.name}.",
        )

        serializer = AdoptionApplicationSerializer(application, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ApplicationVisitPlanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        application = generics.get_object_or_404(AdoptionApplication, pk=pk)

        if request.user.id not in {application.applicant_id, application.pet.owner_id}:
            raise PermissionDenied('You do not have permission to update this visit plan.')

        serializer = VisitPlanUpdateSerializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if request.user.id == application.applicant_id:
            proposed_by = AdoptionApplication.VISIT_PROPOSED_BY_ADOPTER
            recipient = application.pet.owner
        else:
            proposed_by = AdoptionApplication.VISIT_PROPOSED_BY_REHOMER
            recipient = application.applicant

        application.visit_status = AdoptionApplication.VISIT_PROPOSED
        application.visit_proposed_by = proposed_by
        application.visit_confirmed_at = None
        application.save(update_fields=[
            'preferred_visit_date',
            'meeting_preference',
            'meeting_location_notes',
            'visit_status',
            'visit_proposed_by',
            'visit_confirmed_at',
            'updated_at',
        ])

        actor_name = request.user.get_full_name().strip() or request.user.username or request.user.email
        create_notification(
            recipient=recipient,
            actor=request.user,
            pet=application.pet,
            application=application,
            type=Notification.VISIT_PROPOSED,
            title=f"New visit proposal for {application.pet.name}",
            message=f"{actor_name} suggested a new meeting plan for {application.pet.name}.",
        )

        response_serializer = AdoptionApplicationSerializer(application, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class ApplicationVisitPlanAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        application = generics.get_object_or_404(AdoptionApplication, pk=pk)

        if request.user.id not in {application.applicant_id, application.pet.owner_id}:
            raise PermissionDenied('You do not have permission to accept this visit plan.')

        if application.visit_status != AdoptionApplication.VISIT_PROPOSED:
            raise ValidationError('There is no active visit proposal to accept.')

        if (
            request.user.id == application.applicant_id
            and application.visit_proposed_by == AdoptionApplication.VISIT_PROPOSED_BY_ADOPTER
        ) or (
            request.user.id == application.pet.owner_id
            and application.visit_proposed_by == AdoptionApplication.VISIT_PROPOSED_BY_REHOMER
        ):
            raise ValidationError('Wait for the other person to accept your own proposal.')

        recipient = application.pet.owner if request.user.id == application.applicant_id else application.applicant
        application.visit_status = AdoptionApplication.VISIT_AGREED
        application.visit_confirmed_at = timezone.now()
        application.save(update_fields=['visit_status', 'visit_confirmed_at', 'updated_at'])

        actor_name = request.user.get_full_name().strip() or request.user.username or request.user.email
        create_notification(
            recipient=recipient,
            actor=request.user,
            pet=application.pet,
            application=application,
            type=Notification.VISIT_AGREED,
            title=f"Visit agreed for {application.pet.name}",
            message=f"{actor_name} accepted the meeting plan for {application.pet.name}.",
        )

        response_serializer = AdoptionApplicationSerializer(application, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class WishlistListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = PetWishlist.objects.filter(user=request.user).order_by('-added_at')
        serializer = PetWishlistSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PetWishlistSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        pet = serializer.validated_data['pet']
        wishlist_item, created = PetWishlist.objects.get_or_create(
            user=request.user,
            pet=pet,
        )

        if created and pet.owner and pet.owner != request.user:
            actor_name = request.user.get_full_name().strip() or request.user.username or request.user.email
            Notification.objects.create(
                recipient=pet.owner,
                actor=request.user,
                pet=pet,
                type=Notification.WISHLIST_SAVED,
                title='Pet saved to wishlist',
                message=f"{actor_name} saved {pet.name} to their Pet Pouch.",
            )

        response_serializer = PetWishlistSerializer(
            wishlist_item,
            context={'request': request},
        )
        response_data = dict(response_serializer.data)
        response_data['created'] = created
        return Response(
            response_data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class WishlistDeleteView(generics.DestroyAPIView):
    serializer_class = PetWishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PetWishlist.objects.filter(user=self.request.user)


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).select_related(
            'recipient',
            'actor',
            'pet',
            'pet__owner',
            'pet__shelter',
            'application',
            'conversation',
        ).prefetch_related('pet__images')


class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        notification = generics.get_object_or_404(
            Notification,
            pk=pk,
            recipient=request.user,
        )
        if not notification.read:
            notification.read = True
            notification.save(update_fields=['read'])

        serializer = NotificationSerializer(notification, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationUnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        unread_count = Notification.objects.filter(recipient=request.user, read=False).count()
        return Response({'count': unread_count}, status=status.HTTP_200_OK)


def ensure_community_alias(user):
    if user.community_alias:
        return
    raise ValidationError({'community_alias': 'Choose a community username before posting.'})


class CommunityPostListCreateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = (
            CommunityPost.objects.select_related(
                'author',
                'repost_of',
                'repost_of__author',
            )
            .prefetch_related(
                'reactions',
                'comments',
                'comments__author',
                'comments__reactions',
                'reposts',
            )
            .order_by('-created_at')
        )
        serializer = CommunityPostSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user.is_authenticated:
            raise PermissionDenied('Log in to post in the community.')

        ensure_community_alias(request.user)
        serializer = CommunityPostSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CommunityCommentCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ensure_community_alias(request.user)
        post = generics.get_object_or_404(CommunityPost, pk=pk)
        serializer = CommunityCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = CommunityComment.objects.create(
            post=post,
            author=request.user,
            body=serializer.validated_data['body'],
            image_url=serializer.validated_data.get('image_url', ''),
            video_url=serializer.validated_data.get('video_url', ''),
            sticker=serializer.validated_data.get('sticker', ''),
        )
        response_serializer = CommunityCommentSerializer(comment, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class CommunityPostReactionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = generics.get_object_or_404(CommunityPost, pk=pk)
        value = request.data.get('value')

        if value not in {CommunityReaction.LIKE, CommunityReaction.DISLIKE}:
            raise ValidationError({'value': 'Use like or dislike.'})

        reaction, created = CommunityReaction.objects.get_or_create(
            user=request.user,
            post=post,
            defaults={'value': value},
        )

        if not created:
            if reaction.value == value:
                reaction.delete()
            else:
                reaction.value = value
                reaction.save(update_fields=['value', 'updated_at'])

        serializer = CommunityPostSerializer(post, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CommunityCommentReactionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = generics.get_object_or_404(CommunityComment, pk=pk)
        value = request.data.get('value')

        if value not in {CommunityReaction.LIKE, CommunityReaction.DISLIKE}:
            raise ValidationError({'value': 'Use like or dislike.'})

        reaction, created = CommunityReaction.objects.get_or_create(
            user=request.user,
            comment=comment,
            defaults={'value': value},
        )

        if not created:
            if reaction.value == value:
                reaction.delete()
            else:
                reaction.value = value
                reaction.save(update_fields=['value', 'updated_at'])

        serializer = CommunityCommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CommunityPostRepostView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ensure_community_alias(request.user)
        original_post = generics.get_object_or_404(CommunityPost, pk=pk)
        body = (request.data.get('body') or '').strip()
        existing_repost = CommunityPost.objects.filter(
            author=request.user,
            repost_of=original_post,
        ).first()

        if existing_repost:
            removed_repost_id = existing_repost.id
            existing_repost.delete()
            original_serializer = CommunityPostSerializer(original_post, context={'request': request})
            return Response(
                {
                    'reposted': False,
                    'removed_repost_id': removed_repost_id,
                    'post': original_serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        repost = CommunityPost.objects.create(
            author=request.user,
            body=body,
            category=original_post.category,
            repost_of=original_post,
        )
        repost_serializer = CommunityPostSerializer(repost, context={'request': request})
        original_serializer = CommunityPostSerializer(original_post, context={'request': request})
        return Response(
            {
                'reposted': True,
                'repost': repost_serializer.data,
                'post': original_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
