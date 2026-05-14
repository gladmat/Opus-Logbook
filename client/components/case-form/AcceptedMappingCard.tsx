/**
 * AcceptedMappingCard
 * ═══════════════════
 * Shared accept-mapping visual extracted from `SkinCancerSummaryPanel`,
 * `AcuteHandSummaryPanel`, and `BreastSummaryPanel` so every specialty
 * module's accept flow lands on identical chrome (audit P3.2).
 *
 * Renders three states from the same shell:
 * 1. Pre-accept: assessment summary chip row + suggested-procedure
 *    selection list + Accept Mapping button.
 * 2. Post-accept: green-bordered summary + accepted-procedures list +
 *    "Edit mapping" pill + collapsible Coding details disclosure.
 *
 * The component is purely presentational — selection state, accept
 * gating, and module-specific data computation live in the wrapping
 * panel (SkinCancer/AcuteHand/Breast). Adding new modules to the
 * accept-mapping pattern is a matter of computing headline + key facts
 * + suggested/accepted procedure rows and passing them in.
 */

import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export interface AcceptedMappingProcedureRow {
  id: string;
  name: string;
  snomedCtCode?: string;
}

export interface AcceptedMappingCardProps {
  /** Whether the user has tapped Accept Mapping. */
  isAccepted: boolean;

  /** Headline (e.g. "BCC — cheek, left"). */
  headline: string;
  /** Summary chips below the headline. */
  keyFacts: string[];

  /** Suggested-procedure rows shown in the pre-accept selectable list. */
  suggestedProcedures: AcceptedMappingProcedureRow[];
  /** Currently-selected suggested-procedure IDs (controlled). */
  selectedSuggestedProcedureIds: Set<string>;
  /** Toggle handler for a suggested-procedure row. No-op when accepted. */
  onToggleSuggestedProcedure: (procedureId: string) => void;

  /**
   * Procedure rows shown in the post-accept "ACCEPTED PROCEDURES" list +
   * the Coding details disclosure. May include manually-added procedures
   * alongside accepted suggestions (e.g. Breast).
   */
  acceptedProcedures: AcceptedMappingProcedureRow[];

  /** Whether the Accept button is enabled. */
  canAccept: boolean;
  /** Tapped from the Accept Mapping button. */
  onAccept: () => void;
  /** Tapped from the post-accept Edit mapping pill. */
  onEditMapping?: () => void;

  /** Optional "Browse full procedure picker" link below the suggested rows. */
  onBrowseFullPicker?: () => void;

  /** Inline copy when no suggestions exist. */
  preAcceptEmptyHint?: string;
  /** Inline copy when accepted but the accepted-procedures list is empty. */
  postAcceptEmptyHint?: string;

  /** Coding-details disclosure: diagnosis row. */
  codingDiagnosis?: { displayName: string; snomedCtCode?: string };

  /** testIDs */
  containerTestID?: string;
  acceptButtonTestID?: string;
  editMappingTestID?: string;
  procedureRowTestIDPrefix?: string;
}

