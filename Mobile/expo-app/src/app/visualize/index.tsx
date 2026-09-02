import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { MobileAppShell } from "@/components/mobile-app-shell";
import { getAccessToken, listPets, listWishlist } from "@/lib/api";
import { normalizeCompanionPet, toTitleCase, type CompanionPet } from "@/lib/petUtils";

export default function VisualizePickerScreen() {
  const [pets, setPets] = useState<CompanionPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrorText("");

        if (getAccessToken()) {
          const wishlistResponse = await listWishlist().catch(() => []);
          const wishlistItems = Array.isArray(wishlistResponse)
            ? wishlistResponse
            : wishlistResponse?.results || [];
          const wishlistPets = wishlistItems
            .map((item: any) => item.pet)
            .filter(Boolean)
            .map(normalizeCompanionPet);

          if (wishlistPets.length > 0) {
            setPets(wishlistPets);
            return;
          }
        }

        const response = await listPets();
        const petsData = Array.isArray(response) ? response : response?.results || [];
        setPets(
          petsData
            .map(normalizeCompanionPet)
            .filter((pet: CompanionPet) => pet.status.toLowerCase() === "available")
            .slice(0, 12),
        );
      } catch (error: any) {
        setErrorText(error?.message || "Could not load pets right now.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <MobileAppShell
      scroll
      subtitle="Pick a pet to see how they'd look in your space"
      title="Room visualizer"
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#F18700" size="large" />
        </View>
      ) : errorText ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Save a pet to your Pet Pouch or browse available pets first, then come back here.
          </Text>
          <Pressable onPress={() => router.push("/pets")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Browse pets</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.grid}>
          {pets.map((pet) => (
            <Pressable
              key={pet.id}
              onPress={() => router.push({ pathname: "/visualize/[id]", params: { id: pet.id } })}
              style={styles.card}
            >
              <Image contentFit="cover" source={{ uri: pet.imageUrl }} style={styles.cardImage} />
              <Text style={styles.cardName}>{pet.name}</Text>
              <Text style={styles.cardMeta}>{toTitleCase(pet.typeLabel)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingVertical: 60,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: "#7A5C35",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  primaryButton: {
    minHeight: 50,
    minWidth: 180,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 20,
  },
  card: {
    width: "47%",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.16)",
    padding: 10,
  },
  cardImage: {
    width: "100%",
    height: 130,
    borderRadius: 14,
    backgroundColor: "#FEE9BF",
    marginBottom: 8,
  },
  cardName: {
    color: "#1C1207",
    fontSize: 14,
    fontWeight: "800",
  },
  cardMeta: {
    color: "#9A7444",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
