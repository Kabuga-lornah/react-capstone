import type { CompanionPet } from "@/lib/petUtils";
import { toTitleCase } from "@/lib/petUtils";

export type QuizOption = {
  label: string;
  traits: string[];
  suitability: Record<string, unknown>;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: QuizOption[];
};

export const quizQuestions: QuizQuestion[] = [
  {
    id: "living_space",
    question: "What kind of home setup fits your daily life best?",
    options: [
      {
        label: "A spacious home or house with outdoor access",
        traits: ["active", "outdoorsy"],
        suitability: { space: "large", species: ["dog"], activity: "high" },
      },
      {
        label: "An apartment or smaller home with a cozy routine",
        traits: ["calm", "gentle"],
        suitability: { space: "small", species: ["cat", "rabbit", "bird"], activity: "low" },
      },
      {
        label: "A moderate home where I can adapt as needed",
        traits: ["adaptable", "balanced"],
        suitability: { space: "medium", species: ["dog", "cat", "rabbit"], activity: "medium" },
      },
    ],
  },
  {
    id: "care_time",
    question: "How much time can you realistically give to daily pet care?",
    options: [
      {
        label: "A lot. I enjoy active routines and regular engagement.",
        traits: ["playful", "energetic", "social"],
        suitability: { time: "high", activity: "high", care: "high" },
      },
      {
        label: "A steady amount. I can commit to a dependable daily routine.",
        traits: ["loyal", "balanced"],
        suitability: { time: "medium", activity: "medium", care: "medium" },
      },
      {
        label: "I need a companion that can handle quieter schedules.",
        traits: ["independent", "calm"],
        suitability: { time: "low", activity: "low", care: "low" },
      },
    ],
  },
  {
    id: "pet_experience",
    question: "How experienced are you with caring for pets?",
    options: [
      {
        label: "I am a first-time adopter and want a manageable fit.",
        traits: ["gentle", "friendly"],
        suitability: { experience: "beginner", beginnerFriendly: true },
      },
      {
        label: "I have some experience and can learn as I go.",
        traits: ["curious", "patient"],
        suitability: { experience: "intermediate", beginnerFriendly: true },
      },
      {
        label: "I have a lot of experience and can handle complex care.",
        traits: ["confident", "attentive"],
        suitability: { experience: "advanced", care: "high" },
      },
    ],
  },
  {
    id: "children",
    question: "What best describes children in your home or visiting often?",
    options: [
      {
        label: "Young children are around regularly.",
        traits: ["gentle", "patient"],
        suitability: { children: "young", familyFriendly: true },
      },
      {
        label: "Older children or teens visit or live with me.",
        traits: ["playful", "steady"],
        suitability: { children: "older", familyFriendly: true },
      },
      {
        label: "No children in my day-to-day environment.",
        traits: ["independent", "quiet"],
        suitability: { children: "none" },
      },
    ],
  },
  {
    id: "other_pets",
    question: "How about other pets in the home?",
    options: [
      {
        label: "Yes, I already have other pets and need a good mixer.",
        traits: ["friendly", "social"],
        suitability: { otherPets: true, social: true },
      },
      {
        label: "No other pets right now, but I may in future.",
        traits: ["adaptable", "balanced"],
        suitability: { otherPets: "maybe" },
      },
      {
        label: "No other pets and I prefer a solo companion setup.",
        traits: ["independent", "calm"],
        suitability: { otherPets: false },
      },
    ],
  },
  {
    id: "activity_level",
    question: "What kind of activity level feels right for you?",
    options: [
      {
        label: "Very active. Walks, play, and movement sound great.",
        traits: ["energetic", "adventurous"],
        suitability: { activity: "high", species: ["dog"] },
      },
      {
        label: "Moderate. I like a mix of playtime and downtime.",
        traits: ["balanced", "friendly"],
        suitability: { activity: "medium", species: ["dog", "cat", "rabbit"] },
      },
      {
        label: "Low-key. I want a calmer home vibe.",
        traits: ["calm", "cuddly"],
        suitability: { activity: "low", species: ["cat", "rabbit", "bird", "other"] },
      },
    ],
  },
  {
    id: "grooming_comfort",
    question: "How comfortable are you with grooming and regular upkeep?",
    options: [
      {
        label: "I am comfortable with brushing, bathing, and regular upkeep.",
        traits: ["attentive", "patient"],
        suitability: { grooming: "high", care: "high" },
      },
      {
        label: "I can manage some upkeep, but I prefer moderate care.",
        traits: ["balanced", "gentle"],
        suitability: { grooming: "medium", care: "medium" },
      },
      {
        label: "I would prefer lower-maintenance care when possible.",
        traits: ["practical", "calm"],
        suitability: { grooming: "low", care: "low" },
      },
    ],
  },
  {
    id: "budget_awareness",
    question: "How prepared do you feel for food, supplies, and vet costs?",
    options: [
      {
        label: "I am prepared for ongoing care and routine vet visits.",
        traits: ["responsible", "prepared"],
        suitability: { budget: "high", care: "high" },
      },
      {
        label: "I am prepared, but I still prefer a predictable care routine.",
        traits: ["steady", "thoughtful"],
        suitability: { budget: "medium", care: "medium" },
      },
      {
        label: "I am still learning and want a simpler first match.",
        traits: ["careful", "gentle"],
        suitability: { budget: "low", beginnerFriendly: true },
      },
    ],
  },
  {
    id: "pet_affection_style",
    question: "What kind of bond are you hoping to build?",
    options: [
      {
        label: "A very affectionate companion that loves closeness.",
        traits: ["affectionate", "loyal", "cuddly"],
        suitability: { affection: "high" },
      },
      {
        label: "A mix of companionship and independent time.",
        traits: ["balanced", "friendly"],
        suitability: { affection: "medium", independence: "medium" },
      },
      {
        label: "A more independent pet with its own rhythm.",
        traits: ["independent", "quiet"],
        suitability: { affection: "low", independence: "high" },
      },
    ],
  },
  {
    id: "adjustment_style",
    question: "How patient are you with pets that may need time to settle in?",
    options: [
      {
        label: "Very patient. I can go slowly and let trust build naturally.",
        traits: ["patient", "gentle", "calm"],
        suitability: { shyFriendly: true, familyFriendly: true },
      },
      {
        label: "Moderately patient. I can support some adjustment time.",
        traits: ["balanced", "kind"],
        suitability: { shyFriendly: true },
      },
      {
        label: "I would prefer an easygoing pet that settles in quickly.",
        traits: ["friendly", "playful"],
        suitability: { shyFriendly: false, beginnerFriendly: true },
      },
    ],
  },
];

