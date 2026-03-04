import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DigitId, HandTraumaStructure } from "@/types/case";
import { DIGIT_LABELS } from "./structureConfig";

interface OtherStructuresSectionProps {
  selectedDigits: DigitId[];
  checkedStructures: HandTraumaStructure[];
  onToggleStructure: (
    structureId: string,
    category: "other",
    displayName: string,
    digit?: DigitId,
  ) => void;
}

export function OtherStructuresSection({
  selectedDigits,
  checkedStructures,
  onToggleStructure,
}: OtherStructuresSectionProps) {
  const { theme } = useTheme();

  const isChecked = (structureId: string) =>
    checkedStructures.some(
      (s) => s.structureId === structureId && s.category === "other",
    );

  const pipDigits = selectedDigits.filter((d) => d !== "I");

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <ThemedText
          type="small"
          style={[styles.groupLabel, { color: theme.textSecondary }]}
        >
          General
        </ThemedText>

        <Pressable
          testID="other-bone"
          style={[styles.checkRow, { borderColor: theme.border }]}
          onPress={() =>
            onToggleStructure(
              "bone",
              "other",
              "Bone injury (use AO classification)",
            )
          }
        >
          <Feather
            name={isChecked("bone") ? "check-square" : "square"}
            size={20}
            color={isChecked("bone") ? theme.link : theme.textTertiary}
          />
          <View style={styles.labelContainer}>
            <ThemedText
              type="small"
              style={[styles.checkLabel, { color: theme.text }]}
            >
              Bone
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textTertiary, fontSize: 12 }}
            >
              Links to AO fracture classification
            </ThemedText>
          </View>
        </Pressable>

        <Pressable
          testID="other-nail_bed"
          style={[styles.checkRow, { borderColor: theme.border }]}
          onPress={() =>
            onToggleStructure("nail_bed", "other", "Nail bed injury")
          }
        >
          <Feather
            name={isChecked("nail_bed") ? "check-square" : "square"}
            size={20}
            color={isChecked("nail_bed") ? theme.link : theme.textTertiary}
          />
          <ThemedText
            type="small"
            style={[styles.checkLabel, { color: theme.text }]}
          >
            Nail bed
          </ThemedText>
        </Pressable>

        <Pressable
          testID="other-skin_loss"
          style={[styles.checkRow, { borderColor: theme.border }]}
          onPress={() =>
            onToggleStructure("skin_loss", "other", "Skin / soft tissue loss")
          }
        >
          <Feather
            name={isChecked("skin_loss") ? "check-square" : "square"}
            size={20}
            color={isChecked("skin_loss") ? theme.link : theme.textTertiary}
          />
          <View style={styles.labelContainer}>
            <ThemedText
              type="small"
              style={[styles.checkLabel, { color: theme.text }]}
            >
              Skin / soft tissue loss
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textTertiary, fontSize: 12 }}
            >
              Select coverage procedure manually
            </ThemedText>
          </View>
        </Pressable>
      </View>

      {pipDigits.length > 0 ? (
        <View style={styles.group}>
          <ThemedText
            type="small"
            style={[styles.groupLabel, { color: theme.textSecondary }]}
          >
            Volar plate (PIP)
          </ThemedText>
          {pipDigits.map((digit) => {
            const vpId = `volar_plate_${digit}`;
            const checked = isChecked(vpId);
            return (
              <Pressable
                key={digit}
                testID={`other-${vpId}`}
                style={[styles.checkRow, { borderColor: theme.border }]}
                onPress={() =>
                  onToggleStructure(
                    vpId,
                    "other",
                    `Volar plate PIP - ${DIGIT_LABELS[digit]}`,
                    digit,
                  )
                }
              >
                <Feather
                  name={checked ? "check-square" : "square"}
                  size={20}
                  color={checked ? theme.link : theme.textTertiary}
                />
                <ThemedText
                  type="small"
                  style={[styles.checkLabel, { color: theme.text }]}
                >
                  {DIGIT_LABELS[digit]} ({digit})
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  group: {
    gap: Spacing.xs,
  },
  groupLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  labelContainer: {
    flex: 1,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  checkLabel: {
    flex: 1,
  },
});
