import React, { createContext, useContext, useMemo, useState } from "react";

import { clearTokens, setTokens } from "@/lib/api";

type UserProfile = {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: string;
};

type AuthContextValue = {
  userData: UserProfile | null;
  setAuthenticatedUser: (
    profile: UserProfile,
    tokens?: { access?: string; refresh?: string },
  ) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserProfile | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      userData,
      setAuthenticatedUser: (profile, tokens) => {
        if (tokens?.access || tokens?.refresh) {
          setTokens(tokens.access, tokens.refresh);
        }

        setUserData(profile);
      },
      logout: () => {
        clearTokens();
        setUserData(null);
      },
    }),
    [userData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
