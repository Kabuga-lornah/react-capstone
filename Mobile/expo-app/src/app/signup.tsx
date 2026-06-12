import { Link, router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { registerUser } from "@/lib/api";
import { signInWithGoogle } from "@/lib/googleAuth";

type SignupType = "user" | "rehomer";

const mapRouteTypeToRole = (type: SignupType) => {
  if (type === "rehomer") {
    return "rehomer";
  }

  return "adopter";
};

const getRouteLabel = (type: SignupType) => {
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

const typeConfig = {
  user: {
    eyebrow: "Join as an adopter",
    title: "Create your account",
    sub: "Start browsing pets and save the ones that feel right for you.",
  },
  rehomer: {
    eyebrow: "Join as a rehomer",
    title: "Create your rehomer account",
    sub: "Set up your details so adopters can trust and contact you later.",
  },
} as const;

export default function SignupScreen() {
  const { setAuthenticatedUser } = useAuth();
  const params = useLocalSearchParams<{ type?: string }>();
  const type: SignupType = params.type === "rehomer" ? "rehomer" : "user";
  const cfg = typeConfig[type];

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const passwordStrength = useMemo(() => {
    const { password } = formData;
    if (!password) return { level: 0, label: "" };
    if (password.length < 6) return { level: 1, label: "Too short" };
    if (password.length < 8) return { level: 2, label: "Weak" };
    if (/[A-Z]/.test(password) || /[^a-zA-Z0-9]/.test(password)) {
      return { level: 4, label: "Strong" };
    }
    return { level: 3, label: "Good" };
  }, [formData]);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const phoneNumber = formData.phoneNumber.trim();
    const email = formData.email.trim().toLowerCase();

    if (!firstName) return "First name is required.";
    if (!lastName) return "Last name is required.";
    if (!phoneNumber) return "Phone number is required.";
    if (!email) return "Email address is required.";
    if (formData.password.length < 6) return "Password must be at least 6 characters.";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match.";

    return "";
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      await registerUser({
        username: normalizedEmail,
        email: normalizedEmail,
        password: formData.password,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone_number: formData.phoneNumber.trim(),
        role: mapRouteTypeToRole(type),
      });

      router.replace({
        pathname: "/",
        params: {
          type,
          email: normalizedEmail,
          successMessage: "Account created successfully. Please log in to continue.",
        },
      });
    } catch (submitError: any) {
      setError(submitError?.message || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setIsGoogleSubmitting(true);

    try {
      const response = await signInWithGoogle(mapRouteTypeToRole(type));
      const profile = response.user;

      if (!profile) {
        throw new Error("Google signup finished, but no profile was returned.");
      }

      setAuthenticatedUser(profile, {
        access: response.access,
        refresh: response.refresh,
      });
      router.replace(getRedirectPath(profile.role));
    } catch (submitError: any) {
      setError(submitError?.message || "Google signup failed. Please try again.");
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
              <Text style={styles.eyebrow}>{cfg.eyebrow}</Text>
              <Text style={styles.heroTitle}>{cfg.title}</Text>
              <Text style={styles.heroSub}>{cfg.sub}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.tabRow}>
                {[
                  { key: "user" as const, label: "Adopter" },
                  { key: "rehomer" as const, label: "Rehomer" },
                ].map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => router.replace({ pathname: "/signup", params: { type: option.key } })}
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

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>First name</Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(value) => updateField("firstName", value)}
                    placeholder="Jane"
                    placeholderTextColor="#B08A58"
                    style={styles.input}
                    value={formData.firstName}
                  />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>Last name</Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(value) => updateField("lastName", value)}
                    placeholder="Doe"
                    placeholderTextColor="#B08A58"
                    style={styles.input}
                    value={formData.lastName}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  keyboardType="phone-pad"
                  onChangeText={(value) => updateField("phoneNumber", value)}
                  placeholder="+254 700 000 000"
                  placeholderTextColor="#B08A58"
                  style={styles.input}
                  value={formData.phoneNumber}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={(value) => updateField("email", value)}
                  placeholder="hello@example.com"
                  placeholderTextColor="#B08A58"
                  style={styles.input}
                  value={formData.email}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordShell}>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={(value) => updateField("password", value)}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#B08A58"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.passwordInput]}
                    value={formData.password}
                  />
                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    style={styles.passwordToggle}
                  >
                    <Text style={styles.passwordToggleText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
                {passwordStrength.label ? (
                  <View style={styles.strengthWrap}>
                    {[1, 2, 3, 4].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              level <= passwordStrength.level
                                ? passwordStrength.level <= 2
                                  ? "#F59E0B"
                                  : passwordStrength.level === 3
                                    ? "#E87E00"
                                    : "#22C55E"
                                : "rgba(210,160,60,0.2)",
                          },
                        ]}
                      />
                    ))}
                    <Text style={styles.strengthLabel}>{passwordStrength.label}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm password</Text>
                <View style={styles.passwordShell}>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={(value) => updateField("confirmPassword", value)}
                    placeholder="Type your password again"
                    placeholderTextColor="#B08A58"
                    secureTextEntry={!showConfirmPassword}
                    style={[styles.input, styles.passwordInput]}
                    value={formData.confirmPassword}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword((current) => !current)}
                    style={styles.passwordToggle}
                  >
                    <Text style={styles.passwordToggleText}>
                      {showConfirmPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && !isSubmitting ? styles.submitButtonPressed : null,
                  isSubmitting ? styles.submitButtonDisabled : null,
                ]}
              >
                {isSubmitting ? (
                  <View style={styles.buttonBusyState}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.submitButtonText}>Creating account...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>
                    {`Create ${getRouteLabel(type)} account`}
                  </Text>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>or sign up with</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                disabled={isGoogleSubmitting}
                onPress={handleGoogleSignup}
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
                Already have an account?{" "}
                <Link
                  href={{
                    pathname: "/",
                    params: { type },
                  }}
                  style={styles.footerLink}
                >
                  Log in
                </Link>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
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
    bottom: 60,
    left: -90,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "#FFAA33",
    opacity: 0.2,
  },
  topBar: {
    marginBottom: 12,
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
    marginBottom: 18,
  },
  eyebrow: {
    overflow: "hidden",
    color: "#B85D00",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    backgroundColor: "rgba(255,153,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,153,0,0.3)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  heroTitle: {
    color: "#2A1500",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
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
  },
  tabButtonText: {
    color: "#9A6C30",
    fontSize: 12,
    fontWeight: "800",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  errorBox: {
    backgroundColor: "#FFF3E0",
    borderColor: "#F6C87A",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  errorText: {
    color: "#7A4800",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  half: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    color: "#9A6C30",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
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
  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  strengthLabel: {
    color: "#9A6C30",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 6,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  submitButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  submitButtonDisabled: {
    opacity: 0.75,
  },
  submitButtonText: {
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
});
