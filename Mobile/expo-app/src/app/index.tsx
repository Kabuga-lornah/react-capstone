import { Link, router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import { API_BASE_URL, clearTokens, getCurrentUser, loginUser } from "@/lib/api";
import { signInWithGoogle } from "@/lib/googleAuth";
import { hasSeenOnboarding } from "@/lib/onboarding";

type LoginType = "user" | "rehomer";
type MessageState = { type: "" | "success" | "error"; text: string };

const mapRouteTypeToRole = (type: LoginType) => {
  if (type === "rehomer") {
    return "rehomer";
  }

  return "adopter";
};

const getRouteLabel = (type: LoginType) => {
  if (type === "rehomer") {
    return "Rehomer";
  }

  return "User";
};

const getRedirectPath = (role: string) => {
  if (role === "rehomer") {
    return "/rehomer-dashboard";
  }

  if (role === "shelter_admin" || role === "platform_admin") {
    return "/admin-dashboard";
  }

  return "/pets";
};

const isAdminRole = (role: string) =>
  role === "shelter_admin" || role === "platform_admin";

export default function LoginScreen() {
  const { setAuthenticatedUser } = useAuth();
  const params = useLocalSearchParams<{
    email?: string;
    successMessage?: string;
    type?: string;
  }>();
  const initialType = params.type === "rehomer" ? "rehomer" : "user";
  const [type, setType] = useState<LoginType>("user");
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [message, setMessage] = useState<MessageState>(
    typeof params.successMessage === "string"
      ? { type: "success", text: params.successMessage }
      : { type: "", text: "" },
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const currentBaseUrl = useMemo(() => API_BASE_URL, []);

  React.useEffect(() => {
    setType(initialType);
  }, [initialType]);

  React.useEffect(() => {
    let isActive = true;

    const checkOnboarding = async () => {
      try {
        const seenOnboarding = await hasSeenOnboarding();

        if (!isActive) {
          return;
        }

        if (!seenOnboarding) {
          router.replace("/welcome");
          return;
        }
      } finally {
        if (isActive) {
          setIsCheckingOnboarding(false);
        }
      }
    };

    void checkOnboarding();

    return () => {
      isActive = false;
    };
  }, []);

  if (isCheckingOnboarding) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#F18700" size="large" />
        <Text style={styles.loadingText}>Preparing your welcome experience...</Text>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage({ type: "error", text: "Enter your email and password first." });
      return;
    }

    setMessage({ type: "", text: "" });
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const expectedRole = mapRouteTypeToRole(type);
      const tokenResponse = await loginUser({
        username: normalizedEmail,
        password,
      });
      const profile = await getCurrentUser();

      if (isAdminRole(profile.role)) {
        setAuthenticatedUser(profile, {
          access: tokenResponse.access,
          refresh: tokenResponse.refresh,
        });
        router.replace(getRedirectPath(profile.role));
        return;
      }

      if (profile.role !== expectedRole) {
        clearTokens();
        setMessage({
          type: "error",
          text: `Please login through the ${
            profile.role === "rehomer" ? "rehomer" : "user"
          } login page.`,
        });
        return;
      }

      setAuthenticatedUser(profile, {
        access: tokenResponse.access,
        refresh: tokenResponse.refresh,
      });
      router.replace(getRedirectPath(profile.role));
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Login failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage({ type: "", text: "" });
    setIsGoogleSubmitting(true);

    try {
      const expectedRole = mapRouteTypeToRole(type);
      const response = await signInWithGoogle(expectedRole as "adopter" | "rehomer");
      const profile = response.user;

      if (!profile) {
        throw new Error("Google login finished, but no profile was returned.");
      }

      if (isAdminRole(profile.role)) {
        setAuthenticatedUser(profile, {
          access: response.access,
          refresh: response.refresh,
        });
        router.replace(getRedirectPath(profile.role));
        return;
      }

      if (profile.role !== expectedRole) {
        clearTokens();
        setMessage({
          type: "error",
          text: `Please login through the ${
            profile.role === "rehomer" ? "rehomer" : "user"
          } login page.`,
        });
        return;
      }

      setAuthenticatedUser(profile, {
        access: response.access,
        refresh: response.refresh,
      });
      router.replace(getRedirectPath(profile.role));
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Google login failed. Please try again.",
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <Text style={styles.logoText}>
                My<Text style={styles.logoAccent}>Furry</Text>Friends
              </Text>
            </View>

            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Welcome back</Text>
              <Text style={styles.heroSub}>
                Sign in and continue where you left off.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.tabRow}>
                {[
                  { key: "user" as const, label: "Find a pet" },
                  { key: "rehomer" as const, label: "Rehome a pet" },
                ].map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setType(option.key)}
                    style={[
                      styles.tabButton,
                      type === option.key ? styles.tabButtonActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabButtonText,
                        type === option.key ? styles.tabButtonTextActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {message.text ? (
                <View
                  style={[
                    styles.messageBox,
                    message.type === "success"
                      ? styles.messageBoxSuccess
                      : styles.messageBoxError,
                  ]}
                >
                  <Text style={styles.messageText}>{message.text}</Text>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="hello@example.com"
                  placeholderTextColor="#B08A58"
                  style={styles.input}
                  value={email}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordShell}>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#B08A58"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                  />
                  <Pressable
                    onPress={() => setShowPassword((currentValue) => !currentValue)}
                    style={styles.passwordToggle}
                  >
                    <Text style={styles.passwordToggleText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </View>

              <Pressable
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && !isSubmitting ? styles.loginButtonPressed : null,
                  isSubmitting ? styles.loginButtonDisabled : null,
                ]}
              >
                {isSubmitting ? (
                  <View style={styles.buttonBusyState}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.loginButtonText}>Logging in...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginButtonText}>
                    {`Log in as ${getRouteLabel(type)}`}
                  </Text>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                disabled={isGoogleSubmitting}
                onPress={handleGoogleLogin}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && !isGoogleSubmitting ? styles.googleButtonPressed : null,
                  isGoogleSubmitting ? styles.googleButtonDisabled : null,
                ]}
              >
                <Text style={styles.googleButtonText}>
                  {isGoogleSubmitting ? "Connecting to Google..." : "Continue with Google"}
                </Text>
              </Pressable>

              <Text style={styles.footerText}>
                Don&apos;t have an account?{" "}
                <Link
                  href={{
                    pathname: "/signup",
                    params: { type },
                  }}
                  style={styles.footerLink}
                >
                  Sign up free
                </Link>
              </Text>

              <Pressable onPress={() => router.push("/welcome")} style={styles.helperButton}>
                <MaterialCommunityIcons
                  color="#C16D00"
                  name="map-marker-path"
                  size={16}
                />
                <Text style={styles.helperButtonText}>See how the app works</Text>
              </Pressable>

              <Text style={styles.devHint}>
                Mobile API target: {currentBaseUrl}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  loadingText: {
    color: "#8E6A40",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  blobTop: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "#FFCD7A",
    opacity: 0.35,
  },
  blobBottom: {
    position: "absolute",
    bottom: 80,
    left: -90,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: "#FFAA33",
    opacity: 0.18,
  },
  topBar: {
    marginBottom: 26,
  },
  logoText: {
    color: "#3D2000",
    fontSize: 20,
    fontWeight: "900",
  },
  logoAccent: {
    color: "#E87E00",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroTitle: {
    color: "#2A1500",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 8,
  },
  heroSub: {
    color: "#7A5C35",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: "rgba(255,180,50,0.24)",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#9C5F00",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,200,80,0.15)",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,180,50,0.25)",
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#FF9900",
    shadowColor: "#FF8C00",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tabButtonText: {
    color: "#9A6C30",
    fontSize: 12,
    fontWeight: "800",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  messageBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  messageBoxSuccess: {
    backgroundColor: "#FFF5DF",
    borderColor: "#F3C981",
  },
  messageBoxError: {
    backgroundColor: "#FFF3E0",
    borderColor: "#F6C87A",
  },
  messageText: {
    color: "#7A4800",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    color: "#9A6C30",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "rgba(210,160,60,0.35)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    color: "#2A1500",
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  passwordShell: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 74,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    padding: 6,
  },
  passwordToggleText: {
    color: "#B56A00",
    fontSize: 12,
    fontWeight: "800",
  },
  forgotWrap: {
    alignItems: "flex-end",
    marginTop: -2,
    marginBottom: 14,
  },
  forgotText: {
    color: "#E07800",
    fontSize: 12,
    fontWeight: "700",
  },
  loginButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF8C00",
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  loginButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  loginButtonDisabled: {
    opacity: 0.75,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  buttonBusyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(200,140,50,0.2)",
  },
  dividerLabel: {
    color: "#B08050",
    fontSize: 11,
    fontWeight: "700",
  },
  googleButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(210,160,60,0.35)",
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    color: "#2A1500",
    fontSize: 14,
    fontWeight: "700",
  },
  footerText: {
    marginTop: 20,
    color: "#9A7040",
    fontSize: 12,
    textAlign: "center",
  },
  footerLink: {
    color: "#E07800",
    fontWeight: "800",
  },
  helperButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(225,120,0,0.18)",
    backgroundColor: "rgba(255,245,225,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  helperButtonText: {
    color: "#C16D00",
    fontSize: 13,
    fontWeight: "800",
  },
  devHint: {
    marginTop: 18,
    color: "#A28050",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
  },
});
