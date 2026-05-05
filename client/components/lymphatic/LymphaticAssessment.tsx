/**
 * LymphaticAssessment — Main inline assessment for the lymphoedema module.
 *
 * Renders inline in DiagnosisGroupEditor when diagnosis has `lymphoedemaModule: true`.
 * Amber-bordered card with 6 numbered collapsible sections:
 *   1. Affected Region & Side (always visible)
 *   2. ISL Staging (always visible)
 *   3. ICG Lymphography (collapsed by default)
 *   4. Bioimpedance / L-Dex (collapsed by default)
 *   5. Limb Measurements (collapsed by default)
 *   6. Clinical History (collapsed by default)
 *
 * Sub-60-second happy path: diagnosis → ISL stage → done.
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  LymphaticAssessment as LymphaticAssessmentData,
  ISLStage,
  ISLSeverity,
  LymphoedemaRegion,
  ICGLymphographyData,
  ICGPattern,
  ICGDevice,
  BioimpedanceData,
  BioimpedanceDevice,
  LimbMeasurementData,
  LymphoedemaHistory,
  OnsetType,
  CDTResponse,
  CompressionClass,
  CancerSurgeryType,
} from "@/types/lymphatic";
import {
  ISL_STAGE_LABELS,
  ISL_SEVERITY_LABELS,
  LYMPHOEDEMA_REGION_LABELS,
  ICG_PATTERN_LABELS,
  ICG_DEVICE_LABELS,
  BIOIMPEDANCE_DEVICE_LABELS,
} from "@/types/lymphatic";
import { CircumferenceEntry } from "./CircumferenceEntry";
import { LVAOperativeDetailsComponent } from "./LVAOperativeDetails";
import { VLNTDetailsComponent } from "./VLNTDetails";
import { SAPLDetailsComponent } from "./SAPLDetails";
import { LymphaticFollowUpEntry } from "./LymphaticFollowUpEntry";
import { getLymphaticProcedureCategory } from "@/lib/lymphaticConfig";
import type { CaseProcedure } from "@/types/case";
import type {
  LVAOperativeDetails,
  VLNTSpecificDetails,
  SAPLOperativeDetails,
  LymphaticFollowUp,
} from "@/types/lymphatic";

// ─── Props ──────────────────────────────────────────────────────────────────

interface LymphaticAssessmentProps {
  assessment: LymphaticAssessmentData;
  onAssessmentChange: (assessment: LymphaticAssessmentData) => void;
  diagnosisId?: string;
  /** Procedures from the parent diagnosis group — used for procedure-level detail sections */
  procedures?: CaseProcedure[];
  /** Callback to update procedure-level detail fields */
  onProcedureDetailsChange?: (
    procedureId: string,
    field: string,
    details: unknown,
  ) => void;
}

// ─── Chip helper ────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options,
  labels,
  selected,
  onSelect,
  accentColor,
  theme,
}: {
  options: T[];
  labels: Record<T, string>;
  selected?: T;
  onSelect: (v: T) => void;
  accentColor: string;
  theme: any;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? accentColor + "20"
                  : theme.backgroundSecondary,
                borderColor: isSelected ? accentColor : theme.border,
              },
            ]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.chipText,
                { color: isSelected ? accentColor : theme.textSecondary },
              ]}
              numberOfLines={2}
            >
              {labels[opt]}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

const ISL_STAGES: ISLStage[] = ["0", "I", "II_early", "II_late", "III"];
const ISL_SEVERITIES: ISLSeverity[] = ["mild", "moderate", "severe"];
const REGIONS: LymphoedemaRegion[] = [
  "upper_limb",
  "lower_limb",
  "breast_trunk",
  "genital",
  "face_neck",
  "bilateral_lower",
  "bilateral_upper",
];
const SIDES = ["left", "right", "bilateral"] as const;
const SIDE_LABELS: Record<string, string> = {
  left: "Left",
  right: "Right",
  bilateral: "Bilateral",
};
const ICG_DEVICES: ICGDevice[] = [
  "spy_stryker",
  "pde_neo_ii",
  "fluobeam",
  "microscope_integrated",
  "other",
];
const ICG_PATTERNS: ICGPattern[] = [
  "linear",
  "splash",
  "stardust",
  "diffuse",
  "no_flow",
];
const BIOIMPEDANCE_DEVICES: BioimpedanceDevice[] = ["sozo", "u400", "other"];