const speciesDefaults: Record<string, Record<string, unknown>> = {
  dog: {
    activity: "high",
    space: "medium",
    care: "medium",
    grooming: "medium",
    beginnerFriendly: true,
    familyFriendly: true,
    affection: "high",
    independence: "low",
    social: true,
    shyFriendly: true,
  },
  cat: {
    activity: "medium",
    space: "small",
    care: "medium",
    grooming: "medium",
    beginnerFriendly: true,
    familyFriendly: true,
    affection: "medium",
    independence: "high",
    social: false,
    shyFriendly: true,
  },
  bird: {
    activity: "medium",
    space: "small",
    care: "high",
    grooming: "low",
    beginnerFriendly: false,
    familyFriendly: false,
    affection: "medium",
    independence: "medium",
    social: true,
    shyFriendly: false,
  },
  rabbit: {
    activity: "medium",
    space: "medium",
    care: "medium",
    grooming: "medium",
    beginnerFriendly: true,
    familyFriendly: true,
    affection: "medium",
    independence: "medium",
    social: true,
    shyFriendly: true,
  },
  other: {
    activity: "low",
    space: "small",
    care: "medium",
    grooming: "low",
    beginnerFriendly: false,
    familyFriendly: false,
    affection: "low",
    independence: "high",
    social: false,
    shyFriendly: false,
  },
};

