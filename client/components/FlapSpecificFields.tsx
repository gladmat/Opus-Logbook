import React from "react";
import { View, StyleSheet, Pressable, Switch } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { FormField } from "@/components/FormField";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  FLAP_FIELD_CONFIG,
  type FlapFieldDefinition,
} from "@/data/flapFieldConfig";
import type { FreeFlap, FlapSpecificDetails } from "@/types/case";

interface FlapSpecificFieldsProps {
  flapType: FreeFlap;
  details: FlapSpecificDetails;
  onUpdate: (details: FlapSpecificDetails) => void;
}

export function FlapSpecificFields({
  flapType,
  details,
  onUpdate,
}: FlapSpecificFieldsProps) {
  const { theme } = useTheme();
  const fieldConfig = FLAP_FIELD_CONFIG[flapType];

  if (!fieldConfig || fieldConfig.length === 0) {
    return null;
  }

  const getValue = (key: string): any => (details as any)[key];
  const setValue = (key: string, value: any) => {
    onUpdate({ ...details, [key]: value });
  };

  const isFieldVisible = (field: FlapFieldDefinition): boolean => {
    if (!field.showWhen) return true;
    const currentValue = String(getValue(field.showWhen.key) ?? "");
    return field.showWhen.values.includes(currentValue);
  };

  const visibleFields = fieldConfig.filter(isFieldVisible);

  if (visibleFields.length === 0) return null;

  return (
    <View style={[styles.container, { borderTopColor: theme.border }]}>
      <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
        Flap-Specific Details
      </ThemedText>
      <ThemedText
        style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
      >
        Parameters specific to the selected flap type
      </ThemedText>

      {visibleFields.map((field) => {
        switch (field.type) {
          case "select":
            return (
              <SelectField
                key={field.key}
                field={field}
                value={String(getValue(field.key) ?? "")}
                onSelect={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setValue(field.key, v);
                }}
              />
            );
          case "multi_select":
            return (
              <MultiSelectField
                key={field.key}
                field={field}
                values={(getValue(field.key) as string[]) ?? []}
                onToggle={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const current = (getValue(field.key) as string[]) ?? [];
                  const next = current.includes(v)
                    ? current.filter((x) => x !== v)
                    : [...current, v];
                  setValue(field.key, next.length > 0 ? next : undefined);
                }}
              />
            );
          case "boolean":
            return (
              <BooleanField
                key={field.key}
                field={field}
                value={getValue(field.key) ?? false}
                onChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setValue(field.key, v);
                }}
              />
            );
          case "number":
            return (
              <FormField
                key={field.key}
                label={`${field.label}${field.required ? " *" : ""}`}
                value={
                  getValue(field.key) != null ? String(getValue(field.key)) : ""
                }
                onChangeText={(v) =>
                  setValue(field.key, v ? parseFloat(v) : undefined)
                }
                placeholder={field.placeholder}
                keyboardType="decimal-pad"
                unit={field.unit}
              />
            );
          case "text":
            return (
              <FormField
                key={field.key}
                label={`${field.label}${field.required ? " *" : ""}`}
                value={String(getValue(field.key) ?? "")}
                onChangeText={(v) => setValue(field.key, v || undefined)}
                placeholder={field.placeholder}
              />
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

function SelectField({
  field,
  value,
  onSelect,
}: {
  field: FlapFieldDefinition;
  value: string;
  onSelect: (value: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.fieldContainer}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        {field.label}
        {field.required ? " *" : ""}
      </ThemedText>
      {field.hint ? (
        <ThemedText style={[styles.fieldHint, { color: theme.textSecondary }]}>
          {field.hint}
        </ThemedText>
      ) : null}
      <View style={styles.optionsWrap}>
        {(field.options || []).map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.optionChip,
              {
                backgroundColor:
                  value === option.value
                    ? theme.link + "20"
                    : theme.backgroundDefault,
                borderColor: value === option.value ? theme.link : theme.border,
              },
            ]}
            onPress={() => onSelect(option.value)}
          >
            <ThemedText
              style={[
                styles.optionText,
                {
                  color: value === option.value ? theme.link : theme.text,
                  fontWeight: value === option.value ? "600" : "400",
                },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function BooleanField({
  field,
  value,
  onChange,
}: {
  field: FlapFieldDefinition;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.booleanRow}>
      <ThemedText style={[styles.booleanLabel, { color: theme.text }]}>
        {field.label}
        {field.required ? " *" : ""}
      </ThemedText>
      <Switch
        value={!!value}
        onValueChange={onChange}
        trackColor={{ false: theme.border, true: theme.link + "60" }}
        thumbColor={value ? theme.link : theme.textSecondary}
      />
    </View>
  );
}

function MultiSelectField({
  field,
  values,
  onToggle,
}: {
  field: FlapFieldDefinition;
  values: string[];
  onToggle: (value: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.fieldContainer}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        {field.label}
        {field.required ? " *" : ""} (select all that apply)
      </ThemedText>
      {field.hint ? (
        <ThemedText style={[styles.fieldHint, { color: theme.textSecondary }]}>
          {field.hint}
        </ThemedText>
      ) : null}
      <View style={styles.optionsWrap}>
        {(field.options || []).map((option) => {
          const selected = values.includes(option.value);
          return (
            <Pressable
              key={option.value}
              style={[
                styles.optionChip,
                {
                  backgroundColor: selected
                    ? theme.link + "20"
                    : theme.backgroundDefault,
                  borderColor: selected ? theme.link : theme.border,
                },
              ]}
              onPress={() => onToggle(option.value)}
            >
              <ThemedText
                style={[
                  styles.optionText,
                  {
                    color: selected ? theme.link : theme.text,
                    fontWeight: selected ? "600" : "400",
                  },
                ]}
              >
                {selected ? "\u2713 " : ""}
                {option.label}
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
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  fieldHint: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: Spacing.xs,
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
  },
  booleanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  booleanLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginRight: Spacing.md,
  },
});
