import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Fonts, Spacing } from "@/constants/theme";
import type { CaseProcedure } from "@/types/case";
import type {
  CodingReference,
  TraumaDiagnosisPair,
  TraumaMappingResult,
  TraumaProcedureSuggestion,
} from "@/lib/handTraumaMapping";
import {
  buildHeaderLine,
  generateDiagnosisText,
  type DiagnosisRenderMode,
} from "@/lib/handTraumaDiagnosis";

interface DiagnosisProcedureSuggestionPanelProps {
  mappingResult: TraumaMappingResult | null;
  acceptedMappingResult?: TraumaMappingResult | null;
  appliedProcedures?: CaseProcedure[];
  selectedProcedureIds: Set<string>;
  acceptedProcedureIds?: Set<string>;
  isAccepted?: boolean;
  hasPendingChanges?: boolean;
  onSelectProcedure: (
    pair: TraumaDiagnosisPair,
    procedureId: string,
  ) => void;
  onAccept: (selectedProcedureIds: string[]) => void;
  onEditMapping?: () => void;
  onEditDiagnosis?: () => void;
  onReviewProcedures?: () => void;
  hasStructureProcedures?: boolean;
  structureProcedureCount?: number;
}

const RENDER_OPTIONS: {
  mode: DiagnosisRenderMode;
  label: string;
}[] = [
  { mode: "shorthand_english", label: "Shorthand" },
  { mode: "full_english", label: "Full" },
  { mode: "latin_medical", label: "Latin" },
];

const COMPACT_PROCEDURE_LABELS: Record<string, string> = {
  hand_fx_metacarpal_orif: "ORIF",
  hand_fx_metacarpal_crif: "CRIF + K-wire",
  hand_fx_metacarpal_crif_ccs: "CRIF + CCS",
  hand_fx_metacarpal_exfix: "CRIF + Ex-Fix",
  hand_fx_phalanx_orif: "ORIF",
  hand_fx_phalanx_crif: "CRIF + K-wire",
  hand_fx_phalanx_crif_ccs: "CRIF + CCS",
  hand_fx_phalanx_exfix: "CRIF + Ex-Fix",
  hand_lig_ucl_repair: "Repair",
  hand_lig_ucl_reconstruction: "Reconstruction",
  hand_disloc_pip_cr: "Closed reduction",
  hand_disloc_pip_extension_block_kwire: "Ext-block K-wire",
  hand_disloc_pip_volar_plate_arthroplasty: "Volar plate arthroplasty",
  hand_disloc_pip_hemihamate: "Hemi-hamate",
  hand_disloc_mcp_cr: "Closed reduction",
  hand_disloc_mcp_open_reduction: "Open reduction",
  hand_disloc_cmc_crif: "CRIF + K-wire",
  hand_disloc_perilunate_orif: "Open reduction + repair",
  hand_disloc_druj_reduction_kwire: "Reduction + K-wire",
  hand_disloc_druj_tfcc_repair: "TFCC repair",
  // Nerve repair strategies
  hand_nerve_digital_repair: "Primary repair",
  hand_nerve_median_repair: "Primary repair",
  hand_nerve_ulnar_repair: "Primary repair",
  hand_nerve_radial_repair: "Primary repair",
  hand_nerve_graft: "Nerve graft",
  hand_nerve_conduit: "Conduit",
  // Vessel repair strategies
  hand_vasc_digital_artery_repair: "Primary repair",
  hand_vasc_radial_artery_repair: "Primary repair",
  hand_vasc_ulnar_artery_repair: "Primary repair",
  hand_vasc_palmar_arch_repair: "Primary repair",
  hand_vasc_vein_graft: "Vein graft",
  hand_cov_revascularisation: "Revascularisation",
};

/* ── Composite-key helpers for per-pair procedure selection ── */
const PAIR_SEP = "::";
function compositeId(pairKey: string, procedureId: string): string {
  return `${pairKey}${PAIR_SEP}${procedureId}`;
}
function extractProcedureId(composite: string): string {
  const idx = composite.indexOf(PAIR_SEP);
  return idx >= 0 ? composite.slice(idx + PAIR_SEP.length) : composite;
}
function isSelectedForPair(
  pairKey: string,
  procedureId: string,
  selectedIds: Set<string>,
): boolean {
  return selectedIds.has(compositeId(pairKey, procedureId));
}
function flattenSelections(selectedIds: Set<string>): string[] {
  return [...new Set([...selectedIds].map(extractProcedureId))];
}

