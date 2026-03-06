/**
 * Horizontal scrollable row of injury category toggle chips.
 * Multiple chips can be active simultaneously (e.g., spaghetti wrist = Tendon + Nerve + Vessel).
 * Tapping a chip toggles its section visibility in the parent assessment.
 */

import React, { useRef, useCallback } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
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
  { key: "soft_tissue", label: "Soft Tissue", icon: "layers" },
];

export function InjuryCategoryChips({
  activeCategories,
  onToggle,
  categoryCounts,
}: InjuryCategoryChipsProps) {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

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
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
            >
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
              >
                {label}
              </ThemedText>
              {count > 0 && isActive ? (
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.25)"
                        : theme.link,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.countText,
                      {
                        color: isActive ? theme.buttonText : "#FFFFFF",
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
      </ScrollView>
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
  scrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
    minHeight: 40,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: "600",
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
