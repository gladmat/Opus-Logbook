/**
 * GenderAffirmingContextCard — Hormone therapy, WPATH, binding history fields.
 *
 * Renders inside BreastSideCard when clinicalContext is "gender_affirming".
 * No card border — renders inline within the parent card's context section.
 */

import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Spacing } from "@/constants/theme";
import type {
  GenderAffirmingContext,
  HormoneTherapyStatus,
} from "@/types/breast";
import {
  BreastChipRow,
  BreastCheckboxRow,
  BreastNumericField,
} from "./BreastCardHelpers";

interface Props {
  value: GenderAffirmingContext;
  onChange: (data: GenderAffirmingContext) => void;
  /** True when diagnosis suggests transmasculine (show binding history) */
  isTransmasculine?: boolean;
}

const HORMONE_STATUS_OPTIONS: readonly HormoneTherapyStatus[] = [
  "current",
  "prior",
  "never",
  "unknown",
] as const;

const HORMONE_STATUS_LABELS: Record<HormoneTherapyStatus, string> = {
  current: "Current",
  prior: "Prior",
  never: "Never",
  unknown: "Unknown",
};

type HormoneType = NonNullable<GenderAffirmingContext["hormoneType"]>;

const HORMONE_TYPE_OPTIONS: readonly HormoneType[] = [
  "testosterone",
  "estrogen_antiandrogen",
  "other",
] as const;

const HORMONE_TYPE_LABELS: Record<HormoneType, string> = {
  testosterone: "Testosterone",
  estrogen_antiandrogen: "Estrogen + Anti-androgen",
  other: "Other",
};

export const GenderAffirmingContextCard = React.memo(
  function GenderAffirmingContextCard({
    value,
    onChange,
    isTransmasculine = false,
  }: Props) {
    const update = useCallback(
      (partial: Partial<GenderAffirmingContext>) =>
        onChange({ ...value, ...partial }),
      [value, onChange],
    );

    const showHormoneDetails =
      value.hormoneTherapyStatus === "current" ||
      value.hormoneTherapyStatus === "prior";

    return (
      <View style={styles.container}>
        <BreastChipRow
          label="Hormone Therapy"
          options={HORMONE_STATUS_OPTIONS}
          labels={HORMONE_STATUS_LABELS}
          selected={value.hormoneTherapyStatus}
          onSelect={(v) => update({ hormoneTherapyStatus: v })}
          allowDeselect
        />

        {showHormoneDetails && (
          <>
            <BreastChipRow
              label="Hormone Type"
              options={HORMONE_TYPE_OPTIONS}
              labels={HORMONE_TYPE_LABELS}
              selected={value.hormoneType}
              onSelect={(v) => update({ hormoneType: v })}
              allowDeselect
            />

            <BreastNumericField
              label="Duration"
              value={value.hormoneTherapyDurationMonths}
              onValueChange={(v) => update({ hormoneTherapyDurationMonths: v })}
              unit="months"
              integer
              placeholder="e.g. 24"
            />
          </>
        )}

        {isTransmasculine && (
          <BreastCheckboxRow
            label="History of chest binding"
            value={value.bindingHistory ?? false}
            onChange={(v) => update({ bindingHistory: v })}
          />
        )}

        <BreastCheckboxRow
          label="WPATH SOC 8 criteria met"
          value={value.wpath8CriteriaMet ?? false}
          onChange={(v) => update({ wpath8CriteriaMet: v })}
        />

        <BreastCheckboxRow
          label="Mental health assessment completed"
          value={value.mentalHealthAssessmentCompleted ?? false}
          onChange={(v) => update({ mentalHealthAssessmentCompleted: v })}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
});
