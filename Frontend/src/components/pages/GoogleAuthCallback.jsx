import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { clearTokens, loginWithGoogle } from "../../services/api";
import { useAuth } from "./AuthContext";

const getRedirectPath = (role) => {
  if (role === "rehomer") return "/rehomer-dashboard";
  if (role === "shelter_admin" || role === "platform_admin") return "/admin-dashboard";
  return "/pets";
};

const isAdminRole = (role) => role === "shelter_admin" || role === "platform_admin";

const decodeState = (value) => {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(window.atob(value));
  } catch {
    return {};
  }
};

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const { setAuthenticatedUser, logout } = useAuth();
  const [message, setMessage] = useState("Finishing Google sign-in...");

  const payload = useMemo(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const state = decodeState(hashParams.get("state"));
    return {
      idToken: hashParams.get("id_token"),
      routeType: state.routeType === "rehomer" ? "rehomer" : "user",
      expectedRole: state.role === "rehomer" ? "rehomer" : "adopter",
      error: hashParams.get("error"),
    };
  }, []);

  useEffect(() => {
    const finishGoogleLogin = async () => {
      if (payload.error) {
        navigate(`/login/${payload.routeType}`, {
          replace: true,
          state: { successMessage: "", email: "", errorMessage: "Google login was cancelled. Please try again." },
        });
        return;
      }

      if (!payload.idToken) {
        setMessage("Google did not return a login token.");
        return;
      }

      try {
        const response = await loginWithGoogle({
          id_token: payload.idToken,
          role: payload.expectedRole,
        });
        const profile = response.user;

        if (!profile) {
          throw new Error("Google login finished, but no profile was returned.");
        }

        if (isAdminRole(profile.role)) {
          setAuthenticatedUser(profile, {
            access: response.access,
            refresh: response.refresh,
          });
          navigate(getRedirectPath(profile.role), { replace: true });
          return;
        }

        if (profile.role !== payload.expectedRole) {
          clearTokens();
          logout();
          navigate(`/login/${payload.routeType}`, {
            replace: true,
            state: {
              successMessage: "",
              email: profile.email,
              errorMessage: `Please login through the ${profile.role === "rehomer" ? "rehomer" : "user"} login page`,
            },
          });
          return;
        }

        setAuthenticatedUser(profile, {
          access: response.access,
          refresh: response.refresh,
        });
        navigate(getRedirectPath(profile.role), { replace: true });
      } catch (error) {
        setMessage(error.message || "Google login failed. Please try again.");
      }
    };

    void finishGoogleLogin();
  }, [logout, navigate, payload, setAuthenticatedUser]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#FFF8EE",
        color: "#5A3A00",
        fontFamily: "'Nunito', sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>{message}</div>
    </div>
  );
}
