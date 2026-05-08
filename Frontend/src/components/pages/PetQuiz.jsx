import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPets } from "../../services/api";

const toTitleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const getPetImageUrl = (pet) => {
  const mainImage = pet.images?.find((image) => image.is_main);
  const fallbackImage = pet.images?.[0];

  return (
    pet.imageUrl ||
    pet.image_url ||
    mainImage?.image_url ||
    fallbackImage?.image_url ||
    mainImage?.image ||
    fallbackImage?.image ||
    "/default-pet.jpg"
  );
};

const normalizePet = (pet) => ({
  ...pet,
  id: String(pet.id),
  type: (() => {
    const baseType = String(pet.type || pet.species || "other").trim().toLowerCase();
    const customType = String(pet.custom_species || pet.species_label || "").trim();
    const breedFallback = String(pet.breed || "").trim();

    if (customType) {
      return customType;
    }

    if (baseType === "other" && breedFallback) {
      return breedFallback;
    }

    return baseType || "other";
  })(),
  personality: Array.isArray(pet.personality)
    ? pet.personality
    : Array.isArray(pet.personality_traits)
      ? pet.personality_traits.map((trait) => toTitleCase(String(trait)))
      : [],
  imageUrl: getPetImageUrl(pet),
});

const normalizeStructuredValue = (value, fallback = "unknown") => {
  if (!value) {
    return fallback;
  }

  const normalizedValue = String(value).toLowerCase();
  return normalizedValue === "unknown" ? fallback : normalizedValue;
};

const normalizeBooleanCompatibility = (value) => {
  if (!value) {
    return "unknown";
  }

  const normalizedValue = String(value).toLowerCase();
  return ["yes", "no", "unknown"].includes(normalizedValue) ? normalizedValue : "unknown";
};

const getPetSummary = (pet) => {
  const description = typeof pet.description === "string" ? pet.description.trim() : "";
  if (description) {
    return description.length > 140 ? `${description.slice(0, 137)}...` : description;
  }

  return `A ${pet.age || "pet"} ${pet.breed || toTitleCase(pet.type)} looking for a caring home.`;
};

const decorativePets = [
  { emoji: "🐶", label: "Playful dogs", accent: "from-amber-200 to-orange-100" },
  { emoji: "🐱", label: "Cozy cats", accent: "from-rose-200 to-orange-50" },
  { emoji: "🦆", label: "Cheerful ducks", accent: "from-yellow-200 to-amber-50" },
  { emoji: "🐰", label: "Gentle rabbits", accent: "from-orange-100 to-pink-50" },
  { emoji: "🦜", label: "Bright birds", accent: "from-teal-100 to-cyan-50" },
  { emoji: "🦎", label: "Curious reptiles", accent: "from-lime-100 to-emerald-50" },
];

const quizHighlights = [
  "Lifestyle-aware matching",
  "Top 3 adoption fits",
  "Care and compatibility notes",
];

const introPetCloud = [
  { emoji: "🐶", className: "top-4 right-6 md:right-14" },
  { emoji: "🐱", className: "top-24 left-4 md:left-10" },
  { emoji: "🦆", className: "bottom-28 right-4 md:right-20" },
  { emoji: "🐰", className: "bottom-8 left-10 md:left-24" },
];

