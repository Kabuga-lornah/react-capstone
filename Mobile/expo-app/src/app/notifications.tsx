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

import { MobileAppShell } from "@/components/mobile-app-shell";
import { getAccessToken, listNotifications, markNotificationRead } from "@/lib/api";

type NotificationRecord = {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  application_id?: number | null;
  conversation_id?: number | null;
  created_at?: string;
  actor?: {
    first_name?: string;
    last_name?: string;
    username?: string;
  } | null;
  pet?: {
    id?: number;
    name?: string;
  } | null;
};

const formatRelativeTime = (value?: string) => {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const elapsed = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < hour) {
    const minutes = Math.max(1, Math.round(elapsed / minute));
    return `${minutes}m ago`;
  }

  if (elapsed < day) {
    const hours = Math.round(elapsed / hour);
    return `${hours}h ago`;
  }

  const days = Math.round(elapsed / day);
  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const getActorName = (notification: NotificationRecord) => {
  const actor = notification.actor;
  if (!actor) {
    return "";
  }

  const fullName = `${actor.first_name || ""} ${actor.last_name || ""}`.trim();
  return fullName || actor.username || "";
};

const getTypeLabel = (type?: string) =>
  String(type || "update")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const hasSession = Boolean(getAccessToken());

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const fetchNotifications = async (isRefreshing = false) => {
    if (!getAccessToken()) {
      setNotifications([]);
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
      const response = await listNotifications();
      const records = Array.isArray(response) ? response : response?.results || [];
      setNotifications(records);
    } catch (error: any) {
      setErrorMessage(error?.message || "We could not load alerts right now.");
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationPress = async (notification: NotificationRecord) => {
    if (!notification.read) {
      try {
        const updatedNotification = await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((entry) =>
            entry.id === notification.id ? { ...entry, ...(updatedNotification || {}), read: true } : entry,
          ),
        );
      } catch {
        setNotifications((current) =>
          current.map((entry) =>
            entry.id === notification.id ? { ...entry, read: true } : entry,
          ),
        );
      }
    }

    if (notification.conversation_id) {
      router.push(`/chats/${notification.conversation_id}` as never);
      return;
    }

    if (notification.pet?.id) {
      router.push(`/pet/${notification.pet.id}` as never);
    }
  };

  return (
    <MobileAppShell
      title="Alerts"
      subtitle={
        !hasSession
          ? "Your mobile session needs a quick login refresh before we can load protected updates."
          : unreadCount > 0
          ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"} waiting for you.`
          : "Catch up on request updates, wishlist activity, and chat moments."
      }
    >
      {!hasSession ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Your session expired on this device.</Text>
          <Text style={styles.stateSubtext}>
            Log in again and your alerts, chats, and other protected screens will be available.
          </Text>
          <Pressable onPress={() => router.replace("/")} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Back to login</Text>
          </Pressable>
        </View>
      ) : (
      <FlatList
        contentContainerStyle={styles.listContent}
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            onRefresh={() => fetchNotifications(true)}
            refreshing={refreshing}
            tintColor="#F18700"
          />
        }
        renderItem={({ item }) => {
          const actorName = getActorName(item);

          return (
            <Pressable
              onPress={() => handleNotificationPress(item)}
              style={[styles.card, !item.read ? styles.cardUnread : null]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.typePill}>{getTypeLabel(item.type)}</Text>
                  {!item.read ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.timeText}>{formatRelativeTime(item.created_at)}</Text>
              </View>

              <Text style={styles.title}>{item.title || "New update"}</Text>
              <Text style={styles.message}>{item.message || "Open this notification to see more."}</Text>

              <View style={styles.footer}>
                <Text style={styles.metaText}>
                  {actorName
                    ? `From ${actorName}`
                    : item.pet?.name
                      ? `About ${item.pet.name}`
                      : "Tap to open"}
                </Text>
                <Text style={styles.openText}>
                  {item.conversation_id
                    ? "Open chat"
                    : item.pet?.id
                      ? "View pet"
                      : "Mark read"}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#F18700" size="small" />
              <Text style={styles.stateText}>Loading alerts...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable onPress={() => fetchNotifications()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>No alerts yet.</Text>
              <Text style={styles.stateSubtext}>
                When someone messages you or responds to a request, it will show up here.
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.14)",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 18,
    gap: 10,
  },
  cardUnread: {
    borderColor: "rgba(245,154,35,0.32)",
    backgroundColor: "#FFF7EA",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  typePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#FFF1D8",
    color: "#B66900",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#F18700",
  },
  timeText: {
    color: "#9A7040",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: "#261307",
    fontSize: 18,
    fontWeight: "900",
  },
  message: {
    color: "#6F5230",
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 2,
  },
  metaText: {
    color: "#8B6A42",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  openText: {
    color: "#D97706",
    fontSize: 12,
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
  retryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#F18700",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
