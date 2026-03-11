import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Role, ROLE_LABELS } from "@/types/case";
import {
  type OperativeRole,
  OPERATIVE_ROLE_SHORT_LABELS,
  isOperativeRole,
} from "@/types/operativeRole";

interface RoleBadgeProps {
  role: Role | OperativeRole;
  size?: "small" | "medium";
}

export function RoleBadge({ role, size = "medium" }: RoleBadgeProps) {
  const { theme } = useTheme();

  const getRoleColor = () => {
    // New OperativeRole values
    if (isOperativeRole(role)) {
      switch (role) {
        case "SURGEON":
          return theme.rolePrimary;
        case "FIRST_ASST":
        case "SECOND_ASST":
          return theme.roleAssistant;
        case "OBSERVER":
          return theme.textSecondary;
        case "SUPERVISOR":
          return theme.roleSupervising;
        default:
          return theme.textSecondary;
      }
    }
    // Legacy Role values
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

  const getLabel = (): string => {
    if (isOperativeRole(role)) {
      return OPERATIVE_ROLE_SHORT_LABELS[role];
    }
    return ROLE_LABELS[role as Role] ?? role;
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
        {getLabel()}
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
