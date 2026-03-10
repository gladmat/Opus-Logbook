/**
 * Dislocation assessment section for the unified Hand Trauma Assessment.
 * Joint pills → Direction pills → Fracture-association toggle.
 *
 * Supports multiple dislocation entries (multi-joint injuries).
 * Each entry resolves to a DislocationEntry for handTraumaMapping.
 */

import React, { useState, useCallback } from "react";
import { View, Pressable, StyleSheet, LayoutAnimation } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DislocationEntry, DigitId } from "@/types/case";

type JointType = DislocationEntry["joint"];
type DirectionType = NonNullable<DislocationEntry["direction"]>;

interface JointOption {
  key: JointType;
  label: string;
  /** Which directions are anatomically valid for this joint */
  directions: DirectionType[] | "simple_complex";
}

const JOINT_OPTIONS: JointOption[] = [
  { key: "pip", label: "PIP", directions: ["dorsal", "volar", "lateral"] },
  { key: "mcp", label: "MCP", directions: "simple_complex" },
  { key: "cmc", label: "CMC", directions: ["dorsal", "volar"] },
  { key: "thumb_cmc", label: "Thumb CMC", directions: ["dorsal"] },
  { key: "druj", label: "DRUJ", directions: ["dorsal", "volar"] },
  { key: "perilunate", label: "Perilunate", directions: [] },
  { key: "lunate", label: "Lunate", directions: [] },
];

const DIRECTION_LABELS: Record<DirectionType, string> = {
  dorsal: "Dorsal",
  volar: "Volar",
  lateral: "Lateral",
};

interface DislocationSectionProps {
  dislocations: DislocationEntry[];
  onDislocationsChange: (dislocations: DislocationEntry[]) => void;
  selectedDigits: DigitId[];
  onAssociatedFractureEnabled?: () => void;
}

