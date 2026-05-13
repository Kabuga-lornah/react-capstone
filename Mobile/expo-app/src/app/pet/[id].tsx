import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import {
  addToWishlist,
  createAdoptionApplication,
  getAccessToken,
  getPetDetail,
  listMyApplications,
  listWishlist,
  startConversation,
  withdrawApplication,
} from "@/lib/api";

type PetDetailRecord = {
  id: string;
  name: string;
  type: string;
  breed: string;
  age: string;
  gender: string;
  location: string;
  city: string;
  description: string;
  imageUrl: string;
  imageUrls: string[];
  rehomerName: string;
  adopted: boolean;
  personality: string[];
  energy_level?: string;
  care_level?: string;
  space_needed?: string;
  good_with_children?: string;
  good_with_other_pets?: string;
  grooming_needs?: string;
  noise_level?: string;
  apartment_friendly?: string;
  is_vaccinated?: boolean;
  is_dewormed?: boolean;
  is_neutered?: boolean;
  owner?: { id?: string | number } | null;
};

const toTitleCase = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const getPetImageUrl = (pet: any) => {
  const mainImage = Array.isArray(pet.images)
    ? pet.images.find((image: any) => image.is_main)
    : null;
  const fallbackImage = Array.isArray(pet.images) ? pet.images[0] : null;

  return (
    pet.imageUrl ||
    pet.image_url ||
    mainImage?.image_url ||
    fallbackImage?.image_url ||
    mainImage?.image ||
    fallbackImage?.image ||
    "https://placehold.co/600x600/FEE9BF/8E5A14?text=Pet"
  );
};

const getPetImageUrls = (pet: any) => {
  const imageUrls = Array.isArray(pet.images)
    ? pet.images
        .map((image: any) => image.image_url || image.image)
        .filter(Boolean)
    : [];

  const hero = getPetImageUrl(pet);
  if (hero && !imageUrls.includes(hero)) {
    imageUrls.unshift(hero);
  }

  return imageUrls.length > 0 ? imageUrls : [hero];
};

const resolvePetType = (pet: any) => {
  const baseType = String(pet.type || pet.species || "other").trim().toLowerCase();
  const customType = String(pet.custom_species || pet.species_label || "").trim();
  const breedFallback = String(pet.breed || "").trim();

  if (customType) {
    return customType;
  }

  if (baseType === "other" && breedFallback) {
    return breedFallback;
  }

  return baseType || "other";
};

const getListedBy = (pet: any) => {
  if (pet.shelter?.name) {
    return pet.shelter.name;
  }

  if (pet.owner?.first_name || pet.owner?.last_name) {
    return `${pet.owner.first_name || ""} ${pet.owner.last_name || ""}`.trim();
  }

  return pet.owner?.username || pet.owner?.email || "Unknown";
};

const formatCompatibilityValue = (value?: string) => {
  if (!value || value === "unknown") {
    return "Unknown";
  }

  if (value === "yes") {
    return "Yes";
  }

  if (value === "no") {
    return "No";
  }

  return toTitleCase(String(value).replaceAll("_", " "));
};

