from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import AdoptionApplication, CustomUser, Pet, PetImage, PetWishlist, Shelter


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('username', 'email', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone_number', 'bio', 'organization')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone_number', 'bio', 'organization')}),
    )
    search_fields = ('username', 'email', 'role')
    ordering = ('username',)


@admin.register(Shelter)
class ShelterAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'city', 'state', 'country', 'verified')
    list_filter = ('verified', 'city', 'state', 'country')
    search_fields = ('name', 'email', 'phone', 'city', 'state', 'country')


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ('name', 'species', 'breed', 'status', 'owner', 'shelter', 'created_at')
    list_filter = ('species', 'status', 'is_vaccinated', 'is_dewormed', 'is_neutered')
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
