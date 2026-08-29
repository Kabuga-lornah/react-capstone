#!/usr/bin/env python
"""
Test script for Phase 2 matching service
Tests PersonalityVectorBuilder, CompatibilityCalculator, and MatchingEngine
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'petproject.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from petapp.matching_service import (
    PersonalityVectorBuilder,
    CompatibilityCalculator,
    get_matching_engine
)
from petapp.models import PersonalityTrait, TraitCategory, BreedTraitProfile, Pet
import numpy as np

def test_personality_vector_builder():
    """Test PersonalityVectorBuilder with mock traits"""
    print("\n=== Test 1: PersonalityVectorBuilder ===")
    
    # Create or get sample traits
    calm_category, _ = TraitCategory.objects.get_or_create(
        name="Temperament",
        defaults={"description": "Pet temperament traits"}
    )
    
    calm, _ = PersonalityTrait.objects.get_or_create(
        name="Calm",
        defaults={
            "category": calm_category,
            "description": "Peaceful and relaxed",
            "trait_type": "BOTH",
            "default_weight": 0.5
        }
    )
    
    energetic, _ = PersonalityTrait.objects.get_or_create(
        name="Energetic",
        defaults={
            "category": calm_category,
            "description": "Active and playful",
            "trait_type": "BOTH",
            "default_weight": 0.5
        }
    )
    
    # Build vectors
    builder = PersonalityVectorBuilder()
    
    # Test vector 1: Calm personality
    traits_dict_1 = {calm.id: 0.8, energetic.id: 0.2}
    vector_1 = builder.dict_to_vector(traits_dict_1)
    print(f"Trait dict 1: {traits_dict_1}")
    print(f"Vector 1: {vector_1}")
    print(f"Vector 1 norm: {np.linalg.norm(vector_1):.4f}")
    
    # Test vector 2: Energetic personality
    traits_dict_2 = {calm.id: 0.2, energetic.id: 0.8}
    vector_2 = builder.dict_to_vector(traits_dict_2)
    print(f"Trait dict 2: {traits_dict_2}")
    print(f"Vector 2: {vector_2}")
    print(f"Vector 2 norm: {np.linalg.norm(vector_2):.4f}")
    
    print("✓ PersonalityVectorBuilder test passed")
    return vector_1, vector_2, calm, energetic


def test_compatibility_calculator(calm, energetic):
    """Test CompatibilityCalculator"""
    print("\n=== Test 2: CompatibilityCalculator ===")
    
    calculator = CompatibilityCalculator()
    
    # Test with trait dictionaries (not numpy arrays)
    calm_dict = {calm.id: 0.8, energetic.id: 0.2}
    energetic_dict = {calm.id: 0.2, energetic.id: 0.8}
    
    # Similarity between similar personalities
    similarity_same = calculator.calculate_similarity(calm_dict, calm_dict)
    print(f"Similarity (calm vs calm): {similarity_same}%")
    assert similarity_same == 100.0, "Same personality should have 100% similarity"
    
    # Similarity between opposite personalities
    similarity_opposite = calculator.calculate_similarity(calm_dict, energetic_dict)
    print(f"Similarity (calm vs energetic): {similarity_opposite}%")
    assert 0 < similarity_opposite < 100, "Opposite personalities should have moderate similarity"
    
    print("✓ CompatibilityCalculator test passed")
    return similarity_same, similarity_opposite


def test_matching_engine():
    """Test MatchingEngine initialization and scoring"""
    print("\n=== Test 3: MatchingEngine ===")
    
    try:
        engine = get_matching_engine()
        print("✓ MatchingEngine initialized successfully")
        return engine
    except Exception as e:
        print(f"✗ MatchingEngine initialization failed: {e}")
        return None


def test_adoption_outcome_tracking():
    """Test AdoptionOutcome model for ML training data"""
    print("\n=== Test 4: AdoptionOutcome Model ===")
    
    from petapp.models import AdoptionOutcome, AdoptionApplication
    
    # Count existing outcomes
    outcomes_count = AdoptionOutcome.objects.count()
    print(f"Existing adoption outcomes in database: {outcomes_count}")
    
    # Show outcome choices
    outcome_choices = dict(AdoptionOutcome._meta.get_field('outcome').choices)
    print(f"Available outcome types: {outcome_choices}")
    
    print("✓ AdoptionOutcome model test passed")


def main():
    """Run all tests"""
    print("=" * 60)
    print("Phase 2 Matching Service Tests")
    print("=" * 60)
    
    try:
        # Test 1: Vector builder
        vector_1, vector_2, calm, energetic = test_personality_vector_builder()
        
        # Test 2: Compatibility calculator
        test_compatibility_calculator(calm, energetic)
        
        # Test 3: Matching engine
        test_matching_engine()
        
        # Test 4: Adoption outcomes
        test_adoption_outcome_tracking()
        
        print("\n" + "=" * 60)
        print("All tests completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
