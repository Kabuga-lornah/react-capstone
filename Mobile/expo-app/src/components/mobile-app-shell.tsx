import { router, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";
import {
  getAccessToken,
  getUnreadNotificationCount,
  listConversations,
  listReceivedApplications,
} from "@/lib/api";

type MobileAppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
};

const tabs = [
  { label: "Pets", path: "/pets", icon: "paw" },
  { label: "Pouch", path: "/pet-pouch", icon: "heart-outline" },
  { label: "Community", path: "/community", icon: "account-group-outline" },
  { label: "Chats", path: "/chats", icon: "chat-processing-outline" },
  { label: "Profile", path: "/profile", icon: "account-circle-outline" },
] as const;

const rehomerTabs = [
  { label: "Home", path: "/rehomer-dashboard", icon: "home-outline" },
  { label: "Requests", path: "/rehomer-requests", icon: "file-document-outline" },
  { label: "My Pets", path: "/rehomer-listings", icon: "paw-outline" },
  { label: "Chats", path: "/chats", icon: "chat-processing-outline" },
  { label: "Profile", path: "/rehomer-profile", icon: "account-circle-outline" },
] as const;

export function MobileAppShell({
  title,
  subtitle,
  children,
  scroll = false,
}: MobileAppShellProps) {
  const pathname = usePathname();
  const { userData } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingUnreadCount, setLoadingUnreadCount] = useState(true);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const isRehomer = userData?.role === "rehomer" || userData?.role === "shelter_admin";
  const navTabs = isRehomer ? rehomerTabs : tabs;

  useEffect(() => {
    let active = true;

    const loadUnreadCount = async () => {
      if (!getAccessToken()) {
        setUnreadCount(0);
        setLoadingUnreadCount(false);
        return;
      }

      try {
        setLoadingUnreadCount(true);
        const response = await getUnreadNotificationCount();

        if (!active) {
          return;
        }

        setUnreadCount(Number(response?.count || 0));
      } catch {
        if (active) {
          setUnreadCount(0);
        }
      } finally {
        if (active) {
          setLoadingUnreadCount(false);
        }
      }
    };

    loadUnreadCount();

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    let active = true;

    const loadRoleCounts = async () => {
      if (!getAccessToken() || !isRehomer) {
        setPendingRequestCount(0);
        setUnreadChatCount(0);
        return;
      }

      try {
        const [requestResponse, conversationsResponse] = await Promise.all([
          listReceivedApplications().catch(() => []),
          listConversations().catch(() => []),
        ]);

        if (!active) {
          return;
        }

        const requestResults = Array.isArray(requestResponse)
          ? requestResponse
          : requestResponse?.results || [];
        const conversationResults = Array.isArray(conversationsResponse)
          ? conversationsResponse
          : conversationsResponse?.results || [];

        setPendingRequestCount(
          requestResults.filter((request: any) => String(request?.status || "").toLowerCase() === "pending").length,
        );
        setUnreadChatCount(
          conversationResults.reduce(
            (total: number, conversation: any) => total + Number(conversation?.unread_count || 0),
            0,
          ),
        );
      } catch {
        if (active) {
          setPendingRequestCount(0);
          setUnreadChatCount(0);
        }
      }
    };

    void loadRoleCounts();

    return () => {
      active = false;
    };
  }, [isRehomer, pathname]);

  const BodyComponent = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? {
        contentContainerStyle: styles.scrollContent,
        showsVerticalScrollIndicator: false,
      }
    : {
        style: styles.body,
      };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>
            My<Text style={styles.brandAccent}>Furry</Text>Friends
          </Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/notifications")} style={styles.iconButton}>
            <MaterialCommunityIcons color="#B66900" name="bell-outline" size={18} />
            {loadingUnreadCount ? (
              <View style={styles.loadingBadge}>
                <ActivityIndicator color="#FFFFFF" size={10} />
              </View>
            ) : unreadCount > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => router.push(isRehomer ? "/rehomer-profile" : "/profile")} style={styles.iconButton}>
            <MaterialCommunityIcons color="#B66900" name="account-outline" size={18} />
          </Pressable>
        </View>
      </View>

      <BodyComponent {...bodyProps}>{children}</BodyComponent>

      <View style={styles.bottomNav}>
        {navTabs.map((tab) => {
          const isActive =
            pathname === tab.path ||
            (tab.path === "/pet-pouch" && pathname.startsWith("/pet-pouch")) ||
            (tab.path === "/community" && pathname.startsWith("/community")) ||
            (tab.path === "/chats" && pathname.startsWith("/chats")) ||
            (tab.path === "/profile" && pathname.startsWith("/profile")) ||
            (tab.path === "/rehomer-profile" && pathname.startsWith("/rehomer-profile"));

          return (
            <Pressable
              key={tab.path}
              onPress={() => router.replace(tab.path as never)}
              style={styles.navItem}
            >
              <View style={[styles.navIconWrap, isActive ? styles.navIconWrapActive : null]}>
                <View style={[styles.navIcon, isActive ? styles.navIconActive : null]}>
                  <MaterialCommunityIcons
                    color={isActive ? "#FFFFFF" : "#B66900"}
                    name={tab.icon}
                    size={17}
                  />
                </View>
              </View>
              <Text style={[styles.navLabel, isActive ? styles.navLabelActive : null]}>
                {tab.label}
              </Text>
              {isRehomer && tab.path === "/rehomer-requests" && pendingRequestCount > 0 ? (
                <View style={styles.requestBadge}>
                  <Text style={styles.requestBadgeText}>
                    {pendingRequestCount > 99 ? "99+" : pendingRequestCount}
                  </Text>
                </View>
              ) : null}
              {isRehomer && tab.path === "/chats" && unreadChatCount > 0 ? (
                <View style={styles.requestBadge}>
                  <Text style={styles.requestBadgeText}>
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF8EE",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  brand: {
    color: "#3D2000",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  brandAccent: {
    color: "#E87E00",
  },
  title: {
    color: "#221205",
    fontSize: 26,
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
  iconButton: {
    position: "relative",
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.22)",
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    position: "absolute",
    top: -4,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    paddingHorizontal: 4,
    backgroundColor: "#D9480F",
    borderWidth: 1.5,
    borderColor: "#FFF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBadge: {
    position: "absolute",
    top: -4,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#D97706",
    borderWidth: 1.5,
    borderColor: "#FFF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 96,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 96,
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
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: "#8A4B00",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  navItem: {
    alignItems: "center",
    gap: 4,
    minWidth: 58,
    flex: 1,
    position: "relative",
  },
  navIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  navIconWrapActive: {
    backgroundColor: "rgba(255,170,50,0.18)",
  },
  navIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,153,0,0.08)",
  },
  navIconActive: {
    backgroundColor: "#FF9900",
  },
  navLabel: {
    color: "#9A7040",
    fontSize: 10,
    fontWeight: "800",
  },
  navLabelActive: {
    color: "#D97706",
  },
  requestBadge: {
    position: "absolute",
    top: -2,
    right: 8,
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
  requestBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
});
