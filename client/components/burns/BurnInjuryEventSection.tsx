/**
 * BurnInjuryEventSection — Injury event capture for acute burn phase.
 * Progressive disclosure: mechanism → intent → first aid → mechanism-specific details.
 * Captured once per episode on first acute case.
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  BurnInjuryEvent,
  BurnMechanism,
  BurnMechanismDetail,
  BurnIntent,
  BurnPlaceOfInjury,
  BurnReferralSource,
} from "@/types/burns";
import {
  BURN_MECHANISM_LABELS,
  BURN_MECHANISM_DETAIL_LABELS,
  BURN_INTENT_LABELS,
  BURN_PLACE_LABELS,
  BURN_REFERRAL_LABELS,
  MECHANISM_DETAILS,
} from "@/types/burns";

interface BurnInjuryEventSectionProps {
  event: BurnInjuryEvent;
  onChange: (event: BurnInjuryEvent) => void;
}

const ALL_MECHANISMS: BurnMechanism[] = [
  "thermal",
  "chemical",
  "electrical",
  "radiation",
  "friction",
  "cold",
];

const ALL_INTENTS: BurnIntent[] = [
  "accidental",
  "self_harm",
  "assault",
  "undetermined",
  "nai_suspected",
];

const ALL_PLACES: BurnPlaceOfInjury[] = [
  "home_kitchen",
  "home_bathroom",
  "home_other",
  "workplace",
  "public",
  "vehicle",
  "outdoor",
  "other",
];

const ALL_REFERRALS: BurnReferralSource[] = [
  "self",
  "gp",
  "ed",
  "other_hospital",
  "ambulance",
];

function ChipPicker<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  labels: Record<T, string>;
  value?: T;
  onChange: (v: T) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.fieldGroup}>
      <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
      <View style={styles.chipGrid}>
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(opt);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.link + "20"
                    : theme.backgroundRoot,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: isSelected ? theme.link : theme.textSecondary },
                ]}
              >
                {labels[opt]}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean;
  onChange: (v: boolean) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.switchRow}>
      <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
      <Switch
        value={value ?? false}
        onValueChange={(v) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(v);
        }}
        trackColor={{ false: theme.border, true: theme.link }}
        thumbColor={Platform.OS === "android" ? "#fff" : undefined}
      />
    </View>
  );
}

export const BurnInjuryEventSection = React.memo(
  function BurnInjuryEventSection({
    event,
    onChange,
  }: BurnInjuryEventSectionProps) {
    const { theme } = useTheme();

    const update = useCallback(
      (updates: Partial<BurnInjuryEvent>) => {
        onChange({ ...event, ...updates });
      },
      [event, onChange],
    );

    const detailOptions = useMemo(
      () => (event.mechanism ? MECHANISM_DETAILS[event.mechanism] : []),
      [event.mechanism],
    );

    return (
      <View style={styles.container}>
        {/* Mechanism */}
        <ChipPicker
          label="Mechanism"
          options={ALL_MECHANISMS}
          labels={BURN_MECHANISM_LABELS}
          value={event.mechanism}
          onChange={(v) => update({ mechanism: v, mechanismDetail: undefined })}
        />

        {/* Mechanism detail (if applicable) */}
        {detailOptions.length > 0 ? (
          <ChipPicker
            label="Detail"
            options={detailOptions}
            labels={BURN_MECHANISM_DETAIL_LABELS}
            value={event.mechanismDetail}
            onChange={(v) => update({ mechanismDetail: v })}
          />
        ) : null}

        {/* Inhalation injury */}
        <SwitchRow
          label="Inhalation injury"
          value={event.inhalationInjury}
          onChange={(v) => update({ inhalationInjury: v })}
        />

        {/* Intent */}
        <ChipPicker
          label="Intent"
          options={ALL_INTENTS}
          labels={BURN_INTENT_LABELS}
          value={event.intent}
          onChange={(v) => update({ intent: v })}
        />

        {/* First aid */}
        <SwitchRow
          label="First aid given"
          value={event.firstAidGiven}
          onChange={(v) => update({ firstAidGiven: v })}
        />
        {event.firstAidGiven ? (
          <SwitchRow
            label="Cool running water"
            value={event.coolRunningWater}
            onChange={(v) => update({ coolRunningWater: v })}
          />
        ) : null}

        {/* Circumferential burn */}
        <SwitchRow
          label="Circumferential burn"
          value={event.circumferentialBurn}
          onChange={(v) => update({ circumferentialBurn: v })}
        />

        {/* Place of injury */}
        <ChipPicker
          label="Place of Injury"
          options={ALL_PLACES}
          labels={BURN_PLACE_LABELS}
          value={event.placeOfInjury}
          onChange={(v) => update({ placeOfInjury: v })}
        />

        {/* Referral source */}
        <ChipPicker
          label="Referral Source"
          options={ALL_REFERRALS}
          labels={BURN_REFERRAL_LABELS}
          value={event.referralSource}
          onChange={(v) => update({ referralSource: v })}
        />

        {/* Electrical-specific fields */}
        {event.mechanism === "electrical" ? (
          <View style={[styles.mechanismDetail, { borderColor: theme.border }]}>
            <ThemedText
              style={[styles.mechanismDetailTitle, { color: theme.textSecondary }]}
            >
              Electrical Details
            </ThemedText>
            {/* Simplified — free text fields for entry/exit */}
            <SwitchRow
              label="Entry point documented"
              value={!!event.electricalDetails?.entryPoint}
              onChange={() => {
                /* Placeholder for TextInput in future */
              }}
            />
          </View>
        ) : null}

        {/* Chemical-specific fields */}
        {event.mechanism === "chemical" ? (
          <View style={[styles.mechanismDetail, { borderColor: theme.border }]}>
            <ThemedText
              style={[styles.mechanismDetailTitle, { color: theme.textSecondary }]}
            >
              Chemical Details
            </ThemedText>
            <ChipPicker
              label="Type"
              options={["acid", "alkali", "other"] as const}
              labels={{
                acid: "Acid",
                alkali: "Alkali",
                other: "Other",
              }}
              value={event.chemicalDetails?.acidOrAlkali}
              onChange={(v) =>
                update({
                  chemicalDetails: {
                    ...event.chemicalDetails,
                    acidOrAlkali: v,
                  },
                })
              }
            />
          </View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginRight: Spacing.sm,
  },
  mechanismDetail: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  mechanismDetailTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
