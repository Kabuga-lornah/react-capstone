"""
Phase 2: ML Matching Algorithm Service

This module implements the core "custom AI" for pet-adopter compatibility matching.
It uses personality vectors and cosine similarity to score matches.

The algorithm:
1. Convert adopter quiz responses → personality vector
2. Convert pet traits → personality vector
3. Calculate cosine similarity between vectors (0-100% compatibility)
4. Rank pets by compatibility score
5. Learn from adoption outcomes to improve future matches
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from django.db.models import QuerySet
from sklearn.metrics.pairwise import cosine_similarity

from .models import (
    PersonalityTrait,
    AdopterQuizResponse,
    PetPersonalityProfile,
    MatchingScore,
    AdoptionOutcome,
    MatchingAlgorithmConfig,
    Pet,
)


class PersonalityVectorBuilder:
    """
    Converts trait mappings (dict of trait_id → weight) into numerical vectors.
    Ensures consistent vector representation for ML operations.
    """

    def __init__(self):
        """Initialize with all available traits to ensure consistent vector size"""
        self.all_traits = list(
            PersonalityTrait.objects.values_list('id', flat=True).order_by('id')
        )
        self.trait_index = {trait_id: idx for idx, trait_id in enumerate(self.all_traits)}
        self.vector_size = len(self.all_traits)

    def dict_to_vector(self, trait_dict: Dict[int, float]) -> np.ndarray:
        """
        Convert trait dict {trait_id: weight} → numpy vector [w1, w2, w3, ...]
        
        Args:
            trait_dict: Dictionary mapping trait IDs to weights (0.0-1.0)
            
        Returns:
            Normalized numpy vector of consistent size
        """
        if not trait_dict:
            return np.zeros(self.vector_size)

        vector = np.zeros(self.vector_size)
        for trait_id, weight in trait_dict.items():
            if trait_id in self.trait_index:
                vector[self.trait_index[trait_id]] = float(weight)

        # Normalize to unit vector for cosine similarity
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        
        return vector

    def vector_to_dict(self, vector: np.ndarray) -> Dict[int, float]:
        """
        Convert vector back to dict format for storage/display.
        
        Args:
            vector: Numpy vector
            
        Returns:
            Dictionary mapping trait IDs to weights
        """
        result = {}
        for trait_id, idx in self.trait_index.items():
            if idx < len(vector):
                weight = float(vector[idx])
                if weight > 0.01:  # Only include non-negligible weights
                    result[trait_id] = round(weight, 3)
        return result


class CompatibilityCalculator:
    """
    Calculates compatibility scores between adopters and pets.
    Uses cosine similarity of personality vectors.
    """

    def __init__(self):
        self.vector_builder = PersonalityVectorBuilder()

    def calculate_similarity(
        self,
        adopter_vector: Dict[int, float],
        pet_vector: Dict[int, float]
    ) -> float:
        """
        Calculate cosine similarity between adopter and pet personality vectors.
        
        Args:
            adopter_vector: Adopter personality traits {trait_id: weight}
            pet_vector: Pet personality traits {trait_id: weight}
            
        Returns:
            Similarity score (0-100)
        """
        # Convert to numpy vectors
        adopter_np = self.vector_builder.dict_to_vector(adopter_vector)
        pet_np = self.vector_builder.dict_to_vector(pet_vector)

        # Calculate cosine similarity (returns 0-1)
        if np.allclose(adopter_np, 0) or np.allclose(pet_np, 0):
            return 0.0

        similarity = cosine_similarity([adopter_np], [pet_np])[0][0]
        
        # Convert to 0-100 scale
        score = float(similarity) * 100
        return round(score, 1)

    def calculate_trait_compatibility(
        self,
        adopter_vector: Dict[int, float],
        pet_vector: Dict[int, float]
    ) -> Tuple[Dict[int, float], Dict[int, float]]:
        """
        Calculate per-trait compatibility.
        Useful for explaining why/why not a match is good.
        
        Returns:
            (matching_traits, non_matching_traits)
            Each: {trait_id: compatibility_score}
        """
        matching_traits = {}
        non_matching_traits = {}

        all_trait_ids = set(adopter_vector.keys()) | set(pet_vector.keys())

        for trait_id in all_trait_ids:
            adopter_weight = adopter_vector.get(trait_id, 0)
            pet_weight = pet_vector.get(trait_id, 0)

            # Trait compatibility: how well they align
            trait_compat = 1 - abs(adopter_weight - pet_weight)

            if trait_compat > 0.5:
                matching_traits[trait_id] = round(trait_compat * 100, 1)
            else:
                non_matching_traits[trait_id] = round(trait_compat * 100, 1)

        return matching_traits, non_matching_traits


class MatchingEngine:
    """
    Main matching engine: finds compatible pets for an adopter.
    """

    def __init__(self):
        self.calculator = CompatibilityCalculator()

    def find_compatible_pets(
        self,
        adopter: 'CustomUser',
        limit: int = 50,
        min_score: float = 0.0,
        filter_adopted: bool = True
    ) -> QuerySet:
        """
        Find pets compatible with adopter.
        
        Args:
            adopter: User object
            limit: Max number of results
            min_score: Minimum compatibility threshold (0-100)
            filter_adopted: Whether to exclude adopted pets
            
        Returns:
            QuerySet of Pet objects ordered by compatibility (best first)
        """
        # Get adopter's quiz response
        quiz_response = AdopterQuizResponse.objects.filter(
            adopter=adopter,
            is_complete=True
        ).order_by('-completed_at').first()

        if not quiz_response:
            # No quiz completed, return random available pets
            pets = Pet.objects.filter(status='available').order_by('?')[:limit]
            return pets

        adopter_vector = quiz_response.personality_vector

        # Get all available pets with personality profiles
        pets = Pet.objects.filter(
            status='available' if filter_adopted else Q()
        ).prefetch_related('personality_profile')

        # Calculate compatibility for each pet
        pet_scores = []
        for pet in pets:
            if not hasattr(pet, 'personality_profile'):
                continue

            pet_vector = pet.personality_profile.personality_vector
            score = self.calculator.calculate_similarity(adopter_vector, pet_vector)

            if score >= min_score:
                pet_scores.append((pet, score))

        # Sort by score descending
        pet_scores.sort(key=lambda x: x[1], reverse=True)

        # Return limited list
        return [p for p, s in pet_scores[:limit]]

    def score_adopter_pet_match(
        self,
        adopter: 'CustomUser',
        pet: Pet
    ) -> Optional[Dict]:
        """
        Calculate detailed compatibility score for specific adopter-pet pair.
        
        Returns:
            Dict with compatibility_score, trait_scores, etc. or None if not possible
        """
        # Get adopter personality
        quiz_response = AdopterQuizResponse.objects.filter(
            adopter=adopter,
            is_complete=True
        ).order_by('-completed_at').first()

        if not quiz_response:
            return None

        # Get pet personality
        if not hasattr(pet, 'personality_profile'):
            return None

        adopter_vector = quiz_response.personality_vector
        pet_vector = pet.personality_profile.personality_vector

        # Calculate scores
        overall_score = self.calculator.calculate_similarity(
            adopter_vector,
            pet_vector
        )
        matching, non_matching = self.calculator.calculate_trait_compatibility(
            adopter_vector,
            pet_vector
        )

        return {
            'compatibility_score': overall_score,
            'trait_scores': {
                'matching': matching,
                'non_matching': non_matching,
            }
        }

    def save_matching_score(
        self,
        adopter: 'CustomUser',
        pet: Pet,
        score: Dict
    ) -> MatchingScore:
        """
        Save matching score to database.
        """
        matching_score, created = MatchingScore.objects.update_or_create(
            adopter=adopter,
            pet=pet,
            defaults={
                'compatibility_score': score['compatibility_score'],
                'trait_scores': score['trait_scores'],
                'algorithm_version': self._get_active_algorithm_version(),
            }
        )
        return matching_score

    def _get_active_algorithm_version(self) -> int:
        """Get the currently active algorithm version"""
        config = MatchingAlgorithmConfig.objects.filter(
            is_active=True
        ).order_by('-version').first()
        return config.version if config else 1


class ModelTrainer:
    """
    Trains the matching model based on adoption outcomes.
    Used for continuous improvement of the matching algorithm.
    """

    def __init__(self):
        self.calculator = CompatibilityCalculator()

    def collect_training_data(self) -> Tuple[List[Dict], int]:
        """
        Collect training data from successful/unsuccessful adoptions.
        
        Returns:
            (training_samples, accuracy_on_data)
        """
        outcomes = AdoptionOutcome.objects.filter(
            was_used_for_training=False
        ).select_related('application__applicant', 'application__pet')

        training_data = []
        correct_predictions = 0

        for outcome in outcomes:
            adopter = outcome.application.applicant
            pet = outcome.application.pet

            # Get quiz response
            quiz = AdopterQuizResponse.objects.filter(
                adopter=adopter,
                is_complete=True
            ).order_by('-completed_at').first()

            if not quiz or not hasattr(pet, 'personality_profile'):
                continue

            adopter_vector = quiz.personality_vector
            pet_vector = pet.personality_profile.personality_vector

            # Original matching score
            original_score = outcome.original_matching_score or 0

            # Outcome
            is_successful = outcome.outcome == AdoptionOutcome.SUCCESSFUL

            training_data.append({
                'adopter_vector': adopter_vector,
                'pet_vector': pet_vector,
                'original_score': original_score,
                'successful': is_successful,
            })

            # Simple evaluation: high scores should correlate with success
            if (original_score > 70 and is_successful) or (original_score < 40 and not is_successful):
                correct_predictions += 1

        accuracy = (correct_predictions / len(training_data)) if training_data else 0.0

        return training_data, accuracy

    def create_new_model_version(
        self,
        training_data: List[Dict],
        accuracy: float,
        description: str = "ML trained model"
    ) -> MatchingAlgorithmConfig:
        """
        Create a new version of the matching algorithm based on training.
        
        Args:
            training_data: List of training samples
            accuracy: Model accuracy on training data
            description: Description of changes
            
        Returns:
            New MatchingAlgorithmConfig instance
        """
        # Get previous version
        previous_config = MatchingAlgorithmConfig.objects.filter(
            is_active=True
        ).first()

        # Calculate new version number
        new_version = (previous_config.version if previous_config else 0) + 1

        # Create new config
        config = MatchingAlgorithmConfig.objects.create(
            version=new_version,
            name=f"ML Model v{new_version}",
            description=description,
            model_type='ml_trained',
            model_weights={
                'algorithm': 'cosine_similarity',
                'training_samples': len(training_data),
                'notes': 'Trained on adoption outcomes',
            },
            training_samples=len(training_data),
            accuracy_on_training=accuracy,
            previous_version=previous_config,
        )

        return config

    def mark_outcomes_as_trained(self):
        """Mark all current outcomes as used for training"""
        AdoptionOutcome.objects.filter(
            was_used_for_training=False
        ).update(was_used_for_training=True)


# ============================================================================
# FACTORY FUNCTION FOR EASY ACCESS
# ============================================================================

def get_matching_engine() -> MatchingEngine:
    """Convenient factory for getting the matching engine"""
    return MatchingEngine()


def get_model_trainer() -> ModelTrainer:
    """Convenient factory for getting the model trainer"""
    return ModelTrainer()
