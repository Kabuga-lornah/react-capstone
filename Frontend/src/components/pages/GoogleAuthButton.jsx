import React from "react";

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim();

const mapRouteTypeToRole = (type) => (type === "rehomer" ? "rehomer" : "adopter");

const randomNonce = () => {
  if (typeof window === "undefined") {
    return "google-auth";
  }

  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const encodeState = (value) => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.btoa(JSON.stringify(value));
};

export default function GoogleAuthButton({ routeType = "user", style, children }) {
  const handleGoogleLogin = () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      window.alert("Google login is not configured yet. Add VITE_GOOGLE_WEB_CLIENT_ID to the frontend environment first.");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const state = encodeState({
      role: mapRouteTypeToRole(routeType),
      routeType,
      nonce: randomNonce(),
    });
    const params = new URLSearchParams({
      client_id: GOOGLE_WEB_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "id_token",
      scope: "openid email profile",
      prompt: "select_account",
      nonce: randomNonce(),
      state,
    });

    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  };

  return (
    <button onClick={handleGoogleLogin} style={style} type="button">
      {children}
    </button>
  );
}
