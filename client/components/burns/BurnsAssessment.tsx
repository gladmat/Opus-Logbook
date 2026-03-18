/**
 * BurnsAssessment — Main orchestrator for the burns module.
 *
 * Renders inline in DiagnosisGroupEditor when specialty === "burns".
 * Uses a hard phase gate (Acute / Reconstructive / Non-Operative) with
 * progressive disclosure for TBSA, injury event, and procedure-specific sections.
 *
 * Follows the HandTraumaAssessment / CraniofacialAssessment inline pattern.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  getBurnPhaseFromDiagnosis,
  getDefaultTBSAData,
} from "@/lib/burnsConfig";
import type {
  BurnsAssessmentData,
  BurnPhase,
  TBSAData,
  BurnInjuryEvent,
} from "@/types/burns";
import { BURN_PHASE_LABELS } from "@/types/burns";
import type { CaseProcedure } from "@/types/case";

import { TBSAQuickEntry } from "./TBSAQuickEntry";
import { TBSARegionalBreakdown } from "./TBSARegionalBreakdown";
import { TBSABodyOutline } from "./TBSABodyOutline";
import { BurnInjuryEventSection } from "./BurnInjuryEventSection";
import { BurnSeverityBadges } from "./BurnSeverityBadges";
import { ExcisionDetailsSection } from "./ExcisionDetailsSection";
import { GraftDetailsSection } from "./GraftDetailsSection";
import { DermalSubstituteSection } from "./DermalSubstituteSection";
import { ContractureReleaseSection } from "./ContractureReleaseSection";
import { LaserSection } from "./LaserSection";
import { getBurnProcedureCategory } from "@/lib/burnsConfig";
import type { BurnProcedureDetails } from "@/types/burns";

// ─── Props ──────────────────────────────────────────────────────────────────

interface BurnsAssessmentProps {
  assessment: BurnsAssessmentData;
  onAssessmentChange: (assessment: BurnsAssessmentData) => void;
  diagnosisId?: string;
  procedures?: CaseProcedure[];
  patientAge?: number;
  patientSex?: "male" | "female";
  /** Callback to update burnProcedureDetails on a specific CaseProcedure */
  onProcedureDetailsChange?: (
    procedureId: string,
    details: BurnProcedureDetails,
  ) => void;
}

// ─── Phase chips ────────────────────────────────────────────────────────────

const PHASES: BurnPhase[] = ["acute", "reconstructive", "non_operative"];

// ─── Component ──────────────────────────────────────────────────────────────

