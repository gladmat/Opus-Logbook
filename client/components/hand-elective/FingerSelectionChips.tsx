/**
 * FingerSelectionChips — reusable multi-select chip row for finger selection.
 * Used by trigger finger (multi-select) and trigger thumb (single auto-select).
 */

import React, { useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DiagnosisFingerConfig } from "@/lib/handElectiveFieldConfig";

interface FingerSelectionChipsProps {
  config: DiagnosisFingerConfig;
  selectedFingers: string[];
  onChange: (fingers: string[]) => void;
}

export const FingerSelectionChips = React.memo(function FingerSelectionChips({
  config,
  selectedFingers,
  onChange,
}: FingerSelectionChipsProps) {
  const { theme } = useTheme();

  // Auto-select for single-option configs (e.g., trigger thumb)
  useEffect(() => {
    if (config.fingerOptions.length === 1 && selectedFingers.length === 0) {
      const first = config.fingerOptions[0];
      if (first) onChange([first.id]);
    }
  }, [config.fingerOptions, selectedFingers.length, onChange]);

  const handleToggle = (fingerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (config.multiSelect) {
      if (selectedFingers.includes(fingerId)) {
        onChange(selectedFingers.filter((f) => f !== fingerId));
      } else {
        onChange([...selectedFingers, fingerId]);
      }
    } else {
      onChange(selectedFingers.includes(fingerId) ? [] : [fingerId]);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        {config.label}
      </ThemedText>
      <View style={styles.chipRow}>
        {config.fingerOptions.map((opt) => {
          const isSelected = selectedFingers.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              onPress={() => handleToggle(opt.id)}
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
                  styles.chipText,
                  {
                    color: isSelected ? theme.buttonText : theme.text,
                  },
                ]}
              >
                {opt.label}
              </ThemedText>
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
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
