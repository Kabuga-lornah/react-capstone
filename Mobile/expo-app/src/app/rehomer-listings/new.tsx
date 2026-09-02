import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ChipMultiSelect, PillGroup } from "@/components/form-controls";
import { PhotoPicker } from "@/components/photo-picker";
import { useAuth } from "@/context/auth";
import { createPet } from "@/lib/api";
import {
  buildPetCreatePayload,
  createEmptyPetForm,
  CARE_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  LEVEL_OPTIONS,
  PERSONALITY_TRAIT_OPTIONS,
  SPACE_OPTIONS,
  SPECIES_OPTIONS,
  YES_NO_OPTIONS,
  type PetFormData,
} from "@/lib/petFormOptions";

const TOTAL_PAGES = 6;

export default function NewPetListingScreen() {
  const { userData } = useAuth();
  const [form, setForm] = useState<PetFormData>(createEmptyPetForm());
  const [pageIndex, setPageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 260 });
  }, [pageIndex, progress]);

  const pageStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: (1 - progress.value) * 26 },
      { rotateY: `${(1 - progress.value) * -6}deg` },
    ],
  }));

  const update = <K extends keyof PetFormData>(key: K, value: PetFormData[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const isVerifiedRehomer = userData?.rehomer_verification_status === "verified";

  const validatePage = (): string => {
    if (pageIndex === 0) {
      if (!form.name.trim()) return "Give your pet a name.";
      if (form.species === "other" && !form.customSpecies.trim()) {
        return "Tell us what kind of pet this is.";
      }
    }

    if (pageIndex === 4) {
      if (form.isVaccinated && !form.vaccinationProofUrl) return "Add proof of vaccination.";
      if (form.isDewormed && !form.dewormingProofUrl) return "Add proof of deworming.";
      if (form.isNeutered && !form.neuteringProofUrl) return "Add proof of spay/neuter.";
    }

    if (pageIndex === 5) {
      if (!form.imageUrl) return "Add a main photo before submitting.";
    }

    return "";
  };

  const goNext = () => {
    const validationError = validatePage();

    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setErrorText("");

    if (pageIndex === TOTAL_PAGES - 1) {
      void handleSubmit();
      return;
    }

    setPageIndex((current) => Math.min(current + 1, TOTAL_PAGES - 1));
  };

  const goBack = () => {
    setErrorText("");

    if (pageIndex === 0) {
      router.back();
      return;
    }

    setPageIndex((current) => current - 1);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorText("");
      const pet = await createPet(buildPetCreatePayload(form));
      Alert.alert("Listed!", `${form.name} is now live for adopters to see.`, [
        {
          text: "OK",
          onPress: () => router.replace({ pathname: "/pet/[id]", params: { id: pet.id } }),
        },
      ]);
    } catch (error: any) {
      setErrorText(error?.message || "Could not list this pet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVerifiedRehomer) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.gateBox}>
          <MaterialCommunityIcons color="#D97706" name="shield-check-outline" size={40} />
          <Text style={styles.gateTitle}>Verification needed</Text>
          <Text style={styles.gateText}>
            {userData?.rehomer_verification_status === "pending"
              ? "Your rehomer profile is under review. You can list pets once it's approved."
              : "Finish your rehomer verification before listing a pet."}
          </Text>
          <Pressable onPress={() => router.push("/rehomer-profile")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go to my profile</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <MaterialCommunityIcons color="#B66900" name="chevron-left" size={20} />
            <Text style={styles.backButtonText}>{pageIndex === 0 ? "Cancel" : "Back a page"}</Text>
          </Pressable>
          <Text style={styles.pageCounter}>
            Page {pageIndex + 1} of {TOTAL_PAGES}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((pageIndex + 1) / TOTAL_PAGES) * 100}%` },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.book, pageStyle]}>
            <View style={styles.spine} />
            <View style={styles.pageContent}>{renderPage(pageIndex, form, update)}</View>
          </Animated.View>

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            disabled={isSubmitting}
            onPress={goNext}
            style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {pageIndex === TOTAL_PAGES - 1 ? "List this pet" : "Turn the page"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function renderPage(
  pageIndex: number,
  form: PetFormData,
  update: <K extends keyof PetFormData>(key: K, value: PetFormData[K]) => void,
) {
  if (pageIndex === 0) {
    return (
      <View style={styles.fieldStack}>
        <Text style={styles.pageTitle}>Who are we listing?</Text>
        <FieldLabel text="What kind of pet?" />
        <View style={styles.speciesRow}>
          {SPECIES_OPTIONS.map((option) => {
            const isActive = form.species === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => update("species", option.value)}
                style={[styles.speciesCard, isActive ? styles.speciesCardActive : null]}
              >
                <Text style={styles.speciesEmoji}>{option.emoji}</Text>
                <Text style={[styles.speciesLabel, isActive ? styles.speciesLabelActive : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {form.species === "other" ? (
          <>
            <FieldLabel text="What kind of pet is it?" />
            <TextInput
              onChangeText={(value) => update("customSpecies", value)}
              placeholder="e.g. Tortoise, snake, duck..."
              placeholderTextColor="#B08A58"
              style={styles.input}
              value={form.customSpecies}
            />
          </>
        ) : null}

        <FieldLabel text="Name" />
        <TextInput
          onChangeText={(value) => update("name", value)}
          placeholder="What's their name?"
          placeholderTextColor="#B08A58"
          style={styles.input}
          value={form.name}
        />

        <FieldLabel text="Breed (optional)" />
        <TextInput
          onChangeText={(value) => update("breed", value)}
          placeholder="e.g. Labrador mix"
          placeholderTextColor="#B08A58"
          style={styles.input}
          value={form.breed}
        />

        <FieldLabel text="Age" />
        <TextInput
          onChangeText={(value) => update("age", value)}
          placeholder="e.g. 2 years"
          placeholderTextColor="#B08A58"
          style={styles.input}
          value={form.age}
        />

        <FieldLabel text="Gender" />
        <PillGroup
          options={GENDER_OPTIONS.map((label) => ({ value: label, label }))}
          onChange={(value) => update("gender", value)}
          value={form.gender}
        />
      </View>
    );
  }

  if (pageIndex === 1) {
    return (
      <View style={styles.fieldStack}>
        <Text style={styles.pageTitle}>Where are they?</Text>
        <FieldLabel text="City" />
        <TextInput
          onChangeText={(value) => update("city", value)}
          placeholder="e.g. Nairobi"
          placeholderTextColor="#B08A58"
          style={styles.input}
          value={form.city}
        />
        <FieldLabel text="State / Region (optional)" />
        <TextInput
          onChangeText={(value) => update("state", value)}
          placeholder="e.g. Nairobi County"
          placeholderTextColor="#B08A58"
          style={styles.input}
          value={form.state}
        />
        <FieldLabel text="Country" />
        <TextInput
          onChangeText={(value) => update("country", value)}
          placeholder="e.g. Kenya"
          placeholderTextColor="#B08A58"
          style={styles.input}
          value={form.country}
        />
        <FieldLabel text="More specific location (optional)" />
        <TextInput
          onChangeText={(value) => update("location", value)}
          placeholder="e.g. Near Westlands"
          placeholderTextColor="#B08A58"
          style={styles.input}
          value={form.location}
        />
        <FieldLabel text="Adoption fee" />
        <TextInput
          keyboardType="numeric"
          onChangeText={(value) => update("adoptionFee", value)}
          placeholder="0"
          placeholderTextColor="#B08A58"
          style={styles.input}
          value={form.adoptionFee}
        />
      </View>
    );
  }

  if (pageIndex === 2) {
    return (
      <View style={styles.fieldStack}>
        <Text style={styles.pageTitle}>Personality &amp; care</Text>
        <FieldLabel text="Personality traits" />
        <ChipMultiSelect
          onChange={(value) => update("personalityTraits", value)}
          options={PERSONALITY_TRAIT_OPTIONS}
          value={form.personalityTraits}
        />
        <FieldLabel text="Energy level" />
        <PillGroup onChange={(value) => update("energyLevel", value)} options={LEVEL_OPTIONS} value={form.energyLevel} />
        <FieldLabel text="Care level needed" />
        <PillGroup
          onChange={(value) => update("careLevel", value)}
          options={CARE_LEVEL_OPTIONS}
          value={form.careLevel}
        />
        <FieldLabel text="Space needed" />
        <PillGroup onChange={(value) => update("spaceNeeded", value)} options={SPACE_OPTIONS} value={form.spaceNeeded} />
        <FieldLabel text="Grooming needs" />
        <PillGroup
          onChange={(value) => update("groomingNeeds", value)}
          options={LEVEL_OPTIONS}
          value={form.groomingNeeds}
        />
        <FieldLabel text="Noise level" />
        <PillGroup onChange={(value) => update("noiseLevel", value)} options={LEVEL_OPTIONS} value={form.noiseLevel} />
      </View>
    );
  }

  if (pageIndex === 3) {
    return (
      <View style={styles.fieldStack}>
        <Text style={styles.pageTitle}>Compatibility</Text>
        <FieldLabel text="Good with children?" />
        <PillGroup
          onChange={(value) => update("goodWithChildren", value)}
          options={YES_NO_OPTIONS}
          value={form.goodWithChildren}
        />
        <FieldLabel text="Good with other pets?" />
        <PillGroup
          onChange={(value) => update("goodWithOtherPets", value)}
          options={YES_NO_OPTIONS}
          value={form.goodWithOtherPets}
        />
        <FieldLabel text="Apartment friendly?" />
        <PillGroup
          onChange={(value) => update("apartmentFriendly", value)}
          options={YES_NO_OPTIONS}
          value={form.apartmentFriendly}
        />
      </View>
    );
  }

  if (pageIndex === 4) {
    return (
      <View style={styles.fieldStack}>
        <Text style={styles.pageTitle}>Health record</Text>

        <HealthToggle
          label="Vaccinated"
          onProofChange={(url) => update("vaccinationProofUrl", url)}
          onToggle={(value) => update("isVaccinated", value)}
          proofUrl={form.vaccinationProofUrl}
          value={form.isVaccinated}
        />
        <HealthToggle
          label="Dewormed"
          onProofChange={(url) => update("dewormingProofUrl", url)}
          onToggle={(value) => update("isDewormed", value)}
          proofUrl={form.dewormingProofUrl}
          value={form.isDewormed}
        />
        <HealthToggle
          label="Spayed / Neutered"
          onProofChange={(url) => update("neuteringProofUrl", url)}
          onToggle={(value) => update("isNeutered", value)}
          proofUrl={form.neuteringProofUrl}
          value={form.isNeutered}
        />
      </View>
    );
  }

  return (
    <View style={styles.fieldStack}>
      <Text style={styles.pageTitle}>Photos &amp; story</Text>
      <FieldLabel text="Tell adopters about them" />
      <TextInput
        multiline
        numberOfLines={5}
        onChangeText={(value) => update("description", value)}
        placeholder="Share their personality, routine, and what kind of home would suit them..."
        placeholderTextColor="#B08A58"
        style={[styles.input, styles.textArea]}
        value={form.description}
      />
      <FieldLabel text="Main photo" />
      <PhotoPicker imageUrl={form.imageUrl} label="main photo" onChange={(url) => update("imageUrl", url)} />
      <FieldLabel text="Extra photo (optional)" />
      <PhotoPicker
        imageUrl={form.additionalImageUrl}
        label="extra photo"
        onChange={(url) => update("additionalImageUrl", url)}
      />
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function HealthToggle({
  label,
  value,
  onToggle,
  proofUrl,
  onProofChange,
}: {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  proofUrl: string;
  onProofChange: (url: string) => void;
}) {
  return (
    <View style={styles.healthRow}>
      <View style={styles.healthHeader}>
        <Text style={styles.healthLabel}>{label}</Text>
        <Switch
          onValueChange={onToggle}
          thumbColor="#FFFFFF"
          trackColor={{ false: "#E4C89F", true: "#F18700" }}
          value={value}
        />
      </View>
      {value ? (
        <PhotoPicker imageUrl={proofUrl} label={`${label.toLowerCase()} proof`} onChange={onProofChange} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    color: "#B66900",
    fontSize: 13,
    fontWeight: "800",
  },
  pageCounter: {
    color: "#9A7444",
    fontSize: 12,
    fontWeight: "800",
  },
  progressTrack: {
    height: 6,
    marginHorizontal: 18,
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: "#FFE7C2",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#F18700",
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 20,
  },
  book: {
    flexDirection: "row",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#8A4B00",
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    overflow: "hidden",
  },
  spine: {
    width: 8,
    backgroundColor: "#F18700",
  },
  pageContent: {
    flex: 1,
    padding: 20,
  },
  pageTitle: {
    color: "#1C1207",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },
  fieldStack: {
    gap: 10,
  },
  fieldLabel: {
    color: "#9A7444",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 2,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.24)",
    backgroundColor: "#FFFBF3",
    color: "#2A1500",
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  speciesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  speciesCard: {
    width: 84,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.24)",
    backgroundColor: "#FFFBF3",
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
  },
  speciesCardActive: {
    backgroundColor: "#FFF1D8",
    borderColor: "#F18700",
  },
  speciesEmoji: {
    fontSize: 26,
  },
  speciesLabel: {
    color: "#8A5200",
    fontSize: 11,
    fontWeight: "800",
  },
  speciesLabelActive: {
    color: "#B66900",
  },
  healthRow: {
    borderRadius: 16,
    backgroundColor: "#FFFBF3",
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.18)",
    padding: 14,
    gap: 10,
    marginBottom: 6,
  },
  healthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  healthLabel: {
    color: "#3D2500",
    fontSize: 14,
    fontWeight: "800",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },
  footer: {
    padding: 18,
    paddingTop: 8,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  gateBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  gateTitle: {
    color: "#1C1207",
    fontSize: 20,
    fontWeight: "900",
  },
  gateText: {
    color: "#7A5C35",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
