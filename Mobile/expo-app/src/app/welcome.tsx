import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { markOnboardingSeen } from "@/lib/onboarding";

const slides = [
  {
    emoji: "🐾",
    eyebrow: "Welcome",
    title: "Meet pets that need a safe, loving home.",
    text: "Browse cats, dogs, and small companions from rehomers who are trying to place them carefully.",
    reminder: "The best matches start with calm homes, honest expectations, and a little patience.",
    accent: "#F18700",
    accentSoft: "#FFE0AF",
    icon: "paw",
  },
  {
    emoji: "🧡",
    eyebrow: "Find Your Match",
    title: "Save favorites and come back to them in your Pet Pouch.",
    text: "Shortlist pets you love, compare personalities, and use the app to keep your adoption journey organized.",
    reminder: "Great listings usually have clear photos, routines, and personality notes.",
    accent: "#E36A2E",
    accentSoft: "#FFD5C2",
    icon: "heart-multiple",
  },
  {
    emoji: "🩺",
    eyebrow: "Adopt Responsibly",
    title: "Ask the right questions before you apply.",
    text: "Check health history, vaccination, feeding routines, and the kind of home each pet needs before committing.",
    reminder: "Adoption works best when the pet's routine and your lifestyle actually fit.",
    accent: "#D97706",
    accentSoft: "#FFE7B8",
    icon: "stethoscope",
  },
  {
    emoji: "🏡",
    eyebrow: "A Safe Space",
    title: "Treat every adoption like a long-term promise.",
    text: "This app is built to help serious adopters and caring rehomers make safer, more thoughtful matches.",
    reminder: "Pets are family, so every step in the process should feel intentional.",
    accent: "#A8551F",
    accentSoft: "#F8D3BE",
    icon: "home-heart",
  },
] as const;

export default function WelcomeScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const slide = slides[activeIndex];
  const isLastSlide = activeIndex === slides.length - 1;

  const progressLabel = useMemo(
    () => `${activeIndex + 1} of ${slides.length}`,
    [activeIndex],
  );

  const handleFinish = async () => {
    if (isFinishing) {
      return;
    }

    setIsFinishing(true);
    await markOnboardingSeen();
    router.replace("/");
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobMiddle]} />
      <View style={[styles.blob, styles.blobBottom]} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <View style={styles.progressPill}>
              <Text style={styles.progressText}>{progressLabel}</Text>
            </View>
            <Pressable onPress={handleFinish} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>

          <View style={styles.garland}>
            {slides.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.garlandCard,
                  {
                    backgroundColor: index === activeIndex ? item.accent : "#FFF6E7",
                    transform: [{ rotate: `${index % 2 === 0 ? -6 : 6}deg` }],
                    top: index % 2 === 0 ? 8 : 24,
                  },
                ]}
              >
                <Text style={styles.garlandEmoji}>{item.emoji}</Text>
              </View>
            ))}
          </View>

          <View style={styles.slideCard}>
            <View
              style={[
                styles.emojiWrap,
                { backgroundColor: slide.accentSoft, shadowColor: slide.accent },
              ]}
            >
              <Text style={styles.emojiText}>{slide.emoji}</Text>
            </View>

            <View style={[styles.iconChip, { backgroundColor: slide.accentSoft }]}>
              <MaterialCommunityIcons color={slide.accent} name={slide.icon} size={16} />
              <Text style={[styles.iconChipText, { color: slide.accent }]}>
                {slide.eyebrow}
              </Text>
            </View>

            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.text}</Text>

            <View style={styles.reminderCard}>
              <Text style={styles.reminderLabel}>Gentle reminder</Text>
              <Text style={styles.reminderText}>{slide.reminder}</Text>
            </View>

            <View style={styles.dots}>
              {slides.map((item, index) => (
                <View
                  key={item.title}
                  style={[
                    styles.dot,
                    index === activeIndex
                      ? { backgroundColor: slide.accent, width: 26 }
                      : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.actionRow}>
            {activeIndex > 0 ? (
              <Pressable
                onPress={() => setActiveIndex((currentValue) => currentValue - 1)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.buttonSpacer} />
            )}

            <Pressable
              disabled={isFinishing}
              onPress={() => {
                if (isLastSlide) {
                  void handleFinish();
                  return;
                }

                setActiveIndex((currentValue) => currentValue + 1);
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !isFinishing ? styles.buttonPressed : null,
                isFinishing ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isLastSlide ? "Start exploring" : "Next"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footerNote}>
            You can always come back here from the login screen if you want a quick refresher.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF7EB",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.32,
  },
  blobTop: {
    width: 230,
    height: 230,
    top: -90,
    right: -70,
    backgroundColor: "#FFD279",
  },
  blobMiddle: {
    width: 190,
    height: 190,
    top: "36%",
    left: -90,
    backgroundColor: "#FFE4B8",
  },
  blobBottom: {
    width: 220,
    height: 220,
    bottom: -100,
    right: -60,
    backgroundColor: "#FFC580",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  progressPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(241,135,0,0.2)",
    backgroundColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  progressText: {
    color: "#A55B00",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  skipButton: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  skipText: {
    color: "#A55B00",
    fontSize: 14,
    fontWeight: "800",
  },
  garland: {
    height: 112,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  garlandCard: {
    width: 72,
    height: 84,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  garlandEmoji: {
    fontSize: 30,
  },
  slideCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(241,135,0,0.12)",
    backgroundColor: "rgba(255,252,244,0.94)",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    shadowColor: "#B86A00",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  emojiWrap: {
    width: 92,
    height: 92,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  emojiText: {
    fontSize: 42,
  },
  iconChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  iconChipText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#4B2500",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    color: "#735534",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 18,
  },
  reminderCard: {
    borderRadius: 20,
    backgroundColor: "#FFF3DB",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  reminderLabel: {
    color: "#C16D00",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  reminderText: {
    color: "#6B4A1F",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  dot: {
    height: 10,
    borderRadius: 999,
  },
  dotInactive: {
    width: 10,
    backgroundColor: "#E4C89F",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  buttonSpacer: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(209,139,37,0.28)",
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#9C5F00",
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1.3,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F18700",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  footerNote: {
    color: "#8E6A40",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 10,
  },
});
