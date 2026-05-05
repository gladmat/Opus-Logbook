/**
 * BreastContextSelector — Laterality + per-side clinical context.
 *
 * Renders BEFORE the diagnosis picker so that clinical context drives
 * which diagnoses are shown (progressive disclosure).
 * Uses BreastSideCard in "context_only" mode.
 */

import React, { useCallback, useMemo } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { BreastSideCard } from "./BreastSideCard";
import type {
  BreastAssessmentData,
  BreastClinicalContext,
  BreastLaterality,
  BreastSideAssessment,
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
  defaultClinicalContext?: BreastClinicalContext;
  isTransmasculine?: boolean;
}

type LateralityOption = "left" | "right" | "bilateral";

const LATERALITY_OPTIONS: { key: LateralityOption; label: string }[] = [
  { key: "left", label: "Left" },
  { key: "right", label: "Right" },
  { key: "bilateral", label: "Bilateral" },
];

/** Empty module flags — context selector doesn't show module cards */
const EMPTY_MODULE_FLAGS: BreastModuleFlags = {
  showImplantDetails: false,
  showBreastFlapDetails: false,
  showPedicledFlapDetails: false,
  showLipofilling: false,
  showChestMasculinisation: false,
  showNippleDetails: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const BreastContextSelector = React.memo(function BreastContextSelector({
  value,
  onChange,
  defaultClinicalContext,
  isTransmasculine,
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

      {/* Per-side context cards (context_only mode) */}
      {activeSides.map((side) => {
        const sideData = assessment.sides[side];
        if (!sideData) return null;

        const otherSide: BreastLaterality = side === "left" ? "right" : "left";
        const otherData = assessment.sides[otherSide];
        const showCopy = isBilateral && isBreastSideEmpty(otherData);

        return (
          <BreastSideCard
            key={side}
            side={side}
            value={sideData}
            onChange={(updated) => handleSideChange(side, updated)}
            moduleFlags={EMPTY_MODULE_FLAGS}
            showCopyButton={showCopy}
            onCopy={() => handleCopy(side)}
            isTransmasculine={isTransmasculine}
            renderMode="context_only"
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
