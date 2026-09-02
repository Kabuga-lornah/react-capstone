import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { uploadImage } from "@/lib/api";

type PhotoPickerProps = {
  label: string;
  imageUrl: string;
  onChange: (url: string) => void;
};

export function PhotoPicker({ label, imageUrl, onChange }: PhotoPickerProps) {
  const [isUploading, setIsUploading] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Photos access needed", "Allow photo library access to add a picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    try {
      setIsUploading(true);
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { base64: true, compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
      );

      if (!compressed.base64) {
        throw new Error("Could not process that photo.");
      }

      const response = await uploadImage({
        image_base64: compressed.base64,
        mime_type: "image/jpeg",
      });

      onChange(response.url);
    } catch (error: any) {
      Alert.alert("Upload failed", error?.message || "Could not upload that photo. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Pressable disabled={isUploading} onPress={pickPhoto} style={styles.wrap}>
      {imageUrl ? (
        <Image contentFit="cover" source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons color="#B66900" name="camera-plus-outline" size={26} />
        </View>
      )}

      <View style={styles.labelRow}>
        {isUploading ? (
          <ActivityIndicator color="#F18700" size="small" />
        ) : (
          <MaterialCommunityIcons color="#B66900" name="upload-outline" size={14} />
        )}
        <Text style={styles.labelText}>
          {isUploading ? "Uploading..." : imageUrl ? `Change ${label}` : `Add ${label}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.24)",
    backgroundColor: "#FFF7EB",
    overflow: "hidden",
    marginBottom: 4,
  },
  image: {
    width: "100%",
    height: 160,
    backgroundColor: "#FEE9BF",
  },
  placeholder: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  labelText: {
    color: "#B66900",
    fontSize: 12,
    fontWeight: "800",
  },
});
