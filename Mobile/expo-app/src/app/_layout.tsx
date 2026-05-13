import { Stack } from "expo-router";
import React from "react";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "@/context/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#FFF8EE" },
        }}
      />
    </AuthProvider>
  );
}
