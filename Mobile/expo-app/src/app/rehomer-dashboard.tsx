import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import {
  acceptVisitPlan,
  deletePet,
  getAccessToken,
  listConversations,
  listMyPets,
  listNotifications,
  listReceivedApplications,
  markNotificationRead,
  proposeVisitPlan,
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
  petLocation: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  message: string;
  status: string;
  visitDate: string;
  visitStatus: string;
  visitProposedBy: string;
  visitConfirmedAt: string;
  meetingPreference: string;
  meetingLocationNotes: string;
  createdAt: string;
  updatedAt: string;
};

type ConversationRecord = {
  id: number;
  pet?: { id?: number } | null;
  adopter?: number | string | null;
};

type NotificationRecord = {
  id: number;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  created_at?: string;
  pet?: { id?: number } | null;
  conversation_id?: number | null;
};

type VisitDraft = {
  preferredVisitDate: string;
  meetingPreference: string;
  meetingLocationNotes: string;
};

type RehomerScreen = "home" | "requests" | "listings" | "profile";

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
    petLocation: pet.locationLabel,
    userName: applicantName || applicant.username || applicant.email || "Anonymous",
    userEmail: applicant.email || "No email",
    userPhone: applicant.phone_number || "No phone",
    message: application.message || `Interested in adopting ${pet.name}`,
    status: normalizeStatus(application.status || "pending"),
    visitDate: application.preferred_visit_date || "",
    visitStatus: application.visit_status || "not_started",
    visitProposedBy: application.visit_proposed_by || "",
    visitConfirmedAt: application.visit_confirmed_at || "",
    meetingPreference: application.meeting_preference || "",
    meetingLocationNotes: application.meeting_location_notes || "",
    createdAt: application.created_at || "",
    updatedAt: application.updated_at || "",
  };
};

const createVisitDraft = (request: RequestRecord): VisitDraft => ({
  preferredVisitDate: request.visitDate || "",
  meetingPreference: request.meetingPreference || "",
  meetingLocationNotes: request.meetingLocationNotes || "",
});

const getWorkflowStage = (request: RequestRecord) => {
  if (request.status === "rejected") {
    return "Rejected";
  }

  if (request.status === "approved") {
    return "Completed";
  }

  if (request.visitStatus === "agreed") {
    return "Visit agreed";
  }

  if (request.visitStatus === "proposed") {
    return "Visit planned";
  }

  return "Reviewing";
};

const getWorkflowSteps = (request: RequestRecord, hasConversation: boolean) => {
  const currentStep =
    request.status === "approved"
      ? "completed"
      : request.visitStatus === "agreed" || request.visitStatus === "proposed"
        ? "visit_planned"
        : hasConversation || request.status === "pending"
          ? "reviewing"
          : "new_request";

  const steps = [
    { key: "new_request", label: "New request" },
    { key: "reviewing", label: "Reviewing" },
    {
      key: "visit_planned",
      label: request.visitStatus === "agreed" ? "Visit agreed" : "Visit planned",
    },
    { key: "completed", label: "Completed" },
  ];

  const activeIndex = steps.findIndex((step) => step.key === currentStep);

  return steps.map((step, index) => ({
    ...step,
    isActive: index === activeIndex,
    isComplete: index < activeIndex,
  }));
};

const formatDateLabel = (value?: string, fallback = "Not scheduled") => {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatNotificationTime = (value?: string) => {
  if (!value) {
    return "Just now";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Just now";
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp.getTime()) / 60000));
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return timestamp.toLocaleDateString();
};

const getMeetingPreferenceLabel = (value?: string) => {
  if (value === "rehomer_home") {
    return "Visit the rehomer or pet location";
  }
  if (value === "adopter_home") {
    return "Rehomer visits adopter's place";
  }
  if (value === "neutral_place") {
    return "Meet at a neutral place";
  }

  return "To be agreed in chat";
};

const getPresenceText = (profile: any) => {
  if (profile?.is_online) {
    return "Online";
  }

  if (profile?.last_seen) {
    const timestamp = new Date(profile.last_seen);
    if (!Number.isNaN(timestamp.getTime())) {
      return `Last active ${timestamp.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`;
    }
  }

  return "Offline";
};

const getVerificationLabel = (status?: string) => {
  if (status === "verified") {
    return "Verified";
  }
  if (status === "pending") {
    return "Pending approval";
  }
  if (status === "rejected") {
    return "Rejected";
  }
  return "Incomplete";
};

const dailyTips = [
  "Adding 3 or more clear photos helps serious adopters trust a listing faster.",
  "Honest temperament notes reduce mismatches and save everyone time.",
  "Vaccination and deworming details help adopters prepare responsibly.",
  "A calm transition week helps adopted pets settle into new routines.",
];

const meetingOptions = [
  { value: "rehomer_home", label: "Pet location" },
  { value: "adopter_home", label: "Adopter home" },
  { value: "neutral_place", label: "Neutral place" },
] as const;

