/**
 * Soft tissue / special injuries section for the unified Hand Trauma Assessment.
 *
 * Covers:
 * - Special injury flags: HPI, fight bite, compartment syndrome, ring avulsion
 * - Amputation level picker with replantability toggle
 *
 * These map directly to HandTraumaDetails flags + amputation fields.
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DigitId } from "@/types/case";

type AmputationLevel =
  | "fingertip"
  | "distal_phalanx"
  | "middle_phalanx"
  | "proximal_phalanx"
  | "mcp"
  | "ray"
  | "hand_wrist";

export interface SoftTissueState {
  isHighPressureInjection: boolean;
  isFightBite: boolean;
  isCompartmentSyndrome: boolean;
  isRingAvulsion: boolean;
  amputationLevel?: AmputationLevel;
  isReplantable?: boolean;
}

interface SoftTissueSectionProps {
  value: SoftTissueState;
  onChange: (value: SoftTissueState) => void;
  selectedDigits: DigitId[];
}

const SPECIAL_INJURIES: {
  key: keyof Pick<
    SoftTissueState,
    | "isHighPressureInjection"
    | "isFightBite"
    | "isCompartmentSyndrome"
    | "isRingAvulsion"
  >;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    key: "isHighPressureInjection",
    label: "High-pressure injection",
    description: "Paint gun, grease gun, hydraulic",
    icon: "alert-triangle",
  },
  {
    key: "isFightBite",
    label: "Fight bite",
    description: "Human bite to MCP joint",
    icon: "alert-circle",
  },
  {
    key: "isCompartmentSyndrome",
    label: "Compartment syndrome",
    description: "Hand / forearm compartment pressure",
    icon: "activity",
  },
  {
    key: "isRingAvulsion",
    label: "Ring avulsion",
    description: "Ring-related degloving / avulsion",
    icon: "circle",
  },
];

const AMPUTATION_LEVELS: { key: AmputationLevel; label: string }[] = [
  { key: "fingertip", label: "Fingertip" },
  { key: "distal_phalanx", label: "Distal phalanx" },
  { key: "middle_phalanx", label: "Middle phalanx" },
  { key: "proximal_phalanx", label: "Proximal phalanx" },
  { key: "mcp", label: "MCP level" },
  { key: "ray", label: "Ray amputation" },
  { key: "hand_wrist", label: "Hand / wrist" },
];

export function SoftTissueSection({
  value,
  onChange,
  selectedDigits,
}: SoftTissueSectionProps) {
  const { theme } = useTheme();

  const toggleSpecialInjury = (
    key: keyof Pick<
      SoftTissueState,
      | "isHighPressureInjection"
      | "isFightBite"
      | "isCompartmentSyndrome"
      | "isRingAvulsion"
    >,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange({ ...value, [key]: !value[key] });
  };

  const setAmputationLevel = (level: AmputationLevel | undefined) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (level === value.amputationLevel) {
      // Deselect
      onChange({
        ...value,
        amputationLevel: undefined,
        isReplantable: undefined,
      });
    } else {
      onChange({ ...value, amputationLevel: level });
    }
  };

  return (
    <View style={styles.container}>
      {/* Special Injuries */}
      <View style={styles.subSection}>
        <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
          Special Injuries
        </ThemedText>
        <View style={styles.specialGrid}>
          {SPECIAL_INJURIES.map(({ key, label, description, icon }) => {
            const isActive = value[key];
            return (
              <Pressable
                key={key}
                style={[
                  styles.specialCard,
                  {
                    backgroundColor: isActive
                      ? theme.link + "15"
                      : theme.backgroundTertiary,
                    borderColor: isActive ? theme.link : theme.border,
                  },
                ]}
                onPress={() => toggleSpecialInjury(key)}
              >
                <View style={styles.specialCardTop}>
                  <Feather
                    name={icon as any}
                    size={18}
                    color={isActive ? theme.link : theme.textSecondary}
                  />
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isActive ? theme.link : theme.textTertiary,
                        backgroundColor: isActive ? theme.link : "transparent",
                      },
                    ]}
                  >
                    {isActive ? (
                      <Feather
                        name="check"
                        size={12}
                        color={theme.buttonText}
                      />
                    ) : null}
                  </View>
                </View>
                <ThemedText
                  style={[
                    styles.specialLabel,
                    { color: isActive ? theme.text : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </ThemedText>
                <ThemedText
                  style={[styles.specialDesc, { color: theme.textTertiary }]}
                  numberOfLines={2}
                >
                  {description}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Amputation Level */}
      <View style={styles.subSection}>
        <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
          Amputation Level
        </ThemedText>
        <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
          Select if amputation present — leave empty for soft tissue only
        </ThemedText>
        <View style={styles.pillRow}>
          {AMPUTATION_LEVELS.map(({ key, label }) => {
            const isSelected = value.amputationLevel === key;
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
                onPress={() => setAmputationLevel(key)}
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

      {/* Replantability toggle (only when amputation level is selected) */}
      {value.amputationLevel ? (
        <View style={styles.subSection}>
          <ThemedText style={[styles.subSectionTitle, { color: theme.text }]}>
            Replantability
          </ThemedText>
          <View style={styles.pillRow}>
            {[
              { key: true, label: "Replantable" },
              { key: false, label: "Non-replantable" },
            ].map(({ key, label }) => {
              const isSelected = value.isReplantable === key;
              return (
                <Pressable
                  key={String(key)}
                  style={[
                    styles.replantPill,
                    {
                      backgroundColor: isSelected
                        ? key
                          ? theme.success + "20"
                          : theme.error + "20"
                        : theme.backgroundTertiary,
                      borderColor: isSelected
                        ? key
                          ? theme.success
                          : theme.error
                        : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onChange({ ...value, isReplantable: key });
                  }}
                >
                  <Feather
                    name={key ? "check-circle" : "x-circle"}
                    size={16}
                    color={
                      isSelected
                        ? key
                          ? theme.success
                          : theme.error
                        : theme.textSecondary
                    }
                  />
                  <ThemedText
                    style={[
                      styles.pillText,
                      {
                        color: isSelected
                          ? key
                            ? theme.success
                            : theme.error
                          : theme.text,
                      },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  subSection: {
    gap: Spacing.sm,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
  },
  specialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  specialCard: {
    width: "48%",
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  specialCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  specialLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  specialDesc: {
    fontSize: 11,
    lineHeight: 15,
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
  replantPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 40,
    gap: 6,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
