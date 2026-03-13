/**
 * BreastAssessment — Main orchestrator for breast surgery module.
 *
 * Renders inline in DiagnosisGroupEditor when specialty === "breast".
 * Manages laterality selection and delegates per-side data to BreastSideCard.
 */

import React, { useCallback, useMemo } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { BreastSideCard } from "./BreastSideCard";
import { LipofillingCard } from "./LipofillingCard";
import { LiposuctionCard } from "./LiposuctionCard";
import type {
  BreastAssessmentData,
  BreastClinicalContext,
  BreastLaterality,
  BreastSideAssessment,
  LipofillingData,
  LiposuctionData,
} from "@/types/breast";
import type { BreastModuleFlags } from "@/lib/breastConfig";
import {
  copyBreastSide,
  getBreastAssessmentActiveSides,
  isBreastSideEmpty,
  normalizeBreastAssessment,
} from "@/lib/breastState";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  value: BreastAssessmentData;
  onChange: (data: BreastAssessmentData) => void;
  moduleFlags: BreastModuleFlags;
  defaultClinicalContext?: BreastClinicalContext;
  /** Whether the diagnosis suggests transmasculine context */
  isTransmasculine?: boolean;
  /** Linked reconstruction episode ID, if any */
  linkedEpisodeId?: string;
  /** Linked episode title */
  linkedEpisodeTitle?: string;
  /** Called when user creates a new reconstruction episode */
  onCreateEpisode?: () => void;
  /** Called when user unlinks the episode */
  onUnlinkEpisode?: () => void;
  /** Breast surgical preferences for auto-fill */
  breastPreferences?: import("@/types/surgicalPreferences").BreastPreferences;
}

type LateralityOption = "left" | "right" | "bilateral";

const LATERALITY_OPTIONS: { key: LateralityOption; label: string }[] = [
  { key: "left", label: "Left" },
  { key: "right", label: "Right" },
  { key: "bilateral", label: "Bilateral" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const BreastAssessment = React.memo(function BreastAssessment({
  value,
  onChange,
  moduleFlags,
  defaultClinicalContext,
  isTransmasculine,
  linkedEpisodeId,
  linkedEpisodeTitle,
  onCreateEpisode,
  onUnlinkEpisode,
  breastPreferences,
}: Props) {
  const { theme } = useTheme();
  const assessment = useMemo(
    () => normalizeBreastAssessment(value, defaultClinicalContext),
    [defaultClinicalContext, value],
  );

  // ── Laterality ──────────────────────────────────────────────────────────

  const handleLateralityChange = useCallback(
    (option: LateralityOption) => {
      if (option === assessment.laterality) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      onChange(
        normalizeBreastAssessment(
          { ...assessment, laterality: option },
          defaultClinicalContext,
        ),
      );
    },
    [assessment, defaultClinicalContext, onChange],
  );

  // ── Per-side change ─────────────────────────────────────────────────────

  const handleSideChange = useCallback(
    (side: BreastLaterality, sideData: BreastSideAssessment) => {
      onChange(
        normalizeBreastAssessment(
          {
            ...assessment,
            sides: { ...assessment.sides, [side]: sideData },
          },
          defaultClinicalContext,
        ),
      );
    },
    [assessment, defaultClinicalContext, onChange],
  );

  const handleLipofillingChange = useCallback(
    (lipofilling: LipofillingData) => {
      onChange(
        normalizeBreastAssessment(
          {
            ...assessment,
            lipofilling,
          },
          defaultClinicalContext,
        ),
      );
    },
    [assessment, defaultClinicalContext, onChange],
  );

  // ── Copy to other side ──────────────────────────────────────────────────

  const handleCopy = useCallback(
    (fromSide: BreastLaterality) => {
      const toSide: BreastLaterality = fromSide === "left" ? "right" : "left";
      const source = assessment.sides[fromSide];
      if (!source) return;
      if (!isBreastSideEmpty(assessment.sides[toSide])) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      onChange(
        normalizeBreastAssessment(
          {
            ...assessment,
            sides: {
              ...assessment.sides,
              [toSide]: copyBreastSide(source, toSide),
            },
          },
          defaultClinicalContext,
        ),
      );
    },
    [assessment, defaultClinicalContext, onChange],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  const activeSides = getBreastAssessmentActiveSides(assessment.laterality);

  const isBilateral = assessment.laterality === "bilateral";

  return (
    <View style={styles.container}>
      {/* Section header */}
      <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>
        Breast Assessment
      </ThemedText>

      {/* Laterality chips */}
      <View style={styles.chipRow}>
        {LATERALITY_OPTIONS.map(({ key, label }) => {
          const selected = assessment.laterality === key;
          return (
            <Pressable
              key={key}
              onPress={() => handleLateralityChange(key)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? theme.link
                    : theme.backgroundSecondary,
                  borderColor: selected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: selected ? theme.buttonText : theme.text,
                  fontWeight: selected ? "600" : "400",
                }}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Case-level liposuction — shown when lipofilling is active */}
      {moduleFlags.showLipofilling && (
        <>
          <LiposuctionCard
            value={assessment.liposuction ?? {}}
            onChange={(liposuction: LiposuctionData) =>
              onChange({
                ...assessment,
                liposuction,
              })
            }
          />

          <LipofillingCard
            activeSides={activeSides}
            value={assessment.lipofilling ?? {}}
            onChange={handleLipofillingChange}
          />
        </>
      )}

      {/* Per-side cards */}
      {activeSides.map((side) => {
        const sideData = assessment.sides[side];
        if (!sideData) return null;

        // Show copy button only in bilateral mode when the OTHER side is empty/default
        const otherSide: BreastLaterality = side === "left" ? "right" : "left";
        const otherData = assessment.sides[otherSide];
        const showCopy = isBilateral && isBreastSideEmpty(otherData);

        return (
          <BreastSideCard
            key={side}
            side={side}
            value={sideData}
            onChange={(updated) => handleSideChange(side, updated)}
            moduleFlags={moduleFlags}
            lipofilling={assessment.lipofilling}
            showCopyButton={showCopy}
            onCopy={() => handleCopy(side)}
            isTransmasculine={isTransmasculine}
            linkedEpisodeId={linkedEpisodeId}
            linkedEpisodeTitle={linkedEpisodeTitle}
            onCreateEpisode={onCreateEpisode}
            onUnlinkEpisode={onUnlinkEpisode}
            breastPreferences={breastPreferences}
          />
        );
      })}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 64,
    alignItems: "center",
  },
});
