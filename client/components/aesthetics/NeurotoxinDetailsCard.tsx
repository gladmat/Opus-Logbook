import React, { useCallback, useMemo } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  LayoutAnimation,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { ProductPicker } from "./ProductPicker";
import type {
  NeurotoxinDetails,
  NeurotoxinInjectionSite,
  NeurotoxinSiteId,
  NeedleGauge,
  AestheticProduct,
} from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface NeurotoxinDetailsCardProps {
  details?: NeurotoxinDetails;
  onChange: (details: NeurotoxinDetails) => void;
}

const DILUTION_OPTIONS = [1.0, 1.25, 2.0, 2.5, 4.0] as const;
const NEEDLE_GAUGE_OPTIONS: NeedleGauge[] = ["27G", "30G", "32G", "33G"];

const SITE_LABELS: Record<NeurotoxinSiteId, string> = {
  glabella: "Glabella",
  frontalis: "Frontalis",
  lateral_canthal: "Crow's feet",
  bunny_lines: "Bunny lines",
  perioral: "Perioral",
  lip_flip: "Lip flip",
  mentalis: "Mentalis",
  masseter: "Masseter",
  platysmal_bands: "Platysma",
  gummy_smile: "Gummy smile",
  nefertiti: "Nefertiti",
  brow_lift: "Brow lift",
  axillary_hyperhidrosis: "Axillary (HH)",
  palmar_hyperhidrosis: "Palmar (HH)",
  other: "Other",
};

const ALL_SITE_IDS = Object.keys(SITE_LABELS) as NeurotoxinSiteId[];

const SIDE_OPTIONS = [
  { value: "left" as const, label: "L" },
  { value: "right" as const, label: "R" },
  { value: "bilateral" as const, label: "Bilateral" },
  { value: "midline" as const, label: "Midline" },
];

const DEFAULT_DETAILS: NeurotoxinDetails = {
  productId: "",
  totalUnits: 0,
  sites: [],
};

