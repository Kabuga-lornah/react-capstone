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
import { getAccessToken, listConversations } from "@/lib/api";

type ConversationRecord = {
  id: number;
  pet?: {
    id?: number;
    name?: string;
    images?: Array<{ image_url?: string; image?: string; is_main?: boolean }>;
  } | null;
  other_participant?: {
    first_name?: string;
    last_name?: string;
    username?: string;
    email?: string;
  } | null;
  last_message?: {
    body?: string;
    created_at?: string;
    is_mine?: boolean;
  } | null;
  unread_count?: number;
  updated_at?: string;
};

const getConversationImage = (conversation: ConversationRecord) => {
  const images = Array.isArray(conversation.pet?.images) ? conversation.pet?.images : [];
  const main = images.find((image) => image.is_main);
  const fallback = images[0];

  return (
    main?.image_url ||
    fallback?.image_url ||
    main?.image ||
    fallback?.image ||
    "https://placehold.co/400x400/FEE9BF/8E5A14?text=Chat"
  );
};

const getParticipantName = (conversation: ConversationRecord) => {
  const participant = conversation.other_participant;
  if (!participant) {
    return "Conversation";
  }

  const fullName = `${participant.first_name || ""} ${participant.last_name || ""}`.trim();
  return fullName || participant.username || participant.email || "Conversation";
};

const formatTime = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const elapsed = Date.now() - date.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (elapsed < day) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (elapsed < 7 * day) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

export default function ChatsScreen() {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const hasSession = Boolean(getAccessToken());

  const unreadConversations = useMemo(
    () => conversations.filter((conversation) => Number(conversation.unread_count || 0) > 0).length,
    [conversations],
  );

  const fetchConversations = async (isRefreshing = false) => {
    if (!getAccessToken()) {
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
      const response = await listConversations();
      const records = Array.isArray(response) ? response : response?.results || [];
      setConversations(records);
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not load your chats right now.");
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <MobileAppShell
      title="Chats"
      subtitle={
        !hasSession
          ? "Log in again to open your protected conversations."
          : unreadConversations > 0
            ? `${unreadConversations} conversation${unreadConversations === 1 ? "" : "s"} waiting for your reply.`
            : "Keep up with adopters and rehomers in one place."
      }
    >
      {!hasSession ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Your session expired on this device.</Text>
          <Text style={styles.stateSubtext}>
            Log in again and your inbox will be ready here.
          </Text>
          <Pressable onPress={() => router.replace("/")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to login</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={conversations}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              onRefresh={() => fetchConversations(true)}
              refreshing={refreshing}
              tintColor="#F18700"
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/chats/${item.id}` as never)}
              style={styles.card}
            >
              <Image contentFit="cover" source={{ uri: getConversationImage(item) }} style={styles.avatar} />

              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text numberOfLines={1} style={styles.name}>
                    {getParticipantName(item)}
                  </Text>
                  <Text style={styles.timeText}>
                    {formatTime(item.last_message?.created_at || item.updated_at)}
                  </Text>
                </View>

                <Text numberOfLines={1} style={styles.petText}>
                  About {item.pet?.name || "this pet"}
                </Text>

                <View style={styles.messageRow}>
                  <Text numberOfLines={2} style={styles.preview}>
                    {item.last_message?.body
                      ? `${item.last_message.is_mine ? "You: " : ""}${item.last_message.body}`
                      : "Open this chat to start the conversation."}
                  </Text>

                  {Number(item.unread_count || 0) > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {Number(item.unread_count) > 99 ? "99+" : item.unread_count}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color="#F18700" size="small" />
                <Text style={styles.stateText}>Loading chats...</Text>
              </View>
            ) : errorMessage ? (
              <View style={styles.stateBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <Pressable onPress={() => fetchConversations()} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>No conversations yet.</Text>
                <Text style={styles.stateSubtext}>
                  When you message a rehomer from a pet detail page, the chat will appear here.
                </Text>
              </View>
            )
          }
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#FEE9BF",
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: {
    color: "#261307",
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  timeText: {
    color: "#9A7040",
    fontSize: 11,
    fontWeight: "700",
  },
  petText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  preview: {
    color: "#6F5230",
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
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
