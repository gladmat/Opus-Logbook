import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Role, ROLE_LABELS } from "@/types/case";

interface RoleBadgeProps {
  role: Role;
  size?: "small" | "medium";
}

export function RoleBadge({ role, size = "medium" }: RoleBadgeProps) {
  const { theme } = useTheme();

  const getRoleColor = () => {
    switch (role) {
      case "PS":
        return theme.rolePrimary;
      case "PP":
        return theme.link;
      case "AS":
        return theme.roleAssistant;
      case "ONS":
        return theme.textSecondary;
      case "SS":
      case "SNS":
        return theme.roleSupervising;
      case "A":
        return theme.roleTrainee;
      default:
        return theme.textSecondary;
    }
  };

  const isSmall = size === "small";

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSmall : styles.badgeMedium,
        { backgroundColor: getRoleColor() + "20" },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: getRoleColor() }]} />
      <ThemedText
        style={[
          isSmall ? styles.textSmall : styles.textMedium,
          { color: getRoleColor() },
        ]}
      >
        {ROLE_LABELS[role]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.full,
  },
  badgeSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  badgeMedium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  textSmall: {
    fontSize: 11,
    fontWeight: "600",
  },
  textMedium: {
    fontSize: 12,
    fontWeight: "600",
  },
});
