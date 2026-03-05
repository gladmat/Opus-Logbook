/**
 * Unified Hand Trauma Assessment sheet.
 * Combines hand structure picker + fracture classification wizard
 * into a single modal, and provides auto-diagnosis resolution via
 * the trauma mapping engine.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { DetailModuleSheet } from "./DetailModuleSheet";
import { HandTraumaStructurePicker } from "@/components/hand-trauma/HandTraumaStructurePicker";
import { FractureClassificationWizard } from "@/components/FractureClassificationWizard";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import {
  resolveTraumaDiagnosis,
  type TraumaMappingResult,
} from "@/lib/handTraumaMapping";
import type {
  CaseProcedure,
  FractureEntry,
  HandTraumaDetails,
} from "@/types/case";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

export interface HandTraumaDiagnosisResolution {
  /** The mapping result from the trauma engine */
  mappingResult: TraumaMappingResult;
  /** Fracture entries to set on the diagnosis group */
  fractures: FractureEntry[];
  /** Hand trauma details (structures, dislocations, etc.) */
  handTrauma: HandTraumaDetails;
  /** Procedures generated from structure picker + mapping suggestions */
  procedures: CaseProcedure[];
}

interface HandTraumaSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (details: HandTraumaDetails, procedures: CaseProcedure[]) => void;
  /** Called when the mapping engine resolves a diagnosis from injury selections */
  onDiagnosisResolved?: (resolution: HandTraumaDiagnosisResolution) => void;
  initialDetails: HandTraumaDetails;
  selectedDiagnosis?: DiagnosisPicklistEntry;
  initialProcedures: CaseProcedure[];
  initialFractures?: FractureEntry[];
  onFracturesChange?: (fractures: FractureEntry[]) => void;
}

