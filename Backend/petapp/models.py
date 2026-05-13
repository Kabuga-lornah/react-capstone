from django.conf import settings
from django.contrib.auth.models import AbstractUser
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

    TYPE_CHOICES = [
        (WISHLIST_SAVED, 'Wishlist Saved'),
        (CHAT_MESSAGE, 'Chat Message'),
        (APPLICATION_SUBMITTED, 'Application Submitted'),
        (APPLICATION_WITHDRAWN, 'Application Withdrawn'),
        (APPLICATION_APPROVED, 'Application Approved'),
        (APPLICATION_REJECTED, 'Application Rejected'),
        (VISIT_PROPOSED, 'Visit Proposed'),
        (VISIT_AGREED, 'Visit Agreed'),
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
