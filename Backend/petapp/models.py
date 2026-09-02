from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from datetime import timedelta


class CustomUser(AbstractUser):
    ADOPTER = 'adopter'
    REHOMER = 'rehomer'
    SHELTER_ADMIN = 'shelter_admin'
    PLATFORM_ADMIN = 'platform_admin'
    INCOMPLETE = 'incomplete'
    PENDING = 'pending'
    VERIFIED = 'verified'
    REJECTED = 'rejected'

    ROLE_CHOICES = [
        (ADOPTER, 'Adopter'),
        (REHOMER, 'Rehomer'),
        (SHELTER_ADMIN, 'Shelter Admin'),
        (PLATFORM_ADMIN, 'Platform Admin'),
    ]
    REHOMER_VERIFICATION_STATUS_CHOICES = [
        (INCOMPLETE, 'Incomplete'),
        (PENDING, 'Pending'),
        (VERIFIED, 'Verified'),
        (REJECTED, 'Rejected'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ADOPTER)
    phone_number = models.CharField(max_length=30, blank=True)
    bio = models.TextField(blank=True)
    community_alias = models.CharField(max_length=30, unique=True, null=True, blank=True)
    profile_photo_url = models.URLField(blank=True)
    id_front_url = models.URLField(blank=True)
    id_back_url = models.URLField(blank=True)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    rehomer_verification_status = models.CharField(
        max_length=20,
        choices=REHOMER_VERIFICATION_STATUS_CHOICES,
        default=INCOMPLETE,
    )
    rehomer_verification_submitted_at = models.DateTimeField(null=True, blank=True)
    rehomer_verification_reviewed_at = models.DateTimeField(null=True, blank=True)
    rehomer_verification_notes = models.TextField(blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    organization = models.ForeignKey(
        'Shelter',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
    )
    # Internationalization fields
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('fr', 'Français'),
        ('de', 'Deutsch'),
        ('pt', 'Português'),
        ('ru', 'Русский'),
        ('sw', 'Swahili'),
        ('zh', '中文'),
    ]
    preferred_language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default='en'
    )
    timezone = models.CharField(
        max_length=50,
        default='UTC',
        help_text='IANA timezone identifier (e.g., America/New_York)'
    )

    def __str__(self):
        return self.get_full_name() or self.username or self.email

    @property
    def is_online(self):
        if not self.last_seen:
            return False
        return self.last_seen >= timezone.now() - timedelta(minutes=5)

    @property
    def activity_status(self):
        if self.is_online:
            return 'online'
        if self.last_seen:
            return 'recently_active'
        return 'offline'


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

    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    UNKNOWN = 'unknown'

    LEVEL_CHOICES = [
        (LOW, 'Low'),
        (MEDIUM, 'Medium'),
        (HIGH, 'High'),
        (UNKNOWN, 'Unknown'),
    ]

    BEGINNER = 'beginner'
    INTERMEDIATE = 'intermediate'
    EXPERIENCED = 'experienced'

    CARE_LEVEL_CHOICES = [
        (BEGINNER, 'Beginner'),
        (INTERMEDIATE, 'Intermediate'),
        (EXPERIENCED, 'Experienced'),
        (UNKNOWN, 'Unknown'),
    ]

    SMALL = 'small'
    LARGE = 'large'

    SPACE_NEEDED_CHOICES = [
        (SMALL, 'Small'),
        (MEDIUM, 'Medium'),
        (LARGE, 'Large'),
        (UNKNOWN, 'Unknown'),
    ]

    YES = 'yes'
    NO = 'no'

    YES_NO_UNKNOWN_CHOICES = [
        (YES, 'Yes'),
        (NO, 'No'),
        (UNKNOWN, 'Unknown'),
    ]

    name = models.CharField(max_length=150)
    species = models.CharField(max_length=50, choices=SPECIES_CHOICES, default=OTHER)
    custom_species = models.CharField(max_length=100, blank=True)
    breed = models.CharField(max_length=150, blank=True)
    age = models.CharField(max_length=50, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    personality_traits = models.JSONField(default=list, blank=True)
    energy_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=UNKNOWN)
    care_level = models.CharField(max_length=20, choices=CARE_LEVEL_CHOICES, default=UNKNOWN)
    space_needed = models.CharField(max_length=20, choices=SPACE_NEEDED_CHOICES, default=UNKNOWN)
    good_with_children = models.CharField(max_length=20, choices=YES_NO_UNKNOWN_CHOICES, default=UNKNOWN)
    good_with_other_pets = models.CharField(max_length=20, choices=YES_NO_UNKNOWN_CHOICES, default=UNKNOWN)
    grooming_needs = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=UNKNOWN)
    noise_level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=UNKNOWN)
    apartment_friendly = models.CharField(max_length=20, choices=YES_NO_UNKNOWN_CHOICES, default=UNKNOWN)
    is_vaccinated = models.BooleanField(default=False)
    is_dewormed = models.BooleanField(default=False)
    is_neutered = models.BooleanField(default=False)
    vaccination_proof_url = models.URLField(blank=True)
    deworming_proof_url = models.URLField(blank=True)
    neutering_proof_url = models.URLField(blank=True)
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
    # Phase 1.3: Link to breed trait profile for AI matching
    breed_trait_profile = models.ForeignKey(
        'BreedTraitProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pets'
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

    REHOMER_HOME = 'rehomer_home'
    ADOPTER_HOME = 'adopter_home'
    NEUTRAL_PLACE = 'neutral_place'

    MEETING_PREFERENCE_CHOICES = [
        (REHOMER_HOME, 'Visit the rehomer / pet location'),
        (ADOPTER_HOME, 'Rehomer visits my place'),
        (NEUTRAL_PLACE, 'Meet at a neutral place'),
    ]

    VISIT_NOT_STARTED = 'not_started'
    VISIT_PROPOSED = 'proposed'
    VISIT_AGREED = 'agreed'

    VISIT_STATUS_CHOICES = [
        (VISIT_NOT_STARTED, 'Not Started'),
        (VISIT_PROPOSED, 'Proposed'),
        (VISIT_AGREED, 'Agreed'),
    ]

    VISIT_PROPOSED_BY_ADOPTER = 'adopter'
    VISIT_PROPOSED_BY_REHOMER = 'rehomer'

    VISIT_PROPOSED_BY_CHOICES = [
        (VISIT_PROPOSED_BY_ADOPTER, 'Adopter'),
        (VISIT_PROPOSED_BY_REHOMER, 'Rehomer'),
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
    meeting_preference = models.CharField(max_length=30, choices=MEETING_PREFERENCE_CHOICES, blank=True)
    meeting_location_notes = models.TextField(blank=True)
    visit_status = models.CharField(max_length=20, choices=VISIT_STATUS_CHOICES, default=VISIT_NOT_STARTED)
    visit_proposed_by = models.CharField(max_length=20, choices=VISIT_PROPOSED_BY_CHOICES, blank=True)
    visit_confirmed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Application by {self.applicant} for {self.pet}"


class RehomerReview(models.Model):
    application = models.OneToOneField(
        AdoptionApplication,
        on_delete=models.CASCADE,
        related_name='review',
    )
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='written_reviews',
    )
    rehomer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_reviews',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating}-star review of {self.rehomer} by {self.reviewer}"


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


class Notification(models.Model):
    WISHLIST_SAVED = 'wishlist_saved'
    CHAT_MESSAGE = 'chat_message'
    APPLICATION_SUBMITTED = 'application_submitted'
    APPLICATION_WITHDRAWN = 'application_withdrawn'
    APPLICATION_APPROVED = 'application_approved'
    APPLICATION_REJECTED = 'application_rejected'
    VISIT_PROPOSED = 'visit_proposed'
    VISIT_AGREED = 'visit_agreed'
    REVIEW_SUBMITTED = 'review_submitted'

    TYPE_CHOICES = [
        (WISHLIST_SAVED, 'Wishlist Saved'),
        (CHAT_MESSAGE, 'Chat Message'),
        (APPLICATION_SUBMITTED, 'Application Submitted'),
        (APPLICATION_WITHDRAWN, 'Application Withdrawn'),
        (APPLICATION_APPROVED, 'Application Approved'),
        (APPLICATION_REJECTED, 'Application Rejected'),
        (VISIT_PROPOSED, 'Visit Proposed'),
        (VISIT_AGREED, 'Visit Agreed'),
        (REVIEW_SUBMITTED, 'Review Submitted'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_notifications',
    )
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    application = models.ForeignKey(
        AdoptionApplication,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='notifications',
    )
    conversation = models.ForeignKey(
        'Conversation',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='notifications',
    )
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.recipient}"


class Conversation(models.Model):
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    adopter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='adopter_conversations',
    )
    rehomer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rehomer_conversations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(
                fields=['pet', 'adopter', 'rehomer'],
                name='unique_pet_adopter_rehomer_conversation',
            ),
        ]

    def __str__(self):
        return f"Chat about {self.pet} ({self.adopter} <> {self.rehomer})"


