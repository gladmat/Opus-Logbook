/**
 * ContractureReleaseSection — Burn contracture release procedure fields.
 *
 * Always visible: Joint picker, ROM pre/post (side-by-side), ROM improvement badge
 * Expandable: Release depth, defect size, coverage method
 *
 * ROM is the single most meaningful outcome for reconstructive burn surgery.
 * Pre/post fields display side-by-side for immediate visual comparison.
 */

import React, { useCallback, useState, useMemo } from "react";
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
import type { BurnProcedureDetails, BurnContractureJoint } from "@/types/burns";
import { CONTRACTURE_JOINT_LABELS } from "@/types/burns";
import { calculateROMImprovement, getROMImprovementSeverity } from "@/lib/burnsConfig";

// ─── Props ──────────────────────────────────────────────────────────────────

type ContractureData = NonNullable<BurnProcedureDetails["contractureRelease"]>;

interface ContractureReleaseSectionProps {
  value: ContractureData;
  onChange: (value: ContractureData) => void;
  procedureName?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const JOINTS: BurnContractureJoint[] = [
  "neck",
  "shoulder",
  "axilla",
  "elbow",
  "antecubital",
  "wrist",
  "mcp",
  "pip",
  "dip",
  "thumb_web",
  "hip",
  "knee",
  "popliteal",
  "ankle",
  "perineal",
  "other",
];

const RELEASE_DEPTHS = [
  { key: "skin_only" as const, label: "Skin Only" },
  { key: "subcutaneous" as const, label: "Subcutaneous" },
  { key: "deep_fascial" as const, label: "Deep Fascial" },
];

const COVERAGE_METHODS = [
  { key: "graft" as const, label: "Graft" },
  { key: "local_flap" as const, label: "Local Flap" },
  { key: "regional_flap" as const, label: "Regional Flap" },
  { key: "free_flap" as const, label: "Free Flap" },
  { key: "healing" as const, label: "Secondary Healing" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const ContractureReleaseSection = React.memo(
  function ContractureReleaseSection({
    value,
    onChange,
    procedureName,
  }: ContractureReleaseSectionProps) {
    const { theme } = useTheme();
    const [showMore, setShowMore] = useState(
      () => !!value.releaseDepth || !!value.coverageMethod || !!value.defectSizeCm2,
    );

    const update = useCallback(
      (patch: Partial<ContractureData>) => onChange({ ...value, ...patch }),
      [value, onChange],
    );

    const improvement = useMemo(
      () => calculateROMImprovement(value.romPreOpDegrees, value.romPostOpDegrees),
      [value.romPreOpDegrees, value.romPostOpDegrees],
    );
    const severity = getROMImprovementSeverity(improvement);

    const improvementColor = useMemo(() => {
      switch (severity) {
        case "good":
          return theme.success;
        case "moderate":
          return theme.warning;
        case "minimal":
          return theme.textTertiary;
        default:
          return theme.textTertiary;
      }
    }, [severity, theme]);

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundElevated, borderColor: theme.border },
        ]}
      >
        <View style={styles.headerRow}>
          <Feather name="move" size={14} color={theme.link} />
          <ThemedText style={[styles.title, { color: theme.text }]}>
            {procedureName ?? "Contracture Release"}
          </ThemedText>
        </View>

        {/* Joint picker */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Joint
          </ThemedText>
          <View style={styles.chipRow}>
            {JOINTS.map((j) => {
              const selected = value.joint === j;
              return (
                <TouchableOpacity
                  key={j}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ joint: selected ? undefined : j });
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
                    {CONTRACTURE_JOINT_LABELS[j]}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ROM pre/post — side by side */}
        <View style={styles.romContainer}>
          <View style={styles.romColumn}>
            <ThemedText
              style={[styles.romLabel, { color: theme.textSecondary }]}
            >
              ROM Pre-Op
            </ThemedText>
            <DegreeStepperField
              value={value.romPreOpDegrees}
              onChange={(v) => update({ romPreOpDegrees: v })}
              theme={theme}
            />
          </View>
          <View style={styles.romArrow}>
            <Feather name="arrow-right" size={16} color={theme.textTertiary} />
          </View>
          <View style={styles.romColumn}>
            <ThemedText
              style={[styles.romLabel, { color: theme.textSecondary }]}
            >
              ROM Post-Op
            </ThemedText>
            <DegreeStepperField
              value={value.romPostOpDegrees}
              onChange={(v) => update({ romPostOpDegrees: v })}
              theme={theme}
            />
          </View>
        </View>

        {/* ROM improvement badge */}
        {improvement != null ? (
          <View
            style={[
              styles.improvementBadge,
              { backgroundColor: improvementColor + "15", borderColor: improvementColor + "40" },
            ]}
          >
            <Feather
              name={improvement >= 10 ? "trending-up" : "minus"}
              size={14}
              color={improvementColor}
            />
            <ThemedText
              style={[styles.improvementText, { color: improvementColor }]}
            >
              {improvement > 0 ? "+" : ""}
              {improvement}° improvement
            </ThemedText>
          </View>
        ) : null}

        {/* More details */}
        {!showMore ? (
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowMore(true);
            }}
            style={styles.moreLink}
          >
            <ThemedText style={[styles.moreLinkText, { color: theme.link }]}>
              More details
            </ThemedText>
            <Feather name="chevron-down" size={14} color={theme.link} />
          </TouchableOpacity>
        ) : (
          <View style={styles.expandedSection}>
            {/* Release depth */}
            <View style={styles.fieldGroup}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Release depth
              </ThemedText>
              <View style={styles.chipRow}>
                {RELEASE_DEPTHS.map(({ key, label }) => {
                  const selected = value.releaseDepth === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        update({ releaseDepth: selected ? undefined : key });
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

            {/* Defect size */}
            <View style={styles.fieldRow}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Defect size (cm²)
              </ThemedText>
              <View style={styles.stepper}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({
                      defectSizeCm2: Math.max(0, (value.defectSizeCm2 ?? 0) - 1),
                    });
                  }}
                  style={[styles.stepperBtn, { borderColor: theme.border }]}
                >
                  <Feather name="minus" size={16} color={theme.text} />
                </TouchableOpacity>
                <ThemedText style={[styles.stepperValue, { color: theme.text }]}>
                  {value.defectSizeCm2 ?? 0}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({
                      defectSizeCm2: (value.defectSizeCm2 ?? 0) + 1,
                    });
                  }}
                  style={[styles.stepperBtn, { borderColor: theme.border }]}
                >
                  <Feather name="plus" size={16} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Coverage method */}
            <View style={styles.fieldGroup}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Coverage method
              </ThemedText>
              <View style={styles.chipRow}>
                {COVERAGE_METHODS.map(({ key, label }) => {
                  const selected = value.coverageMethod === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        update({ coverageMethod: selected ? undefined : key });
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
          </View>
        )}
      </View>
    );
  },
);

