import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { loginWithGoogle } from "@/lib/api";

WebBrowser.maybeCompleteAuthSession();

const getGoogleClientId = () => {
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";
  }

  // Android and iOS need their own OAuth client (tied to the app's package
  // name / bundle id) because Google rejects a custom URL scheme redirect
  // for a "Web" client. Falling back to the web client here would just
  // trade this error for a more confusing one from Google.
  const platformClientId =
    Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim()
      : process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  return platformClientId || "";
};

const randomNonce = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export async function signInWithGoogle(role: "adopter" | "rehomer" = "adopter") {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error(
      "Google sign-in needs a real build of this app, not the Expo Go app. Ask for a development build (eas build --profile development) and open the app from there instead.",
    );
  }

  const clientId = getGoogleClientId();

  if (!clientId) {
    throw new Error(
      Platform.OS === "web"
        ? "Google login is not configured for web yet. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID first."
        : `Google login is not configured for ${Platform.OS} yet. Add EXPO_PUBLIC_GOOGLE_${Platform.OS.toUpperCase()}_CLIENT_ID first.`,
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