const quizQuestions = [
  {
    id: "living_space",
    question: "What kind of home setup fits your daily life best?",
    category: "living",
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
    question: "How much time can you realistically give to daily pet care and interaction?",
    category: "time",
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
    category: "experience",
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
    category: "family",
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
    category: "other_pets",
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
    category: "activity",
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
    category: "grooming",
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
    category: "budget",
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
    category: "bond",
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
    category: "adjustment",
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

const speciesDefaults = {
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

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getTextBlob = (pet) =>
  [
    pet.type,
    pet.species,
    pet.breed,
    pet.age,
    pet.description,
    safeArray(pet.personality).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const rankValue = (level) => {
  if (level === "low" || level === "small" || level === "beginner") return 1;
  if (level === "medium" || level === "intermediate") return 2;
  if (level === "high" || level === "large" || level === "advanced") return 3;
  return 2;
};

const closenessScore = (left, right, exactPoints = 10, closePoints = 6) => {
  const diff = Math.abs(rankValue(left) - rankValue(right));
  if (diff === 0) return exactPoints;
  if (diff === 1) return closePoints;
  return 1;
};

const booleanMatchScore = (preferred, actual, matchPoints = 8, neutralPoints = 4) => {
  if (preferred === undefined || preferred === null || preferred === "maybe") {
    return neutralPoints;
  }
  return preferred === actual ? matchPoints : 2;
};

const inferPetProfile = (pet) => {
  const defaults = speciesDefaults[pet.type] || speciesDefaults.other;
  const text = getTextBlob(pet);
  const personality = safeArray(pet.personality).map((trait) => String(trait).toLowerCase());

  const includesAny = (items) =>
    items.some((item) => text.includes(item) || personality.includes(item));

  const inferredActivity = includesAny(activityKeywords.high)
    ? "high"
    : includesAny(activityKeywords.low)
      ? "low"
      : defaults.activity;
  const activity = normalizeStructuredValue(pet.energy_level, "unknown") !== "unknown"
    ? normalizeStructuredValue(pet.energy_level)
    : inferredActivity;

  const affection = includesAny(affectionKeywords.high)
    ? "high"
    : includesAny(affectionKeywords.low)
      ? "low"
      : defaults.affection;

  const independence = affection === "high" ? "low" : defaults.independence;
  const inferredGrooming = includesAny(groomingKeywords.high) ? "high" : defaults.grooming;
  const grooming = normalizeStructuredValue(pet.grooming_needs, "unknown") !== "unknown"
    ? normalizeStructuredValue(pet.grooming_needs)
    : inferredGrooming;
  const careDemand = grooming === "high" || pet.type === "bird" ? "high" : defaults.care;
  const experienceLevel = normalizeStructuredValue(pet.care_level, "unknown");
  const inferredSpace = includesAny(spaceKeywords.large)
    ? "large"
    : pet.type === "dog" && activity === "high"
      ? "medium"
      : defaults.space;
  const space = normalizeStructuredValue(pet.space_needed, "unknown") !== "unknown"
    ? normalizeStructuredValue(pet.space_needed)
    : inferredSpace;

  const beginnerFriendly =
    experienceLevel === "beginner" ||
    (defaults.beginnerFriendly && !text.includes("special needs") && !text.includes("experienced"));
  const familyFriendly = normalizeBooleanCompatibility(pet.good_with_children) !== "unknown"
    ? normalizeBooleanCompatibility(pet.good_with_children) === "yes"
    : defaults.familyFriendly && !text.includes("reactive") && !text.includes("best in adult home");
  const social = normalizeBooleanCompatibility(pet.good_with_other_pets) !== "unknown"
    ? normalizeBooleanCompatibility(pet.good_with_other_pets) === "yes"
    : defaults.social || text.includes("friendly") || text.includes("social");
  const shyFriendly = text.includes("shy") || text.includes("timid") || personality.includes("shy");
  const noise = normalizeStructuredValue(pet.noise_level, "unknown") !== "unknown"
    ? normalizeStructuredValue(pet.noise_level)
    : defaults.activity === "high"
      ? "medium"
      : "low";
  const apartmentFriendly = normalizeBooleanCompatibility(pet.apartment_friendly);

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

const buildUserPreference = (answers) => {
  const preference = {
    traitCounts: {},
    suitability: {
      species: {},
    },
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

    Object.entries(selectedOption.suitability || {}).forEach(([key, value]) => {
      if (key === "species" && Array.isArray(value)) {
        value.forEach((species) => {
          preference.suitability.species[species] =
            (preference.suitability.species[species] || 0) + 1;
        });
        return;
      }

      preference.suitability[key] = value;
    });
  });

  return preference;
};

const buildCareNotes = (pet, profile) => {
  const notes = [];

  if (profile.activity === "high") {
    notes.push("This pet may suit someone with an active lifestyle.");
  }

  if (profile.shyFriendly) {
    notes.push("This pet may need patient adjustment time.");
  }

  if (profile.grooming === "high") {
    notes.push("Expect more regular grooming or coat care.");
  }

  if (!pet.is_vaccinated && !pet.vaccination_status) {
    notes.push("Ask the rehomer about vaccination records.");
  }

  if (!pet.is_dewormed && !pet.deworming_status) {
    notes.push("Ask whether deworming has been completed recently.");
  }

  if (!pet.is_neutered && !pet.neutered_spayed_status) {
    notes.push("Ask whether spaying or neutering has been discussed.");
  }

  if (notes.length === 0) {
    notes.push("Ask the rehomer about feeding routine, medical history, and transition support.");
  }

  return notes.slice(0, 3);
};

const scorePetMatch = (pet, preference) => {
  const profile = inferPetProfile(pet);
  const matchedTraits = safeArray(pet.personality).filter(
    (trait) => preference.traitCounts[trait] > 0,
  );
  const reasons = [];
  let score = 0;
  const maxScore = 123;

  score += Math.min(matchedTraits.length * 8, 24);
  if (matchedTraits.length > 0) {
    reasons.push(`Shared personality fit: ${matchedTraits.slice(0, 3).join(", ")}.`);
  }

  const preferredSpeciesScore = preference.suitability.species[pet.type] || 0;
  score += Math.min(preferredSpeciesScore * 4, 12);
  if (preferredSpeciesScore > 0) {
    reasons.push(`Your answers suggest comfort with ${toTitleCase(pet.type)} care and lifestyle.`);
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
    score += booleanMatchScore(
      wantsPetFriendly,
      wantsPetFriendly ? profile.social : !profile.social,
      8,
      4,
    );
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
  const matchPercentage = Number.isFinite(rawPercentage)
    ? Math.max(28, Math.min(98, rawPercentage))
    : 28;

  return {
    ...pet,
    profile,
    score,
    matchPercentage,
    summary: getPetSummary(pet),
    matchedTraits,
    reasons: reasons.slice(0, 3),
    careNotes: buildCareNotes(pet, profile),
  };
};

const PetQuiz = () => {
  const navigate = useNavigate();
  const autoAdvanceTimeoutRef = useRef(null);
  const [availablePets, setAvailablePets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (started || results.length > 0) {
      return undefined;
    }

    if (countdown <= 0) {
      setStarted(true);
      return undefined;
    }

    const timer = setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 850);

    return () => clearTimeout(timer);
  }, [countdown, results.length, started]);

  useEffect(() => {
    const fetchAvailablePets = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await listPets();
        const petsData = Array.isArray(response) ? response : response?.results || [];
        setAvailablePets(petsData.map(normalizePet));
      } catch (fetchError) {
        console.error("Error fetching pets:", fetchError);
        setError(fetchError.message || "Failed to load pets. Please try again later.");
        setAvailablePets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailablePets();

    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestion?.id];

  const progressPercentage = useMemo(() => {
    if (!started) {
      return 0;
    }
    return ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
  }, [currentQuestionIndex, started]);

  const advanceQuiz = (nextAnswers) => {
    if (currentQuestionIndex === quizQuestions.length - 1) {
      const preference = buildUserPreference(nextAnswers);
      const scoredPets = availablePets
        .map((pet) => scorePetMatch(pet, preference))
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);

      setResults(scoredPets);
      return;
    }

    setCurrentQuestionIndex((currentIndex) => currentIndex + 1);
  };

  const handleSelectOption = (questionId, optionLabel) => {
    const nextAnswers = {
      ...answers,
      [questionId]: optionLabel,
    };

    setAnswers(nextAnswers);

    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
    }

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      advanceQuiz(nextAnswers);
    }, 180);
  };

  const handleNext = () => {
    if (!selectedAnswer) {
      return;
    }

    advanceQuiz(answers);
  };

  const handleBack = () => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
    }

    if (currentQuestionIndex === 0) {
      navigate("/pets");
      return;
    }

    setCurrentQuestionIndex((currentIndex) => currentIndex - 1);
  };

  const restartQuiz = () => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
    }

    setStarted(false);
    setCountdown(3);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setResults([]);
    setError("");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center px-4 bg-[radial-gradient(circle_at_top,_rgba(255,215,150,0.28),_transparent_45%),linear-gradient(180deg,#fff8ee_0%,#ffffff_100%)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-sm tracking-[0.2em] uppercase text-orange-600 font-semibold">
            Finding your best pet match
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-3xl shadow-xl mt-16 text-center border border-red-100">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (availablePets.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-3xl shadow-xl mt-16 text-center border border-orange-100">
        <div className="text-gray-600 mb-4">
          No pets are available to match right now. Check back soon for new furry friends.
        </div>
        <button
          onClick={() => navigate("/pets")}
          className="px-6 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 font-semibold"
        >
          Browse Pets
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-[78vh] flex items-center justify-center px-4 bg-[radial-gradient(circle_at_top,_rgba(255,215,150,0.24),_transparent_42%),linear-gradient(180deg,#fff8ee_0%,#ffffff_100%)]">
        <div className="w-full max-w-sm rounded-[2rem] border border-orange-100 bg-white px-6 py-10 text-center shadow-[0_24px_80px_rgba(214,126,14,0.10)]">
          <p className="text-xs uppercase tracking-[0.22em] text-orange-600 font-semibold mb-3">
            Pet Match Quiz
          </p>
          <div className="text-6xl font-black text-orange-500 leading-none">
            {countdown > 0 ? countdown : 1}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Your first question is about to appear.
          </p>
        </div>
      </div>
    );
  }

  if (results.length > 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-12 relative">
        <div className="absolute -top-10 right-16 hidden md:flex h-16 w-16 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-3xl shadow-md backdrop-blur-sm z-10">
          {decorativePets[0].emoji}
        </div>
        <div className="absolute top-28 left-2 hidden md:flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-2xl shadow-md backdrop-blur-sm z-10">
          {decorativePets[1].emoji}
        </div>
        <div className="absolute bottom-20 right-4 hidden md:flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-2xl shadow-md backdrop-blur-sm z-10">
          {decorativePets[2].emoji}
        </div>
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-orange-500 mb-2">Your Best Adoption Matches</h2>
              <p className="text-gray-600 text-base md:text-lg">
                These results balance personality fit with day-to-day adoption suitability.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/pets")}
                className="px-5 py-3 border border-orange-300 text-orange-600 rounded-full font-semibold hover:bg-orange-50 bg-white"
              >
                Browse All Pets
              </button>
              <button
                onClick={restartQuiz}
                className="px-5 py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 shadow-[0_14px_34px_rgba(249,115,22,0.24)]"
              >
                Restart Quiz
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Open the pet details",
                copy: "Check the pet's story, care needs, and health notes before deciding.",
              },
              {
                step: "2",
                title: "Chat with the rehomer",
                copy: "Ask about feeding, personality, routines, and anything else you need to know.",
              },
              {
                step: "3",
                title: "Send your request",
                copy: "Share your visit plan and home setup when you feel ready to move forward.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-[1.4rem] border border-orange-100 bg-white/90 px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
              >
                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-700">
                  {item.step}
                </div>
                <h3 className="text-base font-extrabold text-[#2c1700]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {results.map((pet, index) => (
            <div
              key={pet.id}
              className="relative p-5 md:p-6 rounded-[1.75rem] border border-orange-100 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
            >
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-100/70 via-amber-50 to-transparent rounded-t-[1.75rem]"></div>
              <div className="grid gap-6 md:grid-cols-[180px_1fr] relative">
                <div className="w-full h-48 md:h-full bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl overflow-hidden border border-orange-100">
                  {pet.imageUrl ? (
                    <img
                      src={pet.imageUrl}
                      alt={pet.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-orange-600 mb-2 rounded-full bg-white/90 border border-orange-100 px-3 py-1 shadow-sm">
                        <span className="text-sm">{decorativePets[index % decorativePets.length].emoji}</span>
                        Match #{index + 1}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-orange-700">{pet.name}</h3>
                      <p className="text-gray-600">
                        {pet.breed || "Breed not listed"} {"\u2022"} {pet.age || "Age not listed"} {"\u2022"} {toTitleCase(pet.type)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl md:text-4xl font-black text-orange-500">{pet.matchPercentage}%</div>
                      <div className="text-sm text-gray-500">independent match score</div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 leading-6 mb-4">
                    {pet.summary}
                  </p>

                  <div
                    className="w-full bg-gray-200 rounded-full h-3 mb-5"
                    role="progressbar"
                    aria-label={`${pet.name} match percentage`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pet.matchPercentage}
                  >
                    <div
                      className="h-3 rounded-full bg-orange-500"
                      style={{ width: `${pet.matchPercentage}%` }}
                    ></div>
                  </div>

                  {pet.matchedTraits.length > 0 ? (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Matched traits</p>
                      <div className="flex flex-wrap gap-2">
                        {pet.matchedTraits.slice(0, 5).map((trait, traitIndex) => (
                          <span
                            key={`${pet.id}-${trait}-${traitIndex}`}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 text-sm text-gray-600">
                      No strong personality overlap was detected, so this result leans more on lifestyle and care compatibility.
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-4 border border-orange-100">
                      <p className="text-sm font-semibold text-orange-700 mb-2">Why this pet may suit you</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        {pet.reasons.map((reason, reasonIndex) => (
                          <li key={`${pet.id}-reason-${reasonIndex}`}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Care notes to ask about</p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        {pet.careNotes.map((note, noteIndex) => (
                          <li key={`${pet.id}-note-${noteIndex}`}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-5">
                    <button
                      onClick={() => navigate(`/pet/${pet.id}`)}
                      className="px-5 py-3 rounded-full bg-orange-500 text-white hover:bg-orange-600 font-semibold shadow-[0_14px_34px_rgba(249,115,22,0.24)]"
                    >
                      View Pet Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-4 px-3 pb-24">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-orange-100 bg-[linear-gradient(135deg,#fff6ea_0%,#ffffff_46%,#fffaf3_100%)] p-4 shadow-[0_18px_48px_rgba(214,126,14,0.10)]">
      <div className="mb-4 relative z-10">
        <div className="flex justify-between items-center gap-3 mb-2">
          <span className="rounded-full bg-white/85 px-4 py-2 text-sm text-gray-600 border border-orange-100 shadow-sm">
            Question {currentQuestionIndex + 1} of {quizQuestions.length}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progressPercentage)}%</span>
        </div>
        <div
          className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercentage)}
        >
          <div
            className="h-3 rounded-full bg-[linear-gradient(90deg,#f97316_0%,#fb923c_40%,#fdba74_100%)] transition-all"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="grid gap-4 items-start">
        <div className="rounded-[1.5rem] bg-white/90 border border-orange-100 p-4 shadow-sm backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-orange-100/60 via-amber-100/40 to-transparent"></div>
          <div className="relative">
            <h3 className="text-[1.35rem] md:text-[1.6rem] font-semibold text-orange-700 mb-5 leading-tight pt-2">
              {currentQuestion.question}
            </h3>
            <div className="grid gap-3">
              {currentQuestion.options.map((option, optionIndex) => {
                const isSelected = selectedAnswer === option.label;
                return (
                  <button
                    key={option.label}
                    onClick={() => handleSelectOption(currentQuestion.id, option.label)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border relative overflow-hidden
                      ${
                        isSelected
                          ? "border-orange-500 bg-orange-100 text-orange-800 font-medium shadow-[0_12px_24px_rgba(249,115,22,0.14)]"
                          : "border-gray-200 bg-white hover:bg-orange-50 hover:-translate-y-0.5"
                      }
                    `}
                  >
                    <span className="absolute right-4 top-4 text-lg opacity-80">
                      {decorativePets[(currentQuestionIndex + optionIndex) % decorativePets.length].emoji}
                    </span>
                    <span className="block pr-8">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-3 relative z-10">
        <button
          onClick={handleBack}
          className="px-6 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white mt-6"
        >
          Back
        </button>
        <div className="flex flex-wrap gap-3 mt-6">
          <button
            onClick={restartQuiz}
            className="px-6 py-3 rounded-full border border-orange-300 text-orange-600 hover:bg-orange-50 bg-white"
          >
            Restart
          </button>
          <button
            onClick={handleNext}
            disabled={!selectedAnswer}
            className={`px-6 py-3 rounded-full font-semibold ${
              selectedAnswer
                ? "bg-orange-500 text-white hover:bg-orange-600 shadow-[0_14px_34px_rgba(249,115,22,0.24)]"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {currentQuestionIndex === quizQuestions.length - 1 ? "See Matches" : "Next"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PetQuiz;
