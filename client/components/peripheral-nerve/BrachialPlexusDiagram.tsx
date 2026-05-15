/**
 * BrachialPlexusDiagram — Interactive SVG schematic of the brachial plexus.
 *
 * Horizontal left-to-right layout: Roots → Trunks → Cords → Terminal Branches
 * (Divisions omitted from visual — too granular for clinical logging.)
 *
 * Each element is tappable: tap to cycle injury status
 * (unknown → intact → stretch → rupture → avulsion → unknown).
 * Colour-coded by injury state. Pressable overlays handle touch.
 */

import React, { useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet, ScrollView } from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors, palette } from "@/constants/theme";
import type {
  BPRoot,
  BPTrunk,
  BPCord,
  BPTerminalBranch,
  BPLevelInjury,
  BPInjuryType,
} from "@/types/peripheralNerve";
import { BP_INJURY_TYPE_LABELS } from "@/types/peripheralNerve";
import {
  BP_TRUNK_LABELS,
  BP_CORD_LABELS,
  BP_TERMINAL_LABELS,
  TRUNK_ROOT_MAP,
  CORD_TRUNK_MAP,
  TERMINAL_CORD_MAP,
} from "@/lib/peripheralNerveConfig";

// ── Props ────────────────────────────────────────────────────────────────────

interface BrachialPlexusDiagramProps {
  roots: Partial<Record<BPRoot, BPLevelInjury>>;
  trunks?: Partial<Record<BPTrunk, BPLevelInjury>>;
  cords?: Partial<Record<BPCord, BPLevelInjury>>;
  terminalBranches?: Partial<Record<BPTerminalBranch, BPLevelInjury>>;
  onRootPress: (root: BPRoot) => void;
  onTrunkPress?: (trunk: BPTrunk) => void;
  onCordPress?: (cord: BPCord) => void;
  onTerminalBranchPress?: (branch: BPTerminalBranch) => void;
  editable?: boolean;
}

// ── Layout constants ─────────────────────────────────────────────────────────

const SVG_W = 360;
const SVG_H = 220;

// Column x-centres
const COL_ROOT = 40;
const COL_TRUNK = 130;
const COL_CORD = 230;
const COL_TERM = 320;

// Node sizes
const NODE_W = 52;
const NODE_H = 26;
const NODE_R = 6;

// Root y positions (5 roots, evenly spaced)
const ROOT_Y: Record<BPRoot, number> = {
  C5: 30,
  C6: 66,
  C7: 102,
  C8: 138,
  T1: 174,
};

// Trunk y positions (3 trunks)
const TRUNK_Y: Record<BPTrunk, number> = {
  upper: 48,
  middle: 102,
  lower: 156,
};

// Cord y positions (3 cords)
const CORD_Y: Record<BPCord, number> = {
  lateral: 48,
  posterior: 102,
  medial: 156,
};

// Terminal branch y positions (5 branches)
const TERM_Y: Record<BPTerminalBranch, number> = {
  musculocutaneous: 30,
  axillary: 66,
  radial: 102,
  median: 138,
  ulnar: 174,
};

// ── Colour mapping ───────────────────────────────────────────────────────────
// Severity ladder maps to existing semantic tokens where possible.
// "rupture" gets its own theme.nerveSeverity.rupture token because it sits
// between warning and error on the severity ladder.

type DiagramTheme = typeof Colors.light;

function getInjuryFill(
  type: BPInjuryType | undefined,
  theme: DiagramTheme,
): string {
  switch (type) {
    case "intact":
      return theme.success;
    case "stretch":
      return theme.warning;
    case "rupture":
      return theme.nerveSeverity.rupture;
    case "avulsion":
      return theme.error;
    case "unknown":
    default:
      return theme.backgroundTertiary;
  }
}

function getInjuryTextColor(
  type: BPInjuryType | undefined,
  theme: DiagramTheme,
): string {
  switch (type) {
    case "intact":
    case "rupture":
    case "avulsion":
      return palette.white;
    case "stretch":
      return theme.buttonText; // dark on amber in dark mode, white in light
    case "unknown":
    default:
      return theme.textSecondary;
  }
}

/**
 * Derive an element's injury type from its constituent sub-elements.
 * Picks the most severe injury type among the sources.
 */
function deriveInjuryType(
  sources: (BPInjuryType | undefined)[],
): BPInjuryType | undefined {
  const severity: Record<BPInjuryType, number> = {
    intact: 0,
    unknown: 1,
    stretch: 2,
    rupture: 3,
    avulsion: 4,
  };
  let worst: BPInjuryType | undefined;
  let worstScore = -1;
  for (const s of sources) {
    if (s && (severity[s] ?? 0) > worstScore) {
      worst = s;
      worstScore = severity[s] ?? 0;
    }
  }
  return worst;
}

