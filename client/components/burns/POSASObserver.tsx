/**
 * POSASObserver — 7-dimension Patient and Observer Scar Assessment Scale.
 *
 * Each dimension is a 1–10 horizontal segmented row with anchor labels.
 * Total badge: "POSAS: X/70"
 */

import React, { useCallback, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { POSASObserver as POSASData } from "@/types/burns";

// ─── Props ──────────────────────────────────────────────────────────────────

interface POSASObserverProps {
  value: Partial<POSASData>;
  onChange: (value: Partial<POSASData>) => void;
}

// ─── Dimension configs ──────────────────────────────────────────────────────

const DIMENSIONS: Array<{
  key: keyof POSASData;
  label: string;
}> = [
  { key: "vascularity", label: "Vascularity" },
  { key: "pigmentation", label: "Pigmentation" },
  { key: "thickness", label: "Thickness" },
  { key: "relief", label: "Relief" },
  { key: "pliability", label: "Pliability" },
  { key: "surfaceArea", label: "Surface Area" },
  { key: "overallOpinion", label: "Overall Opinion" },
];

const SCALE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export const POSASObserverInput = React.memo(function POSASObserverInput({
  value,
  onChange,
}: POSASObserverProps) {
  const { theme } = useTheme();

  const total = useMemo(() => {
    let sum = 0;
    for (const dim of DIMENSIONS) {
      sum += value[dim.key] ?? 0;
    }
    return sum;
  }, [value]);

  const hasAnyValue = useMemo(
    () => DIMENSIONS.some((d) => value[d.key] != null),
    [value],
  );

  const setDimension = useCallback(
    (key: keyof POSASData, val: number) => {
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
              backgroundColor: theme.info + "15",
              borderColor: theme.info + "40",
            },
          ]}
        >
          <ThemedText style={[styles.totalText, { color: theme.info }]}>
            POSAS: {total}/70
          </ThemedText>
        </View>
      ) : null}

      {/* Anchor labels */}
      <View style={styles.anchorRow}>
        <ThemedText style={[styles.anchorText, { color: theme.textTertiary }]}>
          1 = Normal skin
        </ThemedText>
        <ThemedText style={[styles.anchorText, { color: theme.textTertiary }]}>
          10 = Worst imaginable
        </ThemedText>
      </View>

      {/* Dimensions */}
      {DIMENSIONS.map((dim) => (
        <View key={dim.key} style={styles.dimensionRow}>
          <ThemedText
            style={[styles.dimensionLabel, { color: theme.textSecondary }]}
          >
            {dim.label}
          </ThemedText>
          <View style={styles.scaleRow}>
            {SCALE_VALUES.map((sv) => {
              const selected = value[dim.key] === sv;
              return (
                <TouchableOpacity
                  key={sv}
                  onPress={() => setDimension(dim.key, sv)}
                  style={[
                    styles.scaleChip,
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
                      styles.scaleValue,
                      { color: selected ? theme.link : theme.textTertiary },
                    ]}
                  >
                    {sv}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
});

// Re-export from burnsConfig for backward compat
export { calculatePOSASTotal } from "@/lib/burnsConfig";

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
  anchorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  anchorText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  dimensionRow: {
    gap: Spacing.xs,
  },
  dimensionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  scaleRow: {
    flexDirection: "row",
    gap: 2,
  },
  scaleChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
    borderRadius: 4,
    borderWidth: 1,
    minHeight: 36,
  },
  scaleValue: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
