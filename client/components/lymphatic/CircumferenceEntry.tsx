/**
 * CircumferenceEntry — Bilateral limb measurement table.
 *
 * Two-column layout (affected vs contralateral) with standard measurement intervals.
 * Auto-calculates per-segment excess % and total excess volume using truncated cone formula.
 */

import React, { useCallback, useMemo } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  CircumferenceMeasurement,
  LimbMeasurementData,
  MeasurementMethod,
  LymphoedemaRegion,
} from "@/types/lymphatic";
import { MEASUREMENT_METHOD_LABELS } from "@/types/lymphatic";
import {
  getMeasurementPointsForRegion,
  calculateExcessVolume,
} from "@/lib/lymphaticConfig";

interface CircumferenceEntryProps {
  data: LimbMeasurementData;
  onChange: (data: LimbMeasurementData) => void;
  region?: LymphoedemaRegion;
}

const METHOD_OPTIONS: MeasurementMethod[] = [
  "tape_circumference",
  "perometry",
  "water_displacement",
  "3d_scan",
];

export const CircumferenceEntry = React.memo(function CircumferenceEntry({
  data,
  onChange,
  region,
}: CircumferenceEntryProps) {
  const { theme } = useTheme();

  const measurementPoints = useMemo(
    () => getMeasurementPointsForRegion(region),
    [region],
  );

  const excessResult = useMemo(() => {
    if (data.affectedLimb.length < 2 || data.contralateralLimb.length < 2) {
      return null;
    }
    return calculateExcessVolume(data.affectedLimb, data.contralateralLimb);
  }, [data.affectedLimb, data.contralateralLimb]);

  const updateMeasurement = useCallback(
    (
      side: "affectedLimb" | "contralateralLimb",
      distanceFromReference: number,
      valueStr: string,
    ) => {
      const value = parseFloat(valueStr);
      const arr = [...data[side]];
      const idx = arr.findIndex(
        (m) => m.distanceFromReference === distanceFromReference,
      );

      if (isNaN(value) || valueStr === "") {
        // Remove measurement if cleared
        if (idx >= 0) {
          arr.splice(idx, 1);
        }
      } else if (idx >= 0) {
        arr[idx] = { distanceFromReference, circumferenceCm: value };
      } else {
        arr.push({ distanceFromReference, circumferenceCm: value });
      }

      const updated = { ...data, [side]: arr };
      // Auto-calculate excess volume
      if (
        updated.affectedLimb.length >= 2 &&
        updated.contralateralLimb.length >= 2
      ) {
        const excess = calculateExcessVolume(
          updated.affectedLimb,
          updated.contralateralLimb,
        );
        updated.excessVolumeMl = excess.volumeMl;
        updated.excessVolumePercent = excess.volumePercent;
      }
      onChange(updated);
    },
    [data, onChange],
  );

  const getMeasurementValue = useCallback(
    (
      side: "affectedLimb" | "contralateralLimb",
      distanceFromReference: number,
    ): string => {
      const m = data[side].find(
        (m) => m.distanceFromReference === distanceFromReference,
      );
      return m ? String(m.circumferenceCm) : "";
    },
    [data],
  );

  const handleMethodChange = useCallback(
    (method: MeasurementMethod) => {
      onChange({ ...data, method });
    },
    [data, onChange],
  );

  return (
    <View>
      {/* Method picker */}
      <View style={styles.methodRow}>
        {METHOD_OPTIONS.map((m) => (
          <View
            key={m}
            style={[
              styles.methodChip,
              {
                backgroundColor:
                  data.method === m
                    ? theme.accent + "20"
                    : theme.backgroundSecondary,
                borderColor: data.method === m ? theme.accent : theme.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.methodLabel,
                {
                  color: data.method === m ? theme.accent : theme.textSecondary,
                },
              ]}
              onPress={() => handleMethodChange(m)}
            >
              {MEASUREMENT_METHOD_LABELS[m]}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <ThemedText style={[styles.headerLabel, { flex: 1.2 }]}>
          Point
        </ThemedText>
        <ThemedText
          style={[styles.headerLabel, { flex: 1, textAlign: "center" }]}
        >
          Affected (cm)
        </ThemedText>
        <ThemedText
          style={[styles.headerLabel, { flex: 1, textAlign: "center" }]}
        >
          Contralateral (cm)
        </ThemedText>
      </View>

      {/* Measurement rows */}
      {measurementPoints.map((point) => (
        <View
          key={point.distanceFromReference}
          style={[styles.tableRow, { borderBottomColor: theme.border }]}
        >
          <ThemedText
            style={[styles.pointLabel, { color: theme.textSecondary }]}
          >
            {point.label}
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
            value={getMeasurementValue(
              "affectedLimb",
              point.distanceFromReference,
            )}
            onChangeText={(v) =>
              updateMeasurement("affectedLimb", point.distanceFromReference, v)
            }
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
            value={getMeasurementValue(
              "contralateralLimb",
              point.distanceFromReference,
            )}
            onChangeText={(v) =>
              updateMeasurement(
                "contralateralLimb",
                point.distanceFromReference,
                v,
              )
            }
          />
        </View>
      ))}

      {/* Excess volume result */}
      {excessResult != null && (
        <View
          style={[
            styles.resultBadge,
            { backgroundColor: theme.accent + "15", borderColor: theme.accent },
          ]}
        >
          <ThemedText style={[styles.resultText, { color: theme.accent }]}>
            Excess volume: {excessResult.volumeMl} mL (
            {excessResult.volumePercent}%)
          </ThemedText>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  methodChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  methodLabel: {
    fontSize: 13,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pointLabel: {
    flex: 1.2,
    fontSize: 14,
  },
  input: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 15,
    marginHorizontal: 4,
  },
  resultBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  resultText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