export function HandTraumaSheet({
  visible,
  onClose,
  onSave,
  onDiagnosisResolved,
  initialDetails,
  selectedDiagnosis,
  initialProcedures,
  initialFractures = [],
  onFracturesChange,
}: HandTraumaSheetProps) {
  const { theme } = useTheme();

  const [localDetails, setLocalDetails] =
    useState<HandTraumaDetails>(initialDetails);
  const [localProcedures, setLocalProcedures] =
    useState<CaseProcedure[]>(initialProcedures);
  const [localFractures, setLocalFractures] =
    useState<FractureEntry[]>(initialFractures);
  const [showFractureWizard, setShowFractureWizard] = useState(false);

  // Reset local state when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalDetails(initialDetails);
      setLocalProcedures(initialProcedures);
      setLocalFractures(initialFractures);
    }
  }, [visible, initialDetails, initialProcedures, initialFractures]);

  // Compute mapping result from current selections
  const mappingResult = useMemo(() => {
    return resolveTraumaDiagnosis({
      affectedDigits: localDetails.affectedDigits ?? [],
      activeCategories: [],
      fractures: localFractures.length > 0 ? localFractures : undefined,
      dislocations:
        localDetails.dislocations && localDetails.dislocations.length > 0
          ? localDetails.dislocations
          : undefined,
      injuredStructures: localDetails.injuredStructures,
      isHighPressureInjection: localDetails.isHighPressureInjection,
      isFightBite: localDetails.isFightBite,
      isCompartmentSyndrome: localDetails.isCompartmentSyndrome,
      isRingAvulsion: localDetails.isRingAvulsion,
      amputationLevel: localDetails.amputationLevel,
      isReplantable: localDetails.isReplantable,
    });
  }, [localDetails, localFractures]);

  const handleFractureSave = useCallback(
    (fractures: FractureEntry[]) => {
      setLocalFractures(fractures);
      setShowFractureWizard(false);
    },
    [],
  );

  const handleSave = () => {
    onSave(localDetails, localProcedures);
    onFracturesChange?.(localFractures);

    // If the mapping engine resolved a diagnosis, notify the parent
    if (mappingResult && onDiagnosisResolved) {
      onDiagnosisResolved({
        mappingResult,
        fractures: localFractures,
        handTrauma: localDetails,
        procedures: localProcedures,
      });
    }

    onClose();
  };

  // Summary line for fractures section
  const fractureSummary =
    localFractures.length > 0
      ? localFractures
          .map((f) => `${f.aoCode} ${f.boneName}`)
          .join(", ")
      : null;

  return (
    <>
      <DetailModuleSheet
        visible={visible && !showFractureWizard}
        title="Hand Trauma Assessment"
        subtitle="Fractures, structures & injury details"
        onSave={handleSave}
        onCancel={onClose}
      >
        {/* Fracture Classification quick-access */}
        <Pressable
          style={[
            styles.fractureRow,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: localFractures.length > 0 ? theme.link : theme.border,
            },
            Shadows.card,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFractureWizard(true);
          }}
        >
          <View style={styles.fractureRowLeft}>
            <View
              style={[
                styles.fractureIconContainer,
                {
                  backgroundColor:
                    localFractures.length > 0
                      ? theme.link + "20"
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <Feather
                name="layers"
                size={18}
                color={localFractures.length > 0 ? theme.link : theme.textTertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.fractureRowTitle, { color: theme.text }]}>
                Fracture Classification
              </ThemedText>
              {fractureSummary ? (
                <ThemedText
                  style={[styles.fractureRowSummary, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {fractureSummary}
                </ThemedText>
              ) : (
                <ThemedText
                  style={[styles.fractureRowSummary, { color: theme.textTertiary }]}
                >
                  Tap to add AO classification
                </ThemedText>
              )}
            </View>
          </View>
          <View style={styles.fractureRowRight}>
            {localFractures.length > 0 ? (
              <View
                style={[styles.fractureBadge, { backgroundColor: theme.link }]}
              >
                <ThemedText
                  style={[styles.fractureBadgeText, { color: theme.buttonText }]}
                >
                  {localFractures.length}
                </ThemedText>
              </View>
            ) : null}
            <Feather name="chevron-right" size={18} color={theme.textTertiary} />
          </View>
        </Pressable>

        {/* Hand Structures Picker */}
        <HandTraumaStructurePicker
          value={localDetails}
          onChange={setLocalDetails}
          selectedDiagnosis={selectedDiagnosis}
          procedures={localProcedures}
          onProceduresChange={setLocalProcedures}
        />

        {/* Diagnosis suggestion panel — shows when mapping resolves */}
        {mappingResult ? (
          <View
            style={[
              styles.suggestionPanel,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.link + "40",
              },
              Shadows.card,
            ]}
          >
            <View style={styles.suggestionHeader}>
              <Feather name="zap" size={16} color={theme.link} />
              <ThemedText
                style={[styles.suggestionTitle, { color: theme.text }]}
              >
                Auto-Suggested Diagnosis
              </ThemedText>
            </View>
            <ThemedText
              style={[styles.suggestionDiagnosis, { color: theme.text }]}
            >
              {mappingResult.primaryDiagnosis.displayName}
            </ThemedText>
            {mappingResult.primaryDiagnosis.snomedCtCode ? (
              <ThemedText
                style={[styles.suggestionSnomed, { color: theme.textTertiary }]}
              >
                SNOMED: {mappingResult.primaryDiagnosis.snomedCtCode}
              </ThemedText>
            ) : null}

            {mappingResult.suggestedProcedures.length > 0 ? (
              <View style={styles.suggestionProcedures}>
                <ThemedText
                  style={[
                    styles.suggestionProcedureLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Suggested Procedures
                </ThemedText>
                {mappingResult.suggestedProcedures.map((sp) => (
                  <View key={sp.procedurePicklistId} style={styles.suggestionProcedureRow}>
                    <Feather
                      name={sp.isDefault ? "check-circle" : "circle"}
                      size={14}
                      color={sp.isDefault ? theme.success : theme.textTertiary}
                    />
                    <ThemedText
                      style={[
                        styles.suggestionProcedureText,
                        { color: theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {sp.displayName}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            <ThemedText
              style={[styles.suggestionNote, { color: theme.textTertiary }]}
            >
              Diagnosis & procedures will be applied when you save
            </ThemedText>
          </View>
        ) : null}
      </DetailModuleSheet>

      {/* Fracture Classification Wizard — nested modal */}
      <FractureClassificationWizard
        visible={showFractureWizard}
        onClose={() => setShowFractureWizard(false)}
        onSave={handleFractureSave}
        initialFractures={localFractures}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fractureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  fractureRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  fractureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  fractureRowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  fractureRowSummary: {
    fontSize: 13,
    marginTop: 2,
  },
  fractureRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  fractureBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  fractureBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  suggestionPanel: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionDiagnosis: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  suggestionSnomed: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  suggestionProcedures: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  suggestionProcedureLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  suggestionProcedureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  suggestionProcedureText: {
    fontSize: 14,
    flex: 1,
  },
  suggestionNote: {
    fontSize: 12,
    marginTop: Spacing.md,
    fontStyle: "italic",
  },
});
