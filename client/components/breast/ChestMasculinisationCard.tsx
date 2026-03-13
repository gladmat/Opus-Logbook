/**
 * ChestMasculinisationCard — Technique, NAC management, specimen weights.
 *
 * Renders when a chest masculinisation procedure is selected.
 * Collapsible card via BreastSectionToggle (like ImplantDetailsCard pattern).
 */

import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  ChestMasculinisationData,
  ChestMasculinisationTechnique,
  NacManagement,
} from "@/types/breast";
import {
  CHEST_MASC_TECHNIQUE_LABELS,
  NAC_MANAGEMENT_LABELS,
} from "@/types/breast";
import {
  BreastChipRow,
  BreastCheckboxRow,
  BreastNumericField,
  BreastSectionToggle,
} from "./BreastCardHelpers";
import { getChestMascSummary } from "@/lib/breastConfig";

interface Props {
  value: ChestMasculinisationData;
  onChange: (data: ChestMasculinisationData) => void;
}

const TECHNIQUE_OPTIONS: readonly ChestMasculinisationTechnique[] = [
  "double_incision_fng",
  "periareolar",
  "keyhole",
  "inverted_t",
  "buttonhole",
  "other",
] as const;

const NAC_OPTIONS: readonly NacManagement[] = [
  "free_nipple_graft",
  "pedicled",
  "removed",
  "tattoo_planned",
  "not_applicable",
] as const;

export const ChestMasculinisationCard = React.memo(
  function ChestMasculinisationCard({ value, onChange }: Props) {
    const { theme } = useTheme();
    const [isExpanded, setIsExpanded] = useState(true);

    const update = useCallback(
      (partial: Partial<ChestMasculinisationData>) =>
        onChange({ ...value, ...partial }),
      [value, onChange],
    );

    const summary = getChestMascSummary(value);

    return (
      <View
        style={[
          styles.card,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundSecondary,
          },
        ]}
      >
        <BreastSectionToggle
          label="Chest Masculinisation"
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((v) => !v)}
          subtitle={summary || undefined}
        />

        {isExpanded && (
          <View style={styles.content}>
            <BreastChipRow
              label="Technique"
              options={TECHNIQUE_OPTIONS}
              labels={CHEST_MASC_TECHNIQUE_LABELS}
              selected={value.technique}
              onSelect={(v) => update({ technique: v })}
              allowDeselect
            />

            <BreastChipRow
              label="NAC Management"
              options={NAC_OPTIONS}
              labels={NAC_MANAGEMENT_LABELS}
              selected={value.nacManagement}
              onSelect={(v) => update({ nacManagement: v })}
              allowDeselect
            />

            <BreastNumericField
              label="NAC Target Diameter"
              value={value.nacTargetDiameterMm}
              onValueChange={(v) => update({ nacTargetDiameterMm: v })}
              unit="mm"
              integer
              placeholder="25"
            />

            <View style={styles.weightRow}>
              <View style={styles.weightField}>
                <BreastNumericField
                  label="Specimen Weight (L)"
                  value={value.specimenWeightLeftGrams}
                  onValueChange={(v) => update({ specimenWeightLeftGrams: v })}
                  unit="g"
                  integer
                  placeholder="e.g. 320"
                />
              </View>
              <View style={styles.weightField}>
                <BreastNumericField
                  label="Specimen Weight (R)"
                  value={value.specimenWeightRightGrams}
                  onValueChange={(v) => update({ specimenWeightRightGrams: v })}
                  unit="g"
                  integer
                  placeholder="e.g. 310"
                />
              </View>
            </View>

            <BreastCheckboxRow
              label="Adjunctive liposuction"
              value={value.adjunctiveLiposuction ?? false}
              onChange={(v) => update({ adjunctiveLiposuction: v })}
            />

            <BreastCheckboxRow
              label="Pathology sent"
              value={value.pathologySent ?? false}
              onChange={(v) => update({ pathologySent: v })}
            />
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  content: {
    gap: Spacing.xs,
  },
  weightRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  weightField: {
    flex: 1,
  },
});
