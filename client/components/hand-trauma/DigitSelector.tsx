import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DigitId } from "@/types/case";
import { ALL_DIGITS, DIGIT_LABELS } from "./structureConfig";

interface DigitSelectorProps {
  selectedDigits: DigitId[];
  onChange: (digits: DigitId[]) => void;
  label?: string;
}

export function DigitSelector({
  selectedDigits,
  onChange,
  label = "Affected digits",
}: DigitSelectorProps) {
  const { theme } = useTheme();

  const toggleDigit = (digit: DigitId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedDigits.includes(digit)) {
      onChange(selectedDigits.filter((d) => d !== digit));
    } else {
      onChange([...selectedDigits, digit]);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText
        type="small"
        style={[styles.label, { color: theme.textSecondary }]}
      >
        {label}
      </ThemedText>
      <View style={styles.chipRow}>
        {ALL_DIGITS.map((digit) => {
          const isSelected = selectedDigits.includes(digit);
          return (
            <Pressable
              key={digit}
              testID={`caseForm.hand.chip-digit-${digit}`}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.link
                    : theme.backgroundTertiary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
              onPress={() => toggleDigit(digit)}
            >
              <ThemedText
                type="small"
                style={[
                  styles.chipText,
                  { color: isSelected ? "#FFFFFF" : theme.text },
                ]}
              >
                {digit}
              </ThemedText>
              <ThemedText
                type="small"
                style={[
                  styles.chipSubtext,
                  {
                    color: isSelected
                      ? "rgba(255,255,255,0.7)"
                      : theme.textTertiary,
                  },
                ]}
              >
                {DIGIT_LABELS[digit]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  chipText: {
    fontWeight: "700",
    fontSize: 15,
  },
  chipSubtext: {
    fontSize: 10,
    marginTop: 1,
  },
});
