import React, { useCallback, useMemo } from "react";
import {
  View,
  Pressable,
  Switch,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { ProductPicker } from "./ProductPicker";
import type {
  FillerDetails,
  FillerInjectionSite,
  FillerSiteId,
  FillerTechnique,
  InjectionDepth,
  AestheticProduct,
} from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface FillerDetailsCardProps {
  details?: FillerDetails;
  onChange: (details: FillerDetails) => void;
}

const VOLUME_OPTIONS = [0.5, 0.55, 0.8, 1.0, 1.2, 1.5] as const;

const NEEDLE_GAUGES = ["27G", "29G", "30G", "31G", "32G", "33G"];
const CANNULA_GAUGES = ["22G×50mm", "25G×38mm", "25G×50mm", "27G×40mm"];

const SITE_GROUPS: {
  label: string;
  sites: { id: FillerSiteId; label: string }[];
}[] = [
  {
    label: "Periorbital",
    sites: [
      { id: "temples", label: "Temples" },
      { id: "brow", label: "Brow" },
      { id: "tear_trough", label: "Tear trough" },
    ],
  },
  {
    label: "Midface",
    sites: [
      { id: "malar", label: "Malar" },
      { id: "submalar", label: "Submalar" },
      { id: "nasolabial_folds", label: "NLF" },
      { id: "nose_dorsum", label: "Nose dorsum" },
      { id: "nose_tip", label: "Nose tip" },
      { id: "nose_radix", label: "Nose radix" },
    ],
  },
  {
    label: "Lips",
    sites: [
      { id: "lips_vermilion", label: "Vermilion" },
      { id: "lips_body", label: "Lip body" },
      { id: "lips_cupids_bow", label: "Cupid's bow" },
      { id: "lips_philtrum", label: "Philtrum" },
      { id: "perioral", label: "Perioral" },
      { id: "oral_commissures", label: "Oral commissures" },
    ],
  },
  {
    label: "Lower face",
    sites: [
      { id: "glabella", label: "Glabella" },
      { id: "marionette_lines", label: "Marionettes" },
      { id: "chin", label: "Chin" },
      { id: "prejowl_sulcus", label: "Pre-jowl" },
      { id: "jawline_angle", label: "Jaw angle" },
      { id: "jawline_body", label: "Jawline" },
    ],
  },
  {
    label: "Other",
    sites: [
      { id: "earlobes", label: "Earlobes" },
      { id: "hands", label: "Hands" },
      { id: "decolletage", label: "Décolletage" },
      { id: "neck", label: "Neck" },
      { id: "acne_scars", label: "Acne scars" },
      { id: "other", label: "Other" },
    ],
  },
];

const TECHNIQUE_OPTIONS: { value: FillerTechnique; label: string }[] = [
  { value: "linear_threading", label: "Linear threading" },
  { value: "serial_puncture", label: "Serial puncture" },
  { value: "bolus_depot", label: "Bolus" },
  { value: "fanning", label: "Fanning" },
  { value: "cross_hatching", label: "Cross-hatch" },
  { value: "retrograde_threading", label: "Retrograde" },
  { value: "microdroplet", label: "Microdroplet" },
  { value: "sandwich", label: "Sandwich" },
];

const DEPTH_OPTIONS: { value: InjectionDepth; label: string }[] = [
  { value: "intradermal", label: "Intradermal" },
  { value: "mid_dermal", label: "Mid-dermal" },
  { value: "deep_dermal", label: "Deep dermal" },
  { value: "subcutaneous", label: "Subcutaneous" },
  { value: "supraperiosteal", label: "Supraperiosteal" },
  { value: "submucosal", label: "Submucosal" },
];

const SIDE_OPTIONS = [
  { value: "left" as const, label: "L" },
  { value: "right" as const, label: "R" },
  { value: "bilateral" as const, label: "Bilat" },
  { value: "midline" as const, label: "Mid" },
];

const DEFAULT_DETAILS: FillerDetails = {
  productId: "",
  syringesUsed: 1,
  volumePerSyringeMl: 1.0,
  totalVolumeMl: 1.0,
  injectionTool: "needle",
  sites: [],
};

export const FillerDetailsCard = React.memo(function FillerDetailsCard({
  details,
  onChange,
}: FillerDetailsCardProps) {
  const { theme } = useTheme();
  const d = details ?? DEFAULT_DETAILS;

  const selectedSiteIds = useMemo(
    () => new Set(d.sites.map((s) => s.site)),
    [d.sites],
  );

  const update = useCallback(
    (partial: Partial<FillerDetails>) => {
      const next = { ...d, ...partial };
      // Auto-calculate total volume
      if ("syringesUsed" in partial || "volumePerSyringeMl" in partial) {
        next.totalVolumeMl =
          (partial.syringesUsed ?? d.syringesUsed) *
          (partial.volumePerSyringeMl ?? d.volumePerSyringeMl);
      }
      onChange(next);
    },
    [d, onChange],
  );

  const handleProductSelect = useCallback(
    (product: AestheticProduct) => {
      update({ productId: product.id || "" });
    },
    [update],
  );

  const handleSyringeChange = useCallback(
    (delta: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = Math.max(1, Math.min(10, d.syringesUsed + delta));
      update({ syringesUsed: next });
    },
    [d.syringesUsed, update],
  );

  const handleSiteToggle = useCallback(
    (siteId: FillerSiteId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (selectedSiteIds.has(siteId)) {
        update({ sites: d.sites.filter((s) => s.site !== siteId) });
      } else {
        update({
          sites: [...d.sites, { site: siteId, side: "bilateral" }],
        });
      }
    },
    [d.sites, selectedSiteIds, update],
  );

  const handleSiteFieldChange = useCallback(
    (
      siteId: FillerSiteId,
      field: keyof FillerInjectionSite,
      value: unknown,
    ) => {
      update({
        sites: d.sites.map((s) =>
          s.site === siteId ? { ...s, [field]: value } : s,
        ),
      });
    },
    [d.sites, update],
  );

  const chipStyle = useCallback(
    (selected: boolean) => [
      styles.chip,
      {
        backgroundColor: selected ? theme.link : theme.backgroundElevated,
        borderColor: selected ? theme.link : theme.border,
      },
    ],
    [theme],
  );

  const chipTextStyle = useCallback(
    (selected: boolean) => [
      styles.chipText,
      { color: selected ? theme.buttonText : theme.text },
    ],
    [theme],
  );

  const gaugeOptions =
    d.injectionTool === "cannula" ? CANNULA_GAUGES : NEEDLE_GAUGES;

  return (
    <View style={styles.container}>
      {/* Product picker */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Product
        </ThemedText>
        <ProductPicker
          category="ha_filler"
          selectedProductId={d.productId || undefined}
          onSelect={handleProductSelect}
        />
      </View>

      {/* Syringes */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Syringes
        </ThemedText>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => handleSyringeChange(-1)}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <Feather name="minus" size={16} color={theme.text} />
          </Pressable>
          <View
            style={[
              styles.stepperDisplay,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={[styles.stepperValue, { color: theme.text }]}>
              {d.syringesUsed}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => handleSyringeChange(1)}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <Feather name="plus" size={16} color={theme.text} />
          </Pressable>
        </View>
      </View>

      {/* Volume per syringe */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Volume per syringe (mL)
        </ThemedText>
        <View style={styles.chipRow}>
          {VOLUME_OPTIONS.map((ml) => {
            const selected = d.volumePerSyringeMl === ml;
            return (
              <Pressable
                key={ml}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ volumePerSyringeMl: ml });
                }}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>{ml}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Total volume badge */}
      <View
        style={[
          styles.totalBadge,
          { backgroundColor: theme.link + "1A", borderColor: theme.link },
        ]}
      >
        <ThemedText style={[styles.totalLabel, { color: theme.link }]}>
          Total volume
        </ThemedText>
        <ThemedText style={[styles.totalValue, { color: theme.link }]}>
          {d.totalVolumeMl.toFixed(1)} mL
        </ThemedText>
      </View>

      {/* Injection tool */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Injection tool
        </ThemedText>
        <View style={styles.segmentedRow}>
          {(["needle", "cannula"] as const).map((tool) => {
            const selected = d.injectionTool === tool;
            return (
              <Pressable
                key={tool}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ injectionTool: tool, toolGauge: undefined });
                }}
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor: selected
                      ? theme.link
                      : theme.backgroundElevated,
                    borderColor: selected ? theme.link : theme.border,
                    flex: 1,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: selected ? theme.buttonText : theme.text },
                  ]}
                >
                  {tool === "needle" ? "Needle" : "Cannula"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Gauge */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Gauge
        </ThemedText>
        <View style={styles.chipRow}>
          {gaugeOptions.map((g) => {
            const selected = d.toolGauge === g;
            return (
              <Pressable
                key={g}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ toolGauge: selected ? undefined : g });
                }}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>{g}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Injection sites (grouped) */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Injection sites
        </ThemedText>
        {SITE_GROUPS.map((group) => (
          <View key={group.label} style={styles.siteGroup}>
            <ThemedText
              style={[styles.siteGroupLabel, { color: theme.textTertiary }]}
            >
              {group.label}
            </ThemedText>
            <View style={styles.chipRow}>
              {group.sites.map(({ id, label }) => {
                const selected = selectedSiteIds.has(id);
                return (
                  <Pressable
                    key={id}
                    onPress={() => handleSiteToggle(id)}
                    style={chipStyle(selected)}
                  >
                    <ThemedText style={chipTextStyle(selected)}>
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* Per-site details */}
        {d.sites.map((site) => {
          const label =
            SITE_GROUPS.flatMap((g) => g.sites).find((s) => s.id === site.site)
              ?.label ?? site.site;
          return (
            <View
              key={site.site}
              style={[
                styles.siteDetail,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={styles.siteDetailHeader}>
                <ThemedText
                  style={[styles.siteDetailLabel, { color: theme.text }]}
                >
                  {label}
                </ThemedText>
                <Pressable
                  onPress={() => handleSiteToggle(site.site)}
                  hitSlop={8}
                >
                  <Feather name="x" size={14} color={theme.textSecondary} />
                </Pressable>
              </View>
              {/* Side */}
              <View style={styles.miniChipRow}>
                {SIDE_OPTIONS.map((opt) => {
                  const sel = site.side === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleSiteFieldChange(site.site, "side", opt.value);
                      }}
                      style={[
                        styles.miniChip,
                        {
                          backgroundColor: sel
                            ? theme.link
                            : theme.backgroundElevated,
                          borderColor: sel ? theme.link : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          fontSize: 11,
                          fontWeight: "500",
                          color: sel ? theme.buttonText : theme.text,
                        }}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Technique */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Technique
        </ThemedText>
        <View style={styles.chipRow}>
          {TECHNIQUE_OPTIONS.map((t) => {
            const selected = d.sites.some((s) => s.technique === t.value);
            return (
              <Pressable
                key={t.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Apply technique to all selected sites
                  const currentTech = d.sites[0]?.technique;
                  const newTech = currentTech === t.value ? undefined : t.value;
                  update({
                    sites: d.sites.map((s) => ({ ...s, technique: newTech })),
                  });
                }}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>
                  {t.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Depth */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Injection depth
        </ThemedText>
        <View style={styles.chipRow}>
          {DEPTH_OPTIONS.map((dep) => {
            const selected = d.sites.some((s) => s.depth === dep.value);
            return (
              <Pressable
                key={dep.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const currentDepth = d.sites[0]?.depth;
                  const newDepth =
                    currentDepth === dep.value ? undefined : dep.value;
                  update({
                    sites: d.sites.map((s) => ({ ...s, depth: newDepth })),
                  });
                }}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>
                  {dep.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Hyaluronidase */}
      <View style={styles.switchRow}>
        <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
          Hyaluronidase available
        </ThemedText>
        <Switch
          value={d.hyaluronidaseAvailable ?? false}
          onValueChange={(val) => update({ hyaluronidaseAvailable: val })}
          trackColor={{ true: theme.link }}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  segmentedRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  segmentedBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stepperBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperDisplay: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 60,
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: "700",
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
  totalLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  siteGroup: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  siteGroupLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  siteDetail: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  siteDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  siteDetailLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  miniChipRow: {
    flexDirection: "row",
    gap: 4,
  },
  miniChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
