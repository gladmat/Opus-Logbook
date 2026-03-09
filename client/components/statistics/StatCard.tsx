import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  delta?: { value: number; label: string };
  size?: "small" | "large";
}

export const StatCard = React.memo(function StatCard({
  label,
  value,
  subtitle,
  delta,
  size = "small",
}: StatCardProps) {
  const { theme, isDark } = useTheme();

  const deltaColor =
    delta && delta.value > 0
      ? theme.success
      : delta && delta.value < 0
        ? theme.error
        : theme.textTertiary;
  const deltaSymbol =
    delta && delta.value > 0
      ? "\u25B2"
      : delta && delta.value < 0
        ? "\u25BC"
        : "\u2014";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
        !isDark && Shadows.card,
      ]}
    >
      {size === "small" && (
        <ThemedText
          style={[styles.labelSmall, { color: theme.textTertiary }]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      )}
      <ThemedText
        style={[
          size === "large" ? styles.valueLarge : styles.valueSmall,
          { color: theme.text },
        ]}
      >
        {value}
      </ThemedText>
      {size === "large" && (
        <ThemedText
          style={[styles.labelLarge, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      )}
      {subtitle && (
        <ThemedText
          style={[styles.subtitle, { color: theme.textTertiary }]}
          numberOfLines={1}
        >
          {subtitle}
        </ThemedText>
      )}
      {delta && (
        <ThemedText style={[styles.delta, { color: deltaColor }]}>
          {deltaSymbol} {Math.abs(delta.value)} {delta.label}
        </ThemedText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    flex: 1,
  },
  valueLarge: {
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
  },
  valueSmall: {
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 28,
  },
  labelLarge: {
    fontSize: 13,
    marginTop: 2,
  },
  labelSmall: {
    fontSize: 12,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  delta: {
    fontSize: 12,
    marginTop: 4,
  },
});
