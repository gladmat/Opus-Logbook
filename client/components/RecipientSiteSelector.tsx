import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { type AnatomicalRegion, ANATOMICAL_REGION_LABELS } from "@/types/case";

interface RecipientSiteSelectorProps {
  value?: AnatomicalRegion;
  onSelect: (region: AnatomicalRegion) => void;
  label?: string;
  required?: boolean;
}

const REGION_ORDER: AnatomicalRegion[] = [
  "head_neck",
  "breast_chest",
  "upper_arm",
  "forearm",
  "hand",
  "thigh",
  "knee",
  "lower_leg",
  "foot",
  "perineum",
];

export function RecipientSiteSelector({
  value,
  onSelect,
  label = "Recipient Site Region",
  required = false,
}: RecipientSiteSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
        {required ? (
          <ThemedText style={[styles.required, { color: theme.error }]}>
            *
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.optionsGrid}>
        {REGION_ORDER.map((region) => (
          <Pressable
            key={region}
            onPress={() => onSelect(region)}
            style={[
              styles.regionButton,
              {
                backgroundColor:
                  value === region
                    ? theme.link + "15"
                    : theme.backgroundDefault,
                borderColor: value === region ? theme.link : theme.border,
              },
            ]}
            testID={`caseForm.freeFlap.chip-recipientSite-${region}`}
          >
            <ThemedText
              style={[
                styles.regionText,
                {
                  color: value === region ? theme.link : theme.text,
                  fontWeight: value === region ? "600" : "400",
                },
              ]}
            >
              {ANATOMICAL_REGION_LABELS[region]}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  required: {
    marginLeft: Spacing.xs,
    fontSize: 14,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  regionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 100,
    alignItems: "center",
  },
  regionText: {
    fontSize: 14,
  },
});
