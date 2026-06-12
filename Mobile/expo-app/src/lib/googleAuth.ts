import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { loginWithGoogle } from "@/lib/api";

WebBrowser.maybeCompleteAuthSession();

const getGoogleClientId = () => {
  const platformClientId =
    Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim()
      : Platform.OS === "ios"
        ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim()
        : process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  return (
    platformClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    ""
  );
};

const randomNonce = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function signInWithGoogle(role: "adopter" | "rehomer" = "adopter") {
  const clientId = getGoogleClientId();

  if (!clientId) {
    throw new Error(
      "Google login is not configured for the Expo app yet. Add an EXPO_PUBLIC_GOOGLE_*_CLIENT_ID first.",
    );
  }

  const redirectUri = Linking.createURL("/google-auth");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    prompt: "select_account",
    nonce: randomNonce(),
  });

  const result = await WebBrowser.openAuthSessionAsync(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri,
  );

  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("Google login was cancelled.");
  }

  if (result.type !== "success" || !result.url) {
    throw new Error("Google login could not be completed on this device.");
  }

  const hash = result.url.split("#")[1] || "";
  const responseParams = new URLSearchParams(hash);
  const idToken = responseParams.get("id_token");
  const error = responseParams.get("error");

  if (error) {
    throw new Error(`Google login failed: ${error}`);
  }

  if (!idToken) {
    throw new Error("Google login finished without an ID token.");
  }

  return loginWithGoogle({ id_token: idToken, role });
}