const getStatusBadgeStyle = (status?: string) => {
  const normalized = normalizeStatus(status);

  if (normalized === "approved" || normalized === "adopted") {
    return [styles.badge, styles.badgeSuccess];
  }
  if (normalized === "rejected" || normalized === "unavailable") {
    return [styles.badge, styles.badgeDanger];
  }

  return [styles.badge, styles.badgeWarning];
};

const RehomerBottomNav = ({
  currentScreen,
  pendingRequests,
  unreadChatsCount,
}: {
  currentScreen: RehomerScreen;
  pendingRequests: number;
  unreadChatsCount: number;
}) => {
  const tabs = [
    { key: "home" as const, label: "Home", icon: "home-outline", onPress: () => router.replace("/rehomer-dashboard") },
    { key: "requests" as const, label: "Requests", icon: "file-document-outline", onPress: () => router.replace("/rehomer-requests"), badge: pendingRequests },
    { key: "listings" as const, label: "My Pets", icon: "paw-outline", onPress: () => router.replace("/rehomer-listings") },
    { key: "chats" as const, label: "Chats", icon: "chat-processing-outline", onPress: () => router.replace("/chats"), badge: unreadChatsCount },
    { key: "profile" as const, label: "Profile", icon: "account-circle-outline", onPress: () => router.replace("/rehomer-profile") },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const isActive = tab.key === currentScreen;
        return (
          <Pressable key={tab.key} onPress={tab.onPress} style={styles.navItem}>
            <View style={[styles.navIconWrap, isActive ? styles.navIconWrapActive : null]}>
              <View style={[styles.navIcon, isActive ? styles.navIconActive : null]}>
                <MaterialCommunityIcons
                  color={isActive ? "#FFFFFF" : "#B66900"}
                  name={tab.icon as any}
                  size={17}
                />
              </View>
              {tab.badge && tab.badge > 0 ? (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{tab.badge > 99 ? "99+" : tab.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.navLabel, isActive ? styles.navLabelActive : null]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export function RehomerWorkspaceScreen({
  screen = "home",
}: {
  screen?: RehomerScreen;
}) {
  const { userData, logout } = useAuth();
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");
  const [busyPetId, setBusyPetId] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [visitEditorId, setVisitEditorId] = useState("");
  const [visitDrafts, setVisitDrafts] = useState<Record<string, VisitDraft>>({});

  const hasSession = Boolean(getAccessToken());
  const isAllowed = userData?.role === "rehomer" || userData?.role === "shelter_admin";
  const verificationStatus = userData?.rehomer_verification_status || "incomplete";
  const isVerifiedRehomer = verificationStatus === "verified";
  const presenceText = getPresenceText(userData);

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
      const [petResponse, requestResponse, conversationResponse, notificationResponse] =
        await Promise.all([
          listMyPets(),
          listReceivedApplications(),
          listConversations().catch(() => []),
          listNotifications().catch(() => []),
        ]);

      const petResults = Array.isArray(petResponse) ? petResponse : petResponse?.results || [];
      const requestResults = Array.isArray(requestResponse) ? requestResponse : requestResponse?.results || [];
      const conversationResults = Array.isArray(conversationResponse)
        ? conversationResponse
        : conversationResponse?.results || [];
      const notificationResults = Array.isArray(notificationResponse)
        ? notificationResponse
        : notificationResponse?.results || [];

      setPets(petResults.map(normalizePet));
      setRequests(
        requestResults
          .map(normalizeApplication)
          .filter((request: RequestRecord) => request.status !== "withdrawn"),
      );
      setConversations(conversationResults);
      setNotifications(notificationResults);
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not load your rehomer dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, [isAllowed]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = setTimeout(() => setSuccessMessage(""), 3600);
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

  const adoptionHistory = useMemo(
    () => requests.filter((request) => request.status === "approved"),
    [requests],
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const unreadChatsCount = useMemo(
    () =>
      conversations.reduce(
        (total, conversation: any) => total + Number(conversation?.unread_count || 0),
        0,
      ),
    [conversations],
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
    return requests.filter((request) => {
      const matchesStatus = filter === "all" ? true : request.status === filter;
      const matchesDate = selectedDate
        ? String(request.createdAt).slice(0, 10) === selectedDate.trim()
        : true;

      return matchesStatus && matchesDate;
    });
  }, [filter, requests, selectedDate]);

  const tip = dailyTips[new Date().getDay() % dailyTips.length];
  const recentRequests = useMemo(() => requests.slice(0, 3), [requests]);
  const headerTitle =
    screen === "requests"
      ? "Adoption requests"
      : screen === "listings"
        ? "My listings"
        : screen === "profile"
          ? "Rehomer profile"
          : "Rehomer workspace";
  const headerSubtitle =
    screen === "requests"
      ? "Review pending, approved, and rejected adoption requests in one place."
      : screen === "listings"
        ? "Manage your listed pets and keep track of what is still available."
        : screen === "profile"
          ? "Check your verification details, adoption history, and account actions."
          : isVerifiedRehomer
            ? "Review requests, manage listings, and keep each handover organized."
            : verificationStatus === "pending"
              ? "Your verification is under review. You can still monitor requests and existing listings here."
              : "Finish your rehomer profile to unlock the full listing workflow.";

  const updateVisitDraft = (requestId: string, patch: Partial<VisitDraft>) => {
    setVisitDrafts((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] || {
          preferredVisitDate: "",
          meetingPreference: "",
          meetingLocationNotes: "",
        }),
        ...patch,
      },
    }));
  };

  const openVisitEditor = (request: RequestRecord) => {
    setVisitEditorId(request.id);
    setVisitDrafts((current) => ({
      ...current,
      [request.id]: current[request.id] || createVisitDraft(request),
    }));
  };

  const handleReject = (requestId: string, userName: string) => {
    Alert.alert(
      "Reject request?",
      `This will mark ${userName}'s request as rejected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              setBusyRequestId(requestId);
              setErrorMessage("");
              await rejectApplication(requestId);
              setRequests((current) =>
                current.map((request) =>
                  request.id === requestId ? { ...request, status: "rejected" } : request,
                ),
              );
              setSuccessMessage("Application rejected.");
            } catch (error: any) {
              setErrorMessage(error?.message || "We could not reject this request.");
            } finally {
              setBusyRequestId("");
            }
          },
        },
      ],
    );
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

  const handleSubmitVisit = async (requestId: string) => {
    const draft = visitDrafts[requestId];

    if (!draft?.preferredVisitDate || !draft?.meetingPreference) {
      setErrorMessage("Add a visit date and meeting style before sending the plan.");
      return;
    }

    try {
      setBusyRequestId(requestId);
      setErrorMessage("");
      const updated = normalizeApplication(
        await proposeVisitPlan(requestId, {
          preferred_visit_date: draft.preferredVisitDate,
          meeting_preference: draft.meetingPreference,
          meeting_location_notes: draft.meetingLocationNotes,
        }),
      );
      setRequests((current) =>
        current.map((request) => (request.id === requestId ? updated : request)),
      );
      setVisitEditorId("");
      setSuccessMessage("New visit plan sent.");
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not update this visit plan.");
    } finally {
      setBusyRequestId("");
    }
  };

  const handleDeletePet = (pet: PetRecord) => {
    Alert.alert(
      `Delete ${pet.name}?`,
      "This removes the listing and clears related pending requests from this dashboard.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setBusyPetId(pet.id);
              setErrorMessage("");
              await deletePet(pet.id);
              setPets((current) => current.filter((entry) => entry.id !== pet.id));
              setRequests((current) => current.filter((request) => request.petId !== pet.id));
              setSuccessMessage("Listing removed.");
            } catch (error: any) {
              setErrorMessage(error?.message || "We could not delete this listing.");
            } finally {
              setBusyPetId("");
            }
          },
        },
      ],
    );
  };

  const handleNotificationPress = async (notification: NotificationRecord) => {
    try {
      if (!notification.read) {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
      }
    } catch {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
    }

    if (notification.conversation_id) {
      router.push(`/chats/${notification.conversation_id}` as never);
      return;
    }

    if (notification.type?.startsWith("application_") || notification.type?.startsWith("visit_")) {
      router.push("/rehomer-requests");
      return;
    }

    if (notification.pet?.id) {
      router.push(`/pet/${notification.pet.id}` as never);
    }
  };

  if (!hasSession) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Your session expired on this device.</Text>
          <Text style={styles.stateBody}>Log in again to open your rehomer workspace.</Text>
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
            onRefresh={() => void fetchDashboard(true)}
            refreshing={refreshing}
            tintColor="#F18700"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>
              My<Text style={styles.brandAccent}>Furry</Text>Friends
            </Text>
            <Text style={styles.title}>{headerTitle}</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push("/notifications")} style={styles.circleButton}>
              <MaterialCommunityIcons color="#B66900" name="bell-outline" size={18} />
              {unreadNotificationCount > 0 ? <View style={styles.unreadDot} /> : null}
            </Pressable>
            <Pressable onPress={() => router.push("/rehomer-profile")} style={styles.circleButton}>
              <MaterialCommunityIcons color="#B66900" name="account-outline" size={18} />
            </Pressable>
          </View>
        </View>

        {successMessage ? <Text style={styles.successBanner}>{successMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

        {loading ? (
          <View style={styles.stateBoxInline}>
            <ActivityIndicator color="#F18700" size="small" />
            <Text style={styles.stateTitle}>Loading your dashboard...</Text>
          </View>
        ) : (
          <>
            {screen === "home" ? (
              <>
                <View style={styles.heroCard}>
                  <Text style={styles.heroEyebrow}>Today</Text>
                  <Text style={styles.heroTitle}>
                    {userData?.first_name || userData?.email || "Rehomer"}
                  </Text>
                  <Text style={styles.heroBody}>
                    {isVerifiedRehomer
                      ? `You currently have ${stats.pendingRequests} request${stats.pendingRequests === 1 ? "" : "s"} waiting for review.`
                      : `Verification status: ${getVerificationLabel(verificationStatus)}.`}
                  </Text>

                  <View style={styles.heroStatusRow}>
                    <View style={styles.heroStatusPill}>
                      <MaterialCommunityIcons color="#FFFFFF" name="shield-check-outline" size={15} />
                      <Text style={styles.heroStatusText}>{getVerificationLabel(verificationStatus)}</Text>
                    </View>
                    <View style={styles.heroStatusPillMuted}>
                      <Text style={styles.heroStatusTextMuted}>{presenceText}</Text>
                    </View>
                  </View>

                  <View style={styles.statsGrid}>
                    {[
                      { label: "Listings", value: stats.totalPets },
                      { label: "Pending", value: stats.pendingRequests },
                      { label: "Available", value: stats.availablePets },
                      { label: "Adopted", value: stats.adoptedPets },
                    ].map((item) => (
                      <View key={item.label} style={styles.statCard}>
                        <Text style={styles.statValue}>{item.value}</Text>
                        <Text style={styles.statLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.tipCard}>
                  <View style={styles.tipHead}>
                    <MaterialCommunityIcons color="#D97706" name="lightbulb-on-outline" size={16} />
                    <Text style={styles.tipLabel}>Tip of the day</Text>
                  </View>
                  <Text style={styles.tipBody}>{tip}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Quick actions</Text>
                  <View style={styles.quickGrid}>
                    {[
                      {
                        key: "requests",
                        icon: "file-document-outline",
                        title: "Requests",
                        sub: `${stats.pendingRequests} pending`,
                        onPress: () => router.push("/rehomer-requests"),
                      },
                      {
                        key: "chats",
                        icon: "chat-processing-outline",
                        title: "Chats",
                        sub: unreadChatsCount > 0 ? `${unreadChatsCount} unread` : "Open your inbox",
                        onPress: () => router.push("/chats"),
                      },
                      {
                        key: "listings",
                        icon: "paw-outline",
                        title: "My listings",
                        sub: `${stats.totalPets} pets`,
                        onPress: () => router.push("/rehomer-listings"),
                      },
                      {
                        key: "profile",
                        icon: "account-circle-outline",
                        title: "Profile",
                        sub: getVerificationLabel(verificationStatus),
                        onPress: () => router.push("/rehomer-profile"),
                      },
                    ].map((action) => (
                      <Pressable key={action.key} onPress={action.onPress} style={styles.quickAction}>
                        <View style={styles.quickActionIcon}>
                          <MaterialCommunityIcons color="#C16D00" name={action.icon as any} size={18} />
                        </View>
                        <Text style={styles.quickActionTitle}>{action.title}</Text>
                        <Text style={styles.quickActionSub}>{action.sub}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>Recent alerts</Text>
                    <Pressable onPress={() => router.push("/notifications")}>
                      <Text style={styles.seeAllText}>See all</Text>
                    </Pressable>
                  </View>
                  {notifications.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>No alerts yet.</Text>
                      <Text style={styles.emptyBody}>
                        Updates about chats, visits, and application changes will show up here.
                      </Text>
                    </View>
                  ) : (
                    notifications.slice(0, 3).map((notification) => (
                      <Pressable
                        key={notification.id}
                        onPress={() => void handleNotificationPress(notification)}
                        style={[
                          styles.notificationCard,
                          !notification.read ? styles.notificationCardUnread : null,
                        ]}
                      >
                        <View style={styles.notificationTop}>
                          <Text style={styles.notificationTitle}>
                            {notification.title || "New update"}
                          </Text>
                          <Text style={styles.notificationTime}>
                            {formatNotificationTime(notification.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.notificationMessage}>
                          {notification.message || "Open this update to see more."}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>Adoption requests</Text>
                    <Pressable onPress={() => router.push("/rehomer-requests")}>
                      <Text style={styles.seeAllText}>See all</Text>
                    </Pressable>
                  </View>
                  {recentRequests.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>No requests yet.</Text>
                      <Text style={styles.emptyBody}>
                        New adopter requests will appear here first.
                      </Text>
                    </View>
                  ) : (
                    recentRequests.map((request) => (
                      <Pressable
                        key={request.id}
                        onPress={() => router.push("/rehomer-requests")}
                        style={styles.notificationCard}
                      >
                        <View style={styles.notificationTop}>
                          <Text style={styles.notificationTitle}>{request.userName}</Text>
                          <View style={getStatusBadgeStyle(request.status)}>
                            <Text style={styles.badgeText}>{getWorkflowStage(request)}</Text>
                          </View>
                        </View>
                        <Text style={styles.notificationMessage}>
                          Wants to adopt {request.petName}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </>
            ) : null}

            {screen === "requests" ? (
              <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adoption requests</Text>
              <View style={styles.helperCard}>
                <Text style={styles.helperCardTitle}>Requests only</Text>
                <Text style={styles.helperCardBody}>
                  Ongoing conversations now live in chats. Use this area to review applications and plan visits.
                </Text>
              </View>

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

              <View style={styles.dateFilterRow}>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="numbers-and-punctuation"
                  onChangeText={setSelectedDate}
                  placeholder="Filter by date: YYYY-MM-DD"
                  placeholderTextColor="#B08A58"
                  style={styles.dateInput}
                  value={selectedDate}
                />
                {selectedDate ? (
                  <Pressable onPress={() => setSelectedDate("")} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              {filteredRequests.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No requests match this filter.</Text>
                  <Text style={styles.emptyBody}>
                    This list updates as adopters apply and as you review them.
                  </Text>
                </View>
              ) : (
                filteredRequests.map((request) => {
                  const conversationId = conversationLookup[`${request.petId}-${request.applicantId}`];
                  const isBusy = busyRequestId === request.id;
                  const workflowStage = getWorkflowStage(request);
                  const workflowSteps = getWorkflowSteps(request, Boolean(conversationId));

                  return (
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.requestHeader}>
                        <View style={styles.requestAvatar}>
                          <Text style={styles.requestAvatarText}>
                            {request.userName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.requestHeaderBody}>
                          <Text style={styles.requestName}>{request.userName}</Text>
                          <Text style={styles.requestSub}>Wants to adopt {request.petName}</Text>
                          <Text style={styles.requestSub}>
                            {request.userEmail} {" • "} {request.userPhone}
                          </Text>
                        </View>
                        <View style={getStatusBadgeStyle(
                          workflowStage === "Rejected"
                            ? "rejected"
                            : workflowStage === "Completed"
                              ? "approved"
                              : "pending",
                        )}>
                          <Text style={styles.badgeText}>{workflowStage}</Text>
                        </View>
                      </View>

                      <View style={styles.workflowCard}>
                        <Text style={styles.workflowLabel}>Request journey</Text>
                        <View style={styles.workflowRow}>
                          {workflowSteps.map((step) => (
                            <View
                              key={`${request.id}-${step.key}`}
                              style={[
                                styles.workflowStep,
                                step.isActive ? styles.workflowStepActive : null,
                                step.isComplete ? styles.workflowStepComplete : null,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.workflowStepText,
                                  step.isActive || step.isComplete
                                    ? styles.workflowStepTextActive
                                    : null,
                                ]}
                              >
                                {step.label}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <View style={styles.requestPetCard}>
                        <Image contentFit="cover" source={{ uri: request.petImageUrl }} style={styles.requestImage} />
                        <View style={styles.requestPetBody}>
                          <Text style={styles.requestPetName}>{request.petName}</Text>
                          <Text style={styles.requestSub}>
                            {toTitle(request.petType)} {" • "} {request.petLocation}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.metaGrid}>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Requested on</Text>
                          <Text style={styles.metaValue}>{formatDateLabel(request.createdAt, "Today")}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Visit plan</Text>
                          <Text style={styles.metaValue}>{formatDateLabel(request.visitDate)}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Meeting</Text>
                          <Text style={styles.metaValue}>{getMeetingPreferenceLabel(request.meetingPreference)}</Text>
                        </View>
                      </View>

                      <Text style={styles.requestMessage}>{request.message}</Text>

                      {request.meetingLocationNotes ? (
                        <View style={styles.visitNoteCard}>
                          <Text style={styles.metaLabel}>Meetup notes</Text>
                          <Text style={styles.visitNoteText}>{request.meetingLocationNotes}</Text>
                        </View>
                      ) : null}

                      {visitEditorId === request.id ? (
                        <View style={styles.editorCard}>
                          <TextInput
                            autoCapitalize="none"
                            keyboardType="numbers-and-punctuation"
                            onChangeText={(value) =>
                              updateVisitDraft(request.id, { preferredVisitDate: value })
                            }
                            placeholder="Visit date: YYYY-MM-DD"
                            placeholderTextColor="#B08A58"
                            style={styles.editorInput}
                            value={visitDrafts[request.id]?.preferredVisitDate || ""}
                          />
                          <View style={styles.meetingRow}>
                            {meetingOptions.map((option) => {
                              const selected =
                                visitDrafts[request.id]?.meetingPreference === option.value;

                              return (
                                <Pressable
                                  key={option.value}
                                  onPress={() =>
                                    updateVisitDraft(request.id, { meetingPreference: option.value })
                                  }
                                  style={[
                                    styles.meetingChip,
                                    selected ? styles.meetingChipActive : null,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.meetingChipText,
                                      selected ? styles.meetingChipTextActive : null,
                                    ]}
                                  >
                                    {option.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                          <TextInput
                            multiline
                            onChangeText={(value) =>
                              updateVisitDraft(request.id, { meetingLocationNotes: value })
                            }
                            placeholder="Share the time, area, or meetup details that work best."
                            placeholderTextColor="#B08A58"
                            style={styles.editorTextarea}
                            textAlignVertical="top"
                            value={visitDrafts[request.id]?.meetingLocationNotes || ""}
                          />
                          <View style={styles.editorActions}>
                            <Pressable
                              onPress={() => setVisitEditorId("")}
                              style={styles.ghostButton}
                            >
                              <Text style={styles.ghostButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                              disabled={isBusy}
                              onPress={() => void handleSubmitVisit(request.id)}
                              style={styles.secondaryButton}
                            >
                              <Text style={styles.secondaryButtonText}>
                                {isBusy ? "Saving..." : "Send visit plan"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}

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
                            <Text style={styles.disabledPillText}>
                              Chat appears after the first message
                            </Text>
                          </View>
                        )}

                        {request.visitStatus === "proposed" &&
                        request.visitProposedBy === "adopter" ? (
                          <Pressable
                            disabled={isBusy}
                            onPress={() => void handleAcceptVisit(request.id)}
                            style={styles.secondaryButton}
                          >
                            <Text style={styles.secondaryButtonText}>
                              {isBusy ? "Please wait..." : "Accept visit"}
                            </Text>
                          </Pressable>
                        ) : null}

                        {request.status === "pending" ? (
                          <Pressable
                            onPress={() => openVisitEditor(request)}
                            style={styles.ghostButton}
                          >
                            <Text style={styles.ghostButtonText}>
                              {request.visitStatus === "not_started"
                                ? "Propose visit"
                                : "Suggest another time"}
                            </Text>
                          </Pressable>
                        ) : null}

                        {request.status === "pending" ? (
                          <Pressable
                            disabled={isBusy}
                            onPress={() => handleReject(request.id, request.userName)}
                            style={styles.dangerButton}
                          >
                            <Text style={styles.dangerButtonText}>
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
            ) : null}

            {screen === "listings" ? (
              <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>My listings</Text>
                <Text style={styles.sectionCount}>{pets.length}</Text>
              </View>
              {!isVerifiedRehomer ? (
                <View style={styles.helperCard}>
                  <Text style={styles.helperCardTitle}>Verification note</Text>
                  <Text style={styles.helperCardBody}>
                    {verificationStatus === "pending"
                      ? "Your profile is under review. New listing tools can open after approval."
                      : "Finish your rehomer profile so the full listing workflow can be unlocked."}
                  </Text>
                </View>
              ) : null}

              {pets.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No listed pets yet.</Text>
                  <Text style={styles.emptyBody}>
                    Once your pets are listed, they will appear here with quick status actions.
                  </Text>
                </View>
              ) : (
                pets.map((pet) => (
                  <View key={pet.id} style={styles.petCard}>
                    <Image contentFit="cover" source={{ uri: pet.imageUrl }} style={styles.petImage} />
                    <View style={styles.petBody}>
                      <Text style={styles.petName}>{pet.name}</Text>
                      <Text style={styles.petMeta}>{toTitle(pet.type)}</Text>
                      <Text style={styles.petMeta}>{pet.locationLabel}</Text>
                    </View>
                    <View style={getStatusBadgeStyle(pet.adopted ? "approved" : pet.status)}>
                      <Text style={styles.badgeText}>
                        {pet.adopted ? "Adopted" : toTitle(pet.status || "available")}
                      </Text>
                    </View>
                    <View style={styles.petActions}>
                      <Pressable
                        onPress={() => router.push(`/pet/${pet.id}` as never)}
                        style={styles.iconOnlyButton}
                      >
                        <MaterialCommunityIcons color="#B66900" name="eye-outline" size={18} />
                      </Pressable>
                      <Pressable
                        disabled={busyPetId === pet.id}
                        onPress={() => handleDeletePet(pet)}
                        style={styles.iconOnlyButton}
                      >
                        <MaterialCommunityIcons color="#C2410C" name="trash-can-outline" size={18} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
              </View>
            ) : null}

            {screen === "profile" ? (
              <>
                <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile snapshot</Text>
              <View style={styles.profileCard}>
                <View style={styles.profileTop}>
                  <View style={styles.profileAvatar}>
                    {userData?.profile_photo_url ? (
                      <Image
                        contentFit="cover"
                        source={{ uri: userData.profile_photo_url }}
                        style={styles.profileAvatarImage}
                      />
                    ) : (
                      <MaterialCommunityIcons color="#B66900" name="account-outline" size={22} />
                    )}
                  </View>
                  <View style={styles.profileBody}>
                    <Text style={styles.profileName}>
                      {userData?.first_name || userData?.email || "Rehomer"}
                    </Text>
                    <Text style={styles.profileRole}>{toTitle(userData?.role || "rehomer")}</Text>
                  </View>
                  <View style={getStatusBadgeStyle(
                    verificationStatus === "verified"
                      ? "approved"
                      : verificationStatus === "rejected"
                        ? "rejected"
                        : "pending",
                  )}>
                    <Text style={styles.badgeText}>{getVerificationLabel(verificationStatus)}</Text>
                  </View>
                </View>

                <View style={styles.profileInfoList}>
                  {[
                    { label: "Status", value: presenceText },
                    { label: "Verification", value: getVerificationLabel(verificationStatus) },
                    { label: "Phone", value: userData?.phone_number || "Not provided" },
                    { label: "Email", value: userData?.email || "Not provided" },
                  ].map((item) => (
                    <View key={item.label} style={styles.profileInfoRow}>
                      <Text style={styles.profileInfoLabel}>{item.label}</Text>
                      <Text style={styles.profileInfoValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.miniStatsRow}>
                {[
                  { label: "Pets listed", value: stats.totalPets },
                  { label: "Approved", value: stats.adoptedPets },
                  { label: "Pending", value: stats.pendingRequests },
                  { label: "Available", value: stats.availablePets },
                ].map((item) => (
                  <View key={item.label} style={styles.miniStatCard}>
                    <Text style={styles.miniStatLabel}>{item.label}</Text>
                    <Text style={styles.miniStatValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
                </View>

                <View style={styles.section}>
              <Text style={styles.sectionTitle}>Adoption history</Text>
              {adoptionHistory.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No adopted pets yet.</Text>
                  <Text style={styles.emptyBody}>
                    Approved adoptions will be stored here with adopter details and timing.
                  </Text>
                </View>
              ) : (
                adoptionHistory.map((request) => (
                  <View key={request.id} style={styles.historyCard}>
                    <View style={styles.historyAvatar}>
                      <MaterialCommunityIcons color="#1A7A48" name="check-circle-outline" size={18} />
                    </View>
                    <View style={styles.historyBody}>
                      <Text style={styles.historyName}>{request.petName}</Text>
                      <Text style={styles.historySub}>Adopted by {request.userName}</Text>
                      <Text style={styles.historySub}>
                        {request.visitConfirmedAt
                          ? `Visit agreed ${formatDateLabel(request.visitConfirmedAt)}`
                          : `Approved ${formatDateLabel(request.updatedAt || request.createdAt)}`}
                      </Text>
                    </View>
                    <View style={[styles.badge, styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>Completed</Text>
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
            ) : null}
          </>
        )}
      </ScrollView>
      <RehomerBottomNav
        currentScreen={screen}
        pendingRequests={stats.pendingRequests}
        unreadChatsCount={unreadChatsCount}
      />
    </SafeAreaView>
  );
}

export default function RehomerDashboardScreen() {
  return <RehomerWorkspaceScreen screen="home" />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
  },
  content: {
    padding: 18,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
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
    paddingTop: 4,
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
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D9480F",
  },
  bottomNav: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,252,247,0.98)",
    paddingHorizontal: 8,
    paddingVertical: 10,
    shadowColor: "#E59A2E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 14,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  navIconWrap: {
    position: "relative",
  },
  navIconWrapActive: {
    transform: [{ translateY: -1 }],
  },
  navIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  navIconActive: {
    backgroundColor: "#F18700",
  },
  navLabel: {
    color: "#A37134",
    fontSize: 10,
    fontWeight: "800",
  },
  navLabelActive: {
    color: "#8C4F00",
  },
  navBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 17,
    height: 17,
    borderRadius: 999,
    paddingHorizontal: 4,
    backgroundColor: "#D9480F",
    borderWidth: 1.5,
    borderColor: "#FFF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  navBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
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
  stateBoxInline: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 12,
  },
  heroCard: {
    borderRadius: 30,
    backgroundColor: "#F28C00",
    padding: 20,
    marginBottom: 16,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 6,
  },
  heroBody: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  heroStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  heroStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  heroStatusPillMuted: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  heroStatusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  heroStatusTextMuted: {
    color: "#FFF7EA",
    fontSize: 12,
    fontWeight: "800",
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
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "700",
  },
  tipCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.16)",
    backgroundColor: "#FFF6E8",
    padding: 16,
    marginBottom: 18,
  },
  tipHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipLabel: {
    color: "#B66900",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tipBody: {
    color: "#6F5230",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  section: {
    marginBottom: 20,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#261307",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  seeAllText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "900",
  },
  sectionCount: {
    color: "#D97706",
    fontSize: 14,
    fontWeight: "900",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickAction: {
    width: "47%",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.18)",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 16,
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#FFF2D9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
    lineHeight: 18,
  },
  notificationCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 14,
    marginBottom: 10,
  },
  notificationCardUnread: {
    borderColor: "rgba(245,154,35,0.28)",
    backgroundColor: "#FFF7EA",
  },
  notificationTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },
  notificationTitle: {
    color: "#261307",
    fontSize: 15,
    fontWeight: "900",
    flex: 1,
  },
  notificationTime: {
    color: "#9A7040",
    fontSize: 11,
    fontWeight: "700",
  },
  notificationMessage: {
    color: "#6F5230",
    fontSize: 13,
    lineHeight: 19,
  },
  helperCard: {
    borderRadius: 18,
    backgroundColor: "#FFF6E8",
    padding: 14,
    marginBottom: 12,
  },
  helperCardTitle: {
    color: "#B66900",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  helperCardBody: {
    color: "#7A5C35",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
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
  dateFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "rgba(210,160,60,0.35)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.96)",
    color: "#2A1500",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  clearButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#FFF1D8",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: {
    color: "#B66900",
    fontSize: 12,
    fontWeight: "800",
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
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  requestAvatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFF1D8",
    alignItems: "center",
    justifyContent: "center",
  },
  requestAvatarText: {
    color: "#B66900",
    fontSize: 16,
    fontWeight: "900",
  },
  requestHeaderBody: {
    flex: 1,
    gap: 3,
  },
  requestName: {
    color: "#261307",
    fontSize: 16,
    fontWeight: "900",
  },
  requestSub: {
    color: "#8B6A42",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  workflowCard: {
    borderRadius: 18,
    backgroundColor: "#FFF9EF",
    padding: 12,
    gap: 8,
  },
  workflowLabel: {
    color: "#B66900",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  workflowRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  workflowStep: {
    borderRadius: 999,
    backgroundColor: "#F3E3C4",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  workflowStepActive: {
    backgroundColor: "#FF9900",
  },
  workflowStepComplete: {
    backgroundColor: "#F6C87A",
  },
  workflowStepText: {
    color: "#8B6A42",
    fontSize: 11,
    fontWeight: "800",
  },
  workflowStepTextActive: {
    color: "#FFFFFF",
  },
  requestPetCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  requestImage: {
    width: 74,
    height: 74,
    borderRadius: 20,
    backgroundColor: "#FEE9BF",
  },
  requestPetBody: {
    flex: 1,
    gap: 4,
  },
  requestPetName: {
    color: "#261307",
    fontSize: 15,
    fontWeight: "900",
  },
  metaGrid: {
    gap: 8,
  },
  metaItem: {
    borderRadius: 16,
    backgroundColor: "#FFF6E8",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaLabel: {
    color: "#B66900",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    color: "#4F2A00",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  requestMessage: {
    color: "#5F4321",
    fontSize: 13,
    lineHeight: 20,
  },
  visitNoteCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.16)",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  visitNoteText: {
    color: "#6F5230",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  editorCard: {
    borderRadius: 18,
    backgroundColor: "#FFF7EA",
    padding: 12,
    gap: 10,
  },
  editorInput: {
    borderWidth: 1.5,
    borderColor: "rgba(210,160,60,0.35)",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    color: "#2A1500",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  meetingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  meetingChip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.22)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  meetingChipActive: {
    backgroundColor: "#FF9900",
    borderColor: "#FF9900",
  },
  meetingChipText: {
    color: "#9A6C30",
    fontSize: 12,
    fontWeight: "800",
  },
  meetingChipTextActive: {
    color: "#FFFFFF",
  },
  editorTextarea: {
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: "rgba(210,160,60,0.35)",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    color: "#2A1500",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editorActions: {
    gap: 10,
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
    paddingHorizontal: 14,
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
    paddingHorizontal: 14,
  },
  ghostButtonText: {
    color: "#8A5200",
    fontSize: 14,
    fontWeight: "800",
  },
  dangerButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#FFF0ED",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  dangerButtonText: {
    color: "#C2410C",
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  petActions: {
    gap: 8,
  },
  iconOnlyButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#FFF6E8",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 16,
    marginBottom: 12,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#FFF1D8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  profileBody: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: "#261307",
    fontSize: 16,
    fontWeight: "900",
  },
  profileRole: {
    color: "#8B6A42",
    fontSize: 12,
    fontWeight: "700",
  },
  profileInfoList: {
    gap: 10,
  },
  profileInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  profileInfoLabel: {
    color: "#8B6A42",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  profileInfoValue: {
    color: "#261307",
    fontSize: 12,
    fontWeight: "800",
    flex: 1.2,
    textAlign: "right",
  },
  miniStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  miniStatCard: {
    width: "47%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  miniStatLabel: {
    color: "#8B6A42",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  miniStatValue: {
    color: "#C26B00",
    fontSize: 24,
    fontWeight: "900",
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.94)",
    padding: 12,
    marginBottom: 10,
  },
  historyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  historyBody: {
    flex: 1,
    gap: 3,
  },
  historyName: {
    color: "#261307",
    fontSize: 15,
    fontWeight: "900",
  },
  historySub: {
    color: "#8B6A42",
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
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
