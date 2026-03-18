import React, { useCallback, useMemo } from "react";
import { View, TextInput, Pressable, Switch, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import type {
  AestheticFatGraftingDetails,
  AestheticFatGraftingRecipientSite,
} from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface FatGraftingDetailsCardProps {
  details?: AestheticFatGraftingDetails;
  onChange: (details: AestheticFatGraftingDetails) => void;
}

const HARVEST_SITES = ["Abdomen", "Flanks", "Inner thighs", "Outer thighs", "Back / bra roll", "Other"];
const HARVEST_TECHNIQUES: { value: AestheticFatGraftingDetails["harvestTechnique"]; label: string }[] = [
  { value: "coleman_syringe", label: "Coleman syringe" },
  { value: "pal", label: "PAL" },
  { value: "vaser", label: "VASER" },
  { value: "wal", label: "WAL" },
  { value: "standard_cannula", label: "Standard cannula" },
];
const PROCESSING_METHODS: { value: AestheticFatGraftingDetails["processingMethod"]; label: string }[] = [
  { value: "centrifugation", label: "Centrifugation" },
  { value: "filtration_revolve", label: "REVOLVE" },
  { value: "filtration_puregraft", label: "PureGraft" },
  { value: "decantation", label: "Decantation" },
  { value: "nanofat", label: "Nanofat" },
];
const FAT_TYPES: { value: AestheticFatGraftingDetails["fatType"]; label: string }[] = [
  { value: "macrofat", label: "Macrofat" },
  { value: "microfat", label: "Microfat" },
  { value: "nanofat", label: "Nanofat" },
  { value: "svf_enriched", label: "SVF-enriched" },
];
const INJECTION_CANNULAS = ["14G", "16G", "18G", "20G", "22G", "27G"];
const INJECTION_TECHNIQUES: { value: NonNullable<AestheticFatGraftingDetails["injectionTechnique"]>; label: string }[] = [
  { value: "microdroplet", label: "Microdroplet" },
  { value: "structural", label: "Structural" },
  { value: "bolus", label: "Bolus" },
  { value: "retrograde_fan", label: "Retrograde fan" },
];
const RECIPIENT_SITE_OPTIONS = [
  "Face", "Temples", "Lips", "Periorbital", "Malar", "NLF", "Hands", "Buttock", "Breast", "Other",
];

const DEFAULT: AestheticFatGraftingDetails = {
  harvestSite: "",
  harvestTechnique: "coleman_syringe",
  tumescentUsed: true,
  processingMethod: "centrifugation",
  processedVolumeMl: 0,
  fatType: "macrofat",
  recipientSites: [],
};

export const FatGraftingDetailsCard = React.memo(function FatGraftingDetailsCard({
  details,
  onChange,
}: FatGraftingDetailsCardProps) {
  const { theme } = useTheme();
  const d = details ?? DEFAULT;

  const update = useCallback(
    (partial: Partial<AestheticFatGraftingDetails>) => onChange({ ...d, ...partial }),
    [d, onChange],
  );

  const chipStyle = (selected: boolean) => [
    styles.chip,
    { backgroundColor: selected ? theme.link : theme.backgroundElevated, borderColor: selected ? theme.link : theme.border },
  ];
  const chipTextStyle = (selected: boolean) => [
    styles.chipText, { color: selected ? theme.buttonText : theme.text },
  ];

  const handleAddRecipientSite = useCallback((siteName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const exists = d.recipientSites.some((s) => s.site === siteName);
    if (exists) {
      update({ recipientSites: d.recipientSites.filter((s) => s.site !== siteName) });
    } else {
      update({ recipientSites: [...d.recipientSites, { site: siteName, volumeInjectedMl: 0 }] });
    }
  }, [d.recipientSites, update]);

  const handleSiteVolumeChange = useCallback((siteName: string, vol: number) => {
    update({
      recipientSites: d.recipientSites.map((s) =>
        s.site === siteName ? { ...s, volumeInjectedMl: vol } : s,
      ),
    });
  }, [d.recipientSites, update]);

  const selectedSiteNames = useMemo(() => new Set(d.recipientSites.map((s) => s.site)), [d.recipientSites]);

  return (
    <View style={styles.container}>
      {/* HARVEST */}
      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Harvest</ThemedText>
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Harvest site</ThemedText>
        <View style={styles.chipRow}>
          {HARVEST_SITES.map((s) => {
            const sel = d.harvestSite === s;
            return <Pressable key={s} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); update({ harvestSite: sel ? "" : s }); }} style={chipStyle(sel)}><ThemedText style={chipTextStyle(sel)}>{s}</ThemedText></Pressable>;
          })}
        </View>
      </View>
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Technique</ThemedText>
        <View style={styles.chipRow}>
          {HARVEST_TECHNIQUES.map((t) => {
            const sel = d.harvestTechnique === t.value;
            return <Pressable key={t.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); update({ harvestTechnique: t.value }); }} style={chipStyle(sel)}><ThemedText style={chipTextStyle(sel)}>{t.label}</ThemedText></Pressable>;
          })}
        </View>
      </View>
      <View style={styles.switchRow}>
        <ThemedText style={[styles.switchLabel, { color: theme.text }]}>Tumescent used</ThemedText>
        <Switch value={d.tumescentUsed} onValueChange={(v) => update({ tumescentUsed: v })} trackColor={{ true: theme.link }} />
      </View>
      <NumRow label="Total aspirate (mL)" value={d.totalAspirateMl} onChange={(v) => update({ totalAspirateMl: v })} theme={theme} />

      {/* PROCESSING */}
      <ThemedText style={[styles.sectionTitle, { color: theme.text, marginTop: Spacing.md }]}>Processing</ThemedText>
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Method</ThemedText>
        <View style={styles.chipRow}>
          {PROCESSING_METHODS.map((m) => {
            const sel = d.processingMethod === m.value;
            return <Pressable key={m.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); update({ processingMethod: m.value }); }} style={chipStyle(sel)}><ThemedText style={chipTextStyle(sel)}>{m.label}</ThemedText></Pressable>;
          })}
        </View>
      </View>
      {d.processingMethod === "centrifugation" && (
        <View style={styles.row}>
          <NumRow label="RPM" value={d.centrifugeRpm} onChange={(v) => update({ centrifugeRpm: v })} theme={theme} integer />
          <NumRow label="Time (min)" value={d.centrifugeTimeMin} onChange={(v) => update({ centrifugeTimeMin: v })} theme={theme} integer />
        </View>
      )}
      <NumRow label="Processed volume (mL)" value={d.processedVolumeMl || undefined} onChange={(v) => update({ processedVolumeMl: v ?? 0 })} theme={theme} />
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Fat type</ThemedText>
        <View style={styles.chipRow}>
          {FAT_TYPES.map((f) => {
            const sel = d.fatType === f.value;
            return <Pressable key={f.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); update({ fatType: f.value }); }} style={chipStyle(sel)}><ThemedText style={chipTextStyle(sel)}>{f.label}</ThemedText></Pressable>;
          })}
        </View>
      </View>

      {/* INJECTION */}
      <ThemedText style={[styles.sectionTitle, { color: theme.text, marginTop: Spacing.md }]}>Injection</ThemedText>
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Recipient sites</ThemedText>
        <View style={styles.chipRow}>
          {RECIPIENT_SITE_OPTIONS.map((s) => {
            const sel = selectedSiteNames.has(s);
            return <Pressable key={s} onPress={() => handleAddRecipientSite(s)} style={chipStyle(sel)}><ThemedText style={chipTextStyle(sel)}>{s}</ThemedText></Pressable>;
          })}
        </View>
        {d.recipientSites.map((rs) => (
          <View key={rs.site} style={[styles.siteVolRow, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={[{ color: theme.text, fontSize: 13, flex: 1 }]}>{rs.site}</ThemedText>
            <TextInput
              style={[styles.volInput, { backgroundColor: theme.backgroundElevated, color: theme.text, borderColor: theme.border }]}
              keyboardType="decimal-pad"
              value={rs.volumeInjectedMl ? String(rs.volumeInjectedMl) : ""}
              onChangeText={(t) => { const n = parseFloat(t); handleSiteVolumeChange(rs.site, isNaN(n) ? 0 : n); }}
              placeholder="mL"
              placeholderTextColor={theme.textTertiary}
            />
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Cannula gauge</ThemedText>
        <View style={styles.chipRow}>
          {INJECTION_CANNULAS.map((g) => {
            const sel = d.injectionCannulaGauge === g;
            return <Pressable key={g} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); update({ injectionCannulaGauge: sel ? undefined : g }); }} style={chipStyle(sel)}><ThemedText style={chipTextStyle(sel)}>{g}</ThemedText></Pressable>;
          })}
        </View>
      </View>
      <View style={styles.section}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Technique</ThemedText>
        <View style={styles.chipRow}>
          {INJECTION_TECHNIQUES.map((t) => {
            const sel = d.injectionTechnique === t.value;
            return <Pressable key={t.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); update({ injectionTechnique: sel ? undefined : t.value }); }} style={chipStyle(sel)}><ThemedText style={chipTextStyle(sel)}>{t.label}</ThemedText></Pressable>;
          })}
        </View>
      </View>
    </View>
  );
});

