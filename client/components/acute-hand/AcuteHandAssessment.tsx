/**
 * AcuteHandAssessment
 * ═══════════════════
 * Main orchestrator for the acute hand progressive disclosure flow.
 * Rendered inline in DiagnosisGroupEditor when handCaseType === "acute".
 *
 * Replaces: DiagnosisPicker + standalone HandInfectionCard + procedure picker
 * for the acute hand flow.
 *
 * Layout:
 *   SectionWrapper "1. Diagnosis"  ← curated chips (13 acute diagnoses)
 *     └ 2 groups: HAND INFECTIONS (10), ACUTE NON-INFECTION (3)
 *     └ ▸ Search all diagnoses (collapsed SNOMED fallback)
 *
 *   SectionWrapper "2. Infection Details"  ← infection diagnoses only
 *     └ HandInfectionCard (4-layer progressive disclosure)
 *
 *   SectionWrapper "3. Summary & Procedures"
 *     └ AcuteHandSummaryPanel (accept-mapping flow)
 */

import React, { useState, useCallback } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { HandInfectionCard } from "@/components/hand-infection/HandInfectionCard";
import { AcuteHandSummaryPanel } from "./AcuteHandSummaryPanel";
import { DiagnosisPicker } from "@/components/DiagnosisPicker";
import { Feather } from "@/components/FeatherIcon";
import { HAND_DX_ACUTE } from "@/lib/diagnosisPicklists/handSurgeryDiagnoses";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { HandInfectionDetails } from "@/types/handInfection";
import {
  isHandInfectionDiagnosis,
  createDefaultHandInfectionDetails,
} from "@/types/handInfection";
import { handInfectionToOverlay } from "@/lib/handInfectionBridge";
import type { InfectionOverlay } from "@/types/infection";

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface AcuteHandAssessmentProps {
  selectedDiagnosis: DiagnosisPicklistEntry | null;
  onDiagnosisSelect: (dx: DiagnosisPicklistEntry) => void;
  onDiagnosisClear: () => void;
  handInfectionDetails?: HandInfectionDetails;
  onHandInfectionChange: (details: HandInfectionDetails | undefined) => void;
  laterality?: "left" | "right";
  infectionOverlay?: InfectionOverlay;
  onInfectionChange?: (overlay: InfectionOverlay | undefined) => void;
  onShowInfectionSheet: () => void;
  // Accept mapping
  isAccepted: boolean;
  acceptedProcedureIds?: string[];
  onAcceptMapping: (procedurePicklistIds: string[]) => void;
  onEditMapping: () => void;
  onBrowseFullPicker: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════════

// Group chips by subcategory
const INFECTION_DIAGNOSES = HAND_DX_ACUTE.filter(
  (dx) => dx.subcategory === "Hand Infections",
);
const NON_INFECTION_DIAGNOSES = HAND_DX_ACUTE.filter(
  (dx) => dx.subcategory !== "Hand Infections",
);

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function AcuteHandAssessment({
  selectedDiagnosis,
  onDiagnosisSelect,
  onDiagnosisClear,
  handInfectionDetails,
  onHandInfectionChange,
  laterality,
  infectionOverlay,
  onInfectionChange,
  onShowInfectionSheet,
  isAccepted,
  acceptedProcedureIds,
  onAcceptMapping,
  onEditMapping,
  onBrowseFullPicker,
}: AcuteHandAssessmentProps) {
  const { theme } = useTheme();
  const [showSnomedFallback, setShowSnomedFallback] = useState(false);

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const isSectionCollapsed = useCallback(
    (key: string) => collapsedSections[key] ?? false,
    [collapsedSections],
  );

  const setSectionCollapsed = useCallback((key: string, collapsed: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((prev) => ({ ...prev, [key]: collapsed }));
  }, []);

  const isInfection = selectedDiagnosis
    ? isHandInfectionDiagnosis(selectedDiagnosis.id)
    : false;

  const handleChipTap = useCallback(
    (dx: DiagnosisPicklistEntry) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (selectedDiagnosis?.id === dx.id) {
        // Deselect
        onDiagnosisClear();
        return;
      }

      onDiagnosisSelect(dx);

      // Auto-create infection details for infection diagnoses
      if (isHandInfectionDiagnosis(dx.id)) {
        const details = createDefaultHandInfectionDetails(dx.id);
        onHandInfectionChange(details);
      } else {
        onHandInfectionChange(undefined);
      }

      // Collapse diagnosis section after selection
      setSectionCollapsed("diagnosis", true);
    },
    [
      selectedDiagnosis,
      onDiagnosisSelect,
      onDiagnosisClear,
      onHandInfectionChange,
      setSectionCollapsed,
    ],
  );

  const handleSnomedFallbackSelect = useCallback(
    (dx: DiagnosisPicklistEntry) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDiagnosisSelect(dx);
      setShowSnomedFallback(false);
      setSectionCollapsed("diagnosis", true);
    },
    [onDiagnosisSelect, setSectionCollapsed],
  );

  const handleEscalate = useCallback(() => {
    if (!selectedDiagnosis) return;
    const updated: HandInfectionDetails = {
      ...(handInfectionDetails ??
        createDefaultHandInfectionDetails(selectedDiagnosis.id)),
      escalatedToFullModule: true,
    };
    onHandInfectionChange(updated);
    const overlay = handInfectionToOverlay(updated, infectionOverlay);
    onInfectionChange?.(overlay);
    onShowInfectionSheet();
  }, [
    selectedDiagnosis,
    handInfectionDetails,
    onHandInfectionChange,
    infectionOverlay,
    onInfectionChange,
    onShowInfectionSheet,
  ]);

  // Section numbering
  let sectionNum = 0;

  return (
    <View style={styles.container}>
      {/* ── 1. Diagnosis (curated chips) ── */}
      <SectionWrapper
        title={`${++sectionNum}. Diagnosis`}
        icon="activity"
        collapsible
        isCollapsed={isSectionCollapsed("diagnosis")}
        onCollapsedChange={(v) => setSectionCollapsed("diagnosis", v)}
        subtitle={
          selectedDiagnosis?.shortName ?? selectedDiagnosis?.displayName
        }
      >
        {/* Infection group */}
        <ThemedText style={[styles.groupLabel, { color: theme.textSecondary }]}>
          HAND INFECTIONS
        </ThemedText>
        <View style={styles.chipGrid}>
          {INFECTION_DIAGNOSES.map((dx) => {
            const isSelected = selectedDiagnosis?.id === dx.id;
            return (
              <Pressable
                key={dx.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => handleChipTap(dx)}
                testID={`caseForm.handAcute.chip-${dx.id}`}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? theme.buttonText : theme.text,
                    },
                  ]}
                >
                  {dx.shortName ?? dx.displayName}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Non-infection group */}
        <ThemedText
          style={[
            styles.groupLabel,
            { color: theme.textSecondary, marginTop: Spacing.md },
          ]}
        >
          ACUTE NON-INFECTION
        </ThemedText>
        <View style={styles.chipGrid}>
          {NON_INFECTION_DIAGNOSES.map((dx) => {
            const isSelected = selectedDiagnosis?.id === dx.id;
            return (
              <Pressable
                key={dx.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => handleChipTap(dx)}
                testID={`caseForm.handAcute.chip-${dx.id}`}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? theme.buttonText : theme.text,
                    },
                  ]}
                >
                  {dx.shortName ?? dx.displayName}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* SNOMED fallback */}
        <Pressable
          style={[styles.snomedFallbackRow, { borderTopColor: theme.border }]}
          testID="caseForm.handAcute.btn-snomedSearch"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setShowSnomedFallback((v) => !v);
          }}
        >
          <Feather
            name={showSnomedFallback ? "chevron-up" : "search"}
            size={14}
            color={theme.link}
          />
          <ThemedText
            style={[styles.snomedFallbackText, { color: theme.link }]}
          >
            {showSnomedFallback
              ? "Hide diagnosis search"
              : "Search all diagnoses"}
          </ThemedText>
        </Pressable>

        {showSnomedFallback ? (
          <DiagnosisPicker
            specialty="hand_wrist"
            selectedDiagnosisId={selectedDiagnosis?.id}
            onSelect={handleSnomedFallbackSelect}
            clinicalGroupFilter="acute"
          />
        ) : null}
      </SectionWrapper>

      {/* ── 2. Infection Details (infection diagnoses only) ── */}
      {selectedDiagnosis && isInfection ? (
        <SectionWrapper
          title={`${++sectionNum}. Infection Details`}
          icon="thermometer"
          collapsible
          isCollapsed={isSectionCollapsed("infection")}
          onCollapsedChange={(v) => setSectionCollapsed("infection", v)}
          testID="caseForm.handAcute.section-infection"
        >
          <HandInfectionCard
            diagnosisId={selectedDiagnosis.id}
            value={handInfectionDetails}
            onChange={onHandInfectionChange}
            laterality={laterality}
            onEscalate={handleEscalate}
          />
        </SectionWrapper>
      ) : null}

      {/* ── 3. Summary & Procedures ── */}
      {selectedDiagnosis ? (
        <SectionWrapper
          title={`${isInfection ? 3 : 2}. Summary & Procedures`}
          icon="file-text"
        >
          <AcuteHandSummaryPanel
            diagnosis={selectedDiagnosis}
            handInfectionDetails={handInfectionDetails}
            isAccepted={isAccepted}
            acceptedProcedureIds={acceptedProcedureIds}
            onAccept={onAcceptMapping}
            onEditMapping={onEditMapping}
            onBrowseFullPicker={onBrowseFullPicker}
          />
        </SectionWrapper>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 96,
    minHeight: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  snomedFallbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  snomedFallbackText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