// ─── DegreeStepperField ─────────────────────────────────────────────────────

interface DegreeStepperFieldProps {
  value?: number;
  onChange: (value?: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
}

function DegreeStepperField({ value, onChange, theme }: DegreeStepperFieldProps) {
  const v = value ?? 0;
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(Math.max(0, v - 5));
        }}
        style={[styles.stepperBtn, { borderColor: theme.border }]}
        disabled={v <= 0}
      >
        <Feather
          name="minus"
          size={16}
          color={v <= 0 ? theme.textTertiary : theme.text}
        />
      </TouchableOpacity>
      <ThemedText style={[styles.degreeValue, { color: theme.text }]}>
        {v}°
      </ThemedText>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(Math.min(180, v + 5));
        }}
        style={[styles.stepperBtn, { borderColor: theme.border }]}
        disabled={v >= 180}
      >
        <Feather
          name="plus"
          size={16}
          color={v >= 180 ? theme.textTertiary : theme.text}
        />
      </TouchableOpacity>
    </View>
  );
}

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
  romContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  romColumn: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  romArrow: {
    paddingTop: Spacing.lg,
  },
  romLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  improvementBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  improvementText: {
    fontSize: 13,
    fontWeight: "600",
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
    gap: Spacing.md,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
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
    minWidth: 40,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  degreeValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 50,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
