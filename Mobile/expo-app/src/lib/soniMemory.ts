import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

export type ChatTurn = { role: "user" | "model"; text: string };

const MEMORY_STORAGE_KEY = "pet_adoption_mobile_soni_memory";
const MEMORY_FILE = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}pet-adoption-soni-memory.json`
  : null;

// Keep enough turns for Soni to have real continuity across app restarts,
// without letting the stored history (and the prompt built from it) grow
// unbounded.
const MAX_STORED_TURNS = 20;

const canUseLocalStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export async function loadSoniMemory(): Promise<ChatTurn[]> {
  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(MEMORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (!MEMORY_FILE) {
    return [];
  }

  try {
    const info = await FileSystem.getInfoAsync(MEMORY_FILE);
    if (!info.exists) {
      return [];
    }

    const value = await FileSystem.readAsStringAsync(MEMORY_FILE);
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSoniMemory(history: ChatTurn[]) {
  const trimmed = history.slice(-MAX_STORED_TURNS);

  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore storage failures; Soni just won't remember this turn next launch.
    }

    return;
  }

  if (!MEMORY_FILE) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(MEMORY_FILE, JSON.stringify(trimmed));
  } catch {
    // Ignore persistence failures; Soni just won't remember this turn next launch.
  }
}

export async function clearSoniMemory() {
  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      window.localStorage.removeItem(MEMORY_STORAGE_KEY);
    } catch {
      // Ignore.
    }

    return;
  }

  if (!MEMORY_FILE) {
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(MEMORY_FILE);
    if (info.exists) {
      await FileSystem.deleteAsync(MEMORY_FILE, { idempotent: true });
    }
  } catch {
    // Ignore.
  }
}
