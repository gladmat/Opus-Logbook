import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { type AnatomicalRegion, ANATOMICAL_REGION_LABELS } from "@/types/case";

interface RecipientSiteSelectorProps {
  /** Selected regions in selection order — [0] is the primary. */
  values: AnatomicalRegion[];
  onToggle: (region: AnatomicalRegion) => void;
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
  values,
  onToggle,
  label = "Recipient Site Region",
  required = false,
}: RecipientSiteSelectorProps) {
  const { theme } = useTheme();
  const primary = values.length > 1 ? values[0] : undefined;

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
        {REGION_ORDER.map((region) => {
          const selected = values.includes(region);
          return (
            <Pressable
              key={region}
              onPress={() => onToggle(region)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${ANATOMICAL_REGION_LABELS[region]}${
                region === primary ? ", primary region" : ""
              }`}
              style={[
                styles.regionButton,
                {
                  backgroundColor: selected
                    ? theme.accentSurface
                    : theme.backgroundDefault,
                  borderColor: selected ? theme.link : theme.border,
                },
              ]}
              testID={`caseForm.freeFlap.chip-recipientSite-${region}`}
            >
              <ThemedText
                style={[
                  styles.regionText,
                  {
                    color: selected ? theme.link : theme.text,
                    fontWeight: selected ? "600" : "400",
                  },
                ]}
              >
                {ANATOMICAL_REGION_LABELS[region]}
              </ThemedText>
              {region === primary ? (
                <ThemedText
                  style={[styles.primaryBadge, { color: theme.textSecondary }]}
                >
                  Primary
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {values.length > 1 ? (
        <ThemedText style={[styles.multiHint, { color: theme.textSecondary }]}>
          Crosses {values.length} regions — first selected is primary
        </ThemedText>
      ) : null}
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
  primaryBadge: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  multiHint: {
    fontSize: 12,
    marginTop: Spacing.sm,
  },
});