export const NeurotoxinDetailsCard = React.memo(function NeurotoxinDetailsCard({
  details,
  onChange,
}: NeurotoxinDetailsCardProps) {
  const { theme } = useTheme();
  const d = details ?? DEFAULT_DETAILS;

  const selectedSiteIds = useMemo(
    () => new Set(d.sites.map((s) => s.site)),
    [d.sites],
  );

  const update = useCallback(
    (partial: Partial<NeurotoxinDetails>) => {
      onChange({ ...d, ...partial });
    },
    [d, onChange],
  );

  const handleProductSelect = useCallback(
    (product: AestheticProduct) => {
      update({ productId: product.id || "" });
    },
    [update],
  );

  const handleUnitsChange = useCallback(
    (delta: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = Math.max(0, Math.min(500, d.totalUnits + delta));
      update({ totalUnits: next });
    },
    [d.totalUnits, update],
  );

  const handleSiteToggle = useCallback(
    (siteId: NeurotoxinSiteId) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (selectedSiteIds.has(siteId)) {
        update({ sites: d.sites.filter((s) => s.site !== siteId) });
      } else {
        update({
          sites: [
            ...d.sites,
            { site: siteId, unitsPerSite: 0, side: "bilateral" },
          ],
        });
      }
    },
    [d.sites, selectedSiteIds, update],
  );

  const handleSiteFieldChange = useCallback(
    (
      siteId: NeurotoxinSiteId,
      field: keyof NeurotoxinInjectionSite,
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
          category="neurotoxin"
          selectedProductId={d.productId || undefined}
          onSelect={handleProductSelect}
        />
      </View>

      {/* Total units with stepper */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Total units
        </ThemedText>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => handleUnitsChange(-10)}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <ThemedText style={{ color: theme.text }}>−10</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleUnitsChange(-5)}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <ThemedText style={{ color: theme.text }}>−5</ThemedText>
          </Pressable>
          <View
            style={[
              styles.unitsDisplay,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={[styles.unitsValue, { color: theme.text }]}>
              {d.totalUnits}
            </ThemedText>
            <ThemedText
              style={[styles.unitsSuffix, { color: theme.textTertiary }]}
            >
              units
            </ThemedText>
          </View>
          <Pressable
            onPress={() => handleUnitsChange(5)}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <ThemedText style={{ color: theme.text }}>+5</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => handleUnitsChange(10)}
            style={[styles.stepperBtn, { borderColor: theme.border }]}
          >
            <ThemedText style={{ color: theme.text }}>+10</ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Dilution */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Dilution (mL)
        </ThemedText>
        <View style={styles.chipRow}>
          {DILUTION_OPTIONS.map((ml) => {
            const selected = d.dilutionMl === ml;
            return (
              <Pressable
                key={ml}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ dilutionMl: selected ? undefined : ml });
                }}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>{ml}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Needle gauge */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Needle gauge
        </ThemedText>
        <View style={styles.chipRow}>
          {NEEDLE_GAUGE_OPTIONS.map((g) => {
            const selected = d.needleGauge === g;
            return (
              <Pressable
                key={g}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({ needleGauge: selected ? undefined : g });
                }}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>{g}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Injection sites */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Injection sites
        </ThemedText>
        <View style={styles.chipRow}>
          {ALL_SITE_IDS.map((siteId) => {
            const selected = selectedSiteIds.has(siteId);
            return (
              <Pressable
                key={siteId}
                onPress={() => handleSiteToggle(siteId)}
                style={chipStyle(selected)}
              >
                <ThemedText style={chipTextStyle(selected)}>
                  {SITE_LABELS[siteId]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Per-site details */}
        {d.sites.map((site) => (
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
                {SITE_LABELS[site.site]}
              </ThemedText>
              <Pressable
                onPress={() => handleSiteToggle(site.site)}
                hitSlop={8}
              >
                <Feather name="x" size={14} color={theme.textSecondary} />
              </Pressable>
            </View>
            {/* Units per site */}
            <View style={styles.siteFieldRow}>
              <ThemedText
                style={[styles.siteFieldLabel, { color: theme.textSecondary }]}
              >
                Units
              </ThemedText>
              <View style={styles.miniStepperRow}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleSiteFieldChange(
                      site.site,
                      "unitsPerSite",
                      Math.max(0, site.unitsPerSite - 5),
                    );
                  }}
                  style={[styles.miniStepperBtn, { borderColor: theme.border }]}
                >
                  <ThemedText style={{ color: theme.text, fontSize: 12 }}>
                    −5
                  </ThemedText>
                </Pressable>
                <ThemedText
                  style={[styles.miniStepperValue, { color: theme.text }]}
                >
                  {site.unitsPerSite}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleSiteFieldChange(
                      site.site,
                      "unitsPerSite",
                      site.unitsPerSite + 5,
                    );
                  }}
                  style={[styles.miniStepperBtn, { borderColor: theme.border }]}
                >
                  <ThemedText style={{ color: theme.text, fontSize: 12 }}>
                    +5
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            {/* Side selector */}
            <View style={styles.siteFieldRow}>
              <ThemedText
                style={[styles.siteFieldLabel, { color: theme.textSecondary }]}
              >
                Side
              </ThemedText>
              <View style={styles.miniChipRow}>
                {SIDE_OPTIONS.map((opt) => {
                  const selected = site.side === opt.value;
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
                          backgroundColor: selected
                            ? theme.link
                            : theme.backgroundElevated,
                          borderColor: selected ? theme.link : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          fontSize: 11,
                          fontWeight: "500",
                          color: selected ? theme.buttonText : theme.text,
                        }}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Lot number */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          Lot number (optional)
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.backgroundSecondary,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Enter lot number"
          placeholderTextColor={theme.textTertiary}
          value={d.lotNumber ?? ""}
          onChangeText={(text) => update({ lotNumber: text || undefined })}
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
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stepperBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 36,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  unitsDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 36,
    flex: 1,
    justifyContent: "center",
  },
  unitsValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  unitsSuffix: {
    fontSize: 12,
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
  siteFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  siteFieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    minWidth: 40,
  },
  miniStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  miniStepperBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    minWidth: 36,
    alignItems: "center",
  },
  miniStepperValue: {
    fontSize: 15,
    fontWeight: "600",
    minWidth: 28,
    textAlign: "center",
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
  textInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
});
