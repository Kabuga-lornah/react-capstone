from rest_framework import serializers
from django.utils import timezone

from .models import (
    AdoptionApplication,
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


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'bio',
            'profile_photo_url',
            'id_front_url',
            'id_back_url',
        ]


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
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user


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

    class Meta:
        model = Pet
        fields = [
            'id',
            'name',
            'species',
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
        read_only_fields = ['id', 'owner', 'shelter', 'images', 'created_at', 'updated_at', 'status']

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
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'applicant', 'pet', 'status', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['applicant'] = request.user
        return super().create(validated_data)


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
            'created_at',
        ]
        read_only_fields = fields
