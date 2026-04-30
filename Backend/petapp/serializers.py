from rest_framework import serializers

from .models import AdoptionApplication, CustomUser, Pet, PetImage, PetWishlist, Shelter


class UserSerializer(serializers.ModelSerializer):
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
            'organization',
        ]
        read_only_fields = ['id', 'role', 'organization']


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
    owner = UserSerializer(read_only=True)

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
    owner = UserSerializer(read_only=True)
    shelter = ShelterSerializer(read_only=True)
    images = PetImageSerializer(many=True, read_only=True)
    image_url = serializers.URLField(write_only=True, required=False, allow_blank=True)

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
            'is_vaccinated',
            'is_dewormed',
            'is_neutered',
            'adoption_fee',
            'status',
            'owner',
            'shelter',
            'images',
            'image_url',
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

        return pet


class AdoptionApplicationSerializer(serializers.ModelSerializer):
    applicant = UserSerializer(read_only=True)
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
