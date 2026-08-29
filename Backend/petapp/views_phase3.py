"""
Phase 3: REST API Endpoints for Quiz, Matching, and Pet Management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q
from datetime import timedelta

from .models import (
    TraitCategory,
    PersonalityTrait,
    QuizCategory,
    QuizQuestion,
    QuizAnswer,
    AdopterQuizResponse,
    PetPersonalityProfile,
    MatchingScore,
    Pet,
    CustomUser,
    AdoptionOutcome,
)
from .serializers_phase1 import (
    TraitCategorySerializer,
    PersonalityTraitSerializer,
    QuizCategorySerializer,
    QuizQuestionSerializer,
    QuizAnswerSerializer,
    AdopterQuizResponseSerializer,
    AdopterQuizResponseCreateSerializer,
    PetPersonalityProfileSerializer,
    MatchingScoreSerializer,
    MatchingScoreListSerializer,
    AdoptionOutcomeSerializer,
)
from .matching_service import get_matching_engine, CompatibilityCalculator


class TraitCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for personality trait categories.
    GET /api/traits/categories/ - list all categories
    GET /api/traits/categories/{id}/ - get specific category
    """
    queryset = TraitCategory.objects.all()
    serializer_class = TraitCategorySerializer
    permission_classes = [AllowAny]
    ordering = ['display_order']


class PersonalityTraitViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for personality traits.
    GET /api/traits/traits/ - list all traits
    GET /api/traits/traits/{id}/ - get specific trait
    """
    queryset = PersonalityTrait.objects.all()
    serializer_class = PersonalityTraitSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Filter by category and trait_type if provided"""
        qs = PersonalityTrait.objects.all()
        category_id = self.request.query_params.get('category_id')
        trait_type = self.request.query_params.get('trait_type')
        
        if category_id:
            qs = qs.filter(category_id=category_id)
        if trait_type in ['ADOPTER', 'PET', 'BOTH']:
            qs = qs.filter(trait_type=trait_type)
        
        return qs


class QuizCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for quiz categories.
    GET /api/quiz/categories/ - list all quiz categories
    GET /api/quiz/categories/{id}/ - get specific category with questions
    """
    queryset = QuizCategory.objects.all()
    serializer_class = QuizCategorySerializer
    permission_classes = [AllowAny]
    ordering = ['display_order']


class QuizQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for quiz questions.
    GET /api/quiz/questions/ - list all questions
    GET /api/quiz/questions/{id}/ - get specific question with answers
    """
    queryset = QuizQuestion.objects.all()
    serializer_class = QuizQuestionSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Filter by category if provided"""
        qs = QuizQuestion.objects.all()
        category_id = self.request.query_params.get('category_id')
        
        if category_id:
            qs = qs.filter(category_id=category_id)
        
        return qs.prefetch_related('answers')


class AdopterQuizResponseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for adopter quiz responses.
    POST /api/quiz/responses/ - start/create new quiz response
    GET /api/quiz/responses/{id}/ - get adopter's quiz response
    PUT /api/quiz/responses/{id}/ - update quiz response
    POST /api/quiz/responses/{id}/submit/ - submit quiz and calculate personality
    GET /api/quiz/responses/current/ - get current user's active quiz
    """
    serializer_class = AdopterQuizResponseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only show user's own quiz responses"""
        return AdopterQuizResponse.objects.filter(adopter=self.request.user)
    
    def get_serializer_class(self):
        """Use create serializer for POST/PUT requests"""
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            return AdopterQuizResponseCreateSerializer
        return AdopterQuizResponseSerializer
    
    def perform_create(self, serializer):
        """Create quiz response for current user"""
        serializer.save(adopter=self.request.user)
    
    @action(detail=True, methods=['post'], url_path='submit')
    def submit_quiz(self, request, pk=None):
        """
        Submit quiz and calculate personality vector.
        
        POST /api/quiz/responses/{id}/submit/
        Body: {"complete": true}
        
        Returns: Updated quiz response with personality vector
        """
        quiz_response = self.get_object()
        
        if quiz_response.adopter != request.user:
            return Response(
                {"detail": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mark as complete and recalculate personality
        quiz_response.is_complete = True
        quiz_response.completed_at = __import__('django.utils.timezone', fromlist=['now']).now()
        quiz_response.calculate_personality_vector()
        quiz_response.save()
        
        # Generate matching suggestions after quiz completion
        engine = get_matching_engine()
        compatible_pets = engine.find_compatible_pets(
            request.user,
            limit=50,
            min_score=40.0
        )
        
        serializer = self.get_serializer(quiz_response)
        return Response({
            "quiz_response": serializer.data,
            "compatible_pets_count": len(compatible_pets),
            "message": f"Quiz submitted! Found {len(compatible_pets)} compatible pets."
        })
    
    @action(detail=False, methods=['get'], url_path='current')
    def current_quiz(self, request):
        """
        Get current user's active (incomplete) quiz response.
        
        GET /api/quiz/responses/current/
        
        Returns: User's active quiz or error if none exists
        """
        quiz_response = AdopterQuizResponse.objects.filter(
            adopter=request.user,
            is_complete=False
        ).first()
        
        if not quiz_response:
            return Response(
                {"detail": "No active quiz found. Start a new one."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(quiz_response)
        return Response(serializer.data)


class PetPersonalityViewSet(viewsets.ViewSet):
    """
    ViewSet for pet personality profiles.
    POST /api/pets/{pet_id}/personality/ - create/update pet personality
    GET /api/pets/{pet_id}/personality/ - get pet personality
    """
    permission_classes = [IsAuthenticated]
    
    def create(self, request, pet_id=None):
        """
        Create or update pet personality profile.
        
        POST /api/pets/{pet_id}/personality/
        Body: {"traits": {trait_id: weight, ...}, "data_source": "manual|adoption_data"}
        """
        pet = get_object_or_404(Pet, id=pet_id)
        
        # Check if user is rehomer (owns the pet)
        if hasattr(pet, 'rehomer') and pet.rehomer != request.user:
            return Response(
                {"detail": "Only the pet owner can update personality"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            profile, created = PetPersonalityProfile.objects.get_or_create(
                pet=pet,
                defaults={
                    "personality_vector": {},
                    "data_source": request.data.get("data_source", "manual"),
                    "confidence_score": 0.5
                }
            )
            
            # Update traits from request
            if "traits" in request.data:
                profile.personality_vector = request.data.get("traits")
                profile.data_source = request.data.get("data_source", "manual")
                profile.save()
            
            serializer = PetPersonalityProfileSerializer(profile)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pet_id=None):
        """
        Get pet personality profile.
        
        GET /api/pets/{pet_id}/personality/
        """
        pet = get_object_or_404(Pet, id=pet_id)
        profile = get_object_or_404(PetPersonalityProfile, pet=pet)
        
        serializer = PetPersonalityProfileSerializer(profile)
        return Response(serializer.data)


class MatchingViewSet(viewsets.ViewSet):
    """
    ViewSet for pet matching calculations.
    POST /api/matching/calculate/ - get compatible pets for adopter
    GET /api/matching/score/{adopter_id}/{pet_id}/ - get specific match score
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """
        Calculate compatible pets for adopter based on their personality.
        
        POST /api/matching/calculate/
        Body: {"min_score": 40.0, "limit": 50}
        
        Returns: List of compatible pets ranked by compatibility score
        """
        try:
            min_score = float(request.data.get("min_score", 40.0))
            limit = int(request.data.get("limit", 50))
            
            engine = get_matching_engine()
            compatible_pets = engine.find_compatible_pets(
                request.user,
                limit=limit,
                min_score=min_score
            )
            
            serializer = MatchingScoreListSerializer(
                compatible_pets,
                many=True
            )
            
            return Response({
                "adopter_id": request.user.id,
                "matching_algorithm_version": "1.0",
                "min_score_threshold": min_score,
                "compatible_pets_found": len(compatible_pets),
                "results": serializer.data
            })
        
        except Exception as e:
            return Response(
                {"error": f"Matching calculation failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], url_path='score/(?P<adopter_id>\d+)/(?P<pet_id>\d+)')
    def get_score(self, request, adopter_id=None, pet_id=None):
        """
        Get specific matching score between adopter and pet.
        
        GET /api/matching/score/{adopter_id}/{pet_id}/
        
        Returns: Detailed compatibility breakdown
        """
        try:
            adopter = get_object_or_404(CustomUser, id=adopter_id)
            pet = get_object_or_404(Pet, id=pet_id)
            
            engine = get_matching_engine()
            match_details = engine.score_adopter_pet_match(adopter, pet)
            
            # Get or create matching score record
            score, created = MatchingScore.objects.get_or_create(
                adopter=adopter,
                pet=pet,
                defaults={
                    "compatibility_score": match_details["compatibility_score"],
                    "algorithm_version": "1.0"
                }
            )
            
            serializer = MatchingScoreSerializer(score)
            return Response({
                "match_details": match_details,
                "stored_record": serializer.data,
                "is_new": created
            })
        
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserPreferencesViewSet(viewsets.ViewSet):
    """
    ViewSet for user preferences.
    PUT /api/users/me/preferences/ - update language and timezone
    GET /api/users/me/preferences/ - get user preferences
    """
    permission_classes = [IsAuthenticated]
    
    def update(self, request):
        """
        Update user language and timezone preferences.
        
        PUT /api/users/me/preferences/
        Body: {"preferred_language": "EN", "timezone": "UTC"}
        
        Returns: Updated user preferences
        """
        user = request.user
        
        if "preferred_language" in request.data:
            user.preferred_language = request.data.get("preferred_language")
        
        if "timezone" in request.data:
            user.timezone = request.data.get("timezone")
        
        user.save()
        
        return Response({
            "user_id": user.id,
            "preferred_language": user.preferred_language,
            "timezone": user.timezone,
            "message": "Preferences updated successfully"
        })
    
    def retrieve(self, request):
        """
        Get current user's preferences.
        
        GET /api/users/me/preferences/
        """
        user = request.user
        
        return Response({
            "user_id": user.id,
            "preferred_language": user.preferred_language,
            "timezone": user.timezone,
            "language_choices": [choice[0] for choice in CustomUser._meta.get_field('preferred_language').choices]
        })


class AdoptionOutcomeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for tracking adoption outcomes (for ML model training).
    POST /api/outcomes/ - record adoption outcome
    GET /api/outcomes/ - list outcomes
    """
    serializer_class = AdoptionOutcomeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by adopter if provided"""
        qs = AdoptionOutcome.objects.all()
        
        # Allow filtering by adopter_id query param
        adopter_id = self.request.query_params.get('adopter_id')
        if adopter_id:
            qs = qs.filter(adopter_id=adopter_id)
        
        return qs.select_related('adopter', 'pet', 'matching_score')
    
    def perform_create(self, serializer):
        """Record outcome for tracking adoption success"""
        serializer.save()
