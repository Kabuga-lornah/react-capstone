import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import { MobileAppShell } from "@/components/mobile-app-shell";
import { listPets } from "@/lib/api";
import {
  buildUserPreference,
  quizQuestions,
  scorePetMatch,
  type QuizAnswers,
  type ScoredPet,
} from "@/lib/petQuiz";
import { normalizeCompanionPet, toTitleCase, type CompanionPet } from "@/lib/petUtils";

type Stage = "intro" | "question" | "loading" | "results" | "empty" | "error";

export default function QuizScreen() {
  const [stage, setStage] = useState<Stage>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [results, setResults] = useState<ScoredPet[]>([]);
  const [errorText, setErrorText] = useState("");

  const currentQuestion = quizQuestions[questionIndex];
  const selectedAnswer = answers[currentQuestion?.id];

  const progressPercentage = useMemo(
    () => Math.round(((questionIndex + 1) / quizQuestions.length) * 100),
    [questionIndex],
  );

  const finishQuiz = async (finalAnswers: QuizAnswers) => {
    setStage("loading");
    setErrorText("");

    try {
      const response = await listPets();
      const petsData = Array.isArray(response) ? response : response?.results || [];
      const availablePets: CompanionPet[] = petsData
        .map(normalizeCompanionPet)
        .filter((pet: CompanionPet) => pet.status.toLowerCase() === "available");

      if (availablePets.length === 0) {
        setStage("empty");
        return;
      }

      const preference = buildUserPreference(finalAnswers);
      const scoredPets = availablePets
        .map((pet) => scorePetMatch(pet, preference))
        .sort((left, right) => right.matchPercentage - left.matchPercentage)
        .slice(0, 3);

      setResults(scoredPets);
      setStage("results");
    } catch (error: any) {
      setErrorText(error?.message || "Could not load pets to match against. Please try again.");
      setStage("error");
    }
  };

  const selectOption = (label: string) => {
    const nextAnswers = { ...answers, [currentQuestion.id]: label };
    setAnswers(nextAnswers);

    if (questionIndex === quizQuestions.length - 1) {
      void finishQuiz(nextAnswers);
      return;
    }

    setQuestionIndex((current) => current + 1);
  };

  const goBack = () => {
    if (questionIndex === 0) {
      setStage("intro");
      return;
    }

    setQuestionIndex((current) => current - 1);
  };

  const restart = () => {
    setAnswers({});
    setQuestionIndex(0);
    setResults([]);
    setErrorText("");
    setStage("intro");
  };

  return (
    <MobileAppShell
      scroll={stage === "results"}
      subtitle="Answer a few questions and see your best pet matches"
      title="Pet match quiz"
    >
      {stage === "intro" ? (
        <View style={styles.center}>
          <Text style={styles.introEmoji}>🐾</Text>
          <Text style={styles.introTitle}>Find your best adoption match</Text>
          <Text style={styles.introText}>
            {quizQuestions.length} quick questions about your lifestyle, then we'll show your top 3
            matches from available pets.
          </Text>
          <Pressable onPress={() => setStage("question")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start the quiz</Text>
          </Pressable>
        </View>
      ) : null}

      {stage === "question" ? (
        <View style={styles.questionWrap}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              Question {questionIndex + 1} of {quizQuestions.length}
            </Text>
            <Text style={styles.progressLabel}>{progressPercentage}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>

          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          <View style={styles.optionsWrap}>
            {currentQuestion.options.map((option) => (
              <Pressable
                key={option.label}
                onPress={() => selectOption(option.label)}
                style={[
                  styles.optionCard,
                  selectedAnswer === option.label ? styles.optionCardSelected : null,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedAnswer === option.label ? styles.optionTextSelected : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={goBack} style={styles.backLink}>
            <Text style={styles.backLinkText}>Back</Text>
          </Pressable>
        </View>
      ) : null}

      {stage === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color="#F18700" size="large" />
          <Text style={styles.introText}>Finding your best matches...</Text>
        </View>
      ) : null}

      {stage === "empty" ? (
        <View style={styles.center}>
          <Text style={styles.introText}>
            No pets are available to match right now. Check back soon.
          </Text>
          <Pressable onPress={() => router.push("/pets")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Browse pets</Text>
          </Pressable>
        </View>
      ) : null}

      {stage === "error" ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorText}</Text>
          <Pressable onPress={restart} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {stage === "results" ? (
        <View style={styles.resultsWrap}>
          <Text style={styles.resultsTitle}>Your best matches</Text>
          <Text style={styles.introText}>
            These balance shared personality traits with day-to-day lifestyle fit.
          </Text>

          {results.map((pet, position) => (
            <View key={pet.id} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Image contentFit="cover" source={{ uri: pet.imageUrl }} style={styles.resultImage} />
                <View style={styles.resultHeaderCopy}>
                  <Text style={styles.resultRank}>Match #{position + 1}</Text>
                  <Text style={styles.resultName}>{pet.name}</Text>
                  <Text style={styles.resultMeta}>
                    {[pet.breed || toTitleCase(pet.typeLabel), pet.age].filter(Boolean).join(" • ")}
                  </Text>
                </View>
                <Text style={styles.resultPercent}>{pet.matchPercentage}%</Text>
              </View>

              {pet.reasons.length > 0 ? (
                <View style={styles.resultSection}>
                  <Text style={styles.resultSectionTitle}>Why this pet may suit you</Text>
                  {pet.reasons.map((reason, reasonIndex) => (
                    <Text key={`${pet.id}-reason-${reasonIndex}`} style={styles.resultLine}>
                      {"•"} {reason}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Care notes to ask about</Text>
                {pet.careNotes.map((note, noteIndex) => (
                  <Text key={`${pet.id}-note-${noteIndex}`} style={styles.resultLine}>
                    {"•"} {note}
                  </Text>
                ))}
              </View>

              <Pressable
                onPress={() =>
                  router.push({ pathname: "/pet/[id]", params: { id: pet.id } })
                }
                style={styles.viewPetButton}
              >
                <Text style={styles.viewPetButtonText}>View {pet.name}'s profile</Text>
              </Pressable>
            </View>
          ))}

          <Pressable onPress={restart} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Retake the quiz</Text>
          </Pressable>
        </View>
      ) : null}
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 12,
  },
  introEmoji: {
    fontSize: 48,
  },
  introTitle: {
    color: "#1C1207",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  introText: {
    color: "#7A5C35",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 52,
    minWidth: 200,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#FFF1D8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#B66900",
    fontSize: 14,
    fontWeight: "800",
  },
  questionWrap: {
    flex: 1,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    color: "#9A7444",
    fontSize: 12,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#FFE7C2",
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#F18700",
  },
  questionText: {
    color: "#1C1207",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 27,
    marginBottom: 18,
  },
  optionsWrap: {
    gap: 12,
  },
  optionCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.22)",
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  optionCardSelected: {
    borderColor: "#F18700",
    backgroundColor: "#FFF1D8",
  },
  optionText: {
    color: "#3D2500",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  optionTextSelected: {
    fontWeight: "800",
  },
  backLink: {
    alignSelf: "flex-start",
    marginTop: 16,
  },
  backLinkText: {
    color: "#B66900",
    fontSize: 13,
    fontWeight: "800",
  },
  resultsWrap: {
    gap: 14,
    paddingBottom: 20,
  },
  resultsTitle: {
    color: "#1C1207",
    fontSize: 24,
    fontWeight: "900",
  },
  resultCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.16)",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 16,
    gap: 12,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resultImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#FEE9BF",
  },
  resultHeaderCopy: {
    flex: 1,
  },
  resultRank: {
    color: "#C16D00",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultName: {
    color: "#1C1207",
    fontSize: 18,
    fontWeight: "900",
  },
  resultMeta: {
    color: "#7A5C35",
    fontSize: 12,
    fontWeight: "600",
  },
  resultPercent: {
    color: "#F18700",
    fontSize: 24,
    fontWeight: "900",
  },
  resultSection: {
    gap: 4,
  },
  resultSectionTitle: {
    color: "#8A5200",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  resultLine: {
    color: "#5F4321",
    fontSize: 13,
    lineHeight: 19,
  },
  viewPetButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
  },
  viewPetButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
