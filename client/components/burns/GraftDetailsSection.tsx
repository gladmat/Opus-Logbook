/**
 * GraftDetailsSection — Burn graft procedure fields.
 *
 * Layer 1 (always visible): Graft type, donor site, mesh ratio (conditional)
 * Layer 2 (expandable): Thickness, recipient area, fixation
 * Layer 3 (follow-up): Graft take %, assessment date
 *
 * Mesh ratio chips are 56px tall for OR-friendly one-handed tapping.
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
import type { BurnProcedureDetails } from "@/types/burns";
import {
  GRAFT_TYPE_LABELS,
  GRAFT_DONOR_LABELS,
  MESH_RATIO_LABELS,
  GRAFT_FIXATION_LABELS,
} from "@/types/burns";
import type {
  GraftType,
  GraftDonorSite,
  MeshRatio,
  GraftFixation,
} from "@/types/burns";
import { graftTypeShowsMeshRatio, inferGraftTypeFromProcedure } from "@/lib/burnsConfig";

// ─── Props ──────────────────────────────────────────────────────────────────

type GraftingData = NonNullable<BurnProcedureDetails["grafting"]>;

interface GraftDetailsSectionProps {
  value: GraftingData;
  onChange: (value: GraftingData) => void;
  procedureId?: string;
  procedureName?: string;
  /** Whether this is an edit/follow-up (shows graft take fields) */
  isFollowUp?: boolean;
}

// ─── Ordered keys ───────────────────────────────────────────────────────────

const GRAFT_TYPES: GraftType[] = [
  "stsg_sheet",
  "stsg_meshed",
  "ftsg",
  "meek",
  "cea",
  "recell",
];
const DONOR_SITES: GraftDonorSite[] = [
  "thigh_anterior",
  "thigh_lateral",
  "thigh_posterior",
  "scalp",
  "buttock",
  "abdomen",
  "back",
  "arm_upper",
  "arm_lower",
  "groin",
  "other",
];
const MESH_RATIOS: MeshRatio[] = [
  "unmeshed",
  "1:1",
  "1:1.5",
  "1:3",
  "1:4",
  "1:6",
];
const FIXATION_METHODS: GraftFixation[] = [
  "staples",
  "sutures",
  "fibrin_glue",
  "npwt",
  "bolster",
  "steristrips",
];
const THICKNESS_OPTIONS = [
  { key: "thin" as const, label: "Thin" },
  { key: "intermediate" as const, label: "Intermediate" },
  { key: "thick" as const, label: "Thick" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const GraftDetailsSection = React.memo(function GraftDetailsSection({
  value,
  onChange,
  procedureId,
  procedureName,
  isFollowUp,
}: GraftDetailsSectionProps) {
  const { theme } = useTheme();
  const [showMore, setShowMore] = useState(
    () => !!value.graftThickness || !!value.fixationMethod || !!value.recipientAreaCm2,
  );
  const [showFollowUp, setShowFollowUp] = useState(
    () => !!value.graftTakePercentage || !!isFollowUp,
  );

  const update = useCallback(
    (patch: Partial<GraftingData>) => onChange({ ...value, ...patch }),
    [value, onChange],
  );

  // Auto-infer graft type from procedure ID if not already set
  const effectiveGraftType = useMemo(() => {
    if (value.graftType) return value.graftType;
    if (procedureId) return inferGraftTypeFromProcedure(procedureId) as GraftType | undefined;
    return undefined;
  }, [value.graftType, procedureId]);

  const showMesh = graftTypeShowsMeshRatio(effectiveGraftType);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElevated, borderColor: theme.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Feather name="layers" size={14} color={theme.link} />
        <ThemedText style={[styles.title, { color: theme.text }]}>
          {procedureName ?? "Graft Details"}
        </ThemedText>
      </View>

      {/* Graft type chips */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Graft type
        </ThemedText>
        <View style={styles.chipRow}>
          {GRAFT_TYPES.map((gt) => {
            const selected = effectiveGraftType === gt;
            return (
              <TouchableOpacity
                key={gt}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    graftType: selected ? undefined : gt,
                    meshRatio: !graftTypeShowsMeshRatio(gt)
                      ? undefined
                      : value.meshRatio,
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
                  {GRAFT_TYPE_LABELS[gt]}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Donor site */}
      <View style={styles.fieldGroup}>
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          Donor site
        </ThemedText>
        <View style={styles.chipRow}>
          {DONOR_SITES.map((ds) => {
            const selected = value.donorSite === ds;
            return (
              <TouchableOpacity
                key={ds}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ donorSite: selected ? undefined : ds });
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
                  {GRAFT_DONOR_LABELS[ds]}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Mesh ratio — large chips, only for STSG meshed / Meek */}
      {showMesh ? (
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            Mesh ratio
          </ThemedText>
          <View style={styles.chipRow}>
            {MESH_RATIOS.map((mr) => {
              const selected = value.meshRatio === mr;
              return (
                <TouchableOpacity
                  key={mr}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ meshRatio: selected ? undefined : mr });
                  }}
                  style={[
                    styles.meshChip,
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
                      styles.meshChipText,
                      { color: selected ? theme.link : theme.textSecondary },
                    ]}
                  >
                    {MESH_RATIO_LABELS[mr]}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* More details toggle */}
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
          {/* Thickness */}
          <View style={styles.fieldGroup}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Graft thickness
            </ThemedText>
            <View style={styles.chipRow}>
              {THICKNESS_OPTIONS.map(({ key, label }) => {
                const selected = value.graftThickness === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({ graftThickness: selected ? undefined : key });
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

          {/* Recipient area */}
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Recipient area (cm²)
            </ThemedText>
            <StepperInline
              value={value.recipientAreaCm2 ?? 0}
              onChange={(v) => update({ recipientAreaCm2: v || undefined })}
              min={0}
              max={10000}
              step={10}
              theme={theme}
            />
          </View>

          {/* Fixation */}
          <View style={styles.fieldGroup}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Fixation method
            </ThemedText>
            <View style={styles.chipRow}>
              {FIXATION_METHODS.map((fm) => {
                const selected = value.fixationMethod === fm;
                return (
                  <TouchableOpacity
                    key={fm}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({ fixationMethod: selected ? undefined : fm });
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
                      {GRAFT_FIXATION_LABELS[fm]}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Follow-up: Graft take */}
      {!showFollowUp ? (
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowFollowUp(true);
          }}
          style={styles.moreLink}
        >
          <ThemedText style={[styles.moreLinkText, { color: theme.link }]}>
            Add graft take assessment
          </ThemedText>
          <Feather name="chevron-down" size={14} color={theme.link} />
        </TouchableOpacity>
      ) : (
        <View style={styles.expandedSection}>
          <View
            style={[
              styles.divider,
              { backgroundColor: theme.border },
            ]}
          />
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Graft take
            </ThemedText>
            <StepperInline
              value={value.graftTakePercentage ?? 0}
              onChange={(v) => update({ graftTakePercentage: v || undefined })}
              min={0}
              max={100}
              step={5}
              suffix="%"
              theme={theme}
            />
          </View>
        </View>
      )}
    </View>
  );
});

// ─── StepperInline ──────────────────────────────────────────────────────────

interface StepperInlineProps {
  value: number;
  onChange: (value: number) => void;
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
  meshChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  meshChipText: {
    fontSize: 16,
    fontWeight: "700",
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
  divider: {
    height: 1,
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
