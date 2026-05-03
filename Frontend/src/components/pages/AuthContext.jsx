import React, { createContext, useContext, useEffect, useState } from "react";
import {
  clearTokens,
  getAccessToken,
  getCurrentUser,
  sendHeartbeat,
  setTokens,
} from "../../services/api";

const AuthContext = createContext();

const getDisplayName = (profile) => {
  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  return fullName || profile.username || profile.email || "User";
};

const getUserType = (role) => {
  if (role === "rehomer") {
    return "rehomer";
  }

  if (role === "shelter_admin") {
    return "shelter";
  }

  return "user";
};

const buildCurrentUser = (profile) => ({
  uid: String(profile.id),
  id: profile.id,
  email: profile.email,
  username: profile.username,
  displayName: getDisplayName(profile),
  role: profile.role,
  firstName: profile.first_name || "",
  lastName: profile.last_name || "",
});

const buildUserData = (profile) => ({
  ...profile,
  displayName: getDisplayName(profile),
  isRehomer: profile.role === "rehomer",
  userType: getUserType(profile.role),
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyProfile = (profile) => {
    setCurrentUser(buildCurrentUser(profile));
    setUserData(buildUserData(profile));
  };

  const setAuthenticatedUser = (profile, tokens) => {
    if (tokens?.access && tokens?.refresh) {
      setTokens(tokens.access, tokens.refresh);
    }

    applyProfile(profile);
  };

  const logout = () => {
    clearTokens();
    setCurrentUser(null);
    setUserData(null);
  };

  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = getAccessToken();

      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getCurrentUser();
        applyProfile(profile);
      } catch (error) {
        console.error("Error restoring auth session:", error);
        clearTokens();
        setCurrentUser(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!currentUser || !getAccessToken()) {
      return undefined;
    }

    const sendPresenceHeartbeat = async () => {
      try {
        await sendHeartbeat();
      } catch (error) {
        console.error("Error sending heartbeat:", error);
      }
    };

    sendPresenceHeartbeat();
    const interval = setInterval(sendPresenceHeartbeat, 60000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const value = {
    user: currentUser,
    userData,
    loading,
    setAuthenticatedUser,
    logout,
    isRehomer: () => userData?.isRehomer === true,
    isRegularUser: () => userData?.isRehomer !== true,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
