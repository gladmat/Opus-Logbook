/**
 * PerFingerQuinnellGrading — inline Quinnell grade selector per affected digit.
 * Shows a row per selected finger with grade buttons (0–IV).
 */

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { FINGER_OPTIONS, QUINNELL_GRADES } from "@/lib/handElectiveFieldConfig";

interface PerFingerQuinnellGradingProps {
  affectedFingers: string[];
  grading: Record<string, string>;
  onChange: (grading: Record<string, string>) => void;
}

export const PerFingerQuinnellGrading = React.memo(
  function PerFingerQuinnellGrading({
    affectedFingers,
    grading,
    onChange,
  }: PerFingerQuinnellGradingProps) {
    const { theme } = useTheme();

    if (affectedFingers.length === 0) return null;

    const handleGradeSelect = (fingerId: string, grade: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const current = grading[fingerId];
      const next = { ...grading };
      if (current === grade) {
        delete next[fingerId];
      } else {
        next[fingerId] = grade;
      }
      onChange(next);
    };

    return (
      <View style={styles.container}>
        <ThemedText
          style={[styles.label, { color: theme.textSecondary }]}
        >
          QUINNELL GRADING
        </ThemedText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          {affectedFingers.map((fingerId) => {
            const fingerLabel =
              FINGER_OPTIONS.find((f) => f.id === fingerId)?.label ?? fingerId;
            const selectedGrade = grading[fingerId];

            return (
              <View key={fingerId} style={styles.fingerRow}>
                <ThemedText
                  style={[styles.fingerLabel, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {fingerLabel}
                </ThemedText>
                <View style={styles.gradeRow}>
                  {QUINNELL_GRADES.map((grade) => {
                    const isSelected = selectedGrade === grade.value;
                    return (
                      <Pressable
                        key={grade.value}
                        onPress={() =>
                          handleGradeSelect(fingerId, grade.value)
                        }
                        style={[
                          styles.gradeChip,
                          {
                            backgroundColor: isSelected
                              ? theme.link
                              : theme.backgroundTertiary,
                            borderColor: isSelected
                              ? theme.link
                              : theme.border,
                          },
                        ]}
                        accessibilityLabel={`${fingerLabel} Quinnell Grade ${grade.label}: ${grade.description}`}
                      >
                        <ThemedText
                          style={[
                            styles.gradeText,
                            {
                              color: isSelected
                                ? theme.buttonText
                                : theme.text,
                            },
                          ]}
                        >
                          {grade.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  fingerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  fingerLabel: {
    fontSize: 14,
    fontWeight: "600",
    width: 56,
  },
  gradeRow: {
    flexDirection: "row",
    flex: 1,
    gap: 4,
  },
  gradeChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