const normalizePet = (pet: any): PetDetailRecord => ({
  id: String(pet.id),
  name: pet.name || "This pet",
  type: resolvePetType(pet),
  breed: pet.breed || "Unknown",
  age: pet.age || "Unknown",
  gender: pet.gender || "Unknown",
  location: pet.location || "",
  city: pet.city || "",
  description: pet.description || "",
  imageUrl: getPetImageUrl(pet),
  imageUrls: getPetImageUrls(pet),
  rehomerName: getListedBy(pet),
  adopted:
    pet.adopted !== undefined
      ? pet.adopted
      : pet.status
        ? pet.status !== "available"
        : false,
  personality: Array.isArray(pet.personality)
    ? pet.personality
    : Array.isArray(pet.personality_traits)
      ? pet.personality_traits.map((trait: string) => toTitleCase(String(trait)))
      : [],
  energy_level: pet.energy_level,
  care_level: pet.care_level,
  space_needed: pet.space_needed,
  good_with_children: pet.good_with_children,
  good_with_other_pets: pet.good_with_other_pets,
  grooming_needs: pet.grooming_needs,
  noise_level: pet.noise_level,
  apartment_friendly: pet.apartment_friendly,
  is_vaccinated: pet.is_vaccinated,
  is_dewormed: pet.is_dewormed,
  is_neutered: pet.is_neutered,
  owner: pet.owner || null,
});

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { userData } = useAuth();

  const [pet, setPet] = useState<PetDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState<{ type: "" | "error" | "success"; text: string }>({
    type: "",
    text: "",
  });
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [activeApplicationId, setActiveApplicationId] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);

  const isLoggedIn = Boolean(getAccessToken());
  const currentUserId = userData?.id ?? null;
  const isOwner =
    pet && currentUserId !== null
      ? String(pet.owner?.id ?? "") === String(currentUserId)
      : false;
  const isRehomerView = userData?.role === "rehomer" || userData?.role === "shelter_admin";
  const canShowAdopterActions = Boolean(pet && !pet.adopted && !isOwner && !isRehomerView);

  const fetchPetBundle = async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      setLoadError("");
      const response = await getPetDetail(id);
      const normalized = normalizePet(response);
      setPet(normalized);
      setActiveImageIndex(0);

      if (isLoggedIn) {
        const [wishlistResponse, applicationsResponse] = await Promise.all([
          listWishlist().catch(() => []),
          listMyApplications().catch(() => []),
        ]);

        const wishlistItems = Array.isArray(wishlistResponse)
          ? wishlistResponse
          : wishlistResponse?.results || [];
        setIsSaved(wishlistItems.some((item: any) => String(item.pet?.id) === String(id)));

        const applications = Array.isArray(applicationsResponse)
          ? applicationsResponse
          : applicationsResponse?.results || [];
        const matchingApplication = applications.find(
          (application: any) =>
            String(application.pet?.id) === String(id) &&
            ["pending", "approved"].includes(application.status),
        );
        setIsInterested(Boolean(matchingApplication));
        setActiveApplicationId(matchingApplication ? String(matchingApplication.id) : "");
      } else {
        setIsSaved(false);
        setIsInterested(false);
        setActiveApplicationId("");
      }
    } catch (error: any) {
      setLoadError(error?.message || "Failed to fetch pet details.");
      setPet(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPetBundle();
  }, [id]);

  const compatibilityRows = useMemo(
    () =>
      pet
        ? [
            ["Energy level", formatCompatibilityValue(pet.energy_level)],
            ["Care level", formatCompatibilityValue(pet.care_level)],
            ["Space needed", formatCompatibilityValue(pet.space_needed)],
            ["Good with children", formatCompatibilityValue(pet.good_with_children)],
            ["Good with other pets", formatCompatibilityValue(pet.good_with_other_pets)],
            ["Apartment friendly", formatCompatibilityValue(pet.apartment_friendly)],
          ]
        : [],
    [pet],
  );

  const handleSave = async () => {
    if (!pet) {
      return;
    }

    if (!isLoggedIn) {
      setMessage({ type: "error", text: "Please log in to save pets to your Pet Pouch." });
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ type: "", text: "" });
      const response = await addToWishlist(pet.id);
      setIsSaved(true);
      setMessage({
        type: "success",
        text:
          response?.created === false
            ? `${pet.name} is already in your Pet Pouch.`
            : `${pet.name} saved to your Pet Pouch.`,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to save this pet.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleInterest = async () => {
    if (!pet) {
      return;
    }

    if (!isLoggedIn) {
      setMessage({ type: "error", text: "Please log in to show interest in this pet." });
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ type: "", text: "" });
      const createdApplication = await createAdoptionApplication({
        pet_id: Number(pet.id),
        message: `I'm interested in ${pet.name} and would love to learn more.`,
      });
      setIsInterested(true);
      setActiveApplicationId(String(createdApplication.id));
      setMessage({
        type: "success",
        text: `Your interest in ${pet.name} has been sent to the rehomer.`,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to send your interest.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleWithdraw = async () => {
    if (!activeApplicationId || !pet) {
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ type: "", text: "" });
      await withdrawApplication(activeApplicationId);
      setIsInterested(false);
      setActiveApplicationId("");
      setMessage({
        type: "success",
        text: `Your interest in ${pet.name} has been canceled.`,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to cancel your interest.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenChat = async () => {
    if (!pet) {
      return;
    }

    if (!isLoggedIn) {
      setMessage({ type: "error", text: "Please log in to message the rehomer." });
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ type: "", text: "" });
      const conversation = await startConversation(pet.id);
      router.push({
        pathname: "/chats/[id]",
        params: { id: String(conversation.id) },
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to open chat with the rehomer.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateBox}>
          <ActivityIndicator color="#F18700" size="small" />
          <Text style={styles.stateText}>Loading pet details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !pet) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{loadError || "Pet not found."}</Text>
          <Pressable onPress={() => fetchPetBundle()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to pets</Text>
        </Pressable>

        <View style={styles.heroCard}>
          <View style={styles.imageFrame}>
            <Image
              contentFit="cover"
              source={{ uri: pet.imageUrls[activeImageIndex] || pet.imageUrl }}
              style={styles.heroImage}
            />
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {pet.adopted ? "Adopted" : "Available"}
              </Text>
            </View>
          </View>

          {pet.imageUrls.length > 1 ? (
            <View style={styles.imageDots}>
              {pet.imageUrls.map((imageUrl, index) => (
                <Pressable
                  key={`${imageUrl}-${index}`}
                  onPress={() => setActiveImageIndex(index)}
                  style={[
                    styles.imageDot,
                    index === activeImageIndex ? styles.imageDotActive : null,
                  ]}
                />
              ))}
            </View>
          ) : null}

          <Text style={styles.petType}>{toTitleCase(pet.type)}</Text>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.listedBy}>Listed by {pet.rehomerName}</Text>

          <View style={styles.factGrid}>
            {[
              ["Breed", pet.breed],
              ["Age", pet.age],
              ["Gender", toTitleCase(pet.gender)],
              ["Location", pet.location || pet.city || "Unknown"],
            ].map(([label, value]) => (
              <View key={label} style={styles.factCard}>
                <Text style={styles.factLabel}>{label}</Text>
                <Text style={styles.factValue}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.healthRow}>
            <View style={styles.healthPill}>
              <Text style={styles.healthLabel}>Vaccination</Text>
              <Text style={styles.healthValue}>{pet.is_vaccinated ? "Confirmed" : "Ask rehomer"}</Text>
            </View>
            <View style={styles.healthPill}>
              <Text style={styles.healthLabel}>Deworming</Text>
              <Text style={styles.healthValue}>{pet.is_dewormed ? "Confirmed" : "Ask rehomer"}</Text>
            </View>
            <View style={styles.healthPill}>
              <Text style={styles.healthLabel}>Neutered</Text>
              <Text style={styles.healthValue}>{pet.is_neutered ? "Yes" : "Not shared"}</Text>
            </View>
          </View>
        </View>

        {message.text ? (
          <View
            style={[
              styles.messageBox,
              message.type === "success" ? styles.messageSuccess : styles.messageError,
            ]}
          >
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ) : null}

        {pet.description ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>About</Text>
            <Text style={styles.sectionTitle}>Meet {pet.name}</Text>
            <Text style={styles.bodyCopy}>{pet.description}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Personality</Text>
          <Text style={styles.sectionTitle}>What {pet.name} is like</Text>
          <View style={styles.traitsWrap}>
            {(pet.personality.length > 0 ? pet.personality : ["Still getting to know this pet"]).map(
              (trait, index) => (
                <View key={`${trait}-${index}`} style={styles.traitChip}>
                  <Text style={styles.traitChipText}>{trait}</Text>
                </View>
              ),
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Care</Text>
          <Text style={styles.sectionTitle}>Care and compatibility</Text>
          <View style={styles.compatibilityGrid}>
            {compatibilityRows.map(([label, value]) => (
              <View key={label} style={styles.compatibilityRow}>
                <Text style={styles.compatibilityLabel}>{label}</Text>
                <Text style={styles.compatibilityValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {canShowAdopterActions ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>Next step</Text>
            <Text style={styles.sectionTitle}>
              {isInterested ? `Your interest in ${pet.name} is active` : `Take your time with ${pet.name}`}
            </Text>
            <Text style={styles.bodyCopy}>
              {isInterested
                ? "You can keep chatting with the rehomer, or cancel your interest if your plans change."
                : "Save this pet, chat with the rehomer, or send your interest when you are ready."}
            </Text>

            <View style={styles.actionStack}>
              <Pressable
                disabled={isBusy}
                onPress={handleOpenChat}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  {isBusy ? "Please wait..." : "Chat with rehomer"}
                </Text>
              </Pressable>

              {!isInterested ? (
                <Pressable
                  disabled={isBusy}
                  onPress={handleInterest}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>I&apos;m interested</Text>
                </Pressable>
              ) : (
                <Pressable
                  disabled={isBusy}
                  onPress={handleWithdraw}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancel interest</Text>
                </Pressable>
              )}

              {!isSaved ? (
                <Pressable
                  disabled={isBusy}
                  onPress={handleSave}
                  style={styles.ghostButton}
                >
                  <Text style={styles.ghostButtonText}>Save to Pet Pouch</Text>
                </Pressable>
              ) : (
                <View style={styles.savedPill}>
                  <Text style={styles.savedPillText}>{pet.name} is already in your Pet Pouch</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  backButtonText: {
    color: "#B66900",
    fontSize: 13,
    fontWeight: "800",
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.16)",
    backgroundColor: "rgba(255,255,255,0.86)",
    padding: 16,
    marginBottom: 14,
  },
  imageFrame: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FEE9BF",
    height: 280,
    marginBottom: 12,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  imageDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(180,120,40,0.24)",
  },
  imageDotActive: {
    width: 24,
    backgroundColor: "#F18700",
  },
  petType: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  petName: {
    color: "#1C1207",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 6,
  },
  listedBy: {
    color: "#7A5C35",
    fontSize: 14,
    marginBottom: 14,
  },
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  factCard: {
    width: "47%",
    borderRadius: 18,
    backgroundColor: "#FFF7E8",
    padding: 12,
  },
  factLabel: {
    color: "#9A7444",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  factValue: {
    color: "#2A1500",
    fontSize: 14,
    fontWeight: "700",
  },
  healthRow: {
    gap: 8,
  },
  healthPill: {
    borderRadius: 16,
    backgroundColor: "#FFFBEF",
    padding: 12,
  },
  healthLabel: {
    color: "#B66900",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  healthValue: {
    color: "#2A1500",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.82)",
    padding: 18,
    marginBottom: 14,
  },
  sectionEyebrow: {
    color: "#C07000",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#1C1207",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },
  bodyCopy: {
    color: "#5F4321",
    fontSize: 14,
    lineHeight: 22,
  },
  traitsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  traitChip: {
    borderRadius: 999,
    backgroundColor: "#FFF0D5",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  traitChipText: {
    color: "#8A5200",
    fontSize: 12,
    fontWeight: "700",
  },
  compatibilityGrid: {
    gap: 10,
  },
  compatibilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,154,35,0.1)",
    paddingBottom: 10,
  },
  compatibilityLabel: {
    color: "#7A5C35",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  compatibilityValue: {
    color: "#2A1500",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    flex: 1,
  },
  actionStack: {
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
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
  },
  secondaryButtonText: {
    color: "#B66900",
    fontSize: 14,
    fontWeight: "800",
  },
  ghostButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.28)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: {
    color: "#8A5200",
    fontSize: 14,
    fontWeight: "800",
  },
  savedPill: {
    borderRadius: 16,
    backgroundColor: "#FFF7E8",
    padding: 14,
  },
  savedPillText: {
    color: "#8A5200",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  stateBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  stateText: {
    color: "#7A5C35",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  messageBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  messageSuccess: {
    backgroundColor: "#FFF5DF",
    borderColor: "#F3C981",
  },
  messageError: {
    backgroundColor: "#FFF3E0",
    borderColor: "#F6C87A",
  },
  messageText: {
    color: "#7A4800",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
});
