/**
 * Wrapped grid of injury category toggle chips.
 * Multiple chips can be active simultaneously (e.g., spaghetti wrist = Tendon + Nerve + Vessel).
 * Tapping a chip toggles its section visibility in the parent assessment.
 */

import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, palette } from "@/constants/theme";
import type { InjuryCategory } from "@/lib/handTraumaMapping";

interface InjuryCategoryChipsProps {
  activeCategories: Set<InjuryCategory>;
  onToggle: (category: InjuryCategory) => void;
  /** Count of items selected per category (for badge display) */
  categoryCounts?: Partial<Record<InjuryCategory, number>>;
}

const CATEGORY_CONFIG: {
  key: InjuryCategory;
  label: string;
  icon: string;
}[] = [
  { key: "fracture", label: "Fracture", icon: "hexagon" },
  { key: "dislocation", label: "Dislocation", icon: "shuffle" },
  { key: "tendon", label: "Tendon", icon: "trending-up" },
  { key: "nerve", label: "Nerve", icon: "zap" },
  { key: "vessel", label: "Vessel", icon: "droplet" },
  { key: "ligament", label: "Ligament", icon: "link" },
  { key: "soft_tissue", label: "Soft Tissue", icon: "layers" },
  { key: "special", label: "Special", icon: "alert-triangle" },
  { key: "amputation", label: "Amputation", icon: "scissors" },
];

export function InjuryCategoryChips({
  activeCategories,
  onToggle,
  categoryCounts,
}: InjuryCategoryChipsProps) {
  const { theme } = useTheme();

  const handlePress = useCallback(
    (category: InjuryCategory) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggle(category);
    },
    [onToggle],
  );

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        INJURY TYPE
      </ThemedText>
      <View style={styles.grid}>
        {CATEGORY_CONFIG.map(({ key, label, icon }) => {
          const isActive = activeCategories.has(key);
          const count = categoryCounts?.[key] ?? 0;

          return (
            <Pressable
              key={key}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? theme.link
                    : theme.backgroundTertiary,
                  borderColor: isActive ? theme.link : theme.border,
                },
              ]}
              onPress={() => handlePress(key)}
              testID={`caseForm.hand.chip-category-${key}`}
            >
              <View style={styles.chipContent}>
                <Feather
                  name={icon as any}
                  size={14}
                  color={isActive ? theme.buttonText : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.chipLabel,
                    {
                      color: isActive ? theme.buttonText : theme.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </ThemedText>
              </View>
              {count > 0 ? (
                <View
                  style={[
                    styles.countBadge,
                    {
                      // Active: faint white wash on amber chip — palette.white
                      // since the parent text is theme.buttonText (dark in
                      // dark mode, white in light); inactive: full amber link.
                      backgroundColor: isActive
                        ? `${palette.white}40`
                        : theme.link,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.countText,
                      {
                        // Inactive count badge sits on amber, so always-white
                        // gives the highest contrast. Active badge inherits
                        // theme.buttonText to match the chip's text colour.
                        color: isActive ? theme.buttonText : palette.white,
                      },
                    ]}
                  >
                    {count}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 6,
    minHeight: 44,
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 96,
  },
  chipContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  chipLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
