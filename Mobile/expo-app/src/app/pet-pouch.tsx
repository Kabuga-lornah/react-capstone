import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import { MobileAppShell } from "@/components/mobile-app-shell";
import {
  getAccessToken,
  listConversations,
  listMyApplications,
  listWishlist,
  removeFromWishlist,
} from "@/lib/api";
import { useAuth } from "@/context/auth";

type WishlistItemRecord = {
  id: string;
  petId: string;
  name: string;
  breed: string;
  imageUrl: string;
};

type ApplicationProgressRecord = {
  petId: string;
  status: string;
  visitStatus: string;
};

type ConversationProgressRecord = {
  petId: string;
  unreadCount: number;
  lastMessageIsMine: boolean;
};

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
    "https://placehold.co/600x600/FEE9BF/8E5A14?text=Pouch"
  );
};

const normalizeWishlistItem = (wishlistItem: any): WishlistItemRecord => {
  const pet = wishlistItem?.pet || {};

  return {
    id: String(wishlistItem.id),
    petId: pet.id ? String(pet.id) : "",
    name: pet.name || "Unnamed Pet",
    breed: pet.breed || "Unknown breed",
    imageUrl: getPetImageUrl(pet),
  };
};

const getPetProgress = (
  petId: string,
  applications: ApplicationProgressRecord[],
  conversations: ConversationProgressRecord[],
) => {
  const application = applications.find((item) => item.petId === petId);
  const conversation = conversations.find((item) => item.petId === petId);

  if (application?.status === "approved") {
    return { label: "Approved", tone: "#1E7B48", bg: "#EDF9EF" };
  }

  if (application?.status === "rejected") {
    return { label: "Request not approved", tone: "#C53030", bg: "#FFF1F1" };
  }

  if (application?.status === "withdrawn") {
    return { label: "Interest canceled", tone: "#7A6B57", bg: "#F4F1EB" };
  }

  if (application?.visitStatus === "agreed") {
    return { label: "Visit agreed", tone: "#1E7B48", bg: "#EDF9EF" };
  }

  if ((conversation?.unreadCount || 0) > 0) {
    return { label: "Rehomer replied", tone: "#1D4ED8", bg: "#EEF4FF" };
  }

  if (application?.visitStatus === "proposed") {
    return { label: "Visit plan saved", tone: "#C16F00", bg: "#FFF4DF" };
  }

  if (conversation?.lastMessageIsMine) {
    return { label: "Waiting for reply", tone: "#8B7049", bg: "#FFF8EF" };
  }

  if (conversation) {
    return { label: "Chat started", tone: "#1D4ED8", bg: "#EEF4FF" };
  }

  if (application) {
    return { label: "Requested", tone: "#C16F00", bg: "#FFF4DF" };
  }

  return { label: "Saved for later", tone: "#8B7049", bg: "#FFF8EF" };
};

