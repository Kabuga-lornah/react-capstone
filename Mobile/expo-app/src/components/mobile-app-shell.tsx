import { router, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAccessToken, getUnreadNotificationCount } from "@/lib/api";

type MobileAppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
};

const tabs = [
  { label: "Pets", path: "/pets", icon: "P" },
  { label: "Chats", path: "/chats", icon: "C" },
  { label: "Profile", path: "/profile", icon: "U" },
] as const;

export function MobileAppShell({
  title,
  subtitle,
  children,
  scroll = false,
}: MobileAppShellProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingUnreadCount, setLoadingUnreadCount] = useState(true);

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
            <Text style={styles.iconButtonText}>A</Text>
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
          <Pressable onPress={() => router.push("/profile")} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>U</Text>
          </Pressable>
        </View>
      </View>

      <BodyComponent {...bodyProps}>{children}</BodyComponent>

      <View style={styles.bottomNav}>
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.path ||
            (tab.path === "/chats" && pathname.startsWith("/chats")) ||
            (tab.path === "/profile" && pathname.startsWith("/profile"));

          return (
            <Pressable
              key={tab.path}
              onPress={() => router.replace(tab.path as never)}
              style={styles.navItem}
            >
              <View style={[styles.navIcon, isActive ? styles.navIconActive : null]}>
                <Text style={[styles.navIconText, isActive ? styles.navIconTextActive : null]}>
                  {tab.icon}
                </Text>
              </View>
              <Text style={[styles.navLabel, isActive ? styles.navLabelActive : null]}>
                {tab.label}
              </Text>
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
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.22)",
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonText: {
    color: "#B66900",
    fontSize: 13,
    fontWeight: "900",
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
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.18)",
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: "center",
    gap: 6,
    minWidth: 72,
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
  navIconText: {
    color: "#B66900",
    fontSize: 12,
    fontWeight: "900",
  },
  navIconTextActive: {
    color: "#FFFFFF",
  },
  navLabel: {
    color: "#9A7040",
    fontSize: 11,
    fontWeight: "700",
  },
  navLabelActive: {
    color: "#D97706",
  },
});
