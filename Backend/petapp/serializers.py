from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone

from .models import (
    CommunityComment,
    CommunityPost,
    CommunityReaction,
    AdoptionApplication,
    Conversation,
    ConversationMessage,
    CustomUser,
    Notification,
    Pet,
    PetImage,
    PetWishlist,
    Shelter,
)


class UserSerializer(serializers.ModelSerializer):
    is_online = serializers.SerializerMethodField()
    activity_status = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'role',
            'phone_number',
            'bio',
            'community_alias',
            'profile_photo_url',
            'id_front_url',
            'id_back_url',
            'email_verified',
            'phone_verified',
            'rehomer_verification_status',
            'rehomer_verification_submitted_at',
            'rehomer_verification_reviewed_at',
            'rehomer_verification_notes',
            'last_seen',
            'is_online',
            'activity_status',
            'organization',
        ]
        read_only_fields = [
            'id',
            'role',
            'organization',
            'email_verified',
            'phone_verified',
            'rehomer_verification_status',
            'rehomer_verification_submitted_at',
            'rehomer_verification_reviewed_at',
            'rehomer_verification_notes',
            'last_seen',
            'is_online',
            'activity_status',
        ]

    def get_is_online(self, obj):
        return obj.is_online

    def get_activity_status(self, obj):
        return obj.activity_status


class PublicUserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    community_alias = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    activity_status = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'profile_photo_url',
            'role',
            'display_name',
            'community_alias',
            'is_online',
            'activity_status',
        ]
        read_only_fields = fields

    def get_display_name(self, obj):
        full_name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return full_name or obj.username or obj.email or "User"

    def get_is_online(self, obj):
        return obj.is_online

    def get_activity_status(self, obj):
        return obj.activity_status

    def get_community_alias(self, obj):
        return obj.community_alias or f"PetPal{obj.id}"


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'bio',
            'community_alias',
            'profile_photo_url',
            'id_front_url',
            'id_back_url',
        ]

    def validate_community_alias(self, value):
        alias = (value or '').strip()

        if not alias:
            return ""

        normalized_alias = alias.replace(" ", "_")

        if len(normalized_alias) < 3:
            raise serializers.ValidationError('Community name must be at least 3 characters long.')

        if not all(character.isalnum() or character == "_" for character in normalized_alias):
            raise serializers.ValidationError('Use only letters, numbers, and underscores.')

        user = self.instance
        existing = CustomUser.objects.filter(community_alias__iexact=normalized_alias)
        if user:
            existing = existing.exclude(pk=user.pk)
        if existing.exists():
            raise serializers.ValidationError('That community name is already taken.')

        return normalized_alias


class RehomerVerificationSubmitSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['phone_number', 'profile_photo_url', 'id_front_url', 'id_back_url']

    def validate(self, attrs):
        user = self.instance
        phone_number = attrs.get('phone_number', user.phone_number if user else '')
        id_front_url = attrs.get('id_front_url', user.id_front_url if user else '')
        id_back_url = attrs.get('id_back_url', user.id_back_url if user else '')

        if not phone_number:
            raise serializers.ValidationError({'phone_number': 'Phone number is required.'})
        if not id_front_url:
            raise serializers.ValidationError({'id_front_url': 'Front ID image is required.'})
        if not id_back_url:
            raise serializers.ValidationError({'id_back_url': 'Back ID image is required.'})

        return attrs

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.rehomer_verification_status = CustomUser.PENDING
        instance.rehomer_verification_submitted_at = timezone.now()
        instance.rehomer_verification_reviewed_at = None
        instance.rehomer_verification_notes = ""
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone_number', 'bio']
        extra_kwargs = {
            'role': {'required': True},
            'username': {'required': False, 'allow_blank': True},
        }

    def validate(self, attrs):
        errors = {}

        first_name = (attrs.get('first_name') or '').strip()
        last_name = (attrs.get('last_name') or '').strip()
        email = (attrs.get('email') or '').strip().lower()
        username = (attrs.get('username') or '').strip().lower()
        phone_number = (attrs.get('phone_number') or '').strip()

        if not first_name:
            errors['first_name'] = 'First name is required.'
        if not last_name:
            errors['last_name'] = 'Last name is required.'
        if not email:
            errors['email'] = 'Email address is required.'
        if not phone_number:
            errors['phone_number'] = 'Phone number is required.'

        if errors:
            raise serializers.ValidationError(errors)

        attrs['first_name'] = first_name
        attrs['last_name'] = last_name
        attrs['email'] = email
        attrs['username'] = username or email
        attrs['phone_number'] = phone_number
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AppTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        identifier = (attrs.get(self.username_field) or "").strip()

        if "@" in identifier:
            user_model = get_user_model()
            matched_user = (
                user_model.objects.filter(email__iexact=identifier)
                .only("username")
                .first()
            )
            if matched_user:
                attrs[self.username_field] = matched_user.username

        return super().validate(attrs)


class ShelterSerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(read_only=True)

    class Meta:
        model = Shelter
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'phone',
            'email',
            'address',
            'city',
            'state',
            'country',
            'verified',
            'owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'verified', 'owner', 'created_at', 'updated_at']


class PetImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PetImage
        fields = ['id', 'image', 'image_url', 'is_main', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class PetSerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(read_only=True)
    shelter = ShelterSerializer(read_only=True)
    images = PetImageSerializer(many=True, read_only=True)
    image_url = serializers.URLField(write_only=True, required=False, allow_blank=True)
    additional_image_url = serializers.URLField(write_only=True, required=False, allow_blank=True)
    species_label = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = [
            'id',
            'name',
            'species',
            'custom_species',
            'species_label',
            'breed',
            'age',
            'gender',
            'location',
            'city',
            'state',
            'country',
            'description',
            'personality_traits',
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
            'vaccination_proof_url',
            'deworming_proof_url',
            'neutering_proof_url',
            'adoption_fee',
            'status',
            'owner',
            'shelter',
            'images',
            'image_url',
            'additional_image_url',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'shelter', 'images', 'created_at', 'updated_at', 'status', 'species_label']

    def validate(self, attrs):
        species = (attrs.get('species') or getattr(self.instance, 'species', Pet.OTHER) or Pet.OTHER).strip().lower()
        custom_species = (attrs.get('custom_species') or getattr(self.instance, 'custom_species', '') or '').strip()

        if species == Pet.OTHER:
            if not custom_species:
                raise serializers.ValidationError({'custom_species': 'Enter the actual pet type when you choose Other.'})
            attrs['custom_species'] = custom_species
        else:
            attrs['custom_species'] = ''

        proof_requirements = [
            ('is_vaccinated', 'vaccination_proof_url', 'Upload vaccination proof before marking this pet as vaccinated.'),
            ('is_dewormed', 'deworming_proof_url', 'Upload deworming proof before marking this pet as dewormed.'),
            ('is_neutered', 'neutering_proof_url', 'Upload spay or neuter proof before marking this pet as neutered.'),
        ]

        for flag_field, proof_field, message in proof_requirements:
            is_marked = attrs.get(flag_field, getattr(self.instance, flag_field, False))
            proof_value = (attrs.get(proof_field, getattr(self.instance, proof_field, '')) or '').strip()

            if is_marked and not proof_value:
                raise serializers.ValidationError({proof_field: message})

        return attrs

    def get_species_label(self, obj):
        if obj.species == Pet.OTHER and obj.custom_species:
            return obj.custom_species
        return obj.get_species_display()

    def create(self, validated_data):
        request = self.context.get('request')
        owner = request.user if request else None
        image_url = validated_data.pop('image_url', '')
        validated_data['owner'] = owner
        pet = super().create(validated_data)

        if image_url:
            PetImage.objects.create(
                pet=pet,
                image_url=image_url,
                is_main=True,
            )

        return pet

    def update(self, instance, validated_data):
        image_url = validated_data.pop('image_url', '')
        additional_image_url = validated_data.pop('additional_image_url', '')
        pet = super().update(instance, validated_data)

        if image_url:
            main_image = pet.images.filter(is_main=True).first()

            if main_image:
                main_image.image_url = image_url
                main_image.save(update_fields=['image_url'])
            else:
                PetImage.objects.create(
                    pet=pet,
                    image_url=image_url,
                    is_main=True,
                )

        if additional_image_url:
            PetImage.objects.create(
                pet=pet,
                image_url=additional_image_url,
                is_main=False,
            )

        return pet


class AdoptionApplicationSerializer(serializers.ModelSerializer):
    applicant = PublicUserSerializer(read_only=True)
    pet = PetSerializer(read_only=True)
    pet_id = serializers.PrimaryKeyRelatedField(
        queryset=Pet.objects.all(), source='pet', write_only=True,
    )

    class Meta:
        model = AdoptionApplication
        fields = [
            'id',
            'pet',
            'pet_id',
            'applicant',
            'message',
            'housing_type',
            'has_other_pets',
            'has_children',
            'pet_experience',
            'can_afford_vet_care',
            'preferred_visit_date',
            'meeting_preference',
            'meeting_location_notes',
            'visit_status',
            'visit_proposed_by',
            'visit_confirmed_at',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'applicant',
            'pet',
            'visit_status',
            'visit_proposed_by',
            'visit_confirmed_at',
            'status',
            'created_at',
            'updated_at',
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['applicant'] = request.user
        if (
            validated_data.get('preferred_visit_date')
            or validated_data.get('meeting_preference')
            or validated_data.get('meeting_location_notes')
        ):
            validated_data['visit_status'] = AdoptionApplication.VISIT_PROPOSED
            validated_data['visit_proposed_by'] = AdoptionApplication.VISIT_PROPOSED_BY_ADOPTER
        return super().create(validated_data)


class VisitPlanUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdoptionApplication
        fields = [
            'preferred_visit_date',
            'meeting_preference',
            'meeting_location_notes',
        ]

    def validate(self, attrs):
        if not attrs.get('preferred_visit_date'):
            raise serializers.ValidationError({'preferred_visit_date': 'Choose a proposed date.'})

        if not attrs.get('meeting_preference'):
            raise serializers.ValidationError({'meeting_preference': 'Choose a meeting style.'})

        return attrs


class PetWishlistSerializer(serializers.ModelSerializer):
    pet = PetSerializer(read_only=True)
    pet_id = serializers.PrimaryKeyRelatedField(
        queryset=Pet.objects.all(),
        source='pet',
        write_only=True,
    )

    class Meta:
        model = PetWishlist
        fields = ['id', 'pet', 'pet_id', 'added_at']
        read_only_fields = ['id', 'pet', 'added_at']


class NotificationSerializer(serializers.ModelSerializer):
    recipient = PublicUserSerializer(read_only=True)
    actor = PublicUserSerializer(read_only=True)
    pet = PetSerializer(read_only=True)
    application_id = serializers.SerializerMethodField()
    conversation_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'actor',
            'pet',
            'type',
            'title',
            'message',
            'read',
            'application_id',
            'conversation_id',
            'created_at',
        ]
        read_only_fields = fields

    def get_application_id(self, obj):
        return obj.application_id

    def get_conversation_id(self, obj):
        return obj.conversation_id


class ConversationMessageSerializer(serializers.ModelSerializer):
    sender = PublicUserSerializer(read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = ConversationMessage
        fields = [
            'id',
            'sender',
            'body',
            'is_mine',
            'created_at',
            'read_at',
        ]
        read_only_fields = fields

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and obj.sender_id == request.user.id)


class ConversationMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationMessage
        fields = ['body']

    def validate_body(self, value):
        body = (value or '').strip()

        if not body:
            raise serializers.ValidationError('Message cannot be empty.')

        return body


class ConversationSerializer(serializers.ModelSerializer):
    pet = PetSerializer(read_only=True)
    other_participant = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    messages = ConversationMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id',
            'pet',
            'adopter',
            'rehomer',
            'other_participant',
            'last_message',
            'unread_count',
            'messages',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def _get_other_participant(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.rehomer

        if obj.adopter_id == request.user.id:
            return obj.rehomer

        return obj.adopter

    def get_other_participant(self, obj):
        participant = self._get_other_participant(obj)
        return PublicUserSerializer(participant, context=self.context).data

    def get_last_message(self, obj):
        last_message = obj.messages.order_by('-created_at').first()
        if not last_message:
            return None

        return ConversationMessageSerializer(last_message, context=self.context).data

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0

        return obj.messages.filter(read_at__isnull=True).exclude(sender=request.user).count()


class CommunityAuthorSerializer(serializers.ModelSerializer):
    community_alias = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'community_alias', 'profile_photo_url', 'activity_status', 'is_online']
        read_only_fields = fields

    def get_community_alias(self, obj):
        return obj.community_alias or f"PetPal{obj.id}"


class CommunityCommentSerializer(serializers.ModelSerializer):
    author = CommunityAuthorSerializer(read_only=True)
    like_count = serializers.SerializerMethodField()
    dislike_count = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()

    class Meta:
        model = CommunityComment
        fields = [
            'id',
            'author',
            'body',
            'image_url',
            'video_url',
            'sticker',
            'like_count',
            'dislike_count',
            'user_reaction',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_like_count(self, obj):
        return obj.reactions.filter(value=CommunityReaction.LIKE).count()

    def get_dislike_count(self, obj):
        return obj.reactions.filter(value=CommunityReaction.DISLIKE).count()

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        reaction = obj.reactions.filter(user=request.user).only('value').first()
        return reaction.value if reaction else None


class CommunityPostSerializer(serializers.ModelSerializer):
    author = CommunityAuthorSerializer(read_only=True)
    comments = CommunityCommentSerializer(many=True, read_only=True)
    repost_of = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    dislike_count = serializers.SerializerMethodField()
    repost_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    user_has_reposted = serializers.SerializerMethodField()

    class Meta:
        model = CommunityPost
        fields = [
            'id',
            'author',
            'body',
            'image_url',
            'category',
            'repost_of',
            'like_count',
            'dislike_count',
            'repost_count',
            'comment_count',
            'user_reaction',
            'user_has_reposted',
            'comments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'author',
            'repost_of',
            'like_count',
            'dislike_count',
            'repost_count',
            'comment_count',
            'user_reaction',
            'user_has_reposted',
            'comments',
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        body = (attrs.get('body') or '').strip()
        image_url = (attrs.get('image_url') or '').strip()

        if not body and not image_url:
            raise serializers.ValidationError('Write something or add a photo before posting.')

        attrs['body'] = body
        attrs['image_url'] = image_url
        return attrs

    def get_repost_of(self, obj):
        if not obj.repost_of:
            return None

        return {
            'id': obj.repost_of.id,
            'body': obj.repost_of.body,
            'image_url': obj.repost_of.image_url,
            'author_alias': obj.repost_of.author.community_alias or f"PetPal{obj.repost_of.author_id}",
            'category': obj.repost_of.category,
        }

    def get_like_count(self, obj):
        return obj.reactions.filter(value=CommunityReaction.LIKE).count()

    def get_dislike_count(self, obj):
        return obj.reactions.filter(value=CommunityReaction.DISLIKE).count()

    def get_repost_count(self, obj):
        return obj.reposts.count()

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        reaction = obj.reactions.filter(user=request.user).only('value').first()
        return reaction.value if reaction else None

    def get_user_has_reposted(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False

        return CommunityPost.objects.filter(author=request.user, repost_of=obj).exists()


class CommunityCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityComment
        fields = ['body', 'image_url', 'video_url', 'sticker']

    def validate(self, attrs):
        body = (attrs.get('body') or '').strip()
        image_url = (attrs.get('image_url') or '').strip()
        video_url = (attrs.get('video_url') or '').strip()
        sticker = (attrs.get('sticker') or '').strip()

        if not body and not image_url and not video_url and not sticker:
            raise serializers.ValidationError('Add text, a sticker, or media before commenting.')

        attrs['body'] = body
        attrs['image_url'] = image_url
        attrs['video_url'] = video_url
        attrs['sticker'] = sticker
        return attrs
