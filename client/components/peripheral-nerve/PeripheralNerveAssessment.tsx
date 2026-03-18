/**
 * PeripheralNerveAssessment
 * ═════════════════════════
 * Top-level container for the peripheral nerve surgery inline assessment.
 * Renders inside DiagnosisGroupEditor when a peripheral nerve diagnosis is selected.
 *
 * Progressive disclosure sections:
 *   1. Nerve Injured + Injury Level (always visible)
 *   2. Classification (Sunderland, mechanism, timing) — default expanded
 *   3. Electrodiagnostics — default collapsed
 *   4. Intraoperative Findings — default collapsed
 *   5. Repair/Reconstruction — appears when repair/graft/transfer procedure selected
 *
 * Sub-modules (Phase 4–5 placeholders):
 *   - BrachialPlexusAssessment (when brachialPlexusModule)
 *   - NeuromaAssessment (when neuromaModule)
 */

import React, { useCallback, useMemo } from "react";
import { View, TextInput, Pressable, Switch, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import type {
  PeripheralNerveAssessmentData,
  NerveIdentifier,
  RepairTiming,
  RepairTechnique,
} from "@/types/peripheralNerve";
import {
  NERVE_LABELS,
  NERVE_GROUPS,
  NERVE_GROUP_LABELS,
  REPAIR_TIMING_LABELS,
  REPAIR_TECHNIQUE_LABELS,
} from "@/types/peripheralNerve";
import type { NerveGroup } from "@/types/peripheralNerve";
import { NerveInjuryClassification } from "./NerveInjuryClassification";
import { ElectrodiagnosticSummaryComponent } from "./ElectrodiagnosticSummary";
import { NerveGraftDetailsComponent } from "./NerveGraftDetailsComponent";
import { NerveTransferPicker } from "./NerveTransferPicker";

interface PeripheralNerveAssessmentProps {
  assessment: PeripheralNerveAssessmentData;
  onAssessmentChange: (updated: PeripheralNerveAssessmentData) => void;
  diagnosisId?: string;
  selectedProcedureIds?: string[];
}

/** Check if any selected procedure is a repair/graft/transfer/conduit */
function hasRepairProcedure(procedureIds: string[] | undefined): boolean {
  if (!procedureIds) return false;
  return procedureIds.some(
    (id) =>
      id.startsWith("pn_nerve_repair") ||
      id.startsWith("pn_nerve_graft") ||
      id.startsWith("pn_nerve_conduit") ||
      id.startsWith("pn_nerve_wrap") ||
      id.startsWith("pn_transfer") ||
      id.startsWith("pn_sural") ||
      id === "pn_bp_primary_repair",
  );
}

function hasGraftProcedure(procedureIds: string[] | undefined): boolean {
  if (!procedureIds) return false;
  return procedureIds.some(
    (id) =>
      id.startsWith("pn_nerve_graft") || id === "pn_sural_nerve_harvest",
  );
}

function hasConduitProcedure(procedureIds: string[] | undefined): boolean {
  if (!procedureIds) return false;
  return procedureIds.some(
    (id) =>
      id.startsWith("pn_nerve_conduit") || id === "pn_nerve_wrap",
  );
}

function hasTransferProcedure(procedureIds: string[] | undefined): boolean {
  if (!procedureIds) return false;
  return procedureIds.some((id) => id.startsWith("pn_transfer"));
}

/** Primary nerve groups for the picker */
const PICKER_GROUPS: NerveGroup[] = [
  "upper_extremity",
  "lower_extremity",
  "brachial_plexus_branches",
  "cranial",
];

const REPAIR_TIMINGS: RepairTiming[] = [
  "primary",
  "delayed_primary",
  "secondary",
];

const REPAIR_TECHNIQUES: RepairTechnique[] = [
  "epineurial",
  "grouped_fascicular",
  "fascicular",
  "end_to_side",
];

export const PeripheralNerveAssessment = React.memo(
  function PeripheralNerveAssessment({
    assessment,
    onAssessmentChange,
    diagnosisId,
    selectedProcedureIds,
  }: PeripheralNerveAssessmentProps) {
    const { theme } = useTheme();

    const update = useCallback(
      (updates: Partial<PeripheralNerveAssessmentData>) => {
        onAssessmentChange({ ...assessment, ...updates });
      },
      [assessment, onAssessmentChange],
    );

    // Determine which repair sub-sections are visible
    const showRepairSection = useMemo(
      () =>
        hasRepairProcedure(selectedProcedureIds) ||
        assessment.repairTiming != null ||
        assessment.repairTechnique != null ||
        assessment.graftDetails != null ||
        assessment.conduitDetails != null ||
        assessment.transferDetails != null,
      [selectedProcedureIds, assessment],
    );

    const showGraft = useMemo(
      () =>
        hasGraftProcedure(selectedProcedureIds) ||
        assessment.graftDetails != null,
      [selectedProcedureIds, assessment.graftDetails],
    );

    const showConduit = useMemo(
      () =>
        hasConduitProcedure(selectedProcedureIds) ||
        assessment.conduitDetails != null,
      [selectedProcedureIds, assessment.conduitDetails],
    );

    const showTransfer = useMemo(
      () =>
        hasTransferProcedure(selectedProcedureIds) ||
        assessment.transferDetails != null,
      [selectedProcedureIds, assessment.transferDetails],
    );

    const handleNerveSelect = useCallback(
      (nerve: NerveIdentifier) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        update({
          nerveInjured: assessment.nerveInjured === nerve ? undefined : nerve,
        });
      },
      [assessment.nerveInjured, update],
    );

    const handleRepairTimingPress = useCallback(
      (timing: RepairTiming) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        update({
          repairTiming: assessment.repairTiming === timing ? undefined : timing,
        });
      },
      [assessment.repairTiming, update],
    );

    const handleRepairTechniquePress = useCallback(
      (technique: RepairTechnique) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        update({
          repairTechnique:
            assessment.repairTechnique === technique ? undefined : technique,
        });
      },
      [assessment.repairTechnique, update],
    );

    return (
      <View
        style={[
          styles.container,
          {
            borderColor: theme.accent,
            backgroundColor: theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText style={[styles.moduleTitle, { color: theme.accent }]}>
          Peripheral Nerve Assessment
        </ThemedText>

        {/* ═══ Section 1: Nerve Injured ═══ */}
        <SectionWrapper title="1. Nerve Injured" icon="activity">
          <View style={{ gap: Spacing.md }}>
            {PICKER_GROUPS.map((group) => (
              <View key={group}>
                <ThemedText
                  style={[
                    styles.groupLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  {NERVE_GROUP_LABELS[group]}
                </ThemedText>
                <View style={styles.chipRow}>
                  {NERVE_GROUPS[group].map((nerve) => {
                    const selected = assessment.nerveInjured === nerve;
                    return (
                      <Pressable
                        key={nerve}
                        onPress={() => handleNerveSelect(nerve)}
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
                          style={{
                            fontSize: 13,
                            fontWeight: "500",
                            color: selected
                              ? theme.buttonText
                              : theme.text,
                          }}
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

            {/* Injury level */}
            <View>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Injury Level
              </ThemedText>
              <TextInput
                value={assessment.injuryLevel ?? ""}
                onChangeText={(text) =>
                  update({ injuryLevel: text || undefined })
                }
                placeholder="e.g. mid-forearm, wrist, fibular head"
                placeholderTextColor={theme.textTertiary}
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.border,
                  },
                ]}
              />
            </View>
          </View>
        </SectionWrapper>

        {/* ═══ Section 2: Classification ═══ */}
        <SectionWrapper title="2. Classification" icon="layers">
          <NerveInjuryClassification
            sunderlandGrade={assessment.sunderlandGrade}
            mechanism={assessment.mechanism}
            timing={assessment.timing}
            openVsClosed={assessment.openVsClosed}
            onSunderlandChange={(grade) => update({ sunderlandGrade: grade })}
            onMechanismChange={(mechanism) => update({ mechanism })}
            onTimingChange={(timing) => update({ timing })}
            onOpenClosedChange={(openVsClosed) => update({ openVsClosed })}
          />
        </SectionWrapper>

        {/* ═══ Section 3: Electrodiagnostics ═══ */}
        <SectionWrapper
          title="3. Electrodiagnostics"
          icon="zap"
          collapsible
          defaultCollapsed
        >
          <ElectrodiagnosticSummaryComponent
            data={assessment.electrodiagnostics}
            onChange={(electrodiagnostics) => update({ electrodiagnostics })}
          />
        </SectionWrapper>

        {/* ═══ Section 4: Intraoperative Findings ═══ */}
        <SectionWrapper
          title="4. Intraoperative Findings"
          icon="search"
          collapsible
          defaultCollapsed
        >
          <View style={{ gap: Spacing.md }}>
            {/* Nerve gap */}
            <View>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Nerve Gap (mm)
              </ThemedText>
              <TextInput
                value={assessment.nerveGapMm?.toString() ?? ""}
                onChangeText={(text) =>
                  update({ nerveGapMm: text ? Number(text) : undefined })
                }
                keyboardType="numeric"
                placeholder="mm"
                placeholderTextColor={theme.textTertiary}
                style={[
                  styles.numericInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.border,
                  },
                ]}
              />
            </View>

            {/* Neuroma present intraop */}
            <View style={styles.switchRow}>
              <ThemedText style={{ color: theme.text, fontSize: 15 }}>
                Neuroma present intraoperatively
              </ThemedText>
              <Switch
                value={assessment.neuromaPresentIntraop === true}
                onValueChange={(val) =>
                  update({ neuromaPresentIntraop: val })
                }
                trackColor={{ true: theme.accent, false: theme.border }}
                thumbColor={theme.backgroundRoot}
              />
            </View>

            {/* NAP across lesion */}
            <View>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                NAP Across Lesion
              </ThemedText>
              <View style={styles.chipRow}>
                {(
                  ["positive", "negative", "not_tested"] as const
                ).map((val) => {
                  const selected = assessment.napAcrossLesion === val;
                  const label =
                    val === "not_tested"
                      ? "Not tested"
                      : val === "positive"
                        ? "Positive"
                        : "Negative";
                  return (
                    <Pressable
                      key={val}
                      onPress={() => {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );
                        update({
                          napAcrossLesion:
                            assessment.napAcrossLesion === val
                              ? undefined
                              : val,
                        });
                      }}
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
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: selected
                            ? theme.buttonText
                            : theme.text,
                        }}
                      >
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Associated injuries */}
            <View style={styles.switchRow}>
              <ThemedText style={{ color: theme.text, fontSize: 15 }}>
                Associated vascular injury
              </ThemedText>
              <Switch
                value={assessment.associatedVascularInjury === true}
                onValueChange={(val) =>
                  update({ associatedVascularInjury: val })
                }
                trackColor={{ true: theme.accent, false: theme.border }}
                thumbColor={theme.backgroundRoot}
              />
            </View>
            <View style={styles.switchRow}>
              <ThemedText style={{ color: theme.text, fontSize: 15 }}>
                Associated fracture
              </ThemedText>
              <Switch
                value={assessment.associatedFracture === true}
                onValueChange={(val) =>
                  update({ associatedFracture: val })
                }
                trackColor={{ true: theme.accent, false: theme.border }}
                thumbColor={theme.backgroundRoot}
              />
            </View>
          </View>
        </SectionWrapper>

        {/* ═══ Section 5: Repair / Reconstruction ═══ */}
        {showRepairSection && (
          <SectionWrapper title="5. Repair / Reconstruction" icon="tool">
            <View style={{ gap: Spacing.md }}>
              {/* Repair timing */}
              <View>
                <ThemedText
                  style={[
                    styles.fieldLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Repair Timing
                </ThemedText>
                <View style={styles.chipRow}>
                  {REPAIR_TIMINGS.map((t) => {
                    const selected = assessment.repairTiming === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => handleRepairTimingPress(t)}
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
                      >
                        <ThemedText
                          style={{
                            fontSize: 13,
                            fontWeight: "500",
                            color: selected
                              ? theme.buttonText
                              : theme.text,
                          }}
                        >
                          {REPAIR_TIMING_LABELS[t]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Repair technique */}
              <View>
                <ThemedText
                  style={[
                    styles.fieldLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Repair Technique
                </ThemedText>
                <View style={styles.chipRow}>
                  {REPAIR_TECHNIQUES.map((t) => {
                    const selected = assessment.repairTechnique === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => handleRepairTechniquePress(t)}
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
                      >
                        <ThemedText
                          style={{
                            fontSize: 13,
                            fontWeight: "500",
                            color: selected
                              ? theme.buttonText
                              : theme.text,
                          }}
                        >
                          {REPAIR_TECHNIQUE_LABELS[t]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Graft details */}
              {(showGraft || showConduit) && (
                <NerveGraftDetailsComponent
                  graftDetails={assessment.graftDetails}
                  conduitDetails={assessment.conduitDetails}
                  onGraftChange={(graftDetails) => update({ graftDetails })}
                  onConduitChange={(conduitDetails) =>
                    update({ conduitDetails })
                  }
                  showGraft={showGraft}
                  showConduit={showConduit}
                />
              )}

              {/* Transfer details */}
              {showTransfer && (
                <NerveTransferPicker
                  details={assessment.transferDetails}
                  onChange={(transferDetails) => update({ transferDetails })}
                />
              )}
            </View>
          </SectionWrapper>
        )}

        {/* ═══ Sub-module placeholders (Phase 4–5) ═══ */}
        {/* BrachialPlexusAssessment will render here when brachialPlexusModule */}
        {/* NeuromaAssessment will render here when neuromaModule */}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
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
    maxWidth: 120,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    gap: Spacing.sm,
  },
});
