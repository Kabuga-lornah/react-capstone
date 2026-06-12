import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";

import { MobileAppShell } from "@/components/mobile-app-shell";
import { useAuth } from "@/context/auth";
import { updateCurrentUser } from "@/lib/api";

type MessageState = {
  type: "" | "success" | "error";
  text: string;
};

export default function ProfileScreen() {
  const { userData, setAuthenticatedUser, logout } = useAuth();
  const [formData, setFormData] = useState({
    first_name: userData?.first_name || "",
    last_name: userData?.last_name || "",
    email: userData?.email || "",
    phone_number: userData?.phone_number || "",
    community_alias: userData?.community_alias || "",
    profile_photo_url: userData?.profile_photo_url || "",
  });
  const [message, setMessage] = useState<MessageState>({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      first_name: userData?.first_name || "",
      last_name: userData?.last_name || "",
      email: userData?.email || "",
      phone_number: userData?.phone_number || "",
      community_alias: userData?.community_alias || "",
      profile_photo_url: userData?.profile_photo_url || "",
    });
  }, [userData]);

  const displayName = useMemo(() => {
    const fullName = `${formData.first_name} ${formData.last_name}`.trim();
    return fullName || userData?.username || userData?.email || "Your profile";
  }, [formData.first_name, formData.last_name, userData]);

  const handleChange =
    (field: keyof typeof formData) =>
    (value: string) => {
      setFormData((current) => ({
        ...current,
        [field]: value,
      }));
    };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const updatedProfile = await updateCurrentUser({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        community_alias: formData.community_alias.trim(),
        profile_photo_url: formData.profile_photo_url.trim(),
      });

      setAuthenticatedUser(updatedProfile);
      setMessage({ type: "success", text: "Your profile has been updated." });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileAppShell
      title="Profile"
      subtitle="Update your contact details, community username, and profile photo link from one place."
      scroll
    >
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>User Profile</Text>
          <Text style={styles.title}>{displayName}</Text>
          <Text style={styles.subtitle}>
            Keep your details current so chats, community, and adoption updates feel personal.
          </Text>
        </View>

        <View style={styles.avatar}>
          {formData.profile_photo_url ? (
            <Image contentFit="cover" source={{ uri: formData.profile_photo_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarFallback}>
              {(displayName.charAt(0) || "P").toUpperCase()}
            </Text>
          )}
        </View>
      </View>

      {message.text ? (
        <View
          style={[
            styles.banner,
            message.type === "success" ? styles.bannerSuccess : styles.bannerError,
          ]}
        >
          <Text style={styles.bannerText}>{message.text}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile photo</Text>
        <Text style={styles.sectionBody}>
          Paste an image URL for now while we keep translating the richer web upload flow to mobile.
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="url"
          onChangeText={handleChange("profile_photo_url")}
          placeholder="https://example.com/your-photo.jpg"
          placeholderTextColor="#B08A58"
          style={styles.input}
          value={formData.profile_photo_url}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your details</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>First name</Text>
          <TextInput
            onChangeText={handleChange("first_name")}
            placeholder="Jane"
            placeholderTextColor="#B08A58"
            style={styles.input}
            value={formData.first_name}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Last name</Text>
          <TextInput
            onChangeText={handleChange("last_name")}
            placeholder="Doe"
            placeholderTextColor="#B08A58"
            style={styles.input}
            value={formData.last_name}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email address</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={handleChange("email")}
            placeholder="hello@example.com"
            placeholderTextColor="#B08A58"
            style={styles.input}
            value={formData.email}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Phone number</Text>
          <TextInput
            keyboardType="phone-pad"
            onChangeText={handleChange("phone_number")}
            placeholder="+2547..."
            placeholderTextColor="#B08A58"
            style={styles.input}
            value={formData.phone_number}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Community username</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={handleChange("community_alias")}
            placeholder="Choose the name people see in Community"
            placeholderTextColor="#B08A58"
            style={styles.input}
            value={formData.community_alias}
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <Pressable disabled={saving} onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save changes"}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.sectionBody}>
          Signed in as {userData?.role || "user"}.
        </Text>
        <Pressable
          onPress={() => {
            logout();
            router.replace("/");
          }}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutButtonText}>Log out</Text>
        </Pressable>
      </View>
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingTop: 4,
    paddingBottom: 18,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,154,35,0.18)",
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: "#C87907",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  title: {
    color: "#1C1207",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    color: "#7B6245",
    fontSize: 14,
    lineHeight: 22,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFE8BA",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    color: "#9C5F00",
    fontSize: 28,
    fontWeight: "900",
  },
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  bannerSuccess: {
    backgroundColor: "#FFF5DF",
    borderColor: "#F3C981",
  },
  bannerError: {
    backgroundColor: "#FFF3E0",
    borderColor: "#F6C87A",
  },
  bannerText: {
    color: "#7A4800",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.18)",
    backgroundColor: "rgba(255,255,255,0.88)",
    padding: 18,
    marginBottom: 14,
    gap: 12,
  },
  sectionTitle: {
    color: "#1C1207",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionBody: {
    color: "#7B6245",
    fontSize: 14,
    lineHeight: 21,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: "#A56E24",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.22)",
    backgroundColor: "#FFFFFF",
    color: "#1C1207",
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.22)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: "#9C5F00",
    fontSize: 15,
    fontWeight: "800",
  },
  saveButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  logoutButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#FFF1D8",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "#B66900",
    fontSize: 14,
    fontWeight: "800",
  },
});