// ── Root order constant ──────────────────────────────────────────────────────

const ROOT_ORDER: readonly BPRoot[] = ["C5", "C6", "C7", "C8", "T1"];
const TRUNK_ORDER: readonly BPTrunk[] = ["upper", "middle", "lower"];
const CORD_ORDER: readonly BPCord[] = ["lateral", "posterior", "medial"];
const TERM_ORDER: readonly BPTerminalBranch[] = [
  "musculocutaneous",
  "axillary",
  "radial",
  "median",
  "ulnar",
];

// ── Component ────────────────────────────────────────────────────────────────

export const BrachialPlexusDiagram = React.memo(function BrachialPlexusDiagram({
  roots,
  trunks: trunkOverrides,
  cords: cordOverrides,
  terminalBranches: termOverrides,
  onRootPress,
  onTrunkPress,
  onCordPress,
  onTerminalBranchPress,
  editable = true,
}: BrachialPlexusDiagramProps) {
  const { theme, isDark } = useTheme();

  // Derived injury types for trunks/cords/terminals (auto-derive from roots if no overrides)
  const trunkInjuries = useMemo<Partial<Record<BPTrunk, BPInjuryType>>>(() => {
    const result: Partial<Record<BPTrunk, BPInjuryType>> = {};
    for (const trunk of TRUNK_ORDER) {
      if (trunkOverrides?.[trunk]) {
        result[trunk] = trunkOverrides[trunk]!.injuryType;
      } else {
        const sourceRoots = TRUNK_ROOT_MAP[trunk];
        result[trunk] = deriveInjuryType(
          sourceRoots.map((r) => roots[r]?.injuryType),
        );
      }
    }
    return result;
  }, [roots, trunkOverrides]);

  const cordInjuries = useMemo<Partial<Record<BPCord, BPInjuryType>>>(() => {
    const result: Partial<Record<BPCord, BPInjuryType>> = {};
    for (const cord of CORD_ORDER) {
      if (cordOverrides?.[cord]) {
        result[cord] = cordOverrides[cord]!.injuryType;
      } else {
        const sourceTrunks = CORD_TRUNK_MAP[cord];
        result[cord] = deriveInjuryType(
          sourceTrunks.map((t) => trunkInjuries[t]),
        );
      }
    }
    return result;
  }, [trunkInjuries, cordOverrides]);

  const termInjuries = useMemo<
    Partial<Record<BPTerminalBranch, BPInjuryType>>
  >(() => {
    const result: Partial<Record<BPTerminalBranch, BPInjuryType>> = {};
    for (const term of TERM_ORDER) {
      if (termOverrides?.[term]) {
        result[term] = termOverrides[term]!.injuryType;
      } else {
        const sourceCords = TERMINAL_CORD_MAP[term];
        result[term] = deriveInjuryType(
          sourceCords.map((c) => cordInjuries[c]),
        );
      }
    }
    return result;
  }, [cordInjuries, termOverrides]);

  // Handlers with haptics
  const handleRootPress = useCallback(
    (root: BPRoot) => {
      if (!editable) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onRootPress(root);
    },
    [editable, onRootPress],
  );

  const handleTrunkPress = useCallback(
    (trunk: BPTrunk) => {
      if (!editable || !onTrunkPress) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTrunkPress(trunk);
    },
    [editable, onTrunkPress],
  );

  const handleCordPress = useCallback(
    (cord: BPCord) => {
      if (!editable || !onCordPress) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onCordPress(cord);
    },
    [editable, onCordPress],
  );

  const handleTermPress = useCallback(
    (branch: BPTerminalBranch) => {
      if (!editable || !onTerminalBranchPress) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTerminalBranchPress(branch);
    },
    [editable, onTerminalBranchPress],
  );

  const lineColor = isDark ? palette.charcoal[750] : palette.charcoal[300];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot, borderColor: theme.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.diagramWrap}>
          {/* Column headers */}
          <View style={styles.headerRow}>
            <ThemedText
              style={[
                styles.colHeader,
                { color: theme.textSecondary, left: COL_ROOT - 16 },
              ]}
            >
              Roots
            </ThemedText>
            <ThemedText
              style={[
                styles.colHeader,
                { color: theme.textSecondary, left: COL_TRUNK - 18 },
              ]}
            >
              Trunks
            </ThemedText>
            <ThemedText
              style={[
                styles.colHeader,
                { color: theme.textSecondary, left: COL_CORD - 14 },
              ]}
            >
              Cords
            </ThemedText>
            <ThemedText
              style={[
                styles.colHeader,
                { color: theme.textSecondary, left: COL_TERM - 24 },
              ]}
            >
              Branches
            </ThemedText>
          </View>

          {/* SVG layer — nodes + connecting lines */}
          <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
            {/* ── Connecting lines ── */}
            {/* Root → Trunk */}
            {TRUNK_ORDER.map((trunk) =>
              TRUNK_ROOT_MAP[trunk].map((root) => (
                <Line
                  key={`r2t-${root}-${trunk}`}
                  x1={COL_ROOT + NODE_W / 2}
                  y1={ROOT_Y[root] + NODE_H / 2}
                  x2={COL_TRUNK - NODE_W / 2}
                  y2={TRUNK_Y[trunk] + NODE_H / 2}
                  stroke={lineColor}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              )),
            )}
            {/* Trunk → Cord */}
            {CORD_ORDER.map((cord) =>
              CORD_TRUNK_MAP[cord].map((trunk) => (
                <Line
                  key={`t2c-${trunk}-${cord}`}
                  x1={COL_TRUNK + NODE_W / 2}
                  y1={TRUNK_Y[trunk] + NODE_H / 2}
                  x2={COL_CORD - NODE_W / 2}
                  y2={CORD_Y[cord] + NODE_H / 2}
                  stroke={lineColor}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              )),
            )}
            {/* Cord → Terminal branch */}
            {TERM_ORDER.map((term) =>
              TERMINAL_CORD_MAP[term].map((cord) => (
                <Line
                  key={`c2t-${cord}-${term}`}
                  x1={COL_CORD + NODE_W / 2}
                  y1={CORD_Y[cord] + NODE_H / 2}
                  x2={COL_TERM - NODE_W / 2}
                  y2={TERM_Y[term] + NODE_H / 2}
                  stroke={lineColor}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              )),
            )}

            {/* ── Root nodes ── */}
            {ROOT_ORDER.map((root) => {
              const injury = roots[root]?.injuryType;
              return (
                <G key={`root-${root}`}>
                  <Rect
                    x={COL_ROOT - NODE_W / 2}
                    y={ROOT_Y[root]}
                    width={NODE_W}
                    height={NODE_H}
                    rx={NODE_R}
                    fill={getInjuryFill(injury, theme)}
                    strokeWidth={1.5}
                    stroke={
                      isDark ? palette.charcoal[750] : palette.charcoal[300]
                    }
                  />
                  <SvgText
                    x={COL_ROOT}
                    y={ROOT_Y[root] + NODE_H / 2 + 4.5}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="700"
                    fill={getInjuryTextColor(injury, theme)}
                  >
                    {root}
                  </SvgText>
                </G>
              );
            })}

            {/* ── Trunk nodes ── */}
            {TRUNK_ORDER.map((trunk) => {
              const injury = trunkInjuries[trunk];
              return (
                <G key={`trunk-${trunk}`}>
                  <Rect
                    x={COL_TRUNK - NODE_W / 2}
                    y={TRUNK_Y[trunk]}
                    width={NODE_W}
                    height={NODE_H}
                    rx={NODE_R}
                    fill={getInjuryFill(injury, theme)}
                    strokeWidth={1.5}
                    stroke={
                      isDark ? palette.charcoal[750] : palette.charcoal[300]
                    }
                  />
                  <SvgText
                    x={COL_TRUNK}
                    y={TRUNK_Y[trunk] + NODE_H / 2 + 4.5}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="600"
                    fill={getInjuryTextColor(injury, theme)}
                  >
                    {BP_TRUNK_LABELS[trunk]}
                  </SvgText>
                </G>
              );
            })}

            {/* ── Cord nodes ── */}
            {CORD_ORDER.map((cord) => {
              const injury = cordInjuries[cord];
              return (
                <G key={`cord-${cord}`}>
                  <Rect
                    x={COL_CORD - NODE_W / 2}
                    y={CORD_Y[cord]}
                    width={NODE_W}
                    height={NODE_H}
                    rx={NODE_R}
                    fill={getInjuryFill(injury, theme)}
                    strokeWidth={1.5}
                    stroke={
                      isDark ? palette.charcoal[750] : palette.charcoal[300]
                    }
                  />
                  <SvgText
                    x={COL_CORD}
                    y={CORD_Y[cord] + NODE_H / 2 + 4.5}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="600"
                    fill={getInjuryTextColor(injury, theme)}
                  >
                    {BP_CORD_LABELS[cord]}
                  </SvgText>
                </G>
              );
            })}

            {/* ── Terminal branch nodes ── */}
            {TERM_ORDER.map((term) => {
              const injury = termInjuries[term];
              return (
                <G key={`term-${term}`}>
                  <Rect
                    x={COL_TERM - NODE_W / 2}
                    y={TERM_Y[term]}
                    width={NODE_W}
                    height={NODE_H}
                    rx={NODE_R}
                    fill={getInjuryFill(injury, theme)}
                    strokeWidth={1.5}
                    stroke={
                      isDark ? palette.charcoal[750] : palette.charcoal[300]
                    }
                  />
                  <SvgText
                    x={COL_TERM}
                    y={TERM_Y[term] + NODE_H / 2 + 4.5}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="600"
                    fill={getInjuryTextColor(injury, theme)}
                  >
                    {BP_TERMINAL_LABELS[term]}
                  </SvgText>
                </G>
              );
            })}
          </Svg>

          {/* Pressable overlay layer — positioned above the SVG */}
          {editable && (
            <View style={styles.overlayLayer} pointerEvents="box-none">
              {/* Root press targets */}
              {ROOT_ORDER.map((root) => (
                <Pressable
                  key={`press-root-${root}`}
                  style={[
                    styles.pressTarget,
                    {
                      left: COL_ROOT - NODE_W / 2 - 4,
                      top: ROOT_Y[root] - 4 + 18, // +18 for header row
                      width: NODE_W + 8,
                      height: NODE_H + 8,
                    },
                  ]}
                  onPress={() => handleRootPress(root)}
                  accessibilityRole="button"
                  accessibilityLabel={`${root} root — ${roots[root]?.injuryType ?? "unknown"}. Tap to change.`}
                />
              ))}
              {/* Trunk press targets */}
              {onTrunkPress &&
                TRUNK_ORDER.map((trunk) => (
                  <Pressable
                    key={`press-trunk-${trunk}`}
                    style={[
                      styles.pressTarget,
                      {
                        left: COL_TRUNK - NODE_W / 2 - 4,
                        top: TRUNK_Y[trunk] - 4 + 18,
                        width: NODE_W + 8,
                        height: NODE_H + 8,
                      },
                    ]}
                    onPress={() => handleTrunkPress(trunk)}
                    accessibilityRole="button"
                    accessibilityLabel={`${BP_TRUNK_LABELS[trunk]} trunk — ${trunkInjuries[trunk] ?? "unknown"}. Tap to change.`}
                  />
                ))}
              {/* Cord press targets */}
              {onCordPress &&
                CORD_ORDER.map((cord) => (
                  <Pressable
                    key={`press-cord-${cord}`}
                    style={[
                      styles.pressTarget,
                      {
                        left: COL_CORD - NODE_W / 2 - 4,
                        top: CORD_Y[cord] - 4 + 18,
                        width: NODE_W + 8,
                        height: NODE_H + 8,
                      },
                    ]}
                    onPress={() => handleCordPress(cord)}
                    accessibilityRole="button"
                    accessibilityLabel={`${BP_CORD_LABELS[cord]} cord — ${cordInjuries[cord] ?? "unknown"}. Tap to change.`}
                  />
                ))}
              {/* Terminal branch press targets */}
              {onTerminalBranchPress &&
                TERM_ORDER.map((term) => (
                  <Pressable
                    key={`press-term-${term}`}
                    style={[
                      styles.pressTarget,
                      {
                        left: COL_TERM - NODE_W / 2 - 4,
                        top: TERM_Y[term] - 4 + 18,
                        width: NODE_W + 8,
                        height: NODE_H + 8,
                      },
                    ]}
                    onPress={() => handleTermPress(term)}
                    accessibilityRole="button"
                    accessibilityLabel={`${BP_TERMINAL_LABELS[term]} — ${termInjuries[term] ?? "unknown"}. Tap to change.`}
                  />
                ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        {(
          [
            "intact",
            "stretch",
            "rupture",
            "avulsion",
            "unknown",
          ] as BPInjuryType[]
        ).map((type) => (
          <View key={type} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: getInjuryFill(type, theme) },
              ]}
            />
            <ThemedText
              style={[styles.legendText, { color: theme.textTertiary }]}
            >
              {BP_INJURY_TYPE_LABELS[type]}
            </ThemedText>
          </View>
        ))}
      </View>

      {editable && (
        <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
          Tap any root to cycle injury status
        </ThemedText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
    alignItems: "center",
  },
  scrollContent: {
    alignItems: "center",
  },
  diagramWrap: {
    position: "relative",
    width: SVG_W,
    height: SVG_H + 18, // +18 for header row
  },
  headerRow: {
    height: 18,
    position: "relative",
  },
  colHeader: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overlayLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pressTarget: {
    position: "absolute",
    borderRadius: NODE_R,
  },
  legend: {
    flexDirection: "row",
    gap: Spacing.sm,
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
  hint: {
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
  },
});
