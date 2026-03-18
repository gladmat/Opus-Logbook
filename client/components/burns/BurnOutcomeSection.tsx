/**
 * BurnOutcomeSection — Burn-specific outcome capture.
 *
 * Renders in the Outcomes tab for burn cases. Progressive disclosure:
 * Layer 1: Graft take per-procedure, complications, discharge destination
 * Layer 2: Hospital metrics (LOS, ICU, ventilator days)
 * Layer 3: Scar assessment (VSS, POSAS)
 * Layer 4: Functional outcomes (return to work/school)
 */

import React, { useCallback, useState } from "react";
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
import type {
  BurnOutcomeData,
  BurnComplication,
  VancouverScarScale as VSSData,
  POSASObserver as POSASData,
} from "@/types/burns";
import {
  BURN_COMPLICATION_LABELS,
  DISCHARGE_DESTINATION_LABELS,
} from "@/types/burns";
import { VancouverScarScaleInput } from "./VancouverScarScale";
import { POSASObserverInput } from "./POSASObserver";

// ─── Props ──────────────────────────────────────────────────────────────────

interface BurnOutcomeSectionProps {
  value: BurnOutcomeData;
  onChange: (value: BurnOutcomeData) => void;
  /** Graft procedures in this case for per-procedure graft take */
  graftProcedures?: Array<{
    id: string;
    name: string;
    graftTakePercentage?: number;
  }>;
  onGraftTakeChange?: (procedureId: string, percentage: number | undefined) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_COMPLICATIONS: BurnComplication[] = [
  "graft_failure_partial",
  "graft_failure_total",
  "wound_infection",
  "sepsis",
  "pneumonia",
  "vte",
  "ards",
  "compartment_syndrome",
  "donor_site_complication",
  "heterotopic_ossification",
  "contracture",
  "hypertrophic_scarring",
  "return_to_theatre",
  "death",
  "other",
];

const DISCHARGE_DESTINATIONS = [
  "home",
  "rehabilitation",
  "other_hospital",
  "ltac",
  "death",
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export const BurnOutcomeSection = React.memo(function BurnOutcomeSection({
  value,
  onChange,
  graftProcedures,
  onGraftTakeChange,
}: BurnOutcomeSectionProps) {
  const { theme } = useTheme();
  const [showHospitalMetrics, setShowHospitalMetrics] = useState(
    () =>
      value.lengthOfStayDays != null ||
      value.icuDays != null ||
      value.ventilatorDays != null,
  );
  const [showScarAssessment, setShowScarAssessment] = useState(
    () => !!value.vancouverScarScale || !!value.posasObserver,
  );
  const [showFunctional, setShowFunctional] = useState(
    () => !!value.returnToWorkDate || !!value.returnToSchoolDate,
  );

  const update = useCallback(
    (patch: Partial<BurnOutcomeData>) => onChange({ ...value, ...patch }),
    [value, onChange],
  );

  const toggleComplication = useCallback(
    (comp: BurnComplication) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const current = value.complications ?? [];
      const updated = current.includes(comp)
        ? current.filter((c) => c !== comp)
        : [...current, comp];
      update({ complications: updated.length > 0 ? updated : undefined });
    },
    [value.complications, update],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Feather name="clipboard" size={16} color={theme.link} />
        <ThemedText style={[styles.title, { color: theme.text }]}>
          Burns Outcomes
        </ThemedText>
      </View>

      {/* Layer 1: Per-procedure graft take */}
      {graftProcedures && graftProcedures.length > 0 ? (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Graft Take
          </ThemedText>
          {graftProcedures.map((proc) => (
            <View key={proc.id} style={styles.graftTakeRow}>
              <ThemedText
                style={[styles.graftProcName, { color: theme.text }]}
                numberOfLines={1}
              >
                {proc.name}
              </ThemedText>
              <View style={styles.stepper}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onGraftTakeChange?.(
                      proc.id,
                      Math.max(0, (proc.graftTakePercentage ?? 0) - 5),
                    );
                  }}
                  style={[styles.stepperBtn, { borderColor: theme.border }]}
                >
                  <Feather name="minus" size={14} color={theme.text} />
                </TouchableOpacity>
                <ThemedText
                  style={[styles.stepperValue, { color: theme.text }]}
                >
                  {proc.graftTakePercentage ?? "—"}%
                </ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onGraftTakeChange?.(
                      proc.id,
                      Math.min(100, (proc.graftTakePercentage ?? 0) + 5),
                    );
                  }}
                  style={[styles.stepperBtn, { borderColor: theme.border }]}
                >
                  <Feather name="plus" size={14} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Complications */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Complications
        </ThemedText>
        <View style={styles.chipRow}>
          {ALL_COMPLICATIONS.map((comp) => {
            const selected = value.complications?.includes(comp) ?? false;
            return (
              <TouchableOpacity
                key={comp}
                onPress={() => toggleComplication(comp)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? theme.error + "15"
                      : theme.backgroundRoot,
                    borderColor: selected ? theme.error : theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: selected ? theme.error : theme.textSecondary },
                  ]}
                >
                  {BURN_COMPLICATION_LABELS[comp]}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Discharge destination */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Discharge Destination
        </ThemedText>
        <View style={styles.chipRow}>
          {DISCHARGE_DESTINATIONS.map((dest) => {
            const selected = value.dischargeDestination === dest;
            return (
              <TouchableOpacity
                key={dest}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    dischargeDestination: selected ? undefined : dest,
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
                  {DISCHARGE_DESTINATION_LABELS[dest]}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Layer 2: Hospital metrics (expandable) */}
      {!showHospitalMetrics ? (
        <ExpandLink
          label="Hospital metrics"
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowHospitalMetrics(true);
          }}
          theme={theme}
        />
      ) : (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Hospital Metrics
          </ThemedText>
          <MetricRow
            label="Length of stay"
            value={value.lengthOfStayDays}
            suffix=" days"
            onChange={(v) => update({ lengthOfStayDays: v })}
            theme={theme}
          />
          <MetricRow
            label="ICU days"
            value={value.icuDays}
            suffix=" days"
            onChange={(v) => update({ icuDays: v })}
            theme={theme}
          />
          <MetricRow
            label="Ventilator days"
            value={value.ventilatorDays}
            suffix=" days"
            onChange={(v) => update({ ventilatorDays: v })}
            theme={theme}
          />
          <MetricRow
            label="Total operations"
            value={value.numberOfOperations}
            suffix=""
            onChange={(v) => update({ numberOfOperations: v })}
            theme={theme}
          />
        </View>
      )}

      {/* Layer 3: Scar assessment (expandable) */}
      {!showScarAssessment ? (
        <ExpandLink
          label="Scar assessment (VSS / POSAS)"
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowScarAssessment(true);
          }}
          theme={theme}
        />
      ) : (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Vancouver Scar Scale
          </ThemedText>
          <VancouverScarScaleInput
            value={value.vancouverScarScale ?? {}}
            onChange={(vss) =>
              update({ vancouverScarScale: vss as VSSData })
            }
          />

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            POSAS Observer
          </ThemedText>
          <POSASObserverInput
            value={value.posasObserver ?? {}}
            onChange={(posas) =>
              update({ posasObserver: posas as POSASData })
            }
          />
        </View>
      )}

      {/* Layer 4: Functional outcomes (expandable) */}
      {!showFunctional ? (
        <ExpandLink
          label="Functional outcomes"
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowFunctional(true);
          }}
          theme={theme}
        />
      ) : (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Functional Outcomes
          </ThemedText>
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Return to work
            </ThemedText>
            <ThemedText style={[styles.fieldHint, { color: theme.textTertiary }]}>
              {value.returnToWorkDate ?? "Not set"}
            </ThemedText>
          </View>
          <View style={styles.fieldRow}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Return to school
            </ThemedText>
            <ThemedText style={[styles.fieldHint, { color: theme.textTertiary }]}>
              {value.returnToSchoolDate ?? "Not set"}
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
});

// ─── Sub-components ─────────────────────────────────────────────────────────

function ExpandLink({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.expandLink}>
      <ThemedText style={[styles.expandLinkText, { color: theme.link }]}>
        {label}
      </ThemedText>
      <Feather name="chevron-down" size={14} color={theme.link} />
    </TouchableOpacity>
  );
}

function MetricRow({
  label,
  value,
  suffix,
  onChange,
  theme,
}: {
  label: string;
  value?: number;
  suffix: string;
  onChange: (v: number | undefined) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any;
}) {
  return (
    <View style={styles.fieldRow}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(Math.max(0, (value ?? 0) - 1) || undefined);
          }}
          style={[styles.stepperBtn, { borderColor: theme.border }]}
        >
          <Feather name="minus" size={14} color={theme.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.stepperValue, { color: theme.text }]}>
          {value ?? 0}
          {suffix}
        </ThemedText>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange((value ?? 0) + 1);
          }}
          style={[styles.stepperBtn, { borderColor: theme.border }]}
        >
          <Feather name="plus" size={14} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontSize: 14,
    flex: 1,
  },
  fieldHint: {
    fontSize: 13,
  },
  graftTakeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  graftProcName: {
    fontSize: 14,
    flex: 1,
  },
  expandLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  expandLinkText: {
    fontSize: 13,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
