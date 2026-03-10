/**
 * RareTypeSubtypePicker
 * ═════════════════════
 * Grouped picker for the 26 rare malignant cutaneous subtypes.
 * Three groups: Adnexal Carcinomas, Cutaneous Sarcomas, Other.
 * Shows pathway indicator and MDT banner after selection.
 */

import React, { useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RARE_TYPE_METADATA, getClinicalPathway } from "@/lib/skinCancerConfig";
import type { RareMalignantSubtype } from "@/types/skinCancer";

interface RareTypeSubtypePickerProps {
  selectedSubtype: RareMalignantSubtype | undefined;
  onSelectSubtype: (subtype: RareMalignantSubtype | undefined) => void;
}

interface RareGroup {
  label: string;
  key: string;
  subtypes: { value: RareMalignantSubtype; label: string }[];
}

const GROUP_ORDER: { key: string; label: string }[] = [
  { key: "adnexal", label: "ADNEXAL CARCINOMAS" },
  { key: "sarcoma", label: "CUTANEOUS SARCOMAS" },
  { key: "other", label: "OTHER" },
];

const RARE_GROUPS: RareGroup[] = GROUP_ORDER.map(({ key, label }) => ({
  label,
  key,
  subtypes: (
    Object.entries(RARE_TYPE_METADATA) as [
      RareMalignantSubtype,
      (typeof RARE_TYPE_METADATA)[RareMalignantSubtype],
    ][]
  )
    .filter(([, meta]) => meta.group === key)
    .map(([value, meta]) => ({ value, label: meta.label })),
}));

const PATHWAY_LABELS: Record<string, string> = {
  melanoma_like: "melanoma-like",
  bcc_scc_like: "BCC/SCC-like",
  complex_mdt: "complex MDT",
};

const MOHS_TYPES: Set<RareMalignantSubtype> = new Set(["mac", "dfsp", "empd"]);

export const RareTypeSubtypePicker = React.memo(function RareTypeSubtypePicker({
  selectedSubtype,
  onSelectSubtype,
}: RareTypeSubtypePickerProps) {
  const { theme } = useTheme();

  const handleSelect = useCallback(
    (value: RareMalignantSubtype) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectSubtype(selectedSubtype === value ? undefined : value);
    },
    [selectedSubtype, onSelectSubtype],
  );

  const pathway = useMemo(
    () =>
      selectedSubtype
        ? getClinicalPathway("rare_malignant", selectedSubtype)
        : undefined,
    [selectedSubtype],
  );

  return (
    <View style={styles.container}>
      {RARE_GROUPS.map((group) => (
        <View key={group.key} style={styles.group}>
          <ThemedText
            style={[styles.groupLabel, { color: theme.textTertiary }]}
          >
            {group.label}
          </ThemedText>
          <View style={styles.chipRow}>
            {group.subtypes.map((opt) => {
              const isSelected = selectedSubtype === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? theme.link + "14"
                        : theme.backgroundElevated,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => handleSelect(opt.value)}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: isSelected ? theme.link : theme.text },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {/* Pathway indicator */}
      {selectedSubtype && pathway ? (
        <View style={styles.pathwayInfo}>
          <View style={styles.pathwayRow}>
            <Feather name="git-branch" size={14} color={theme.textSecondary} />
            <ThemedText
              style={[styles.pathwayText, { color: theme.textSecondary }]}
            >
              This tumour follows the{" "}
              <ThemedText style={{ fontWeight: "600", color: theme.text }}>
                {PATHWAY_LABELS[pathway] ?? pathway}
              </ThemedText>{" "}
              pathway
            </ThemedText>
          </View>

          {/* MDT banner for complex types */}
          {pathway === "complex_mdt" ? (
            <View
              style={[
                styles.mdtBanner,
                {
                  backgroundColor: theme.warning + "10",
                  borderLeftColor: theme.warning,
                },
              ]}
            >
              <Feather name="alert-circle" size={14} color={theme.warning} />
              <ThemedText style={[styles.mdtText, { color: theme.warning }]}>
                MDT discussion recommended
              </ThemedText>
            </View>
          ) : null}

          {/* Lymphoma note */}
          {selectedSubtype === "cutaneous_lymphoma" ? (
            <View
              style={[
                styles.mdtBanner,
                {
                  backgroundColor: theme.info + "10",
                  borderLeftColor: theme.info,
                },
              ]}
            >
              <Feather name="info" size={14} color={theme.info} />
              <ThemedText style={[styles.mdtText, { color: theme.info }]}>
                Surgery typically limited to diagnostic biopsy. Refer to
                haematology MDT.
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  group: {
    gap: Spacing.xs,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  pathwayInfo: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  pathwayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pathwayText: {
    fontSize: 13,
    flex: 1,
  },
  mdtBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderLeftWidth: 3,
    borderRadius: BorderRadius.xs,
  },
  mdtText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
});