class ConversationMessage(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversation_messages',
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message #{self.pk} in conversation #{self.conversation_id}"


class CommunityPost(models.Model):
    GENERAL = 'general'
    DOGS = 'dogs'
    CATS = 'cats'
    HEALTH = 'health'
    VETS = 'vets'
    FUN = 'fun'

    CATEGORY_CHOICES = [
        (GENERAL, 'General'),
        (DOGS, 'Dogs'),
        (CATS, 'Cats'),
        (HEALTH, 'Health'),
        (VETS, 'Vets'),
        (FUN, 'Fun'),
    ]

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='community_posts',
    )
    body = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=GENERAL)
    repost_of = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reposts',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.author} community post #{self.pk}"


class CommunityComment(models.Model):
    post = models.ForeignKey(
        CommunityPost,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='community_comments',
    )
    body = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    video_url = models.URLField(blank=True)
    sticker = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment #{self.pk} on post #{self.post_id}"


class CommunityReaction(models.Model):
    LIKE = 'like'
    DISLIKE = 'dislike'

    VALUE_CHOICES = [
        (LIKE, 'Like'),
        (DISLIKE, 'Dislike'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='community_reactions',
    )
    post = models.ForeignKey(
        CommunityPost,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='reactions',
    )
    comment = models.ForeignKey(
        CommunityComment,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='reactions',
    )
    value = models.CharField(max_length=10, choices=VALUE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'post'],
                name='unique_user_community_post_reaction',
            ),
            models.UniqueConstraint(
                fields=['user', 'comment'],
                name='unique_user_community_comment_reaction',
            ),
        ]

    def __str__(self):
        target = f"post #{self.post_id}" if self.post_id else f"comment #{self.comment_id}"
        return f"{self.user} {self.value}d {target}"


