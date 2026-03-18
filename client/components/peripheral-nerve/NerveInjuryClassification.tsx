/**
 * NerveInjuryClassification
 * ═════════════════════════
 * Sunderland grade picker (0–VI chips), mechanism picker, injury timing,
 * and open vs closed toggle. Renders inside PeripheralNerveAssessment.
 */

import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  SunderlandGrade,
  NerveInjuryMechanism,
  NerveInjuryTiming,
} from "@/types/peripheralNerve";
import {
  SUNDERLAND_LABELS,
  SUNDERLAND_SHORT_LABELS,
  MECHANISM_LABELS,
  TIMING_LABELS,
} from "@/types/peripheralNerve";

interface NerveInjuryClassificationProps {
  sunderlandGrade?: SunderlandGrade;
  mechanism?: NerveInjuryMechanism;
  timing?: NerveInjuryTiming;
  openVsClosed?: "open" | "closed";
  onSunderlandChange: (grade: SunderlandGrade | undefined) => void;
  onMechanismChange: (mechanism: NerveInjuryMechanism | undefined) => void;
  onTimingChange: (timing: NerveInjuryTiming | undefined) => void;
  onOpenClosedChange: (value: "open" | "closed" | undefined) => void;
}

const SUNDERLAND_GRADES: SunderlandGrade[] = [
  "0",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
];

const MECHANISMS: NerveInjuryMechanism[] = [
  "laceration",
  "crush",
  "traction",
  "compression",
  "injection",
  "gunshot",
  "iatrogenic",
  "thermal",
  "radiation",
  "ischaemic",
  "unknown",
];

const TIMINGS: NerveInjuryTiming[] = ["acute", "subacute", "chronic"];

export const NerveInjuryClassification = React.memo(
  function NerveInjuryClassification({
    sunderlandGrade,
    mechanism,
    timing,
    openVsClosed,
    onSunderlandChange,
    onMechanismChange,
    onTimingChange,
    onOpenClosedChange,
  }: NerveInjuryClassificationProps) {
    const { theme } = useTheme();

    const handleGradePress = useCallback(
      (grade: SunderlandGrade) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSunderlandChange(sunderlandGrade === grade ? undefined : grade);
      },
      [sunderlandGrade, onSunderlandChange],
    );

    const handleMechanismPress = useCallback(
      (mech: NerveInjuryMechanism) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onMechanismChange(mechanism === mech ? undefined : mech);
      },
      [mechanism, onMechanismChange],
    );

    const handleTimingPress = useCallback(
      (t: NerveInjuryTiming) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTimingChange(timing === t ? undefined : t);
      },
      [timing, onTimingChange],
    );

    const handleOpenClosedPress = useCallback(
      (val: "open" | "closed") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onOpenClosedChange(openVsClosed === val ? undefined : val);
      },
      [openVsClosed, onOpenClosedChange],
    );

    return (
      <View style={{ gap: Spacing.md }}>
        {/* Sunderland Grade */}
        <View>
          <ThemedText
            style={[
              styles.fieldLabel,
              { color: theme.textSecondary },
            ]}
          >
            Sunderland Grade
          </ThemedText>
          <View style={styles.chipRow}>
            {SUNDERLAND_GRADES.map((grade) => {
              const selected = sunderlandGrade === grade;
              return (
                <Pressable
                  key={grade}
                  onPress={() => handleGradePress(grade)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected
                        ? theme.accent
                        : theme.backgroundElevated,
                      borderColor: selected
                        ? theme.accent
                        : theme.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={SUNDERLAND_LABELS[grade]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: selected
                          ? theme.buttonText
                          : theme.text,
                      },
                    ]}
                  >
                    {SUNDERLAND_SHORT_LABELS[grade]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          {sunderlandGrade != null && (
            <ThemedText
              style={[
                styles.gradeDescription,
                { color: theme.textSecondary },
              ]}
            >
              {SUNDERLAND_LABELS[sunderlandGrade]}
            </ThemedText>
          )}
        </View>

        {/* Mechanism */}
        <View>
          <ThemedText
            style={[
              styles.fieldLabel,
              { color: theme.textSecondary },
            ]}
          >
            Mechanism
          </ThemedText>
          <View style={styles.chipRow}>
            {MECHANISMS.map((mech) => {
              const selected = mechanism === mech;
              return (
                <Pressable
                  key={mech}
                  onPress={() => handleMechanismPress(mech)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected
                        ? theme.accent
                        : theme.backgroundElevated,
                      borderColor: selected
                        ? theme.accent
                        : theme.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: selected
                          ? theme.buttonText
                          : theme.text,
                      },
                    ]}
                  >
                    {MECHANISM_LABELS[mech]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Timing + Open/Closed row */}
        <View style={styles.twoColumnRow}>
          <View style={{ flex: 1 }}>
            <ThemedText
              style={[
                styles.fieldLabel,
                { color: theme.textSecondary },
              ]}
            >
              Injury Timing
            </ThemedText>
            <View style={styles.chipRow}>
              {TIMINGS.map((t) => {
                const selected = timing === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => handleTimingPress(t)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.accent
                          : theme.backgroundElevated,
                        borderColor: selected
                          ? theme.accent
                          : theme.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: selected
                            ? theme.buttonText
                            : theme.text,
                        },
                      ]}
                    >
                      {TIMING_LABELS[t]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText
              style={[
                styles.fieldLabel,
                { color: theme.textSecondary },
              ]}
            >
              Injury Type
            </ThemedText>
            <View style={styles.chipRow}>
              {(["open", "closed"] as const).map((val) => {
                const selected = openVsClosed === val;
                return (
                  <Pressable
                    key={val}
                    onPress={() => handleOpenClosedPress(val)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.accent
                          : theme.backgroundElevated,
                        borderColor: selected
                          ? theme.accent
                          : theme.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: selected
                            ? theme.buttonText
                            : theme.text,
                        },
                      ]}
                    >
                      {val === "open" ? "Open" : "Closed"}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  gradeDescription: {
    fontSize: 13,
    marginTop: Spacing.xs,
    fontStyle: "italic",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
});
