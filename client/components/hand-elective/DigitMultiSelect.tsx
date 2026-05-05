/**
 * DigitMultiSelect — inline multi-select for digits I-V.
 * Used by unified trigger digit (hand_dx_trigger_digit) to select affected digits
 * before creating per-digit procedures.
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { DIGIT_LABELS } from "@/lib/diagnosisPicklists/multiDigitConfig";
import type { DigitId } from "@/types/case";

const DIGITS: DigitId[] = ["I", "II", "III", "IV", "V"];

interface DigitMultiSelectProps {
  selectedDigits: DigitId[];
  onDigitsChange: (digits: DigitId[]) => void;
  onConfirm: () => void;
}

export const DigitMultiSelect = React.memo(function DigitMultiSelect({
  selectedDigits,
  onDigitsChange,
  onConfirm,
}: DigitMultiSelectProps) {
  const { theme } = useTheme();

  const handleToggle = (digit: DigitId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedDigits.includes(digit)) {
      onDigitsChange(selectedDigits.filter((d) => d !== digit));
    } else {
      onDigitsChange([...selectedDigits, digit]);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        AFFECTED DIGIT(S)
      </ThemedText>

      <View style={styles.chipRow}>
        {DIGITS.map((digit) => {
          const isSelected = selectedDigits.includes(digit);
          return (
            <Pressable
              key={digit}
              onPress={() => handleToggle(digit)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.link
                    : theme.backgroundTertiary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipLabel,
                  { color: isSelected ? theme.buttonText : theme.text },
                ]}
              >
                {DIGIT_LABELS[digit]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => {
          if (selectedDigits.length > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onConfirm();
          }
        }}
        disabled={selectedDigits.length === 0}
        style={[
          styles.confirmButton,
          {
            backgroundColor:
              selectedDigits.length > 0 ? theme.link : theme.backgroundTertiary,
            opacity: selectedDigits.length > 0 ? 1 : 0.5,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.confirmText,
            {
              color:
                selectedDigits.length > 0
                  ? theme.buttonText
                  : theme.textTertiary,
            },
          ]}
        >
          {selectedDigits.length > 0
            ? `Confirm (${selectedDigits.length} digit${selectedDigits.length > 1 ? "s" : ""})`
            : "Select at least one digit"}
        </ThemedText>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  confirmButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