# ============================================================================
# PHASE 1.1: PERSONALITY TRAIT SYSTEM - Custom AI Matching Foundation
# ============================================================================

class TraitCategory(models.Model):
    """
    Categories that group personality traits.
    Examples: Temperament, Energy Level, Social Behavior, etc.
    Used to organize traits for quiz questions and pet profiles.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name_plural = "Trait Categories"

    def __str__(self):
        return self.name


class PersonalityTrait(models.Model):
    """
    Individual personality traits for both adopters and pets.
    Examples: "energetic", "calm", "friendly", "territorial"
    
    Used in:
    - Quiz answers for adopters
    - Pet personality profiles (via BreedTraitProfile)
    - ML vector generation for matching algorithm
    """
    ADOPTER = 'adopter'
    PET = 'pet'
    BOTH = 'both'
    
    TRAIT_TYPE_CHOICES = [
        (ADOPTER, 'Adopter Only'),
        (PET, 'Pet Only'),
        (BOTH, 'Both Adopter & Pet'),
    ]

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        TraitCategory,
        on_delete=models.SET_NULL,
        null=True,
        related_name='traits'
    )
    trait_type = models.CharField(
        max_length=20,
        choices=TRAIT_TYPE_CHOICES,
        default=BOTH,
        help_text="Whether this trait applies to adopters, pets, or both"
    )
    # Used for matching scoring (0.0 to 1.0 intensity)
    default_weight = models.FloatField(default=1.0, help_text="Default weight in ML matching (0.0-1.0)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.category})"


class BreedTraitProfile(models.Model):
    """
    Maps a pet breed to personality traits with probabilities/weights.
    Example: Golden Retriever → [friendly: 0.95, energetic: 0.85, calm: 0.4]
    
    Used to:
    - Define baseline personality for each breed
    - Train ML matching model
    - Generate pet personality vectors for compatibility scoring
    """
    # Breed information
    species = models.CharField(
        max_length=50,
        choices=[
            ('dog', 'Dog'),
            ('cat', 'Cat'),
            ('bird', 'Bird'),
            ('rabbit', 'Rabbit'),
            ('fish', 'Fish'),
            ('snake', 'Snake'),
            ('other', 'Other'),
        ]
    )
    breed = models.CharField(max_length=150)
    
    # Source of data (for tracking data quality)
    DATA_SOURCE_CHOICES = [
        ('standard', 'Breed Standard/Registry'),
        ('community', 'Community Feedback'),
        ('adoption_data', 'Adoption Outcome Data'),
        ('manual', 'Manual Entry'),
        ('ml_trained', 'ML Model Trained'),
    ]
    data_source = models.CharField(
        max_length=50,
        choices=DATA_SOURCE_CHOICES,
        default='standard'
    )
    
    # Trait weights/probabilities (stored as JSON)
    # Format: {"trait_id": 0.85, "trait_id": 0.45, ...}
    trait_weights = models.JSONField(
        default=dict,
        help_text="Maps trait IDs to weights (0.0-1.0) indicating likelihood"
    )
    
    # Metadata
    confidence_score = models.FloatField(
        default=0.5,
        help_text="How confident we are in this profile (0.0-1.0)"
    )
    sample_size = models.IntegerField(
        default=0,
        help_text="Number of pets/adoptions this profile is based on"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('species', 'breed')
        ordering = ['species', 'breed']
        verbose_name_plural = "Breed Trait Profiles"

    def __str__(self):
        return f"{self.breed} ({self.species})"
    
    def get_personality_vector(self):
        """
        Returns personality as a numerical vector for ML matching.
        Returns dict: {trait_id: weight, ...}
        """
        return self.trait_weights


# ============================================================================
# PHASE 1.2: QUIZ SYSTEM MODELS - Personality Assessment for Adopters
# ============================================================================

class QuizCategory(models.Model):
    """
    Categories for quiz questions (e.g., Lifestyle, Housing, Experience, Time Availability)
    Used to organize questions logically in the UI.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    display_order = models.IntegerField(default=0)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name/emoji for UI display")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name_plural = "Quiz Categories"

    def __str__(self):
        return self.name


