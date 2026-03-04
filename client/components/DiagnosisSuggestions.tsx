import React, { useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import type { Specialty } from "@/types/case";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import {
  getDiagnosesForProcedures,
  type ReverseDiagnosisSuggestion,
} from "@/lib/diagnosisPicklists";
import { SPECIALTY_LABELS } from "@/types/case";

interface DiagnosisSuggestionsProps {
  procedurePicklistIds: string[];
  specialty: Specialty;
  onSelect: (diagnosis: DiagnosisPicklistEntry) => void;
}

export function DiagnosisSuggestions({
  procedurePicklistIds,
  specialty,
  onSelect,
}: DiagnosisSuggestionsProps) {
  const { theme } = useTheme();

  const suggestions: ReverseDiagnosisSuggestion[] = useMemo(
    () => getDiagnosesForProcedures(procedurePicklistIds, specialty),
    [procedurePicklistIds, specialty],
  );

  if (suggestions.length === 0) return null;

  const sameSpecialty = suggestions.filter(
    (s) => s.diagnosis.specialty === specialty,
  );
  const crossSpecialty = suggestions.filter(
    (s) => s.diagnosis.specialty !== specialty,
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[styles.iconBadge, { backgroundColor: theme.warning + "20" }]}
        >
          <Feather name="help-circle" size={18} color={theme.warning} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="h4" style={styles.title}>
            {"What's the diagnosis?"}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Suggested based on the procedure you selected
          </ThemedText>
        </View>
      </View>

      {sameSpecialty.length > 0 ? (
        <View style={styles.chipGroup}>
          {sameSpecialty.map((suggestion) => (
            <DiagnosisChip
              key={suggestion.diagnosis.id}
              suggestion={suggestion}
              isCrossSpecialty={false}
              theme={theme}
              onSelect={onSelect}
            />
          ))}
        </View>
      ) : null}

      {crossSpecialty.length > 0 ? (
        <View style={styles.crossSpecialtySection}>
          <ThemedText
            type="small"
            style={[styles.crossSpecialtyLabel, { color: theme.textTertiary }]}
          >
            From other specialties
          </ThemedText>
          <View style={styles.chipGroup}>
            {crossSpecialty.map((suggestion) => (
              <DiagnosisChip
                key={suggestion.diagnosis.id}
                suggestion={suggestion}
                isCrossSpecialty={true}
                theme={theme}
                onSelect={onSelect}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

interface DiagnosisChipProps {
  suggestion: ReverseDiagnosisSuggestion;
  isCrossSpecialty: boolean;
  theme: any;
  onSelect: (diagnosis: DiagnosisPicklistEntry) => void;
}

function DiagnosisChip({
  suggestion,
  isCrossSpecialty,
  theme,
  onSelect,
}: DiagnosisChipProps) {
  const chipBg = isCrossSpecialty
    ? theme.backgroundTertiary
    : theme.backgroundDefault;

  const chipBorder = isCrossSpecialty ? theme.border : theme.link + "40";

  return (
    <Pressable
      style={[
        styles.chip,
        { backgroundColor: chipBg, borderColor: chipBorder },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(suggestion.diagnosis);
      }}
    >
      <Feather
        name="arrow-right"
        size={14}
        color={theme.link}
        style={styles.chipIcon}
      />
      <View style={styles.chipContent}>
        <ThemedText
          type="small"
          style={[styles.chipText, { color: theme.text }]}
        >
          {suggestion.diagnosis.displayName}
        </ThemedText>
        {isCrossSpecialty ? (
          <ThemedText
            type="small"
            style={[styles.chipSpecialty, { color: theme.textTertiary }]}
          >
            {SPECIALTY_LABELS[suggestion.diagnosis.specialty]}
          </ThemedText>
        ) : null}
        {suggestion.isConditionalForDiagnosis &&
        suggestion.conditionDescription ? (
          <ThemedText
            type="small"
            style={[styles.chipCondition, { color: theme.textTertiary }]}
          >
            {suggestion.conditionDescription}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.small,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  crossSpecialtySection: {
    marginTop: Spacing.md,
  },
  crossSpecialtyLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    fontStyle: "italic",
  },
  chip: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    maxWidth: "100%",
  },
  chipIcon: {
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  chipContent: {
    flex: 1,
  },
  chipText: {
    ...Typography.small,
    fontWeight: "500",
  },
  chipSpecialty: {
    ...Typography.caption,
    marginTop: 1,
  },
  chipCondition: {
    ...Typography.caption,
    fontStyle: "italic",
    marginTop: 1,
  },
});
