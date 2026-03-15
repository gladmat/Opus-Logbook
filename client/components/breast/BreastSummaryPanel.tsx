import React, { useMemo, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { CaseProcedure } from "@/types/case";
import { findPicklistEntry } from "@/lib/procedurePicklist";

interface SuggestedProcedure {
  id: string;
  name: string;
}

interface BreastSummaryPanelProps {
  diagnosisName: string;
  diagnosisCode?: string;
  summaryChips: string[];
  suggestedProcedures: SuggestedProcedure[];
  selectedSuggestedProcedureIds: Set<string>;
  acceptedProcedures: CaseProcedure[];
  draftProcedureCount: number;
  isAccepted: boolean;
  onToggleSuggestedProcedure: (procedureId: string) => void;
  onBrowseFullPicker?: () => void;
  onAccept: () => void;
  onEditMapping?: () => void;
}

export function BreastSummaryPanel({
  diagnosisName,
  diagnosisCode,
  summaryChips,
  suggestedProcedures,
  selectedSuggestedProcedureIds,
  acceptedProcedures,
  draftProcedureCount,
  isAccepted,
  onToggleSuggestedProcedure,
  onBrowseFullPicker,
  onAccept,
  onEditMapping,
}: BreastSummaryPanelProps) {
  const { theme } = useTheme();
  const [showCodingDetails, setShowCodingDetails] = useState(false);

  const acceptedRows = useMemo(
    () =>
      acceptedProcedures
        .filter((procedure) => procedure.procedureName.trim().length > 0)
        .map((procedure) => ({
          id: procedure.id,
          name: procedure.procedureName,
          code:
            procedure.snomedCtCode ||
            (procedure.picklistEntryId
              ? findPicklistEntry(procedure.picklistEntryId)?.snomedCtCode
              : undefined),
        })),
    [acceptedProcedures],
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: isAccepted ? theme.success + "50" : theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.summaryShell,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isAccepted ? theme.success + "50" : theme.border,
          },
        ]}
      >
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryTopLeft}>
            <View
              style={[
                styles.summaryIconWrap,
                {
                  backgroundColor: isAccepted
                    ? theme.success + "18"
                    : theme.link + "14",
                },
              ]}
            >
              <Feather
                name={isAccepted ? "check-circle" : "clipboard"}
                size={16}
                color={isAccepted ? theme.success : theme.link}
              />
            </View>
            <View style={styles.summaryTextWrap}>
              <ThemedText
                style={[
                  styles.summaryEyebrow,
                  {
                    color: isAccepted ? theme.success : theme.textSecondary,
                  },
                ]}
              >
                {isAccepted ? "MAPPING ACCEPTED" : "ASSESSMENT SUMMARY"}
              </ThemedText>
              <ThemedText
                style={[styles.summaryHeadline, { color: theme.text }]}
              >
                {diagnosisName}
              </ThemedText>
            </View>
          </View>

          {isAccepted && onEditMapping ? (
            <Pressable
              style={[
                styles.inlineActionPill,
                {
                  backgroundColor: theme.backgroundTertiary,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onEditMapping();
              }}
            >
              <Feather name="edit-3" size={13} color={theme.link} />
              <ThemedText
                style={[styles.inlineActionText, { color: theme.link }]}
              >
                Edit mapping
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {summaryChips.length > 0 ? (
          <View style={styles.keyFactsRow}>
            {summaryChips.map((chip) => (
              <View
                key={chip}
                style={[
                  styles.keyFactChip,
                  {
                    backgroundColor: theme.backgroundTertiary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText
                  style={[styles.keyFactText, { color: theme.textSecondary }]}
                >
                  {chip}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <View style={styles.procedureSection}>
        <View style={styles.procedureHeaderRow}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            {isAccepted ? "ACCEPTED PROCEDURES" : "SUGGESTED PROCEDURES"}
          </ThemedText>
          {!isAccepted ? (
            <ThemedText
              style={[styles.procedureHeaderHint, { color: theme.textTertiary }]}
            >
              Tap to include/exclude
            </ThemedText>
          ) : null}
        </View>

        {isAccepted ? (
          acceptedRows.length > 0 ? (
            acceptedRows.map((procedure) => (
              <View
                key={procedure.id}
                style={[
                  styles.procedureRow,
                  {
                    borderColor: theme.success,
                    backgroundColor: theme.success + "12",
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: theme.success,
                      backgroundColor: theme.success,
                    },
                  ]}
                >
                  <Feather name="check" size={12} color={theme.buttonText} />
                </View>
                <ThemedText
                  style={[styles.procedureName, { color: theme.text }]}
                >
                  {procedure.name}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText
              style={[styles.emptyProcedureText, { color: theme.textTertiary }]}
            >
              No accepted procedures recorded.
            </ThemedText>
          )
        ) : suggestedProcedures.length > 0 ? (
          suggestedProcedures.map((procedure) => {
            const isSelected = selectedSuggestedProcedureIds.has(procedure.id);
            return (
              <Pressable
                key={procedure.id}
                style={[
                  styles.procedureRow,
                  {
                    borderColor: isSelected ? theme.link : theme.border,
                    backgroundColor: isSelected
                      ? theme.link + "12"
                      : theme.backgroundSecondary,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleSuggestedProcedure(procedure.id);
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected ? theme.link : theme.border,
                      backgroundColor: isSelected ? theme.link : "transparent",
                    },
                  ]}
                >
                  {isSelected ? (
                    <Feather name="check" size={12} color={theme.buttonText} />
                  ) : null}
                </View>
                <ThemedText
                  style={[styles.procedureName, { color: theme.text }]}
                >
                  {procedure.name}
                </ThemedText>
              </Pressable>
            );
          })
        ) : (
          <ThemedText
            style={[styles.emptyProcedureText, { color: theme.textTertiary }]}
          >
            No suggested procedures for this diagnosis yet.
          </ThemedText>
        )}

        {!isAccepted && onBrowseFullPicker ? (
          <Pressable
            style={styles.browsePickerRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBrowseFullPicker();
            }}
          >
            <Feather name="list" size={14} color={theme.link} />
            <ThemedText
              style={[styles.browsePickerText, { color: theme.link }]}
            >
              Browse full procedure picker
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {!isAccepted ? (
        <Pressable
          style={[
            styles.acceptButton,
            {
              backgroundColor:
                draftProcedureCount > 0
                  ? theme.link
                  : theme.backgroundTertiary,
              opacity: draftProcedureCount > 0 ? 1 : 0.6,
            },
          ]}
          onPress={() => {
            if (draftProcedureCount === 0) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAccept();
          }}
          disabled={draftProcedureCount === 0}
        >
          <Feather name="check" size={18} color={theme.buttonText} />
          <ThemedText
            style={[styles.acceptButtonText, { color: theme.buttonText }]}
          >
            Accept Mapping
          </ThemedText>
        </Pressable>
      ) : (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            style={styles.codingDisclosureRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCodingDetails((value) => !value);
            }}
          >
            <ThemedText
              style={[
                styles.codingDisclosureLabel,
                { color: theme.textSecondary },
              ]}
            >
              Coding details
            </ThemedText>
            <Feather
              name={showCodingDetails ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.textSecondary}
            />
          </Pressable>

          {showCodingDetails ? (
            <View style={styles.codingDetailsContainer}>
              <View style={styles.codingRow}>
                <ThemedText
                  style={[styles.codingRowLabel, { color: theme.textSecondary }]}
                >
                  DIAGNOSIS
                </ThemedText>
                <View style={styles.codingRowValue}>
                  <ThemedText style={[styles.codingName, { color: theme.text }]}>
                    {diagnosisName}
                  </ThemedText>
                  {diagnosisCode ? (
                    <View
                      style={[
                        styles.snomedTag,
                        {
                          backgroundColor: theme.backgroundTertiary,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.snomedTagText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        SNOMED CT {diagnosisCode}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.codingRow}>
                <ThemedText
                  style={[styles.codingRowLabel, { color: theme.textSecondary }]}
                >
                  PROCEDURES
                </ThemedText>
                <View style={styles.codingProcedureList}>
                  {acceptedRows.map((procedure) => (
                    <View key={procedure.id} style={styles.codingRowValue}>
                      <ThemedText
                        style={[styles.codingName, { color: theme.text }]}
                      >
                        {procedure.name}
                      </ThemedText>
                      {procedure.code ? (
                        <View
                          style={[
                            styles.snomedTag,
                            {
                              backgroundColor: theme.backgroundTertiary,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.snomedTagText,
                              { color: theme.textSecondary },
                            ]}
                          >
                            SNOMED CT {procedure.code}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  summaryShell: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  summaryTopLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  summaryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextWrap: {
    flex: 1,
    gap: 2,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  summaryHeadline: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
  inlineActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  keyFactsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  keyFactChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  keyFactText: {
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
  },
  procedureSection: {
    gap: Spacing.sm,
  },
  procedureHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  procedureHeaderHint: {
    fontSize: 12,
  },
  procedureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  procedureName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyProcedureText: {
    fontSize: 13,
    lineHeight: 18,
  },
  browsePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: Spacing.xs,
  },
  browsePickerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  codingDisclosureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codingDisclosureLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  codingDetailsContainer: {
    gap: Spacing.md,
  },
  codingRow: {
    gap: Spacing.xs,
  },
  codingRowLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  codingRowValue: {
    gap: 6,
  },
  codingProcedureList: {
    gap: Spacing.sm,
  },
  codingName: {
    fontSize: 14,
    fontWeight: "500",
  },
  snomedTag: {
    alignSelf: "flex-start",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  snomedTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