class QuizQuestion(models.Model):
    """
    Individual questions in the personality quiz for adopters.
    Each question maps to one or more personality traits.
    Example: "How active are you?" → maps to 'energetic' trait with weight 0.8
    """
    MULTIPLE_CHOICE = 'multiple_choice'
    SLIDER = 'slider'
    CHECKBOX = 'checkbox'
    TEXT_INPUT = 'text_input'
    
    QUESTION_TYPE_CHOICES = [
        (MULTIPLE_CHOICE, 'Multiple Choice'),
        (SLIDER, 'Slider (1-10)'),
        (CHECKBOX, 'Checkboxes'),
        (TEXT_INPUT, 'Text Input'),
    ]

    question_text = models.TextField()
    question_type = models.CharField(max_length=50, choices=QUESTION_TYPE_CHOICES)
    category = models.ForeignKey(
        QuizCategory,
        on_delete=models.SET_NULL,
        null=True,
        related_name='questions'
    )
    
    # Help text shown to user
    help_text = models.TextField(
        blank=True,
        help_text="Additional context or explanation for the question"
    )
    
    # Whether this is mandatory in the quiz
    is_required = models.BooleanField(default=True)
    
    # Display order within category
    display_order = models.IntegerField(default=0)
    
    # For slider questions: min/max values
    min_value = models.IntegerField(null=True, blank=True)
    max_value = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'display_order', 'id']

    def __str__(self):
        return f"{self.category.name} - {self.question_text[:50]}"


class QuizAnswer(models.Model):
    """
    Predefined answer options for quiz questions.
    Maps to one or more personality traits with weights.
    Example: For question "How active are you?", answers are:
        - "Very Active" → trait_mappings: {energetic: 0.9, calm: 0.1}
        - "Moderately Active" → {energetic: 0.6, calm: 0.4}
    """
    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name='answers'
    )
    
    answer_text = models.CharField(max_length=255)
    
    # For slider/text questions: this might be empty
    help_text = models.TextField(blank=True)
    
    # Trait mappings: {trait_id: weight}
    # Weight indicates how much this answer reflects each trait
    trait_mappings = models.JSONField(
        default=dict,
        help_text="Maps trait IDs to weights (0.0-1.0)"
    )
    
    # Display order for answers
    display_order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['question', 'display_order', 'id']

    def __str__(self):
        return f"{self.question.question_text[:30]} - {self.answer_text}"


