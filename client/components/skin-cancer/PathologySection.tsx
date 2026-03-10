/**
 * PathologySection
 * ════════════════
 * Unified Tier 1 + Tier 2 pathology selector for the skin cancer module.
 *
 * Tier 1: 7 pathology category chips (BCC, SCC, Melanoma, MCC, Other malig., Benign, Uncertain)
 *   - Hand-trauma grid layout: flexBasis 31%, solid amber active state
 *   - Pathway A writes to clinicalSuspicion, Pathway B/C writes to priorHistology.pathologyCategory
 *   - Locked mode: only show the locked category chip
 *
 * Tier 2 (hidden until Tier 1 selected): type-specific detail fields
 *   - BCC subtypes, SCC risk/depth/PNI/LVI, Melanoma staging, MCC, Rare subtypes
 *   - Pathway B/C: excision method + margin fields
 *
 * Source selector (Pathway B/C only): Own biopsy / External biopsy
 */

import React, { useState, useRef, useCallback, useMemo } from "react";
import { View, Pressable, TextInput, Switch, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { quickTStage } from "@/lib/melanomaStaging";
import { getMarginRecommendation } from "@/lib/skinCancerConfig";
import { RareTypeSubtypePicker } from "./RareTypeSubtypePicker";
import { ReExcisionPromptCard } from "./ReExcisionPromptCard";
import { SkinCancerNumericInput } from "./SkinCancerNumericInput";
import type {
  SkinCancerHistology,
  SkinCancerPathologyCategory,
  SkinCancerPathwayStage,
  BCCSubtype,
  SCCAssessmentDifferentiation,
  SCCRiskLevel,
  MelanomaAssessmentSubtype,
  TILsGrade,
  MCPyVStatus,
  DetailedMarginStatus,
  HistologySource,
} from "@/types/skinCancer";

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const CATEGORY_OPTIONS: {
  value: SkinCancerPathologyCategory;
  label: string;
}[] = [
  { value: "bcc", label: "BCC" },
  { value: "scc", label: "SCC" },
  { value: "melanoma", label: "Melanoma" },
  { value: "merkel_cell", label: "MCC" },
  { value: "rare_malignant", label: "Other malig." },
  { value: "benign", label: "Benign" },
  { value: "uncertain", label: "Uncertain" },
];

const BCC_SUBTYPE_OPTIONS: { value: BCCSubtype; label: string }[] = [
  { value: "nodular", label: "Nodular" },
  { value: "superficial", label: "Superficial" },
  { value: "infiltrative", label: "Infiltrative" },
  { value: "morphoeic", label: "Morphoeic" },
  { value: "micronodular", label: "Micronodular" },
  { value: "mixed", label: "Mixed" },
];

const SCC_DIFF_OPTIONS: {
  value: SCCAssessmentDifferentiation;
  label: string;
}[] = [
  { value: "well", label: "Well" },
  { value: "moderate", label: "Moderate" },
  { value: "poor", label: "Poor" },
];

const SCC_RISK_OPTIONS: { value: SCCRiskLevel; label: string }[] = [
  { value: "low", label: "Low risk" },
  { value: "high", label: "High risk" },
];

const MELANOMA_SUBTYPE_OPTIONS: {
  value: MelanomaAssessmentSubtype;
  label: string;
}[] = [
  { value: "ssm", label: "SSM" },
  { value: "nm", label: "NM" },
  { value: "lmm", label: "LMM" },
  { value: "alm", label: "ALM" },
  { value: "desmoplastic", label: "Desmoplastic" },
  { value: "other", label: "Other" },
];

const TILS_OPTIONS: { value: TILsGrade; label: string }[] = [
  { value: "absent", label: "Absent" },
  { value: "non_brisk", label: "Non-brisk" },
  { value: "brisk", label: "Brisk" },
];

const CLARK_OPTIONS: { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: "I" },
  { value: 2, label: "II" },
  { value: 3, label: "III" },
  { value: 4, label: "IV" },
  { value: 5, label: "V" },
];

const MCPYV_OPTIONS: { value: MCPyVStatus; label: string }[] = [
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "unknown", label: "Unknown" },
];