export function AcceptedMappingCard({
  isAccepted,
  headline,
  keyFacts,
  suggestedProcedures,
  selectedSuggestedProcedureIds,
  onToggleSuggestedProcedure,
  acceptedProcedures,
  canAccept,
  onAccept,
  onEditMapping,
  onBrowseFullPicker,
  preAcceptEmptyHint = "No suggested procedures for the current assessment.",
  postAcceptEmptyHint = "No accepted procedures recorded.",
  codingDiagnosis,
  containerTestID,
  acceptButtonTestID,
  editMappingTestID,
  procedureRowTestIDPrefix,
}: AcceptedMappingCardProps) {
  const { theme } = useTheme();
  const [showCodingDetails, setShowCodingDetails] = useState(false);

  const accentColor = isAccepted ? theme.success : theme.link;

  return (
    <View
      testID={containerTestID}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: isAccepted ? theme.success + "50" : theme.border,
        },
      ]}
    >
      {/* ── Summary card ── */}
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
                color={accentColor}
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
                {headline}
              </ThemedText>
            </View>
          </View>

          {isAccepted && onEditMapping ? (
            <Pressable
              testID={editMappingTestID}
              accessibilityRole="button"
              accessibilityLabel="Edit accepted mapping"
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

        {keyFacts.length > 0 ? (
          <View style={styles.keyFactsRow}>
            {keyFacts.map((fact) => (
              <View
                key={fact}
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
                  {fact}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* ── Procedure list (pre- or post-accept) ── */}
      {suggestedProcedures.length > 0 || acceptedProcedures.length > 0 ? (
        <>
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
                  style={[
                    styles.procedureHeaderHint,
                    { color: theme.textTertiary },
                  ]}
                >
                  Tap to include/exclude
                </ThemedText>
              ) : null}
            </View>

            {isAccepted ? (
              acceptedProcedures.length > 0 ? (
                acceptedProcedures.map((proc) => (
                  <View
                    key={proc.id}
                    testID={
                      procedureRowTestIDPrefix
                        ? `${procedureRowTestIDPrefix}-${proc.id}`
                        : undefined
                    }
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
                      <Feather
                        name="check"
                        size={12}
                        color={theme.buttonText}
                      />
                    </View>
                    <ThemedText
                      style={[styles.procedureName, { color: theme.text }]}
                    >
                      {proc.name}
                    </ThemedText>
                  </View>
                ))
              ) : (
                <ThemedText
                  style={[
                    styles.emptyProcedureText,
                    { color: theme.textTertiary },
                  ]}
                >
                  {postAcceptEmptyHint}
                </ThemedText>
              )
            ) : suggestedProcedures.length > 0 ? (
              suggestedProcedures.map((proc) => {
                const isSelected = selectedSuggestedProcedureIds.has(proc.id);
                return (
                  <Pressable
                    key={proc.id}
                    testID={
                      procedureRowTestIDPrefix
                        ? `${procedureRowTestIDPrefix}-${proc.id}`
                        : undefined
                    }
                    accessibilityRole="checkbox"
                    accessibilityLabel={proc.name}
                    accessibilityState={{ checked: isSelected }}
                    style={[
                      styles.procedureRow,
                      {
                        borderColor: isSelected ? theme.link : theme.border,
                        backgroundColor: isSelected
                          ? theme.link + "12"
                          : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => onToggleSuggestedProcedure(proc.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? theme.link : theme.border,
                          backgroundColor: isSelected
                            ? theme.link
                            : "transparent",
                        },
                      ]}
                    >
                      {isSelected ? (
                        <Feather
                          name="check"
                          size={12}
                          color={theme.buttonText}
                        />
                      ) : null}
                    </View>
                    <ThemedText
                      style={[styles.procedureName, { color: theme.text }]}
                    >
                      {proc.name}
                    </ThemedText>
                  </Pressable>
                );
              })
            ) : (
              <ThemedText
                style={[
                  styles.emptyProcedureText,
                  { color: theme.textTertiary },
                ]}
              >
                {preAcceptEmptyHint}
              </ThemedText>
            )}

            {!isAccepted && onBrowseFullPicker ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Browse full procedure picker"
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
        </>
      ) : null}

      {/* ── Accept button ── */}
      {!isAccepted ? (
        <Pressable
          testID={acceptButtonTestID}
          accessibilityRole="button"
          accessibilityLabel="Accept Mapping"
          accessibilityState={{ disabled: !canAccept }}
          style={[
            styles.acceptButton,
            {
              backgroundColor: canAccept
                ? theme.link
                : theme.backgroundTertiary,
              opacity: canAccept ? 1 : 0.6,
            },
          ]}
          onPress={() => {
            if (!canAccept) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAccept();
          }}
          disabled={!canAccept}
        >
          <Feather name="check" size={18} color={theme.buttonText} />
          <ThemedText
            style={[styles.acceptButtonText, { color: theme.buttonText }]}
          >
            Accept Mapping
          </ThemedText>
        </Pressable>
      ) : null}

      {/* ── Coding details disclosure (post-accept only) ── */}
      {isAccepted ? (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Coding details"
            accessibilityState={{ expanded: showCodingDetails }}
            style={styles.codingDisclosureRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCodingDetails((v) => !v);
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
              {codingDiagnosis ? (
                <View style={styles.codingRow}>
                  <ThemedText
                    style={[
                      styles.codingRowLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    DIAGNOSIS
                  </ThemedText>
                  <View style={styles.codingRowValue}>
                    <ThemedText
                      style={[styles.codingName, { color: theme.text }]}
                    >
                      {codingDiagnosis.displayName}
                    </ThemedText>
                    {codingDiagnosis.snomedCtCode ? (
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
                          SNOMED CT {codingDiagnosis.snomedCtCode}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {acceptedProcedures.length > 0 ? (
                <View style={styles.codingRow}>
                  <ThemedText
                    style={[
                      styles.codingRowLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    PROCEDURES
                  </ThemedText>
                  <View style={styles.codingProcedureList}>
                    {acceptedProcedures.map((proc) => (
                      <View key={proc.id} style={styles.codingRowValue}>
                        <ThemedText
                          style={[styles.codingName, { color: theme.text }]}
                        >
                          {proc.name}
                        </ThemedText>
                        {proc.snomedCtCode ? (
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
                              SNOMED CT {proc.snomedCtCode}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
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
    letterSpacing: 0.5,
  },
  summaryHeadline: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
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
    gap: 6,
    marginTop: 2,
  },
  keyFactChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  keyFactText: {
    fontSize: 11,
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  procedureHeaderHint: {
    fontSize: 11,
    fontWeight: "500",
  },
  procedureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
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
    paddingVertical: 6,
  },
  browsePickerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  acceptButton: {
    borderRadius: BorderRadius.sm,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  codingDisclosureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  codingDisclosureLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  codingDetailsContainer: {
    gap: Spacing.md,
  },
  codingRow: {
    gap: 4,
  },
  codingRowLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  codingRowValue: {
    gap: 4,
  },
  codingName: {
    fontSize: 13,
    fontWeight: "500",
  },
  snomedTag: {
    alignSelf: "flex-start",
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  snomedTagText: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily: "monospace",
  },
  codingProcedureList: {
    gap: Spacing.sm,
  },
});