export const LymphaticAssessment = React.memo(function LymphaticAssessment({
  assessment,
  onAssessmentChange,
  diagnosisId,
  procedures,
  onProcedureDetailsChange,
}: LymphaticAssessmentProps) {
  const { theme } = useTheme();

  const update = useCallback(
    (patch: Partial<LymphaticAssessmentData>) => {
      onAssessmentChange({ ...assessment, ...patch });
    },
    [assessment, onAssessmentChange],
  );

  // ── ICG helpers ──
  const icg = assessment.icgLymphography;
  const updateICG = useCallback(
    (patch: Partial<ICGLymphographyData>) => {
      update({ icgLymphography: { ...icg, injectionSites: [], ...patch } });
    },
    [icg, update],
  );

  // ── Bioimpedance helpers ──
  const bio = assessment.bioimpedance;
  const updateBio = useCallback(
    (patch: Partial<BioimpedanceData>) => {
      const updated = { ...bio, ...patch };
      // Auto-calculate change
      if (updated.baselineLDex != null && updated.currentLDex != null) {
        updated.changeFromBaseline =
          Math.round((updated.currentLDex - updated.baselineLDex) * 10) / 10;
      }
      update({ bioimpedance: updated });
    },
    [bio, update],
  );

  // ── Limb measurements ──
  const limbData: LimbMeasurementData = useMemo(
    () =>
      assessment.limbMeasurements ?? {
        method: "tape_circumference",
        affectedLimb: [],
        contralateralLimb: [],
      },
    [assessment.limbMeasurements],
  );

  const updateLimb = useCallback(
    (data: LimbMeasurementData) => {
      update({ limbMeasurements: data });
    },
    [update],
  );

  // ── History helpers ──
  const history = assessment.clinicalHistory;
  const updateHistory = useCallback(
    (patch: Partial<LymphoedemaHistory>) => {
      update({ clinicalHistory: { ...history, ...patch } });
    },
    [history, update],
  );

  return (
    <View
      testID="caseForm.lymphatic.assessment"
      style={[
        styles.container,
        {
          borderColor: theme.accent,
          backgroundColor: theme.backgroundElevated,
        },
      ]}
    >
      <ThemedText style={styles.moduleTitle}>Lymphoedema Assessment</ThemedText>

      {/* ────── Section 1: Affected Region & Side ────── */}
      <SectionWrapper title="1. Affected Region & Side" icon="map-pin">
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Region
        </ThemedText>
        <ChipRow
          options={REGIONS}
          labels={LYMPHOEDEMA_REGION_LABELS}
          selected={assessment.affectedRegion}
          onSelect={(v) => update({ affectedRegion: v })}
          accentColor={theme.accent}
          theme={theme}
        />

        <ThemedText
          style={[
            styles.label,
            { color: theme.textSecondary, marginTop: Spacing.md },
          ]}
        >
          Side
        </ThemedText>
        <ChipRow
          options={[...SIDES]}
          labels={SIDE_LABELS as Record<string, string>}
          selected={assessment.affectedSide}
          onSelect={(v) =>
            update({ affectedSide: v as "left" | "right" | "bilateral" })
          }
          accentColor={theme.accent}
          theme={theme}
        />
      </SectionWrapper>

      {/* ────── Section 2: ISL Staging ────── */}
      <SectionWrapper title="2. ISL Staging" icon="layers">
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Stage
        </ThemedText>
        <ChipRow
          options={ISL_STAGES}
          labels={ISL_STAGE_LABELS}
          selected={assessment.islStage}
          onSelect={(v) => update({ islStage: v })}
          accentColor={theme.accent}
          theme={theme}
        />

        <ThemedText
          style={[
            styles.label,
            { color: theme.textSecondary, marginTop: Spacing.md },
          ]}
        >
          Severity
        </ThemedText>
        <ChipRow
          options={ISL_SEVERITIES}
          labels={ISL_SEVERITY_LABELS}
          selected={assessment.islSeverity}
          onSelect={(v) => update({ islSeverity: v })}
          accentColor={theme.accent}
          theme={theme}
        />
      </SectionWrapper>

      {/* ────── Section 3: ICG Lymphography (collapsed) ────── */}
      <SectionWrapper
        title="3. ICG Lymphography"
        icon="eye"
        collapsible
        defaultCollapsed
      >
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Device
        </ThemedText>
        <ChipRow
          options={ICG_DEVICES}
          labels={ICG_DEVICE_LABELS}
          selected={icg?.device}
          onSelect={(v) => updateICG({ device: v })}
          accentColor={theme.accent}
          theme={theme}
        />

        <ThemedText
          style={[
            styles.label,
            { color: theme.textSecondary, marginTop: Spacing.md },
          ]}
        >
          Overall pattern
        </ThemedText>
        <ChipRow
          options={ICG_PATTERNS}
          labels={ICG_PATTERN_LABELS}
          selected={icg?.overallPattern}
          onSelect={(v) => updateICG({ overallPattern: v })}
          accentColor={theme.accent}
          theme={theme}
        />

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Functional vessels
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="number-pad"
              placeholder="Count"
              placeholderTextColor={theme.textTertiary}
              value={
                icg?.functionalVesselsIdentified != null
                  ? String(icg.functionalVesselsIdentified)
                  : ""
              }
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                updateICG({
                  functionalVesselsIdentified: isNaN(n) ? undefined : n,
                });
              }}
            />
          </View>
          <View style={styles.fieldHalf}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Skin markings placed
            </ThemedText>
            <Switch
              value={icg?.skinMarkingsPlaced ?? false}
              onValueChange={(v) => updateICG({ skinMarkingsPlaced: v })}
              trackColor={{
                false: theme.backgroundSecondary,
                true: theme.accent + "60",
              }}
              thumbColor={
                icg?.skinMarkingsPlaced ? theme.accent : theme.textTertiary
              }
            />
          </View>
        </View>
      </SectionWrapper>

      {/* ────── Section 4: Bioimpedance / L-Dex (collapsed) ────── */}
      <SectionWrapper
        title="4. Bioimpedance (L-Dex)"
        icon="activity"
        collapsible
        defaultCollapsed
      >
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          Device
        </ThemedText>
        <ChipRow
          options={BIOIMPEDANCE_DEVICES}
          labels={BIOIMPEDANCE_DEVICE_LABELS}
          selected={bio?.device}
          onSelect={(v) => updateBio({ device: v })}
          accentColor={theme.accent}
          theme={theme}
        />

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Baseline L-Dex
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="decimal-pad"
              placeholder="e.g. 7.2"
              placeholderTextColor={theme.textTertiary}
              value={bio?.baselineLDex != null ? String(bio.baselineLDex) : ""}
              onChangeText={(v) => {
                const n = parseFloat(v);
                updateBio({ baselineLDex: isNaN(n) ? undefined : n });
              }}
            />
          </View>
          <View style={styles.fieldHalf}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Current L-Dex
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="decimal-pad"
              placeholder="e.g. 12.5"
              placeholderTextColor={theme.textTertiary}
              value={bio?.currentLDex != null ? String(bio.currentLDex) : ""}
              onChangeText={(v) => {
                const n = parseFloat(v);
                updateBio({ currentLDex: isNaN(n) ? undefined : n });
              }}
            />
          </View>
        </View>

        {bio?.changeFromBaseline != null && (
          <View
            style={[
              styles.resultBadge,
              {
                backgroundColor:
                  bio.changeFromBaseline > 10
                    ? theme.error + "15"
                    : theme.accent + "15",
                borderColor:
                  bio.changeFromBaseline > 10 ? theme.error : theme.accent,
              },
            ]}
          >
            <ThemedText
              style={{
                color: bio.changeFromBaseline > 10 ? theme.error : theme.accent,
                fontWeight: "600",
              }}
            >
              Change: {bio.changeFromBaseline > 0 ? "+" : ""}
              {bio.changeFromBaseline}
            </ThemedText>
          </View>
        )}
      </SectionWrapper>

      {/* ────── Section 5: Limb Measurements (collapsed) ────── */}
      <SectionWrapper
        title="5. Limb Measurements"
        icon="ruler"
        collapsible
        defaultCollapsed
      >
        <CircumferenceEntry
          data={limbData}
          onChange={updateLimb}
          region={assessment.affectedRegion}
        />
      </SectionWrapper>

      {/* ────── Section 6: Clinical History (collapsed) ────── */}
      <SectionWrapper
        title="6. Clinical History"
        icon="clipboard"
        collapsible
        defaultCollapsed
      >
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Duration (months)
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="number-pad"
              placeholder="e.g. 24"
              placeholderTextColor={theme.textTertiary}
              value={
                history?.durationMonths != null
                  ? String(history.durationMonths)
                  : ""
              }
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                updateHistory({ durationMonths: isNaN(n) ? undefined : n });
              }}
            />
          </View>
          <View style={styles.fieldHalf}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Onset
            </ThemedText>
            <ChipRow
              options={["acute", "gradual"] as OnsetType[]}
              labels={{ acute: "Acute", gradual: "Gradual" }}
              selected={history?.onsetType}
              onSelect={(v) => updateHistory({ onsetType: v })}
              accentColor={theme.accent}
              theme={theme}
            />
          </View>
        </View>

        {/* CDT history */}
        <View style={[styles.toggleRow, { marginTop: Spacing.md }]}>
          <ThemedText style={{ color: theme.textSecondary }}>
            Prior CDT (complete decongestive therapy)
          </ThemedText>
          <Switch
            value={history?.priorCDT ?? false}
            onValueChange={(v) => updateHistory({ priorCDT: v })}
            trackColor={{
              false: theme.backgroundSecondary,
              true: theme.accent + "60",
            }}
            thumbColor={history?.priorCDT ? theme.accent : theme.textTertiary}
          />
        </View>

        {history?.priorCDT && (
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.label, { color: theme.textSecondary }]}
              >
                CDT courses
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="number-pad"
                value={
                  history?.cdtCourses != null ? String(history.cdtCourses) : ""
                }
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  updateHistory({ cdtCourses: isNaN(n) ? undefined : n });
                }}
              />
            </View>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.label, { color: theme.textSecondary }]}
              >
                Response
              </ThemedText>
              <ChipRow
                options={["complete", "partial", "none"] as CDTResponse[]}
                labels={{
                  complete: "Complete",
                  partial: "Partial",
                  none: "None",
                }}
                selected={history?.cdtResponse}
                onSelect={(v) => updateHistory({ cdtResponse: v })}
                accentColor={theme.accent}
                theme={theme}
              />
            </View>
          </View>
        )}

        {/* Key clinical flags */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              Cellulitis episodes/year
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              value={
                history?.cellulitisEpisodesPerYear != null
                  ? String(history.cellulitisEpisodesPerYear)
                  : ""
              }
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                updateHistory({
                  cellulitisEpisodesPerYear: isNaN(n) ? undefined : n,
                });
              }}
            />
          </View>
          <View style={styles.fieldHalf}>
            <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
              BMI
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="decimal-pad"
              placeholder="e.g. 28.5"
              placeholderTextColor={theme.textTertiary}
              value={history?.bmi != null ? String(history.bmi) : ""}
              onChangeText={(v) => {
                const n = parseFloat(v);
                updateHistory({ bmi: isNaN(n) ? undefined : n });
              }}
            />
          </View>
        </View>

        {/* Clinical signs */}
        <View style={[styles.toggleRow, { marginTop: Spacing.sm }]}>
          <ThemedText style={{ color: theme.textSecondary }}>
            Stemmer sign positive
          </ThemedText>
          <Switch
            value={history?.stemmerSign ?? false}
            onValueChange={(v) => updateHistory({ stemmerSign: v })}
            trackColor={{
              false: theme.backgroundSecondary,
              true: theme.accent + "60",
            }}
            thumbColor={
              history?.stemmerSign ? theme.accent : theme.textTertiary
            }
          />
        </View>
        <View style={styles.toggleRow}>
          <ThemedText style={{ color: theme.textSecondary }}>
            Pitting present
          </ThemedText>
          <Switch
            value={history?.pittingPresent ?? false}
            onValueChange={(v) => updateHistory({ pittingPresent: v })}
            trackColor={{
              false: theme.backgroundSecondary,
              true: theme.accent + "60",
            }}
            thumbColor={
              history?.pittingPresent ? theme.accent : theme.textTertiary
            }
          />
        </View>
        <View style={styles.toggleRow}>
          <ThemedText style={{ color: theme.textSecondary }}>
            Prior lymphatic surgery
          </ThemedText>
          <Switch
            value={history?.priorLymphaticSurgery ?? false}
            onValueChange={(v) => updateHistory({ priorLymphaticSurgery: v })}
            trackColor={{
              false: theme.backgroundSecondary,
              true: theme.accent + "60",
            }}
            thumbColor={
              history?.priorLymphaticSurgery ? theme.accent : theme.textTertiary
            }
          />
        </View>
      </SectionWrapper>

      {/* ────── Section 7+: Procedure-Level Operative Details ────── */}
      {procedures && onProcedureDetailsChange
        ? procedures.map((proc) => {
            const category = getLymphaticProcedureCategory(
              proc.picklistEntryId,
            );
            if (category === "lva") {
              const details: LVAOperativeDetails = proc.lvaOperativeDetails ?? {
                anastomoses: [],
              };
              return (
                <LVAOperativeDetailsComponent
                  key={proc.id}
                  value={details}
                  onChange={(d) =>
                    onProcedureDetailsChange(proc.id, "lvaOperativeDetails", d)
                  }
                  procedureName={proc.procedureName}
                />
              );
            }
            if (category === "vlnt") {
              const details: VLNTSpecificDetails = proc.vlntDetails ?? {};
              return (
                <VLNTDetailsComponent
                  key={proc.id}
                  value={details}
                  onChange={(d) =>
                    onProcedureDetailsChange(proc.id, "vlntDetails", d)
                  }
                  procedureName={proc.procedureName}
                />
              );
            }
            if (category === "sapl" || category === "lipo_lipedema") {
              const details: SAPLOperativeDetails = proc.saplDetails ?? {};
              return (
                <SAPLDetailsComponent
                  key={proc.id}
                  value={details}
                  onChange={(d) =>
                    onProcedureDetailsChange(proc.id, "saplDetails", d)
                  }
                  procedureName={proc.procedureName}
                />
              );
            }
            return null;
          })
        : null}

      {/* ────── Follow-Up Section (collapsed by default) ────── */}
      <LymphaticFollowUpEntry
        value={assessment.followUp ?? { timepoint: "3_months", date: "" }}
        onChange={(followUp) => update({ followUp })}
        affectedRegion={assessment.affectedRegion}
      />
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.3,
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
  },
  chipText: {
    fontSize: 13,
  },
  fieldRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  fieldHalf: {
    flex: 1,
  },
  textInput: {
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  resultBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});
