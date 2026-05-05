/**
 * ExcisionDetailsSection — Burn excision procedure fields.
 *
 * Layer 1 (always visible): TBSA excised, regions, excision depth
 * Layer 2 (expandable): Blood loss, tourniquet
 *
 * Renders inside BurnsAssessment per excision procedure.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  TouchableOpacity,
  Switch,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { BurnProcedureDetails } from "@/types/burns";
import type { TBSAData, TBSARegion } from "@/types/burns";
import { TBSA_REGION_LABELS } from "@/types/burns";

// ─── Props ──────────────────────────────────────────────────────────────────

type ExcisionData = NonNullable<BurnProcedureDetails["excision"]>;

interface ExcisionDetailsSectionProps {
  value: ExcisionData;
  onChange: (value: ExcisionData) => void;
  tbsaData?: TBSAData;
  procedureName?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EXCISION_DEPTHS = [
  { key: "viable_dermis" as const, label: "Tangential" },
  { key: "subcutaneous_fat" as const, label: "Subcutaneous" },
  { key: "fascia" as const, label: "Fascial" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const ExcisionDetailsSection = React.memo(
  function ExcisionDetailsSection({
    value,
    onChange,
    tbsaData,
    procedureName,
  }: ExcisionDetailsSectionProps) {
    const { theme } = useTheme();
    const [showMore, setShowMore] = useState(
      () => !!value.estimatedBloodLossMl || !!value.tourniquetUsed,
    );

    const update = useCallback(
      (patch: Partial<ExcisionData>) => onChange({ ...value, ...patch }),
      [value, onChange],
    );

    // Constrain excised TBSA to total
    const maxTBSA = tbsaData?.totalTBSA ?? 100;
    const availableRegions: TBSARegion[] = tbsaData?.regionsAffected ?? [];

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Feather name="scissors" size={14} color={theme.link} />
          <ThemedText style={[styles.title, { color: theme.text }]}>
            {procedureName ?? "Excision Details"}
          </ThemedText>
        </View>

        {/* TBSA excised this operation */}
        <View style={styles.fieldRow}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            TBSA excised
          </ThemedText>
          <StepperControl
            value={value.tbsaExcised ?? 0}
            onChange={(v) => update({ tbsaExcised: v })}
            min={0}
            max={maxTBSA}
            step={0.5}
            suffix="%"
            theme={theme}
          />
        </View>

        {/* Regions excised */}
        {availableRegions.length > 0 ? (
          <View style={styles.fieldGroup}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Regions excised
            </ThemedText>
            <View style={styles.chipRow}>
              {availableRegions.map((region) => {
                const selected = value.regions?.includes(region) ?? false;
                return (
                  <TouchableOpacity
                    key={region}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const current = value.regions ?? [];
                      update({
                        regions: selected
                          ? current.filter((r) => r !== region)
                          : [...current, region],
                      });
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
                      {TBSA_REGION_LABELS[region]}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Excision depth */}
        <View style={styles.fieldGroup}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Excision depth
          </ThemedText>
          <View style={styles.chipRow}>
            {EXCISION_DEPTHS.map(({ key, label }) => {
              const selected = value.excisionDepth === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ excisionDepth: selected ? undefined : key });
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

        {/* More details toggle */}
        {!showMore ? (
          <TouchableOpacity
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
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
            {/* Blood loss */}
            <View style={styles.fieldRow}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Est. blood loss
              </ThemedText>
              <StepperControl
                value={value.estimatedBloodLossMl ?? 0}
                onChange={(v) =>
                  update({ estimatedBloodLossMl: v || undefined })
                }
                min={0}
                max={10000}
                step={50}
                suffix=" mL"
                theme={theme}
              />
            </View>

            {/* Tourniquet */}
            <View style={styles.fieldRow}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Tourniquet used
              </ThemedText>
              <Switch
                value={value.tourniquetUsed ?? false}
                onValueChange={(v) =>
                  update({
                    tourniquetUsed: v,
                    tourniquetTimeMin: v ? value.tourniquetTimeMin : undefined,
                  })
                }
                trackColor={{ true: theme.link, false: theme.border }}
              />
            </View>
            {value.tourniquetUsed ? (
              <View style={styles.fieldRow}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Tourniquet time
                </ThemedText>
                <StepperControl
                  value={value.tourniquetTimeMin ?? 0}
                  onChange={(v) =>
                    update({ tourniquetTimeMin: v || undefined })
                  }
                  min={0}
                  max={300}
                  step={5}
                  suffix=" min"
                  theme={theme}
                />
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  },
);

// ─── Stepper sub-component ──────────────────────────────────────────────────

interface StepperControlProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
}

function StepperControl({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  theme,
}: StepperControlProps) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(Math.max(min, value - step));
        }}
        style={[styles.stepperBtn, { borderColor: theme.border }]}
        disabled={value <= min}
      >
        <Feather
          name="minus"
          size={16}
          color={value <= min ? theme.textTertiary : theme.text}
        />
      </TouchableOpacity>
      <ThemedText style={[styles.stepperValue, { color: theme.text }]}>
        {value % 1 === 0 ? value : value.toFixed(1)}
        {suffix}
      </ThemedText>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(Math.min(max, value + step));
        }}
        style={[styles.stepperBtn, { borderColor: theme.border }]}
        disabled={value >= max}
      >
        <Feather
          name="plus"
          size={16}
          color={value >= max ? theme.textTertiary : theme.text}
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
    minWidth: 60,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
