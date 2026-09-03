import * as Location from "expo-location";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const openLocationSettings = () => {
  if (Platform.OS === "android") {
    Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS").catch(() => {
      Linking.openSettings();
    });
    return;
  }

  Linking.openURL("app-settings:").catch(() => Linking.openSettings());
};

import { MobileAppShell } from "@/components/mobile-app-shell";
import { ApiError, getNearbyVetClinics } from "@/lib/api";

type VetClinic = {
  place_id: string;
  name: string;
  address: string;
  rating: number | null;
  user_ratings_total: number | null;
  is_open_now: boolean | null;
  distance_km: number | null;
  maps_url: string;
};

type Stage =
  | "loading"
  | "permission-denied"
  | "services-disabled"
  | "results"
  | "empty"
  | "unavailable"
  | "error";

export default function VetsScreen() {
  const [stage, setStage] = useState<Stage>("loading");
  const [clinics, setClinics] = useState<VetClinic[]>([]);
  const [errorText, setErrorText] = useState("");

  const load = useCallback(async () => {
    setStage("loading");
    setErrorText("");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setStage("permission-denied");
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStage("services-disabled");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const response = await getNearbyVetClinics(
        position.coords.latitude,
        position.coords.longitude,
      );

      const results: VetClinic[] = response?.results || [];
      setClinics(results);
      setStage(results.length > 0 ? "results" : "empty");
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        setStage("unavailable");
        return;
      }

      setErrorText(
        error instanceof Error ? error.message : "Couldn't find vet clinics right now.",
      );
      setStage("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <MobileAppShell scroll={stage === "results"} subtitle="Nearby veterinary clinics" title="Vet clinics">
      {stage === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color="#F18700" size="large" />
          <Text style={styles.helperText}>Finding clinics near you...</Text>
        </View>
      ) : null}

      {stage === "permission-denied" ? (
        <View style={styles.center}>
          <MaterialCommunityIcons color="#D97706" name="map-marker-off-outline" size={40} />
          <Text style={styles.title}>Location access needed</Text>
          <Text style={styles.helperText}>
            Allow location access so we can show vet clinics near where you are.
          </Text>
          <Pressable onPress={() => void load()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {stage === "services-disabled" ? (
        <View style={styles.center}>
          <MaterialCommunityIcons color="#D97706" name="crosshairs-gps" size={40} />
          <Text style={styles.title}>Turn on your location</Text>
          <Text style={styles.helperText}>
            Your phone's location is switched off. Turn it on so we can show vet clinics near you.
          </Text>
          <Pressable onPress={openLocationSettings} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Turn on location</Text>
          </Pressable>
          <Pressable onPress={() => void load()} style={styles.secondaryLink}>
            <Text style={styles.secondaryLinkText}>I turned it on, try again</Text>
          </Pressable>
        </View>
      ) : null}

      {stage === "unavailable" ? (
        <View style={styles.center}>
          <MaterialCommunityIcons color="#D97706" name="hospital-box-outline" size={40} />
          <Text style={styles.title}>Not set up yet</Text>
          <Text style={styles.helperText}>
            Nearby vet search isn't turned on yet. Ask the app admin to add a Google Places API
            key.
          </Text>
        </View>
      ) : null}

      {stage === "error" ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorText}</Text>
          <Pressable onPress={() => void load()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {stage === "empty" ? (
        <View style={styles.center}>
          <Text style={styles.helperText}>No vet clinics found nearby. Try again later.</Text>
        </View>
      ) : null}

      {stage === "results" ? (
        <View style={styles.list}>
          <Text style={styles.note}>
            Distances and ratings come from Google Maps. Call ahead to confirm consultation fees.
          </Text>
          {clinics.map((clinic) => (
            <View key={clinic.place_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{clinic.name}</Text>
                {clinic.distance_km !== null ? (
                  <Text style={styles.cardDistance}>{clinic.distance_km} km</Text>
                ) : null}
              </View>
              {clinic.address ? <Text style={styles.cardAddress}>{clinic.address}</Text> : null}
              <View style={styles.cardMetaRow}>
                {clinic.rating ? (
                  <View style={styles.metaChip}>
                    <MaterialCommunityIcons color="#B66900" name="star" size={13} />
                    <Text style={styles.metaChipText}>
                      {clinic.rating} ({clinic.user_ratings_total || 0})
                    </Text>
                  </View>
                ) : null}
                {clinic.is_open_now !== null ? (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>
                      {clinic.is_open_now ? "Open now" : "Closed now"}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => Linking.openURL(clinic.maps_url)}
                style={styles.directionsButton}
              >
                <MaterialCommunityIcons color="#FFFFFF" name="map-marker-radius" size={15} />
                <Text style={styles.directionsButtonText}>Get directions</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  title: {
    color: "#1C1207",
    fontSize: 18,
    fontWeight: "900",
  },
  helperText: {
    color: "#7A5C35",
    fontSize: 14,
    lineHeight: 21,
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
    minWidth: 160,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryLink: {
    paddingVertical: 6,
  },
  secondaryLinkText: {
    color: "#B66900",
    fontSize: 13,
    fontWeight: "700",
  },
  list: {
    gap: 12,
    paddingBottom: 20,
  },
  note: {
    color: "#9A7444",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,154,35,0.16)",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  cardName: {
    flex: 1,
    color: "#1C1207",
    fontSize: 16,
    fontWeight: "900",
  },
  cardDistance: {
    color: "#C16D00",
    fontSize: 13,
    fontWeight: "800",
  },
  cardAddress: {
    color: "#7A5C35",
    fontSize: 13,
    lineHeight: 19,
  },
  cardMetaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "#FFF1D8",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaChipText: {
    color: "#8A5200",
    fontSize: 11,
    fontWeight: "800",
  },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#F18700",
    marginTop: 4,
  },
  directionsButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
