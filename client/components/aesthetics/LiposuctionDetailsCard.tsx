import React, { useCallback, useMemo } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import type { LiposuctionDetails } from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface LiposuctionDetailsCardProps {
  details?: LiposuctionDetails;
  onChange: (details: LiposuctionDetails) => void;
}

const TECHNIQUE_OPTIONS: {
  value: LiposuctionDetails["technique"];
  label: string;
}[] = [
  { value: "sal", label: "SAL" },
  { value: "pal", label: "PAL" },
  { value: "vaser", label: "VASER" },
  { value: "lal", label: "LAL" },
  { value: "rfal", label: "RFAL" },
  { value: "wal", label: "WAL" },
  { value: "hd_vaser", label: "HD-VASER" },
];

const WETTING_OPTIONS: {
  value: LiposuctionDetails["wettingTechnique"];
  label: string;
}[] = [
  { value: "dry", label: "Dry" },
  { value: "wet", label: "Wet" },
  { value: "superwet", label: "Superwet" },
  { value: "tumescent", label: "Tumescent" },
];

const AREA_OPTIONS = [
  "Abdomen",
  "Flanks",
  "Arms",
  "Inner thighs",
  "Outer thighs",
  "Knees",
  "Back",
  "Chin / submental",
  "Chest (gynaecomastia)",
  "Other",
];

const CANNULA_SIZES = ["2", "3", "4", "5", "6"];

const DEFAULT: LiposuctionDetails = {
  technique: "sal",
  role: "primary",
  wettingTechnique: "tumescent",
  areas: [],
};

export const LiposuctionDetailsCard = React.memo(
  function LiposuctionDetailsCard({
    details,
    onChange,
  }: LiposuctionDetailsCardProps) {
    const { theme } = useTheme();
    const d = details ?? DEFAULT;

    const update = useCallback(
      (partial: Partial<LiposuctionDetails>) => onChange({ ...d, ...partial }),
      [d, onChange],
    );

    const selectedAreaNames = useMemo(
      () => new Set(d.areas.map((a) => a.site)),
      [d.areas],
    );
    const autoTotalAspirate = useMemo(
      () => d.areas.reduce((sum, a) => sum + (a.aspirateVolumeMl ?? 0), 0),
      [d.areas],
    );

    const handleAreaToggle = useCallback(
      (areaName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectedAreaNames.has(areaName)) {
          update({ areas: d.areas.filter((a) => a.site !== areaName) });
        } else {
          update({ areas: [...d.areas, { site: areaName }] });
        }
      },
      [d.areas, selectedAreaNames, update],
    );

    const handleAreaVolume = useCallback(
      (site: string, vol: number | undefined) => {
        update({
          areas: d.areas.map((a) =>
            a.site === site ? { ...a, aspirateVolumeMl: vol } : a,
          ),
        });
      },
      [d.areas, update],
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

    return (
      <View style={styles.container}>
        {/* Role */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Role
          </ThemedText>
          <View style={styles.segmentedRow}>
            {(["primary", "adjunct"] as const).map((r) => {
              const sel = d.role === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ role: r });
                  }}
                  style={[
                    styles.segmentedBtn,
                    {
                      flex: 1,
                      backgroundColor: sel
                        ? theme.link
                        : theme.backgroundElevated,
                      borderColor: sel ? theme.link : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: sel ? theme.buttonText : theme.text },
                    ]}
                  >
                    {r === "primary" ? "Primary" : "Adjunct"}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Technique */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Technique
          </ThemedText>
          <View style={styles.chipRow}>
            {TECHNIQUE_OPTIONS.map((t) => {
              const sel = d.technique === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ technique: t.value });
                  }}
                  style={chipStyle(sel)}
                >
                  <ThemedText style={chipTextStyle(sel)}>{t.label}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Wetting technique */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Wetting technique
          </ThemedText>
          <View style={styles.chipRow}>
            {WETTING_OPTIONS.map((w) => {
              const sel = d.wettingTechnique === w.value;
              return (
                <Pressable
                  key={w.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ wettingTechnique: w.value });
                  }}
                  style={chipStyle(sel)}
                >
                  <ThemedText style={chipTextStyle(sel)}>{w.label}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Treatment areas with per-area volume */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Treatment areas
          </ThemedText>
          <View style={styles.chipRow}>
            {AREA_OPTIONS.map((a) => {
              const sel = selectedAreaNames.has(a);
              return (
                <Pressable
                  key={a}
                  onPress={() => handleAreaToggle(a)}
                  style={chipStyle(sel)}
                >
                  <ThemedText style={chipTextStyle(sel)}>{a}</ThemedText>
                </Pressable>
              );
            })}
          </View>
          {d.areas.map((area) => (
            <View
              key={area.site}
              style={[
                styles.areaRow,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                {area.site}
              </ThemedText>
              <TextInput
                style={[
                  styles.volInput,
                  {
                    backgroundColor: theme.backgroundElevated,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                keyboardType="decimal-pad"
                value={
                  area.aspirateVolumeMl != null
                    ? String(area.aspirateVolumeMl)
                    : ""
                }
                onChangeText={(t) => {
                  const n = parseFloat(t);
                  handleAreaVolume(area.site, isNaN(n) ? undefined : n);
                }}
                placeholder="mL"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          ))}
        </View>

        {/* Total aspirate badge */}
        <View
          style={[
            styles.totalBadge,
            { backgroundColor: theme.link + "1A", borderColor: theme.link },
          ]}
        >
          <ThemedText style={[styles.totalLabel, { color: theme.link }]}>
            Total aspirate
          </ThemedText>
          <ThemedText style={[styles.totalValue, { color: theme.link }]}>
            {autoTotalAspirate > 0 ? `${autoTotalAspirate} mL` : "—"}
          </ThemedText>
        </View>

        {/* Total tumescent */}
        <View style={styles.numRow}>
          <ThemedText style={[styles.numLabel, { color: theme.textSecondary }]}>
            Total tumescent (mL)
          </ThemedText>
          <TextInput
            style={[
              styles.numInput,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            keyboardType="decimal-pad"
            value={d.totalTumescentMl != null ? String(d.totalTumescentMl) : ""}
            onChangeText={(t) => {
              const n = parseFloat(t);
              update({ totalTumescentMl: isNaN(n) ? undefined : n });
            }}
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
          />
        </View>

        {/* Cannula size */}
        <View style={styles.section}>
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Cannula size (mm)
          </ThemedText>
          <View style={styles.chipRow}>
            {CANNULA_SIZES.map((s) => {
              const sel = d.cannulaSizeMm === Number(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ cannulaSizeMm: sel ? undefined : Number(s) });
                  }}
                  style={chipStyle(sel)}
                >
                  <ThemedText style={chipTextStyle(sel)}>{s}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  section: { gap: Spacing.xs },
  label: {
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
  segmentedRow: { flexDirection: "row", gap: Spacing.xs },
  segmentedBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  volInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    height: 32,
    width: 70,
    textAlign: "right",
    fontSize: 13,
  },
  totalBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  totalLabel: { fontSize: 13, fontWeight: "500" },
  totalValue: { fontSize: 16, fontWeight: "700" },
  numRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  numLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  numInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    height: 36,
    minWidth: 80,
    textAlign: "right",
    fontSize: 14,
  },
});
