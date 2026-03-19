import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { ProcedureSubcategoryPicker } from "@/components/ProcedureSubcategoryPicker";
import { CompactProcedureList } from "@/components/CompactProcedureList";
import { CollapsibleFormSection } from "@/components/case-form/CollapsibleFormSection";
import { AestheticAssessment } from "./AestheticAssessment";
import {
  getAestheticProcedureConfig,
  autoInferDiagnosisEntry,
  resolveAutoInferredDiagnosisId,
  isAestheticProcedure,
  getAcgmeCategory,
  getAcgmeSubcategory,
  getInterventionType,
  INTENT_LABELS,
  INTENT_COLORS,
  ACGME_LABELS,
} from "@/lib/aestheticsConfig";
import type { AestheticDetailCardType } from "@/lib/aestheticsConfig";
import type {
  AestheticAssessment as AestheticAssessmentData,
  AestheticIntent,
} from "@/types/aesthetics";
import type { CaseProcedure, Specialty, Laterality, DiagnosisClinicalDetails } from "@/types/case";
import type { DiagnosisPicklistEntry } from "@/lib/diagnosisPicklists/index";
import type { ProcedurePicklistEntry } from "@/lib/procedurePicklist";
import { Spacing, BorderRadius } from "@/constants/theme";

interface AestheticProcedureFirstFlowProps {
  procedures: CaseProcedure[];
  onProceduresChange: (procedures: CaseProcedure[]) => void;
  aestheticAssessment: AestheticAssessmentData;
  onAssessmentChange: (assessment: AestheticAssessmentData) => void;
  diagnosisClinicalDetails: DiagnosisClinicalDetails;
  onDiagnosisClinicalDetailsChange: (details: DiagnosisClinicalDetails) => void;
  onDiagnosisInferred: (entry: DiagnosisPicklistEntry) => void;
  groupSpecialty: Specialty;
  buildProcedureFromPicklistId: (picklistId: string) => CaseProcedure | undefined;
}

const LATERALITY_OPTIONS: Array<{ value: Laterality; label: string }> = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "bilateral", label: "Bilateral" },
];

