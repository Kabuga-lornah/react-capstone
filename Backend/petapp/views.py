from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AdoptionApplication, Pet, PetWishlist
from .serializers import (
    AdoptionApplicationSerializer,
    PetSerializer,
    PetWishlistSerializer,
    RegisterSerializer,
    UserSerializer,
)

ALLOWED_PET_MANAGER_ROLES = {'rehomer', 'shelter_admin'}


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


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

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        pet = super().get_object()

        if self.request.method != 'GET' and pet.owner != self.request.user:
            raise PermissionDenied('You do not have permission to modify this pet.')

        return pet


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
        wishlist_item, created = PetWishlist.objects.get_or_create(
            user=request.user,
            pet=serializer.validated_data['pet'],
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
