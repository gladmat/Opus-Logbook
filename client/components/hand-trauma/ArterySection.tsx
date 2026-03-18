import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  DigitId,
  HandTraumaStructure,
  PerfusionStatusEntry,
} from "@/types/case";
import {
  DIGIT_ARTERY_MAP,
  ARTERY_LABELS,
  PROXIMAL_ARTERIES,
} from "./structureConfig";

interface ArterySectionProps {
  selectedDigits: DigitId[];
  checkedStructures: HandTraumaStructure[];
  onToggleStructure: (
    structureId: string,
    category: "artery",
    displayName: string,
    digit?: DigitId,
    side?: "radial" | "ulnar",
  ) => void;
  perfusionStatuses?: PerfusionStatusEntry[];
  onPerfusionChange?: (
    digit: DigitId,
    status?: PerfusionStatusEntry["status"],
  ) => void;
}

export function ArterySection({
  selectedDigits,
  checkedStructures,
  onToggleStructure,
  perfusionStatuses = [],
  onPerfusionChange,
}: ArterySectionProps) {
  const { theme } = useTheme();

  const isChecked = (structureId: string) =>
    checkedStructures.some(
      (s) => s.structureId === structureId && s.category === "artery",
    );

  const digitalArteries: {
    id: string;
    digit: DigitId;
    side: "radial" | "ulnar";
  }[] = [];
  for (const digit of selectedDigits) {
    const map = DIGIT_ARTERY_MAP[digit];
    digitalArteries.push({ id: map.radial, digit, side: "radial" });
    digitalArteries.push({ id: map.ulnar, digit, side: "ulnar" });
  }

  return (
    <View style={styles.container}>
      {selectedDigits.length > 0 ? (
        <View style={styles.group}>
          <ThemedText
            type="small"
            style={[styles.groupLabel, { color: theme.textSecondary }]}
          >
            Perfusion
          </ThemedText>
          {selectedDigits.map((digit) => {
            const selectedStatus = perfusionStatuses.find(
              (entry) => entry.digit === digit,
            )?.status;

            return (
              <View
                key={`perfusion-${digit}`}
                style={[styles.perfusionRow, { borderColor: theme.border }]}
              >
                <ThemedText
                  type="small"
                  style={[styles.perfusionLabel, { color: theme.text }]}
                >
                  Dig. {digit}
                </ThemedText>
                <View style={styles.perfusionPills}>
                  {[
                    { label: "Normal", value: undefined },
                    { label: "Impaired", value: "impaired" as const },
                    { label: "Absent", value: "absent" as const },
                  ].map((option) => {
                    const isSelected = selectedStatus === option.value;
                    return (
                      <Pressable
                        key={option.label}
                        style={[
                          styles.perfusionPill,
                          {
                            backgroundColor: isSelected
                              ? theme.link
                              : theme.backgroundTertiary,
                            borderColor: isSelected ? theme.link : theme.border,
                          },
                        ]}
                        onPress={() => onPerfusionChange?.(digit, option.value)}
                      >
                        <ThemedText
                          type="small"
                          style={{
                            color: isSelected ? theme.buttonText : theme.text,
                            fontWeight: isSelected ? "600" : "400",
                          }}
                        >
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {digitalArteries.length > 0 ? (
        <View style={styles.group}>
          <ThemedText
            type="small"
            style={[styles.groupLabel, { color: theme.textSecondary }]}
          >
            Digital arteries
          </ThemedText>
          {digitalArteries.map((artery) => {
            const checked = isChecked(artery.id);
            return (
              <Pressable
                key={artery.id}
                testID={`caseForm.hand.chip-artery-${artery.id}`}
                style={[styles.checkRow, { borderColor: theme.border }]}
                onPress={() =>
                  onToggleStructure(
                    artery.id,
                    "artery",
                    ARTERY_LABELS[artery.id] ?? artery.id,
                    artery.digit,
                    artery.side,
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
                  {ARTERY_LABELS[artery.id]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.group}>
        <ThemedText
          type="small"
          style={[styles.groupLabel, { color: theme.textSecondary }]}
        >
          Proximal arteries
        </ThemedText>
        {PROXIMAL_ARTERIES.map((artery) => {
          const checked = isChecked(artery.id);
          return (
            <Pressable
              key={artery.id}
              testID={`caseForm.hand.chip-artery-${artery.id}`}
              style={[styles.checkRow, { borderColor: theme.border }]}
              onPress={() =>
                onToggleStructure(artery.id, "artery", artery.label)
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
                {artery.label}
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
    gap: Spacing.md,
  },
  group: {
    gap: Spacing.xs,
  },
  groupLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  perfusionRow: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  perfusionLabel: {
    fontWeight: "600",
  },
  perfusionPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  perfusionPill: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
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
