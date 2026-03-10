/**
 * MarginRecommendationBadge
 * ═════════════════════════
 * Standalone read-only CDS badge showing margin recommendation.
 * Rendered at SkinCancerAssessment level — visible even when
 * HistologySection is collapsed.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";
import type { MarginRecommendation } from "@/types/skinCancer";

interface MarginRecommendationBadgeProps {
  recommendation: MarginRecommendation;
}

export const MarginRecommendationBadge = React.memo(
  function MarginRecommendationBadge({
    recommendation,
  }: MarginRecommendationBadgeProps) {
    const { theme } = useTheme();

    const title =
      recommendation.recommendedText !== "No established guideline"
        ? `Recommended margin: ${recommendation.recommendedText}`
        : "No established guideline \u2014 discuss at MDT";

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.info + "1A",
            borderColor: theme.info + "4D",
          },
        ]}
      >
        <ThemedText style={styles.emoji}>{"\uD83D\uDCCF"}</ThemedText>
        <View style={styles.textBlock}>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            {title}
          </ThemedText>
          {recommendation.guidelineNote ? (
            <ThemedText style={[styles.note, { color: theme.textSecondary }]}>
              {recommendation.guidelineNote}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.source, { color: theme.info }]}>
            {recommendation.guidelineSource}
          </ThemedText>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  emoji: {
    fontSize: 16,
    marginTop: 1,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  note: {
    fontSize: 13,
  },
  source: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
});