class AdopterQuizResponse(models.Model):
    """
    Stores an adopter's responses to the personality quiz.
    Used to:
    - Calculate adopter personality vector
    - Store for historical analysis
    - Track quiz completion
    """
    adopter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_responses'
    )
    
    # Stores: {question_id: answer_id} or {question_id: slider_value}
    responses = models.JSONField(
        default=dict,
        help_text="User's answers to quiz questions"
    )
    
    # Calculated personality vector: {trait_id: score}
    personality_vector = models.JSONField(
        default=dict,
        help_text="Calculated personality traits from responses"
    )
    
    # Overall compatibility info
    is_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # For versioning: if quiz questions change, track which version was used
    quiz_version = models.IntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-completed_at', '-created_at']

    def __str__(self):
        return f"{self.adopter.username} - Quiz Response (v{self.quiz_version})"
    
    def calculate_personality_vector(self):
        """
        Recalculates personality vector from responses.
        Aggregates trait weights from selected answers.
        Returns: {trait_id: average_weight}
        """
        if not self.responses:
            return {}
        
        # Aggregate trait scores from all answers
        trait_scores = {}
        answer_count = 0
        
        for question_id, answer_id in self.responses.items():
            if answer_id is None:
                continue
            try:
                answer = QuizAnswer.objects.get(id=answer_id)
                for trait_id, weight in answer.trait_mappings.items():
                    if trait_id not in trait_scores:
                        trait_scores[trait_id] = []
                    trait_scores[trait_id].append(weight)
                answer_count += 1
            except QuizAnswer.DoesNotExist:
                continue
        
        # Average the scores for each trait
        averaged_scores = {}
        for trait_id, weights in trait_scores.items():
            averaged_scores[trait_id] = sum(weights) / len(weights) if weights else 0
        
        return averaged_scores


# ============================================================================
# PHASE 1.3: PET PROFILE ENHANCEMENT - Personality Profiles for Matching
# ============================================================================

