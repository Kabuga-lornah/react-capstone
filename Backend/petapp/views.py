from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .models import AdoptionApplication, CustomUser, Notification, Pet, PetWishlist
from .serializers import (
    AdoptionApplicationSerializer,
    NotificationSerializer,
    PetSerializer,
    PetWishlistSerializer,
    RehomerVerificationSubmitSerializer,
    RegisterSerializer,
    UserSerializer,
    UserProfileUpdateSerializer,
)

ALLOWED_PET_MANAGER_ROLES = {'rehomer', 'shelter_admin'}


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


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

        if self.request.method != 'GET' and pet.owner != self.request.user:
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
        if request.user.role not in ALLOWED_PET_MANAGER_ROLES:
            raise PermissionDenied('Only rehomers or shelter admins can create pets.')
        if request.user.rehomer_verification_status != CustomUser.VERIFIED:
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

        serializer.save(applicant=self.request.user)


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

        serializer = AdoptionApplicationSerializer(application, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


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
