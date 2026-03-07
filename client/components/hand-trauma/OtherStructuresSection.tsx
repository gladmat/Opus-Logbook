import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { HandTraumaStructure, DigitId } from "@/types/case";

interface OtherStructuresSectionProps {
  checkedStructures: HandTraumaStructure[];
  selectedDigits: DigitId[];
  onToggleStructure: (
    structureId: string,
    category: "other",
    displayName: string,
    digit?: DigitId,
  ) => void;
}

export function OtherStructuresSection({
  checkedStructures,
  selectedDigits,
  onToggleStructure,
}: OtherStructuresSectionProps) {
  const { theme } = useTheme();

  const nailBedStructures = checkedStructures.filter(
    (s) => s.structureId === "nail_bed" && s.category === "other",
  );
  const hasAnyNailBed = nailBedStructures.length > 0;

  const isDigitChecked = (digit: DigitId) =>
    nailBedStructures.some((s) => s.digit === digit);

  const handleToggleNailBed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (hasAnyNailBed) {
      // Remove all nail bed entries (toggle off)
      for (const s of nailBedStructures) {
        onToggleStructure("nail_bed", "other", "Nail bed injury", s.digit);
      }
    } else if (selectedDigits.length === 0) {
      // No digits selected — add generic nail bed
      onToggleStructure("nail_bed", "other", "Nail bed injury");
    } else if (selectedDigits.length === 1) {
      // Single digit — add nail bed for that digit
      onToggleStructure(
        "nail_bed",
        "other",
        `Nail bed injury (${selectedDigits[0]})`,
        selectedDigits[0],
      );
    } else {
      // Multiple digits — add nail bed for first digit, user picks rest
      onToggleStructure(
        "nail_bed",
        "other",
        `Nail bed injury (${selectedDigits[0]})`,
        selectedDigits[0],
      );
    }
  };

  const handleToggleDigit = (digit: DigitId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleStructure(
      "nail_bed",
      "other",
      `Nail bed injury (${digit})`,
      digit,
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        testID="other-nail_bed"
        style={[styles.checkRow, { borderColor: theme.border }]}
        onPress={handleToggleNailBed}
      >
        <Feather
          name={hasAnyNailBed ? "check-square" : "square"}
          size={20}
          color={hasAnyNailBed ? theme.link : theme.textTertiary}
        />
        <ThemedText
          type="small"
          style={[styles.checkLabel, { color: theme.text }]}
        >
          Nail bed
        </ThemedText>
      </Pressable>

      {/* Digit sub-picker — shown when nail bed is active and multiple digits available */}
      {hasAnyNailBed && selectedDigits.length > 1 ? (
        <View style={styles.digitRow}>
          <ThemedText style={[styles.hint, { color: theme.textTertiary }]}>
            Affected digits
          </ThemedText>
          <View style={styles.pillRow}>
            {selectedDigits.map((digit) => {
              const checked = isDigitChecked(digit);
              return (
                <Pressable
                  key={digit}
                  testID={`nail-bed-digit-${digit}`}
                  style={[
                    styles.digitPill,
                    {
                      backgroundColor: checked
                        ? theme.link + "15"
                        : theme.backgroundTertiary,
                      borderColor: checked ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => handleToggleDigit(digit)}
                >
                  <ThemedText
                    style={[
                      styles.digitPillText,
                      { color: checked ? theme.link : theme.text },
                    ]}
                  >
                    {digit}
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
    gap: Spacing.sm,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  checkLabel: {
    flex: 1,
  },
  digitRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  hint: {
    fontSize: 13,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  digitPill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 44,
    alignItems: "center",
  },
  digitPillText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
