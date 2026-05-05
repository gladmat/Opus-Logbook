import React, { useCallback, useMemo } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { ProductPicker } from "./ProductPicker";
import type { PrpDetails, AestheticProduct } from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface PrpDetailsCardProps {
  details?: PrpDetails;
  onChange: (details: PrpDetails) => void;
}

const CONCENTRATION_OPTIONS = ["2×", "3×", "5×", "7×", "Custom"];
const ADDITIVE_OPTIONS = [
  "Calcium chloride",
  "Thrombin",
  "Biotin",
  "ACell",
  "Fibrin",
  "None",
];
const SITE_OPTIONS = [
  "Scalp",
  "Face",
  "Under-eye",
  "Neck",
  "Décolletage",
  "Hand dorsum",
  "Other",
];

const DEFAULT: PrpDetails = {
  system: "",
  bloodDrawVolumeMl: 0,
  recipientSites: [],
};

export const PrpDetailsCard = React.memo(function PrpDetailsCard({
  details,
  onChange,
}: PrpDetailsCardProps) {
  const { theme } = useTheme();
  const d = details ?? DEFAULT;

  const update = useCallback(
    (partial: Partial<PrpDetails>) => onChange({ ...d, ...partial }),
    [d, onChange],
  );

  const selectedAdditives = useMemo(
    () => new Set(d.additives ?? []),
    [d.additives],
  );
  const selectedSites = useMemo(
    () => new Set(d.recipientSites),
    [d.recipientSites],
  );

  const chipStyle = (selected: boolean) => [
    styles.chip,
    {
      backgroundColor: selected ? theme.link : theme.backgroundElevated,
      borderColor: selected ? theme.link : theme.border,
    },
  ];

  const chipTextStyle = (selected: boolean) => [
    styles.chipText,
    { color: selected ? theme.buttonText : theme.text },
  ];

  const toggleArray = (arr: string[] | undefined, val: string) => {
    const a = arr ?? [];
    return a.includes(val) ? a.filter((v) => v !== val) : [...a, val];
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          PRP system
        </ThemedText>
        <ProductPicker
          category="prp_system"
          selectedProductId={d.system || undefined}
          onSelect={(p: AestheticProduct) => update({ system: p.id || "" })}
        />
      </View>

      <NumericRow
        label="Blood draw (mL)"
        value={d.bloodDrawVolumeMl}
        onChange={(v) => update({ bloodDrawVolumeMl: v ?? 0 })}
        theme={theme}
      />
      <NumericRow
        label="Centrifuge RPM"
        value={d.centrifugeRpm}
        onChange={(v) => update({ centrifugeRpm: v })}
        theme={theme}
        integer
      />
      <NumericRow
        label="Centrifuge time (min)"
        value={d.centrifugeTimeMin}
        onChange={(v) => update({ centrifugeTimeMin: v })}
        theme={theme}
        integer
      />
      <NumericRow
        label="PRP yield (mL)"
        value={d.prpYieldVolumeMl}
        onChange={(v) => update({ prpYieldVolumeMl: v })}
        theme={theme}
      />

      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Platelet concentration
        </ThemedText>
        <View style={styles.chipRow}>
          {CONCENTRATION_OPTIONS.map((c) => {
            const selected = d.plateletConcentrationFactor === c;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    plateletConcentrationFactor: selected ? undefined : c,
                  });
                }}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>{c}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Additives
        </ThemedText>
        <View style={styles.chipRow}>
          {ADDITIVE_OPTIONS.map((a) => {
            const selected = selectedAdditives.has(a);
            return (
              <Pressable
                key={a}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ additives: toggleArray(d.additives, a) });
                }}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>{a}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Recipient sites
        </ThemedText>
        <View style={styles.chipRow}>
          {SITE_OPTIONS.map((s) => {
            const selected = selectedSites.has(s);
            return (
              <Pressable
                key={s}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    recipientSites: toggleArray(
                      d.recipientSites,
                      s,
                    ) as string[],
                  });
                }}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>{s}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <NumericRow
        label="Volume per site (mL)"
        value={d.volumePerSiteMl}
        onChange={(v) => update({ volumePerSiteMl: v })}
        theme={theme}
      />
    </View>
  );
});

function NumericRow({
  label,
  value,
  onChange,
  theme,
  integer,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  theme: {
    text: string;
    textSecondary: string;
    backgroundSecondary: string;
    border: string;
    textTertiary: string;
  };
  integer?: boolean;
}) {
  return (
    <View style={styles.numericRow}>
      <ThemedText style={[styles.numericLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.numericInput,
          {
            backgroundColor: theme.backgroundSecondary,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        value={value != null ? String(value) : ""}
        onChangeText={(t) => {
          if (!t) {
            onChange(undefined);
            return;
          }
          const n = integer ? parseInt(t, 10) : parseFloat(t);
          if (!isNaN(n)) onChange(n);
        }}
        placeholder="—"
        placeholderTextColor={theme.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  section: { gap: Spacing.xs },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: { fontSize: 13, fontWeight: "500" },
  numericRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  numericLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  numericInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    height: 36,
    minWidth: 80,
    textAlign: "right",
    fontSize: 14,
  },
});
