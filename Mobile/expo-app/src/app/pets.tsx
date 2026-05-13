import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";

import { listPets } from "@/lib/api";
import { MobileAppShell } from "@/components/mobile-app-shell";

type PetRecord = {
  id: string;
  name: string;
  type: string;
  breed?: string;
  species?: string;
  custom_species?: string;
  status?: string;
  city?: string;
  location?: string;
  imageUrl: string;
};

const toTitleCase = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

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

const normalizePet = (pet: any): PetRecord => ({
  id: String(pet.id),
  name: pet.name || "Meet this pet",
  type: resolvePetType(pet),
  breed: pet.breed || "",
  species: pet.species || "",
  custom_species: pet.custom_species || "",
  status: pet.status || "available",
  city: pet.city || "",
  location: pet.location || "",
  imageUrl: getPetImageUrl(pet),
});

const getPetTypeValue = (pet: PetRecord) => String(pet.type || "other").trim().toLowerCase();
const getPetTypeLabel = (pet: PetRecord) => toTitleCase(pet.type);

export default function PetsScreen() {
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const fetchPets = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError("");
      const response = await listPets();
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
