/**
 * BurnsAssessment — Acute burn assessment orchestrator.
 *
 * Renders inline in DiagnosisGroupEditor when diagnosis === "burns_dx_acute".
 * Always shows the full acute assessment UI — no phase gate.
 * Assessment-derived model: mechanism + TBSA + depth → deriveBurnDiagnosis().
 *
 * Follows the HandTraumaAssessment inline pattern.
 */

import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, LayoutAnimation } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  getDefaultTBSAData,
  getBurnProcedureCategory,
} from "@/lib/burnsConfig";
import type {
  BurnsAssessmentData,
  TBSAData,
  BurnInjuryEvent,
  BurnProcedureDetails,
} from "@/types/burns";
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

// ─── Component ──────────────────────────────────────────────────────────────

export const BurnsAssessment = React.memo(function BurnsAssessment({
  assessment,
  onAssessmentChange,
  procedures,
  patientAge,
  patientSex,
  onProcedureDetailsChange,
}: BurnsAssessmentProps) {
  const { theme } = useTheme();
  const [showRegionalDetail, setShowRegionalDetail] = useState(
    () => (assessment.tbsa?.regionalBreakdown?.length ?? 0) > 0,
  );

  // ── Update helpers ──────────────────────────────────────────────────────

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

  // ── Ensure TBSA data exists ──────────────────────────────────────────────
  const tbsaData = useMemo(
    () => assessment.tbsa ?? getDefaultTBSAData(),
    [assessment.tbsa],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View
      style={[styles.outerContainer, { borderColor: theme.link }]}
      testID="caseForm.burns.assessment"
    >
      {/* Module header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="thermometer" size={16} color={theme.link} />
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Burns Assessment
          </ThemedText>
        </View>
        {/* Severity badges (when TBSA and age exist) */}
        <BurnSeverityBadges
          age={patientAge}
          sex={patientSex}
          tbsa={tbsaTotal}
          inhalation={assessment.injuryEvent?.inhalationInjury}
          fullThickness={hasFullThickness}
        />
      </View>

      {/* TBSA section — always visible for acute burns */}
      <SectionWrapper title="TBSA Assessment" icon="activity">
        <TBSAQuickEntry
          data={tbsaData}
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
        {(tbsaData.totalTBSA ?? 0) > 0 ? (
          <TBSABodyOutline data={tbsaData} />
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
            <TBSARegionalBreakdown data={tbsaData} onChange={updateTBSA} />
          </View>
        ) : null}
      </SectionWrapper>

      {/* Injury event section — always visible for acute burns */}
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
});
