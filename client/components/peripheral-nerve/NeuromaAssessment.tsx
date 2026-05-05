/**
 * NeuromaAssessment — amber-bordered sub-module for neuroma documentation.
 * Renders within PeripheralNerveAssessment when the selected diagnosis
 * has `neuromaModule: true`.
 *
 * Aetiology-driven progressive disclosure:
 *   1. Aetiology picker (always visible)
 *   2. Aetiology-specific fields (conditional)
 *   3. Neuroma characteristics (collapsed)
 *   4. Technique & details (collapsed)
 *
 * Phase 5 implementation — full UI with all 4 sections.
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Pressable,
  TextInput,
  Switch,
  LayoutAnimation,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  NeuromaAssessmentData,
  NeuromaTechnique,
  NerveIdentifier,
  NerveGroup,
} from "@/types/peripheralNerve";
import {
  NEUROMA_TECHNIQUE_LABELS,
  NERVE_LABELS,
  NERVE_GROUPS,
  NERVE_GROUP_LABELS,
} from "@/types/peripheralNerve";
import {
  NEUROMA_AETIOLOGY_LABELS,
  NEUROMA_MORPHOLOGY_LABELS,
  AMPUTATION_CAUSE_LABELS,
  STUMP_POSITION_LABELS,
  CAUSATIVE_PROCEDURE_LABELS,
  RPNI_MUSCLE_SOURCE_LABELS,
  RPNI_VARIANT_LABELS,
  cleanNeuromaForAetiologyChange,
} from "@/lib/peripheralNerveConfig";

// ── Props ────────────────────────────────────────────────────────────────────

interface NeuromaAssessmentProps {
  data: NeuromaAssessmentData;
  onChange: (data: NeuromaAssessmentData) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SMOOTH_LAYOUT = LayoutAnimation.Presets.easeInEaseOut;

const AETIOLOGIES = Object.keys(NEUROMA_AETIOLOGY_LABELS) as Array<
  NeuromaAssessmentData["aetiology"]
>;

const MORPHOLOGIES = Object.keys(NEUROMA_MORPHOLOGY_LABELS) as Array<
  NonNullable<NeuromaAssessmentData["morphology"]>
>;

const TECHNIQUES = Object.keys(NEUROMA_TECHNIQUE_LABELS) as NeuromaTechnique[];

const RPNI_TECHNIQUES: NeuromaTechnique[] = [
  "rpni",
  "ds_rpni",
  "c_rpni",
  "mc_rpni",
];

/** All nerve groups for affected nerve picker */
const NEUROMA_NERVE_GROUPS: NerveGroup[] = [
  "upper_extremity",
  "upper_extremity_branches",
  "lower_extremity",
  "brachial_plexus_branches",
  "facial",
  "cranial",
];

/** NRS 0-10 chip values */
const NRS_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// ── Component ────────────────────────────────────────────────────────────────

