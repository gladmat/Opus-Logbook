import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { DigitId, HandTraumaStructure } from "@/types/case";
import {
  DIGIT_NERVE_MAP,
  NERVE_LABELS,
  PROXIMAL_NERVES,
} from "./structureConfig";

interface NerveSectionProps {
  selectedDigits: DigitId[];
  checkedStructures: HandTraumaStructure[];
  onToggleStructure: (
    structureId: string,
    category: "nerve",
    displayName: string,
    digit?: DigitId,
    side?: "radial" | "ulnar",
  ) => void;
}

export function NerveSection({
  selectedDigits,
  checkedStructures,
  onToggleStructure,
}: NerveSectionProps) {
  const { theme } = useTheme();

  const isChecked = (structureId: string) =>
    checkedStructures.some(
      (s) => s.structureId === structureId && s.category === "nerve",
    );

  const digitalNerves: {
    id: string;
    digit: DigitId;
    side: "radial" | "ulnar";
  }[] = [];
  for (const digit of selectedDigits) {
    const map = DIGIT_NERVE_MAP[digit];
    digitalNerves.push({ id: map.radial, digit, side: "radial" });
    digitalNerves.push({ id: map.ulnar, digit, side: "ulnar" });
  }

  return (
    <View style={styles.container}>
      {digitalNerves.length > 0 ? (
        <View style={styles.group}>
          <ThemedText
            type="small"
            style={[styles.groupLabel, { color: theme.textSecondary }]}
          >
            Digital nerves
          </ThemedText>
          {digitalNerves.map((nerve) => {
            const checked = isChecked(nerve.id);
            return (
              <Pressable
                key={nerve.id}
                testID={`caseForm.hand.chip-nerve-${nerve.id}`}
                style={[styles.checkRow, { borderColor: theme.border }]}
                onPress={() =>
                  onToggleStructure(
                    nerve.id,
                    "nerve",
                    NERVE_LABELS[nerve.id] ?? nerve.id,
                    nerve.digit,
                    nerve.side,
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
                  {NERVE_LABELS[nerve.id]}
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
          Proximal nerves
        </ThemedText>
        {PROXIMAL_NERVES.map((nerve) => {
          const checked = isChecked(nerve.id);
          return (
            <Pressable
              key={nerve.id}
              testID={`caseForm.hand.chip-nerve-${nerve.id}`}
              style={[styles.checkRow, { borderColor: theme.border }]}
              onPress={() => onToggleStructure(nerve.id, "nerve", nerve.label)}
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
                {nerve.label}
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
