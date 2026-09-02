import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const FACT_SEED_STORAGE_KEY = "pet_adoption_mobile_fact_seed";
const FACT_SEED_FILE = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}pet-adoption-fact-seed.json`
  : null;

const canUseLocalStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const ANIMAL_FACTS: string[] = [
  "Kenya is home to the Big Five: lion, leopard, elephant, buffalo, and rhino.",
  "A group of cats is called a clowder, but a group of kittens is a kindle.",
  "Dogs' sense of smell is estimated to be up to 100,000 times stronger than ours.",
  "Rabbits can't vomit, so their diet has to be carefully managed to avoid blockages.",
  "A cat's purr vibrates between 25 and 150 Hz, a range that can promote bone healing.",
  "Tortoises can live well over 100 years, with some giant tortoises passing 150.",
  "Parrots can live 50-plus years, so adopting one is a lifelong commitment.",
  "A dog's nose print is as unique as a human fingerprint.",
  "Chickens can recognize and remember over 100 different faces, human or bird.",
  "Ducks can sleep with one eye open to stay alert for predators.",
  "Cats spend nearly 70% of their lives asleep, roughly 12-16 hours a day.",
  "Rabbits' teeth never stop growing, so they need constant chewing to wear them down.",
  "A snake smells with its tongue, using it to carry scent particles to a special organ.",
  "Guinea pigs squeal with excitement, a behavior owners call 'popcorning.'",
  "Elephants are one of the few animals that can recognize themselves in a mirror.",
  "The Maasai Mara in Kenya hosts one of the largest animal migrations on Earth.",
  "A cat's whiskers are roughly as wide as its body, helping it judge tight spaces.",
  "Goldfish have a memory span of months, not the mythical three seconds.",
  "Puppies are born deaf and blind, relying on smell and touch for their first weeks.",
  "Cats have a third eyelid called a haw that helps protect and moisten their eyes.",
  "Hamsters can stuff their cheek pouches to nearly the size of their whole body.",
  "A tortoise's shell is actually part of its skeleton, fused to its spine and ribs.",
  "Some dog breeds, like Basenjis, don't bark but instead make a yodel-like sound.",
  "Rabbits communicate contentment by grinding their teeth softly, called 'purring.'",
  "Cats can rotate their ears 180 degrees using over 20 muscles in each ear.",
  "African grey parrots can learn hundreds of words and understand basic concepts.",
  "A group of rabbits is called a colony, and a baby rabbit is called a kit.",
  "Dogs curl up in a ball when sleeping partly to conserve body heat and protect organs.",
  "Turtles and tortoises have no teeth; they use a sharp beak-like edge to bite food.",
  "Cats knead with their paws as an instinct left over from kittenhood nursing.",
  "A single strand of a cat's whisker sends signals to the brain about air currents.",
  "Ferrets sleep 14-18 hours a day, among the sleepiest common pets.",
  "Some snakes, like ball pythons, can go months between meals without harm.",
  "Dogs can be trained to detect changes in human blood sugar or oncoming seizures.",
  "A rooster's crow can reach 90 decibels, as loud as a passing motorcycle.",
  "Cats almost never meow at other cats — meowing is a behavior aimed mostly at humans.",
];

const hashString = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const randomSeed = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function readDeviceSeed(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return null;
    }

    try {
      return window.localStorage.getItem(FACT_SEED_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  if (!FACT_SEED_FILE) {
    return null;
  }

  try {
    const info = await FileSystem.getInfoAsync(FACT_SEED_FILE);
    if (!info.exists) {
      return null;
    }

    const value = await FileSystem.readAsStringAsync(FACT_SEED_FILE);
    return JSON.parse(value)?.seed || null;
  } catch {
    return null;
  }
}

async function writeDeviceSeed(seed: string) {
  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(FACT_SEED_STORAGE_KEY, seed);
    } catch {
      // Ignore storage failures; the fact will just re-randomize next launch.
    }

    return;
  }

  if (!FACT_SEED_FILE) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(FACT_SEED_FILE, JSON.stringify({ seed }));
  } catch {
    // Ignore persistence failures; the fact will just re-randomize next launch.
  }
}

async function getOrCreateDeviceSeed(): Promise<string> {
  const existing = await readDeviceSeed();

  if (existing) {
    return existing;
  }

  const seed = randomSeed();
  await writeDeviceSeed(seed);
  return seed;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export async function getDailyFact(): Promise<string> {
  const deviceSeed = await getOrCreateDeviceSeed();
  const index = hashString(`${deviceSeed}:${todayKey()}`) % ANIMAL_FACTS.length;
  return ANIMAL_FACTS[index];
}
