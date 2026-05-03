from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AdoptionApplication, CustomUser, Notification, Pet, PetImage, PetWishlist, Shelter


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = (
        'username',
        'email',
        'role',
        'rehomer_verification_status',
        'email_verified',
        'phone_verified',
        'is_staff',
        'is_active',
    )
    list_filter = (
        'role',
        'rehomer_verification_status',
        'email_verified',
        'phone_verified',
        'is_staff',
        'is_active',
    )
    fieldsets = UserAdmin.fieldsets + (
        (
            'Additional Info',
            {
                'fields': (
                    'role',
                    'phone_number',
                    'bio',
                    'organization',
                    'profile_photo_url',
                    'id_front_url',
                    'id_back_url',
                )
            },
        ),
        (
            'Verification',
            {
                'fields': (
                    'email_verified',
                    'phone_verified',
                    'rehomer_verification_status',
                    'rehomer_verification_submitted_at',
                    'rehomer_verification_reviewed_at',
                    'rehomer_verification_notes',
                )
            },
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            'Additional Info',
            {
                'fields': (
                    'role',
                    'phone_number',
                    'bio',
                    'organization',
                    'profile_photo_url',
                    'id_front_url',
                    'id_back_url',
                    'email_verified',
                    'phone_verified',
                    'rehomer_verification_status',
                    'rehomer_verification_notes',
                )
            },
        ),
    )
    search_fields = ('username', 'email', 'role', 'phone_number')
    ordering = ('username',)


@admin.register(Shelter)
class ShelterAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'city', 'state', 'country', 'verified')
    list_filter = ('verified', 'city', 'state', 'country')
    search_fields = ('name', 'email', 'phone', 'city', 'state', 'country')


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'species',
        'breed',
        'status',
        'energy_level',
        'care_level',
        'owner',
        'shelter',
        'created_at',
    )
    list_filter = (
        'species',
        'status',
        'energy_level',
        'care_level',
        'space_needed',
        'good_with_children',
        'good_with_other_pets',
        'grooming_needs',
        'noise_level',
        'apartment_friendly',
        'is_vaccinated',
        'is_dewormed',
        'is_neutered',
    )
    search_fields = ('name', 'breed', 'description', 'location', 'city', 'state', 'country')


@admin.register(PetImage)
class PetImageAdmin(admin.ModelAdmin):
    list_display = ('pet', 'is_main', 'image_url', 'uploaded_at')
    list_filter = ('is_main',)
    search_fields = ('pet__name', 'image_url')


@admin.register(AdoptionApplication)
class AdoptionApplicationAdmin(admin.ModelAdmin):
    list_display = ('pet', 'applicant', 'status', 'preferred_visit_date', 'created_at')
    list_filter = ('status', 'housing_type', 'has_other_pets', 'has_children', 'can_afford_vet_care')
    search_fields = ('pet__name', 'applicant__username', 'applicant__email', 'message')


@admin.register(PetWishlist)
class PetWishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'pet', 'added_at')
    search_fields = ('user__username', 'user__email', 'pet__name')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'actor', 'pet', 'type', 'read', 'created_at')
    list_filter = ('type', 'read', 'created_at')
    search_fields = (
        'recipient__username',
        'recipient__email',
        'actor__username',
        'actor__email',
        'pet__name',
        'title',
        'message',
    )
