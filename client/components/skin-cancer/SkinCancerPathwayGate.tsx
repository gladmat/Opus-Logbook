/**
 * SkinCancerPathwayGate
 * ═════════════════════
 * Two-option stage selector that gates the rest of the skin cancer assessment.
 * Rendered inline within DiagnosisGroupEditor when the skin cancer module activates.
 *
 * After selection, collapses to a read-only single-line summary.
 */

import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { SkinCancerPathwayStage } from "@/types/skinCancer";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface StageOption {
  value: SkinCancerPathwayStage;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
}

const STAGES: StageOption[] = [
  {
    value: "excision_biopsy",
    icon: "scissors",
    title: "Biopsy",
    subtitle: "No histology yet \u2014 diagnostic excision",
  },
  {
    value: "histology_known",
    icon: "clipboard",
    title: "Histology known",
    subtitle: "Planning excision based on prior histology",
  },
];

interface SkinCancerPathwayGateProps {
  selectedStage: SkinCancerPathwayStage | undefined;
  onSelectStage: (stage: SkinCancerPathwayStage) => void;
  /** When provided, only show these pathway stages (others are hidden). */
  availableStages?: SkinCancerPathwayStage[];
}

export function SkinCancerPathwayGate({
  selectedStage,
  onSelectStage,
  availableStages,
}: SkinCancerPathwayGateProps) {
  const { theme } = useTheme();

  const handleSelect = (stage: SkinCancerPathwayStage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSelectStage(stage);
  };

  const visibleStages = availableStages
    ? STAGES.filter((s) => availableStages.includes(s.value))
    : STAGES;

  const selectedOption = STAGES.find((s) => s.value === selectedStage);

  // Collapsed: single-line summary
  if (selectedOption) {
    return (
      <View style={styles.container}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          PATHWAY STAGE
        </ThemedText>
        <View
          style={[
            styles.collapsedRow,
            {
              backgroundColor: theme.link + "14",
              borderColor: theme.link,
            },
          ]}
        >
          <Feather
            name={selectedOption.icon}
            size={16}
            color={theme.link}
          />
          <ThemedText
            style={[styles.collapsedTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {selectedOption.title}
          </ThemedText>
        </View>
      </View>
    );
  }

  // Expanded: cards
  return (
    <View style={styles.container}>
      <ThemedText
        style={[styles.sectionLabel, { color: theme.textSecondary }]}
      >
        PATHWAY STAGE
      </ThemedText>
      <View style={styles.stageList}>
        {visibleStages.map((stage) => {
          const isSelected = selectedStage === stage.value;
          return (
            <Pressable
              key={stage.value}
              style={[
                styles.stageCard,
                {
                  backgroundColor: isSelected
                    ? theme.link + "14"
                    : theme.backgroundElevated,
                  borderColor: isSelected ? theme.link : theme.border,
                },
                Shadows.card,
              ]}
              onPress={() => handleSelect(stage.value)}
            >
              <Feather
                name={stage.icon}
                size={18}
                color={isSelected ? theme.link : theme.textSecondary}
              />
              <View style={styles.stageTextContainer}>
                <ThemedText
                  style={[
                    styles.stageTitle,
                    { color: isSelected ? theme.link : theme.text },
                  ]}
                >
                  {stage.title}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.stageSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {stage.subtitle}
                </ThemedText>
              </View>
              {isSelected ? (
                <Feather name="check" size={16} color={theme.link} />
              ) : (
                <Feather
                  name="chevron-right"
                  size={16}
                  color={theme.textTertiary}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  stageList: {
    gap: 10,
  },
  stageCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  stageTextContainer: {
    flex: 1,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  stageSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  collapsedTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