class PetPersonalityProfile(models.Model):
    """
    Stores the calculated personality profile for each pet.
    Created from either:
    1. BreedTraitProfile (baseline from breed standards)
    2. Rehomer input (individual pet personality traits)
    3. Adoption history (ML model trained on outcomes)
    
    Used for matching adopters with compatible pets.
    """
    pet = models.OneToOneField(
        Pet,
        on_delete=models.CASCADE,
        related_name='personality_profile'
    )
    
    # Personality vector: {trait_id: weight}
    # Weights indicate the strength of each trait for this specific pet
    personality_vector = models.JSONField(
        default=dict,
        help_text="Pet's personality traits and their weights (0.0-1.0)"
    )
    
    # Source of this profile
    DATA_SOURCE_CHOICES = [
        ('breed_standard', 'Breed Standard'),
        ('rehomer_input', 'Rehomer Input'),
        ('adoption_history', 'Adoption History / ML'),
        ('hybrid', 'Hybrid (Multiple Sources)'),
    ]
    data_source = models.CharField(
        max_length=50,
        choices=DATA_SOURCE_CHOICES,
        default='breed_standard'
    )
    
    # Confidence in this profile
    confidence_score = models.FloatField(
        default=0.5,
        help_text="How confident we are in this profile (0.0-1.0)"
    )
    
    # Linked to breed profile if applicable
    breed_profile = models.ForeignKey(
        BreedTraitProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pet_profiles'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Personality Profile for {self.pet.name}"
    
    def recalculate_from_breed(self):
        """Update personality vector based on linked breed profile"""
        if self.breed_profile:
            self.personality_vector = self.breed_profile.get_personality_vector()
            self.data_source = 'breed_standard'
            self.confidence_score = self.breed_profile.confidence_score
            self.save()
    
    def update_from_rehomer_input(self, trait_weights):
        """
        Update personality profile from rehomer's input.
        trait_weights: {trait_id: weight, ...}
        """
        self.personality_vector = trait_weights
        self.data_source = 'rehomer_input'
        self.confidence_score = 0.8  # Rehomer input is fairly confident
        self.save()


# ============================================================================
# PHASE 1.4: MATCHING SYSTEM MODELS - Compatibility Scoring & ML Training
# ============================================================================

class MatchingScore(models.Model):
    """
    Stores calculated compatibility scores between adopter and pet.
    Used to:
    - Track matching results (for UI display)
    - Store for historical analysis and ML training
    - Identify which matches were successful for model refinement
    """
    adopter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='matching_scores'
    )
    
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='matching_scores'
    )
    
    # Compatibility score: 0-100 (%)
    # Calculated using cosine similarity of personality vectors
    compatibility_score = models.FloatField(
        help_text="Compatibility percentage (0-100%)"
    )
    
    # Individual trait compatibility scores
    # Useful for explaining why they're compatible
    trait_scores = models.JSONField(
        default=dict,
        help_text="Per-trait compatibility scores {trait_id: score}"
    )
    
    # Factors affecting the score
    # Which algorithm/model version produced this score
    algorithm_version = models.IntegerField(default=1)
    
    # Whether this match was acted upon
    was_viewed = models.BooleanField(default=False)
    was_liked = models.BooleanField(default=False)
    application_submitted = models.BooleanField(default=False)
    application = models.ForeignKey(
        AdoptionApplication,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matching_score'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('adopter', 'pet')
        ordering = ['-compatibility_score', '-created_at']
        indexes = [
            models.Index(fields=['-compatibility_score']),
            models.Index(fields=['adopter', '-compatibility_score']),
            models.Index(fields=['pet', '-compatibility_score']),
        ]

    def __str__(self):
        return f"{self.adopter.username} ↔ {self.pet.name}: {self.compatibility_score:.1f}%"


class AdoptionOutcome(models.Model):
    """
    Tracks the outcome of adoptions (successful or not) for ML model retraining.
    Used to improve matching algorithm over time.
    """
    SUCCESSFUL = 'successful'
    UNSUCCESSFUL = 'unsuccessful'
    UNKNOWN = 'unknown'
    
    OUTCOME_CHOICES = [
        (SUCCESSFUL, 'Successful (Happy Adoption)'),
        (UNSUCCESSFUL, 'Unsuccessful (Returned/Failed)'),
        (UNKNOWN, 'Unknown'),
    ]
    
    application = models.OneToOneField(
        AdoptionApplication,
        on_delete=models.CASCADE,
        related_name='adoption_outcome'
    )
    
    # Outcome classification
    outcome = models.CharField(
        max_length=20,
        choices=OUTCOME_CHOICES,
        default=UNKNOWN
    )
    
    # How long the adoption lasted (if unsuccessful)
    # NULL if still ongoing
    duration_days = models.IntegerField(null=True, blank=True)
    
    # Feedback from adopter/rehomer
    feedback = models.TextField(
        blank=True,
        help_text="Why was this adoption successful/unsuccessful?"
    )
    
    # Related to original matching
    original_matching_score = models.FloatField(
        null=True,
        blank=True,
        help_text="The original compatibility score for this match"
    )
    
    # Used for model improvement
    was_used_for_training = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Outcome: {self.application} - {self.outcome}"


class MatchingAlgorithmConfig(models.Model):
    """
    Stores configuration and trained model weights for the matching algorithm.
    Allows versioning of the ML model and A/B testing different models.
    """
    # Version identifier
    version = models.IntegerField(unique=True)
    name = models.CharField(
        max_length=255,
        help_text="Descriptive name for this model version"
    )
    description = models.TextField(blank=True)
    
    # Model configuration
    MODEL_TYPE_CHOICES = [
        ('cosine_similarity', 'Cosine Similarity (Vector-based)'),
        ('weighted_average', 'Weighted Average'),
        ('ml_trained', 'ML Model (Scikit-learn/PyTorch)'),
        ('hybrid', 'Hybrid Approach'),
    ]
    model_type = models.CharField(
        max_length=50,
        choices=MODEL_TYPE_CHOICES,
        default='cosine_similarity'
    )
    
    # Model weights/parameters (JSON)
    # Different structure depending on model_type
    # Examples:
    # - cosine_similarity: {trait_weights: {...}, threshold: 0.3}
    # - ml_trained: {model_path: "path/to/model.pkl", preprocessing: {...}}
    model_weights = models.JSONField(
        default=dict,
        help_text="Algorithm-specific weights and parameters"
    )
    
    # Training data info
    training_samples = models.IntegerField(
        default=0,
        help_text="Number of adoption outcomes used to train this model"
    )
    accuracy_on_training = models.FloatField(
        default=0.0,
        help_text="Model accuracy on training data (0-1)"
    )
    accuracy_on_validation = models.FloatField(
        default=0.0,
        help_text="Model accuracy on validation data (0-1)"
    )
    
    # Whether this is the active model
    is_active = models.BooleanField(default=False)
    
    # Deployment info
    deployed_at = models.DateTimeField(null=True, blank=True)
    previous_version = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='next_version'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-version']
        verbose_name_plural = "Matching Algorithm Configs"

    def __str__(self):
        status = "(ACTIVE)" if self.is_active else ""
        return f"v{self.version}: {self.name} {status}"
