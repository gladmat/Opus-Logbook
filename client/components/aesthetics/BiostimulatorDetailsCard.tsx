import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { ProductPicker } from "./ProductPicker";
import { getProductById } from "@/lib/aestheticProducts";
import type {
  BiostimulatorDetails,
  FillerTechnique,
  AestheticProduct,
} from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface BiostimulatorDetailsCardProps {
  details?: BiostimulatorDetails;
  onChange: (details: BiostimulatorDetails) => void;
}

const TECHNIQUE_OPTIONS: { value: FillerTechnique; label: string }[] = [
  { value: "linear_threading", label: "Linear threading" },
  { value: "serial_puncture", label: "Serial puncture" },
  { value: "bolus_depot", label: "Bolus / BAP" },
  { value: "fanning", label: "Fanning" },
  { value: "retrograde_threading", label: "Retrograde" },
  { value: "microdroplet", label: "Microdroplet" },
];

const SITE_OPTIONS = [
  "Temple", "Cheek", "Jawline", "Nasolabial", "Hand dorsum",
  "Décolletage", "Arm", "Thigh", "Buttock", "Other",
];

/** Product-specific reconstitution presets */
const RECONSTITUTION_PRESETS: Record<string, string[]> = {
  biostim_sculptra: ["5mL sterile water + 2mL lido", "7mL sterile water", "8mL sterile water"],
  biostim_profhilo: ["2mL pre-filled (no reconstitution)"],
  biostim_sunekos: ["Per protocol"],
  biostim_lanluma: ["16mL sterile water"],
  biostim_juvelook: ["Per protocol"],
};

const DEFAULT: BiostimulatorDetails = {
  productId: "",
  numberOfVials: 1,
  totalVolumeMl: 0,
  sites: [],
};

export const BiostimulatorDetailsCard = React.memo(
  function BiostimulatorDetailsCard({
    details,
    onChange,
  }: BiostimulatorDetailsCardProps) {
    const { theme } = useTheme();
    const d = details ?? DEFAULT;

    const update = useCallback(
      (partial: Partial<BiostimulatorDetails>) => {
        onChange({ ...d, ...partial });
      },
      [d, onChange],
    );

    const reconPresets = d.productId
      ? RECONSTITUTION_PRESETS[d.productId] ?? []
      : [];

    const selectedSites = new Set(d.sites);

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

    return (
      <View style={styles.container}>
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Product
          </ThemedText>
          <ProductPicker
            category="biostimulator"
            selectedProductId={d.productId || undefined}
            onSelect={(p: AestheticProduct) => update({ productId: p.id || "" })}
          />
        </View>

        {/* Vials */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Number of vials
          </ThemedText>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                update({ numberOfVials: Math.max(1, d.numberOfVials - 1) });
              }}
              style={[styles.stepperBtn, { borderColor: theme.border }]}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <View style={[styles.stepperDisplay, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <ThemedText style={[styles.stepperValue, { color: theme.text }]}>{d.numberOfVials}</ThemedText>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                update({ numberOfVials: Math.min(5, d.numberOfVials + 1) });
              }}
              style={[styles.stepperBtn, { borderColor: theme.border }]}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {/* Reconstitution protocol */}
        {reconPresets.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Reconstitution protocol
            </ThemedText>
            <View style={styles.chipRow}>
              {reconPresets.map((preset) => {
                const selected = d.reconstitutionProtocol === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({ reconstitutionProtocol: selected ? undefined : preset });
                    }}
                    style={chipStyle(selected)}
                  >
                    <ThemedText style={chipTextStyle(selected)}>{preset}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Sites */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Injection sites
          </ThemedText>
          <View style={styles.chipRow}>
            {SITE_OPTIONS.map((site) => {
              const selected = selectedSites.has(site);
              return (
                <Pressable
                  key={site}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const next = selected
                      ? d.sites.filter((s) => s !== site)
                      : [...d.sites, site];
                    update({ sites: next });
                  }}
                  style={chipStyle(selected)}
                >
                  <ThemedText style={chipTextStyle(selected)}>{site}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Technique */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Technique
          </ThemedText>
          <View style={styles.chipRow}>
            {TECHNIQUE_OPTIONS.map((t) => {
              const selected = d.technique === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ technique: selected ? undefined : t.value });
                  }}
                  style={chipStyle(selected)}
                >
                  <ThemedText style={chipTextStyle(selected)}>{t.label}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Session tracker */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            Session in series
          </ThemedText>
          <View style={styles.sessionRow}>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>Session</ThemedText>
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    sessionNumberInSeries: Math.max(1, (d.sessionNumberInSeries ?? 1) - 1),
                  });
                }}
                style={[styles.miniStepperBtn, { borderColor: theme.border }]}
              >
                <Feather name="minus" size={14} color={theme.text} />
              </Pressable>
              <ThemedText style={[styles.sessionNum, { color: theme.text }]}>
                {d.sessionNumberInSeries ?? 1}
              </ThemedText>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    sessionNumberInSeries: (d.sessionNumberInSeries ?? 1) + 1,
                  });
                }}
                style={[styles.miniStepperBtn, { borderColor: theme.border }]}
              >
                <Feather name="plus" size={14} color={theme.text} />
              </Pressable>
            </View>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>of</ThemedText>
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    totalSessionsPlanned: Math.max(1, (d.totalSessionsPlanned ?? 3) - 1),
                  });
                }}
                style={[styles.miniStepperBtn, { borderColor: theme.border }]}
              >
                <Feather name="minus" size={14} color={theme.text} />
              </Pressable>
              <ThemedText style={[styles.sessionNum, { color: theme.text }]}>
                {d.totalSessionsPlanned ?? 3}
              </ThemedText>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    totalSessionsPlanned: (d.totalSessionsPlanned ?? 3) + 1,
                  });
                }}
                style={[styles.miniStepperBtn, { borderColor: theme.border }]}
              >
                <Feather name="plus" size={14} color={theme.text} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  section: { gap: Spacing.xs },
  sectionLabel: { fontSize: 12, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, minHeight: 36, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "500" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  stepperBtn: { borderWidth: 1, borderRadius: BorderRadius.sm, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  stepperDisplay: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.lg, height: 44, justifyContent: "center", alignItems: "center", minWidth: 60 },
  stepperValue: { fontSize: 18, fontWeight: "700" },
  miniStepperBtn: { borderWidth: 1, borderRadius: BorderRadius.xs, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  sessionNum: { fontSize: 16, fontWeight: "700", minWidth: 24, textAlign: "center" },
});
