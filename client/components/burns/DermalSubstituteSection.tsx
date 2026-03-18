/**
 * DermalSubstituteSection — Dermal substitute procedure fields.
 *
 * Always visible: Product picker, area, simultaneous STSG toggle
 * Expandable: Planned interval to autograft, seal formation (BTM only)
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
import type { BurnProcedureDetails, DermalSubstituteProduct } from "@/types/burns";
import { DERMAL_SUBSTITUTE_LABELS } from "@/types/burns";
import { getDefaultIntervalDays } from "@/lib/burnsConfig";

// ─── Props ──────────────────────────────────────────────────────────────────

type DermalSubData = NonNullable<BurnProcedureDetails["dermalSubstitute"]>;

interface DermalSubstituteSectionProps {
  value: DermalSubData;
  onChange: (value: DermalSubData) => void;
  procedureName?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PRODUCTS: DermalSubstituteProduct[] = [
  "integra_bilayer",
  "integra_thin",
  "matriderm",
  "btm_novosorb",
  "alloderm",
  "pelnac",
  "other",
];

const SEAL_OPTIONS = [
  { key: "complete" as const, label: "Complete" },
  { key: "partial" as const, label: "Partial" },
  { key: "none" as const, label: "None" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const DermalSubstituteSection = React.memo(
  function DermalSubstituteSection({
    value,
    onChange,
    procedureName,
  }: DermalSubstituteSectionProps) {
    const { theme } = useTheme();
    const [showMore, setShowMore] = useState(
      () =>
        value.plannedIntervalToAutograftDays != null ||
        value.sealFormation != null,
    );

    const update = useCallback(
      (patch: Partial<DermalSubData>) => onChange({ ...value, ...patch }),
      [value, onChange],
    );

    const isBTM = value.product === "btm_novosorb";

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundElevated, borderColor: theme.border },
        ]}
      >
        <View style={styles.headerRow}>
          <Feather name="grid" size={14} color={theme.link} />
          <ThemedText style={[styles.title, { color: theme.text }]}>
            {procedureName ?? "Dermal Substitute"}
          </ThemedText>
        </View>

        {/* Product picker */}
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Product
          </ThemedText>
          <View style={styles.chipRow}>
            {PRODUCTS.map((p) => {
              const selected = value.product === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const defaultInterval = getDefaultIntervalDays(p);
                    update({
                      product: selected ? undefined : p,
                      plannedIntervalToAutograftDays:
                        !selected && defaultInterval != null
                          ? defaultInterval
                          : value.plannedIntervalToAutograftDays,
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
                    {DERMAL_SUBSTITUTE_LABELS[p]}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Area */}
        <View style={styles.fieldRow}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Area (cm²)
          </ThemedText>
          <StepperInline
            value={value.areaCm2 ?? 0}
            onChange={(v) => update({ areaCm2: v || undefined })}
            min={0}
            max={5000}
            step={10}
            theme={theme}
          />
        </View>

        {/* Simultaneous STSG */}
        <View style={styles.fieldRow}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Simultaneous STSG
          </ThemedText>
          <Switch
            value={value.simultaneousSTSG ?? false}
            onValueChange={(v) => update({ simultaneousSTSG: v })}
            trackColor={{ true: theme.link, false: theme.border }}
          />
        </View>

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
            {/* Interval to autograft */}
            <View style={styles.fieldRow}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Interval to autograft
              </ThemedText>
              <StepperInline
                value={value.plannedIntervalToAutograftDays ?? 0}
                onChange={(v) =>
                  update({ plannedIntervalToAutograftDays: v || undefined })
                }
                min={0}
                max={120}
                step={1}
                suffix=" d"
                theme={theme}
              />
            </View>

            {/* Seal formation — BTM only */}
            {isBTM ? (
              <View style={styles.fieldGroup}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Seal formation
                </ThemedText>
                <View style={styles.chipRow}>
                  {SEAL_OPTIONS.map(({ key, label }) => {
                    const selected = value.sealFormation === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          update({ sealFormation: selected ? undefined : key });
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
                            {
                              color: selected
                                ? theme.link
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {label}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  },
);

// ─── Stepper ────────────────────────────────────────────────────────────────

interface StepperInlineProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
}

function StepperInline({
  value,
  onChange,
  min,
  max,
  step,
  suffix = "",
  theme,
}: StepperInlineProps) {
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
        {value}
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
    minWidth: 50,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
