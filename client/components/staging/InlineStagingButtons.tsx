/**
 * InlineStagingButtons
 * ════════════════════
 * Horizontal wrapping chip selector for staging systems with ≤5 options.
 * Replaces the PickerField dropdown for compact staging fields like
 * CTS Severity (3), EMG Grade (5), Quinnell (5), Baker (4).
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface InlineStagingButtonsProps {
  label: string;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
  selectedValue: string | undefined;
  onSelect: (value: string) => void;
}

export const InlineStagingButtons = React.memo(function InlineStagingButtons({
  label,
  options,
  selectedValue,
  onSelect,
}: InlineStagingButtonsProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const isSelected = selectedValue === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(isSelected ? "" : opt.value);
              }}
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
                {opt.label}
              </ThemedText>
              {opt.description ? (
                <ThemedText
                  style={[
                    styles.chipDescription,
                    {
                      color: isSelected
                        ? theme.buttonText + "B3"
                        : theme.textTertiary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {opt.description}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
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
  chipDescription: {
    fontSize: 11,
    marginTop: 1,
  },
});
