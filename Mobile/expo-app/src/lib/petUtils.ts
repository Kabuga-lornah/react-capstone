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
