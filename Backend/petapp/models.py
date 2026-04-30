from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify


class CustomUser(AbstractUser):
    ADOPTER = 'adopter'
    REHOMER = 'rehomer'
    SHELTER_ADMIN = 'shelter_admin'
    PLATFORM_ADMIN = 'platform_admin'

    ROLE_CHOICES = [
        (ADOPTER, 'Adopter'),
        (REHOMER, 'Rehomer'),
        (SHELTER_ADMIN, 'Shelter Admin'),
        (PLATFORM_ADMIN, 'Platform Admin'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ADOPTER)
    phone_number = models.CharField(max_length=30, blank=True)
    bio = models.TextField(blank=True)
    organization = models.ForeignKey(
        'Shelter',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
    )

    def __str__(self):
        return self.get_full_name() or self.username or self.email


class Shelter(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True)
    phone = models.CharField(max_length=30)
    email = models.EmailField()
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    verified = models.BooleanField(default=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='owned_shelters',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Pet(models.Model):
    DOG = 'dog'
    CAT = 'cat'
    BIRD = 'bird'
    RABBIT = 'rabbit'
    OTHER = 'other'

    SPECIES_CHOICES = [
        (DOG, 'Dog'),
        (CAT, 'Cat'),
        (BIRD, 'Bird'),
        (RABBIT, 'Rabbit'),
        (OTHER, 'Other'),
    ]

    AVAILABLE = 'available'
    PENDING = 'pending'
    ADOPTED = 'adopted'
    REMOVED = 'removed'

    STATUS_CHOICES = [
        (AVAILABLE, 'Available'),
        (PENDING, 'Pending'),
        (ADOPTED, 'Adopted'),
        (REMOVED, 'Removed'),
    ]

    name = models.CharField(max_length=150)
    species = models.CharField(max_length=50, choices=SPECIES_CHOICES, default=OTHER)
    breed = models.CharField(max_length=150, blank=True)
    age = models.CharField(max_length=50, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    personality_traits = models.JSONField(default=list, blank=True)
    is_vaccinated = models.BooleanField(default=False)
    is_dewormed = models.BooleanField(default=False)
    is_neutered = models.BooleanField(default=False)
    adoption_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=AVAILABLE)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='pets',
    )
    shelter = models.ForeignKey(
        Shelter,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='pets',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class PetImage(models.Model):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='pet_images/', blank=True, null=True)
    image_url = models.URLField(blank=True)
    is_main = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.pet.name} ({self.id})"


class AdoptionApplication(models.Model):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    WITHDRAWN = 'withdrawn'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
        (WITHDRAWN, 'Withdrawn'),
    ]

    HOUSE = 'house'
    APARTMENT = 'apartment'
    OTHER_HOUSING = 'other'

    HOUSING_CHOICES = [
        (HOUSE, 'House'),
        (APARTMENT, 'Apartment'),
        (OTHER_HOUSING, 'Other'),
    ]

    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='applications')
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='applications',
    )
    message = models.TextField(blank=True)
    housing_type = models.CharField(max_length=20, choices=HOUSING_CHOICES, blank=True)
    has_other_pets = models.BooleanField(default=False)
    has_children = models.BooleanField(default=False)
    pet_experience = models.TextField(blank=True)
    can_afford_vet_care = models.BooleanField(default=False)
    preferred_visit_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Application by {self.applicant} for {self.pet}"


class PetWishlist(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wishlist_items',
    )
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='wishlist_items',
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'pet'],
                name='unique_user_pet_wishlist',
            ),
        ]
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user} saved {self.pet}"
