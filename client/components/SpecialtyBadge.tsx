import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SpecialtyIcon } from "@/components/SpecialtyIcon";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Specialty, SPECIALTY_LABELS } from "@/types/case";

interface SpecialtyBadgeProps {
  specialty: Specialty;
  showLabel?: boolean;
  size?: "small" | "medium" | "large";
}

export function SpecialtyBadge({
  specialty,
  showLabel = true,
  size = "medium",
}: SpecialtyBadgeProps) {
  const { theme } = useTheme();

  const iconSize = size === "small" ? 14 : size === "large" ? 20 : 16;
  const paddingH =
    size === "small" ? Spacing.sm : size === "large" ? Spacing.lg : Spacing.md;
  const paddingV =
    size === "small" ? Spacing.xs : size === "large" ? Spacing.md : Spacing.sm;
  const specialtyColor = theme.specialty[specialty];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: specialtyColor + "15",
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
      ]}
    >
      <SpecialtyIcon
        specialty={specialty}
        size={iconSize}
        color={specialtyColor}
      />
      {showLabel ? (
        <ThemedText
          style={[
            styles.text,
            { color: specialtyColor, fontSize: size === "small" ? 11 : 12 },
          ]}
        >
          {SPECIALTY_LABELS[specialty]}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  text: {
    fontWeight: "600",
  },
});