function formatCodingSystem(system: string): string {
  return system === "SNOMED_CT" ? "SNOMED CT" : system.replace(/_/g, " ");
}

function dedupeCodes(codes: CodingReference[] | undefined): CodingReference[] {
  const seen = new Set<string>();
  const deduped: CodingReference[] = [];

  for (const code of codes ?? []) {
    const key = `${code.system}|${code.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(code);
  }

  return deduped;
}

function getCompactProcedureLabel(
  procedure: TraumaProcedureSuggestion,
): string {
  return (
    COMPACT_PROCEDURE_LABELS[procedure.procedurePicklistId] ??
    procedure.displayName
  );
}

function buildDiagnosisCodingItems(mappingResult: TraumaMappingResult) {
  const seen = new Set<string>();

  return mappingResult.pairs.flatMap((pair) => {
    const key =
      pair.diagnosis.diagnosisPicklistId ||
      `${pair.source}:${pair.diagnosis.displayName}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        key,
        title: pair.diagnosis.displayName,
        codes: dedupeCodes(
          pair.diagnosis.codes ??
            (pair.diagnosis.snomedCtCode
              ? [
                  {
                    system: "SNOMED_CT",
                    code: pair.diagnosis.snomedCtCode,
                    displayName: pair.diagnosis.displayName,
                  },
                ]
              : []),
        ),
      },
    ];
  });
}

function buildProcedureCodingItems(
  mappingResult: TraumaMappingResult,
  selectedProcedureIds: Set<string>,
  appliedProcedures: CaseProcedure[] = [],
) {
  if (appliedProcedures.length > 0) {
    return appliedProcedures
      .filter((procedure) => procedure.procedureName.trim())
      .map((procedure) => {
        const codes: CodingReference[] = [];
        if (procedure.snomedCtCode) {
          codes.push({
            system: "SNOMED_CT",
            code: procedure.snomedCtCode,
            displayName: procedure.snomedCtDisplay ?? procedure.procedureName,
          });
        }
        if (procedure.localCode) {
          codes.push({
            system: procedure.localCodeSystem || "LOCAL",
            code: procedure.localCode,
            displayName: procedure.procedureName,
          });
        }

        return {
          key: procedure.id,
          title: procedure.procedureName,
          codes: dedupeCodes(codes),
        };
      });
  }

  const byId = new Map<string, TraumaProcedureSuggestion>();

  for (const pair of mappingResult.pairs) {
    for (const procedure of pair.suggestedProcedures) {
      if (!isSelectedForPair(pair.key, procedure.procedurePicklistId, selectedProcedureIds)) continue;
      if (byId.has(procedure.procedurePicklistId)) continue;
      byId.set(procedure.procedurePicklistId, procedure);
    }
  }

  return Array.from(byId.values()).map((procedure) => ({
    key: procedure.procedurePicklistId,
    title: procedure.displayName,
    codes: dedupeCodes(procedure.codes),
  }));
}

function buildRenderedDiagnosis(
  mappingResult: TraumaMappingResult,
  mode: DiagnosisRenderMode,
): string[] {
  if (mode === "shorthand_english") {
    return mappingResult.diagnosisTextShort.split("\n");
  }

  const headerLine = buildHeaderLine(mappingResult.machineSummary, mode);
  const bullets = generateDiagnosisText(mappingResult.machineSummary, mode, "long");
  return [headerLine, ...bullets.map((line) => `- ${line}`)];
}

function getPairSelection(
  pair: TraumaDiagnosisPair,
  selectedProcedureIds: Set<string>,
) {
  return pair.suggestedProcedures.filter((procedure) =>
    isSelectedForPair(pair.key, procedure.procedurePicklistId, selectedProcedureIds),
  );
}

