import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import {
  clearTokens,
  getAccessToken,
  getCurrentUser,
  getRefreshToken,
  setTokens,
} from "@/lib/api";

type UserProfile = {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  community_alias?: string;
  profile_photo_url?: string;
  rehomer_verification_status?: "incomplete" | "pending" | "verified" | "rejected";
  is_online?: boolean;
  last_seen?: string;
  role: string;
};

type AuthContextValue = {
  isReady: boolean;
  userData: UserProfile | null;
  setAuthenticatedUser: (
    profile: UserProfile,
    tokens?: { access?: string; refresh?: string },
  ) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_SESSION_STORAGE_KEY = "pet_adoption_mobile_session";
const AUTH_SESSION_FILE = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}pet-adoption-auth-session.json`
  : null;

type PersistedAuthSession = {
  access?: string | null;
  refresh?: string | null;
  profile?: UserProfile | null;
};

const canUseLocalStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

async function readPersistedSession(): Promise<PersistedAuthSession | null> {
  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return null;
    }

    try {
      const value = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  if (!AUTH_SESSION_FILE) {
    return null;
  }

  try {
    const info = await FileSystem.getInfoAsync(AUTH_SESSION_FILE);
    if (!info.exists) {
      return null;
    }

    const value = await FileSystem.readAsStringAsync(AUTH_SESSION_FILE);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

async function persistSession(session: PersistedAuthSession) {
  const serialized = JSON.stringify(session);

  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, serialized);
    } catch {
      // Ignore web storage failures.
    }

    return;
  }

  if (!AUTH_SESSION_FILE) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(AUTH_SESSION_FILE, serialized);
  } catch {
    // Ignore persistence failures and keep in-memory auth working.
  }
}

async function clearPersistedSession() {
  if (Platform.OS === "web") {
    if (!canUseLocalStorage()) {
      return;
    }

    try {
      window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } catch {
      // Ignore web storage failures.
    }

    return;
  }

  if (!AUTH_SESSION_FILE) {
    return;
  }

  try {
    const info = await FileSystem.getInfoAsync(AUTH_SESSION_FILE);
    if (info.exists) {
      await FileSystem.deleteAsync(AUTH_SESSION_FILE, { idempotent: true });
    }
  } catch {
    // Ignore cleanup failures.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      try {
        const savedSession = await readPersistedSession();

        if (!savedSession?.access && !savedSession?.refresh) {
          return;
        }

        setTokens(savedSession.access || undefined, savedSession.refresh || undefined);

        if (savedSession.profile && isActive) {
          setUserData(savedSession.profile);
        }

        try {
          const freshProfile = await getCurrentUser();

          if (!isActive) {
            return;
          }

          setUserData(freshProfile);
          await persistSession({
            access: getAccessToken(),
            refresh: getRefreshToken(),
            profile: freshProfile,
          });
        } catch {
          clearTokens();
          await clearPersistedSession();

          if (isActive) {
            setUserData(null);
          }
        }
      } finally {
        if (isActive) {
          setIsReady(true);
        }
      }
    };

    restoreSession();

    return () => {
      isActive = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      userData,
      setAuthenticatedUser: (profile, tokens) => {
        if (tokens?.access || tokens?.refresh) {
          setTokens(tokens.access, tokens.refresh);
        }

        setUserData(profile);
        void persistSession({
          access: getAccessToken(),
          refresh: getRefreshToken(),
          profile,
        });
      },
      logout: () => {
        clearTokens();
        setUserData(null);
        void clearPersistedSession();
      },
    }),
    [isReady, userData],
  );

  return (
    <AuthContext.Provider value={value}>
      {isReady ? children : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
