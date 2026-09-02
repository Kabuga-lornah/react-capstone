import type { CompanionPet } from "@/lib/petUtils";

export type DetectedInterest = {
  key: string;
  label: string;
  aliases: string[];
};

const INTERESTS: DetectedInterest[] = [
  { key: "tortoise", label: "tortoises", aliases: ["tortoise", "tortoises", "turtle", "turtles"] },
  { key: "rabbit", label: "rabbits", aliases: ["rabbit", "rabbits", "bunny", "bunnies"] },
  { key: "chicken", label: "chickens", aliases: ["chicken", "chickens", "chick", "chicks"] },
  { key: "snake", label: "snakes", aliases: ["snake", "snakes"] },
  { key: "bird", label: "birds", aliases: ["bird", "birds", "parrot", "parrots"] },
  { key: "dog", label: "dogs", aliases: ["dog", "dogs", "puppy", "puppies"] },
  { key: "cat", label: "cats", aliases: ["cat", "cats", "kitten", "kittens"] },
  { key: "duck", label: "ducks", aliases: ["duck", "ducks"] },
];

export const AI_COMPANION_NAME = "Soni";

export const buildWelcomeMessage = (firstName?: string) => {
  const name = firstName && firstName !== "friend" ? `, ${firstName}` : "";

  return `Hi${name}, I'm ${AI_COMPANION_NAME}. What are you looking to adopt today? Dog, cat, rabbit, bird, snake, or something else?`;
};

export const detectPetInterest = (text: string): DetectedInterest | null => {
  const input = String(text || "").toLowerCase();

  return (
    INTERESTS.find((interest) =>
      interest.aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(input)),
    ) || null
  );
};

export const petMatchesInterest = (pet: CompanionPet, interest: DetectedInterest) => {
  const haystack = [pet.species, pet.customSpecies, pet.typeLabel, pet.breed]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return interest.aliases.some((alias) => haystack.includes(alias));
};

const genderLine = (pet: CompanionPet) => {
  const gender = pet.gender.toLowerCase();

  if (gender === "female" || gender === "girl") {
    return `${pet.name} is a girl.`;
  }

  if (gender === "male" || gender === "boy") {
    return `${pet.name} is a boy.`;
  }

  return "";
};

const ageLine = (pet: CompanionPet) => {
  if (!pet.age) {
    return "";
  }

  const alreadyHasUnit = /year|month|week|old/i.test(pet.age);
  return alreadyHasUnit
    ? `${pet.name} is ${pet.age}.`
    : `${pet.name} is ${pet.age} years of age.`;
};

export const buildMatchIntro = (interest: DetectedInterest, count: number) => {
  if (count === 0) {
    return `No ${interest.label} available right now. Tell me another kind of pet?`;
  }

  return `Got it, ${interest.label}. Here ${count === 1 ? "is one match" : "are a few matches"}, one at a time.`;
};

export const buildPetNarration = (pet: CompanionPet, interest: DetectedInterest) => {
  const traits = pet.personality.slice(0, 2).join(" and ");
  const parts = [
    `${pet.name}.`,
    ageLine(pet),
    genderLine(pet),
    pet.breed ? `A ${pet.breed}.` : "",
    traits ? `${traits}.` : "",
  ].filter(Boolean);

  return parts.join(" ");
};

export const speakText = async (text: string) => {
  try {
    const Speech = await import("expo-speech");
    Speech.stop();
    Speech.speak(text, {
      language: "en-US",
      pitch: 1,
      rate: 1.12,
    });
  } catch {
    // Speech is optional. The on-screen transcript still carries the conversation.
  }
};

export const stopSpeaking = async () => {
  try {
    const Speech = await import("expo-speech");
    Speech.stop();
  } catch {
    // Ignore missing speech support.
  }
};
