from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    AdopterQuizResponse,
    AdoptionApplication,
    AdoptionOutcome,
    BreedTraitProfile,
    CustomUser,
    MatchingAlgorithmConfig,
    MatchingScore,
    Notification,
    Pet,
    PetImage,
    PetPersonalityProfile,
    PetWishlist,
    PersonalityTrait,
    QuizAnswer,
    QuizCategory,
    QuizQuestion,
    Shelter,
    TraitCategory,
)


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
        (
            'Internationalization',
            {
                'fields': (
                    'preferred_language',
                    'timezone',
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
        (
            'Internationalization',
            {
                'fields': (
                    'preferred_language',
                    'timezone',
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


# ============================================================================
# PHASE 1.1: PERSONALITY TRAIT SYSTEM ADMIN
# ============================================================================

@admin.register(TraitCategory)
class TraitCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_order', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'description')
    ordering = ('display_order', 'name')


@admin.register(PersonalityTrait)
class PersonalityTraitAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'trait_type', 'default_weight', 'created_at')
    list_filter = ('trait_type', 'category', 'created_at')
    search_fields = ('name', 'description', 'category__name')
    ordering = ('category', 'name')


@admin.register(BreedTraitProfile)
class BreedTraitProfileAdmin(admin.ModelAdmin):
    list_display = (
        'breed',
        'species',
        'data_source',
        'confidence_score',
        'sample_size',
        'updated_at',
    )
    list_filter = ('species', 'data_source', 'confidence_score', 'updated_at')
    search_fields = ('breed', 'species')
    ordering = ('species', 'breed')
    readonly_fields = ('created_at', 'updated_at')


# ============================================================================
# PHASE 1.2: QUIZ SYSTEM ADMIN
# ============================================================================

@admin.register(QuizCategory)
class QuizCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_order', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'description')
    ordering = ('display_order', 'name')


class QuizAnswerInline(admin.TabularInline):
    model = QuizAnswer
    extra = 1
    fields = ('answer_text', 'display_order', 'trait_mappings', 'help_text')


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = (
        'question_text',
        'question_type',
        'category',
        'is_required',
        'display_order',
        'created_at',
    )
    list_filter = ('question_type', 'category', 'is_required', 'created_at')
    search_fields = ('question_text', 'help_text')
    ordering = ('category', 'display_order', 'id')
    inlines = [QuizAnswerInline]


@admin.register(QuizAnswer)
class QuizAnswerAdmin(admin.ModelAdmin):
    list_display = (
        'answer_text',
        'question',
        'display_order',
        'created_at',
    )
    list_filter = ('question__category', 'created_at')
    search_fields = ('answer_text', 'question__question_text')
    ordering = ('question', 'display_order', 'id')


@admin.register(AdopterQuizResponse)
class AdopterQuizResponseAdmin(admin.ModelAdmin):
    list_display = (
        'adopter',
        'is_complete',
        'completed_at',
        'quiz_version',
        'created_at',
    )
    list_filter = ('is_complete', 'quiz_version', 'completed_at', 'created_at')
    search_fields = ('adopter__username', 'adopter__email')
    ordering = ('-completed_at', '-created_at')
    readonly_fields = ('created_at', 'updated_at', 'personality_vector')


# ============================================================================
# PHASE 1.3: PET PROFILE ADMIN
# ============================================================================

@admin.register(PetPersonalityProfile)
class PetPersonalityProfileAdmin(admin.ModelAdmin):
    list_display = (
        'pet',
        'data_source',
        'confidence_score',
        'breed_profile',
        'updated_at',
    )
    list_filter = ('data_source', 'confidence_score', 'updated_at')
    search_fields = ('pet__name', 'pet__breed', 'breed_profile__breed')
    ordering = ('-updated_at',)
    readonly_fields = ('created_at', 'updated_at')


# ============================================================================
# PHASE 1.4: MATCHING SYSTEM ADMIN
# ============================================================================

@admin.register(MatchingScore)
class MatchingScoreAdmin(admin.ModelAdmin):
    list_display = (
        'adopter',
        'pet',
        'compatibility_score',
        'was_liked',
        'application_submitted',
        'algorithm_version',
        'created_at',
    )
    list_filter = (
        'algorithm_version',
        'was_viewed',
        'was_liked',
        'application_submitted',
        'created_at',
    )
    search_fields = (
        'adopter__username',
        'adopter__email',
        'pet__name',
        'pet__breed',
    )
    ordering = ['-compatibility_score', '-created_at']
    readonly_fields = ('created_at', 'updated_at')


@admin.register(AdoptionOutcome)
class AdoptionOutcomeAdmin(admin.ModelAdmin):
    list_display = (
        'application',
        'outcome',
        'duration_days',
        'original_matching_score',
        'was_used_for_training',
        'created_at',
    )
    list_filter = (
        'outcome',
        'was_used_for_training',
        'created_at',
    )
    search_fields = (
        'application__applicant__username',
        'application__applicant__email',
        'application__pet__name',
        'feedback',
    )
    ordering = ['-created_at']
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MatchingAlgorithmConfig)
class MatchingAlgorithmConfigAdmin(admin.ModelAdmin):
    list_display = (
        'version',
        'name',
        'model_type',
        'is_active',
        'accuracy_on_validation',
        'training_samples',
        'deployed_at',
    )
    list_filter = (
        'model_type',
        'is_active',
        'deployed_at',
        'created_at',
    )
    search_fields = ('name', 'description')
    ordering = ['-version']
    readonly_fields = ('created_at', 'updated_at')
