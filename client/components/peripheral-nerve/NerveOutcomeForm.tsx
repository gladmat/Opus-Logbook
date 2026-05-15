/**
 * NerveOutcomeForm — structured nerve-specific outcome assessment.
 *
 * Renders within AddTimelineEventScreen when the linked case has a
 * peripheral nerve assessment and event type is `follow_up_visit`.
 *
 * Sections:
 *   1. Assessment date & months since surgery (auto-computed)
 *   2. Motor assessment — per target muscle MRC grade chips
 *   3. Sensory assessment — BMRC grade, 2PD, SWMT
 *   4. Pain — NRS 0–10 chip row
 *   5. Strength — grip, pinch, % contralateral
 *   6. PROMs — DASH, Quick-DASH scores
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Pressable,
  TextInput,
  LayoutAnimation,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  NerveOutcomeAssessment,
  NerveIdentifier,
  MRCMotorGrade,
  BMRCSensoryGrade,
} from "@/types/peripheralNerve";
import {
  NERVE_TARGET_MUSCLES,
  MRC_MOTOR_GRADE_SHORT,
  SWMT_RESULT_LABELS,
} from "@/lib/peripheralNerveConfig";

// ── Props ────────────────────────────────────────────────────────────────────

interface NerveOutcomeFormProps {
  outcome: NerveOutcomeAssessment;
  onChange: (outcome: NerveOutcomeAssessment) => void;
  nerveInjured?: NerveIdentifier;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SMOOTH_LAYOUT = LayoutAnimation.Presets.easeInEaseOut;

const MRC_GRADES: MRCMotorGrade[] = [
  "M0",
  "M1",
  "M2",
  "M3",
  "M4_minus",
  "M4",
  "M4_plus",
  "M5",
];

const BMRC_GRADES: BMRCSensoryGrade[] = [
  "S0",
  "S1",
  "S1_plus",
  "S2",
  "S2_plus",
  "S3",
  "S3_plus",
  "S4",
];

const BMRC_SHORT: Record<BMRCSensoryGrade, string> = {
  S0: "S0",
  S1: "S1",
  S1_plus: "S1+",
  S2: "S2",
  S2_plus: "S2+",
  S3: "S3",
  S3_plus: "S3+",
  S4: "S4",
};

const SWMT_KEYS = Object.keys(SWMT_RESULT_LABELS) as NonNullable<
  NerveOutcomeAssessment["swmtResult"]
>[];

const NRS_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// ── Component ────────────────────────────────────────────────────────────────

export const NerveOutcomeForm = React.memo(function NerveOutcomeForm({
  outcome,
  onChange,
  nerveInjured,
}: NerveOutcomeFormProps) {
  const { theme, isDark } = useTheme();

  const [motorExpanded, setMotorExpanded] = useState(true);
  const [sensoryExpanded, setSensoryExpanded] = useState(false);
  const [strengthExpanded, setStrengthExpanded] = useState(false);

  const update = useCallback(
    (partial: Partial<NerveOutcomeAssessment>) => {
      onChange({ ...outcome, ...partial });
    },
    [outcome, onChange],
  );

  // Target muscles from config mapping
  const targetMuscles = useMemo(() => {
    if (!nerveInjured) return [];
    return NERVE_TARGET_MUSCLES[nerveInjured] ?? [];
  }, [nerveInjured]);

  const toggleSection = useCallback(
    (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(SMOOTH_LAYOUT);
      setter((prev) => !prev);
    },
    [],
  );

  const chipStyle = useCallback(
    (selected: boolean) => [
      styles.chip,
      {
        backgroundColor: selected
          ? theme.link
          : isDark
            ? theme.backgroundTertiary
            : theme.backgroundSecondary,
        borderColor: selected ? theme.link : theme.border,
      },
    ],
    [theme, isDark],
  );

  const chipTextColor = useCallback(
    (selected: boolean) => (selected ? theme.buttonText : theme.text),
    [theme],
  );

  // ── Motor grade handler ────────────────────────────────────────────

  const updateMotorGrade = useCallback(
    (muscle: string, nerve: NerveIdentifier, grade: MRCMotorGrade) => {
      const assessments = [...(outcome.motorAssessments ?? [])];
      const idx = assessments.findIndex((a) => a.muscle === muscle);
      if (idx >= 0) {
        const existing = assessments[idx]!;
        // Toggle off if same grade
        if (existing.mrcGrade === grade) {
          assessments.splice(idx, 1);
        } else {
          assessments[idx] = { muscle, nerve, mrcGrade: grade };
        }
      } else {
        assessments.push({ muscle, nerve, mrcGrade: grade });
      }
      update({ motorAssessments: assessments });
    },
    [outcome.motorAssessments, update],
  );

  const getMotorGrade = useCallback(
    (muscle: string): MRCMotorGrade | undefined => {
      return outcome.motorAssessments?.find((a) => a.muscle === muscle)
        ?.mrcGrade;
    },
    [outcome.motorAssessments],
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: `${theme.link}80`,
          backgroundColor: isDark
            ? theme.backgroundSecondary
            : theme.backgroundRoot,
        },
      ]}
    >
      <ThemedText style={[styles.moduleTitle, { color: theme.link }]}>
        Nerve Outcome Assessment
      </ThemedText>

      <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
        {outcome.monthsSinceSurgery > 0
          ? `${outcome.monthsSinceSurgery} months post-surgery`
          : "Complete the fields below"}
      </ThemedText>

      {/* ═══ Motor Assessment ═══ */}
      {targetMuscles.length > 0 && (
        <>
          <Pressable
            style={styles.sectionHeader}
            onPress={() => toggleSection(setMotorExpanded)}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Motor Assessment ({targetMuscles.length} muscles)
            </ThemedText>
            <Feather
              name={motorExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
          {motorExpanded && (
            <View style={styles.section}>
              {targetMuscles.map(({ muscle }) => {
                const currentGrade = getMotorGrade(muscle);
                return (
                  <View key={muscle} style={styles.muscleRow}>
                    <ThemedText
                      style={[
                        styles.muscleLabel,
                        { color: theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {muscle}
                    </ThemedText>
                    <View style={styles.gradeChipRow}>
                      {MRC_GRADES.map((grade) => (
                        <Pressable
                          key={grade}
                          style={[
                            styles.gradeChip,
                            {
                              backgroundColor:
                                currentGrade === grade
                                  ? theme.link
                                  : "transparent",
                              borderColor:
                                currentGrade === grade
                                  ? theme.link
                                  : theme.border,
                            },
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            updateMotorGrade(muscle, nerveInjured!, grade);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.gradeChipText,
                              {
                                color:
                                  currentGrade === grade
                                    ? theme.buttonText
                                    : theme.textTertiary,
                              },
                            ]}
                          >
                            {MRC_MOTOR_GRADE_SHORT[grade]}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* ═══ Sensory Assessment ═══ */}
      <Pressable
        style={styles.sectionHeader}
        onPress={() => toggleSection(setSensoryExpanded)}
        accessibilityRole="button"
      >
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Sensory Assessment
        </ThemedText>
        <Feather
          name={sensoryExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>
      {sensoryExpanded && (
        <View style={styles.section}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            BMRC Sensory Grade
          </ThemedText>
          <View style={styles.chipRow}>
            {BMRC_GRADES.map((grade) => (
              <Pressable
                key={grade}
                style={chipStyle(outcome.sensoryGrade === grade)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    sensoryGrade:
                      outcome.sensoryGrade === grade ? undefined : grade,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: chipTextColor(outcome.sensoryGrade === grade) },
                  ]}
                >
                  {BMRC_SHORT[grade]}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.numericRow}>
            <View style={styles.numericField}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Static 2PD (mm)
              </ThemedText>
              <TextInput
                style={[
                  styles.numericInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
                value={
                  outcome.static2PD_mm != null
                    ? String(outcome.static2PD_mm)
                    : ""
                }
                onChangeText={(t) => {
                  const v = parseFloat(t);
                  update({ static2PD_mm: isNaN(v) ? undefined : v });
                }}
                keyboardType="decimal-pad"
                placeholder="mm"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
            <View style={styles.numericField}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Moving 2PD (mm)
              </ThemedText>
              <TextInput
                style={[
                  styles.numericInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
                value={
                  outcome.moving2PD_mm != null
                    ? String(outcome.moving2PD_mm)
                    : ""
                }
                onChangeText={(t) => {
                  const v = parseFloat(t);
                  update({ moving2PD_mm: isNaN(v) ? undefined : v });
                }}
                keyboardType="decimal-pad"
                placeholder="mm"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          </View>

          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            SWMT Result
          </ThemedText>
          <View style={styles.chipRow}>
            {SWMT_KEYS.map((key) => (
              <Pressable
                key={key}
                style={chipStyle(outcome.swmtResult === key)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    swmtResult: outcome.swmtResult === key ? undefined : key,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: chipTextColor(outcome.swmtResult === key) },
                  ]}
                >
                  {SWMT_RESULT_LABELS[key]}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ═══ Pain NRS ═══ */}
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Pain (NRS 0–10)
      </ThemedText>
      <View style={styles.chipRow}>
        {NRS_VALUES.map((v) => (
          <Pressable
            key={`pain-${v}`}
            style={chipStyle(outcome.painNRS === v)}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              update({
                painNRS: outcome.painNRS === v ? undefined : v,
              });
            }}
          >
            <ThemedText
              style={[
                styles.chipText,
                { color: chipTextColor(outcome.painNRS === v) },
              ]}
            >
              {v}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* ═══ Strength & PROMs ═══ */}
      <Pressable
        style={styles.sectionHeader}
        onPress={() => toggleSection(setStrengthExpanded)}
        accessibilityRole="button"
      >
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Strength & PROMs
        </ThemedText>
        <Feather
          name={strengthExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>
      {strengthExpanded && (
        <View style={styles.section}>
          <View style={styles.numericRow}>
            <View style={styles.numericField}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Grip Strength (kg)
              </ThemedText>
              <TextInput
                style={[
                  styles.numericInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
                value={
                  outcome.gripStrengthKg != null
                    ? String(outcome.gripStrengthKg)
                    : ""
                }
                onChangeText={(t) => {
                  const v = parseFloat(t);
                  update({ gripStrengthKg: isNaN(v) ? undefined : v });
                }}
                keyboardType="decimal-pad"
                placeholder="kg"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
            <View style={styles.numericField}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Pinch Strength (kg)
              </ThemedText>
              <TextInput
                style={[
                  styles.numericInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
                value={
                  outcome.pinchStrengthKg != null
                    ? String(outcome.pinchStrengthKg)
                    : ""
                }
                onChangeText={(t) => {
                  const v = parseFloat(t);
                  update({ pinchStrengthKg: isNaN(v) ? undefined : v });
                }}
                keyboardType="decimal-pad"
                placeholder="kg"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          </View>

          <View style={styles.numericField}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              % of Contralateral
            </ThemedText>
            <TextInput
              style={[
                styles.numericInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundElevated,
                },
              ]}
              value={
                outcome.percentOfContralateral != null
                  ? String(outcome.percentOfContralateral)
                  : ""
              }
              onChangeText={(t) => {
                const v = parseInt(t, 10);
                update({
                  percentOfContralateral: isNaN(v) ? undefined : v,
                });
              }}
              keyboardType="number-pad"
              placeholder="%"
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.numericRow}>
            <View style={styles.numericField}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                DASH Score
              </ThemedText>
              <TextInput
                style={[
                  styles.numericInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
                value={
                  outcome.dashScore != null ? String(outcome.dashScore) : ""
                }
                onChangeText={(t) => {
                  const v = parseFloat(t);
                  update({ dashScore: isNaN(v) ? undefined : v });
                }}
                keyboardType="decimal-pad"
                placeholder="0–100"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
            <View style={styles.numericField}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Quick-DASH Score
              </ThemedText>
              <TextInput
                style={[
                  styles.numericInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
                value={
                  outcome.quickDashScore != null
                    ? String(outcome.quickDashScore)
                    : ""
                }
                onChangeText={(t) => {
                  const v = parseFloat(t);
                  update({ quickDashScore: isNaN(v) ? undefined : v });
                }}
                keyboardType="decimal-pad"
                placeholder="0–100"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 36,
    paddingVertical: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  muscleRow: {
    gap: 4,
    marginBottom: Spacing.xs,
  },
  muscleLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  gradeChipRow: {
    flexDirection: "row",
    gap: 4,
  },
  gradeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 34,
    alignItems: "center",
  },
  gradeChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  numericRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  numericField: {
    flex: 1,
    gap: 2,
  },
  numericInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 15,
    minHeight: 44,
  },
});
