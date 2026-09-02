import { router, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";

import { AiOrb } from "@/components/ai-orb";
import { ApiError, getAccessToken, getPetDetail, visualizePetInRoom } from "@/lib/api";
import { speakText } from "@/lib/aiCompanion";
import { useAuth } from "@/context/auth";
import { normalizeLanguage } from "@/lib/soniPhrases";

type Stage = "intro" | "generating" | "result" | "error";

export default function VisualizeInRoomScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { userData } = useAuth();
  const language = normalizeLanguage(userData?.preferred_language);
  const isLoggedIn = Boolean(getAccessToken());

  const [petName, setPetName] = useState("this pet");
  const [roomUri, setRoomUri] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("intro");
  const [statusText, setStatusText] = useState(
    "Show me a photo of your space, and I'll picture them there.",
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    getPetDetail(id)
      .then((pet) => setPetName(pet?.name || "this pet"))
      .catch(() => undefined);
  }, [id]);

  const runVisualization = async (pickerResult: ImagePicker.ImagePickerResult) => {
    if (pickerResult.canceled || !pickerResult.assets?.[0]) {
      return;
    }

    if (!id) {
      return;
    }

    const asset = pickerResult.assets[0];
    setRoomUri(asset.uri);
    setResultUrl(null);
    setStage("generating");
    const thinking = `Let me picture ${petName} in your space...`;
    setStatusText(thinking);
    void speakText(thinking, language);

    try {
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { base64: true, compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );

      if (!compressed.base64) {
        throw new Error("Could not process that photo. Please try another one.");
      }

      const response = await visualizePetInRoom(id, {
        room_image_base64: compressed.base64,
        mime_type: "image/jpeg",
      });

      setResultUrl(response.image_url);
      setStage("result");
      const done = `Here's how ${petName} might look in your space.`;
      setStatusText(done);
      void speakText(done, language);
    } catch (error) {
      setStage("error");

      if (error instanceof ApiError && error.status === 503) {
        setStatusText(
          "This feature isn't turned on yet. Ask the app admin to add an image AI key.",
        );
        return;
      }

      setStatusText(
        error instanceof Error
          ? error.message
          : "I couldn't create that visualization. Please try again.",
      );
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Photos access needed", "Allow photo library access to choose a room photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    await runVisualization(result);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Camera access needed", "Allow camera access to photograph your space.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    await runVisualization(result);
  };

  const handleSave = async () => {
    if (!resultUrl) {
      return;
    }

    try {
      setIsSaving(true);
      const permission = await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Photos access needed", "Allow photo access to save this picture.");
        return;
      }

      const localUri = `${FileSystem.cacheDirectory}pet-visualization-${Date.now()}.png`;
      const download = await FileSystem.downloadAsync(resultUrl, localUri);
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Alert.alert("Saved", "The picture was saved to your photos.");
    } catch {
      Alert.alert("Couldn't save", "Something went wrong saving this picture.");
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setRoomUri(null);
    setResultUrl(null);
    setStage("intro");
    setStatusText("Show me a photo of your space, and I'll picture them there.");
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerBox}>
          <Text style={styles.centerText}>Please log in to try the room visualizer.</Text>
          <Pressable onPress={() => router.push("/login")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <AiOrb size={96} speaking={stage === "generating"} />
          <Text style={styles.title}>See {petName} in your space</Text>
          <Text style={styles.status}>{statusText}</Text>
        </View>

        {stage === "generating" ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#F18700" size="large" />
          </View>
        ) : null}

        {stage === "result" && resultUrl ? (
          <View style={styles.resultBlock}>
            <Text style={styles.imageLabel}>With {petName}</Text>
            <Image contentFit="cover" source={{ uri: resultUrl }} style={styles.resultImage} />

            {roomUri ? (
              <>
                <Text style={styles.imageLabel}>Your original photo</Text>
                <Image contentFit="cover" source={{ uri: roomUri }} style={styles.beforeImage} />
              </>
            ) : null}

            <Pressable
              disabled={isSaving}
              onPress={handleSave}
              style={[styles.primaryButton, isSaving ? styles.buttonDisabled : null]}
            >
              <Text style={styles.primaryButtonText}>
                {isSaving ? "Saving..." : "Save to photos"}
              </Text>
            </Pressable>
            <Pressable onPress={reset} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Try another photo</Text>
            </Pressable>
          </View>
        ) : null}

        {stage === "error" ? (
          <Pressable onPress={reset} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        ) : null}

        {stage === "intro" || stage === "error" ? (
          <View style={styles.pickerRow}>
            <Pressable onPress={pickFromLibrary} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Choose a photo</Text>
            </Pressable>
            <Pressable onPress={takePhoto} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Take a photo</Text>
            </Pressable>
          </View>
        ) : null}
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
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  backButtonText: {
    color: "#B66900",
    fontSize: 13,
    fontWeight: "800",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    marginTop: 14,
    color: "#1C1207",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  status: {
    marginTop: 8,
    color: "#7A5C35",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 24,
  },
  pickerRow: {
    gap: 12,
    marginTop: 8,
  },
  resultBlock: {
    gap: 10,
  },
  imageLabel: {
    color: "#9A7444",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
  },
  resultImage: {
    width: "100%",
    height: 320,
    borderRadius: 22,
    backgroundColor: "#FEE9BF",
  },
  beforeImage: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: "#FEE9BF",
    opacity: 0.85,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#F18700",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 52,
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
  buttonDisabled: {
    opacity: 0.7,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  centerText: {
    color: "#7A5C35",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
