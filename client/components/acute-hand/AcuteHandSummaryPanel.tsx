/**
 * AcuteHandSummaryPanel
 * ═════════════════════
 * Accept-mapping flow panel for acute hand diagnoses.
 * Modelled on SkinCancerSummaryPanel — same visual pattern, simpler logic.
 *
 * Shows:
 * 1. Summary card (diagnosis headline + key facts from HandInfectionDetails)
 * 2. Suggested procedures from diagnosis.suggestedProcedures
 * 3. Accept button → populates parent's procedure list
 * 4. Post-accept: green border, "Edit mapping" pill, coding details
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { HandInfectionDetails } from "@/types/handInfection";
import { generateHandInfectionSummary } from "@/types/handInfection";

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface AcuteHandSummaryPanelProps {
  diagnosis: DiagnosisPicklistEntry;
  handInfectionDetails?: HandInfectionDetails;
  isAccepted: boolean;
  acceptedProcedureIds?: string[];
  onAccept: (procedurePicklistIds: string[]) => void;
  onEditMapping?: () => void;
  onBrowseFullPicker?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function buildHeadline(diagnosis: DiagnosisPicklistEntry): string {
  return diagnosis.displayName;
}

function buildKeyFacts(
  diagnosis: DiagnosisPicklistEntry,
  infectionDetails?: HandInfectionDetails,
): string[] {
  const facts: string[] = [];
  const summary = generateHandInfectionSummary(infectionDetails);
  if (summary) {
    // Split the summary into individual facts for chip rendering
    const parts = summary.split(" · ");
    facts.push(...parts);
  }
  return facts;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function AcuteHandSummaryPanel({
  diagnosis,
  handInfectionDetails,
  isAccepted,
  acceptedProcedureIds,
  onAccept,
  onEditMapping,
  onBrowseFullPicker,
}: AcuteHandSummaryPanelProps) {
  const { theme } = useTheme();
  const [showCodingDetails, setShowCodingDetails] = useState(false);
  const wasAcceptedRef = useRef(isAccepted);

  const headline = useMemo(() => buildHeadline(diagnosis), [diagnosis]);
  const keyFacts = useMemo(
    () => buildKeyFacts(diagnosis, handInfectionDetails),
    [diagnosis, handInfectionDetails],
  );

  // Resolve suggested procedures from diagnosis picklist entry
  const suggestedProcedures = useMemo(() => {
    const suggestions = diagnosis.suggestedProcedures ?? [];
    return suggestions
      .slice()
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
      .map((s) => {
        const entry = findPicklistEntry(s.procedurePicklistId);
        return entry
          ? {
              id: s.procedurePicklistId,
              name: entry.displayName,
              isDefault: s.isDefault,
            }
          : null;
      })
      .filter(Boolean) as { id: string; name: string; isDefault: boolean }[];
  }, [diagnosis]);

  // Default selection: only procedures marked isDefault
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<Set<string>>(
    () =>
      new Set(suggestedProcedures.filter((p) => p.isDefault).map((p) => p.id)),
  );

  const acceptedProcedureIdSet = useMemo(
    () => new Set(acceptedProcedureIds ?? []),
    [acceptedProcedureIds],
  );

  useEffect(() => {
    const wasAccepted = wasAcceptedRef.current;
    wasAcceptedRef.current = isAccepted;

    let nextIds = suggestedProcedures
      .filter((p) => p.isDefault)
      .map((p) => p.id);
    if (isAccepted && acceptedProcedureIds && acceptedProcedureIds.length > 0) {
      nextIds = acceptedProcedureIds;
    } else if (
      !isAccepted &&
      wasAccepted &&
      acceptedProcedureIds &&
      acceptedProcedureIds.length > 0
    ) {
      nextIds = acceptedProcedureIds.filter((id) =>
        suggestedProcedures.some((p) => p.id === id),
      );
    }
    setSelectedProcedureIds(new Set(nextIds));
  }, [acceptedProcedureIds, isAccepted, suggestedProcedures]);

  const displayedProcedures = useMemo(() => {
    if (!isAccepted) {
      return suggestedProcedures;
    }
    return suggestedProcedures.filter((proc) =>
      acceptedProcedureIdSet.has(proc.id),
    );
  }, [acceptedProcedureIdSet, isAccepted, suggestedProcedures]);

  const selectedProcedureCount = selectedProcedureIds.size;

  const toggleProcedureSelection = (procedureId: string) => {
    if (isAccepted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProcedureIds((prev) => {
      const next = new Set(prev);
      if (next.has(procedureId)) {
        next.delete(procedureId);
      } else {
        next.add(procedureId);
      }
      return next;
    });
  };

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
                {headline}
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

        {/* Key facts */}
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

      {/* ── Suggested procedures ── */}
      {displayedProcedures.length > 0 ||
      (!isAccepted && suggestedProcedures.length > 0) ? (
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
            {(isAccepted ? displayedProcedures : suggestedProcedures).map(
              (proc) => {
                const isSelected = isAccepted
                  ? acceptedProcedureIdSet.has(proc.id)
                  : selectedProcedureIds.has(proc.id);
                return (
                  <Pressable
                    key={proc.id}
                    style={[
                      styles.procedureRow,
                      {
                        borderColor: isSelected
                          ? isAccepted
                            ? theme.success
                            : theme.link
                          : theme.border,
                        backgroundColor: isSelected
                          ? isAccepted
                            ? theme.success + "12"
                            : theme.link + "12"
                          : theme.backgroundSecondary,
                      },
                    ]}
                    onPress={() => toggleProcedureSelection(proc.id)}
                    disabled={isAccepted}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected
                            ? isAccepted
                              ? theme.success
                              : theme.link
                            : theme.border,
                          backgroundColor: isSelected
                            ? isAccepted
                              ? theme.success
                              : theme.link
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
              },
            )}

            {/* Browse full procedure picker link */}
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
        </>
      ) : null}

      {/* ── Accept button ── */}
      {isAccepted ? null : (
        <Pressable
          style={[
            styles.acceptButton,
            {
              backgroundColor:
                selectedProcedureCount > 0
                  ? theme.link
                  : theme.backgroundTertiary,
              opacity: selectedProcedureCount > 0 ? 1 : 0.6,
            },
          ]}
          onPress={() => {
            if (selectedProcedureCount === 0) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAccept([...selectedProcedureIds]);
          }}
          disabled={selectedProcedureCount === 0}
        >
          <Feather name="check" size={18} color={theme.buttonText} />
          <ThemedText
            style={[styles.acceptButtonText, { color: theme.buttonText }]}
          >
            Accept Mapping
          </ThemedText>
        </Pressable>
      )}

      {/* ── Coding details (collapsed by default) ── */}
      {isAccepted ? (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable
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
              {/* Diagnosis code */}
              <View style={styles.codingRow}>
                <ThemedText
                  style={[
                    styles.codingRowLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Diagnosis
                </ThemedText>
                <View style={styles.codingRowValue}>
                  <ThemedText
                    style={[styles.codingName, { color: theme.text }]}
                  >
                    {diagnosis.displayName}
                  </ThemedText>
                  {diagnosis.snomedCtCode ? (
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
                        SNOMED CT {diagnosis.snomedCtCode}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Procedure codes */}
              {displayedProcedures.length > 0 ? (
                <View style={styles.codingRow}>
                  <ThemedText
                    style={[
                      styles.codingRowLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Procedures
                  </ThemedText>
                  <View style={styles.codingProcedureList}>
                    {displayedProcedures.map((proc) => {
                      const entry = findPicklistEntry(proc.id);
                      return (
                        <View key={proc.id} style={styles.codingRowValue}>
                          <ThemedText
                            style={[styles.codingName, { color: theme.text }]}
                          >
                            {proc.name}
                          </ThemedText>
                          {entry?.snomedCtCode ? (
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
                                SNOMED CT {entry.snomedCtCode}
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
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

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

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
