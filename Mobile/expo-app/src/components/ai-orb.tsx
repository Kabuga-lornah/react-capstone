import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type AiOrbProps = {
  size?: number;
  speaking?: boolean;
};

export function AiOrb({ size = 240, speaking = true }: AiOrbProps) {
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(speaking ? 1.08 : 1.03, {
          duration: speaking ? 700 : 1100,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(speaking ? 0.96 : 0.98, {
          duration: speaking ? 420 : 900,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      true,
    );

    glow.value = withRepeat(
      withTiming(speaking ? 0.7 : 0.42, {
        duration: speaking ? 800 : 1400,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [glow, pulse, speaking]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: pulse.value + 0.12 }],
  }));

  return (
    <View style={[styles.wrap, { width: size + 48, height: size + 48 }]}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: size + 36,
            height: size + 36,
            borderRadius: (size + 36) / 2,
          },
          haloStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          coreStyle,
        ]}
      >
        <View style={styles.innerShine} />
        <MaterialCommunityIcons color="#FFF3D9" name="paw" size={Math.round(size * 0.32)} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    backgroundColor: "rgba(255, 168, 40, 0.28)",
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFB347",
    borderWidth: 6,
    borderColor: "rgba(255,255,255,0.72)",
    shadowColor: "#E07800",
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  innerShine: {
    position: "absolute",
    top: "18%",
    left: "18%",
    width: "38%",
    height: "28%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.38)",
  },
});
