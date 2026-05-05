/**
 * BurnSeverityBadges — Auto-calculated Revised Baux and ABSI score badges.
 * Displayed in the BurnsAssessment header, auto-updating from TBSA + patient data.
 * Purely informational — not editable.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { calculateRevisedBaux, calculateABSI } from "@/lib/burnsConfig";

interface BurnSeverityBadgesProps {
  age?: number;
  sex?: "male" | "female";
  tbsa?: number;
  inhalation?: boolean;
  fullThickness?: boolean;
}

function getBauxSeverity(score: number): "low" | "moderate" | "high" {
  if (score < 80) return "low";
  if (score < 120) return "moderate";
  return "high";
}

function getAbsiSeverity(score: number): "low" | "moderate" | "high" {
  if (score <= 5) return "low";
  if (score <= 9) return "moderate";
  return "high";
}

export const BurnSeverityBadges = React.memo(function BurnSeverityBadges({
  age,
  sex,
  tbsa,
  inhalation,
  fullThickness,
}: BurnSeverityBadgesProps) {
  const { theme } = useTheme();

  if (age == null || tbsa == null) return null;

  const baux = calculateRevisedBaux(age, tbsa, inhalation ?? false);
  const absi =
    sex != null
      ? calculateABSI(
          age,
          sex,
          tbsa,
          inhalation ?? false,
          fullThickness ?? false,
        )
      : undefined;

  const severityColor = (severity: "low" | "moderate" | "high") => {
    switch (severity) {
      case "low":
        return theme.success;
      case "moderate":
        return theme.warning;
      case "high":
        return theme.error;
    }
  };

  const bauxSeverity = getBauxSeverity(baux);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: severityColor(bauxSeverity) + "20",
            borderColor: severityColor(bauxSeverity),
          },
        ]}
      >
        <ThemedText style={[styles.badgeLabel, { color: theme.textSecondary }]}>
          rBaux
        </ThemedText>
        <ThemedText
          style={[styles.badgeValue, { color: severityColor(bauxSeverity) }]}
        >
          {baux}
        </ThemedText>
      </View>

      {absi != null ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: severityColor(getAbsiSeverity(absi)) + "20",
              borderColor: severityColor(getAbsiSeverity(absi)),
            },
          ]}
        >
          <ThemedText
            style={[styles.badgeLabel, { color: theme.textSecondary }]}
          >
            ABSI
          </ThemedText>
          <ThemedText
            style={[
              styles.badgeValue,
              { color: severityColor(getAbsiSeverity(absi)) },
            ]}
          >
            {absi}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgeValue: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
