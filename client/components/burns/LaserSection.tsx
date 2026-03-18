/**
 * LaserSection — Burn scar laser treatment procedure fields.
 *
 * Always visible: Laser type, treatment area, session tracking
 * Expandable: Settings (free text)
 */

import React, { useCallback, useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { BurnProcedureDetails } from "@/types/burns";

// ─── Props ──────────────────────────────────────────────────────────────────

type LaserData = NonNullable<BurnProcedureDetails["laser"]>;

interface LaserSectionProps {
  value: LaserData;
  onChange: (value: LaserData) => void;
  procedureName?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LASER_TYPES = [
  { key: "co2_fractional" as const, label: "CO₂ Fractional" },
  { key: "pulsed_dye" as const, label: "Pulsed Dye" },
  { key: "nonablative_fractional" as const, label: "Non-Ablative" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const LaserSection = React.memo(function LaserSection({
  value,
  onChange,
  procedureName,
}: LaserSectionProps) {
  const { theme } = useTheme();
  const [showMore, setShowMore] = useState(() => !!value.settings);

  const update = useCallback(
    (patch: Partial<LaserData>) => onChange({ ...value, ...patch }),
    [value, onChange],
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElevated, borderColor: theme.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Feather name="zap" size={14} color={theme.link} />
        <ThemedText style={[styles.title, { color: theme.text }]}>
          {procedureName ?? "Laser Treatment"}
        </ThemedText>
      </View>

      {/* Laser type */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Laser type
        </ThemedText>
        <View style={styles.chipRow}>
          {LASER_TYPES.map(({ key, label }) => {
            const selected = value.laserType === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ laserType: selected ? undefined : key });
                }}
                style={[
                  styles.chip,
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
                    styles.chipText,
                    { color: selected ? theme.link : theme.textSecondary },
                  ]}
                >
                  {label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Treatment area */}
      <View style={styles.fieldRow}>
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Treatment area (cm²)
        </ThemedText>
        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              update({
                treatmentAreaCm2: Math.max(0, (value.treatmentAreaCm2 ?? 0) - 10),
              });
            }}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <Feather name="minus" size={16} color={theme.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.stepperValue, { color: theme.text }]}>
            {value.treatmentAreaCm2 ?? 0}
          </ThemedText>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              update({
                treatmentAreaCm2: (value.treatmentAreaCm2 ?? 0) + 10,
              });
            }}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <Feather name="plus" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Session tracking — "Session X of Y" */}
      <View style={styles.sessionRow}>
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Session
        </ThemedText>
        <View style={styles.sessionSteppers}>
          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                update({
                  sessionNumber: Math.max(1, (value.sessionNumber ?? 1) - 1),
                });
              }}
              style={[styles.stepperBtn, { borderColor: theme.border }]}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </TouchableOpacity>
            <ThemedText style={[styles.sessionValue, { color: theme.text }]}>
              {value.sessionNumber ?? 1}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                update({
                  sessionNumber: (value.sessionNumber ?? 1) + 1,
                });
              }}
              style={[styles.stepperBtn, { borderColor: theme.border }]}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ThemedText style={[styles.sessionOf, { color: theme.textTertiary }]}>
            of
          </ThemedText>
          <View style={styles.stepper}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                update({
                  totalPlannedSessions: Math.max(
                    1,
                    (value.totalPlannedSessions ?? 1) - 1,
                  ),
                });
              }}
              style={[styles.stepperBtn, { borderColor: theme.border }]}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </TouchableOpacity>
            <ThemedText style={[styles.sessionValue, { color: theme.text }]}>
              {value.totalPlannedSessions ?? 1}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                update({
                  totalPlannedSessions: (value.totalPlannedSessions ?? 1) + 1,
                });
              }}
              style={[styles.stepperBtn, { borderColor: theme.border }]}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* More details — settings */}
      {!showMore ? (
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowMore(true);
          }}
          style={styles.moreLink}
        >
          <ThemedText style={[styles.moreLinkText, { color: theme.link }]}>
            Add settings
          </ThemedText>
          <Feather name="chevron-down" size={14} color={theme.link} />
        </TouchableOpacity>
      ) : (
        <View style={styles.expandedSection}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Settings (device-specific)
          </ThemedText>
          <TextInput
            value={value.settings ?? ""}
            onChangeText={(text) => update({ settings: text || undefined })}
            placeholder="e.g., 15W, 300μs, 10% overlap"
            placeholderTextColor={theme.textTertiary}
            style={[
              styles.textInput,
              {
                color: theme.text,
                backgroundColor: theme.backgroundRoot,
                borderColor: theme.border,
              },
            ]}
            multiline
          />
        </View>
      )}
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionSteppers: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sessionOf: {
    fontSize: 14,
    fontWeight: "500",
  },
  sessionValue: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  moreLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  moreLinkText: {
    fontSize: 13,
    fontWeight: "500",
  },
  expandedSection: {
    gap: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: "600",
    minWidth: 50,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
