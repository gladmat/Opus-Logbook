import React, { useState, useCallback } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface TimeFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

function formatTimeInput(input: string): string {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 0) return "";

  if (digits.length <= 2) {
    const hours = parseInt(digits, 10);
    if (hours >= 0 && hours <= 23) {
      return digits;
    }
    return digits.slice(0, 1);
  }

  if (digits.length === 3) {
    const firstDigit = parseInt(digits[0] ?? "0", 10);
    if (firstDigit <= 2) {
      const hours = digits.slice(0, 2);
      const mins = digits.slice(2);
      const hoursNum = parseInt(hours, 10);
      if (hoursNum <= 23) {
        return `${hours}:${mins}`;
      }
    }
    const hours = digits.slice(0, 1);
    const mins = digits.slice(1, 3);
    const minsNum = parseInt(mins, 10);
    if (minsNum <= 59) {
      return `0${hours}:${mins}`;
    }
    return `0${hours}:${mins.slice(0, 1)}`;
  }

  if (digits.length >= 4) {
    let hours: string;
    let mins: string;

    const firstTwo = parseInt(digits.slice(0, 2), 10);
    if (firstTwo <= 23) {
      hours = digits.slice(0, 2);
      mins = digits.slice(2, 4);
    } else {
      hours = `0${digits[0]}`;
      mins = digits.slice(1, 3);
    }

    const minsNum = parseInt(mins, 10);
    if (minsNum > 59) {
      mins = "59";
    }

    return `${hours}:${mins}`;
  }

  return input;
}

export function TimeField({
  label,
  value,
  onChangeText,
  placeholder = "HH:MM",
  required = false,
  error,
}: TimeFieldProps) {
  const { theme } = useTheme();
  const [displayValue, setDisplayValue] = useState(value);

  const handleChangeText = useCallback(
    (text: string) => {
      if (text.length < displayValue.length) {
        const newText = text.replace(":", "");
        setDisplayValue(newText);
        onChangeText(newText);
        return;
      }

      const formatted = formatTimeInput(text);
      setDisplayValue(formatted);
      onChangeText(formatted);
    },
    [displayValue, onChangeText],
  );

  const handleBlur = useCallback(() => {
    if (displayValue && !displayValue.includes(":")) {
      const formatted = formatTimeInput(
        displayValue + "00".slice(0, 4 - displayValue.length),
      );
      setDisplayValue(formatted);
      onChangeText(formatted);
    }
  }, [displayValue, onChangeText]);

  React.useEffect(() => {
    if (value !== displayValue) {
      setDisplayValue(value);
    }
  }, [value, displayValue]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
        {required ? (
          <ThemedText style={[styles.required, { color: theme.error }]}>
            *
          </ThemedText>
        ) : null}
      </View>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundRoot,
            borderColor: error ? theme.error : theme.border,
          },
        ]}
      >
        <Feather
          name="clock"
          size={18}
          color={theme.textSecondary}
          style={styles.icon}
        />
        <TextInput
          value={displayValue}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          keyboardType="numeric"
          maxLength={5}
          style={[styles.input, { color: theme.text }]}
        />
      </View>
      {error ? (
        <ThemedText style={[styles.error, { color: theme.error }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  required: {
    marginLeft: Spacing.xs,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    minHeight: Spacing.inputHeight,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
  },
  error: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});