const activityKeywords = {
  high: ["energetic", "active", "athletic", "playful", "outdoorsy", "adventurous"],
  low: ["calm", "quiet", "gentle", "relaxed", "easygoing", "laid-back", "cuddly"],
};

const affectionKeywords = {
  high: ["affectionate", "loyal", "friendly", "cuddly", "devoted"],
  low: ["independent", "shy", "quiet", "watchful"],
};

const groomingKeywords = {
  high: ["poodle", "persian", "shih tzu", "long hair", "long-haired", "angora"],
};

const spaceKeywords = {
  large: ["rottweiler", "german shepherd", "retriever", "doberman", "husky", "active"],
};

const safeArray = (value: unknown): string[] => (Array.isArray(value) ? value : []);

const normalizeStructuredValue = (value: unknown, fallback = "unknown") => {
  if (!value) {
    return fallback;
  }

  const normalizedValue = String(value).toLowerCase();
  return normalizedValue === "unknown" ? fallback : normalizedValue;
};

const normalizeBooleanCompatibility = (value: unknown) => {
  if (!value) {
    return "unknown";
  }

  const normalizedValue = String(value).toLowerCase();
  return ["yes", "no", "unknown"].includes(normalizedValue) ? normalizedValue : "unknown";
};

const getTextBlob = (pet: CompanionPet) =>
  [pet.typeLabel, pet.species, pet.breed, pet.age, pet.description, safeArray(pet.personality).join(" ")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const rankValue = (level: unknown) => {
  if (level === "low" || level === "small" || level === "beginner") return 1;
  if (level === "medium" || level === "intermediate") return 2;
  if (level === "high" || level === "large" || level === "advanced") return 3;
  return 2;
};

const closenessScore = (left: unknown, right: unknown, exactPoints = 10, closePoints = 6) => {
  const diff = Math.abs(rankValue(left) - rankValue(right));
  if (diff === 0) return exactPoints;
  if (diff === 1) return closePoints;
  return 1;
};

const booleanMatchScore = (
  preferred: unknown,
  actual: unknown,
  matchPoints = 8,
  neutralPoints = 4,
) => {
  if (preferred === undefined || preferred === null || preferred === "maybe") {
    return neutralPoints;
  }
  return preferred === actual ? matchPoints : 2;
};

type PetProfile = {
  activity: string;
  affection: string;
  independence: string;
  grooming: string;
  care: string;
  experienceLevel: string;
  space: string;
  beginnerFriendly: boolean;
  familyFriendly: boolean;
  social: boolean;
  shyFriendly: boolean;
  noise: string;
  apartmentFriendly: string;
};

const inferPetProfile = (pet: CompanionPet): PetProfile => {
  const species = String(pet.species || "other").toLowerCase();
  const defaults = speciesDefaults[species] || speciesDefaults.other;
  const text = getTextBlob(pet);
  const personality = safeArray(pet.personality).map((trait) => String(trait).toLowerCase());

  const includesAny = (items: string[]) =>
    items.some((item) => text.includes(item) || personality.includes(item));

  const inferredActivity = includesAny(activityKeywords.high)
    ? "high"
    : includesAny(activityKeywords.low)
      ? "low"
      : String(defaults.activity);
  const activity =
    normalizeStructuredValue(pet.energyLevel, "unknown") !== "unknown"
      ? normalizeStructuredValue(pet.energyLevel)
      : inferredActivity;

  const affection = includesAny(affectionKeywords.high)
    ? "high"
    : includesAny(affectionKeywords.low)
      ? "low"
      : String(defaults.affection);

  const independence = affection === "high" ? "low" : String(defaults.independence);
  const inferredGrooming = includesAny(groomingKeywords.high) ? "high" : String(defaults.grooming);
  const grooming =
    normalizeStructuredValue(pet.groomingNeeds, "unknown") !== "unknown"
      ? normalizeStructuredValue(pet.groomingNeeds)
      : inferredGrooming;
  const careDemand = grooming === "high" || species === "bird" ? "high" : String(defaults.care);
  const experienceLevel = normalizeStructuredValue(pet.careLevel, "unknown");
  const inferredSpace = includesAny(spaceKeywords.large)
    ? "large"
    : species === "dog" && activity === "high"
      ? "medium"
      : String(defaults.space);
  const space =
    normalizeStructuredValue(pet.spaceNeeded, "unknown") !== "unknown"
      ? normalizeStructuredValue(pet.spaceNeeded)
      : inferredSpace;

  const beginnerFriendly =
    experienceLevel === "beginner" ||
    (Boolean(defaults.beginnerFriendly) &&
      !text.includes("special needs") &&
      !text.includes("experienced"));
  const familyFriendly =
    normalizeBooleanCompatibility(pet.goodWithChildren) !== "unknown"
      ? normalizeBooleanCompatibility(pet.goodWithChildren) === "yes"
      : Boolean(defaults.familyFriendly) && !text.includes("reactive") && !text.includes("best in adult home");
  const social =
    normalizeBooleanCompatibility(pet.goodWithOtherPets) !== "unknown"
      ? normalizeBooleanCompatibility(pet.goodWithOtherPets) === "yes"
      : Boolean(defaults.social) || text.includes("friendly") || text.includes("social");
  const shyFriendly = text.includes("shy") || text.includes("timid") || personality.includes("shy");
  const noise =
    normalizeStructuredValue(pet.noiseLevel, "unknown") !== "unknown"
      ? normalizeStructuredValue(pet.noiseLevel)
      : defaults.activity === "high"
        ? "medium"
        : "low";
  const apartmentFriendly = normalizeBooleanCompatibility(pet.apartmentFriendly);

  return {
    activity,
    affection,
    independence,
    grooming,
    care: careDemand,
    experienceLevel,
    space,
    beginnerFriendly,
    familyFriendly,
    social,
    shyFriendly,
    noise,
    apartmentFriendly,
  };
};

export type QuizAnswers = Record<string, string>;

type UserPreference = {
  traitCounts: Record<string, number>;
  suitability: Record<string, unknown> & { species: Record<string, number> };
};

export const buildUserPreference = (answers: QuizAnswers): UserPreference => {
  const preference: UserPreference = {
    traitCounts: {},
    suitability: { species: {} },
  };

  quizQuestions.forEach((question) => {
    const selectedOption = question.options.find((option) => option.label === answers[question.id]);
    if (!selectedOption) {
      return;
    }

    selectedOption.traits.forEach((trait) => {
      const normalizedTrait = toTitleCase(trait);
      preference.traitCounts[normalizedTrait] = (preference.traitCounts[normalizedTrait] || 0) + 1;
    });

    Object.entries(selectedOption.suitability).forEach(([key, value]) => {
      if (key === "species" && Array.isArray(value)) {
        value.forEach((species: string) => {
          preference.suitability.species[species] = (preference.suitability.species[species] || 0) + 1;
        });
        return;
      }

      preference.suitability[key] = value;
    });
  });

  return preference;
};

const buildCareNotes = (pet: CompanionPet, profile: PetProfile) => {
  const notes: string[] = [];

  if (profile.activity === "high") {
    notes.push("This pet may suit someone with an active lifestyle.");
  }

  if (profile.shyFriendly) {
    notes.push("This pet may need patient adjustment time.");
  }

  if (profile.grooming === "high") {
    notes.push("Expect more regular grooming or coat care.");
  }

  if (!pet.isVaccinated) {
    notes.push("Ask the rehomer about vaccination records.");
  }

  if (!pet.isDewormed) {
    notes.push("Ask whether deworming has been completed recently.");
  }

  if (!pet.isNeutered) {
    notes.push("Ask whether spaying or neutering has been discussed.");
  }

  if (notes.length === 0) {
    notes.push("Ask the rehomer about feeding routine, medical history, and transition support.");
  }

  return notes.slice(0, 3);
};

export type ScoredPet = CompanionPet & {
  matchPercentage: number;
  matchedTraits: string[];
  reasons: string[];
  careNotes: string[];
};

export const scorePetMatch = (pet: CompanionPet, preference: UserPreference): ScoredPet => {
  const profile = inferPetProfile(pet);
  const matchedTraits = safeArray(pet.personality).filter((trait) => preference.traitCounts[trait] > 0);
  const reasons: string[] = [];
  let score = 0;
  const maxScore = 123;

  score += Math.min(matchedTraits.length * 8, 24);
  if (matchedTraits.length > 0) {
    reasons.push(`Shared personality fit: ${matchedTraits.slice(0, 3).join(", ")}.`);
  }

  const preferredSpeciesScore = preference.suitability.species[String(pet.species)] || 0;
  score += Math.min(preferredSpeciesScore * 4, 12);
  if (preferredSpeciesScore > 0) {
    reasons.push(`Your answers suggest comfort with ${toTitleCase(String(pet.species))} care and lifestyle.`);
  }

  if (preference.suitability.activity) {
    score += closenessScore(preference.suitability.activity, profile.activity, 12, 7);
    reasons.push(
      profile.activity === "high"
        ? "This pet likely enjoys a more active routine."
        : profile.activity === "low"
          ? "This pet may suit a calmer day-to-day pace."
          : "This pet looks suited to a balanced routine of play and rest.",
    );
  }

  if (preference.suitability.space) {
    score += closenessScore(preference.suitability.space, profile.space, 10, 6);
    if (profile.apartmentFriendly === "yes" && preference.suitability.space === "small") {
      reasons.push("This pet may fit apartment or smaller-home living more comfortably.");
    }
  }

  if (preference.suitability.grooming) {
    score += closenessScore(preference.suitability.grooming, profile.grooming, 9, 5);
  }

  if (preference.suitability.care) {
    score += closenessScore(preference.suitability.care, profile.care, 10, 6);
  }

  if (preference.suitability.time) {
    score += closenessScore(preference.suitability.time, profile.care, 7, 4);
  }

  if (preference.suitability.experience === "beginner") {
    score += profile.beginnerFriendly ? 10 : 3;
    reasons.push(
      profile.beginnerFriendly
        ? "This pet may be a more approachable match for a newer adopter."
        : "You may want extra guidance from the rehomer for this pet.",
    );
  } else if (preference.suitability.experience === "advanced") {
    score += profile.experienceLevel === "experienced" || profile.care === "high" ? 8 : 5;
  } else {
    score += 6;
  }

  if (preference.suitability.children === "young" || preference.suitability.children === "older") {
    score += booleanMatchScore(true, profile.familyFriendly, 9, 4);
    if (profile.familyFriendly) {
      reasons.push("This pet may fit a family environment with the right introduction.");
    }
  }

  if (preference.suitability.otherPets !== undefined) {
    const wantsPetFriendly = preference.suitability.otherPets === true;
    score += booleanMatchScore(wantsPetFriendly, wantsPetFriendly ? profile.social : !profile.social, 8, 4);
  }

  if (preference.suitability.affection) {
    score += closenessScore(preference.suitability.affection, profile.affection, 8, 5);
  }

  if (preference.suitability.shyFriendly !== undefined) {
    score += booleanMatchScore(preference.suitability.shyFriendly, profile.shyFriendly, 6, 3);
  }

  if (preference.suitability.budget) {
    score += closenessScore(preference.suitability.budget, profile.care, 8, 5);
  }

  if (profile.noise === "high") {
    reasons.push("Expect a pet that may be more expressive, lively, or attention-seeking.");
  } else if (profile.noise === "low") {
    reasons.push("This pet may be better suited to a quieter household rhythm.");
  }

  const rawPercentage = Math.round((score / maxScore) * 100);
  const matchPercentage = Number.isFinite(rawPercentage) ? Math.max(28, Math.min(98, rawPercentage)) : 28;

  return {
    ...pet,
    matchPercentage,
    matchedTraits,
    reasons: reasons.slice(0, 3),
    careNotes: buildCareNotes(pet, profile),
  };
};
