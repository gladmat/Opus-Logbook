/**
 * VancouverScarScale — 4-dimension scar assessment input.
 *
 * Each dimension is a segmented chip row with descriptive labels.
 * Auto-sum badge: "VSS: X/13" with severity colour.
 */

import React, { useCallback, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { VancouverScarScale as VSSData } from "@/types/burns";

// ─── Props ──────────────────────────────────────────────────────────────────

interface VancouverScarScaleProps {
  value: Partial<VSSData>;
  onChange: (value: Partial<VSSData>) => void;
}

// ─── Dimension configs ──────────────────────────────────────────────────────

interface DimensionConfig {
  key: keyof VSSData;
  label: string;
  options: Array<{ value: number; label: string }>;
  max: number;
}

const DIMENSIONS: DimensionConfig[] = [
  {
    key: "vascularity",
    label: "Vascularity",
    max: 3,
    options: [
      { value: 0, label: "Normal" },
      { value: 1, label: "Pink" },
      { value: 2, label: "Red" },
      { value: 3, label: "Purple" },
    ],
  },
  {
    key: "pigmentation",
    label: "Pigmentation",
    max: 2,
    options: [
      { value: 0, label: "Normal" },
      { value: 1, label: "Hypo" },
      { value: 2, label: "Hyper" },
    ],
  },
  {
    key: "pliability",
    label: "Pliability",
    max: 5,
    options: [
      { value: 0, label: "Normal" },
      { value: 1, label: "Supple" },
      { value: 2, label: "Yielding" },
      { value: 3, label: "Firm" },
      { value: 4, label: "Banding" },
      { value: 5, label: "Contracture" },
    ],
  },
  {
    key: "height",
    label: "Height",
    max: 3,
    options: [
      { value: 0, label: "Flat" },
      { value: 1, label: "<2mm" },
      { value: 2, label: "2–5mm" },
      { value: 3, label: ">5mm" },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const VancouverScarScaleInput = React.memo(
  function VancouverScarScaleInput({ value, onChange }: VancouverScarScaleProps) {
    const { theme } = useTheme();

    const total = useMemo(() => {
      const v = value.vascularity ?? 0;
      const p = value.pigmentation ?? 0;
      const pl = value.pliability ?? 0;
      const h = value.height ?? 0;
      return v + p + pl + h;
    }, [value]);

    const hasAnyValue = useMemo(
      () =>
        value.vascularity != null ||
        value.pigmentation != null ||
        value.pliability != null ||
        value.height != null,
      [value],
    );

    const severityColor = useMemo(() => {
      if (!hasAnyValue) return theme.textTertiary;
      if (total <= 4) return theme.success;
      if (total <= 8) return theme.warning;
      return theme.error;
    }, [total, hasAnyValue, theme]);

    const setDimension = useCallback(
      (key: keyof VSSData, val: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange({ ...value, [key]: value[key] === val ? undefined : val });
      },
      [value, onChange],
    );

    return (
      <View style={styles.container}>
        {/* Total badge */}
        {hasAnyValue ? (
          <View
            style={[
              styles.totalBadge,
              {
                backgroundColor: severityColor + "15",
                borderColor: severityColor + "40",
              },
            ]}
          >
            <ThemedText
              style={[styles.totalText, { color: severityColor }]}
            >
              VSS: {total}/13
            </ThemedText>
          </View>
        ) : null}

        {/* Dimensions */}
        {DIMENSIONS.map((dim) => (
          <View key={dim.key} style={styles.dimensionRow}>
            <ThemedText
              style={[styles.dimensionLabel, { color: theme.textSecondary }]}
            >
              {dim.label}
            </ThemedText>
            <View style={styles.optionRow}>
              {dim.options.map((opt) => {
                const selected = value[dim.key] === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDimension(dim.key, opt.value)}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: selected
                          ? theme.link + "20"
                          : theme.backgroundRoot,
                        borderColor: selected ? theme.link : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.optionValue,
                        { color: selected ? theme.link : theme.textTertiary },
                      ]}
                    >
                      {opt.value}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.optionLabel,
                        {
                          color: selected
                            ? theme.link
                            : theme.textSecondary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  },
);

// Re-export from burnsConfig for backward compat
export { calculateVSSTotal, getVSSSeverity } from "@/lib/burnsConfig";

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  totalBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  totalText: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  dimensionRow: {
    gap: Spacing.xs,
  },
  dimensionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  optionChip: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 60,
    minHeight: 44,
    justifyContent: "center",
  },
  optionValue: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  optionLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});
