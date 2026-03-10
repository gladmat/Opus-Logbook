import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  DigitId,
  HandTraumaCompleteness,
  HandTraumaStructure,
} from "@/types/case";
import {
  DIGIT_EXTENSOR_MAP,
  DIGIT_LABELS,
  EXTENSOR_ZONES_DIGIT,
  EXTENSOR_ZONES_THUMB,
} from "./structureConfig";

interface ExtensorTendonSectionProps {
  selectedDigits: DigitId[];
  checkedStructures: HandTraumaStructure[];
  zone: string;
  onZoneChange: (zone: string) => void;
  completeness: HandTraumaCompleteness;
  onCompletenessChange: (value: HandTraumaCompleteness) => void;
  onToggleStructure: (structure: HandTraumaStructure) => void;
}

export function ExtensorTendonSection({
  selectedDigits,
  checkedStructures,
  zone,
  onZoneChange,
  completeness,
  onCompletenessChange,
  onToggleStructure,
}: ExtensorTendonSectionProps) {
  const { theme } = useTheme();

  const hasThumb = selectedDigits.includes("I");
  const hasFingers = selectedDigits.some((d) => d !== "I");

  const zoneOptions: string[] = [];
  if (hasFingers) {
    zoneOptions.push(...EXTENSOR_ZONES_DIGIT);
  }
  if (hasThumb) {
    zoneOptions.push(...EXTENSOR_ZONES_THUMB);
  }

  const isStructureChecked = (structureId: string, digit: DigitId) =>
    checkedStructures.some(
      (s) =>
        s.category === "extensor_tendon" &&
        s.structureId === structureId &&
        s.digit === digit,
    );

  const handleToggle = (structureId: string, digit: DigitId) => {
    const displayName = `${structureId} — ${DIGIT_LABELS[digit]}`;
    onToggleStructure({
      category: "extensor_tendon",
      structureId,
      displayName,
      digit,
      zone: zone || undefined,
      completeness,
    });
  };

  if (selectedDigits.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText type="small" style={{ color: theme.textTertiary }}>
          Select digits above to see extensor tendons
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.zoneSection}>
        <ThemedText
          type="small"
          style={[styles.zoneLabel, { color: theme.textSecondary }]}
        >
          Completeness
        </ThemedText>
        <View style={styles.zoneRow}>
          {(["complete", "partial"] as const).map((value) => {
            const isSelected = completeness === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.zoneChip,
                  {
                    backgroundColor: isSelected
                      ? theme.link + "15"
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onCompletenessChange(value);
                }}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: isSelected ? theme.link : theme.text,
                    fontWeight: isSelected ? "600" : "400",
                    fontSize: 13,
                  }}
                >
                  {value === "complete" ? "Complete" : "Partial"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.zoneSection}>
        <ThemedText
          type="small"
          style={[styles.zoneLabel, { color: theme.textSecondary }]}
        >
          Zone
        </ThemedText>
        <View style={styles.zoneRow}>
          {zoneOptions.map((z) => {
            const isSelected = zone === z;
            return (
              <Pressable
                key={z}
                testID={`extensor-zone-${z}`}
                style={[
                  styles.zoneChip,
                  {
                    backgroundColor: isSelected
                      ? theme.link + "15"
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onZoneChange(z);
                }}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: isSelected ? theme.link : theme.text,
                    fontWeight: isSelected ? "600" : "400",
                    fontSize: 13,
                  }}
                >
                  {z}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedDigits.map((digit) => {
        const tendons = DIGIT_EXTENSOR_MAP[digit];
        if (!tendons) return null;
        const isTwoColumn = tendons.length === 2;

        return (
          <View
            key={digit}
            style={[styles.digitGroup, { borderColor: theme.border }]}
          >
            <ThemedText
              type="small"
              style={[styles.digitHeader, { color: theme.textSecondary }]}
            >
              {digit} — {DIGIT_LABELS[digit]}
            </ThemedText>
            <View style={styles.tendonGrid}>
              {tendons.map((tendon) => {
                const checked = isStructureChecked(tendon, digit);
                return (
                  <Pressable
                    key={`${digit}-${tendon}`}
                    testID={`extensor-${digit}-${tendon}`}
                    style={[
                      styles.tendonChip,
                      isTwoColumn
                        ? styles.tendonChipHalf
                        : styles.tendonChipAuto,
                      {
                        backgroundColor: checked
                          ? theme.link + "14"
                          : theme.backgroundDefault,
                        borderColor: checked ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => handleToggle(tendon, digit)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: checked ? theme.link : "transparent",
                          borderColor: checked ? theme.link : theme.border,
                        },
                      ]}
                    >
                      {checked ? (
                        <Feather name="check" size={12} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <ThemedText
                      type="small"
                      style={[styles.tendonChipLabel, { color: theme.text }]}
                    >
                      {tendon}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  emptyContainer: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  zoneSection: {
    marginBottom: Spacing.xs,
  },
  zoneLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  zoneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  zoneChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  digitGroup: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  digitHeader: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  tendonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tendonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    minWidth: 88,
  },
  tendonChipHalf: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  tendonChipAuto: {
    flexGrow: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tendonChipLabel: {
    fontWeight: "600",
  },
});
