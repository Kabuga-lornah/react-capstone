import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AiOrb } from "@/components/ai-orb";
import { PetSwipeDeck } from "@/components/pet-swipe-deck";
import { useAuth } from "@/context/auth";
import {
  addToWishlist,
  getAccessToken,
  listPets,
} from "@/lib/api";
import {
  buildMatchIntro,
  buildPetNarration,
  buildWelcomeMessage,
  detectPetInterest,
  petMatchesInterest,
  speakText,
  stopSpeaking,
  type DetectedInterest,
} from "@/lib/aiCompanion";
import { hasSeenOnboarding } from "@/lib/onboarding";
import { normalizeCompanionPet, type CompanionPet } from "@/lib/petUtils";

type Stage = "greeting" | "showing";

export default function AiCompanionScreen() {
  const { userData, isReady } = useAuth();
  const firstName =
    userData?.first_name ||
    userData?.username ||
    "friend";
  const welcome = useMemo(() => buildWelcomeMessage(firstName), [firstName]);

  const [stage, setStage] = useState<Stage>("greeting");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState(welcome);
  const [interest, setInterest] = useState<DetectedInterest | null>(null);
  const [matches, setMatches] = useState<CompanionPet[]>([]);
  const [index, setIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [likedMessage, setLikedMessage] = useState("");
  const hasGreeted = useRef(false);

  const currentPet = matches[index];
  const narration = currentPet && interest ? buildPetNarration(currentPet, interest) : "";

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const seenOnboarding = await hasSeenOnboarding();

      if (!active) {
        return;
      }

      if (!seenOnboarding) {
        router.replace("/welcome");
        return;
      }

      if (isReady && userData?.role === "rehomer") {
        router.replace("/rehomer-dashboard");
        return;
      }

      if (
        isReady &&
        (userData?.role === "shelter_admin" || userData?.role === "platform_admin")
      ) {
        router.replace("/admin-dashboard");
      }
    };

    void boot();

    return () => {
      active = false;
    };
  }, [isReady, userData]);

  useEffect(() => {
    if (hasGreeted.current) {
      return;
    }

    hasGreeted.current = true;
    void speakText(welcome);
  }, [welcome]);

  useEffect(() => {
    if (stage !== "showing" || !narration) {
      return;
    }

    void speakText(narration);
  }, [narration, stage, currentPet?.id]);

  useEffect(() => {
    return () => {
      void stopSpeaking();
    };
  }, []);

  const advanceDeck = () => {
    if (index + 1 >= matches.length) {
      setStage("greeting");
      setMatches([]);
      setIndex(0);
      const wrapUp = interest
        ? `That's everyone I have for ${interest.label} right now. What else would you like to adopt today?`
        : "That's everyone for now. What else would you like to adopt today?";
      setStatus(wrapUp);
      void speakText(wrapUp);
      return;
    }

    setIndex((current) => current + 1);
  };

  const handlePass = () => {
    advanceDeck();
  };

  const handleLike = async () => {
    if (!currentPet) {
      return;
    }

    if (getAccessToken()) {
      try {
        await addToWishlist(currentPet.id);
        setLikedMessage(`${currentPet.name} is saved in your Pet Pouch.`);
      } catch {
        setLikedMessage(`${currentPet.name} caught your eye. Sign in if you want to save them.`);
      }
    } else {
      setLikedMessage(`Nice pick. Sign in if you want to save ${currentPet.name}.`);
    }

    advanceDeck();
  };

  const handleAsk = async () => {
    const text = input.trim();

    if (!text || isThinking) {
      return;
    }

    const detected = detectPetInterest(text);
    setInput("");
    setLikedMessage("");

    if (!detected) {
      const clarification =
        "I can look for a dog, cat, rabbit, bird, snake, tortoise, chicken, or another companion. What are you hoping to adopt today?";
      setStatus(clarification);
      void speakText(clarification);
      return;
    }

    setIsThinking(true);
    setInterest(detected);

    try {
      const response = await listPets();
      const petsData = Array.isArray(response) ? response : response?.results || [];
      const available = petsData
        .map(normalizeCompanionPet)
        .filter((pet: CompanionPet) => String(pet.status).toLowerCase() === "available")
        .filter((pet: CompanionPet) => petMatchesInterest(pet, detected));

      setMatches(available);
      setIndex(0);

      const intro = buildMatchIntro(detected, available.length);
      setStatus(intro);

      if (available.length > 0) {
        setStage("showing");
      } else {
        void speakText(intro);
      }
    } catch {
      const errorText =
        "I couldn't reach the pets list just now. Check that the backend is running, then tell me again what you'd like to adopt.";
      setStatus(errorText);
      void speakText(errorText);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            My<Text style={styles.brandAccent}>Furry</Text>Friends
          </Text>
          <Pressable
            onPress={() => router.push(userData ? "/profile" : "/login")}
            style={styles.topButton}
          >
            <Text style={styles.topButtonText}>{userData ? "Profile" : "Sign in"}</Text>
          </Pressable>
        </View>

        {stage === "greeting" ? (
          <View style={styles.greetingStage}>
            <AiOrb size={248} speaking={!isThinking} />
            <Text style={styles.kicker}>Your adoption companion</Text>
            <Text style={styles.speech}>{isThinking ? "Looking through available pets..." : status}</Text>
          </View>
        ) : currentPet ? (
          <View style={styles.showStage}>
            <View style={styles.miniOrbRow}>
              <AiOrb size={72} speaking />
              <Text style={styles.miniStatus}>{likedMessage || status}</Text>
            </View>
            <PetSwipeDeck
              pet={currentPet}
              remaining={Math.max(matches.length - index - 1, 0)}
              narration={narration}
              onPass={handlePass}
              onLike={handleLike}
            />
          </View>
        ) : null}

        <Pressable onPress={() => router.push("/pets")} style={styles.browseLink}>
          <Text style={styles.browseLinkText}>Browse pets nearby</Text>
        </Pressable>

        <View style={styles.composer}>
          <TextInput
            onChangeText={setInput}
            onSubmitEditing={() => {
              void handleAsk();
            }}
            placeholder="Say dog, cat, rabbit..."
            placeholderTextColor="#B08A58"
            returnKeyType="send"
            style={styles.input}
            value={input}
          />
          <Pressable
            disabled={isThinking}
            onPress={() => {
              void handleAsk();
            }}
            style={[styles.sendButton, isThinking ? styles.sendButtonDisabled : null]}
          >
            {isThinking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Ask</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
  },
  flex: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 8,
  },
  brand: {
    color: "#3D2000",
    fontSize: 18,
    fontWeight: "900",
  },
  brandAccent: {
    color: "#E87E00",
  },
  topButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.28)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  topButtonText: {
    color: "#C16D00",
    fontSize: 12,
    fontWeight: "800",
  },
  greetingStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
  },
  kicker: {
    marginTop: 18,
    color: "#D97706",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  speech: {
    marginTop: 12,
    color: "#3D2208",
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  showStage: {
    flex: 1,
    paddingBottom: 12,
  },
  miniOrbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  miniStatus: {
    flex: 1,
    color: "#7A5C35",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  browseLink: {
    alignItems: "center",
    paddingBottom: 10,
  },
  browseLinkText: {
    color: "#C16D00",
    fontSize: 13,
    fontWeight: "800",
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 16,
  },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.28)",
    backgroundColor: "#FFFFFF",
    color: "#2A1500",
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: "600",
  },
  sendButton: {
    minWidth: 72,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
