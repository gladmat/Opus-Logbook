/**
 * LAHSHALInput
 * ════════════
 * 6-position structured input for cleft classification per CRANE registry.
 *
 * Positions: L(rightLip) A(rightAlveolus) H(hardPalate) S(softPalate) A(leftAlveolus) L(leftLip)
 * Each position cycles: none → incomplete → complete → none on tap.
 *
 * Visual: complete = amber fill, incomplete = amber outline, none = grey.
 * Renders computed LAHSHAL notation badge below.
 */

import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  LAHSHALClassification,
  CleftCompleteness,
} from "@/types/craniofacial";

interface LAHSHALInputProps {
  value: LAHSHALClassification | undefined;
  onChange: (classification: LAHSHALClassification) => void;
}

type PositionKey = keyof LAHSHALClassification;

const POSITIONS: {
  key: PositionKey;
  letter: string;
  sublabel: string;
}[] = [
  { key: "rightLip", letter: "L", sublabel: "Rt lip" },
  { key: "rightAlveolus", letter: "A", sublabel: "Rt alv" },
  { key: "hardPalate", letter: "H", sublabel: "Hard" },
  { key: "softPalate", letter: "S", sublabel: "Soft" },
  { key: "leftAlveolus", letter: "A", sublabel: "Lt alv" },
  { key: "leftLip", letter: "L", sublabel: "Lt lip" },
];

const DEFAULT_LAHSHAL: LAHSHALClassification = {
  rightLip: "none",
  rightAlveolus: "none",
  hardPalate: "none",
  softPalate: "none",
  leftAlveolus: "none",
  leftLip: "none",
};

function cycleCompleteness(current: CleftCompleteness): CleftCompleteness {
  switch (current) {
    case "none":
      return "incomplete";
    case "incomplete":
      return "complete";
    case "complete":
      return "none";
  }
}

function toNotationChar(c: CleftCompleteness, letter: string): string {
  switch (c) {
    case "complete":
      return letter.toUpperCase();
    case "incomplete":
      return letter.toLowerCase();
    case "none":
      return ".";
  }
}

function computeNotation(v: LAHSHALClassification): string {
  return [
    toNotationChar(v.rightLip, "L"),
    toNotationChar(v.rightAlveolus, "A"),
    toNotationChar(v.hardPalate, "H"),
    toNotationChar(v.softPalate, "S"),
    toNotationChar(v.leftAlveolus, "A"),
    toNotationChar(v.leftLip, "L"),
  ].join("");
}

function PositionCell({
  posKey,
  letter,
  sublabel,
  completeness,
  onCycle,
}: {
  posKey: PositionKey;
  letter: string;
  sublabel: string;
  completeness: CleftCompleteness;
  onCycle: (key: PositionKey) => void;
}) {
  const { theme } = useTheme();

  const bgColor =
    completeness === "complete"
      ? theme.link
      : completeness === "incomplete"
        ? "transparent"
        : theme.backgroundTertiary;

  const borderColor =
    completeness === "complete"
      ? theme.link
      : completeness === "incomplete"
        ? theme.link
        : theme.border;

  const textColor =
    completeness === "complete"
      ? theme.buttonText
      : completeness === "incomplete"
        ? theme.link
        : theme.textTertiary;

  return (
    <View style={styles.positionCol}>
      <ThemedText style={[styles.sublabel, { color: theme.textTertiary }]}>
        {sublabel}
      </ThemedText>
      <Pressable
        onPress={() => onCycle(posKey)}
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        style={[
          styles.cell,
          {
            backgroundColor: bgColor,
            borderColor,
          },
        ]}
      >
        <ThemedText style={[styles.cellLetter, { color: textColor }]}>
          {letter}
        </ThemedText>
        <ThemedText style={[styles.cellState, { color: textColor }]}>
          {completeness === "complete"
            ? "C"
            : completeness === "incomplete"
              ? "I"
              : "—"}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const MemoPositionCell = React.memo(PositionCell);

export function LAHSHALInput({ value, onChange }: LAHSHALInputProps) {
  const { theme } = useTheme();
  const current = value ?? DEFAULT_LAHSHAL;

  const handleCycle = useCallback(
    (key: PositionKey) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = { ...current, [key]: cycleCompleteness(current[key]) };
      onChange(next);
    },
    [current, onChange],
  );

  const notation = computeNotation(current);
  const hasAny = Object.values(current).some((v) => v !== "none");

  return (
    <View style={styles.container}>
      {/* Midline divider labels */}
      <View style={styles.sideLabels}>
        <ThemedText style={[styles.sideLabel, { color: theme.textTertiary }]}>
          Right side
        </ThemedText>
        <ThemedText style={[styles.sideLabel, { color: theme.textTertiary }]}>
          Left side
        </ThemedText>
      </View>

      {/* 6-column grid */}
      <View style={styles.grid}>
        {POSITIONS.map((pos) => (
          <MemoPositionCell
            key={pos.key}
            posKey={pos.key}
            letter={pos.letter}
            sublabel={pos.sublabel}
            completeness={current[pos.key]}
            onCycle={handleCycle}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: theme.link },
            ]}
          />
          <ThemedText style={[styles.legendText, { color: theme.textTertiary }]}>
            Complete
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: "transparent",
                borderWidth: 2,
                borderColor: theme.link,
              },
            ]}
          />
          <ThemedText style={[styles.legendText, { color: theme.textTertiary }]}>
            Incomplete
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          />
          <ThemedText style={[styles.legendText, { color: theme.textTertiary }]}>
            None
          </ThemedText>
        </View>
      </View>

      {/* Notation badge */}
      {hasAny ? (
        <View
          style={[
            styles.notationBadge,
            { backgroundColor: theme.link + "15" },
          ]}
        >
          <ThemedText
            style={[styles.notationLabel, { color: theme.textSecondary }]}
          >
            LAHSAL:
          </ThemedText>
          <ThemedText style={[styles.notationValue, { color: theme.link }]}>
            {notation}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  sideLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  positionCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  sublabel: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
  cell: {
    width: "100%",
    aspectRatio: 0.85,
    minHeight: 52,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  cellLetter: {
    fontSize: 16,
    fontWeight: "700",
  },
  cellState: {
    fontSize: 10,
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: 2,
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
  notationBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: 2,
  },
  notationLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  notationValue: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: undefined, // falls back to system monospace on platform
    letterSpacing: 2,
  },
});
