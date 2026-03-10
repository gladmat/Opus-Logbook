/**
 * CompletionSummary
 * ═══════════════════════════════════════════════════════════
 * Horizontal row of status indicators rendered at the bottom
 * of each SkinCancerAssessment. Shows at-a-glance completion
 * across: Lesion · Procedure · Histology · SLNB · Margins.
 *
 * Colours: complete = success, pending = warning,
 *          not_started = tertiary, not_applicable = hidden.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type {
  SkinCancerCompletionState,
  SectionStatus,
} from "@/types/skinCancer";

// ─── Props ───────────────────────────────────────────────────────────────

interface CompletionSummaryProps {
  completion: SkinCancerCompletionState;
  /** Days since procedure — appended to "pending" histology as "(Day N)" */
  daysSinceCase?: number;
}

// ─── Section config ──────────────────────────────────────────────────────

const SECTIONS: { key: keyof SkinCancerCompletionState; label: string }[] = [
  { key: "lesionDetails", label: "Lesion" },
  { key: "procedure", label: "Procedure" },
  { key: "histology", label: "Histology" },
  { key: "slnb", label: "SLNB" },
  { key: "finalMargins", label: "Margins" },
];

// ─── Component ───────────────────────────────────────────────────────────

function CompletionSummaryInner({
  completion,
  daysSinceCase,
}: CompletionSummaryProps) {
  const { theme } = useTheme();

  const getColor = (status: SectionStatus): string => {
    switch (status) {
      case "complete":
        return theme.success;
      case "pending":
        return theme.warning;
      case "not_started":
        return theme.textTertiary;
      default:
        return theme.textTertiary;
    }
  };

  const visibleSections = SECTIONS.filter(
    (s) => completion[s.key] !== "not_applicable",
  );

  if (visibleSections.length === 0) return null;

  return (
    <View style={[styles.container, { borderTopColor: theme.border }]}>
      <View style={styles.row}>
        {visibleSections.map((section) => {
          const status = completion[section.key];
          const color = getColor(status);
          const showDayCount =
            section.key === "histology" &&
            status === "pending" &&
            daysSinceCase !== undefined;

          return (
            <View key={section.key} style={styles.item}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <ThemedText style={[styles.label, { color }]}>
                {section.label}
                {showDayCount ? ` (Day ${daysSinceCase})` : ""}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export const CompletionSummary = React.memo(CompletionSummaryInner);

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
});
