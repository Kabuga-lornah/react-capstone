import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";

export default function AdminDashboardScreen() {
  const { userData, logout } = useAuth();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Admin dashboard</Text>
        <Text style={styles.title}>Admin login worked</Text>
        <Text style={styles.body}>
          Logged in as {userData?.email || "your admin account"}. We can turn
          this placeholder into the real admin mobile flow later if you want it.
        </Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
    padding: 20,
    justifyContent: "center",
  },
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
