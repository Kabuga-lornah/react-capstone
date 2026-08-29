import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { useAuth } from "@/context/auth";
import { MobileAppShell } from "@/components/mobile-app-shell";

const AI_PROMPTS = [
  "I want a calm, low-maintenance companion.",
  "I need a playful dog for active days.",
  "Something friendly and easy for my apartment.",
];

const AI_RESPONSES = {
  default:
    "Tell me about your home, routine, and what kind of pet energy matches your lifestyle. I'll guide you to the perfect match.",
  calm: "A quieter companion with lower daily stimulation usually fits best. Look for gentle, patient pets and keep the home environment predictable.",
  active:
    "You probably want a high-energy match—active dogs and playful companions thrive with daily exercise and enrichment.",
  apartment:
    "Apartment-friendly pets often lean toward calm, adaptable companions. Cats, rabbits, and gentle social pets do especially well in smaller spaces.",
};

export default function AIHomeScreen() {
  const { userData } = useAuth();
  const firstName = userData?.first_name || userData?.username || "Friend";
  const [aiInput, setAiInput] = useState("");
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(-1);
  const [heartbeatAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeatAnim, {
          toValue: 1.08,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 0.96,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1.12,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 0.98,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [heartbeatAnim]);

  return (
    <MobileAppShell
      title="Find your perfect match"
      subtitle="Let's talk about your home and lifestyle"
      scroll
    >
      {/* Hero with Heartbeat */}
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
          <Text style={styles.heroSub}>
            Tell me about your home, and I'll help you find the right pet.
          </Text>
        </View>

        <Animated.View
          style={[
            styles.heartbeatWrap,
            { transform: [{ scale: heartbeatAnim }] },
          ]}
        >
          <View style={styles.heartbeatCore}>
            <View style={styles.heartbeatRing} />
            <View style={[styles.heartbeatRing, styles.heartbeatRingMid]} />
            <View style={styles.heartbeatPulse}>
              <Text style={styles.heartbeatEmoji}>🐾</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Room Preview */}
      <View style={styles.roomCard}>
        <View style={styles.roomLeft}>
          <Text style={styles.roomLabel}>Home Fit Check</Text>
          <Text style={styles.roomTitle}>Scan your space</Text>
          <Text style={styles.roomDesc}>
            Describe your living room and preview a pet in it before you commit.
          </Text>
        </View>
        <View style={styles.roomPreview}>
          <View style={styles.roomWall} />
          <View style={styles.roomSofa} />
          <View style={styles.roomPet}>🐕</View>
        </View>
      </View>

      {/* AI Assistant */}
      <View style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeEmoji}>✨</Text>
            <Text style={styles.aiBadgeText}>AI Match</Text>
          </View>
        </View>

        <View style={styles.aiPrompts}>
          {AI_PROMPTS.map((prompt, idx) => (
            <Pressable
              key={idx}
              style={[
                styles.aiPromptBtn,
                selectedPromptIndex === idx && styles.aiPromptBtnActive,
              ]}
              onPress={() => setSelectedPromptIndex(idx)}
            >
              <Text
                style={[
                  styles.aiPromptText,
                  selectedPromptIndex === idx && styles.aiPromptTextActive,
                ]}
              >
                {prompt}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.aiInputRow}>
          <TextInput
            style={styles.aiInput}
            placeholder="Tell me about your home..."
            placeholderTextColor="#b08a58"
            value={aiInput}
            onChangeText={setAiInput}
            multiline
          />
        </View>

        <View style={styles.aiActions}>
          <Pressable style={styles.aiVoiceBtn}>
            <MaterialCommunityIcons name="microphone-outline" size={18} color="#f59a23" />
          </Pressable>
          <Pressable style={styles.aiSendBtn}>
            <Text style={styles.aiSendBtnText}>Ask AI</Text>
          </Pressable>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/quiz")}
          >
            <View style={styles.actionIcon}>❓</View>
            <Text style={styles.actionTitle}>Quiz</Text>
            <Text style={styles.actionSub}>Take the quiz</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/chats")}
          >
            <View style={styles.actionIcon}>💬</View>
            <Text style={styles.actionTitle}>Chats</Text>
            <Text style={styles.actionSub}>Message adopters</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push("/profile")}
          >
            <View style={styles.actionIcon}>👤</View>
            <Text style={styles.actionTitle}>Profile</Text>
            <Text style={styles.actionSub}>Your details</Text>
          </Pressable>
        </View>
      </View>

      {/* Browse Pets Button */}
      <Pressable
        style={styles.browsePetsBtn}
        onPress={() => router.push("/pet-pouch")}
      >
        <Text style={styles.browsePetsBtnText}>Browse All Pets</Text>
      </Pressable>

      <View style={styles.spacer} />
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1c1207",
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    color: "#6b4e2a",
    lineHeight: 1.5,
  },
  heartbeatWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 96,
    height: 96,
  },
  heartbeatCore: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(245, 154, 35, 0.3)",
    shadowColor: "#b45309",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  heartbeatRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  heartbeatRingMid: {
    width: 124,
    height: 124,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  heartbeatPulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
  },
  heartbeatEmoji: {
    fontSize: 20,
  },
  roomCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(245, 154, 35, 0.2)",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  roomLeft: {
    flex: 1,
  },
  roomLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#d97706",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c1207",
    marginBottom: 4,
  },
  roomDesc: {
    fontSize: 11,
    color: "#6b4e2a",
    lineHeight: 1.4,
  },
  roomPreview: {
    width: 100,
    height: 80,
    backgroundColor: "linear-gradient(180deg, #f3e6d2 0%, #f9f3ea 100%)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(245, 154, 35, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  roomWall: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  roomSofa: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 12,
    height: 20,
    backgroundColor: "#a0622f",
    borderRadius: 10,
  },
  roomPet: {
    position: "absolute",
    right: 12,
    bottom: 16,
    fontSize: 28,
  },
  aiCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "rgba(255, 245, 220, 0.9)",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(245, 154, 35, 0.26)",
    padding: 14,
  },
  aiHeader: {
    marginBottom: 12,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 154, 35, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  aiBadgeEmoji: {
    fontSize: 12,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#d97706",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  aiPrompts: {
    gap: 6,
    marginBottom: 12,
  },
  aiPromptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 247, 230, 0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 154, 35, 0.2)",
  },
  aiPromptBtnActive: {
    backgroundColor: "rgba(245, 154, 35, 0.14)",
    borderColor: "rgba(245, 154, 35, 0.4)",
  },
  aiPromptText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#b45309",
  },
  aiPromptTextActive: {
    color: "#1c1207",
    fontWeight: "700",
  },
  aiInputRow: {
    marginBottom: 10,
  },
  aiInput: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(245, 154, 35, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: "#1c1207",
    minHeight: 44,
  },
  aiActions: {
    flexDirection: "row",
    gap: 8,
  },
  aiVoiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(245, 154, 35, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiSendBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f59a23",
    alignItems: "center",
    justifyContent: "center",
  },
  aiSendBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  quickActions: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#d97706",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(245, 154, 35, 0.15)",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1c1207",
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 9,
    color: "#9d7a52",
  },
  browsePetsBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#f59a23",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  browsePetsBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  spacer: {
    height: 24,
  },
});

      const petsData = Array.isArray(response) ? response : response?.results || [];
      setPets(petsData.map(normalizePet));
    } catch (error: any) {
      setLoadError(error?.message || "Failed to load pets. Please try again.");
      setPets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const petTypeOptions = useMemo(() => {
    const entries = new Map<string, string>();

    pets.forEach((pet) => {
      const value = getPetTypeValue(pet);
      if (!entries.has(value)) {
        entries.set(value, getPetTypeLabel(pet));
      }
    });

    return [
      { value: "all", label: "All" },
      ...Array.from(entries.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [pets]);

  const filteredPets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return pets.filter((pet) => {
      const matchesType = selectedType === "all" || getPetTypeValue(pet) === selectedType;

      if (!matchesType) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [pet.name, pet.breed, pet.type, pet.species, pet.city, pet.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [pets, searchTerm, selectedType]);

  return (
    <MobileAppShell
      title="Find your next companion"
      subtitle="Browse pets, search by name or breed, and narrow things down by pet type."
    >
      <View style={styles.searchShell}>
        <TextInput
          autoCapitalize="none"
          onChangeText={setSearchTerm}
          placeholder="Search by name, breed, or type..."
          placeholderTextColor="#B08A58"
          style={styles.searchInput}
          value={searchTerm}
        />
      </View>

      <FlatList
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {petTypeOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setSelectedType(option.value)}
                style={[
                  styles.filterChip,
                  selectedType === option.value ? styles.filterChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedType === option.value ? styles.filterChipTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        }
        contentContainerStyle={styles.listContent}
        data={filteredPets}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={filteredPets.length > 1 ? styles.columnWrap : undefined}
        refreshControl={
          <RefreshControl
            onRefresh={() => fetchPets(true)}
            refreshing={refreshing}
            tintColor="#F18700"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/pet/[id]",
                params: { id: item.id },
              })
            }
            style={styles.card}
          >
            <View style={styles.imageWrap}>
              <Image contentFit="cover" source={{ uri: item.imageUrl }} style={styles.image} />
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {item.status?.toLowerCase() === "available" ? "Available" : toTitleCase(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <Text numberOfLines={1} style={styles.petName}>
                {item.name}
              </Text>
              <Text numberOfLines={1} style={styles.petMeta}>
                {item.city || item.location || "Location coming soon"}
              </Text>
              <View style={styles.petTypePill}>
                <Text style={styles.petTypePillText}>{getPetTypeLabel(item)}</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#F18700" size="small" />
              <Text style={styles.stateText}>Loading pets...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.stateBox}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable onPress={() => fetchPets()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>No pets matched your search or filters.</Text>
              <Text style={styles.stateSubtext}>
                Try another name, breed, or pet type.
              </Text>
            </View>
          )
        }
      />
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  searchShell: {
    marginBottom: 10,
  },
  searchInput: {
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.25)",
    backgroundColor: "#FFFFFF",
    color: "#2A1500",
    fontSize: 14,
    paddingHorizontal: 18,
  },
  listContent: {
    paddingBottom: 28,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    paddingRight: 4,
    flexWrap: "wrap",
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
  columnWrap: {
    gap: 12,
  },
  card: {
    flex: 1,
    maxWidth: "48.5%",
    marginBottom: 14,
  },
  imageWrap: {
    position: "relative",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FEE9BF",
    height: 176,
  },
  image: {
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
  cardBody: {
    paddingTop: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,154,35,0.14)",
    paddingBottom: 12,
  },
  petName: {
    color: "#1C1207",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  petMeta: {
    color: "#8C6C45",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  petTypePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#FFF2D9",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  petTypePillText: {
    color: "#B45309",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