export default function PetPouchScreen() {
  const { userData } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItemRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationProgressRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [removingId, setRemovingId] = useState("");

  const hasSession = Boolean(getAccessToken());
  const isAdopter = userData?.role === "adopter";

  const fetchPetPouchData = async (isRefreshing = false) => {
    if (!getAccessToken()) {
      setWishlistItems([]);
      setApplications([]);
      setConversations([]);
      setErrorMessage("");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (userData?.role && userData.role !== "adopter") {
      setWishlistItems([]);
      setApplications([]);
      setConversations([]);
      setErrorMessage("");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const [wishlistResponse, applicationsResponse, conversationsResponse] = await Promise.all([
        listWishlist(),
        listMyApplications().catch(() => []),
        listConversations().catch(() => []),
      ]);

      const wishlistData = Array.isArray(wishlistResponse) ? wishlistResponse : wishlistResponse?.results || [];
      const applicationsData = Array.isArray(applicationsResponse)
        ? applicationsResponse
        : applicationsResponse?.results || [];
      const conversationsData = Array.isArray(conversationsResponse)
        ? conversationsResponse
        : conversationsResponse?.results || [];

      setWishlistItems(wishlistData.map(normalizeWishlistItem));
      setApplications(
        applicationsData.map((application: any) => ({
          petId: application?.pet?.id ? String(application.pet.id) : "",
          status: application?.status || "pending",
          visitStatus: application?.visit_status || "not_started",
        })),
      );
      setConversations(
        conversationsData.map((conversation: any) => ({
          petId: conversation?.pet?.id ? String(conversation.pet.id) : "",
          unreadCount: Number(conversation?.unread_count || 0),
          lastMessageIsMine: Boolean(conversation?.last_message?.is_mine),
        })),
      );
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to load your Pet Pouch.");
      setWishlistItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPetPouchData();
  }, [userData?.role]);

  const subtitle = useMemo(() => {
    if (!hasSession) {
      return "Log in again to reopen your saved pets.";
    }

    if (!isAdopter) {
      return "Pet Pouch is currently just for adopters saving pets they may revisit.";
    }

    if (wishlistItems.length > 0) {
      return `${wishlistItems.length} saved pet${wishlistItems.length === 1 ? "" : "s"} waiting for you.`;
    }

    return "Your saved pets, request progress, and chat signals all stay together here.";
  }, [hasSession, isAdopter, wishlistItems.length]);

  const handleRemoveSavedPet = async (wishlistId: string) => {
    try {
      setRemovingId(wishlistId);
      setErrorMessage("");
      await removeFromWishlist(wishlistId);
      setWishlistItems((current) => current.filter((item) => item.id !== wishlistId));
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to remove this pet from your pouch.");
    } finally {
      setRemovingId("");
    }
  };

  return (
    <MobileAppShell title="Pet Pouch" subtitle={subtitle}>
      {!hasSession ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Your session expired on this device.</Text>
          <Text style={styles.stateSubtext}>
            Log in again and your saved pets will be waiting here.
          </Text>
          <Pressable onPress={() => router.replace("/")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to login</Text>
          </Pressable>
        </View>
      ) : !isAdopter ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Only adopters can open Pet Pouch right now.</Text>
          <Text style={styles.stateSubtext}>
            Rehomers and admins can keep working from chats, notifications, and their own dashboards.
          </Text>
          <Pressable onPress={() => router.replace("/pets")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Browse pets</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={wishlistItems}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              onRefresh={() => fetchPetPouchData(true)}
              refreshing={refreshing}
              tintColor="#F18700"
            />
          }
          renderItem={({ item }) => {
            const progress = getPetProgress(item.petId, applications, conversations);

            return (
              <View style={styles.card}>
                <Pressable
                  onPress={() => router.push(`/pet/${item.petId}` as never)}
                  style={styles.cardMain}
                >
                  <Image contentFit="cover" source={{ uri: item.imageUrl }} style={styles.image} />

                  <View style={styles.meta}>
                    <Text numberOfLines={1} style={styles.name}>
                      {item.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.breed}>
                      {item.breed}
                    </Text>
                    <View style={[styles.progressPill, { backgroundColor: progress.bg }]}>
                      <Text style={[styles.progressPillText, { color: progress.tone }]}>
                        {progress.label}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  disabled={removingId === item.id}
                  onPress={() => handleRemoveSavedPet(item.id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>
                    {removingId === item.id ? "..." : "Remove"}
                  </Text>
                </Pressable>
              </View>
            );
          }}
          ListHeaderComponent={
            <View style={styles.headerCard}>
              <Text style={styles.headerEyebrow}>Saved pets</Text>
              <Text style={styles.headerTitle}>Keep your shortlist close</Text>
              <Text style={styles.headerCopy}>
                Save pets you want to revisit, then track whether you have requested, chatted, or agreed a visit.
              </Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{wishlistItems.length}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color="#F18700" size="small" />
                <Text style={styles.stateText}>Loading your Pet Pouch...</Text>
              </View>
            ) : errorMessage ? (
              <View style={styles.stateBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <Pressable onPress={() => fetchPetPouchData()} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>No saved pets yet.</Text>
                <Text style={styles.stateSubtext}>
                  Tap the save action on a pet detail page and it will appear here.
                </Text>
                <Pressable onPress={() => router.replace("/pets")} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Browse pets</Text>
                </Pressable>
              </View>
            )
          }
          ListFooterComponent={errorMessage && wishlistItems.length > 0 ? (
            <View style={styles.inlineError}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        />
      )}
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 28,
    gap: 12,
  },
  headerCard: {
    position: "relative",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 18,
    marginBottom: 14,
  },
  headerEyebrow: {
    color: "#D97100",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    color: "#2C1700",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  headerCopy: {
    color: "#7D6542",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: "86%",
  },
  countPill: {
    position: "absolute",
    top: 18,
    right: 18,
    minWidth: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFF1D8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  countPillText: {
    color: "#C66C00",
    fontSize: 16,
    fontWeight: "900",
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 12,
    gap: 12,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  image: {
    width: 78,
    height: 78,
    borderRadius: 16,
    backgroundColor: "#FFF2DC",
  },
  meta: {
    flex: 1,
    gap: 5,
  },
  name: {
    color: "#2C1700",
    fontSize: 16,
    fontWeight: "900",
  },
  breed: {
    color: "#8B7049",
    fontSize: 13,
  },
  progressPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  progressPillText: {
    fontSize: 11,
    fontWeight: "900",
  },
  removeButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#FFF4E1",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: "#C66C00",
    fontSize: 13,
    fontWeight: "800",
  },
  inlineError: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#F2BDBD",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    paddingHorizontal: 18,
    paddingVertical: 30,
    backgroundColor: "rgba(255,255,255,0.55)",
    marginTop: 12,
  },
  stateText: {
    color: "#7A5C35",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
  },
  stateSubtext: {
    color: "#A27A48",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    lineHeight: 18,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#F18700",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