export const AestheticProcedureFirstFlow = React.memo(
  function AestheticProcedureFirstFlow({
    procedures,
    onProceduresChange,
    aestheticAssessment,
    onAssessmentChange,
    diagnosisClinicalDetails,
    onDiagnosisClinicalDetailsChange,
    onDiagnosisInferred,
    groupSpecialty,
    buildProcedureFromPicklistId,
  }: AestheticProcedureFirstFlowProps) {
    const { theme } = useTheme();

    // ─── Derived state ────────────────────────────────────────────────────

    // Find primary aesthetic procedure
    const primaryProcedure = useMemo(
      () =>
        procedures.find(
          (p) =>
            p.picklistEntryId != null &&
            isAestheticProcedure(p.picklistEntryId),
        ),
      [procedures],
    );

    const primaryProcedureId = primaryProcedure?.picklistEntryId;

    // Config for primary procedure
    const config = useMemo(
      () =>
        primaryProcedureId
          ? getAestheticProcedureConfig(primaryProcedureId)
          : undefined,
      [primaryProcedureId],
    );

    // Intent state — initialise from assessment (for edit mode) or config default
    const [currentIntent, setCurrentIntent] = useState<AestheticIntent>(
      () => aestheticAssessment.intent ?? config?.defaultIntent ?? "cosmetic",
    );

    // Reset intent when primary procedure changes
    useEffect(() => {
      if (config) {
        if (!config.needsIntentPrompt) {
          setCurrentIntent(config.defaultIntent);
        }
        // If prompt is needed and we have a stored intent, keep it
      }
    }, [config]);

    // Detail card type (derived from config, falls back to null)
    const detailCard: AestheticDetailCardType = config?.detailCard ?? null;

    // Whether to show laterality
    const showLaterality = useMemo(
      () => procedures.some((p) => {
        if (!p.picklistEntryId || !isAestheticProcedure(p.picklistEntryId)) return false;
        return getAestheticProcedureConfig(p.picklistEntryId).showLaterality;
      }),
      [procedures],
    );

    // Procedure picklist IDs for AestheticAssessment
    const procedurePicklistIds = useMemo(
      () =>
        procedures
          .map((p) => p.picklistEntryId)
          .filter((id): id is string => id != null),
      [procedures],
    );

    // ACGME derivations
    const acgmeCategory = useMemo(
      () => (primaryProcedureId ? getAcgmeCategory(primaryProcedureId) : undefined),
      [primaryProcedureId],
    );
    const acgmeSubcategory = useMemo(
      () => (primaryProcedureId ? getAcgmeSubcategory(primaryProcedureId) : undefined),
      [primaryProcedureId],
    );
    const interventionType = useMemo(
      () => (primaryProcedureId ? getInterventionType(primaryProcedureId) : undefined),
      [primaryProcedureId],
    );

    // Auto-inferred diagnosis (for coding details display)
    const inferredDiagnosisId = useMemo(
      () =>
        primaryProcedureId
          ? resolveAutoInferredDiagnosisId(primaryProcedureId, currentIntent)
          : undefined,
      [primaryProcedureId, currentIntent],
    );

    const inferredDiagnosis = useMemo(
      () =>
        primaryProcedureId
          ? autoInferDiagnosisEntry(primaryProcedureId, currentIntent)
          : undefined,
      [primaryProcedureId, currentIntent],
    );

    // ─── Auto-inference effect ────────────────────────────────────────────

    useEffect(() => {
      if (!primaryProcedureId) return;
      const entry = autoInferDiagnosisEntry(primaryProcedureId, currentIntent);
      if (entry) {
        onDiagnosisInferred(entry);
      }
    }, [primaryProcedureId, currentIntent, onDiagnosisInferred]);

    // ─── Handlers ─────────────────────────────────────────────────────────

    const handleProcedureSelect = useCallback(
      (entry: ProcedurePicklistEntry) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Check if already selected
        if (procedures.some((p) => p.picklistEntryId === entry.id)) return;
        const newProc = buildProcedureFromPicklistId(entry.id);
        if (!newProc) return;
        const updated = [
          ...procedures,
          { ...newProc, sequenceOrder: procedures.length + 1 },
        ];
        onProceduresChange(updated);
      },
      [procedures, onProceduresChange, buildProcedureFromPicklistId],
    );

    const handleRemoveProcedure = useCallback(
      (proc: CaseProcedure) => {
        onProceduresChange(
          procedures
            .filter((p) => p.id !== proc.id)
            .map((p, i) => ({ ...p, sequenceOrder: i + 1 })),
        );
      },
      [procedures, onProceduresChange],
    );

    const handleMoveProcedureUp = useCallback(
      (procId: string) => {
        const idx = procedures.findIndex((p) => p.id === procId);
        if (idx <= 0) return;
        const updated = [...procedures];
        [updated[idx - 1], updated[idx]] = [updated[idx]!, updated[idx - 1]!];
        onProceduresChange(
          updated.map((p, i) => ({ ...p, sequenceOrder: i + 1 })),
        );
      },
      [procedures, onProceduresChange],
    );

    const handleMoveProcedureDown = useCallback(
      (procId: string) => {
        const idx = procedures.findIndex((p) => p.id === procId);
        if (idx < 0 || idx >= procedures.length - 1) return;
        const updated = [...procedures];
        [updated[idx], updated[idx + 1]] = [updated[idx + 1]!, updated[idx]!];
        onProceduresChange(
          updated.map((p, i) => ({ ...p, sequenceOrder: i + 1 })),
        );
      },
      [procedures, onProceduresChange],
    );

    const handleIntentChange = useCallback(
      (intent: AestheticIntent) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentIntent(intent);
      },
      [],
    );

    const handleLateralityChange = useCallback(
      (laterality: Laterality) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onDiagnosisClinicalDetailsChange({
          ...diagnosisClinicalDetails,
          laterality:
            diagnosisClinicalDetails.laterality === laterality
              ? undefined
              : laterality,
        });
      },
      [diagnosisClinicalDetails, onDiagnosisClinicalDetailsChange],
    );

    const hasProcedures = procedures.some((p) => p.procedureName.trim());

    // ─── Render ───────────────────────────────────────────────────────────

    return (
      <View style={styles.container}>
        {/* SECTION 1: Procedure Picker — always visible, first */}
        <View>
          <ThemedText
            type="h4"
            style={[styles.sectionLabel, { color: theme.text }]}
          >
            Procedure
          </ThemedText>
          <ProcedureSubcategoryPicker
            specialty={groupSpecialty}
            selectedEntryId={primaryProcedureId}
            onSelect={handleProcedureSelect}
          />
        </View>

        {/* Selected procedures list */}
        {hasProcedures && (
          <CompactProcedureList
            procedures={procedures.filter((p) => p.procedureName.trim())}
            onRemove={handleRemoveProcedure}
            onMoveUp={handleMoveProcedureUp}
            onMoveDown={handleMoveProcedureDown}
            hideSnomedCodes
          />
        )}

        {/* SECTION 2: Intent prompt — only if procedure needs it */}
        {primaryProcedureId && config?.needsIntentPrompt && config.intentOptions && (
          <View>
            <ThemedText
              type="h4"
              style={[styles.sectionLabel, { color: theme.text }]}
            >
              Clinical Intent
            </ThemedText>
            <View style={styles.chipRow}>
              {config.intentOptions.map((opt) => {
                const isSelected = currentIntent === opt.value;
                const chipColor = INTENT_COLORS[opt.value];
                return (
                  <Pressable
                    key={opt.value}
                    testID={`caseForm.aesthetics.chip-intent-${opt.value}`}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? chipColor + "1A"
                          : theme.backgroundSecondary,
                        borderColor: isSelected ? chipColor : theme.border,
                      },
                    ]}
                    onPress={() => handleIntentChange(opt.value)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: isSelected ? chipColor : theme.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* SECTION 3: Detail card — expands based on procedure type */}
        {primaryProcedureId && detailCard != null && (
          <AestheticAssessment
            assessment={aestheticAssessment}
            onAssessmentChange={onAssessmentChange}
            procedureIds={procedurePicklistIds}
            intent={currentIntent}
            hideBadges
          />
        )}

        {/* Post-bariatric context when detail card is "post_bariatric" is handled
            inside AestheticAssessment via derivedIntent === "post_bariatric_mwl" */}

        {/* SECTION 4: Laterality — only when showLaterality is true */}
        {primaryProcedureId && showLaterality && (
          <View>
            <ThemedText
              type="h4"
              style={[styles.sectionLabel, { color: theme.text }]}
            >
              Laterality
            </ThemedText>
            <View style={styles.chipRow}>
              {LATERALITY_OPTIONS.map((opt) => {
                const isSelected =
                  diagnosisClinicalDetails.laterality === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    testID={`caseForm.aesthetics.chip-laterality-${opt.value}`}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? theme.link + "1A"
                          : theme.backgroundSecondary,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => handleLateralityChange(opt.value)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? theme.link : theme.textSecondary,
                        },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* SECTION 5: Coding Details — collapsed, read-only reference info */}
        {primaryProcedureId && inferredDiagnosis && (
          <CollapsibleFormSection
            title="Coding Details"
            filledCount={0}
            totalCount={0}
            defaultExpanded={false}
            testID="caseForm.aesthetics.section-coding"
          >
            <View style={styles.codingRow}>
              <ThemedText
                style={[styles.codingLabel, { color: theme.textTertiary }]}
              >
                Diagnosis
              </ThemedText>
              <ThemedText
                style={[styles.codingValue, { color: theme.textSecondary }]}
              >
                {inferredDiagnosis.displayName}
              </ThemedText>
            </View>
            {inferredDiagnosis.snomedCtCode && (
              <View style={styles.codingRow}>
                <ThemedText
                  style={[styles.codingLabel, { color: theme.textTertiary }]}
                >
                  SNOMED CT
                </ThemedText>
                <ThemedText
                  style={[styles.codingValue, { color: theme.textSecondary }]}
                  numberOfLines={2}
                >
                  {inferredDiagnosis.snomedCtCode}
                  {inferredDiagnosis.snomedCtDisplay
                    ? ` — ${inferredDiagnosis.snomedCtDisplay}`
                    : ""}
                </ThemedText>
              </View>
            )}
            {acgmeCategory && (
              <View style={styles.codingRow}>
                <ThemedText
                  style={[styles.codingLabel, { color: theme.textTertiary }]}
                >
                  ACGME
                </ThemedText>
                <ThemedText
                  style={[styles.codingValue, { color: theme.textSecondary }]}
                >
                  {ACGME_LABELS[acgmeCategory] ?? acgmeCategory}
                </ThemedText>
              </View>
            )}
            <View style={styles.codingRow}>
              <ThemedText
                style={[styles.codingLabel, { color: theme.textTertiary }]}
              >
                Intent
              </ThemedText>
              <View
                style={[
                  styles.intentBadge,
                  {
                    backgroundColor: INTENT_COLORS[currentIntent] + "1A",
                    borderColor: INTENT_COLORS[currentIntent],
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.intentBadgeText,
                    { color: INTENT_COLORS[currentIntent] },
                  ]}
                >
                  {INTENT_LABELS[currentIntent]}
                </ThemedText>
              </View>
            </View>
          </CollapsibleFormSection>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  codingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    gap: Spacing.md,
  },
  codingLabel: {
    fontSize: 13,
    fontWeight: "500",
    width: 80,
    flexShrink: 0,
  },
  codingValue: {
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  intentBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  intentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