export const BurnsAssessment = React.memo(function BurnsAssessment({
  assessment,
  onAssessmentChange,
  diagnosisId,
  procedures,
  patientAge,
  patientSex,
  onProcedureDetailsChange,
}: BurnsAssessmentProps) {
  const { theme } = useTheme();
  const [showRegionalDetail, setShowRegionalDetail] = useState(
    () => (assessment.tbsa?.regionalBreakdown?.length ?? 0) > 0,
  );

  // Auto-infer phase from diagnosis, but allow override
  const inferredPhase = useMemo(
    () => (diagnosisId ? getBurnPhaseFromDiagnosis(diagnosisId) : "acute"),
    [diagnosisId],
  );

  const phase = assessment.phase ?? inferredPhase;
  const isAcute = phase === "acute";
  const showTBSA = isAcute || (phase === "non_operative" && diagnosisId === "burns_dx_nonop_wound_care");

  // ── Update helpers ──────────────────────────────────────────────────────

  const setPhase = useCallback(
    (newPhase: BurnPhase) => {
      if (newPhase === phase) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onAssessmentChange({
        ...assessment,
        phase: newPhase,
        tbsa:
          newPhase === "acute"
            ? assessment.tbsa ?? getDefaultTBSAData()
            : assessment.tbsa,
      });
    },
    [assessment, phase, onAssessmentChange],
  );

  const updateTBSA = useCallback(
    (tbsa: TBSAData) => {
      onAssessmentChange({ ...assessment, tbsa });
    },
    [assessment, onAssessmentChange],
  );

  const updateInjuryEvent = useCallback(
    (injuryEvent: BurnInjuryEvent) => {
      onAssessmentChange({ ...assessment, injuryEvent });
    },
    [assessment, onAssessmentChange],
  );

  // ── Severity badges data ─────────────────────────────────────────────────

  const tbsaTotal = assessment.tbsa?.totalTBSA;
  const hasFullThickness =
    assessment.tbsa?.predominantDepth === "full_thickness" ||
    assessment.tbsa?.predominantDepth === "subdermal" ||
    (assessment.tbsa?.fullThicknessTBSA ?? 0) > 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={[styles.outerContainer, { borderColor: theme.link }]}>
      {/* Module header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="thermometer" size={16} color={theme.link} />
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Burns Assessment
          </ThemedText>
        </View>
        {/* Severity badges (acute only, when TBSA and age exist) */}
        {isAcute ? (
          <BurnSeverityBadges
            age={patientAge}
            sex={patientSex}
            tbsa={tbsaTotal}
            inhalation={assessment.injuryEvent?.inhalationInjury}
            fullThickness={hasFullThickness}
          />
        ) : null}
      </View>

      {/* Phase gate — segmented control */}
      <View style={styles.phaseRow}>
        {PHASES.map((p) => {
          const isSelected = phase === p;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setPhase(p)}
              style={[
                styles.phaseChip,
                {
                  backgroundColor: isSelected
                    ? theme.link + "20"
                    : theme.backgroundRoot,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.phaseChipText,
                  { color: isSelected ? theme.link : theme.textSecondary },
                ]}
              >
                {BURN_PHASE_LABELS[p]}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* TBSA section — acute + non-op wound care */}
      {showTBSA ? (
        <SectionWrapper title="TBSA Assessment" icon="activity">
          <TBSAQuickEntry
            data={assessment.tbsa ?? {}}
            onChange={updateTBSA}
            onShowRegionalDetail={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setShowRegionalDetail(true);
            }}
            showRegionalDetailLink={!showRegionalDetail}
          />

          {/* Body outline visual */}
          {(assessment.tbsa?.totalTBSA ?? 0) > 0 ? (
            <TBSABodyOutline data={assessment.tbsa ?? {}} />
          ) : null}

          {/* Tier 2: Regional breakdown */}
          {showRegionalDetail ? (
            <View style={styles.regionalSection}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <ThemedText
                style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
              >
                Regional Breakdown
              </ThemedText>
              <TBSARegionalBreakdown
                data={assessment.tbsa ?? {}}
                onChange={updateTBSA}
              />
            </View>
          ) : null}
        </SectionWrapper>
      ) : null}

      {/* Injury event section — acute only */}
      {isAcute ? (
        <SectionWrapper
          title="Injury Event"
          icon="alert-circle"
          collapsible
          defaultCollapsed={!!assessment.injuryEvent?.mechanism}
        >
          <BurnInjuryEventSection
            event={assessment.injuryEvent ?? {}}
            onChange={updateInjuryEvent}
          />
        </SectionWrapper>
      ) : null}

      {/* Procedure-specific detail sections */}
      {procedures && onProcedureDetailsChange
        ? procedures.map((proc) => {
            const category = proc.picklistEntryId
              ? getBurnProcedureCategory(proc.picklistEntryId)
              : null;
            if (!category) return null;
            const details = proc.burnProcedureDetails ?? {};
            const updateDetails = (patch: BurnProcedureDetails) =>
              onProcedureDetailsChange(proc.id, { ...details, ...patch });

            switch (category) {
              case "excision":
                return (
                  <ExcisionDetailsSection
                    key={proc.id}
                    value={details.excision ?? {}}
                    onChange={(excision) => updateDetails({ excision })}
                    tbsaData={assessment.tbsa}
                    procedureName={proc.procedureName}
                  />
                );
              case "grafting":
                return (
                  <GraftDetailsSection
                    key={proc.id}
                    value={details.grafting ?? {}}
                    onChange={(grafting) => updateDetails({ grafting })}
                    procedureId={proc.picklistEntryId}
                    procedureName={proc.procedureName}
                  />
                );
              case "dermalSubstitute":
                return (
                  <DermalSubstituteSection
                    key={proc.id}
                    value={details.dermalSubstitute ?? {}}
                    onChange={(dermalSubstitute) =>
                      updateDetails({ dermalSubstitute })
                    }
                    procedureName={proc.procedureName}
                  />
                );
              case "contractureRelease":
                return (
                  <ContractureReleaseSection
                    key={proc.id}
                    value={details.contractureRelease ?? {}}
                    onChange={(contractureRelease) =>
                      updateDetails({ contractureRelease })
                    }
                    procedureName={proc.procedureName}
                  />
                );
              case "laser":
                return (
                  <LaserSection
                    key={proc.id}
                    value={details.laser ?? {}}
                    onChange={(laser) => updateDetails({ laser })}
                    procedureName={proc.procedureName}
                  />
                );
              default:
                return null;
            }
          })
        : null}

      {/* Reconstructive phase hint — only when no procedure sections rendered */}
      {phase === "reconstructive" &&
      (!procedures ||
        !procedures.some(
          (p) => p.picklistEntryId && getBurnProcedureCategory(p.picklistEntryId),
        )) ? (
        <View
          style={[
            styles.phaseHint,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="info" size={14} color={theme.textTertiary} />
          <ThemedText
            style={[styles.phaseHintText, { color: theme.textTertiary }]}
          >
            Reconstructive phase — procedure-specific fields (ROM, graft
            details) will appear based on selected procedures.
          </ThemedText>
        </View>
      ) : null}

      {/* Non-operative hint */}
      {phase === "non_operative" && !showTBSA ? (
        <View
          style={[
            styles.phaseHint,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="info" size={14} color={theme.textTertiary} />
          <ThemedText
            style={[styles.phaseHintText, { color: theme.textTertiary }]}
          >
            Non-operative phase — scar review, garment fitting, or dressing
            change under GA.
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  phaseRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  phaseChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  phaseChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  regionalSection: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  divider: {
    height: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  phaseHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  phaseHintText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
