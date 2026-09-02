import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { MobileAppShell } from "@/components/mobile-app-shell";

export default function VetsScreen() {
  return (
    <MobileAppShell subtitle="Find veterinary clinics near you" title="Vet clinics">
      <View style={styles.center}>
        <Text style={styles.emoji}>🩺</Text>
        <Text style={styles.title}>Coming soon</Text>
        <Text style={styles.text}>
          We're building a directory of nearby vet clinics with consultation fees. Check back
          soon.
        </Text>
      </View>
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    color: "#1C1207",
    fontSize: 20,
    fontWeight: "900",
  },
  text: {
    color: "#7A5C35",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
