import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DigitId, HandTraumaStructure } from "@/types/case";
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
}

export function ArterySection({
  selectedDigits,
  checkedStructures,
  onToggleStructure,
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
                testID={`artery-${artery.id}`}
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
              testID={`artery-${artery.id}`}
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