export const NeuromaAssessment = React.memo(function NeuromaAssessment({
  data,
  onChange,
}: NeuromaAssessmentProps) {
  const { theme, isDark } = useTheme();

  // Local collapse state
  const [characteristicsExpanded, setCharacteristicsExpanded] = useState(false);
  const [techniqueExpanded, setTechniqueExpanded] = useState(false);

  const update = useCallback(
    (partial: Partial<NeuromaAssessmentData>) => {
      onChange({ ...data, ...partial });
    },
    [data, onChange],
  );

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

  const handleNerveSelect = useCallback(
    (nerve: NerveIdentifier) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      update({
        affectedNerve: data.affectedNerve === nerve ? undefined : nerve,
      });
    },
    [data.affectedNerve, update],
  );

  const isTMR = data.technique === "tmr";
  const isRPNI = RPNI_TECHNIQUES.includes(data.technique as NeuromaTechnique);

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: `${theme.link}99`,
          backgroundColor: isDark
            ? theme.backgroundSecondary
            : theme.backgroundRoot,
        },
      ]}
    >
      <ThemedText style={[styles.moduleTitle, { color: theme.link }]}>
        Neuroma Assessment
      </ThemedText>

      {/* ═══ Section 0: Affected Nerve ═══ */}
      <View style={styles.section}>
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Affected Nerve
        </ThemedText>
        {NEUROMA_NERVE_GROUPS.map((group) => (
          <View key={group}>
            <ThemedText
              style={[styles.groupLabel, { color: theme.textSecondary }]}
            >
              {NERVE_GROUP_LABELS[group]}
            </ThemedText>
            <View style={styles.chipRow}>
              {NERVE_GROUPS[group].map((nerve) => {
                const selected = data.affectedNerve === nerve;
                return (
                  <Pressable
                    key={nerve}
                    style={chipStyle(selected)}
                    onPress={() => handleNerveSelect(nerve)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: chipTextColor(selected) },
                      ]}
                      numberOfLines={1}
                    >
                      {NERVE_LABELS[nerve]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* ═══ Section 1: Aetiology ═══ */}
      <View style={styles.section}>
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Aetiology
        </ThemedText>
        <View style={styles.chipRow}>
          {AETIOLOGIES.map((aet) => (
            <Pressable
              key={aet}
              style={chipStyle(data.aetiology === aet)}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (data.aetiology !== aet) {
                  onChange(cleanNeuromaForAetiologyChange(data, aet));
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: data.aetiology === aet }}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: chipTextColor(data.aetiology === aet) },
                ]}
              >
                {NEUROMA_AETIOLOGY_LABELS[aet]}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ═══ Section 2: Aetiology-Specific Fields ═══ */}
      {data.aetiology === "post_amputation" && (
        <View style={styles.section}>
          {/* Amputation level */}
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Amputation Level
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.backgroundElevated,
              },
            ]}
            value={data.amputationLevel ?? ""}
            onChangeText={(v) => update({ amputationLevel: v || undefined })}
            placeholder="e.g., transradial, below-knee"
            placeholderTextColor={theme.textTertiary}
          />

          {/* Amputation cause */}
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Amputation Cause
          </ThemedText>
          <View style={styles.chipRow}>
            {(
              Object.keys(AMPUTATION_CAUSE_LABELS) as Array<
                NonNullable<NeuromaAssessmentData["amputationCause"]>
              >
            ).map((cause) => (
              <Pressable
                key={cause}
                style={chipStyle(data.amputationCause === cause)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    amputationCause:
                      data.amputationCause === cause ? undefined : cause,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: chipTextColor(data.amputationCause === cause),
                    },
                  ]}
                >
                  {AMPUTATION_CAUSE_LABELS[cause]}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Time since amputation */}
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Time Since Amputation (months)
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
              data.timeSinceAmputationMonths != null
                ? String(data.timeSinceAmputationMonths)
                : ""
            }
            onChangeText={(t) => {
              const v = parseInt(t, 10);
              update({
                timeSinceAmputationMonths: isNaN(v) ? undefined : v,
              });
            }}
            keyboardType="number-pad"
            placeholder="months"
            placeholderTextColor={theme.textTertiary}
          />

          {/* Prosthetic use */}
          <View style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
              Prosthetic use
            </ThemedText>
            <Switch
              value={data.prostheticUse ?? false}
              onValueChange={(v) => update({ prostheticUse: v })}
              trackColor={{ true: theme.link }}
            />
          </View>
          {data.prostheticUse && (
            <>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Hours per day
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
                  data.prostheticHoursPerDay != null
                    ? String(data.prostheticHoursPerDay)
                    : ""
                }
                onChangeText={(t) => {
                  const v = parseInt(t, 10);
                  update({
                    prostheticHoursPerDay: isNaN(v) ? undefined : v,
                  });
                }}
                keyboardType="number-pad"
                placeholder="hrs/day"
                placeholderTextColor={theme.textTertiary}
              />
            </>
          )}

          {/* Phantom limb pain NRS */}
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Phantom Limb Pain (NRS 0–10)
          </ThemedText>
          <View style={styles.chipRow}>
            {NRS_VALUES.map((v) => (
              <Pressable
                key={`phantom-${v}`}
                style={chipStyle(data.phantomLimbPainNRS === v)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    phantomLimbPainNRS:
                      data.phantomLimbPainNRS === v ? undefined : v,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: chipTextColor(data.phantomLimbPainNRS === v),
                    },
                  ]}
                >
                  {v}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Residual limb pain NRS */}
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Residual Limb Pain (NRS 0–10)
          </ThemedText>
          <View style={styles.chipRow}>
            {NRS_VALUES.map((v) => (
              <Pressable
                key={`residual-${v}`}
                style={chipStyle(data.residualLimbPainNRS === v)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    residualLimbPainNRS:
                      data.residualLimbPainNRS === v ? undefined : v,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: chipTextColor(data.residualLimbPainNRS === v),
                    },
                  ]}
                >
                  {v}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Stump position */}
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Neuroma Position in Stump
          </ThemedText>
          <View style={styles.chipRow}>
            {(
              Object.keys(STUMP_POSITION_LABELS) as Array<
                NonNullable<NeuromaAssessmentData["neuromaPositionInStump"]>
              >
            ).map((pos) => (
              <Pressable
                key={pos}
                style={chipStyle(data.neuromaPositionInStump === pos)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    neuromaPositionInStump:
                      data.neuromaPositionInStump === pos ? undefined : pos,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: chipTextColor(data.neuromaPositionInStump === pos),
                    },
                  ]}
                >
                  {STUMP_POSITION_LABELS[pos]}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Weight bearing proximity */}
          <View style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
              Proximity to weight-bearing surface
            </ThemedText>
            <Switch
              value={data.proximityToWeightBearing ?? false}
              onValueChange={(v) => update({ proximityToWeightBearing: v })}
              trackColor={{ true: theme.link }}
            />
          </View>
        </View>
      )}

      {data.aetiology === "traumatic" && (
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
              Prior nerve repair attempted
            </ThemedText>
            <Switch
              value={data.priorNerveRepairAttempted ?? false}
              onValueChange={(v) => update({ priorNerveRepairAttempted: v })}
              trackColor={{ true: theme.link }}
            />
          </View>
        </View>
      )}

      {data.aetiology === "iatrogenic" && (
        <View style={styles.section}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Causative Procedure
          </ThemedText>
          <View style={styles.chipRow}>
            {(
              Object.keys(CAUSATIVE_PROCEDURE_LABELS) as Array<
                NonNullable<NeuromaAssessmentData["causativeProcedure"]>
              >
            ).map((proc) => (
              <Pressable
                key={proc}
                style={chipStyle(data.causativeProcedure === proc)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    causativeProcedure:
                      data.causativeProcedure === proc ? undefined : proc,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: chipTextColor(data.causativeProcedure === proc),
                    },
                  ]}
                >
                  {CAUSATIVE_PROCEDURE_LABELS[proc]}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ═══ Section 3: Neuroma Characteristics (collapsed) ═══ */}
      <Pressable
        style={styles.sectionHeader}
        onPress={() => toggleSection(setCharacteristicsExpanded)}
        accessibilityRole="button"
      >
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Neuroma Characteristics
        </ThemedText>
        <Feather
          name={characteristicsExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>
      {characteristicsExpanded && (
        <View style={styles.section}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Morphology
          </ThemedText>
          <View style={styles.chipRow}>
            {MORPHOLOGIES.map((morph) => (
              <Pressable
                key={morph}
                style={chipStyle(data.morphology === morph)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    morphology: data.morphology === morph ? undefined : morph,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: chipTextColor(data.morphology === morph) },
                  ]}
                >
                  {NEUROMA_MORPHOLOGY_LABELS[morph]}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Neuroma Size (mm)
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
            value={data.neuromaSizeMm != null ? String(data.neuromaSizeMm) : ""}
            onChangeText={(t) => {
              const v = parseFloat(t);
              update({ neuromaSizeMm: isNaN(v) ? undefined : v });
            }}
            keyboardType="decimal-pad"
            placeholder="mm"
            placeholderTextColor={theme.textTertiary}
          />
        </View>
      )}

      {/* ═══ Section 4: Technique & Details (collapsed) ═══ */}
      <Pressable
        style={styles.sectionHeader}
        onPress={() => toggleSection(setTechniqueExpanded)}
        accessibilityRole="button"
      >
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Surgical Technique
        </ThemedText>
        <Feather
          name={techniqueExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>
      {techniqueExpanded && (
        <View style={styles.section}>
          <View style={styles.chipRow}>
            {TECHNIQUES.map((tech) => (
              <Pressable
                key={tech}
                style={chipStyle(data.technique === tech)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    technique: data.technique === tech ? undefined : tech,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: chipTextColor(data.technique === tech) },
                  ]}
                >
                  {NEUROMA_TECHNIQUE_LABELS[tech]}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* TMR-specific fields */}
          {isTMR && (
            <View style={styles.subsection}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                TMR Recipient Motor Nerve
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
                value={data.tmrRecipientMotorNerve ?? ""}
                onChangeText={(v) =>
                  update({ tmrRecipientMotorNerve: v || undefined })
                }
                placeholder="e.g., lateral gastrocnemius branch"
                placeholderTextColor={theme.textTertiary}
              />

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                TMR Target Muscle
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
                value={data.tmrTargetMuscle ?? ""}
                onChangeText={(v) =>
                  update({ tmrTargetMuscle: v || undefined })
                }
                placeholder="e.g., gastrocnemius"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          )}

          {/* RPNI-specific fields */}
          {isRPNI && (
            <View style={styles.subsection}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                RPNI Count
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
                value={data.rpniCount != null ? String(data.rpniCount) : ""}
                onChangeText={(t) => {
                  const v = parseInt(t, 10);
                  update({ rpniCount: isNaN(v) ? undefined : v });
                }}
                keyboardType="number-pad"
                placeholder="Number of RPNIs"
                placeholderTextColor={theme.textTertiary}
              />

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Muscle Source
              </ThemedText>
              <View style={styles.chipRow}>
                {(
                  Object.keys(RPNI_MUSCLE_SOURCE_LABELS) as Array<
                    NonNullable<NeuromaAssessmentData["rpniMuscleSource"]>
                  >
                ).map((src) => (
                  <Pressable
                    key={src}
                    style={chipStyle(data.rpniMuscleSource === src)}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({
                        rpniMuscleSource:
                          data.rpniMuscleSource === src ? undefined : src,
                      });
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: chipTextColor(data.rpniMuscleSource === src),
                        },
                      ]}
                    >
                      {RPNI_MUSCLE_SOURCE_LABELS[src]}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Graft Dimensions
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
                value={data.rpniGraftDimensions ?? ""}
                onChangeText={(v) =>
                  update({ rpniGraftDimensions: v || undefined })
                }
                placeholder="e.g., 3x1x0.5cm"
                placeholderTextColor={theme.textTertiary}
              />

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                RPNI Variant
              </ThemedText>
              <View style={styles.chipRow}>
                {(
                  Object.keys(RPNI_VARIANT_LABELS) as Array<
                    NonNullable<NeuromaAssessmentData["rpniVariant"]>
                  >
                ).map((variant) => (
                  <Pressable
                    key={variant}
                    style={chipStyle(data.rpniVariant === variant)}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({
                        rpniVariant:
                          data.rpniVariant === variant ? undefined : variant,
                      });
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: chipTextColor(data.rpniVariant === variant),
                        },
                      ]}
                    >
                      {RPNI_VARIANT_LABELS[variant]}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    gap: Spacing.sm,
  },
  subsection: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: "#E5A00D40",
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
  groupLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.xs,
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    gap: Spacing.sm,
  },
  switchLabel: {
    fontSize: 14,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 15,
    minHeight: 44,
  },
  numericInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 15,
    minHeight: 44,
    maxWidth: 140,
  },
});
