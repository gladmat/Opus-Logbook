/**
 * TBSABodyOutline — SVG body outline with colour-coded region highlighting.
 * Purely visual confirmation — NOT an interactive drawing interface.
 * Regions highlight based on depth when TBSA data exists.
 */

import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { TBSAData, TBSARegion, BurnDepth } from "@/types/burns";

interface TBSABodyOutlineProps {
  data: TBSAData;
}

/** Depth → colour mapping */
function getDepthColor(depth?: BurnDepth): string {
  switch (depth) {
    case "superficial":
    case "superficial_partial":
      return "#FFB3BA";
    case "deep_partial":
      return "#FF6B6B";
    case "full_thickness":
    case "subdermal":
      return "#CC0000";
    case "mixed":
      return "#FF8844";
    default:
      return "transparent";
  }
}

/**
 * Simple anterior body outline SVG.
 * Each path corresponds to a TBSA region and is coloured by depth.
 */
export const TBSABodyOutline = React.memo(function TBSABodyOutline({
  data,
}: TBSABodyOutlineProps) {
  const { theme } = useTheme();

  const regionDepthMap = useMemo(() => {
    const map: Partial<Record<TBSARegion, BurnDepth>> = {};
    if (data.regionalBreakdown?.length) {
      for (const entry of data.regionalBreakdown) {
        if (entry.percentage > 0) {
          map[entry.region] = entry.depth;
        }
      }
    } else if (data.regionsAffected?.length && data.predominantDepth) {
      for (const region of data.regionsAffected) {
        map[region] = data.predominantDepth;
      }
    }
    return map;
  }, [data.regionalBreakdown, data.regionsAffected, data.predominantDepth]);

  const hasAnyRegion = Object.keys(regionDepthMap).length > 0;

  if (!hasAnyRegion && (data.totalTBSA ?? 0) === 0) {
    return null;
  }

  const fill = (region: TBSARegion) =>
    getDepthColor(regionDepthMap[region]) || "transparent";
  const stroke = theme.textTertiary;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, borderColor: theme.border }]}>
      {/* TBSA total badge */}
      <View style={styles.totalRow}>
        <ThemedText style={[styles.totalLabel, { color: theme.textSecondary }]}>
          Total TBSA
        </ThemedText>
        <ThemedText style={[styles.totalValue, { color: theme.link }]}>
          {data.totalTBSA ?? 0}%
        </ThemedText>
      </View>

      {/* Simplified anterior body outline */}
      <Svg width={140} height={200} viewBox="0 0 140 200" style={styles.svg}>
        {/* Head & Neck */}
        <Circle
          cx={70}
          cy={20}
          r={14}
          fill={fill("head_neck")}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.8}
        />
        {/* Anterior Trunk */}
        <Path
          d="M50 40 L90 40 L95 100 L45 100 Z"
          fill={fill("anterior_trunk")}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.8}
        />
        {/* Right Upper Limb */}
        <Path
          d="M45 42 L35 42 L25 90 L35 90 L45 60"
          fill={fill("right_upper_limb")}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.8}
        />
        {/* Left Upper Limb */}
        <Path
          d="M95 42 L105 42 L115 90 L105 90 L95 60"
          fill={fill("left_upper_limb")}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.8}
        />
        {/* Perineum */}
        <Path
          d="M58 100 L82 100 L78 110 L62 110 Z"
          fill={fill("perineum")}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.8}
        />
        {/* Right Lower Limb */}
        <Path
          d="M48 110 L62 110 L58 190 L44 190 Z"
          fill={fill("right_lower_limb")}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.8}
        />
        {/* Left Lower Limb */}
        <Path
          d="M78 110 L92 110 L96 190 L82 190 Z"
          fill={fill("left_lower_limb")}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.8}
        />
      </Svg>

      {/* Depth legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FFB3BA" }]} />
          <ThemedText style={[styles.legendText, { color: theme.textTertiary }]}>
            Sup. Partial
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FF6B6B" }]} />
          <ThemedText style={[styles.legendText, { color: theme.textTertiary }]}>
            Deep Partial
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#CC0000" }]} />
          <ThemedText style={[styles.legendText, { color: theme.textTertiary }]}>
            Full Thickness
          </ThemedText>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  svg: {
    marginVertical: Spacing.xs,
  },
  legend: {
    flexDirection: "row",
    gap: Spacing.md,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
  },
});
