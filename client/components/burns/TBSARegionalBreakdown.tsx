/**
 * TBSARegionalBreakdown — Tier 2 TBSA: per-region percentage + depth.
 * Optionally Tier 3 Lund-Browder toggle for paediatric/complex cases.
 * Shows only regions selected in Tier 1 chips.
 */

import React, { useCallback, useMemo } from "react";
import { View, TouchableOpacity, Switch, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { validateTBSARegionalSum } from "@/lib/burnsConfig";
import type { TBSAData, TBSARegionalEntry, TBSARegion, BurnDepth } from "@/types/burns";
import { TBSA_REGION_LABELS, BURN_DEPTH_LABELS } from "@/types/burns";

interface TBSARegionalBreakdownProps {
  data: TBSAData;
  onChange: (data: TBSAData) => void;
}

const DEPTH_OPTIONS: BurnDepth[] = [
  "superficial_partial",
  "deep_partial",
  "full_thickness",
];

export const TBSARegionalBreakdown = React.memo(
  function TBSARegionalBreakdown({ data, onChange }: TBSARegionalBreakdownProps) {
    const { theme } = useTheme();

    const affectedRegions = useMemo(
      () => data.regionsAffected ?? [],
      [data.regionsAffected],
    );

    const regionalMap = useMemo(() => {
      const map = new Map<TBSARegion, TBSARegionalEntry>();
      for (const entry of data.regionalBreakdown ?? []) {
        map.set(entry.region, entry);
      }
      return map;
    }, [data.regionalBreakdown]);

    const validation = useMemo(() => {
      if (!data.regionalBreakdown?.length || data.totalTBSA == null) {
        return null;
      }
      return validateTBSARegionalSum(data.regionalBreakdown, data.totalTBSA);
    }, [data.regionalBreakdown, data.totalTBSA]);

    const updateRegionEntry = useCallback(
      (region: TBSARegion, updates: Partial<TBSARegionalEntry>) => {
        const existing = regionalMap.get(region) ?? {
          region,
          percentage: 0,
          depth: "superficial_partial" as BurnDepth,
        };
        const updated: TBSARegionalEntry = { ...existing, ...updates };
        const breakdown = [...(data.regionalBreakdown ?? [])];
        const idx = breakdown.findIndex((e) => e.region === region);
        if (idx >= 0) {
          breakdown[idx] = updated;
        } else {
          breakdown.push(updated);
        }
        onChange({ ...data, regionalBreakdown: breakdown });
      },
      [data, onChange, regionalMap],
    );

    if (affectedRegions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
            Select affected regions in the section above to add regional detail.
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Validation badge */}
        {validation && !validation.valid ? (
          <View
            style={[
              styles.validationBadge,
              {
                backgroundColor: theme.warning + "20",
                borderColor: theme.warning,
              },
            ]}
          >
            <Feather name="alert-triangle" size={14} color={theme.warning} />
            <ThemedText style={[styles.validationText, { color: theme.warning }]}>
              Regional total differs from quick entry by {validation.diff.toFixed(1)}%
            </ThemedText>
          </View>
        ) : null}

        {/* Per-region rows */}
        {affectedRegions.map((region) => {
          const entry = regionalMap.get(region);
          return (
            <View
              key={region}
              style={[
                styles.regionRow,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.regionHeader}>
                <ThemedText style={[styles.regionLabel, { color: theme.text }]}>
                  {TBSA_REGION_LABELS[region]}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.regionPercentage,
                    { color: theme.link },
                  ]}
                >
                  {entry?.percentage ?? 0}%
                </ThemedText>
              </View>

              {/* Percentage stepper */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const current = entry?.percentage ?? 0;
                    updateRegionEntry(region, {
                      percentage: Math.max(0, current - 0.5),
                    });
                  }}
                  style={[
                    styles.miniBtn,
                    { borderColor: theme.border },
                  ]}
                >
                  <Feather name="minus" size={14} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const current = entry?.percentage ?? 0;
                    updateRegionEntry(region, {
                      percentage: Math.min(100, current + 0.5),
                    });
                  }}
                  style={[
                    styles.miniBtn,
                    { borderColor: theme.border },
                  ]}
                >
                  <Feather name="plus" size={14} color={theme.text} />
                </TouchableOpacity>

                {/* Depth mini-chips */}
                {DEPTH_OPTIONS.map((depth) => {
                  const isSelected = (entry?.depth ?? "superficial_partial") === depth;
                  return (
                    <TouchableOpacity
                      key={depth}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateRegionEntry(region, { depth });
                      }}
                      style={[
                        styles.depthMiniChip,
                        {
                          backgroundColor: isSelected
                            ? theme.link + "20"
                            : "transparent",
                          borderColor: isSelected ? theme.link : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.depthMiniText,
                          { color: isSelected ? theme.link : theme.textTertiary },
                        ]}
                      >
                        {depth === "superficial_partial"
                          ? "SP"
                          : depth === "deep_partial"
                            ? "DP"
                            : "FT"}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}

                {/* Circumferential toggle */}
                <View style={styles.circToggle}>
                  <ThemedText
                    style={[styles.circLabel, { color: theme.textTertiary }]}
                  >
                    Circ
                  </ThemedText>
                  <Switch
                    value={entry?.circumferential ?? false}
                    onValueChange={(v) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateRegionEntry(region, { circumferential: v });
                    }}
                    trackColor={{ false: theme.border, true: theme.link }}
                    thumbColor={Platform.OS === "android" ? "#fff" : undefined}
                    style={styles.miniSwitch}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  emptyContainer: {
    paddingVertical: Spacing.md,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
  },
  validationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  validationText: {
    fontSize: 13,
    fontWeight: "500",
  },
  regionRow: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  regionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  regionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  regionPercentage: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  miniBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  depthMiniChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  depthMiniText: {
    fontSize: 11,
    fontWeight: "700",
  },
  circToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  circLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  miniSwitch: {
    transform: [{ scale: 0.7 }],
  },
});
