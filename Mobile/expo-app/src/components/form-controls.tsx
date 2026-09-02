import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Option = { value: string; label: string };

type PillGroupProps = {
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
};

export function PillGroup({ options, value, onChange }: PillGroupProps) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.pill, isActive ? styles.pillActive : null]}
          >
            <Text style={[styles.pillText, isActive ? styles.pillTextActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ChipMultiSelectProps = {
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
};

export function ChipMultiSelect({ options, value, onChange }: ChipMultiSelectProps) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
      return;
    }

    onChange([...value, option]);
  };

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isActive = value.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => toggle(option)}
            style={[styles.pill, isActive ? styles.pillActive : null]}
          >
            <Text style={[styles.pillText, isActive ? styles.pillTextActive : null]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(245,154,35,0.28)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillActive: {
    backgroundColor: "#F18700",
    borderColor: "#F18700",
  },
  pillText: {
    color: "#8A5200",
    fontSize: 13,
    fontWeight: "700",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
});
