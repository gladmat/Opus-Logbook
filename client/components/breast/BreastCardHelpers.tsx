/**
 * BreastCardHelpers — Shared UI primitives for breast specialty cards.
 *
 * Provides typed chip selectors, checkbox rows, and numeric fields
 * to avoid duplicating layout patterns across ImplantDetailsCard,
 * BreastFlapCard, LipofillingCard, and LiposuctionCard.
 */

import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { DraftNumericInput } from "@/components/DraftNumericInput";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

// ─────────────────────────────────────────────────────────────────────────────
// BreastChipRow — single-select chip grid
// ─────────────────────────────────────────────────────────────────────────────

interface BreastChipRowProps<T extends string> {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T | undefined;
  onSelect: (value: T | undefined) => void;
  allowDeselect?: boolean;
}

function BreastChipRowInner<T extends string>({
  label,
  options,
  labels,
  selected,
  onSelect,
  allowDeselect = false,
}: BreastChipRowProps<T>) {
  const { theme } = useTheme();

  const handlePress = useCallback(
    (option: T) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (allowDeselect && option === selected) {
        onSelect(undefined);
      } else {
        onSelect(option);
      }
    },
    [allowDeselect, onSelect, selected],
  );

  return (
    <View style={styles.fieldGroup}>
      <ThemedText
        type="small"
        style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}
      >
        {label}
      </ThemedText>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <Pressable
              key={option}
              onPress={() => handlePress(option)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.link
                    : theme.backgroundSecondary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: isSelected ? theme.buttonText : theme.text,
                  fontWeight: isSelected ? "600" : "400",
                }}
              >
                {labels[option]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const BreastChipRow = React.memo(
  BreastChipRowInner,
) as typeof BreastChipRowInner;

// ─────────────────────────────────────────────────────────────────────────────
// BreastMultiChipRow — multi-select chip grid
// ─────────────────────────────────────────────────────────────────────────────

interface BreastMultiChipRowProps<T extends string> {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onToggle: (value: T[]) => void;
}

function BreastMultiChipRowInner<T extends string>({
  label,
  options,
  labels,
  selected,
  onToggle,
}: BreastMultiChipRowProps<T>) {
  const { theme } = useTheme();

  const handlePress = useCallback(
    (option: T) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (selected.includes(option)) {
        onToggle(selected.filter((v) => v !== option));
      } else {
        onToggle([...selected, option]);
      }
    },
    [onToggle, selected],
  );

  return (
    <View style={styles.fieldGroup}>
      <ThemedText
        type="small"
        style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}
      >
        {label}
      </ThemedText>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => handlePress(option)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.link
                    : theme.backgroundSecondary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: isSelected ? theme.buttonText : theme.text,
                  fontWeight: isSelected ? "600" : "400",
                }}
              >
                {labels[option]}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const BreastMultiChipRow = React.memo(
  BreastMultiChipRowInner,
) as typeof BreastMultiChipRowInner;

// ─────────────────────────────────────────────────────────────────────────────
// BreastCheckboxRow — boolean toggle with label
// ─────────────────────────────────────────────────────────────────────────────

interface BreastCheckboxRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const BreastCheckboxRow = React.memo(function BreastCheckboxRow({
  label,
  value,
  onChange,
}: BreastCheckboxRowProps) {
  const { theme } = useTheme();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(!value);
  }, [onChange, value]);

  return (
    <Pressable onPress={handlePress} style={styles.checkboxRow}>
      <View
        style={[
          styles.checkboxBox,
          {
            backgroundColor: value ? theme.link : "transparent",
            borderColor: value ? theme.link : theme.border,
          },
        ]}
      >
        {value && <Feather name="check" size={14} color={theme.buttonText} />}
      </View>
      <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// BreastNumericField — labeled DraftNumericInput with optional unit suffix
// ─────────────────────────────────────────────────────────────────────────────

interface BreastNumericFieldProps {
  label: string;
  value?: number;
  onValueChange: (value: number | undefined) => void;
  unit?: string;
  placeholder?: string;
  integer?: boolean;
}

export const BreastNumericField = React.memo(function BreastNumericField({
  label,
  value,
  onValueChange,
  unit,
  placeholder,
  integer = false,
}: BreastNumericFieldProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.numericFieldContainer}>
      <ThemedText
        type="small"
        style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}
      >
        {label}
      </ThemedText>
      <View style={styles.numericInputRow}>
        <DraftNumericInput
          value={value}
          onValueChange={onValueChange}
          integer={integer}
          placeholder={placeholder ?? ""}
          placeholderTextColor={theme.textTertiary}
          keyboardType={integer ? "number-pad" : "decimal-pad"}
          style={[
            styles.numericInput,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
        />
        {unit ? (
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}
          >
            {unit}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// BreastSectionToggle — expandable section toggle ("Details", "Advanced")
// ─────────────────────────────────────────────────────────────────────────────

interface BreastSectionToggleProps {
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
  subtitle?: string;
}

export const BreastSectionToggle = React.memo(function BreastSectionToggle({
  label,
  isExpanded,
  onToggle,
  subtitle,
}: BreastSectionToggleProps) {
  const { theme } = useTheme();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }, [onToggle]);

  return (
    <Pressable onPress={handlePress} style={styles.sectionToggle}>
      <View style={{ flex: 1 }}>
        <ThemedText
          type="small"
          style={{ color: theme.link, fontWeight: "600" }}
        >
          {label}
        </ThemedText>
        {subtitle && !isExpanded ? (
          <ThemedText
            type="small"
            style={{ color: theme.textTertiary, marginTop: 2, fontSize: 12 }}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <Feather
        name={isExpanded ? "chevron-up" : "chevron-down"}
        size={16}
        color={theme.link}
      />
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldGroup: {
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  numericFieldContainer: {
    marginBottom: Spacing.sm,
  },
  numericInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  numericInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 15,
    minWidth: 80,
  },
  sectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
});
