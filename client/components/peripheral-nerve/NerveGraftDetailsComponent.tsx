/**
 * NerveGraftDetailsComponent
 * ══════════════════════════
 * Graft type/source/length/cables + conduit + allograft product fields.
 * Renders when a graft/conduit procedure is selected.
 */

import React, { useCallback } from "react";
import { View, TextInput, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NerveGraftDetails, NerveConduitDetails } from "@/types/peripheralNerve";
import { GRAFT_SOURCE_LABELS } from "@/types/peripheralNerve";
import type { NerveGraftSource } from "@/types/peripheralNerve";

interface NerveGraftDetailsProps {
  graftDetails?: NerveGraftDetails;
  conduitDetails?: NerveConduitDetails;
  onGraftChange: (details: NerveGraftDetails | undefined) => void;
  onConduitChange: (details: NerveConduitDetails | undefined) => void;
  /** Whether the selected procedure is a graft vs conduit */
  showGraft?: boolean;
  showConduit?: boolean;
}

const GRAFT_TYPES = [
  { value: "autograft" as const, label: "Autograft" },
  { value: "allograft" as const, label: "Allograft" },
  { value: "vein_graft" as const, label: "Vein graft" },
];

const GRAFT_SOURCES: NerveGraftSource[] = [
  "sural",
  "mabc",
  "labc",
  "pin",
  "great_auricular",
  "vascularised_ulnar",
  "other",
];

const CONDUIT_TYPES = [
  { value: "hollow" as const, label: "Hollow tube" },
  { value: "filled" as const, label: "Filled (3D matrix)" },
  { value: "wrap" as const, label: "Wrap / protector" },
];

export const NerveGraftDetailsComponent = React.memo(
  function NerveGraftDetailsComponent({
    graftDetails,
    conduitDetails,
    onGraftChange,
    onConduitChange,
    showGraft = true,
    showConduit = false,
  }: NerveGraftDetailsProps) {
    const { theme } = useTheme();

    const updateGraft = useCallback(
      (updates: Partial<NerveGraftDetails>) => {
        onGraftChange({ graftType: "autograft", ...graftDetails, ...updates });
      },
      [graftDetails, onGraftChange],
    );

    const updateConduit = useCallback(
      (updates: Partial<NerveConduitDetails>) => {
        onConduitChange({
          conduitType: "hollow",
          ...conduitDetails,
          ...updates,
        });
      },
      [conduitDetails, onConduitChange],
    );

    return (
      <View style={{ gap: Spacing.md }}>
        {/* Graft section */}
        {showGraft && (
          <>
            <ThemedText
              style={[styles.sectionTitle, { color: theme.text }]}
            >
              Nerve Graft
            </ThemedText>

            {/* Graft type */}
            <View style={styles.chipRow}>
              {GRAFT_TYPES.map(({ value, label }) => {
                const selected = graftDetails?.graftType === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateGraft({ graftType: value });
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.accent
                          : theme.backgroundElevated,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: selected ? theme.buttonText : theme.text,
                      }}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Source (for autograft) */}
            {graftDetails?.graftType === "autograft" && (
              <View>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Graft Source
                </ThemedText>
                <View style={styles.chipRow}>
                  {GRAFT_SOURCES.map((src) => {
                    const selected = graftDetails?.graftSource === src;
                    return (
                      <Pressable
                        key={src}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          updateGraft({
                            graftSource: graftDetails?.graftSource === src ? undefined : src,
                          });
                        }}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected
                              ? theme.accent
                              : theme.backgroundElevated,
                            borderColor: selected
                              ? theme.accent
                              : theme.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={{
                            fontSize: 13,
                            fontWeight: "500",
                            color: selected
                              ? theme.buttonText
                              : theme.text,
                          }}
                        >
                          {GRAFT_SOURCE_LABELS[src]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Numeric fields */}
            <View style={styles.numericRow}>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Length (mm)
                </ThemedText>
                <TextInput
                  value={graftDetails?.graftLengthMm?.toString() ?? ""}
                  onChangeText={(t) =>
                    updateGraft({
                      graftLengthMm: t ? Number(t) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="mm"
                  placeholderTextColor={theme.textTertiary}
                  style={[
                    styles.numericInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Cables
                </ThemedText>
                <TextInput
                  value={graftDetails?.numberOfCables?.toString() ?? ""}
                  onChangeText={(t) =>
                    updateGraft({
                      numberOfCables: t ? Number(t) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="1\u20136"
                  placeholderTextColor={theme.textTertiary}
                  style={[
                    styles.numericInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>
            </View>
          </>
        )}

        {/* Conduit section */}
        {showConduit && (
          <>
            <ThemedText
              style={[styles.sectionTitle, { color: theme.text }]}
            >
              Nerve Conduit
            </ThemedText>

            <View style={styles.chipRow}>
              {CONDUIT_TYPES.map(({ value, label }) => {
                const selected = conduitDetails?.conduitType === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateConduit({ conduitType: value });
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? theme.accent
                          : theme.backgroundElevated,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: selected ? theme.buttonText : theme.text,
                      }}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Gap bridged */}
            <View style={styles.numericRow}>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Gap Bridged (mm)
                </ThemedText>
                <TextInput
                  value={conduitDetails?.gapBridgedMm?.toString() ?? ""}
                  onChangeText={(t) =>
                    updateConduit({
                      gapBridgedMm: t ? Number(t) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholder="mm"
                  placeholderTextColor={theme.textTertiary}
                  style={[
                    styles.numericInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Product
                </ThemedText>
                <TextInput
                  value={conduitDetails?.productName ?? ""}
                  onChangeText={(t) =>
                    updateConduit({
                      productName: t || undefined,
                    })
                  }
                  placeholder="e.g. NeuraGen"
                  placeholderTextColor={theme.textTertiary}
                  style={[
                    styles.numericInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </View>
            </View>
          </>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  numericRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  numericInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: 15,
    minHeight: 44,
  },
});
