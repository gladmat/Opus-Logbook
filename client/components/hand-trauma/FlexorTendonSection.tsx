import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DigitId, HandTraumaStructure } from "@/types/case";
import {
  DIGIT_FLEXOR_MAP,
  DIGIT_LABELS,
  FLEXOR_ZONES_DIGIT,
  FLEXOR_ZONES_THUMB,
} from "./structureConfig";

interface FlexorTendonSectionProps {
  selectedDigits: DigitId[];
  checkedStructures: HandTraumaStructure[];
  zone: string;
  onZoneChange: (zone: string) => void;
  onToggleStructure: (structure: HandTraumaStructure) => void;
}

export function FlexorTendonSection({
  selectedDigits,
  checkedStructures,
  zone,
  onZoneChange,
  onToggleStructure,
}: FlexorTendonSectionProps) {
  const { theme } = useTheme();

  const hasThumb = selectedDigits.includes("I");
  const hasFingers = selectedDigits.some((d) => d !== "I");

  const zoneOptions: string[] = [];
  if (hasFingers) {
    zoneOptions.push(...FLEXOR_ZONES_DIGIT);
  }
  if (hasThumb) {
    zoneOptions.push(...FLEXOR_ZONES_THUMB);
  }

  const isStructureChecked = (structureId: string, digit: DigitId) =>
    checkedStructures.some(
      (s) =>
        s.category === "flexor_tendon" &&
        s.structureId === structureId &&
        s.digit === digit,
    );

  const handleToggle = (structureId: string, digit: DigitId) => {
    const displayName = `${structureId} — ${DIGIT_LABELS[digit]}`;
    onToggleStructure({
      category: "flexor_tendon",
      structureId,
      displayName,
      digit,
      zone: zone || undefined,
    });
  };

  if (selectedDigits.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText type="small" style={{ color: theme.textTertiary }}>
          Select digits above to see flexor tendons
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
          Zone
        </ThemedText>
        <View style={styles.zoneRow}>
          {zoneOptions.map((z) => {
            const isSelected = zone === z;
            return (
              <Pressable
                key={z}
                testID={`flexor-zone-${z}`}
                style={[
                  styles.zoneChip,
                  {
                    backgroundColor: isSelected
                      ? theme.link + "15"
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => onZoneChange(z)}
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
        const tendons = DIGIT_FLEXOR_MAP[digit];
        if (!tendons) return null;

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
            {tendons.map((tendon) => {
              const checked = isStructureChecked(tendon, digit);
              return (
                <Pressable
                  key={`${digit}-${tendon}`}
                  testID={`flexor-${digit}-${tendon}`}
                  style={styles.checkboxRow}
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
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <ThemedText
                    type="small"
                    style={{ color: theme.text, marginLeft: Spacing.sm }}
                  >
                    {tendon}
                  </ThemedText>
                </Pressable>
              );
            })}
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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
