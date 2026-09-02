export type CompanionPet = {
  id: string;
  name: string;
  species: string;
  customSpecies: string;
  typeLabel: string;
  breed: string;
  age: string;
  gender: string;
  description: string;
  personality: string[];
  spaceNeeded: string;
  energyLevel: string;
  careLevel: string;
  groomingNeeds: string;
  noiseLevel: string;
  goodWithChildren: string;
  goodWithOtherPets: string;
  apartmentFriendly: string;
  isVaccinated: boolean;
  isDewormed: boolean;
  isNeutered: boolean;
  location: string;
  city: string;
  status: string;
  imageUrl: string;
};

const PLACEHOLDER_IMAGE = "https://placehold.co/800x1000/FEE9BF/8E5A14?text=Pet";

export const toTitleCase = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

export const getPetImageUrl = (pet: any) => {
  const mainImage = Array.isArray(pet?.images)
    ? pet.images.find((image: any) => image.is_main)
    : null;
  const fallbackImage = Array.isArray(pet?.images) ? pet.images[0] : null;

  return (
    pet?.imageUrl ||
    pet?.image_url ||
    mainImage?.image_url ||
    fallbackImage?.image_url ||
    mainImage?.image ||
    fallbackImage?.image ||
    PLACEHOLDER_IMAGE
  );
};

const getSpeciesLabel = (pet: any) => {
  const customType = String(pet?.custom_species || pet?.species_label || "").trim();
  const baseType = String(pet?.type || pet?.species || "other").trim().toLowerCase();
  const breedFallback = String(pet?.breed || "").trim();

  if (customType) {
    return customType;
  }

  if (baseType === "other" && breedFallback) {
    return breedFallback;
  }

  return baseType || "other";
};

export const normalizeCompanionPet = (pet: any): CompanionPet => {
  const personality = Array.isArray(pet?.personality)
    ? pet.personality
    : Array.isArray(pet?.personality_traits)
      ? pet.personality_traits.map((trait: unknown) => toTitleCase(String(trait)))
      : [];

  return {
    id: String(pet?.id),
    name: String(pet?.name || "This pet"),
    species: String(pet?.species || pet?.type || "other").toLowerCase(),
    customSpecies: String(pet?.custom_species || "").toLowerCase(),
    typeLabel: getSpeciesLabel(pet),
    breed: String(pet?.breed || "").trim(),
    age: String(pet?.age || "").trim(),
    gender: String(pet?.gender || "").trim(),
    description: String(pet?.description || "").trim(),
    personality,
    spaceNeeded: String(pet?.space_needed || "").trim().toLowerCase(),
    energyLevel: String(pet?.energy_level || "").trim().toLowerCase(),
    careLevel: String(pet?.care_level || "").trim().toLowerCase(),
    groomingNeeds: String(pet?.grooming_needs || "").trim().toLowerCase(),
    noiseLevel: String(pet?.noise_level || "").trim().toLowerCase(),
    goodWithChildren: String(pet?.good_with_children || "").trim().toLowerCase(),
    goodWithOtherPets: String(pet?.good_with_other_pets || "").trim().toLowerCase(),
    apartmentFriendly: String(pet?.apartment_friendly || "").trim().toLowerCase(),
    isVaccinated: Boolean(pet?.is_vaccinated),
    isDewormed: Boolean(pet?.is_dewormed),
    isNeutered: Boolean(pet?.is_neutered),
    location:
      pet?.location ||
      [pet?.city, pet?.state, pet?.country].filter(Boolean).join(", ") ||
      "",
    city: String(pet?.city || "").trim(),
    status: String(pet?.status || "available"),
    imageUrl: getPetImageUrl(pet),
  };
};

export const getPetTypeValue = (pet: CompanionPet) =>
  String(pet.species || pet.typeLabel || "other").toLowerCase();

export const getPetTypeLabel = (pet: CompanionPet) => toTitleCase(pet.typeLabel || pet.species);
