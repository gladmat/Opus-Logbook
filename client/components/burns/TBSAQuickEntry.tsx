/**
 * TBSAQuickEntry — Tier 1 TBSA documentation.
 * Target <15 seconds for simple burns.
 *
 * - Total TBSA% stepper (0–100, 0.5 increments)
 * - Predominant depth segmented control
 * - Body regions multi-select chips (8 regions)
 * - Partial/Full thickness TBSA% steppers
 * - "Add regional detail" disclosure link → Tier 2
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { TBSAData, BurnDepth, TBSARegion } from "@/types/burns";
import {
  ALL_TBSA_REGIONS,
  TBSA_REGION_LABELS,
  BURN_DEPTH_LABELS,
} from "@/types/burns";

interface TBSAQuickEntryProps {
  data: TBSAData;
  onChange: (data: TBSAData) => void;
  onShowRegionalDetail?: () => void;
  showRegionalDetailLink?: boolean;
}

const DEPTH_OPTIONS: BurnDepth[] = [
  "superficial_partial",
  "deep_partial",
  "full_thickness",
  "mixed",
];

const DEPTH_SHORT_LABELS: Record<string, string> = {
  superficial_partial: "Sup. Partial",
  deep_partial: "Deep Partial",
  full_thickness: "Full Thickness",
  mixed: "Mixed",
};

function StepperField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.5,
  unit = "%",
}: {
  label: string;
  value?: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  const { theme } = useTheme();
  const current = value ?? 0;

  const decrement = () => {
    const next = Math.max(min, current - step);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.round(next * 10) / 10);
  };

  const increment = () => {
    const next = Math.min(max, current + step);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.round(next * 10) / 10);
  };

  return (
    <View style={styles.stepperRow}>
      <ThemedText style={[styles.stepperLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          onPress={decrement}
          style={[
            styles.stepperBtn,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
          disabled={current <= min}
        >
          <Feather
            name="minus"
            size={16}
            color={current <= min ? theme.textTertiary : theme.text}
          />
        </TouchableOpacity>
        <View
          style={[
            styles.stepperValue,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <ThemedText style={[styles.stepperValueText, { color: theme.text }]}>
            {current}
            {unit}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={increment}
          style={[
            styles.stepperBtn,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
          disabled={current >= max}
        >
          <Feather
            name="plus"
            size={16}
            color={current >= max ? theme.textTertiary : theme.text}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const TBSAQuickEntry = React.memo(function TBSAQuickEntry({
  data,
  onChange,
  onShowRegionalDetail,
  showRegionalDetailLink = true,
}: TBSAQuickEntryProps) {
  const { theme } = useTheme();

  const updateField = useCallback(
    <K extends keyof TBSAData>(key: K, value: TBSAData[K]) => {
      onChange({ ...data, [key]: value });
    },
    [data, onChange],
  );

  const toggleRegion = useCallback(
    (region: TBSARegion) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const current = data.regionsAffected ?? [];
      const next = current.includes(region)
        ? current.filter((r) => r !== region)
        : [...current, region];
      onChange({ ...data, regionsAffected: next });
    },
    [data, onChange],
  );

  const selectedRegions = useMemo(
    () => new Set(data.regionsAffected ?? []),
    [data.regionsAffected],
  );

  return (
    <View style={styles.container}>
      {/* Total TBSA% */}
      <StepperField
        label="Total TBSA"
        value={data.totalTBSA}
        onChange={(v) => updateField("totalTBSA", v)}
      />

      {/* Predominant depth */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>
          Predominant Depth
        </ThemedText>
        <View style={styles.chipGrid}>
          {DEPTH_OPTIONS.map((depth) => {
            const isSelected = data.predominantDepth === depth;
            return (
              <TouchableOpacity
                key={depth}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateField("predominantDepth", depth);
                }}
                style={[
                  styles.chip,
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
                    styles.chipText,
                    {
                      color: isSelected ? theme.link : theme.textSecondary,
                    },
                  ]}
                >
                  {DEPTH_SHORT_LABELS[depth] ?? BURN_DEPTH_LABELS[depth]}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Body regions */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>
          Regions Affected
        </ThemedText>
        <View style={styles.chipGrid}>
          {ALL_TBSA_REGIONS.map((region) => {
            const isSelected = selectedRegions.has(region);
            return (
              <TouchableOpacity
                key={region}
                onPress={() => toggleRegion(region)}
                style={[
                  styles.chip,
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
                    styles.chipText,
                    {
                      color: isSelected ? theme.link : theme.textSecondary,
                    },
                  ]}
                >
                  {TBSA_REGION_LABELS[region]}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Partial / Full thickness split */}
      <StepperField
        label="Partial Thickness TBSA"
        value={data.partialThicknessTBSA}
        onChange={(v) => updateField("partialThicknessTBSA", v)}
        max={data.totalTBSA ?? 100}
      />
      <StepperField
        label="Full Thickness TBSA"
        value={data.fullThicknessTBSA}
        onChange={(v) => updateField("fullThicknessTBSA", v)}
        max={data.totalTBSA ?? 100}
      />

      {/* Add regional detail link */}
      {showRegionalDetailLink && onShowRegionalDetail ? (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            onShowRegionalDetail();
          }}
          style={styles.disclosureLink}
        >
          <Feather name="plus-circle" size={14} color={theme.link} />
          <ThemedText
            style={[styles.disclosureLinkText, { color: theme.link }]}
          >
            Add regional detail
          </ThemedText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    minWidth: 64,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  stepperValueText: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  disclosureLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  disclosureLinkText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
