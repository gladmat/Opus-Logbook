/**
 * ElectrodiagnosticSummary
 * ════════════════════════
 * Simplified EMG/NCS summary with structured booleans + severity + free text.
 * Collapsible section within PeripheralNerveAssessment.
 */

import React, { useCallback } from "react";
import { View, Switch, TextInput, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ElectrodiagnosticSummary as EDXData } from "@/types/peripheralNerve";
import { EDX_SEVERITY_LABELS } from "@/types/peripheralNerve";

interface ElectrodiagnosticSummaryProps {
  data?: EDXData;
  onChange: (data: EDXData) => void;
}

const SEVERITY_OPTIONS = [
  "normal",
  "mild",
  "moderate",
  "severe",
  "complete",
] as const;

type SeverityValue = (typeof SEVERITY_OPTIONS)[number];

const BOOLEAN_FIELDS: Array<{
  key: keyof EDXData;
  label: string;
  hint?: string;
}> = [
  { key: "snapsPresent", label: "SNAPs present", hint: "Preganglionic vs postganglionic" },
  { key: "denervationPresent", label: "Active denervation" },
  { key: "reinnervationPresent", label: "Reinnervation potentials" },
  { key: "fibrillationPotentials", label: "Fibrillation potentials" },
  {
    key: "paraspinalDenervation",
    label: "Paraspinal denervation",
    hint: "Suggests preganglionic (avulsion)",
  },
];

export const ElectrodiagnosticSummaryComponent = React.memo(
  function ElectrodiagnosticSummaryComponent({
    data,
    onChange,
  }: ElectrodiagnosticSummaryProps) {
    const { theme } = useTheme();
    const edx = data ?? {};

    const update = useCallback(
      (updates: Partial<EDXData>) => {
        onChange({ ...edx, ...updates });
      },
      [edx, onChange],
    );

    const handleSeverityPress = useCallback(
      (sev: SeverityValue) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        update({
          overallSeverity: edx.overallSeverity === sev ? undefined : sev,
        });
      },
      [edx.overallSeverity, update],
    );

    return (
      <View style={{ gap: Spacing.md }}>
        {/* Boolean switches */}
        {BOOLEAN_FIELDS.map(({ key, label, hint }) => (
          <View key={key} style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: theme.text, fontSize: 15 }}>
                {label}
              </ThemedText>
              {hint != null && (
                <ThemedText
                  style={{ color: theme.textTertiary, fontSize: 12 }}
                >
                  {hint}
                </ThemedText>
              )}
            </View>
            <Switch
              value={edx[key] === true}
              onValueChange={(val) => update({ [key]: val })}
              trackColor={{ true: theme.accent, false: theme.border }}
              thumbColor={theme.backgroundRoot}
            />
          </View>
        ))}

        {/* Overall severity */}
        <View>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Overall Severity
          </ThemedText>
          <View style={styles.chipRow}>
            {SEVERITY_OPTIONS.map((sev) => {
              const selected = edx.overallSeverity === sev;
              return (
                <Pressable
                  key={sev}
                  onPress={() => handleSeverityPress(sev)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected
                        ? theme.accent
                        : theme.backgroundElevated,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: selected
                          ? theme.buttonText
                          : theme.text,
                      },
                    ]}
                  >
                    {EDX_SEVERITY_LABELS[sev]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Key findings free text */}
        <View>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Key Findings
          </ThemedText>
          <TextInput
            value={edx.keyFindings ?? ""}
            onChangeText={(text) => update({ keyFindings: text || undefined })}
            placeholder="Brief summary of EDX findings..."
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={3}
            style={[
              styles.textInput,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
            ]}
          />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
});
