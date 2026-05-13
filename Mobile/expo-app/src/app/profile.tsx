import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MobileAppShell } from "@/components/mobile-app-shell";
import { useAuth } from "@/context/auth";

export default function ProfileScreen() {
  const { userData, logout } = useAuth();

  const displayName =
    `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim() ||
    userData?.username ||
    userData?.email ||
    "User";

  return (
    <MobileAppShell
      title="Profile"
      subtitle="Your account details and settings will grow from here as we translate more screens."
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Account</Text>
        <Text style={styles.title}>{displayName}</Text>
        <Text style={styles.body}>Email: {userData?.email || "Not available"}</Text>
        <Text style={styles.body}>Role: {userData?.role || "Unknown"}</Text>

        <Pressable
          onPress={() => {
            logout();
            router.replace("/");
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Log out</Text>
        </Pressable>
      </View>
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,180,50,0.24)",
    backgroundColor: "rgba(255,255,255,0.86)",
    padding: 22,
    gap: 10,
  },
  eyebrow: {
    color: "#C07000",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: "#2A1500",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
  },
  body: {
    color: "#7A5C35",
    fontSize: 14,
    lineHeight: 22,
  },
  button: {
    marginTop: 10,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
