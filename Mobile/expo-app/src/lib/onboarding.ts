import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const ONBOARDING_STORAGE_KEY = "pet_adoption_mobile_onboarding_seen";
const ONBOARDING_FILE = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}pet-adoption-onboarding.json`
  : null;

const canUseLocalStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

type PersistedOnboardingState = {
  seen: boolean;
};

export async function hasSeenOnboarding() {
  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return false;
    }

    try {
      return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  if (!ONBOARDING_FILE) {
    return false;
  }

  try {
    const info = await FileSystem.getInfoAsync(ONBOARDING_FILE);
    if (!info.exists) {
      return false;
    }

    const value = await FileSystem.readAsStringAsync(ONBOARDING_FILE);
    const parsed = JSON.parse(value) as PersistedOnboardingState;
    return parsed.seen === true;
  } catch {
    return false;
  }
}

export async function markOnboardingSeen() {
  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {
      // Ignore local storage failures and keep onboarding usable.
    }

    return;
  }

  if (!ONBOARDING_FILE) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(
      ONBOARDING_FILE,
      JSON.stringify({ seen: true } satisfies PersistedOnboardingState),
    );
  } catch {
    // Ignore file persistence failures and keep onboarding usable.
  }
}