export function DiagnosisProcedureSuggestionPanel({
  mappingResult,
  acceptedMappingResult,
  appliedProcedures = [],
  selectedProcedureIds,
  acceptedProcedureIds,
  isAccepted = false,
  hasPendingChanges = false,
  onSelectProcedure,
  onAccept,
  onEditMapping,
  onEditDiagnosis,
  onReviewProcedures,
  hasStructureProcedures,
  structureProcedureCount = 0,
}: DiagnosisProcedureSuggestionPanelProps) {
  const { theme } = useTheme();
  const [renderMode, setRenderMode] =
    useState<DiagnosisRenderMode>("shorthand_english");
  const [showFullDiagnosis, setShowFullDiagnosis] = useState(false);
  const [showCodingDetails, setShowCodingDetails] = useState(false);

  const activeMappingResult =
    isAccepted && acceptedMappingResult ? acceptedMappingResult : mappingResult;
  const activeProcedureIds =
    isAccepted && acceptedProcedureIds
      ? acceptedProcedureIds
      : selectedProcedureIds;

  useEffect(() => {
    setRenderMode("shorthand_english");
    setShowFullDiagnosis(false);
    setShowCodingDetails(false);
  }, [activeMappingResult?.summaryDiagnosisDisplay, isAccepted]);

  const renderedDiagnosis = useMemo(
    () =>
      activeMappingResult
        ? buildRenderedDiagnosis(activeMappingResult, renderMode)
        : [],
    [activeMappingResult, renderMode],
  );
  const diagnosisCodingItems = useMemo(
    () =>
      activeMappingResult ? buildDiagnosisCodingItems(activeMappingResult) : [],
    [activeMappingResult],
  );
  const procedureCodingItems = useMemo(
    () =>
      activeMappingResult
        ? buildProcedureCodingItems(
            activeMappingResult,
            activeProcedureIds,
            appliedProcedures,
          )
        : [],
    [activeMappingResult, activeProcedureIds, appliedProcedures],
  );

  const hasDiagnosis = activeMappingResult !== null;
  const hasProcedures =
    (activeMappingResult?.suggestedProcedures.length ?? 0) > 0 ||
    hasStructureProcedures;
  const isEmpty = !hasDiagnosis && !hasStructureProcedures;

  if (isEmpty) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      {hasPendingChanges && !isAccepted ? (
        <View
          style={[
            styles.stateBanner,
            {
              backgroundColor: theme.warning + "14",
              borderColor: theme.warning + "30",
            },
          ]}
        >
          <Feather name="alert-circle" size={15} color={theme.warning} />
          <ThemedText style={[styles.stateBannerText, { color: theme.warning }]}>
            Trauma selections changed. Review and accept the mapping again to
            refresh the coded diagnosis and procedures.
          </ThemedText>
        </View>
      ) : null}

      {activeMappingResult ? (
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
                  {isAccepted ? "MAPPING ACCEPTED" : "TRAUMA SUMMARY"}
                </ThemedText>
                <ThemedText style={[styles.summaryHeadline, { color: theme.text }]}>
                  {activeMappingResult.summaryDiagnosisDisplay}
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
                <ThemedText style={[styles.inlineActionText, { color: theme.link }]}>
                  Edit mapping
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            style={styles.disclosureRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFullDiagnosis((prev) => !prev);
            }}
          >
            <Feather
              name={showFullDiagnosis ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.link}
            />
            <ThemedText style={[styles.disclosureText, { color: theme.link }]}>
              {showFullDiagnosis
                ? "Hide full diagnosis text"
                : "View full diagnosis text"}
            </ThemedText>
          </Pressable>

          {showFullDiagnosis ? (
            <View style={styles.expandedSummary}>
              <View style={styles.modeRow}>
                {RENDER_OPTIONS.map((option) => {
                  const isSelected = renderMode === option.mode;
                  return (
                    <Pressable
                      key={option.mode}
                      style={[
                        styles.modePill,
                        {
                          backgroundColor: isSelected
                            ? theme.link
                            : theme.backgroundTertiary,
                          borderColor: isSelected ? theme.link : theme.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setRenderMode(option.mode);
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.modePillText,
                          {
                            color: isSelected ? theme.buttonText : theme.text,
                          },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={[
                  styles.renderedDiagnosisCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                {renderedDiagnosis.map((line, index) => (
                  <ThemedText
                    key={`${renderMode}-${index}`}
                    style={[
                      index === 0 ? styles.renderedHeader : styles.renderedBullet,
                      {
                        color: index === 0 ? theme.text : theme.textSecondary,
                        fontFamily:
                          renderMode === "latin_medical" ? Fonts?.mono : undefined,
                      },
                    ]}
                  >
                    {line}
                  </ThemedText>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {activeMappingResult && hasProcedures ? (
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      ) : null}

      {activeMappingResult && activeMappingResult.pairs.length > 0 ? (
        <View style={styles.pairsSection}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            {isAccepted
              ? "ACCEPTED DIAGNOSIS -> PROCEDURE PAIRS"
              : "REVIEW DIAGNOSIS -> PROCEDURE PAIRS"}
          </ThemedText>

          {activeMappingResult.pairs.map((pair) => {
            const selectedForPair = getPairSelection(pair, activeProcedureIds);
            const pairProcedures = isAccepted
              ? selectedForPair
              : pair.suggestedProcedures;

            return (
              <View
                key={pair.key}
                style={[
                  styles.pairCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.pairHeader}>
                  <Feather
                    name={isAccepted ? "check-circle" : "arrow-right-circle"}
                    size={15}
                    color={isAccepted ? theme.success : theme.link}
                  />
                  <View style={styles.pairHeaderText}>
                    <ThemedText
                      style={[styles.pairDiagnosis, { color: theme.text }]}
                    >
                      {pair.diagnosis.displayName}
                    </ThemedText>
                    {pair.selectionMode === "single" &&
                    pair.suggestedProcedures.length > 1 &&
                    !isAccepted ? (
                      <ThemedText
                        style={[
                          styles.pairMeta,
                          { color: theme.textTertiary },
                        ]}
                      >
                        Select one fixation / procedure option
                      </ThemedText>
                    ) : null}
                  </View>
                </View>

                {pairProcedures.length > 0 ? (
                  !isAccepted && pair.selectionMode === "single" ? (
                    <View style={styles.compactProcedureGroup}>
                      <View style={styles.compactProcedureRow}>
                        {pairProcedures.map((procedure) => {
                          const isChecked = isSelectedForPair(
                            pair.key,
                            procedure.procedurePicklistId,
                            activeProcedureIds,
                          );

                          return (
                            <Pressable
                              key={`${pair.key}-${procedure.procedurePicklistId}`}
                              style={[
                                styles.compactProcedureChip,
                                {
                                  backgroundColor: isChecked
                                    ? theme.link
                                    : theme.backgroundSecondary,
                                  borderColor: isChecked
                                    ? theme.link
                                    : theme.border,
                                },
                              ]}
                              onPress={() => {
                                Haptics.impactAsync(
                                  Haptics.ImpactFeedbackStyle.Light,
                                );
                                onSelectProcedure(
                                  pair,
                                  procedure.procedurePicklistId,
                                );
                              }}
                            >
                              <ThemedText
                                style={[
                                  styles.compactProcedureChipText,
                                  {
                                    color: isChecked
                                      ? theme.buttonText
                                      : theme.text,
                                  },
                                ]}
                              >
                                {getCompactProcedureLabel(procedure)}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </View>
                      {pairProcedures.some((procedure) => procedure.isDefault) ? (
                        <ThemedText
                          style={[styles.pairMeta, { color: theme.textTertiary }]}
                        >
                          Default option is preselected. Open the full procedure
                          editor only if the mapping is wrong.
                        </ThemedText>
                      ) : null}
                    </View>
                  ) : (
                    pairProcedures.map((procedure) => {
                      const isChecked = isSelectedForPair(
                        pair.key,
                        procedure.procedurePicklistId,
                        activeProcedureIds,
                      );
                      const isSingle = pair.selectionMode === "single";

                      return (
                        <Pressable
                          key={`${pair.key}-${procedure.procedurePicklistId}`}
                          style={[
                            styles.procedureRow,
                            {
                              borderColor: isChecked ? theme.link : theme.border,
                              backgroundColor: isChecked
                                ? theme.link + "12"
                                : theme.backgroundSecondary,
                              opacity: isAccepted ? 1 : undefined,
                            },
                          ]}
                          onPress={() => {
                            if (isAccepted) return;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelectProcedure(
                              pair,
                              procedure.procedurePicklistId,
                            );
                          }}
                          disabled={isAccepted}
                        >
                          <View
                            style={[
                              isSingle ? styles.radio : styles.checkbox,
                              {
                                borderColor: isChecked ? theme.link : theme.border,
                                backgroundColor: isChecked
                                  ? theme.link
                                  : "transparent",
                              },
                            ]}
                          >
                            {isChecked ? (
                              <Feather
                                name={isSingle ? "circle" : "check"}
                                size={isSingle ? 8 : 12}
                                color={theme.buttonText}
                              />
                            ) : null}
                          </View>

                          <View style={styles.procedureTextGroup}>
                            <View style={styles.procedureTitleRow}>
                              <ThemedText
                                style={[
                                  styles.procedureName,
                                  { color: theme.text },
                                ]}
                                numberOfLines={2}
                              >
                                {procedure.displayName}
                              </ThemedText>
                              {!isAccepted && procedure.isDefault ? (
                                <View
                                  style={[
                                    styles.recommendedBadge,
                                    { backgroundColor: theme.link + "14" },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.recommendedBadgeText,
                                      { color: theme.link },
                                    ]}
                                  >
                                    Default
                                  </ThemedText>
                                </View>
                              ) : null}
                            </View>
                            {procedure.reason ? (
                              <ThemedText
                                style={[
                                  styles.procedureReason,
                                  { color: theme.textTertiary },
                                ]}
                                numberOfLines={2}
                              >
                                {procedure.reason}
                              </ThemedText>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })
                  )
                ) : isAccepted ? (
                  <ThemedText
                    style={[styles.emptyPairText, { color: theme.textTertiary }]}
                  >
                    No mapped procedure selected for this injury pattern
                  </ThemedText>
                ) : (
                  <ThemedText
                    style={[styles.emptyPairText, { color: theme.textTertiary }]}
                  >
                    No direct procedure suggestion for this injury pattern
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      {hasStructureProcedures ? (
        <View style={styles.structureNote}>
          <Feather name="layers" size={14} color={theme.textSecondary} />
          <ThemedText
            style={[styles.structureNoteText, { color: theme.textSecondary }]}
          >
            {structureProcedureCount} procedure
            {structureProcedureCount !== 1 ? "s" : ""} already added from
            direct structure selections
          </ThemedText>
        </View>
      ) : null}

      {onReviewProcedures ? (
        <Pressable
          style={styles.linkRow}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onReviewProcedures();
          }}
        >
          <Feather name="list" size={13} color={theme.link} />
          <ThemedText style={[styles.linkText, { color: theme.link }]}>
            Open full procedure editor
          </ThemedText>
        </Pressable>
      ) : null}

      {isAccepted && activeMappingResult ? (
        <View
          style={[
            styles.codingShell,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <Pressable
            style={styles.disclosureRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCodingDetails((prev) => !prev);
            }}
          >
            <Feather
              name={showCodingDetails ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.link}
            />
            <ThemedText style={[styles.disclosureText, { color: theme.link }]}>
              {showCodingDetails ? "Hide coding details" : "Coding details"}
            </ThemedText>
          </Pressable>

          {showCodingDetails ? (
            <View style={styles.codingBody}>
              <View style={styles.codeGroup}>
                <ThemedText
                  style={[styles.codeLabel, { color: theme.textSecondary }]}
                >
                  Diagnoses
                </ThemedText>
                {diagnosisCodingItems.map((item) => (
                  <View
                    key={item.key}
                    style={[
                      styles.codeItem,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <ThemedText style={[styles.codeValue, { color: theme.text }]}>
                      {item.title}
                    </ThemedText>
                    {item.codes.length > 0 ? (
                      <View style={styles.codeTagRow}>
                        {item.codes.map((code) => (
                          <View
                            key={`${item.key}-${code.system}-${code.code}`}
                            style={[
                              styles.codeTag,
                              {
                                backgroundColor: theme.backgroundDefault,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.codeTagText,
                                {
                                  color: theme.textSecondary,
                                  fontFamily: Fonts?.mono,
                                },
                              ]}
                            >
                              {`${formatCodingSystem(code.system)} ${code.code}`}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <ThemedText
                        style={[styles.emptyPairText, { color: theme.textTertiary }]}
                      >
                        No structured code linked to this diagnosis yet
                      </ThemedText>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.codeGroup}>
                <ThemedText
                  style={[styles.codeLabel, { color: theme.textSecondary }]}
                >
                  Procedures
                </ThemedText>
                {procedureCodingItems.length > 0 ? (
                  procedureCodingItems.map((item) => (
                    <View
                      key={item.key}
                      style={[
                        styles.codeItem,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <ThemedText style={[styles.codeValue, { color: theme.text }]}>
                        {item.title}
                      </ThemedText>
                      {item.codes.length > 0 ? (
                        <View style={styles.codeTagRow}>
                          {item.codes.map((code) => (
                            <View
                              key={`${item.key}-${code.system}-${code.code}`}
                              style={[
                                styles.codeTag,
                                {
                                  backgroundColor: theme.backgroundDefault,
                                  borderColor: theme.border,
                                },
                              ]}
                            >
                              <ThemedText
                                style={[
                                  styles.codeTagText,
                                  {
                                    color: theme.textSecondary,
                                    fontFamily: Fonts?.mono,
                                  },
                                ]}
                              >
                                {`${formatCodingSystem(code.system)} ${code.code}`}
                              </ThemedText>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <ThemedText
                          style={[styles.emptyPairText, { color: theme.textTertiary }]}
                        >
                          No structured code linked to this procedure yet
                        </ThemedText>
                      )}
                    </View>
                  ))
                ) : (
                  <ThemedText
                    style={[styles.emptyPairText, { color: theme.textTertiary }]}
                  >
                    No accepted procedure codes yet
                  </ThemedText>
                )}
              </View>

              {onEditDiagnosis ? (
                <Pressable
                  style={styles.linkRow}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onEditDiagnosis();
                  }}
                >
                  <Feather name="edit-3" size={13} color={theme.link} />
                  <ThemedText style={[styles.linkText, { color: theme.link }]}>
                    Change diagnosis manually
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <Pressable
            style={[styles.acceptButton, { backgroundColor: theme.link }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAccept([...selectedProcedureIds]);
            }}
          >
            <Feather name="check" size={18} color={theme.buttonText} />
            <ThemedText
              style={[styles.acceptButtonText, { color: theme.buttonText }]}
            >
              Accept Mapping
            </ThemedText>
          </Pressable>
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
  stateBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  stateBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
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
  disclosureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  disclosureText: {
    fontSize: 12,
    fontWeight: "600",
  },
  expandedSummary: {
    gap: Spacing.sm,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  modePill: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  modePillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  renderedDiagnosisCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  renderedHeader: {
    fontSize: 15,
    fontWeight: "700",
  },
  renderedBullet: {
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    height: 1,
  },
  pairsSection: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  pairCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  pairHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  pairHeaderText: {
    flex: 1,
    gap: 2,
  },
  pairDiagnosis: {
    fontSize: 14,
    fontWeight: "600",
  },
  pairMeta: {
    fontSize: 11,
  },
  compactProcedureGroup: {
    gap: Spacing.xs,
  },
  compactProcedureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  compactProcedureChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactProcedureChipText: {
    fontSize: 12,
    fontWeight: "600",
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
  radio: {
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  procedureTextGroup: {
    flex: 1,
    gap: 2,
  },
  procedureTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  procedureName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  recommendedBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  procedureReason: {
    fontSize: 11,
  },
  emptyPairText: {
    fontSize: 12,
  },
  structureNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  structureNoteText: {
    flex: 1,
    fontSize: 12,
  },
  codingShell: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  codingBody: {
    gap: Spacing.sm,
  },
  codeGroup: {
    gap: Spacing.sm,
  },
  codeItem: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  codeTextGroup: {
    flex: 1,
    gap: 2,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  codeTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  codeTag: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  codeTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  snomedCode: {
    fontSize: 11,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkText: {
    fontSize: 12,
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
});
