"""
Phase 1 Serializers: Personality Traits, Quiz System, and Matching
These serializers expose the ML matching models through REST APIs.
"""

from rest_framework import serializers
from django.utils import timezone
from .models import (
    TraitCategory,
    PersonalityTrait,
    BreedTraitProfile,
    QuizCategory,
    QuizQuestion,
    QuizAnswer,
    AdopterQuizResponse,
    PetPersonalityProfile,
    MatchingScore,
    AdoptionOutcome,
    MatchingAlgorithmConfig,
)


# ============================================================================
# PHASE 1.1: PERSONALITY TRAIT SERIALIZERS
# ============================================================================

class TraitCategorySerializer(serializers.ModelSerializer):
    """Serializer for personality trait categories"""
    class Meta:
        model = TraitCategory
        fields = [
            'id',
            'name',
            'description',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PersonalityTraitSerializer(serializers.ModelSerializer):
    """Serializer for individual personality traits"""
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = PersonalityTrait
        fields = [
            'id',
            'name',
            'description',
            'category',
            'category_name',
            'trait_type',
            'default_weight',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BreedTraitProfileSerializer(serializers.ModelSerializer):
    """Serializer for breed-specific personality profiles"""
    class Meta:
        model = BreedTraitProfile
        fields = [
            'id',
            'species',
            'breed',
            'data_source',
            'trait_weights',
            'confidence_score',
            'sample_size',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PetPersonalityProfileSerializer(serializers.ModelSerializer):
    """Serializer for individual pet personality profiles"""
    pet_name = serializers.CharField(source='pet.name', read_only=True)
    breed_name = serializers.CharField(source='breed_profile.breed', read_only=True)

    class Meta:
        model = PetPersonalityProfile
        fields = [
            'id',
            'pet',
            'pet_name',
            'personality_vector',
            'data_source',
            'confidence_score',
            'breed_profile',
            'breed_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================================================
# PHASE 1.2: QUIZ SYSTEM SERIALIZERS
# ============================================================================

class QuizCategorySerializer(serializers.ModelSerializer):
    """Serializer for quiz categories"""
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = QuizCategory
        fields = [
            'id',
            'name',
            'description',
            'display_order',
            'icon',
            'question_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_question_count(self, obj):
        return obj.questions.count()


class QuizAnswerSerializer(serializers.ModelSerializer):
    """Serializer for quiz answer options"""
    class Meta:
        model = QuizAnswer
        fields = [
            'id',
            'answer_text',
            'help_text',
            'trait_mappings',
            'display_order',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Serializer for quiz questions"""
    answers = QuizAnswerSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = QuizQuestion
        fields = [
            'id',
            'question_text',
            'question_type',
            'category',
            'category_name',
            'help_text',
            'is_required',
            'display_order',
            'min_value',
            'max_value',
            'answers',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuizQuestionDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for quiz questions with answers for display"""
    answers = QuizAnswerSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = QuizQuestion
        fields = [
            'id',
            'question_text',
            'question_type',
            'category',
            'category_name',
            'help_text',
            'is_required',
            'display_order',
            'min_value',
            'max_value',
            'answers',
        ]


class AdopterQuizResponseSerializer(serializers.ModelSerializer):
    """Serializer for user quiz responses"""
    adopter_name = serializers.CharField(source='adopter.username', read_only=True)
    completion_percentage = serializers.SerializerMethodField()

    class Meta:
        model = AdopterQuizResponse
        fields = [
            'id',
            'adopter',
            'adopter_name',
            'responses',
            'personality_vector',
            'is_complete',
            'completed_at',
            'quiz_version',
            'completion_percentage',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'adopter_name',
            'personality_vector',
            'created_at',
            'updated_at',
        ]

    def get_completion_percentage(self, obj):
        """Calculate quiz completion percentage"""
        if not obj.responses:
            return 0
        total_questions = QuizQuestion.objects.filter(is_required=True).count()
        if total_questions == 0:
            return 100
        completed = len([v for v in obj.responses.values() if v is not None])
        return int((completed / total_questions) * 100)


class AdopterQuizResponseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating quiz responses"""
    class Meta:
        model = AdopterQuizResponse
        fields = [
            'responses',
            'is_complete',
        ]

    def update(self, instance, validated_data):
        """Update responses and recalculate personality vector"""
        responses = validated_data.get('responses', instance.responses)
        is_complete = validated_data.get('is_complete', instance.is_complete)

        instance.responses = responses
        instance.is_complete = is_complete
        if is_complete:
            instance.completed_at = timezone.now()
            instance.personality_vector = instance.calculate_personality_vector()

        instance.save()
        return instance


# ============================================================================
# PHASE 1.4: MATCHING SYSTEM SERIALIZERS
# ============================================================================

class MatchingScoreSerializer(serializers.ModelSerializer):
    """Serializer for pet-adopter compatibility scores"""
    adopter_name = serializers.CharField(source='adopter.username', read_only=True)
    pet_name = serializers.CharField(source='pet.name', read_only=True)
    pet_image = serializers.SerializerMethodField()

    class Meta:
        model = MatchingScore
        fields = [
            'id',
            'adopter',
            'adopter_name',
            'pet',
            'pet_name',
            'pet_image',
            'compatibility_score',
            'trait_scores',
            'algorithm_version',
            'was_viewed',
            'was_liked',
            'application_submitted',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'adopter_name',
            'pet_name',
            'pet_image',
            'compatibility_score',
            'trait_scores',
            'algorithm_version',
            'created_at',
        ]

    def get_pet_image(self, obj):
        """Get main pet image URL"""
        main_image = obj.pet.images.filter(is_main=True).first()
        return main_image.image_url if main_image else None


class MatchingScoreListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing multiple matches"""
    pet_name = serializers.CharField(source='pet.name', read_only=True)
    pet_breed = serializers.CharField(source='pet.breed', read_only=True)
    pet_image = serializers.SerializerMethodField()

    class Meta:
        model = MatchingScore
        fields = [
            'id',
            'pet',
            'pet_name',
            'pet_breed',
            'pet_image',
            'compatibility_score',
            'was_liked',
            'created_at',
        ]
        read_only_fields = fields

    def get_pet_image(self, obj):
        main_image = obj.pet.images.filter(is_main=True).first()
        return main_image.image_url if main_image else None


class AdoptionOutcomeSerializer(serializers.ModelSerializer):
    """Serializer for adoption outcomes (for ML training)"""
    application_id = serializers.IntegerField(source='application.id', read_only=True)
    pet_name = serializers.CharField(source='application.pet.name', read_only=True)
    adopter_name = serializers.CharField(source='application.applicant.username', read_only=True)

    class Meta:
        model = AdoptionOutcome
        fields = [
            'id',
            'application',
            'application_id',
            'pet_name',
            'adopter_name',
            'outcome',
            'duration_days',
            'feedback',
            'original_matching_score',
            'was_used_for_training',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'application_id',
            'pet_name',
            'adopter_name',
            'was_used_for_training',
            'created_at',
        ]


class MatchingAlgorithmConfigSerializer(serializers.ModelSerializer):
    """Serializer for matching algorithm configurations"""
    class Meta:
        model = MatchingAlgorithmConfig
        fields = [
            'id',
            'version',
            'name',
            'description',
            'model_type',
            'model_weights',
            'training_samples',
            'accuracy_on_training',
            'accuracy_on_validation',
            'is_active',
            'deployed_at',
            'previous_version',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'version',
            'created_at',
            'updated_at',
        ]


# ============================================================================
# UTILITY SERIALIZERS FOR BULK OPERATIONS
# ============================================================================

class PersonalityVectorSerializer(serializers.Serializer):
    """
    Generic serializer for personality vectors.
    Used for displaying adopter/pet compatibility vectors.
    """
    trait_id = serializers.IntegerField()
    trait_name = serializers.CharField()
    score = serializers.FloatField(min_value=0, max_value=1)


class CompatibilityReportSerializer(serializers.Serializer):
    """
    Serializer for detailed compatibility reports.
    Shows why an adopter matches a pet.
    """
    overall_score = serializers.FloatField()
    adopter_profile = PersonalityVectorSerializer(many=True)
    pet_profile = PersonalityVectorSerializer(many=True)
    matching_traits = PersonalityVectorSerializer(many=True)
    non_matching_traits = PersonalityVectorSerializer(many=True)
    recommendations = serializers.ListField(child=serializers.CharField())
