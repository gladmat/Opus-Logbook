/**
 * LiposuctionCard — Case-level liposuction data capture.
 *
 * Rendered in BreastAssessment (not per-side) when showLipofilling flag is true.
 * - Technique (5 chips), Wetting technique (4 chips)
 * - Tumescent volume (conditional on superwet/tumescent)
 * - Repeatable areas: site + volume aspirate
 * - Total aspirate (auto-sum from areas, editable override)
 */

import React, { useCallback, useMemo } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { BreastChipRow, BreastNumericField } from "./BreastCardHelpers";
import { SectionWrapper } from "@/components/skin-cancer/SectionWrapper";
import type {
  LiposuctionData,
  LiposuctionArea,
  LiposuctionTechnique,
  WettingTechnique,
  LipofillingHarvestSite,
} from "@/types/breast";
import {
  LIPOSUCTION_TECHNIQUE_LABELS,
  WETTING_TECHNIQUE_LABELS,
  HARVEST_SITE_LABELS,
} from "@/types/breast";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TECHNIQUES: readonly LiposuctionTechnique[] = [
  "sal",
  "pal",
  "vaser",
  "lal",
  "wal",
] as const;

const WETTING: readonly WettingTechnique[] = [
  "dry",
  "wet",
  "superwet",
  "tumescent",
] as const;

const SITES: readonly LipofillingHarvestSite[] = [
  "abdomen",
  "flanks",
  "inner_thigh",
  "outer_thigh",
  "buttocks",
  "arms",
  "back",
  "other",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  value: LiposuctionData;
  onChange: (data: LiposuctionData) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const LiposuctionCard = React.memo(function LiposuctionCard({
  value,
  onChange,
}: Props) {
  const { theme } = useTheme();

  const update = useCallback(
    (patch: Partial<LiposuctionData>) => {
      onChange({ ...value, ...patch });
    },
    [onChange, value],
  );

  const needsTumescent =
    value.wettingTechnique === "superwet" ||
    value.wettingTechnique === "tumescent";

  // Auto-sum area volumes
  const autoTotal = useMemo(
    () =>
      (value.areas ?? []).reduce(
        (sum, a) => sum + (a.volumeAspirateMl ?? 0),
        0,
      ),
    [value.areas],
  );

  const addArea = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    update({
      areas: [...(value.areas ?? []), { site: "abdomen" as const }],
    });
  }, [update, value.areas]);

  const updateArea = useCallback(
    (idx: number, patch: Partial<LiposuctionArea>) => {
      const areas = [...(value.areas ?? [])];
      areas[idx] = { ...areas[idx]!, ...patch };
      update({ areas });
    },
    [update, value.areas],
  );

  const removeArea = useCallback(
    (idx: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const areas = [...(value.areas ?? [])];
      areas.splice(idx, 1);
      update({ areas });
    },
    [update, value.areas],
  );

  const summaryParts: string[] = [];
  const areaCount = value.areas?.length ?? 0;
  if (areaCount > 0)
    summaryParts.push(`${areaCount} area${areaCount > 1 ? "s" : ""}`);
  if (value.totalAspirateMl) summaryParts.push(`${value.totalAspirateMl}ml`);
  else if (autoTotal > 0) summaryParts.push(`${autoTotal}ml`);
  const summary = summaryParts.join(", ") || "Tap to configure";

  return (
    <SectionWrapper
      title="Liposuction"
      icon="wind"
      collapsible
      defaultCollapsed
      subtitle={summary}
    >
      <BreastChipRow
        label="Technique"
        options={TECHNIQUES}
        labels={LIPOSUCTION_TECHNIQUE_LABELS}
        selected={value.technique}
        onSelect={(v) => update({ technique: v })}
        allowDeselect
      />

      <BreastChipRow
        label="Wetting Technique"
        options={WETTING}
        labels={WETTING_TECHNIQUE_LABELS}
        selected={value.wettingTechnique}
        onSelect={(v) => {
          const patch: Partial<LiposuctionData> = { wettingTechnique: v };
          if (v !== "superwet" && v !== "tumescent") {
            patch.tumescentVolumeMl = undefined;
          }
          update(patch);
        }}
        allowDeselect
      />

      {needsTumescent && (
        <BreastNumericField
          label="Tumescent Volume"
          value={value.tumescentVolumeMl}
          onValueChange={(v) => update({ tumescentVolumeMl: v })}
          unit="ml"
          integer
        />
      )}

      {/* ── Areas ─────────────────────────────────────────────────────────── */}

      <ThemedText
        type="small"
        style={{
          color: theme.textSecondary,
          fontWeight: "600",
          marginTop: Spacing.sm,
        }}
      >
        Areas
      </ThemedText>

      {(value.areas ?? []).map((area, idx) => (
        <View
          key={idx}
          style={[
            styles.areaCard,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundRoot,
            },
          ]}
        >
          <View style={styles.areaHeader}>
            <ThemedText
              type="small"
              style={{ color: theme.text, fontWeight: "600" }}
            >
              Area {idx + 1}
            </ThemedText>
            <Pressable onPress={() => removeArea(idx)}>
              <Feather name="x" size={16} color={theme.textTertiary} />
            </Pressable>
          </View>

          <BreastChipRow
            label="Site"
            options={SITES}
            labels={HARVEST_SITE_LABELS}
            selected={area.site}
            onSelect={(v) => updateArea(idx, { site: v! })}
          />

          <BreastNumericField
            label="Volume Aspirate"
            value={area.volumeAspirateMl}
            onValueChange={(v) => updateArea(idx, { volumeAspirateMl: v })}
            unit="ml"
            integer
          />
        </View>
      ))}

      <Pressable onPress={addArea} style={styles.addButton}>
        <Feather name="plus" size={14} color={theme.link} />
        <ThemedText type="small" style={{ color: theme.link, marginLeft: 4 }}>
          Add Area
        </ThemedText>
      </Pressable>

      {/* ── Total Aspirate ────────────────────────────────────────────────── */}

      <BreastNumericField
        label="Total Aspirate"
        value={value.totalAspirateMl ?? (autoTotal > 0 ? autoTotal : undefined)}
        onValueChange={(v) => update({ totalAspirateMl: v })}
        unit="ml"
        placeholder={autoTotal > 0 ? `${autoTotal} (auto)` : undefined}
        integer
      />
    </SectionWrapper>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  areaCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  areaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
});
