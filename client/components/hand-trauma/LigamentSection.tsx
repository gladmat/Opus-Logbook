import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DigitId, HandTraumaStructure } from "@/types/case";
import { DIGIT_LABELS } from "./structureConfig";

interface LigamentSectionProps {
  selectedDigits: DigitId[];
  checkedStructures: HandTraumaStructure[];
  onToggleStructure: (
    structureId: string,
    category: "ligament",
    displayName: string,
    digit?: DigitId,
    side?: "radial" | "ulnar",
  ) => void;
}

export function LigamentSection({
  selectedDigits,
  checkedStructures,
  onToggleStructure,
}: LigamentSectionProps) {
  const { theme } = useTheme();

  const isChecked = (structureId: string) =>
    checkedStructures.some(
      (s) => s.structureId === structureId && s.category === "ligament",
    );

  const pipDigits = selectedDigits.filter((d) => d !== "I");
  const showThumbMcp = selectedDigits.includes("I");

  return (
    <View style={styles.container}>
      {pipDigits.length > 0 ? (
        <View style={styles.group}>
          <ThemedText
            type="small"
            style={[styles.groupLabel, { color: theme.textSecondary }]}
          >
            PIP collateral ligaments
          </ThemedText>
          {pipDigits.map((digit) => {
            const radialId = `pip_collateral_radial_${digit}`;
            const ulnarId = `pip_collateral_ulnar_${digit}`;
            const radialChecked = isChecked(radialId);
            const ulnarChecked = isChecked(ulnarId);
            return (
              <View key={digit} style={styles.digitGroup}>
                <ThemedText
                  type="small"
                  style={[styles.digitLabel, { color: theme.textSecondary }]}
                >
                  {DIGIT_LABELS[digit]} ({digit})
                </ThemedText>
                <Pressable
                  testID={`ligament-${radialId}`}
                  style={[styles.checkRow, { borderColor: theme.border }]}
                  onPress={() =>
                    onToggleStructure(
                      radialId,
                      "ligament",
                      `PIP radial collateral - ${DIGIT_LABELS[digit]}`,
                      digit,
                      "radial",
                    )
                  }
                >
                  <Feather
                    name={radialChecked ? "check-square" : "square"}
                    size={20}
                    color={radialChecked ? theme.link : theme.textTertiary}
                  />
                  <ThemedText
                    type="small"
                    style={[styles.checkLabel, { color: theme.text }]}
                  >
                    Radial collateral
                  </ThemedText>
                </Pressable>
                <Pressable
                  testID={`ligament-${ulnarId}`}
                  style={[styles.checkRow, { borderColor: theme.border }]}
                  onPress={() =>
                    onToggleStructure(
                      ulnarId,
                      "ligament",
                      `PIP ulnar collateral - ${DIGIT_LABELS[digit]}`,
                      digit,
                      "ulnar",
                    )
                  }
                >
                  <Feather
                    name={ulnarChecked ? "check-square" : "square"}
                    size={20}
                    color={ulnarChecked ? theme.link : theme.textTertiary}
                  />
                  <ThemedText
                    type="small"
                    style={[styles.checkLabel, { color: theme.text }]}
                  >
                    Ulnar collateral
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {showThumbMcp ? (
        <View style={styles.group}>
          <ThemedText
            type="small"
            style={[styles.groupLabel, { color: theme.textSecondary }]}
          >
            MCP I collateral ligaments
          </ThemedText>
          <Pressable
            testID="ligament-mcp1_ucl"
            style={[styles.checkRow, { borderColor: theme.border }]}
            onPress={() =>
              onToggleStructure(
                "mcp1_ucl",
                "ligament",
                "MCP I UCL (Gamekeeper's)",
                "I" as DigitId,
                "ulnar",
              )
            }
          >
            <Feather
              name={isChecked("mcp1_ucl") ? "check-square" : "square"}
              size={20}
              color={isChecked("mcp1_ucl") ? theme.link : theme.textTertiary}
            />
            <ThemedText
              type="small"
              style={[styles.checkLabel, { color: theme.text }]}
            >
              UCL (Ulnar collateral)
            </ThemedText>
          </Pressable>
          <Pressable
            testID="ligament-mcp1_rcl"
            style={[styles.checkRow, { borderColor: theme.border }]}
            onPress={() =>
              onToggleStructure(
                "mcp1_rcl",
                "ligament",
                "MCP I RCL",
                "I" as DigitId,
                "radial",
              )
            }
          >
            <Feather
              name={isChecked("mcp1_rcl") ? "check-square" : "square"}
              size={20}
              color={isChecked("mcp1_rcl") ? theme.link : theme.textTertiary}
            />
            <ThemedText
              type="small"
              style={[styles.checkLabel, { color: theme.text }]}
            >
              RCL (Radial collateral)
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {pipDigits.length === 0 && !showThumbMcp ? (
        <ThemedText type="small" style={{ color: theme.textTertiary }}>
          Select digits to see available ligament structures
        </ThemedText>
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
  digitGroup: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  groupLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  digitLabel: {
    fontWeight: "500",
    fontSize: 13,
    marginLeft: Spacing.xs,
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