export function DislocationSection({
  dislocations,
  onDislocationsChange,
  selectedDigits,
  onAssociatedFractureEnabled,
}: DislocationSectionProps) {
  const { theme } = useTheme();

  // Builder state for adding a new dislocation
  const [selectedJoint, setSelectedJoint] = useState<JointType | null>(null);
  const [selectedDirection, setSelectedDirection] =
    useState<DirectionType | null>(null);
  const [hasFracture, setHasFracture] = useState(false);
  const [isComplex, setIsComplex] = useState(false);
  const [selectedDigit, setSelectedDigit] = useState<DigitId | null>(null);

  const resetBuilder = () => {
    setSelectedJoint(null);
    setSelectedDirection(null);
    setHasFracture(false);
    setIsComplex(false);
    setSelectedDigit(null);
  };

  const jointConfig = JOINT_OPTIONS.find((j) => j.key === selectedJoint);

  // MCP uses simple/complex instead of direction
  const isMCPStyle = jointConfig?.directions === "simple_complex";
  const hasDirections =
    jointConfig &&
    jointConfig.directions !== "simple_complex" &&
    jointConfig.directions.length > 0;
  const noSubSelection =
    jointConfig &&
    jointConfig.directions !== "simple_complex" &&
    jointConfig.directions.length === 0;
  const requiresDigit =
    selectedJoint === "pip" ||
    selectedJoint === "mcp" ||
    selectedJoint === "cmc" ||
    selectedJoint === "thumb_cmc";
  const digitOptions =
    selectedJoint === "thumb_cmc"
      ? (["I"] as DigitId[])
      : selectedJoint === "cmc"
        ? selectedDigits.filter((digit) => digit !== "I")
        : selectedDigits;

  // Can add when joint is selected and either: no direction needed, direction picked, or MCP
  const canAdd =
    selectedJoint !== null &&
    (noSubSelection || selectedDirection !== null || isMCPStyle) &&
    (!requiresDigit || selectedDigit !== null);

  const handleAddDislocation = useCallback(() => {
    if (!selectedJoint) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const entry: DislocationEntry = {
      joint: selectedJoint,
      digit: requiresDigit ? (selectedDigit ?? undefined) : undefined,
      direction: selectedDirection ?? undefined,
      hasFracture: hasFracture || undefined,
      isComplex: isMCPStyle ? isComplex || undefined : undefined,
    };

    onDislocationsChange([...dislocations, entry]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    resetBuilder();
  }, [
    selectedJoint,
    selectedDirection,
    hasFracture,
    isComplex,
    selectedDigit,
    requiresDigit,
    isMCPStyle,
    dislocations,
    onDislocationsChange,
  ]);

  const removeDislocation = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDislocationsChange(dislocations.filter((_, i) => i !== index));
  };

  const getDislocationLabel = (d: DislocationEntry): string => {
    const joint = JOINT_OPTIONS.find((j) => j.key === d.joint);
    let label = joint?.label || d.joint.toUpperCase();
    if (d.direction) label += ` ${DIRECTION_LABELS[d.direction]}`;
    if (d.isComplex) label += " (Complex)";
    if (d.hasFracture) label += " + Fx";
    if (d.digit) label += `, Dig. ${d.digit}`;
    return label;
  };

  return (
    <View style={styles.container}>
      {/* Existing dislocation entries */}
      {dislocations.length > 0 ? (
        <View style={styles.existingEntries}>
          {dislocations.map((d, i) => (
            <View
              key={`${d.joint}-${i}`}
              style={[
                styles.entryChip,
                {
                  backgroundColor: theme.link + "15",
                  borderColor: theme.link + "30",
                },
              ]}
            >
              <Feather
                name="shuffle"
                size={14}
                color={theme.link}
                style={{ marginRight: Spacing.sm }}
              />
              <ThemedText
                style={[styles.entryLabel, { color: theme.text }]}
                numberOfLines={1}
              >
                {getDislocationLabel(d)}
              </ThemedText>
              <Pressable
                onPress={() => removeDislocation(i)}
                hitSlop={8}
                style={styles.removeButton}
              >
                <Feather name="x" size={16} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* Joint picker */}
      <View style={styles.subSection}>
        <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
          Joint
        </ThemedText>
        <View style={styles.pillRow}>
          {JOINT_OPTIONS.map(({ key, label }) => {
            const isSelected = selectedJoint === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setSelectedJoint(key);
                  setSelectedDirection(null);
                  setHasFracture(false);
                  setIsComplex(false);
                  setSelectedDigit(
                    key === "thumb_cmc"
                      ? "I"
                      : key === "cmc"
                        ? (selectedDigits.find((digit) => digit !== "I") ??
                          null)
                        : (selectedDigits[0] ?? null),
                  );
                }}
              >
                <ThemedText
                  style={[
                    styles.pillText,
                    { color: isSelected ? theme.buttonText : theme.text },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Direction picker (for joints with directions) */}
      {hasDirections ? (
        <View style={styles.subSection}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Direction
          </ThemedText>
          <View style={styles.pillRow}>
            {(jointConfig.directions as DirectionType[]).map((dir) => {
              const isSelected = selectedDirection === dir;
              return (
                <Pressable
                  key={dir}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected
                        ? theme.link
                        : theme.backgroundTertiary,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDirection(dir);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.pillText,
                      { color: isSelected ? theme.buttonText : theme.text },
                    ]}
                  >
                    {DIRECTION_LABELS[dir]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {requiresDigit ? (
        <View style={styles.subSection}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Digit
          </ThemedText>
          <View style={styles.pillRow}>
            {digitOptions.map((digit) => {
              const isSelected = selectedDigit === digit;
              return (
                <Pressable
                  key={digit}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected
                        ? theme.link
                        : theme.backgroundTertiary,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDigit(digit);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.pillText,
                      { color: isSelected ? theme.buttonText : theme.text },
                    ]}
                  >
                    Dig. {digit}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* MCP: Simple vs Complex */}
      {isMCPStyle ? (
        <View style={styles.subSection}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Type
          </ThemedText>
          <View style={styles.pillRow}>
            {[
              { key: false, label: "Simple" },
              { key: true, label: "Complex (Kaplan)" },
            ].map(({ key, label }) => {
              const isSelected = isComplex === key;
              return (
                <Pressable
                  key={String(key)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected
                        ? theme.link
                        : theme.backgroundTertiary,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsComplex(key);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.pillText,
                      { color: isSelected ? theme.buttonText : theme.text },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Fracture-dislocation toggle */}
      {selectedJoint !== null ? (
        <Pressable
          style={[
            styles.toggleRow,
            {
              backgroundColor: hasFracture
                ? theme.link + "15"
                : theme.backgroundTertiary,
              borderColor: hasFracture ? theme.link + "30" : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const next = !hasFracture;
            setHasFracture(next);
            if (next) {
              onAssociatedFractureEnabled?.();
            }
          }}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: hasFracture ? theme.link : theme.textTertiary,
                backgroundColor: hasFracture ? theme.link : "transparent",
              },
            ]}
          >
            {hasFracture ? (
              <Feather name="check" size={12} color={theme.buttonText} />
            ) : null}
          </View>
          <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>
            Associated fracture
          </ThemedText>
          <ThemedText
            style={[styles.toggleHint, { color: theme.textTertiary }]}
          >
            Fracture-dislocation
          </ThemedText>
        </Pressable>
      ) : null}

      {/* Add dislocation button */}
      {canAdd ? (
        <Pressable
          style={[styles.addButton, { backgroundColor: theme.link }]}
          onPress={handleAddDislocation}
        >
          <Feather name="plus" size={18} color={theme.buttonText} />
          <ThemedText
            style={[styles.addButtonText, { color: theme.buttonText }]}
          >
            Add Dislocation
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  existingEntries: {
    gap: Spacing.sm,
  },
  entryChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  entryLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  removeButton: {
    padding: Spacing.xs,
  },
  subSection: {
    gap: Spacing.sm,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  toggleHint: {
    fontSize: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