const EXCISION_OPTIONS: {
  value: NonNullable<SkinCancerHistology["excisionMethod"]>;
  label: string;
}[] = [
  { value: "wle", label: "WLE" },
  { value: "mohs", label: "Mohs" },
  { value: "staged_excision", label: "Staged excision" },
  { value: "other", label: "Other" },
];

const MARGIN_STATUS_OPTIONS: {
  value: DetailedMarginStatus;
  label: string;
}[] = [
  { value: "complete", label: "Clear" },
  { value: "close", label: "Close" },
  { value: "incomplete", label: "Involved" },
  { value: "unknown", label: "Unknown" },
];

const MOHS_RECOMMENDED: Set<string> = new Set(["mac", "dfsp", "empd"]);

const BCC_AGGRESSIVE: Set<BCCSubtype> = new Set([
  "infiltrative",
  "morphoeic",
  "micronodular",
  "mixed",
]);

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface PathologySectionProps {
  pathwayStage: SkinCancerPathwayStage;
  /** Pathway A: clinical suspicion (excision biopsy) */
  clinicalSuspicion?: SkinCancerPathologyCategory;
  onClinicalSuspicionChange: (
    v: SkinCancerPathologyCategory | undefined,
  ) => void;
  /** Pathway B/C: prior histology */
  priorHistology?: SkinCancerHistology;
  onPriorHistologyChange: (h: SkinCancerHistology) => void;
  /** When true, pathology category chips locked to current value */
  lockedPathology: boolean;
  /** Whether to hide "Current procedure" source option */
  hideCurrentProcedureSource: boolean;
  /** Default source for new histology records */
  defaultSource?: HistologySource;
  /** When true, hide the Tier 1 category grid (already shown in Diagnosis section) */
  hideTier1?: boolean;
  /** Trigger duplicate + follow-up prefill flow for re-excision */
  onCreateFollowUp?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function PathologySection({
  pathwayStage,
  clinicalSuspicion,
  onClinicalSuspicionChange,
  priorHistology,
  onPriorHistologyChange,
  lockedPathology,
  hideCurrentProcedureSource,
  defaultSource,
  hideTier1 = false,
  onCreateFollowUp,
}: PathologySectionProps) {
  const { theme } = useTheme();
  const [showMelanomaExtras, setShowMelanomaExtras] = useState(false);
  const peripheralMarginRef = useRef<TextInput>(null);

  const isPathwayA = pathwayStage === "excision_biopsy";

  // ── Current active category ──
  const activeCategory: SkinCancerPathologyCategory | undefined = isPathwayA
    ? clinicalSuspicion
    : priorHistology?.pathologyCategory;

  // ── Histology helper ──
  const base: SkinCancerHistology = useMemo(
    () =>
      priorHistology ?? {
        source: defaultSource ?? "own_biopsy",
        pathologyCategory: undefined as unknown as SkinCancerPathologyCategory,
      },
    [priorHistology, defaultSource],
  );

  const update = useCallback(
    (partial: Partial<SkinCancerHistology>) => {
      onPriorHistologyChange({ ...base, ...partial });
    },
    [base, onPriorHistologyChange],
  );

  // ── Filtered categories for locked mode ──
  const filteredCategories = useMemo(() => {
    if (lockedPathology && activeCategory) {
      return CATEGORY_OPTIONS.filter((c) => c.value === activeCategory);
    }
    return CATEGORY_OPTIONS;
  }, [lockedPathology, activeCategory]);

  // ── Handle Tier 1 tap ──
  const handleCategoryTap = useCallback(
    (value: SkinCancerPathologyCategory) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isPathwayA) {
        onClinicalSuspicionChange(
          clinicalSuspicion === value ? undefined : value,
        );
      } else {
        const newCategory =
          base.pathologyCategory === value ? undefined : value;
        // Clear category-specific fields, keep common
        onPriorHistologyChange({
          source: base.source,
          pathologyCategory:
            newCategory ??
            (undefined as unknown as SkinCancerPathologyCategory),
          marginStatus: base.marginStatus,
          excisionMethod: base.excisionMethod,
          deepMarginMm: base.deepMarginMm,
          peripheralMarginMm: base.peripheralMarginMm,
          reportDate: base.reportDate,
          labReference: base.labReference,
        });
        setShowMelanomaExtras(false);
      }
    },
    [
      isPathwayA,
      clinicalSuspicion,
      onClinicalSuspicionChange,
      base,
      onPriorHistologyChange,
    ],
  );

  // ── Margin recommendation ──
  const marginRec = useMemo(() => {
    if (!base.pathologyCategory || isPathwayA) return undefined;
    return getMarginRecommendation(base);
  }, [base, isPathwayA]);

  // ── Mohs recommendation ──
  const showMohsNote = useMemo(() => {
    if (isPathwayA) return false;
    if (
      base.pathologyCategory === "rare_malignant" &&
      base.rareSubtype &&
      MOHS_RECOMMENDED.has(base.rareSubtype)
    )
      return true;
    if (
      base.pathologyCategory === "bcc" &&
      base.bccSubtype &&
      BCC_AGGRESSIVE.has(base.bccSubtype)
    )
      return true;
    return false;
  }, [isPathwayA, base.pathologyCategory, base.rareSubtype, base.bccSubtype]);

  // ── T-stage auto display ──
  const tStageDisplay = useMemo(() => {
    if (isPathwayA) return undefined;
    if (
      base.pathologyCategory !== "melanoma" ||
      base.melanomaBreslowMm === undefined ||
      base.melanomaUlceration === undefined
    )
      return undefined;
    return quickTStage(base.melanomaBreslowMm, base.melanomaUlceration);
  }, [
    isPathwayA,
    base.pathologyCategory,
    base.melanomaBreslowMm,
    base.melanomaUlceration,
  ]);

  // ── Show Tier 2 ──
  const showTier2 = !isPathwayA && !!activeCategory;

  return (
    <View style={styles.container}>
      {/* ── Tier 1: Pathology Category (hidden when managed externally) ── */}
      {!hideTier1 ? (
        <View style={styles.section}>
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            PATHOLOGY CATEGORY
          </ThemedText>
          <View style={styles.tier1Grid}>
            {filteredCategories.map((opt) => {
              const isSelected = activeCategory === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.tier1Chip,
                    {
                      backgroundColor: isSelected
                        ? theme.link
                        : theme.backgroundTertiary,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => handleCategoryTap(opt.value)}
                >
                  <ThemedText
                    style={[
                      styles.tier1ChipText,
                      { color: isSelected ? theme.buttonText : theme.text },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* ── Tier 2: Type-specific fields ── */}
      {showTier2 ? (
        <>
          {activeCategory === "bcc" ? (
            <BCCFields histology={base} update={update} theme={theme} />
          ) : activeCategory === "scc" ? (
            <SCCFields histology={base} update={update} theme={theme} />
          ) : activeCategory === "melanoma" ? (
            <MelanomaFields
              histology={base}
              update={update}
              theme={theme}
              showExtras={showMelanomaExtras}
              onToggleExtras={() => setShowMelanomaExtras((p) => !p)}
              tStageDisplay={tStageDisplay}
            />
          ) : activeCategory === "merkel_cell" ? (
            <MerkelFields histology={base} update={update} theme={theme} />
          ) : activeCategory === "rare_malignant" ? (
            <View style={styles.section}>
              <RareTypeSubtypePicker
                selectedSubtype={base.rareSubtype}
                onSelectSubtype={(sub) => update({ rareSubtype: sub })}
              />
            </View>
          ) : null}

          {/* ── Excision method ── */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              EXCISION METHOD
            </ThemedText>
            <View style={styles.chipRow}>
              {EXCISION_OPTIONS.map((opt) => {
                const isSelected = base.excisionMethod === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundTertiary,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({
                        excisionMethod:
                          base.excisionMethod === opt.value
                            ? undefined
                            : opt.value,
                      });
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: isSelected ? theme.buttonText : theme.text },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {showMohsNote ? (
              <ThemedText style={[styles.footnote, { color: theme.info }]}>
                Mohs recommended for this tumour type
              </ThemedText>
            ) : null}
          </View>

          {/* ── Margin Fields — hidden when Mohs selected ── */}
          {base.excisionMethod !== "mohs" ? (
            <View style={styles.section}>
              {/* Margin recommendation */}
              {marginRec ? (
                <View
                  style={[
                    styles.marginRecBanner,
                    {
                      backgroundColor: theme.info + "10",
                      borderLeftColor: theme.info,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.marginRecTitle, { color: theme.info }]}
                  >
                    Recommended: {marginRec.recommendedText} (
                    {marginRec.guidelineSource})
                  </ThemedText>
                  {marginRec.guidelineNote ? (
                    <ThemedText
                      style={[
                        styles.marginRecNote,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {marginRec.guidelineNote}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.marginInputRow}>
                <View style={styles.marginInputGroup}>
                  <ThemedText
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    DEEP MARGIN
                  </ThemedText>
                  <View style={styles.inputWithUnit}>
                    <SkinCancerNumericInput
                      style={[
                        styles.numericInput,
                        {
                          backgroundColor: theme.backgroundElevated,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={base.deepMarginMm}
                      onValueChange={(deepMarginMm) => update({ deepMarginMm })}
                      placeholder="—"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() =>
                        peripheralMarginRef.current?.focus()
                      }
                    />
                    <ThemedText
                      style={[styles.unitText, { color: theme.textSecondary }]}
                    >
                      mm
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.marginInputGroup}>
                  <ThemedText
                    style={[
                      styles.sectionLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    PERIPHERAL MARGIN
                  </ThemedText>
                  <View style={styles.inputWithUnit}>
                    <SkinCancerNumericInput
                      ref={peripheralMarginRef}
                      style={[
                        styles.numericInput,
                        {
                          backgroundColor: theme.backgroundElevated,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={base.peripheralMarginMm}
                      onValueChange={(peripheralMarginMm) =>
                        update({ peripheralMarginMm })
                      }
                      placeholder="—"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      blurOnSubmit
                    />
                    <ThemedText
                      style={[styles.unitText, { color: theme.textSecondary }]}
                    >
                      mm
                    </ThemedText>
                  </View>
                </View>
              </View>

              <ThemedText
                style={[styles.sectionLabel, { color: theme.textSecondary }]}
              >
                MARGIN STATUS
              </ThemedText>
              <View style={styles.chipRow}>
                {MARGIN_STATUS_OPTIONS.map((opt) => {
                  const isSelected = base.marginStatus === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? theme.link
                            : theme.backgroundTertiary,
                          borderColor: isSelected ? theme.link : theme.border,
                        },
                      ]}
                      onPress={() => {
                        if (
                          opt.value === "incomplete" ||
                          opt.value === "close"
                        ) {
                          Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Warning,
                          );
                        } else {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                        }
                        update({ marginStatus: opt.value });
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: isSelected ? theme.buttonText : theme.text },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Re-excision prompt for incomplete/close margins */}
              {(base.marginStatus === "incomplete" ||
                base.marginStatus === "close") && (
                <ReExcisionPromptCard onCreateFollowUp={onCreateFollowUp} />
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Internal sub-renderers
// ═══════════════════════════════════════════════════════════════

interface FieldProps {
  histology: SkinCancerHistology;
  update: (partial: Partial<SkinCancerHistology>) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}

function BCCFields({ histology, update, theme }: FieldProps) {
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        BCC SUBTYPE
      </ThemedText>
      <View style={styles.chipRow}>
        {BCC_SUBTYPE_OPTIONS.map((opt) => {
          const isSelected = histology.bccSubtype === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.link
                    : theme.backgroundTertiary,
                  borderColor: isSelected ? theme.link : theme.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                update({
                  bccSubtype:
                    histology.bccSubtype === opt.value ? undefined : opt.value,
                });
              }}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: isSelected ? theme.buttonText : theme.text },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SCCFields({ histology, update, theme }: FieldProps) {
  return (
    <View style={styles.categoryFields}>
      {/* Differentiation */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          DIFFERENTIATION
        </ThemedText>
        <View style={styles.chipRow}>
          {SCC_DIFF_OPTIONS.map((opt) => {
            const isSelected = histology.sccDifferentiation === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    sccDifferentiation:
                      histology.sccDifferentiation === opt.value
                        ? undefined
                        : opt.value,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: isSelected ? theme.buttonText : theme.text },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Depth */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          TUMOUR DEPTH
        </ThemedText>
        <View style={styles.inputWithUnit}>
          <SkinCancerNumericInput
            style={[
              styles.numericInput,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={histology.sccDepthMm}
            onValueChange={(sccDepthMm) => update({ sccDepthMm })}
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <ThemedText style={[styles.unitText, { color: theme.textSecondary }]}>
            mm
          </ThemedText>
        </View>
      </View>

      {/* PNI toggle */}
      <ToggleRow
        label="Perineural invasion"
        value={histology.sccPerineuralInvasion ?? false}
        onValueChange={(v) => update({ sccPerineuralInvasion: v })}
        theme={theme}
      />

      {/* LVI toggle */}
      <ToggleRow
        label="Lymphovascular invasion"
        value={histology.sccLymphovascularInvasion ?? false}
        onValueChange={(v) => update({ sccLymphovascularInvasion: v })}
        theme={theme}
      />

      {/* Risk level */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          RISK LEVEL
        </ThemedText>
        <View style={styles.chipRow}>
          {SCC_RISK_OPTIONS.map((opt) => {
            const isSelected = histology.sccRiskLevel === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    sccRiskLevel:
                      histology.sccRiskLevel === opt.value
                        ? undefined
                        : opt.value,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: isSelected ? theme.buttonText : theme.text },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface MelanomaFieldProps extends FieldProps {
  showExtras: boolean;
  onToggleExtras: () => void;
  tStageDisplay: string | undefined;
}

function MelanomaFields({
  histology,
  update,
  theme,
  showExtras,
  onToggleExtras,
  tStageDisplay,
}: MelanomaFieldProps) {
  return (
    <View style={styles.categoryFields}>
      {/* Breslow */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          BRESLOW THICKNESS
        </ThemedText>
        <View style={styles.inputWithUnit}>
          <SkinCancerNumericInput
            style={[
              styles.numericInput,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={histology.melanomaBreslowMm}
            onValueChange={(melanomaBreslowMm) => update({ melanomaBreslowMm })}
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <ThemedText style={[styles.unitText, { color: theme.textSecondary }]}>
            mm
          </ThemedText>
        </View>
      </View>

      {/* Ulceration */}
      <ToggleRow
        label="Ulceration"
        value={histology.melanomaUlceration ?? false}
        onValueChange={(v) => update({ melanomaUlceration: v })}
        theme={theme}
      />

      {/* Auto T-stage */}
      {tStageDisplay ? (
        <View style={styles.tStageRow}>
          <Feather name="info" size={16} color={theme.info} />
          <ThemedText style={[styles.tStageText, { color: theme.info }]}>
            T-stage: {tStageDisplay}
          </ThemedText>
        </View>
      ) : null}

      {/* Subtype */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          SUBTYPE
        </ThemedText>
        <View style={styles.chipRow}>
          {MELANOMA_SUBTYPE_OPTIONS.map((opt) => {
            const isSelected = histology.melanomaSubtype === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    melanomaSubtype:
                      histology.melanomaSubtype === opt.value
                        ? undefined
                        : opt.value,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: isSelected ? theme.buttonText : theme.text },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* More details disclosure */}
      <Pressable
        onPress={onToggleExtras}
        style={[styles.disclosureHeader, { borderBottomColor: theme.border }]}
      >
        <ThemedText style={[styles.disclosureText, { color: theme.link }]}>
          {showExtras ? "Less details" : "More details"}
        </ThemedText>
        <Feather
          name={showExtras ? "chevron-up" : "chevron-down"}
          size={14}
          color={theme.link}
        />
      </Pressable>

      {showExtras ? (
        <View style={styles.categoryFields}>
          {/* Mitotic rate */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              MITOTIC RATE
            </ThemedText>
            <View style={styles.inputWithUnit}>
              <SkinCancerNumericInput
                style={[
                  styles.numericInput,
                  {
                    backgroundColor: theme.backgroundElevated,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={histology.melanomaMitoticRate}
                onValueChange={(melanomaMitoticRate) =>
                  update({ melanomaMitoticRate })
                }
                placeholder="—"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <ThemedText
                style={[styles.unitText, { color: theme.textSecondary }]}
              >
                /mm²
              </ThemedText>
            </View>
          </View>

          <ToggleRow
            label="Microsatellites"
            value={histology.melanomaMicrosatellites ?? false}
            onValueChange={(v) => update({ melanomaMicrosatellites: v })}
            theme={theme}
          />
          <ToggleRow
            label="Lymphovascular invasion"
            value={histology.melanomaLVI ?? false}
            onValueChange={(v) => update({ melanomaLVI: v })}
            theme={theme}
          />
          <ToggleRow
            label="Neurotropism"
            value={histology.melanomaNeurotropism ?? false}
            onValueChange={(v) => update({ melanomaNeurotropism: v })}
            theme={theme}
          />
          <ToggleRow
            label="Regression"
            value={histology.melanomaRegression ?? false}
            onValueChange={(v) => update({ melanomaRegression: v })}
            theme={theme}
          />

          {/* TILs */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              TUMOUR-INFILTRATING LYMPHOCYTES
            </ThemedText>
            <View style={styles.chipRow}>
              {TILS_OPTIONS.map((opt) => {
                const isSelected = histology.melanomaTILs === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundTertiary,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({
                        melanomaTILs:
                          histology.melanomaTILs === opt.value
                            ? undefined
                            : opt.value,
                      });
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: isSelected ? theme.buttonText : theme.text },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Clark level */}
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              CLARK LEVEL
            </ThemedText>
            <View style={styles.chipRow}>
              {CLARK_OPTIONS.map((opt) => {
                const isSelected = histology.melanomaClarkLevel === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundTertiary,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({
                        melanomaClarkLevel:
                          histology.melanomaClarkLevel === opt.value
                            ? undefined
                            : opt.value,
                      });
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: isSelected ? theme.buttonText : theme.text },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MerkelFields({ histology, update, theme }: FieldProps) {
  return (
    <View style={styles.categoryFields}>
      {/* Tumour size */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          TUMOUR SIZE
        </ThemedText>
        <View style={styles.inputWithUnit}>
          <SkinCancerNumericInput
            style={[
              styles.numericInput,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={histology.merkelTumourSizeMm}
            onValueChange={(merkelTumourSizeMm) =>
              update({ merkelTumourSizeMm })
            }
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <ThemedText style={[styles.unitText, { color: theme.textSecondary }]}>
            mm
          </ThemedText>
        </View>
      </View>

      {/* MCPyV status */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          MCPYV STATUS
        </ThemedText>
        <View style={styles.chipRow}>
          {MCPYV_OPTIONS.map((opt) => {
            const isSelected = histology.merkelMCPyVStatus === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.link
                      : theme.backgroundTertiary,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  update({
                    merkelMCPyVStatus:
                      histology.merkelMCPyVStatus === opt.value
                        ? undefined
                        : opt.value,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: isSelected ? theme.buttonText : theme.text },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Depth */}
      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          TUMOUR DEPTH
        </ThemedText>
        <View style={styles.inputWithUnit}>
          <SkinCancerNumericInput
            style={[
              styles.numericInput,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={histology.merkelDepthMm}
            onValueChange={(merkelDepthMm) => update({ merkelDepthMm })}
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <ThemedText style={[styles.unitText, { color: theme.textSecondary }]}>
            mm
          </ThemedText>
        </View>
      </View>

      {/* LVI */}
      <ToggleRow
        label="Lymphovascular invasion"
        value={histology.merkelLVI ?? false}
        onValueChange={(v) => update({ merkelLVI: v })}
        theme={theme}
      />
    </View>
  );
}

// Shared toggle row component
function ToggleRow({
  label,
  value,
  onValueChange,
  theme,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View style={styles.toggleRow}>
      <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>
        {label}
      </ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.border,
          true: theme.link + "60",
        }}
        thumbColor={value ? theme.link : theme.textSecondary}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tier1Grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tier1Chip: {
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 96,
    minHeight: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  tier1ChipText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
  categoryFields: {
    gap: Spacing.lg,
  },
  numericInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    textAlign: "center",
  },
  inputWithUnit: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  unitText: {
    fontSize: 14,
    fontWeight: "500",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginRight: Spacing.md,
  },
  tStageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tStageText: {
    fontSize: 13,
    fontWeight: "500",
  },
  footnote: {
    fontSize: 13,
    fontStyle: "italic",
  },
  disclosureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingBottom: 4,
  },
  disclosureText: {
    fontSize: 13,
    fontWeight: "600",
  },
  marginRecBanner: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderLeftWidth: 3,
    borderRadius: BorderRadius.xs,
    gap: 2,
  },
  marginRecTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  marginRecNote: {
    fontSize: 12,
  },
  marginInputRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  marginInputGroup: {
    flex: 1,
    gap: Spacing.xs,
  },
});
