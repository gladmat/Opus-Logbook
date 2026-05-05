/**
 * BrachialPlexusAssessment — amber-bordered sub-module for brachial plexus
 * injury documentation. Renders within PeripheralNerveAssessment when
 * the selected diagnosis has `brachialPlexusModule: true`.
 *
 * 6 progressive disclosure sections:
 *   1. Injury Pattern quick-select (always visible)
 *   2. Interactive BrachialPlexusDiagram (always visible)
 *   3. Per-Root Detail Cards (collapsed, only injured roots)
 *   4. Mechanism & Associated Injuries (collapsed)
 *   5. Imaging & Approach (collapsed)
 *   6. Procedures — multi-procedure entry list (collapsed)
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
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import type {
  BrachialPlexusAssessmentData,
  BPRoot,
  BPTrunk,
  BPCord,
  BPTerminalBranch,
  BPInjuryType,
  BPInjuryPattern,
  BPMechanism,
  BPLevelInjury,
  BPPrePostGanglionic,
  SunderlandGrade,
  BrachialPlexusProcedureEntry,
  FFMTDetails,
  NerveIdentifier,
} from "@/types/peripheralNerve";
import {
  BP_INJURY_TYPE_LABELS,
  BP_PATTERN_LABELS,
  BP_MECHANISM_LABELS,
  SUNDERLAND_LABELS,
} from "@/types/peripheralNerve";
import {
  BP_ROOT_ORDER,
  BP_APPROACH_LABELS,
  BP_PROCEDURE_TYPE_LABELS,
  FFMT_DONOR_MUSCLE_LABELS,
  FFMT_TARGET_LABELS,
  applyInjuryPattern,
  deriveInjuryPattern,
  cycleInjuryType,
} from "@/lib/peripheralNerveConfig";
import { BrachialPlexusDiagram } from "./BrachialPlexusDiagram";
import { NerveGraftDetailsComponent } from "./NerveGraftDetailsComponent";
import { NerveTransferPicker } from "./NerveTransferPicker";

// ── Props ────────────────────────────────────────────────────────────────────

interface BrachialPlexusAssessmentProps {
  data: BrachialPlexusAssessmentData;
  onChange: (data: BrachialPlexusAssessmentData) => void;
  aetiology?: "obstetric" | "traumatic" | "radiation" | "tumour";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SMOOTH_LAYOUT = LayoutAnimation.Presets.easeInEaseOut;

const PATTERNS: BPInjuryPattern[] = [
  "upper_c5_c6",
  "extended_upper_c5_c7",
  "complete_c5_t1",
  "lower_c8_t1",
  "isolated_root",
  "other",
];

const TRAUMATIC_MECHANISMS: BPMechanism[] = [
  "motorcycle",
  "mva",
  "bicycle",
  "fall",
  "shoulder_dislocation",
  "clavicle_fracture",
  "penetrating",
  "gunshot",
  "iatrogenic",
  "compression",
  "other",
];

const OBSTETRIC_MECHANISMS: BPMechanism[] = ["obstetric", "other"];

const ALL_MECHANISMS: BPMechanism[] = [
  "motorcycle",
  "mva",
  "bicycle",
  "fall",
  "shoulder_dislocation",
  "clavicle_fracture",
  "penetrating",
  "gunshot",
  "obstetric",
  "iatrogenic",
  "compression",
  "radiation",
  "other",
];

function getMechanismsForAetiology(
  aetiology?: "obstetric" | "traumatic" | "radiation" | "tumour",
): BPMechanism[] {
  switch (aetiology) {
    case "obstetric":
      return OBSTETRIC_MECHANISMS;
    case "traumatic":
      return TRAUMATIC_MECHANISMS;
    case "radiation":
      return ["radiation", "other"];
    case "tumour":
      return ["compression", "other"];
    default:
      return ALL_MECHANISMS;
  }
}

const APPROACHES = Object.keys(BP_APPROACH_LABELS) as Array<
  NonNullable<BrachialPlexusAssessmentData["approach"]>
>;

const PRE_POST_OPTIONS: { key: BPPrePostGanglionic; label: string }[] = [
  { key: "preganglionic", label: "Pre-ganglionic" },
  { key: "postganglionic", label: "Post-ganglionic" },
  { key: "mixed", label: "Mixed" },
  { key: "unknown", label: "Unknown" },
];

const SUNDERLAND_GRADES: SunderlandGrade[] = [
  "0",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
];

const PROCEDURE_TYPES = Object.keys(BP_PROCEDURE_TYPE_LABELS) as Array<
  BrachialPlexusProcedureEntry["procedureType"]
>;

/** Get injured roots (non-intact, non-unknown) for per-root detail cards */
function getInjuredRoots(
  roots: Partial<Record<BPRoot, BPLevelInjury>>,
): BPRoot[] {
  return BP_ROOT_ORDER.filter((r) => {
    const type = roots[r]?.injuryType;
    return type && type !== "intact" && type !== "unknown";
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export const BrachialPlexusAssessment = React.memo(
  function BrachialPlexusAssessment({
    data,
    onChange,
    aetiology,
  }: BrachialPlexusAssessmentProps) {
    const { theme, isDark } = useTheme();

    // Local collapse state
    const [rootDetailsExpanded, setRootDetailsExpanded] = useState(false);
    const [mechanismExpanded, setMechanismExpanded] = useState(false);
    const [imagingExpanded, setImagingExpanded] = useState(false);
    const [proceduresExpanded, setProceduresExpanded] = useState(false);

    // Shallow update helper
    const update = useCallback(
      (partial: Partial<BrachialPlexusAssessmentData>) => {
        onChange({ ...data, ...partial });
      },
      [data, onChange],
    );

    // Derived values
    const injuredRoots = useMemo(
      () => getInjuredRoots(data.roots),
      [data.roots],
    );
    const derivedPattern = useMemo(
      () => deriveInjuryPattern(data.roots),
      [data.roots],
    );
    const activePattern = data.injuryPattern ?? derivedPattern;

    const filteredMechanisms = useMemo(
      () => getMechanismsForAetiology(aetiology),
      [aetiology],
    );

    // ── Pattern quick-select ────────────────────────────────────────────

    const handlePatternSelect = useCallback(
      (pattern: BPInjuryPattern) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newRoots = applyInjuryPattern(pattern);
        // For "isolated_root" or "other", keep existing roots
        if (pattern === "isolated_root" || pattern === "other") {
          update({ injuryPattern: pattern });
        } else {
          update({ injuryPattern: pattern, roots: newRoots });
        }
      },
      [update],
    );

    // ── Root tap (diagram cycle) ────────────────────────────────────────

    const handleRootPress = useCallback(
      (root: BPRoot) => {
        const current = data.roots[root]?.injuryType;
        const next = cycleInjuryType(current);
        const updatedRoot: BPLevelInjury = {
          ...(data.roots[root] ?? { injuryType: "unknown" }),
          injuryType: next,
        };
        const newRoots = { ...data.roots, [root]: updatedRoot };
        // Clear the manual pattern when roots are edited via diagram
        update({ roots: newRoots, injuryPattern: undefined });
      },
      [data.roots, update],
    );

    // ── Per-root detail update ──────────────────────────────────────────

    const updateRootDetail = useCallback(
      (root: BPRoot, partial: Partial<BPLevelInjury>) => {
        const existing = data.roots[root] ?? { injuryType: "unknown" };
        update({
          roots: { ...data.roots, [root]: { ...existing, ...partial } },
        });
      },
      [data.roots, update],
    );

    // ── Procedure CRUD ──────────────────────────────────────────────────

    const addProcedure = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(SMOOTH_LAYOUT);
      const entry: BrachialPlexusProcedureEntry = {
        procedureType: "nerve_graft",
      };
      update({ procedures: [...(data.procedures ?? []), entry] });
    }, [data.procedures, update]);

    const updateProcedure = useCallback(
      (idx: number, partial: Partial<BrachialPlexusProcedureEntry>) => {
        const procs = [...(data.procedures ?? [])];
        const existing = procs[idx];
        if (!existing) return;
        procs[idx] = { ...existing, ...partial };
        update({ procedures: procs });
      },
      [data.procedures, update],
    );

    const removeProcedure = useCallback(
      (idx: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(SMOOTH_LAYOUT);
        const procs = [...(data.procedures ?? [])];
        procs.splice(idx, 1);
        update({ procedures: procs });
      },
      [data.procedures, update],
    );

    // ── Toggle helpers ──────────────────────────────────────────────────

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

    // ── Render ──────────────────────────────────────────────────────────

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
          Brachial Plexus Assessment
        </ThemedText>

        {/* ═══ Section 1: Injury Pattern Quick-Select ═══ */}
        <View style={styles.section}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Injury Pattern
          </ThemedText>
          <View style={styles.chipRow}>
            {PATTERNS.map((pattern) => (
              <Pressable
                key={pattern}
                style={chipStyle(activePattern === pattern)}
                onPress={() => handlePatternSelect(pattern)}
                accessibilityRole="button"
                accessibilityState={{ selected: activePattern === pattern }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: chipTextColor(activePattern === pattern) },
                  ]}
                >
                  {BP_PATTERN_LABELS[pattern]}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ═══ Section 2: Interactive Diagram ═══ */}
        <BrachialPlexusDiagram
          roots={data.roots}
          trunks={data.trunks}
          cords={data.cords}
          terminalBranches={data.terminalBranches}
          onRootPress={handleRootPress}
        />

        {/* ═══ Section 3: Per-Root Detail Cards (collapsed) ═══ */}
        {injuredRoots.length > 0 && (
          <View>
            <Pressable
              style={styles.sectionHeader}
              onPress={() => toggleSection(setRootDetailsExpanded)}
              accessibilityRole="button"
            >
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                Root Details ({injuredRoots.length})
              </ThemedText>
              <Feather
                name={rootDetailsExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.textSecondary}
              />
            </Pressable>
            {rootDetailsExpanded &&
              injuredRoots.map((root) => {
                const injury = data.roots[root]!;
                return (
                  <View
                    key={root}
                    style={[
                      styles.rootCard,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundElevated,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.rootCardTitle, { color: theme.link }]}
                    >
                      {root} — {BP_INJURY_TYPE_LABELS[injury.injuryType]}
                    </ThemedText>

                    {/* Sunderland grade */}
                    <ThemedText
                      style={[
                        styles.fieldLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Sunderland Grade
                    </ThemedText>
                    <View style={styles.chipRow}>
                      {SUNDERLAND_GRADES.map((grade) => (
                        <Pressable
                          key={grade}
                          style={chipStyle(injury.sunderlandGrade === grade)}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            updateRootDetail(root, {
                              sunderlandGrade:
                                injury.sunderlandGrade === grade
                                  ? undefined
                                  : grade,
                            });
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.chipText,
                              {
                                color: chipTextColor(
                                  injury.sunderlandGrade === grade,
                                ),
                              },
                            ]}
                          >
                            {grade}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>

                    {/* Pre/Post-ganglionic */}
                    <ThemedText
                      style={[
                        styles.fieldLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Pre/Post-Ganglionic
                    </ThemedText>
                    <View style={styles.chipRow}>
                      {PRE_POST_OPTIONS.map(({ key, label }) => (
                        <Pressable
                          key={key}
                          style={chipStyle(injury.prePostGanglionic === key)}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            updateRootDetail(root, {
                              prePostGanglionic:
                                injury.prePostGanglionic === key
                                  ? undefined
                                  : key,
                            });
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.chipText,
                              {
                                color: chipTextColor(
                                  injury.prePostGanglionic === key,
                                ),
                              },
                            ]}
                          >
                            {label}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>

                    {/* Confirmation switches */}
                    <View style={styles.switchRow}>
                      <ThemedText
                        style={[styles.switchLabel, { color: theme.text }]}
                      >
                        Imaging confirmed
                      </ThemedText>
                      <Switch
                        value={injury.imagingConfirmed ?? false}
                        onValueChange={(v) =>
                          updateRootDetail(root, { imagingConfirmed: v })
                        }
                        trackColor={{ true: theme.link }}
                      />
                    </View>
                    <View style={styles.switchRow}>
                      <ThemedText
                        style={[styles.switchLabel, { color: theme.text }]}
                      >
                        Intraop confirmed
                      </ThemedText>
                      <Switch
                        value={injury.intraopConfirmed ?? false}
                        onValueChange={(v) =>
                          updateRootDetail(root, { intraopConfirmed: v })
                        }
                        trackColor={{ true: theme.link }}
                      />
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* ═══ Section 4: Mechanism & Associated Injuries ═══ */}
        <Pressable
          style={styles.sectionHeader}
          onPress={() => toggleSection(setMechanismExpanded)}
          accessibilityRole="button"
        >
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Mechanism & Associated Injuries
          </ThemedText>
          <Feather
            name={mechanismExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textSecondary}
          />
        </Pressable>
        {mechanismExpanded && (
          <View style={styles.section}>
            {/* Mechanism */}
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Mechanism
            </ThemedText>
            <View style={styles.chipRow}>
              {filteredMechanisms.map((mech) => (
                <Pressable
                  key={mech}
                  style={chipStyle(data.mechanism === mech)}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({
                      mechanism: data.mechanism === mech ? undefined : mech,
                    });
                  }}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: chipTextColor(data.mechanism === mech) },
                    ]}
                  >
                    {BP_MECHANISM_LABELS[mech]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Energy level */}
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Energy Level
            </ThemedText>
            <View style={styles.chipRow}>
              {(["high", "low"] as const).map((level) => (
                <Pressable
                  key={level}
                  style={chipStyle(data.energyLevel === level)}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({
                      energyLevel:
                        data.energyLevel === level ? undefined : level,
                    });
                  }}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: chipTextColor(data.energyLevel === level) },
                    ]}
                  >
                    {level === "high" ? "High energy" : "Low energy"}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Associated injuries */}
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Horner syndrome
              </ThemedText>
              <Switch
                value={data.hornerSyndrome ?? false}
                onValueChange={(v) => update({ hornerSyndrome: v })}
                trackColor={{ true: theme.link }}
              />
            </View>
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Phrenic nerve palsy
              </ThemedText>
              <Switch
                value={data.phrenicNervePalsy ?? false}
                onValueChange={(v) => update({ phrenicNervePalsy: v })}
                trackColor={{ true: theme.link }}
              />
            </View>
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Winged scapula
              </ThemedText>
              <Switch
                value={data.wingedScapula ?? false}
                onValueChange={(v) => update({ wingedScapula: v })}
                trackColor={{ true: theme.link }}
              />
            </View>
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Associated vascular injury
              </ThemedText>
              <Switch
                value={data.associatedVascularInjury ?? false}
                onValueChange={(v) => update({ associatedVascularInjury: v })}
                trackColor={{ true: theme.link }}
              />
            </View>
          </View>
        )}

        {/* ═══ Section 5: Imaging & Approach ═══ */}
        <Pressable
          style={styles.sectionHeader}
          onPress={() => toggleSection(setImagingExpanded)}
          accessibilityRole="button"
        >
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Imaging & Surgical Approach
          </ThemedText>
          <Feather
            name={imagingExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textSecondary}
          />
        </Pressable>
        {imagingExpanded && (
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                MRI neurography
              </ThemedText>
              <Switch
                value={data.mriNeurography ?? false}
                onValueChange={(v) => update({ mriNeurography: v })}
                trackColor={{ true: theme.link }}
              />
            </View>
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                CT myelography
              </ThemedText>
              <Switch
                value={data.ctMyelography ?? false}
                onValueChange={(v) => update({ ctMyelography: v })}
                trackColor={{ true: theme.link }}
              />
            </View>
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Ultrasound
              </ThemedText>
              <Switch
                value={data.ultrasound ?? false}
                onValueChange={(v) => update({ ultrasound: v })}
                trackColor={{ true: theme.link }}
              />
            </View>

            {/* Approach */}
            <ThemedText
              style={[
                styles.fieldLabel,
                { color: theme.textSecondary, marginTop: Spacing.sm },
              ]}
            >
              Surgical Approach
            </ThemedText>
            <View style={styles.chipRow}>
              {APPROACHES.map((approach) => (
                <Pressable
                  key={approach}
                  style={chipStyle(data.approach === approach)}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({
                      approach:
                        data.approach === approach ? undefined : approach,
                    });
                  }}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: chipTextColor(data.approach === approach),
                      },
                    ]}
                  >
                    {BP_APPROACH_LABELS[approach]}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Clavicle osteotomy
              </ThemedText>
              <Switch
                value={data.clavicleOsteotomy ?? false}
                onValueChange={(v) => update({ clavicleOsteotomy: v })}
                trackColor={{ true: theme.link }}
              />
            </View>
          </View>
        )}

        {/* ═══ Section 6: Procedures ═══ */}
        <Pressable
          style={styles.sectionHeader}
          onPress={() => toggleSection(setProceduresExpanded)}
          accessibilityRole="button"
        >
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Brachial Plexus Procedures ({data.procedures?.length ?? 0})
          </ThemedText>
          <Feather
            name={proceduresExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textSecondary}
          />
        </Pressable>
        {proceduresExpanded && (
          <View style={styles.section}>
            {data.procedures?.map((proc, idx) => (
              <View
                key={idx}
                style={[
                  styles.procCard,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElevated,
                  },
                ]}
              >
                <View style={styles.procHeader}>
                  <ThemedText style={[styles.procTitle, { color: theme.text }]}>
                    Procedure {idx + 1}
                  </ThemedText>
                  <Pressable
                    onPress={() => removeProcedure(idx)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Remove procedure"
                  >
                    <Feather name="x" size={18} color={theme.textTertiary} />
                  </Pressable>
                </View>

                {/* Procedure type chips */}
                <View style={styles.chipRow}>
                  {PROCEDURE_TYPES.map((type) => (
                    <Pressable
                      key={type}
                      style={chipStyle(proc.procedureType === type)}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateProcedure(idx, { procedureType: type });
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          {
                            color: chipTextColor(proc.procedureType === type),
                          },
                        ]}
                      >
                        {BP_PROCEDURE_TYPE_LABELS[type]}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                {/* Conditional sub-fields based on procedure type */}
                {proc.procedureType === "nerve_graft" && (
                  <NerveGraftDetailsComponent
                    graftDetails={proc.graftDetails}
                    conduitDetails={undefined}
                    onGraftChange={(graftDetails) =>
                      updateProcedure(idx, { graftDetails })
                    }
                    onConduitChange={() => {}}
                    showGraft
                    showConduit={false}
                  />
                )}

                {proc.procedureType === "nerve_transfer" && (
                  <NerveTransferPicker
                    details={proc.transferDetails}
                    onChange={(transferDetails) =>
                      updateProcedure(idx, { transferDetails })
                    }
                  />
                )}

                {proc.procedureType === "ffmt" && (
                  <FFMTFields
                    details={proc.ffmtDetails}
                    onChange={(ffmtDetails) =>
                      updateProcedure(idx, { ffmtDetails })
                    }
                  />
                )}
              </View>
            ))}

            <Pressable
              style={[styles.addButton, { borderColor: theme.link }]}
              onPress={addProcedure}
              accessibilityRole="button"
            >
              <Feather name="plus" size={16} color={theme.link} />
              <ThemedText style={[styles.addButtonText, { color: theme.link }]}>
                Add procedure
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    );
  },
);

// ── FFMT Sub-Form ────────────────────────────────────────────────────────────

const FFMTFields = React.memo(function FFMTFields({
  details,
  onChange,
}: {
  details?: FFMTDetails;
  onChange: (details: FFMTDetails) => void;
}) {
  const { theme, isDark } = useTheme();

  const update = useCallback(
    (partial: Partial<FFMTDetails>) => {
      onChange({
        donorMuscle: details?.donorMuscle ?? "gracilis",
        motorNerveSource: details?.motorNerveSource ?? "spinal_accessory",
        targetFunction: details?.targetFunction ?? "elbow_flexion",
        ...details,
        ...partial,
      });
    },
    [details, onChange],
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

  const DONOR_MUSCLES = Object.keys(FFMT_DONOR_MUSCLE_LABELS) as Array<
    FFMTDetails["donorMuscle"]
  >;
  const TARGETS = Object.keys(FFMT_TARGET_LABELS) as Array<
    FFMTDetails["targetFunction"]
  >;

  return (
    <View style={styles.ffmtContainer}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Donor Muscle
      </ThemedText>
      <View style={styles.chipRow}>
        {DONOR_MUSCLES.map((muscle) => (
          <Pressable
            key={muscle}
            style={chipStyle(details?.donorMuscle === muscle)}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              update({ donorMuscle: muscle });
            }}
          >
            <ThemedText
              style={[
                styles.chipText,
                { color: chipTextColor(details?.donorMuscle === muscle) },
              ]}
            >
              {FFMT_DONOR_MUSCLE_LABELS[muscle]}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Target Function
      </ThemedText>
      <View style={styles.chipRow}>
        {TARGETS.map((target) => (
          <Pressable
            key={target}
            style={chipStyle(details?.targetFunction === target)}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              update({ targetFunction: target });
            }}
          >
            <ThemedText
              style={[
                styles.chipText,
                { color: chipTextColor(details?.targetFunction === target) },
              ]}
            >
              {FFMT_TARGET_LABELS[target]}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.numericRow}>
        <View style={styles.numericField}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Muscle Length (cm)
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
              details?.muscleLength != null ? String(details.muscleLength) : ""
            }
            onChangeText={(t) => {
              const v = parseFloat(t);
              update({ muscleLength: isNaN(v) ? undefined : v });
            }}
            keyboardType="decimal-pad"
            placeholder="cm"
            placeholderTextColor={theme.textTertiary}
          />
        </View>
        <View style={styles.numericField}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Ischaemia (min)
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
              details?.ischaemiaTimeMinutes != null
                ? String(details.ischaemiaTimeMinutes)
                : ""
            }
            onChangeText={(t) => {
              const v = parseInt(t, 10);
              update({ ischaemiaTimeMinutes: isNaN(v) ? undefined : v });
            }}
            keyboardType="number-pad"
            placeholder="min"
            placeholderTextColor={theme.textTertiary}
          />
        </View>
      </View>
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
  rootCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  rootCardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  procCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  procHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  procTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  ffmtContainer: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
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
