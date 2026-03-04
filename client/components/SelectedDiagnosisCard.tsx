import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import type { DiagnosisPicklistEntry } from "@/lib/diagnosisPicklists";

interface SelectedDiagnosisCardProps {
  diagnosis: Pick<DiagnosisPicklistEntry, "displayName" | "snomedCtCode">;
  onClear: () => void;
  sourceLabel?: string;
}

export function SelectedDiagnosisCard({
  diagnosis,
  onClear,
  sourceLabel,
}: SelectedDiagnosisCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
      ]}
    >
      {sourceLabel ? (
        <View style={styles.sourceLabelRow}>
          <Feather name="zap" size={12} color={theme.link} />
          <ThemedText style={[styles.sourceLabel, { color: theme.link }]}>
            {sourceLabel}
          </ThemedText>
        </View>
      ) : null}
      <View style={styles.mainRow}>
        <View style={styles.info}>
          <ThemedText style={[styles.diagnosisName, { color: theme.text }]}>
            {diagnosis.displayName}
          </ThemedText>
          <ThemedText
            style={[styles.snomedCode, { color: theme.textTertiary }]}
          >
            SNOMED CT: {diagnosis.snomedCtCode}
          </ThemedText>
        </View>
        <Pressable
          onPress={onClear}
          hitSlop={8}
          testID="button-clear-selected-diagnosis"
        >
          <Feather name="x-circle" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  sourceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  diagnosisName: {
    fontSize: 14,
    fontWeight: "500",
  },
  snomedCode: {
    fontSize: 11,
    fontWeight: "500",
  },
});
