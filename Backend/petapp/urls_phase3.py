"""
Phase 3: URL Configuration for Quiz, Matching, and User Preference Endpoints
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_phase3 import (
    TraitCategoryViewSet,
    PersonalityTraitViewSet,
    QuizCategoryViewSet,
    QuizQuestionViewSet,
    AdopterQuizResponseViewSet,
    PetPersonalityViewSet,
    MatchingViewSet,
    UserPreferencesViewSet,
    AdoptionOutcomeViewSet,
)

# Create router for viewsets
router = DefaultRouter()
router.register(r'traits/categories', TraitCategoryViewSet, basename='trait-category')
router.register(r'traits/traits', PersonalityTraitViewSet, basename='personality-trait')
router.register(r'quiz/categories', QuizCategoryViewSet, basename='quiz-category')
router.register(r'quiz/questions', QuizQuestionViewSet, basename='quiz-question')
router.register(r'quiz/responses', AdopterQuizResponseViewSet, basename='quiz-response')
router.register(r'outcomes', AdoptionOutcomeViewSet, basename='adoption-outcome')
router.register(r'matching', MatchingViewSet, basename='matching')
router.register(r'users/me/preferences', UserPreferencesViewSet, basename='user-preferences')

# Manual endpoints for non-standard patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Pet personality endpoints (manual because they use pet_id in path)
    path('pets/<int:pet_id>/personality/', 
         PetPersonalityViewSet.as_view({
             'get': 'retrieve',
             'post': 'create',
             'put': 'create'
         }), 
         name='pet-personality'),
]
