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
import { Image } from "expo-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { AiOrb } from "@/components/ai-orb";
import { MobileAppShell } from "@/components/mobile-app-shell";
import { PetSwipeDeck } from "@/components/pet-swipe-deck";
import { useAuth } from "@/context/auth";
import {
  addToWishlist,
  chatWithSoni,
  getAccessToken,
  listPets,
} from "@/lib/api";
import {
  AI_COMPANION_NAME,
  buildClarification,
  buildMatchIntro,
  buildPetNarration,
  buildWelcomeMessage,
  buildWrapUp,
  detectPetInterest,
  petMatchesInterest,
  speakText,
  stopSpeaking,
  type DetectedInterest,
} from "@/lib/aiCompanion";
import { getDailyFact } from "@/lib/petFacts";
import { normalizeCompanionPet, type CompanionPet } from "@/lib/petUtils";
import { normalizeLanguage } from "@/lib/soniPhrases";
import { loadSoniMemory, saveSoniMemory, type ChatTurn } from "@/lib/soniMemory";

type Stage = "greeting" | "showing";

export default function AiCompanionScreen() {
  const { userData, isReady } = useAuth();
  const firstName =
    userData?.first_name ||
    userData?.username ||
    "friend";
  const language = useMemo(() => normalizeLanguage(userData?.preferred_language), [userData]);
  const welcome = useMemo(() => buildWelcomeMessage(firstName, language), [firstName, language]);

  const [stage, setStage] = useState<Stage>("greeting");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState(welcome);
  const [interest, setInterest] = useState<DetectedInterest | null>(null);
  const [matches, setMatches] = useState<CompanionPet[]>([]);
  const [index, setIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [likedMessage, setLikedMessage] = useState("");
  const [dailyFact, setDailyFact] = useState("");
  const [aiPets, setAiPets] = useState<CompanionPet[]>([]);
  const [savedAiPetIds, setSavedAiPetIds] = useState<string[]>([]);
  const chatHistory = useRef<ChatTurn[]>([]);
  const hasGreeted = useRef(false);

  useEffect(() => {
    let active = true;

    loadSoniMemory().then((history) => {
      if (active) {
        chatHistory.current = history;
      }
    });

    getDailyFact().then((fact) => {
      if (active) {
        setDailyFact(fact);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const currentPet = matches[index];
  const narration = currentPet && interest ? buildPetNarration(currentPet, interest, language) : "";

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!userData) {
      router.replace("/login");
      return;
    }

    if (userData.role === "rehomer") {
      router.replace("/rehomer-dashboard");
      return;
    }

    if (userData.role === "shelter_admin" || userData.role === "platform_admin") {
      router.replace("/admin-dashboard");
    }
  }, [isReady, userData]);

  useEffect(() => {
    if (hasGreeted.current) {
      return;
    }

    hasGreeted.current = true;
    void speakText(welcome, language);
  }, [welcome, language]);

  useEffect(() => {
    if (stage !== "showing" || !narration) {
      return;
    }

    void speakText(narration, language);
  }, [narration, stage, currentPet?.id, language]);

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
      const wrapUp = buildWrapUp(interest?.label ?? null, language);
      setStatus(wrapUp);
      void speakText(wrapUp, language);
      return;
    }

    setIndex((current) => current + 1);
  };

  const handlePass = () => {
    advanceDeck();
  };

  const handleSaveAiPet = async (pet: CompanionPet) => {
    if (savedAiPetIds.includes(pet.id)) {
      return;
    }

    if (!getAccessToken()) {
      router.push("/login");
      return;
    }

    try {
      await addToWishlist(pet.id);
      setSavedAiPetIds((current) => [...current, pet.id]);
    } catch {
      // Ignore save failures here; the pet's own detail page still lets them retry.
    }
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
    setAiPets([]);

    if (!detected) {
      setIsThinking(true);

      try {
        const response = await chatWithSoni(text, chatHistory.current, language);
        chatHistory.current = [
          ...chatHistory.current,
          { role: "user" as const, text },
          { role: "model" as const, text: response.reply },
        ].slice(-20);
        void saveSoniMemory(chatHistory.current);

        setStatus(response.reply);
        void speakText(response.reply, language);

        const referenced = Array.isArray(response.referenced_pets)
          ? response.referenced_pets.map(normalizeCompanionPet)
          : [];
        setAiPets(referenced);
      } catch {
        const clarification = buildClarification(language);
        setStatus(clarification);
        void speakText(clarification, language);
      } finally {
        setIsThinking(false);
      }

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

      const intro = buildMatchIntro(detected, available.length, language);
      setStatus(intro);

      if (available.length > 0) {
        setStage("showing");
      } else {
        void speakText(intro, language);
      }
    } catch {
      const errorText =
        "I couldn't reach the pets list just now. Check that the backend is running, then tell me again what you'd like to adopt.";
      setStatus(errorText);
      void speakText(errorText, language);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isReady || !userData) {
    return (
      <View style={styles.bootScreen}>
        <ActivityIndicator color="#F18700" size="large" />
      </View>
    );
  }

  return (
    <MobileAppShell subtitle={`Talk to ${AI_COMPANION_NAME} to find a match`} title={AI_COMPANION_NAME}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        style={styles.flex}
      >
        {stage === "greeting" ? (
          <View style={styles.greetingStage}>
            <AiOrb size={220} speaking={!isThinking} />
            <Text style={styles.kicker}>Your adoption guide</Text>
            <Text style={styles.speech}>{isThinking ? "Thinking..." : status}</Text>

            {!isThinking && aiPets.length > 0 ? (
              <View style={styles.aiPetsRow}>
                {aiPets.map((pet) => {
                  const isSaved = savedAiPetIds.includes(pet.id);
                  return (
                    <View key={pet.id} style={styles.aiPetCard}>
                      <Pressable
                        onPress={() => router.push({ pathname: "/pet/[id]", params: { id: pet.id } })}
                        style={styles.aiPetCardMain}
                      >
                        <Image contentFit="cover" source={{ uri: pet.imageUrl }} style={styles.aiPetImage} />
                        <Text numberOfLines={1} style={styles.aiPetName}>
                          {pet.name}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={isSaved}
                        onPress={() => void handleSaveAiPet(pet)}
                        style={styles.aiPetSaveButton}
                      >
                        <MaterialCommunityIcons
                          color={isSaved ? "#F18700" : "#B66900"}
                          name={isSaved ? "heart" : "heart-outline"}
                          size={16}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : currentPet ? (
          <View style={styles.showStage}>
            <View style={styles.miniOrbRow}>
              <AiOrb size={64} speaking />
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

        {stage === "greeting" && dailyFact ? (
          <Pressable onPress={() => void speakText(dailyFact)} style={styles.factCard}>
            <Text style={styles.factKicker}>Fact of the day</Text>
            <Text style={styles.factText}>{dailyFact}</Text>
            <Text style={styles.factHint}>Tap to hear it</Text>
          </Pressable>
        ) : null}

        <View style={styles.shortcutRow}>
          <Pressable onPress={() => router.push("/pets")} style={styles.shortcutLink}>
            <Text style={styles.shortcutLinkText}>Browse pets nearby</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/visualize")} style={styles.shortcutLink}>
            <Text style={styles.shortcutLinkText}>See a pet in your space</Text>
          </Pressable>
        </View>

        <View style={styles.composer}>
          <TextInput
            onChangeText={setInput}
            onSubmitEditing={() => {
              void handleAsk();
            }}
            placeholder="Ask Soni anything about adopting..."
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
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8EE",
  },
  flex: {
    flex: 1,
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
  aiPetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  aiPetCard: {
    width: 92,
    alignItems: "center",
    gap: 6,
  },
  aiPetCardMain: {
    alignItems: "center",
    width: "100%",
  },
  aiPetImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: "#FEE9BF",
    marginBottom: 6,
  },
  aiPetName: {
    color: "#1C1207",
    fontSize: 12,
    fontWeight: "800",
  },
  aiPetSaveButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#FFF1D8",
    alignItems: "center",
    justifyContent: "center",
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
  factCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.2)",
    backgroundColor: "#FFF1D8",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  factKicker: {
    color: "#B66900",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  factText: {
    color: "#3D2500",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  factHint: {
    color: "#B08A58",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  shortcutRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
    paddingBottom: 10,
  },
  shortcutLink: {
    paddingVertical: 4,
  },
  shortcutLinkText: {
    color: "#C16D00",
    fontSize: 13,
    fontWeight: "800",
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 4,
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
