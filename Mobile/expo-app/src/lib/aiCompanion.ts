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

export const buildWelcomeMessage = (firstName?: string) => {
  const name = firstName && firstName !== "friend" ? firstName : "";
  const hello = name ? `Hi ${name}. How are you?` : "Hi. How are you?";

  return `${hello} Welcome to My Furry Friends. What are you looking to adopt today? A dog, a cat, a rabbit, a bird, a snake, a tortoise, or something else?`;
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

const spaceLine = (pet: CompanionPet) => {
  if (pet.spaceNeeded === "large") {
    return `${pet.name} needs a generous amount of space to move and play.`;
  }

  if (pet.spaceNeeded === "medium") {
    return `${pet.name} is happiest with a bit of room to stretch and explore.`;
  }

  if (pet.spaceNeeded === "small") {
    return `${pet.name} can settle comfortably in a smaller home if the routine is steady.`;
  }

  return "";
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
    return `I've seen that you're interested in ${interest.label}. I don't have a match for that just yet, but you can tell me another type of pet.`;
  }

  return `I've seen that you're interested in ${interest.label}. Let me show you ${
    count === 1 ? "someone" : "a few companions"
  } who might be a fit, one at a time, like a dating show.`;
};

export const buildPetNarration = (pet: CompanionPet, interest: DetectedInterest) => {
  const traits = pet.personality.slice(0, 3).join(", ");
  const parts = [
    `This is ${pet.name}.`,
    ageLine(pet),
    genderLine(pet),
    pet.breed ? `${pet.name} is a ${pet.breed}.` : "",
    spaceLine(pet),
    traits ? `Personality-wise, think ${traits.toLowerCase()}.` : "",
    pet.description ? pet.description : "",
  ].filter(Boolean);

  return `I've seen that you're interested in ${interest.label}. ${parts.join(" ")}`;
};

export const speakText = async (text: string) => {
  try {
    const Speech = await import("expo-speech");
    Speech.stop();
    Speech.speak(text, {
      language: "en-US",
      pitch: 1,
      rate: 0.94,
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
