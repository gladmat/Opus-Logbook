/**
 * LymphaticFollowUpEntry — Structured follow-up data for lymphoedema cases.
 *
 * Captures timepoint, re-measurements, LYMQOL domain scores, and status changes.
 * LYMQOL is domain-level only (4 domains + overall QoL NRS), NOT individual items.
 */

import React, { useCallback, useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { CircumferenceEntry } from "./CircumferenceEntry";
import type {
  LymphaticFollowUp,
  FollowUpTimepoint,
  LYMQOLScore,
  LYMQOLVersion,
  CompressionStatus,
  LymphoedemaRegion,
  LimbMeasurementData,
  BioimpedanceData,
  MDAndersonICGStage,
  ICGPattern,
} from "@/types/lymphatic";
import {
  FOLLOW_UP_TIMEPOINT_LABELS,
  ICG_PATTERN_LABELS,
} from "@/types/lymphatic";

// ─── Props ──────────────────────────────────────────────────────────────────

interface LymphaticFollowUpEntryProps {
  value: LymphaticFollowUp;
  onChange: (d: LymphaticFollowUp) => void;
  affectedRegion?: LymphoedemaRegion;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TIMEPOINTS: FollowUpTimepoint[] = [
  "1_month",
  "3_months",
  "6_months",
  "12_months",
  "annual",
];

const COMPRESSION_STATUSES: CompressionStatus[] = [
  "unchanged",
  "reduced_class",
  "reduced_hours",
  "discontinued",
];
const COMPRESSION_STATUS_LABELS: Record<CompressionStatus, string> = {
  unchanged: "Unchanged",
  reduced_class: "Reduced class",
  reduced_hours: "Reduced hours",
  discontinued: "Discontinued",
};

const ICG_STAGES: MDAndersonICGStage[] = ["0", "1", "2", "3", "4", "5"];
const ICG_STAGE_LABELS: Record<MDAndersonICGStage, string> = {
  "0": "Stage 0",
  "1": "Stage 1",
  "2": "Stage 2",
  "3": "Stage 3",
  "4": "Stage 4",
  "5": "Stage 5",
};

const ICG_PATTERNS: ICGPattern[] = [
  "linear",
  "splash",
  "stardust",
  "diffuse",
  "no_flow",
];

// ─── Chip helper ────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options,
  labels,
  selected,
  onSelect,
  accentColor,
  theme,
}: {
  options: T[];
  labels: Record<T, string>;
  selected?: T;
  onSelect: (v: T) => void;
  accentColor: string;
  theme: any;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? accentColor + "20"
                  : theme.backgroundSecondary,
                borderColor: isSelected ? accentColor : theme.border,
              },
            ]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.chipText,
                { color: isSelected ? accentColor : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {labels[opt]}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export const LymphaticFollowUpEntry = React.memo(
  function LymphaticFollowUpEntry({
    value,
    onChange,
    affectedRegion,
  }: LymphaticFollowUpEntryProps) {
    const { theme } = useTheme();
    const accentColor = theme.accent;
    const [showICG, setShowICG] = useState(false);

    const update = useCallback(
      (patch: Partial<LymphaticFollowUp>) => {
        onChange({ ...value, ...patch });
      },
      [value, onChange],
    );

    // ── LYMQOL helpers ──
    const lymqol = value.lymqolScore;
    const defaultVersion: LYMQOLVersion =
      affectedRegion === "upper_limb" ||
      affectedRegion === "bilateral_upper" ||
      affectedRegion === "breast_trunk"
        ? "arm"
        : "leg";

    const updateLymqol = useCallback(
      (patch: Partial<LYMQOLScore>) => {
        update({
          lymqolScore: {
            version: defaultVersion,
            functionDomain: 0,
            appearanceDomain: 0,
            symptomsDomain: 0,
            moodDomain: 0,
            overallQoL: 0,
            ...lymqol,
            ...patch,
          },
        });
      },
      [lymqol, update, defaultVersion],
    );

    // ── Circumference ──
    const limbData: LimbMeasurementData = value.circumferences ?? {
      method: "tape_circumference",
      affectedLimb: [],
      contralateralLimb: [],
    };

    // ── L-Dex ──
    const lDex = value.lDex;
    const updateLDex = useCallback(
      (patch: Partial<BioimpedanceData>) => {
        const updated = { ...lDex, ...patch };
        if (updated.baselineLDex != null && updated.currentLDex != null) {
          updated.changeFromBaseline =
            Math.round((updated.currentLDex - updated.baselineLDex) * 10) / 10;
        }
        update({ lDex: updated });
      },
      [lDex, update],
    );

    return (
      <SectionWrapper
        title="Follow-Up"
        icon="calendar"
        collapsible
        defaultCollapsed
      >
        {/* Timepoint */}
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Timepoint
        </ThemedText>
        <ChipRow
          options={TIMEPOINTS}
          labels={FOLLOW_UP_TIMEPOINT_LABELS}
          selected={value.timepoint}
          onSelect={(v) => update({ timepoint: v })}
          accentColor={accentColor}
          theme={theme}
        />

        {/* Circumference re-measurement */}
        <ThemedText
          style={[
            styles.fieldLabel,
            { color: theme.textSecondary, marginTop: Spacing.md },
          ]}
        >
          Circumference re-measurement
        </ThemedText>
        <CircumferenceEntry
          data={limbData}
          onChange={(d) => update({ circumferences: d })}
          region={affectedRegion}
        />

        {/* L-Dex re-measurement */}
        <View style={[styles.fieldRow, { marginTop: Spacing.md }]}>
          <View style={styles.fieldHalf}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Current L-Dex
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="decimal-pad"
              placeholder="e.g. 8.3"
              placeholderTextColor={theme.textTertiary}
              value={lDex?.currentLDex != null ? String(lDex.currentLDex) : ""}
              onChangeText={(v) => {
                const n = parseFloat(v);
                updateLDex({ currentLDex: isNaN(n) ? undefined : n });
              }}
            />
          </View>
          <View style={styles.fieldHalf}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Cellulitis episodes
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              value={
                value.cellulitisEpisodesSinceLastVisit != null
                  ? String(value.cellulitisEpisodesSinceLastVisit)
                  : ""
              }
              onChangeText={(v) => {
                const n = parseInt(v, 10);
                update({
                  cellulitisEpisodesSinceLastVisit: isNaN(n) ? undefined : n,
                });
              }}
            />
          </View>
        </View>

        {/* ICG update (disclosure) */}
        <TouchableOpacity
          onPress={() => setShowICG(!showICG)}
          style={styles.disclosureLink}
          activeOpacity={0.7}
        >
          <ThemedText
            style={{ color: accentColor, fontSize: 13, fontWeight: "500" }}
          >
            {showICG ? "Hide ICG update" : "ICG stage update"}
          </ThemedText>
        </TouchableOpacity>

        {showICG && (
          <View style={{ marginTop: Spacing.xs }}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              ICG stage
            </ThemedText>
            <ChipRow
              options={ICG_STAGES}
              labels={ICG_STAGE_LABELS}
              selected={value.icgStage}
              onSelect={(v) => update({ icgStage: v })}
              accentColor={accentColor}
              theme={theme}
            />
            <ThemedText
              style={[
                styles.fieldLabel,
                { color: theme.textSecondary, marginTop: Spacing.sm },
              ]}
            >
              Pattern
            </ThemedText>
            <ChipRow
              options={ICG_PATTERNS}
              labels={ICG_PATTERN_LABELS}
              selected={value.icgPattern}
              onSelect={(v) => update({ icgPattern: v })}
              accentColor={accentColor}
              theme={theme}
            />
          </View>
        )}

        {/* Compression status */}
        <ThemedText
          style={[
            styles.fieldLabel,
            { color: theme.textSecondary, marginTop: Spacing.md },
          ]}
        >
          Compression status
        </ThemedText>
        <ChipRow
          options={COMPRESSION_STATUSES}
          labels={COMPRESSION_STATUS_LABELS}
          selected={value.compressionStatus}
          onSelect={(v) => update({ compressionStatus: v })}
          accentColor={accentColor}
          theme={theme}
        />

        {/* ── LYMQOL Section ── */}
        <View
          style={[
            styles.lymqolCard,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <ThemedText style={[styles.lymqolTitle, { color: theme.text }]}>
            LYMQOL ({lymqol?.version === "arm" ? "Arm" : "Leg"})
          </ThemedText>
          <ThemedText
            style={{
              color: theme.textTertiary,
              fontSize: 11,
              marginBottom: Spacing.sm,
            }}
          >
            Domain scores 1-4 (higher = worse). Overall QoL 0-10 (higher =
            better).
          </ThemedText>

          {/* Version toggle */}
          <ChipRow
            options={["arm", "leg"] as LYMQOLVersion[]}
            labels={{ arm: "Arm", leg: "Leg" }}
            selected={lymqol?.version ?? defaultVersion}
            onSelect={(v) => updateLymqol({ version: v })}
            accentColor={accentColor}
            theme={theme}
          />

          {/* Domain scores */}
          <View style={[styles.fieldRow, { marginTop: Spacing.sm }]}>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Function (1-4)
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundElevated,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="decimal-pad"
                placeholder="1.0"
                placeholderTextColor={theme.textTertiary}
                value={
                  lymqol?.functionDomain ? String(lymqol.functionDomain) : ""
                }
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  updateLymqol({ functionDomain: isNaN(n) ? 0 : n });
                }}
              />
            </View>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Appearance (1-4)
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundElevated,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="decimal-pad"
                placeholder="1.0"
                placeholderTextColor={theme.textTertiary}
                value={
                  lymqol?.appearanceDomain
                    ? String(lymqol.appearanceDomain)
                    : ""
                }
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  updateLymqol({ appearanceDomain: isNaN(n) ? 0 : n });
                }}
              />
            </View>
          </View>

          <View style={[styles.fieldRow, { marginTop: Spacing.xs }]}>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Symptoms (1-4)
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundElevated,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="decimal-pad"
                placeholder="1.0"
                placeholderTextColor={theme.textTertiary}
                value={
                  lymqol?.symptomsDomain ? String(lymqol.symptomsDomain) : ""
                }
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  updateLymqol({ symptomsDomain: isNaN(n) ? 0 : n });
                }}
              />
            </View>
            <View style={styles.fieldHalf}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Mood (1-4)
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundElevated,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="decimal-pad"
                placeholder="1.0"
                placeholderTextColor={theme.textTertiary}
                value={lymqol?.moodDomain ? String(lymqol.moodDomain) : ""}
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  updateLymqol({ moodDomain: isNaN(n) ? 0 : n });
                }}
              />
            </View>
          </View>

          <View style={{ marginTop: Spacing.xs }}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Overall QoL (0-10)
            </ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.backgroundElevated,
                  color: theme.text,
                  borderColor: theme.border,
                  width: 100,
                },
              ]}
              keyboardType="decimal-pad"
              placeholder="7"
              placeholderTextColor={theme.textTertiary}
              value={lymqol?.overallQoL ? String(lymqol.overallQoL) : ""}
              onChangeText={(v) => {
                const n = parseFloat(v);
                updateLymqol({ overallQoL: isNaN(n) ? 0 : n });
              }}
            />
          </View>
        </View>
      </SectionWrapper>
    );
  },
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  fieldHalf: {
    flex: 1,
  },
  textInput: {
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    fontSize: 15,
  },
  disclosureLink: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  lymqolCard: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  lymqolTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
});
