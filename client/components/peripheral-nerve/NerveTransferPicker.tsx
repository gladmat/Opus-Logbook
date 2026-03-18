/**
 * NerveTransferPicker
 * ═══════════════════
 * Named transfer picker with donor → recipient display.
 * Shows named transfer labels and auto-fills donor/recipient for known transfers.
 */

import React, { useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  NerveTransferDetails,
  NamedNerveTransfer,
  NerveTransferTargetFunction,
} from "@/types/peripheralNerve";
import {
  NAMED_TRANSFER_LABELS,
  TARGET_FUNCTION_LABELS,
} from "@/types/peripheralNerve";

interface NerveTransferPickerProps {
  details?: NerveTransferDetails;
  onChange: (details: NerveTransferDetails | undefined) => void;
}

/** Common named transfers for display */
const COMMON_TRANSFERS: NamedNerveTransfer[] = [
  "oberlin",
  "mackinnon_double",
  "sxa_to_ssn",
  "somsak",
  "intercostal_to_mcn",
  "distal_tibial_to_deep_peroneal",
  "masseteric_to_facial",
  "other",
];

const COMMON_TARGETS: NerveTransferTargetFunction[] = [
  "elbow_flexion",
  "shoulder_abduction",
  "shoulder_external_rotation",
  "elbow_extension",
  "wrist_extension",
  "finger_flexion",
  "ankle_dorsiflexion",
  "sensation",
  "other",
];

export const NerveTransferPicker = React.memo(function NerveTransferPicker({
  details,
  onChange,
}: NerveTransferPickerProps) {
  const { theme } = useTheme();

  const handleTransferSelect = useCallback(
    (transfer: NamedNerveTransfer) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (details?.namedTransfer === transfer) {
        onChange(undefined);
        return;
      }
      onChange({
        donorNerve: "other",
        recipientNerve: "other",
        directVsGraft: "direct",
        ...details,
        namedTransfer: transfer,
      });
    },
    [details, onChange],
  );

  const handleTargetSelect = useCallback(
    (target: NerveTransferTargetFunction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange({
        donorNerve: "other",
        recipientNerve: "other",
        directVsGraft: "direct",
        ...details,
        targetFunction: details?.targetFunction === target ? undefined : target,
      });
    },
    [details, onChange],
  );

  const handleDirectVsGraft = useCallback(
    (val: "direct" | "via_graft") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange({
        donorNerve: "other",
        recipientNerve: "other",
        ...details,
        directVsGraft: val,
      });
    },
    [details, onChange],
  );

  return (
    <View style={{ gap: Spacing.md }}>
      {/* Named transfer */}
      <View>
        <ThemedText
          style={[styles.fieldLabel, { color: theme.textSecondary }]}
        >
          Named Transfer
        </ThemedText>
        <View style={styles.chipRow}>
          {COMMON_TRANSFERS.map((transfer) => {
            const selected = details?.namedTransfer === transfer;
            return (
              <Pressable
                key={transfer}
                onPress={() => handleTransferSelect(transfer)}
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
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: selected ? theme.buttonText : theme.text,
                  }}
                  numberOfLines={2}
                >
                  {NAMED_TRANSFER_LABELS[transfer]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Target function */}
      <View>
        <ThemedText
          style={[styles.fieldLabel, { color: theme.textSecondary }]}
        >
          Target Function
        </ThemedText>
        <View style={styles.chipRow}>
          {COMMON_TARGETS.map((target) => {
            const selected = details?.targetFunction === target;
            return (
              <Pressable
                key={target}
                onPress={() => handleTargetSelect(target)}
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
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: selected ? theme.buttonText : theme.text,
                  }}
                >
                  {TARGET_FUNCTION_LABELS[target]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Direct vs via graft */}
      <View>
        <ThemedText
          style={[styles.fieldLabel, { color: theme.textSecondary }]}
        >
          Coaptation
        </ThemedText>
        <View style={styles.chipRow}>
          {(["direct", "via_graft"] as const).map((val) => {
            const selected = details?.directVsGraft === val;
            return (
              <Pressable
                key={val}
                onPress={() => handleDirectVsGraft(val)}
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
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: selected ? theme.buttonText : theme.text,
                  }}
                >
                  {val === "direct" ? "Direct" : "Via graft"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
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
    maxWidth: "100%",
  },
});
