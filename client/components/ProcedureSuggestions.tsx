import React, { useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import type {
  DiagnosisPicklistEntry,
  StagingSelections,
  EvaluatedSuggestion,
} from "@/types/diagnosis";
import { evaluateSuggestions } from "@/lib/diagnosisPicklists";

interface ProcedureSuggestionsProps {
  diagnosis: DiagnosisPicklistEntry;
  stagingSelections?: StagingSelections;
  selectedProcedureIds: Set<string>;
  onToggle: (procedurePicklistId: string, isSelected: boolean) => void;
}

export function ProcedureSuggestions({
  diagnosis,
  stagingSelections = {},
  selectedProcedureIds,
  onToggle,
}: ProcedureSuggestionsProps) {
  const { theme } = useTheme();

  const evaluated: EvaluatedSuggestion[] = useMemo(
    () => evaluateSuggestions(diagnosis, stagingSelections),
    [diagnosis, stagingSelections],
  );

  if (evaluated.length === 0) return null;

  const defaults = evaluated.filter((s) => !s.isConditional);
  const conditionals = evaluated.filter((s) => s.isConditional);

  return (
    <View style={styles.container}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Suggested Procedures
      </ThemedText>

      {defaults.length > 0 ? (
        <View style={styles.chipGroup}>
          {defaults.map((suggestion) => {
            const isSelected = selectedProcedureIds.has(
              suggestion.procedurePicklistId,
            );
            return (
              <SuggestionChip
                key={suggestion.procedurePicklistId}
                suggestion={suggestion}
                isSelected={isSelected}
                isActive={suggestion.isActive}
                theme={theme}
                onToggle={onToggle}
              />
            );
          })}
        </View>
      ) : null}

      {conditionals.length > 0 ? (
        <View style={styles.conditionalSection}>
          <ThemedText
            type="small"
            style={[styles.conditionalLabel, { color: theme.textSecondary }]}
          >
            Staging-dependent
          </ThemedText>
          <View style={styles.chipGroup}>
            {conditionals.map((suggestion) => {
              const isSelected = selectedProcedureIds.has(
                suggestion.procedurePicklistId,
              );
              return (
                <SuggestionChip
                  key={suggestion.procedurePicklistId}
                  suggestion={suggestion}
                  isSelected={isSelected}
                  isActive={suggestion.isActive}
                  theme={theme}
                  onToggle={onToggle}
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

interface SuggestionChipProps {
  suggestion: EvaluatedSuggestion;
  isSelected: boolean;
  isActive: boolean;
  theme: any;
  onToggle: (procedurePicklistId: string, isSelected: boolean) => void;
}

function SuggestionChip({
  suggestion,
  isSelected,
  isActive,
  theme,
  onToggle,
}: SuggestionChipProps) {
  const isDisabled = !!suggestion.isConditional && !isActive && !isSelected;

  const chipStyle = isSelected
    ? [
        styles.chip,
        styles.chipSelected,
        { backgroundColor: theme.link, borderColor: theme.link },
      ]
    : isDisabled
      ? [
          styles.chip,
          styles.chipInactive,
          {
            backgroundColor: theme.backgroundTertiary,
            borderColor: theme.border,
          },
        ]
      : [
          styles.chip,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
          },
        ];

  const textColor = isSelected
    ? theme.buttonText
    : isDisabled
      ? theme.textTertiary
      : theme.text;

  const iconColor = isSelected
    ? theme.buttonText
    : isDisabled
      ? theme.textTertiary
      : theme.link;

  return (
    <View>
      <Pressable
        testID={`caseForm.procedure.chip-${suggestion.procedurePicklistId}`}
        style={chipStyle}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle(suggestion.procedurePicklistId, !isSelected);
        }}
        disabled={!!suggestion.isConditional && !isActive && !isSelected}
      >
        <Feather
          name={isSelected ? "check-circle" : "circle"}
          size={16}
          color={iconColor}
          style={styles.chipIcon}
        />
        <ThemedText
          type="small"
          style={[
            styles.chipText,
            { color: textColor },
            isDisabled ? styles.chipTextInactive : null,
          ]}
        >
          {suggestion.displayName}
        </ThemedText>
      </Pressable>
      {suggestion.isConditional &&
      !isActive &&
      suggestion.conditionDescription ? (
        <ThemedText
          type="small"
          style={[styles.conditionHint, { color: theme.textTertiary }]}
        >
          {suggestion.conditionDescription}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  conditionalSection: {
    marginTop: Spacing.md,
  },
  conditionalLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  chipSelected: {},
  chipInactive: {
    opacity: 0.6,
  },
  chipIcon: {
    marginRight: Spacing.xs,
  },
  chipText: {
    ...Typography.small,
    flexShrink: 1,
  },
  chipTextInactive: {
    fontStyle: "italic",
  },
  conditionHint: {
    ...Typography.caption,
    marginTop: 2,
    marginLeft: Spacing.md,
    fontStyle: "italic",
  },
});
