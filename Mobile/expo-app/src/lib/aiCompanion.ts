import { synthesizeSpeech } from "@/lib/api";
import type { CompanionPet } from "@/lib/petUtils";
import { normalizeLanguage, PHRASES, type LanguageCode } from "@/lib/soniPhrases";

export type DetectedInterest = {
  key: string;
  label: string;
  aliases: string[];
};

const INTERESTS: DetectedInterest[] = [
  {
    key: "tortoise",
    label: "tortoises",
    aliases: ["tortoise", "tortoises", "turtle", "turtles", "kobe", "tortue", "tartaruga", "черепаха"],
  },
  {
    key: "rabbit",
    label: "rabbits",
    aliases: ["rabbit", "rabbits", "bunny", "bunnies", "sungura", "lapin", "coelho", "кролик"],
  },
  {
    key: "chicken",
    label: "chickens",
    aliases: ["chicken", "chickens", "chick", "chicks", "kuku", "poule", "poulet", "galinha", "курица"],
  },
  { key: "snake", label: "snakes", aliases: ["snake", "snakes", "nyoka", "serpent", "cobra", "змея"] },
  {
    key: "bird",
    label: "birds",
    aliases: ["bird", "birds", "parrot", "parrots", "ndege", "oiseau", "ave", "aves", "птица"],
  },
  {
    key: "dog",
    label: "dogs",
    aliases: ["dog", "dogs", "puppy", "puppies", "mbwa", "chien", "cachorro", "cão", "собака"],
  },
  {
    key: "cat",
    label: "cats",
    aliases: ["cat", "cats", "kitten", "kittens", "paka", "chat", "gato", "кошка", "кот"],
  },
  { key: "duck", label: "ducks", aliases: ["duck", "ducks", "bata", "canard", "pato", "утка"] },
];

export const AI_COMPANION_NAME = "Soni";

export const buildWelcomeMessage = (firstName?: string, language: LanguageCode = "en") => {
  const phrases = PHRASES[normalizeLanguage(language)];
  const name = firstName && firstName !== "friend" ? firstName : "";

  return `${phrases.greeting(name)} ${phrases.askWhatToAdopt}`;
};

export const buildClarification = (language: LanguageCode = "en") => PHRASES[normalizeLanguage(language)].clarify;

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

const genderLine = (pet: CompanionPet, language: LanguageCode) => {
  const phrases = PHRASES[language];
  const gender = pet.gender.toLowerCase();

  if (gender === "female" || gender === "girl") {
    return `${pet.name} ${phrases.isA.toLowerCase()} ${phrases.girl}.`;
  }

  if (gender === "male" || gender === "boy") {
    return `${pet.name} ${phrases.isA.toLowerCase()} ${phrases.boy}.`;
  }

  return "";
};

const ageLine = (pet: CompanionPet, language: LanguageCode) => {
  if (!pet.age) {
    return "";
  }

  const phrases = PHRASES[language];
  const alreadyHasUnit = /year|month|week|old/i.test(pet.age);
  return alreadyHasUnit ? `${pet.name} - ${pet.age}.` : `${pet.name} - ${pet.age} ${phrases.yearsOfAge}.`;
};

export const buildMatchIntro = (interest: DetectedInterest, count: number, language: LanguageCode = "en") => {
  const phrases = PHRASES[normalizeLanguage(language)];

  if (count === 0) {
    return phrases.matchIntroEmpty(interest.label);
  }

  return phrases.matchIntroFound(interest.label, count);
};

export const buildWrapUp = (label: string | null, language: LanguageCode = "en") => {
  const phrases = PHRASES[normalizeLanguage(language)];
  return label ? phrases.wrapUp(label) : phrases.wrapUpGeneric;
};

export const buildPetNarration = (
  pet: CompanionPet,
  interest: DetectedInterest,
  language: LanguageCode = "en",
) => {
  const lang = normalizeLanguage(language);
  const phrases = PHRASES[lang];
  const traits = pet.personality.slice(0, 2).join(` ${phrases.and} `);
  const parts = [
    `${pet.name}.`,
    ageLine(pet, lang),
    genderLine(pet, lang),
    pet.breed ? `${phrases.isA} ${pet.breed}.` : "",
    traits ? `${traits}.` : "",
  ].filter(Boolean);

  return parts.join(" ");
};

const SPEECH_LOCALE_BY_LANGUAGE: Record<LanguageCode, string> = {
  en: "en-US",
  sw: "sw-KE",
  fr: "fr-FR",
  pt: "pt-PT",
  ru: "ru-RU",
  zh: "zh-CN",
};

let audioPlayer: import("expo-audio").AudioPlayer | null = null;

const getAudioPlayer = async () => {
  if (audioPlayer) {
    return audioPlayer;
  }

  const { createAudioPlayer } = await import("expo-audio");
  audioPlayer = createAudioPlayer(null);
  return audioPlayer;
};

const speakOnDevice = async (text: string, language: LanguageCode) => {
  try {
    const Speech = await import("expo-speech");
    Speech.stop();
    Speech.speak(text, {
      language: SPEECH_LOCALE_BY_LANGUAGE[language],
      pitch: 1,
      rate: 1.12,
    });
  } catch {
    // Speech is optional. The on-screen transcript still carries the conversation.
  }
};

export const speakText = async (text: string, language: LanguageCode = "en") => {
  const lang = normalizeLanguage(language);

  try {
    const response = await synthesizeSpeech(text, lang);

    if (!response?.audio_url) {
      throw new Error("No audio returned.");
    }

    const player = await getAudioPlayer();
    player.replace(response.audio_url);
    player.play();
  } catch {
    // Cloud voice unavailable (not configured, offline, etc). Fall back to
    // the device's own text-to-speech so Soni still talks.
    void speakOnDevice(text, lang);
  }
};

export const stopSpeaking = async () => {
  try {
    audioPlayer?.pause();
  } catch {
    // Ignore player teardown races.
  }

  try {
    const Speech = await import("expo-speech");
    Speech.stop();
  } catch {
    // Ignore missing speech support.
  }
};
