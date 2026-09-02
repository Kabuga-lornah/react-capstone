import { router } from "expo-router";
import React from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { CompanionPet } from "@/lib/petUtils";
import { toTitleCase } from "@/lib/petUtils";

type PetSwipeDeckProps = {
  pet: CompanionPet;
  remaining: number;
  narration: string;
  onPass: () => void;
  onLike: () => void;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.22;

export function PetSwipeDeck({
  pet,
  remaining,
  narration,
  onPass,
  onLike,
}: PetSwipeDeckProps) {
  const translateX = useSharedValue(0);

  const finishSwipe = (direction: "left" | "right") => {
    translateX.value = 0;

    if (direction === "right") {
      onLike();
      return;
    }

    onPass();
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH, {}, () => {
          runOnJS(finishSwipe)("right");
        });
        return;
      }

      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH, {}, () => {
          runOnJS(finishSwipe)("left");
        });
        return;
      }

      translateX.value = withSpring(0);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-12, 0, 12])}deg` },
    ],
  }));

  const likeBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const passBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          <Image contentFit="cover" source={{ uri: pet.imageUrl }} style={styles.image} />

          <View style={[styles.vaccinationBadge, pet.isVaccinated ? styles.vaccinationBadgeYes : styles.vaccinationBadgeNo]}>
            <Text style={styles.vaccinationBadgeText}>
              {pet.isVaccinated ? "Vaccinated" : "Not vaccinated"}
            </Text>
          </View>

          <Animated.View style={[styles.badge, styles.likeBadge, likeBadgeStyle]}>
            <Text style={styles.likeBadgeText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.passBadge, passBadgeStyle]}>
            <Text style={styles.passBadgeText}>PASS</Text>
          </Animated.View>

          <View style={styles.overlay}>
            <Text style={styles.name}>{pet.name}</Text>
            <Text style={styles.meta}>
              {[pet.age, toTitleCase(pet.gender), pet.breed || toTitleCase(pet.typeLabel)]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {pet.location ? <Text style={styles.location}>{pet.location}</Text> : null}
          </View>
        </Animated.View>
      </GestureDetector>

      <Text style={styles.narration}>{narration}</Text>
      {remaining > 0 ? (
        <Text style={styles.remaining}>
          {remaining} more {remaining === 1 ? "pet" : "pets"} after this one
        </Text>
      ) : (
        <Text style={styles.remaining}>This is the last pet in this show</Text>
      )}

      <View style={styles.actions}>
        <Pressable onPress={onPass} style={[styles.actionButton, styles.passButton]}>
          <Text style={styles.passButtonText}>Pass</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/pet/[id]",
              params: { id: pet.id },
            })
          }
          style={[styles.actionButton, styles.profileButton]}
        >
          <Text style={styles.profileButtonText}>Profile</Text>
        </Pressable>
        <Pressable onPress={onLike} style={[styles.actionButton, styles.likeButton]}>
          <Text style={styles.likeButtonText}>Like</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  card: {
    height: 390,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#FEE9BF",
    shadowColor: "#9C5F00",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 18,
    backgroundColor: "rgba(28, 14, 0, 0.55)",
  },
  name: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  meta: {
    color: "#FFE7C2",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  location: {
    color: "#FFD9A0",
    fontSize: 12,
    marginTop: 4,
  },
  vaccinationBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  vaccinationBadgeYes: {
    backgroundColor: "rgba(22,101,52,0.92)",
  },
  vaccinationBadgeNo: {
    backgroundColor: "rgba(120,53,15,0.85)",
  },
  vaccinationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  badge: {
    position: "absolute",
    top: 22,
    borderWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  likeBadge: {
    left: 18,
    borderColor: "#22C55E",
  },
  passBadge: {
    right: 18,
    borderColor: "#EF4444",
  },
  likeBadgeText: {
    color: "#22C55E",
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  passBadgeText: {
    color: "#EF4444",
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  narration: {
    marginTop: 16,
    color: "#4A2E10",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  remaining: {
    marginTop: 8,
    color: "#A27A48",
    fontSize: 12,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  passButton: {
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  profileButton: {
    backgroundColor: "#FFF7EB",
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.24)",
  },
  likeButton: {
    backgroundColor: "#F18700",
  },
  passButtonText: {
    color: "#B91C1C",
    fontWeight: "800",
  },
  profileButtonText: {
    color: "#B45309",
    fontWeight: "800",
  },
  likeButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
