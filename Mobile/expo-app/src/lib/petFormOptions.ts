export const SPECIES_OPTIONS = [
  { value: "dog", label: "Dog", emoji: "🐶" },
  { value: "cat", label: "Cat", emoji: "🐱" },
  { value: "rabbit", label: "Rabbit", emoji: "🐰" },
  { value: "bird", label: "Bird", emoji: "🦜" },
  { value: "other", label: "Other", emoji: "🐾" },
] as const;

export const GENDER_OPTIONS = ["Male", "Female", "Unknown"] as const;

export const LEVEL_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "unknown", label: "Not sure" },
] as const;

export const CARE_LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner friendly" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced", label: "Experienced owners" },
  { value: "unknown", label: "Not sure" },
] as const;

export const SPACE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "unknown", label: "Not sure" },
] as const;

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Not sure" },
] as const;

export const PERSONALITY_TRAIT_OPTIONS = [
  "Playful",
  "Calm",
  "Affectionate",
  "Independent",
  "Energetic",
  "Gentle",
  "Curious",
  "Loyal",
  "Shy",
  "Social",
  "Protective",
  "Cuddly",
] as const;

export type PetFormData = {
  name: string;
  species: string;
  customSpecies: string;
  breed: string;
  age: string;
  gender: string;
  city: string;
  state: string;
  country: string;
  location: string;
  adoptionFee: string;
  personalityTraits: string[];
  energyLevel: string;
  careLevel: string;
  spaceNeeded: string;
  groomingNeeds: string;
  noiseLevel: string;
  goodWithChildren: string;
  goodWithOtherPets: string;
  apartmentFriendly: string;
  isVaccinated: boolean;
  vaccinationProofUrl: string;
  isDewormed: boolean;
  dewormingProofUrl: string;
  isNeutered: boolean;
  neuteringProofUrl: string;
  description: string;
  imageUrl: string;
  additionalImageUrl: string;
};

export const createEmptyPetForm = (): PetFormData => ({
  name: "",
  species: "dog",
  customSpecies: "",
  breed: "",
  age: "",
  gender: "",
  city: "",
  state: "",
  country: "",
  location: "",
  adoptionFee: "",
  personalityTraits: [],
  energyLevel: "unknown",
  careLevel: "unknown",
  spaceNeeded: "unknown",
  groomingNeeds: "unknown",
  noiseLevel: "unknown",
  goodWithChildren: "unknown",
  goodWithOtherPets: "unknown",
  apartmentFriendly: "unknown",
  isVaccinated: false,
  vaccinationProofUrl: "",
  isDewormed: false,
  dewormingProofUrl: "",
  isNeutered: false,
  neuteringProofUrl: "",
  description: "",
  imageUrl: "",
  additionalImageUrl: "",
});

export const buildPetCreatePayload = (form: PetFormData) => ({
  name: form.name.trim(),
  species: form.species,
  custom_species: form.species === "other" ? form.customSpecies.trim() : "",
  breed: form.breed.trim(),
  age: form.age.trim(),
  gender: form.gender,
  city: form.city.trim(),
  state: form.state.trim(),
  country: form.country.trim(),
  location: form.location.trim(),
  adoption_fee: form.adoptionFee.trim() || "0",
  personality_traits: form.personalityTraits,
  energy_level: form.energyLevel,
  care_level: form.careLevel,
  space_needed: form.spaceNeeded,
  grooming_needs: form.groomingNeeds,
  noise_level: form.noiseLevel,
  good_with_children: form.goodWithChildren,
  good_with_other_pets: form.goodWithOtherPets,
  apartment_friendly: form.apartmentFriendly,
  is_vaccinated: form.isVaccinated,
  vaccination_proof_url: form.vaccinationProofUrl,
  is_dewormed: form.isDewormed,
  deworming_proof_url: form.dewormingProofUrl,
  is_neutered: form.isNeutered,
  neutering_proof_url: form.neuteringProofUrl,
  description: form.description.trim(),
  image_url: form.imageUrl,
  additional_image_url: form.additionalImageUrl,
});