function NumRow({ label, value, onChange, theme, integer }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  theme: { text: string; textSecondary: string; backgroundSecondary: string; border: string; textTertiary: string };
  integer?: boolean;
}) {
  return (
    <View style={styles.numRow}>
      <ThemedText style={[styles.numLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <TextInput
        style={[styles.numInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
        keyboardType={integer ? "number-pad" : "decimal-pad"}
        value={value != null ? String(value) : ""}
        onChangeText={(t) => { if (!t) { onChange(undefined); return; } const n = integer ? parseInt(t, 10) : parseFloat(t); if (!isNaN(n)) onChange(n); }}
        placeholder="—"
        placeholderTextColor={theme.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  section: { gap: Spacing.xs },
  sectionTitle: { fontSize: 14, fontWeight: "600", borderTopWidth: 1, borderTopColor: "rgba(128,128,128,0.15)", paddingTop: Spacing.sm },
  label: { fontSize: 12, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  chip: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, minHeight: 36, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "500" },
  row: { flexDirection: "row", gap: Spacing.sm },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { fontSize: 14, fontWeight: "500" },
  numRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  numLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  numInput: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, height: 36, minWidth: 80, textAlign: "right", fontSize: 14 },
  siteVolRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  volInput: { borderWidth: 1, borderRadius: BorderRadius.xs, paddingHorizontal: Spacing.sm, height: 32, width: 70, textAlign: "right", fontSize: 13 },
});
