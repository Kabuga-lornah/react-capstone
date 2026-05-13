import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import {
  acceptVisitPlan,
  getAccessToken,
  listConversations,
  listMyPets,
  listReceivedApplications,
  rejectApplication,
} from "@/lib/api";

type PetRecord = {
  id: string;
  name: string;
  type: string;
  status?: string;
  adopted?: boolean;
  imageUrl: string;
  locationLabel: string;
};

type RequestRecord = {
  id: string;
  applicantId: string;
  petId: string;
  petName: string;
  petType: string;
  petImageUrl: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  message: string;
  status: string;
  visitDate: string;
  visitStatus: string;
  meetingPreference: string;
  meetingLocationNotes: string;
  createdAt: string;
};

type ConversationRecord = {
  id: number;
  pet?: { id?: number } | null;
  adopter?: number | string | null;
};

const toTitle = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const normalizeStatus = (status?: string) => (status ? String(status).toLowerCase() : "available");

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

const getPetImageUrl = (pet: any) => {
  const mainImage = Array.isArray(pet.images) ? pet.images.find((image: any) => image.is_main) : null;
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

const normalizePet = (pet: any): PetRecord => ({
  id: String(pet.id),
  name: pet.name || "Unnamed pet",
  type: resolvePetType(pet),
  status: normalizeStatus(pet.status),
  adopted:
    pet.adopted !== undefined
      ? pet.adopted
      : normalizeStatus(pet.status) === "adopted",
  imageUrl: getPetImageUrl(pet),
  locationLabel: pet.location || pet.city || pet.county || "Location not listed",
});

const normalizeApplication = (application: any): RequestRecord => {
  const applicant = application.applicant || {};
  const pet = normalizePet(application.pet || {});
  const applicantName = `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim();

  return {
    id: String(application.id),
    applicantId: applicant.id ? String(applicant.id) : "",
    petId: pet.id,
    petName: pet.name,
    petType: pet.type,
    petImageUrl: pet.imageUrl,
    userName: applicantName || applicant.username || applicant.email || "Anonymous",
    userEmail: applicant.email || "No email",
    userPhone: applicant.phone_number || "No phone",
    message: application.message || `Interested in adopting ${pet.name}`,
    status: normalizeStatus(application.status || "pending"),
    visitDate: application.preferred_visit_date || "",
    visitStatus: application.visit_status || "not_started",
    meetingPreference: application.meeting_preference || "",
    meetingLocationNotes: application.meeting_location_notes || "",
    createdAt: application.created_at || "",
  };
};

const formatDateLabel = (value?: string) => {
  if (!value) {
    return "Not scheduled";
  }

  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) {
    return "Not scheduled";
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getMeetingPreferenceLabel = (value?: string) => {
  if (value === "rehomer_home") {
    return "At the rehomer's place";
  }
  if (value === "adopter_home") {
    return "At the adopter's place";
  }
  if (value === "neutral_place") {
    return "At a neutral place";
  }

  return "Meeting details coming soon";
};

const getStatusTone = (status?: string) => {
  const normalized = normalizeStatus(status);

  if (normalized === "approved" || normalized === "adopted") {
    return styles.badgeSuccess;
  }
  if (normalized === "rejected") {
    return styles.badgeDanger;
  }

  return styles.badgeWarning;
};

export default function RehomerDashboardScreen() {
  const { userData, logout } = useAuth();
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const hasSession = Boolean(getAccessToken());
  const isAllowed = userData?.role === "rehomer" || userData?.role === "shelter_admin";

  const fetchDashboard = async (isRefreshing = false) => {
    if (!getAccessToken() || !isAllowed) {
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
      const [petResponse, requestResponse, conversationResponse] = await Promise.all([
        listMyPets(),
        listReceivedApplications(),
        listConversations().catch(() => []),
      ]);

      const petResults = Array.isArray(petResponse) ? petResponse : petResponse?.results || [];
      const requestResults = Array.isArray(requestResponse) ? requestResponse : requestResponse?.results || [];
      const conversationResults = Array.isArray(conversationResponse)
        ? conversationResponse
        : conversationResponse?.results || [];

      setPets(petResults.map(normalizePet));
      setRequests(
        requestResults
          .map(normalizeApplication)
          .filter((request: RequestRecord) => request.status !== "withdrawn"),
      );
      setConversations(conversationResults);
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not load your rehomer dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [isAllowed]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = setTimeout(() => setSuccessMessage(""), 3200);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const stats = useMemo(
    () => ({
      totalPets: pets.length,
      availablePets: pets.filter((pet) => pet.status === "available").length,
      pendingRequests: requests.filter((request) => request.status === "pending").length,
      adoptedPets: pets.filter((pet) => pet.status === "adopted" || pet.adopted).length,
    }),
    [pets, requests],
  );

  const conversationLookup = useMemo(
    () =>
      conversations.reduce<Record<string, string>>((lookup, conversation) => {
        const petId = conversation?.pet?.id ? String(conversation.pet.id) : "";
        const adopterId = conversation?.adopter ? String(conversation.adopter) : "";

        if (petId && adopterId) {
          lookup[`${petId}-${adopterId}`] = String(conversation.id);
        }

        return lookup;
      }, {}),
    [conversations],
  );

  const filteredRequests = useMemo(() => {
    if (filter === "all") {
      return requests;
    }

    return requests.filter((request) => request.status === filter);
  }, [filter, requests]);

  const handleReject = async (requestId: string) => {
    try {
      setBusyRequestId(requestId);
      setErrorMessage("");
      await rejectApplication(requestId);
      setRequests((current) =>
        current.map((request) =>
          request.id === requestId ? { ...request, status: "rejected" } : request,
        ),
      );
      setSuccessMessage("Request rejected.");
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not reject this request.");
    } finally {
      setBusyRequestId("");
    }
  };

  const handleAcceptVisit = async (requestId: string) => {
    try {
      setBusyRequestId(requestId);
      setErrorMessage("");
      const updated = normalizeApplication(await acceptVisitPlan(requestId));
      setRequests((current) =>
        current.map((request) => (request.id === requestId ? updated : request)),
      );
      setSuccessMessage("Visit plan agreed.");
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not accept this visit plan.");
    } finally {
      setBusyRequestId("");
    }
  };

  if (!hasSession) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Your session expired on this device.</Text>
          <Text style={styles.stateBody}>
            Log in again to open your rehomer workspace.
          </Text>
          <Pressable onPress={() => router.replace("/")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAllowed) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>Only rehomers can open this dashboard.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => fetchDashboard(true)}
            refreshing={refreshing}
            tintColor="#F18700"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>
              My<Text style={styles.brandAccent}>Furry</Text>Friends
            </Text>
            <Text style={styles.title}>Rehomer workspace</Text>
            <Text style={styles.subtitle}>
              Review adoption requests, keep an eye on your listings, and jump into chats quickly.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push("/notifications")} style={styles.circleButton}>
              <Text style={styles.circleButtonText}>A</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/profile")} style={styles.circleButton}>
              <Text style={styles.circleButtonText}>U</Text>
            </Pressable>
          </View>
        </View>

        {successMessage ? <Text style={styles.successBanner}>{successMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#F18700" size="small" />
            <Text style={styles.stateTitle}>Loading your dashboard...</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>Today</Text>
              <Text style={styles.heroTitle}>
                {userData?.first_name || userData?.email || "Rehomer"}
              </Text>
              <Text style={styles.heroBody}>
                You currently have {stats.pendingRequests} request{stats.pendingRequests === 1 ? "" : "s"} waiting for review.
              </Text>

              <View style={styles.statsGrid}>
                {[
                  { label: "Listings", value: stats.totalPets },
                  { label: "Available", value: stats.availablePets },
                  { label: "Pending", value: stats.pendingRequests },
                  { label: "Adopted", value: stats.adoptedPets },
                ].map((item) => (
                  <View key={item.label} style={styles.statCard}>
                    <Text style={styles.statValue}>{item.value}</Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.quickRow}>
              <Pressable onPress={() => router.push("/chats" as never)} style={styles.quickAction}>
                <Text style={styles.quickActionTitle}>Chats</Text>
                <Text style={styles.quickActionSub}>Open your inbox</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/profile")} style={styles.quickAction}>
                <Text style={styles.quickActionTitle}>Profile</Text>
                <Text style={styles.quickActionSub}>Account and logout</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Requests</Text>
              <View style={styles.filterRow}>
                {[
                  { value: "all", label: "All" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setFilter(option.value as typeof filter)}
                    style={[
                      styles.filterChip,
                      filter === option.value ? styles.filterChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filter === option.value ? styles.filterChipTextActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {filteredRequests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No requests in this view yet.</Text>
                  <Text style={styles.emptyBody}>
                    When adopters apply for your pets, they will show up here.
                  </Text>
                </View>
              ) : (
                filteredRequests.map((request) => {
                  const conversationId =
                    conversationLookup[`${request.petId}-${request.applicantId}`];
                  const isBusy = busyRequestId === request.id;

                  return (
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.requestTop}>
                        <Image
                          contentFit="cover"
                          source={{ uri: request.petImageUrl }}
                          style={styles.requestImage}
                        />
                        <View style={styles.requestBody}>
                          <View style={styles.requestHeadline}>
                            <Text numberOfLines={1} style={styles.requestName}>
                              {request.userName}
                            </Text>
                            <View style={[styles.badge, getStatusTone(request.status)]}>
                              <Text style={styles.badgeText}>{toTitle(request.status)}</Text>
                            </View>
                          </View>
                          <Text style={styles.requestMeta}>For {request.petName}</Text>
                          <Text style={styles.requestMeta}>{request.userEmail}</Text>
                          <Text numberOfLines={2} style={styles.requestMessage}>
                            {request.message}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.visitCard}>
                        <Text style={styles.visitLabel}>Visit plan</Text>
                        <Text style={styles.visitValue}>{formatDateLabel(request.visitDate)}</Text>
                        <Text style={styles.visitHint}>
                          {request.meetingPreference
                            ? getMeetingPreferenceLabel(request.meetingPreference)
                            : "No meeting plan proposed yet."}
                        </Text>
                        {request.meetingLocationNotes ? (
                          <Text style={styles.visitNotes}>{request.meetingLocationNotes}</Text>
                        ) : null}
                      </View>

                      <View style={styles.actionsRow}>
                        {conversationId ? (
                          <Pressable
                            onPress={() => router.push(`/chats/${conversationId}` as never)}
                            style={styles.secondaryButton}
                          >
                            <Text style={styles.secondaryButtonText}>Open chat</Text>
                          </Pressable>
                        ) : (
                          <View style={styles.disabledPill}>
                            <Text style={styles.disabledPillText}>Chat appears after first message</Text>
                          </View>
                        )}

                        {request.visitStatus === "proposed" ? (
                          <Pressable
                            disabled={isBusy}
                            onPress={() => handleAcceptVisit(request.id)}
                            style={styles.secondaryButton}
                          >
                            <Text style={styles.secondaryButtonText}>
                              {isBusy ? "Please wait..." : "Agree visit"}
                            </Text>
                          </Pressable>
                        ) : null}

                        {request.status === "pending" ? (
                          <Pressable
                            disabled={isBusy}
                            onPress={() => handleReject(request.id)}
                            style={styles.ghostButton}
                          >
                            <Text style={styles.ghostButtonText}>
                              {isBusy ? "Please wait..." : "Reject"}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My listings snapshot</Text>
              {pets.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No listed pets yet.</Text>
                  <Text style={styles.emptyBody}>
                    Once your pets are listed, they will appear here with quick status context.
                  </Text>
                </View>
              ) : (
                pets.slice(0, 3).map((pet) => (
                  <View key={pet.id} style={styles.petCard}>
                    <Image contentFit="cover" source={{ uri: pet.imageUrl }} style={styles.petImage} />
                    <View style={styles.petBody}>
                      <Text style={styles.petName}>{pet.name}</Text>
                      <Text style={styles.petMeta}>{toTitle(pet.type)}</Text>
                      <Text style={styles.petMeta}>{pet.locationLabel}</Text>
                    </View>
                    <View style={[styles.badge, getStatusTone(pet.adopted ? "approved" : pet.status)]}>
                      <Text style={styles.badgeText}>
                        {pet.adopted ? "Adopted" : toTitle(pet.status || "available")}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Pressable
              onPress={() => {
                logout();
                router.replace("/");
              }}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutButtonText}>Log out</Text>
            </Pressable>
          </>
        )}
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  brand: {
    color: "#3D2000",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  brandAccent: {
    color: "#E87E00",
  },
  title: {
    color: "#221205",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 6,
  },
  subtitle: {
    color: "#7A5C35",
    fontSize: 13,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.22)",
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonText: {
    color: "#B66900",
    fontSize: 13,
    fontWeight: "900",
  },
  successBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3C981",
    backgroundColor: "#FFF5DF",
    color: "#7A4800",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F6C87A",
    backgroundColor: "#FFF3E0",
    color: "#7A4800",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: "#F28C00",
    padding: 18,
    marginBottom: 16,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 6,
  },
  heroBody: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47%",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    padding: 12,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  statLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "700",
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  quickAction: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.18)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 16,
  },
  quickActionTitle: {
    color: "#261307",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  quickActionSub: {
    color: "#8B6A42",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: "#261307",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.25)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: "#FF9900",
    borderColor: "#FF9900",
  },
  filterChipText: {
    color: "#9A6C30",
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.7)",
    padding: 18,
  },
  emptyTitle: {
    color: "#7A5C35",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyBody: {
    color: "#A27A48",
    fontSize: 13,
    lineHeight: 20,
  },
  requestCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  requestTop: {
    flexDirection: "row",
    gap: 12,
  },
  requestImage: {
    width: 74,
    height: 74,
    borderRadius: 20,
    backgroundColor: "#FEE9BF",
  },
  requestBody: {
    flex: 1,
    gap: 4,
  },
  requestHeadline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  requestName: {
    color: "#261307",
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  requestMeta: {
    color: "#8B6A42",
    fontSize: 12,
    fontWeight: "700",
  },
  requestMessage: {
    color: "#5F4321",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  visitCard: {
    borderRadius: 18,
    backgroundColor: "#FFF6E8",
    padding: 12,
    gap: 4,
  },
  visitLabel: {
    color: "#B66900",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  visitValue: {
    color: "#261307",
    fontSize: 15,
    fontWeight: "900",
  },
  visitHint: {
    color: "#7A5C35",
    fontSize: 12,
    fontWeight: "700",
  },
  visitNotes: {
    color: "#8B6A42",
    fontSize: 12,
    lineHeight: 18,
  },
  actionsRow: {
    gap: 10,
  },
  secondaryButton: {
    minHeight: 48,
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
    minHeight: 48,
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
  disabledPill: {
    borderRadius: 16,
    backgroundColor: "#FFF7E8",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  disabledPillText: {
    color: "#8A5200",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 12,
    marginBottom: 10,
  },
  petImage: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#FEE9BF",
  },
  petBody: {
    flex: 1,
    gap: 3,
  },
  petName: {
    color: "#261307",
    fontSize: 15,
    fontWeight: "900",
  },
  petMeta: {
    color: "#8B6A42",
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeWarning: {
    backgroundColor: "#FFF1D8",
  },
  badgeSuccess: {
    backgroundColor: "#DCFCE7",
  },
  badgeDanger: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    color: "#7A4800",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  logoutButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  stateBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  stateTitle: {
    color: "#7A5C35",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  stateBody: {
    color: "#A27A48",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
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
