import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

// ═══════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════

interface ProtocolBadgeProps {
  label: string;
  capturedCount: number;
  totalSteps: number;
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

/**
 * Summary badge showing protocol progress: "Free Flap · 4/11".
 * Styled as a horizontal pill with a camera icon.
 */
function ProtocolBadgeInner({
  label,
  capturedCount,
  totalSteps,
}: ProtocolBadgeProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.accentSurface,
          borderColor: theme.accentBorder,
        },
      ]}
    >
      <Feather name="camera" size={14} color={theme.link} />
      <ThemedText style={[styles.text, { color: theme.link }]}>
        {label} {"\u00b7"} {capturedCount}/{totalSteps}
      </ThemedText>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
});

export const ProtocolBadge = React.memo(ProtocolBadgeInner);
