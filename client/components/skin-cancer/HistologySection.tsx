/**
 * HistologySection
 * ════════════════
 * Collapsible card for structured histology data entry.
 * Renders type-specific progressive disclosure fields based on
 * pathology category selection (BCC/SCC/Melanoma/MCC/Rare).
 *
 * Internal sub-renderers per category — only RareTypeSubtypePicker
 * is extracted to its own file.
 */

import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Pressable,
  TextInput,
  Switch,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { DatePickerField } from "@/components/FormField";
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
  BCCSubtype,
  SCCAssessmentDifferentiation,
  SCCRiskLevel,
  MelanomaAssessmentSubtype,
  TILsGrade,
  MCPyVStatus,
  DetailedMarginStatus,
  HistologySource,
  RareMalignantSubtype,
} from "@/types/skinCancer";

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const SOURCE_OPTIONS: { value: HistologySource; label: string }[] = [
  { value: "own_biopsy", label: "Own biopsy" },
  { value: "external_biopsy", label: "External biopsy" },
  { value: "current_procedure", label: "Current procedure" },
];

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
  { value: "pending", label: "Pending" },
  { value: "unknown", label: "Unknown" },
];

const MOHS_RECOMMENDED: Set<string> = new Set([
  "mac",
  "dfsp",
  "empd",
]);

const BCC_AGGRESSIVE: Set<BCCSubtype> = new Set([
  "infiltrative",
  "morphoeic",
  "micronodular",
  "mixed",
]);

// ═══════════════════════════════════════════════════════════════
// Props & helpers
// ═══════════════════════════════════════════════════════════════

interface HistologySectionProps {
  label: string;
  histology: SkinCancerHistology | undefined;
  onHistologyChange: (histology: SkinCancerHistology) => void;
  defaultExpanded?: boolean;
  defaultSource?: HistologySource;
  isPending?: boolean;
  /** When true, hides the histology source selector and relies on defaultSource */
  hideSourceSelector?: boolean;
  /** When true, pathology category chips are locked to the current value */
  lockedPathology?: boolean;
  /** When true, "Current procedure" source option is hidden */
  hideCurrentProcedureSource?: boolean;
  /** When true, the card header + collapse wrapper are hidden (content always visible) */
  hideHeader?: boolean;
  /** Trigger duplicate + follow-up prefill flow for re-excision */
  onCreateFollowUp?: () => void;
  /**
   * Initial-logging mode: shows only excision method (WLE / Mohs)
   * and planned margin inputs. Hides source, pathology category,
   * category-specific fields, margin status, and lab details.
   * Full histology is entered later via return-to-update.
   */
  simplifiedMode?: boolean;
}

function createDefaultHistology(source?: HistologySource): SkinCancerHistology {
  return {
    source: source ?? "own_biopsy",
    pathologyCategory: undefined as unknown as SkinCancerPathologyCategory,
    marginStatus: "pending",
  };
}

function getStatusBadge(
  histology: SkinCancerHistology | undefined,
  isPending: boolean,
): { label: string; colorKey: "tertiary" | "warning" | "success" | "link" } {
  if (!histology?.pathologyCategory) {
    return { label: "Not started", colorKey: "tertiary" };
  }
  if (isPending && histology.marginStatus === "pending") {
    return { label: "Pending", colorKey: "warning" };
  }
  if (histology.marginStatus && histology.marginStatus !== "pending") {
    return { label: "Complete", colorKey: "success" };
  }
  return { label: "In progress", colorKey: "link" };
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export const HistologySection = React.memo(function HistologySection({
  label,
  histology,
  onHistologyChange,
  defaultExpanded = false,
  defaultSource,
  isPending = false,
  hideSourceSelector = false,
  lockedPathology = false,
  hideCurrentProcedureSource = false,
  hideHeader = false,
  onCreateFollowUp,
  simplifiedMode = false,
}: HistologySectionProps) {
  const { theme } = useTheme();

  // Filtered options based on diagnosis-driven auto-config
  const filteredSources = useMemo(
    () =>
      hideCurrentProcedureSource
        ? SOURCE_OPTIONS.filter((s) => s.value !== "current_procedure")
        : SOURCE_OPTIONS,
    [hideCurrentProcedureSource],
  );

  const filteredCategories = useMemo(() => {
    if (lockedPathology && histology?.pathologyCategory) {
      return CATEGORY_OPTIONS.filter(
        (c) => c.value === histology.pathologyCategory,
      );
    }
    return CATEGORY_OPTIONS;
  }, [lockedPathology, histology?.pathologyCategory]);

  // In simplified mode only WLE and Mohs are available
  const filteredExcisionOptions = useMemo(
    () =>
      simplifiedMode
        ? EXCISION_OPTIONS.filter(
            (o) => o.value === "wle" || o.value === "mohs",
          )
        : EXCISION_OPTIONS,
    [simplifiedMode],
  );

  // UI-only state
  const [expanded, setExpanded] = useState(defaultExpanded);
  const expandedRef = useRef(defaultExpanded);
  const [showMelanomaExtras, setShowMelanomaExtras] = useState(false);
  const [showLabDetails, setShowLabDetails] = useState(false);
  const peripheralMarginRef = useRef<TextInput>(null);

  // Collapse animation (matches CollapsibleFormSection)
  const contentHeightRef = useRef(0);
  const measuredRef = useRef(false);
  const animatedHeight = useSharedValue(defaultExpanded ? -1 : 0);

  const toggle = useCallback(() => {
    const next = !expandedRef.current;
    expandedRef.current = next;
    setExpanded(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (measuredRef.current) {
      animatedHeight.value = withTiming(next ? contentHeightRef.current : 0, {
        duration: 250,
      });
    }
  }, [animatedHeight]);

  const contentStyle = useAnimatedStyle(() => {
    if (animatedHeight.value === -1) {
      return { overflow: "hidden" as const };
    }
    return { height: animatedHeight.value, overflow: "hidden" as const };
  });

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) {
        contentHeightRef.current = h;
        if (!measuredRef.current) {
          animatedHeight.value = expandedRef.current ? h : 0;
          measuredRef.current = true;
        } else if (expandedRef.current) {
          animatedHeight.value = h;
        }
      }
    },
    [animatedHeight],
  );

  // ─── Helpers ───────────────────────────────────────────────

  const base = useMemo(
    () => histology ?? createDefaultHistology(defaultSource),
    [histology, defaultSource],
  );

  const update = useCallback(
    (partial: Partial<SkinCancerHistology>) => {
      onHistologyChange({ ...base, ...partial });
    },
    [base, onHistologyChange],
  );

  const handleCategoryChange = useCallback(
    (category: SkinCancerPathologyCategory | undefined) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (category === base.pathologyCategory) {
        // Deselect
        onHistologyChange({
          source: base.source,
          pathologyCategory:
            undefined as unknown as SkinCancerPathologyCategory,
          marginStatus: base.marginStatus ?? "pending",
          excisionMethod: base.excisionMethod,
          deepMarginMm: base.deepMarginMm,
          peripheralMarginMm: base.peripheralMarginMm,
          reportDate: base.reportDate,
          labReference: base.labReference,
        });
        return;
      }
      // Clear all category-specific fields, keep common
      onHistologyChange({
        source: base.source,
        pathologyCategory:
          category ?? (undefined as unknown as SkinCancerPathologyCategory),
        marginStatus: base.marginStatus ?? "pending",
        excisionMethod: base.excisionMethod,
        deepMarginMm: base.deepMarginMm,
        peripheralMarginMm: base.peripheralMarginMm,
        reportDate: base.reportDate,
        labReference: base.labReference,
      });
      setShowMelanomaExtras(false);
    },
    [base, onHistologyChange],
  );

  // ─── Margin recommendation ─────────────────────────────────

  const marginRec = useMemo(() => {
    if (!base.pathologyCategory) return undefined;
    return getMarginRecommendation(base);
  }, [base]);

  // ─── Mohs recommendation ──────────────────────────────────

  const showMohsNote = useMemo(() => {
    if (
      base.pathologyCategory === "rare_malignant" &&
      base.rareSubtype &&
      MOHS_RECOMMENDED.has(base.rareSubtype)
    ) {
      return true;
    }
    if (
      base.pathologyCategory === "bcc" &&
      base.bccSubtype &&
      BCC_AGGRESSIVE.has(base.bccSubtype)
    ) {
      return true;
    }
    return false;
  }, [base.pathologyCategory, base.rareSubtype, base.bccSubtype]);

  // ─── Status badge ──────────────────────────────────────────

  const badge = useMemo(
    () => getStatusBadge(histology, isPending),
    [histology, isPending],
  );
  const badgeColor =
    badge.colorKey === "tertiary"
      ? theme.textTertiary
      : badge.colorKey === "warning"
        ? theme.warning
        : badge.colorKey === "success"
          ? theme.success
          : theme.link;

  // ─── T-stage auto display ─────────────────────────────────

  const tStageDisplay = useMemo(() => {
    if (
      base.pathologyCategory !== "melanoma" ||
      base.melanomaBreslowMm === undefined ||
      base.melanomaUlceration === undefined
    )
      return undefined;
    return quickTStage(base.melanomaBreslowMm, base.melanomaUlceration);
  }, [
    base.pathologyCategory,
    base.melanomaBreslowMm,
    base.melanomaUlceration,
  ]);

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════

  const contentInner = (
    <>
          {/* 1. Histology Source — hidden in simplified mode */}
          {!simplifiedMode && !hideSourceSelector ? (
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              HISTOLOGY SOURCE
            </ThemedText>
            <View style={styles.chipRow}>
              {filteredSources.map((opt) => {
                const isSelected = base.source === opt.value;
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
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      update({ source: opt.value });
                    }}
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
          ) : null}

          {/* 2. Pathology Category — hidden in simplified mode */}
          {!simplifiedMode ? (
          <View style={styles.section}>
            <ThemedText
              style={[styles.sectionLabel, { color: theme.textSecondary }]}
            >
              PATHOLOGY CATEGORY
            </ThemedText>
            <View style={styles.chipRow}>
              {filteredCategories.map((opt) => {
                const isSelected = base.pathologyCategory === opt.value;
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
                    onPress={() => handleCategoryChange(opt.value)}
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
          ) : null}

          {/* 3. Category-specific fields — hidden in simplified mode */}
          {!simplifiedMode && base.pathologyCategory === "bcc" ? (
            <BCCFields histology={base} update={update} theme={theme} />
          ) : !simplifiedMode && base.pathologyCategory === "scc" ? (
            <SCCFields histology={base} update={update} theme={theme} />
          ) : !simplifiedMode && base.pathologyCategory === "melanoma" ? (
            <MelanomaFields
              histology={base}
              update={update}
              theme={theme}
              showExtras={showMelanomaExtras}
              onToggleExtras={() => setShowMelanomaExtras((p) => !p)}
              tStageDisplay={tStageDisplay}
            />
          ) : !simplifiedMode && base.pathologyCategory === "merkel_cell" ? (
            <MerkelFields histology={base} update={update} theme={theme} />
          ) : !simplifiedMode && base.pathologyCategory === "rare_malignant" ? (
            <View style={styles.section}>
              <RareTypeSubtypePicker
                selectedSubtype={base.rareSubtype}
                onSelectSubtype={(sub) => update({ rareSubtype: sub })}
              />
            </View>
          ) : null}

          {/* 4. Excision Method (always in simplified; otherwise when category set) */}
          {simplifiedMode || base.pathologyCategory ? (
            simplifiedMode ? (
              <View style={styles.section}>
                <View style={styles.compactExcisionRow}>
                  <View style={styles.compactExcisionMethodGroup}>
                    <ThemedText
                      style={[
                        styles.sectionLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      EXCISION METHOD
                    </ThemedText>
                    <View style={styles.chipRow}>
                      {filteredExcisionOptions.map((opt) => {
                        const isSelected = base.excisionMethod === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            style={[
                              styles.chip,
                              styles.compactChip,
                              {
                                backgroundColor: isSelected
                                  ? theme.link + "14"
                                  : theme.backgroundElevated,
                                borderColor: isSelected
                                  ? theme.link
                                  : theme.border,
                              },
                            ]}
                            onPress={() => {
                              Haptics.impactAsync(
                                Haptics.ImpactFeedbackStyle.Light,
                              );
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

                  {base.excisionMethod !== "mohs" ? (
                    <View style={styles.compactMarginGroup}>
                      <ThemedText
                        style={[
                          styles.sectionLabel,
                          styles.compactMarginLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Peripheral margin
                      </ThemedText>
                      <View style={styles.inputWithUnit}>
                        <SkinCancerNumericInput
                          ref={peripheralMarginRef}
                          style={[
                            styles.numericInput,
                            styles.compactMarginInput,
                            {
                              backgroundColor: theme.backgroundElevated,
                              borderColor: theme.border,
                              color: theme.text,
                            },
                          ]}
                          value={base.excisionPeripheralMarginMm}
                          onValueChange={(excisionPeripheralMarginMm) =>
                            update({ excisionPeripheralMarginMm })
                          }
                          placeholder="—"
                          placeholderTextColor={theme.textTertiary}
                          keyboardType="decimal-pad"
                          returnKeyType="done"
                          blurOnSubmit
                        />
                        <ThemedText
                          style={[
                            styles.unitText,
                            { color: theme.textSecondary },
                          ]}
                        >
                          mm
                        </ThemedText>
                      </View>
                    </View>
                  ) : null}
                </View>

                {showMohsNote ? (
                  <ThemedText
                    style={[styles.footnote, { color: theme.info }]}
                  >
                    Mohs recommended for this tumour type
                  </ThemedText>
                ) : null}
              </View>
            ) : (
              <View style={styles.section}>
                <ThemedText
                  style={[styles.sectionLabel, { color: theme.textSecondary }]}
                >
                  EXCISION METHOD
                </ThemedText>
                <View style={styles.chipRow}>
                  {filteredExcisionOptions.map((opt) => {
                    const isSelected = base.excisionMethod === opt.value;
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
                            { color: isSelected ? theme.link : theme.text },
                          ]}
                        >
                          {opt.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                {showMohsNote ? (
                  <ThemedText
                    style={[styles.footnote, { color: theme.info }]}
                  >
                    Mohs recommended for this tumour type
                  </ThemedText>
                ) : null}
              </View>
            )
          ) : null}

          {/* 5. Margin Fields — hidden when Mohs selected (no planned margins) */}
          {!simplifiedMode &&
          base.pathologyCategory &&
          base.excisionMethod !== "mohs" ? (
            <View style={styles.section}>
              {/* Margin recommendation badge — hidden in simplified mode */}
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
                    Recommended:{" "}
                    {marginRec.recommendedText}{" "}
                    ({marginRec.guidelineSource})
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
                {/* Deep margin — hidden in simplified (excision) mode */}
                {!simplifiedMode ? (
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
                        onValueChange={(deepMarginMm) =>
                          update({ deepMarginMm })
                        }
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
                ) : null}
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

              {/* Margin status + re-excision — hidden in simplified mode */}
              {!simplifiedMode ? (
              <>
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
                            ? theme.link + "14"
                            : theme.backgroundElevated,
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
                          { color: isSelected ? theme.link : theme.text },
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
              </>
              ) : null}
            </View>
          ) : null}

          {/* 6. Lab Details (disclosure) — hidden in simplified mode */}
          {!simplifiedMode && base.pathologyCategory ? (
            <View style={styles.section}>
              <Pressable
                onPress={() => setShowLabDetails((p) => !p)}
                style={[
                  styles.disclosureHeader,
                  { borderBottomColor: theme.border },
                ]}
              >
                <ThemedText
                  style={[styles.disclosureText, { color: theme.link }]}
                >
                  {showLabDetails ? "Hide lab details" : "Lab details"}
                </ThemedText>
                <Feather
                  name={showLabDetails ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={theme.link}
                />
              </Pressable>
              {showLabDetails ? (
                <View style={styles.disclosureContent}>
                  <DatePickerField
                    label="Report date"
                    value={base.reportDate}
                    onChange={(d) => update({ reportDate: d })}
                    clearable
                    maximumDate={new Date()}
                  />
                  <View style={styles.labRefField}>
                    <ThemedText
                      style={[
                        styles.sectionLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      LAB REFERENCE
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.labRefInput,
                        {
                          backgroundColor: theme.backgroundElevated,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={base.labReference ?? ""}
                      onChangeText={(t) =>
                        update({ labReference: t || undefined })
                      }
                      placeholder="e.g. H-2024-12345"
                      placeholderTextColor={theme.textTertiary}
                      returnKeyType="done"
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
    </>
  );

  if (hideHeader) {
    return <View style={styles.contentOnly}>{contentInner}</View>;
  }

  return (
    <View style={styles.wrapper}>
      {/* ── Header ── */}
      <Pressable
        onPress={toggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerLeft}>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            {label}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor + "15",
                borderColor: badgeColor + "30",
              },
            ]}
          >
            <ThemedText style={[styles.badgeText, { color: badgeColor }]}>
              {badge.label}
            </ThemedText>
          </View>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textSecondary}
          />
        </View>
      </Pressable>

      {/* ── Collapsible content ── */}
      <Animated.View style={contentStyle}>
        <View onLayout={handleLayout} style={styles.content}>
          {contentInner}
        </View>
      </Animated.View>
    </View>
  );
});

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
      <ThemedText
        style={[styles.sectionLabel, { color: theme.textSecondary }]}
      >
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
                    ? theme.link + "14"
                    : theme.backgroundElevated,
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
                      ? theme.link + "14"
                      : theme.backgroundElevated,
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
          <ThemedText
            style={[styles.unitText, { color: theme.textSecondary }]}
          >
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
                      ? theme.link + "14"
                      : theme.backgroundElevated,
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
            onValueChange={(melanomaBreslowMm) =>
              update({ melanomaBreslowMm })
            }
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <ThemedText
            style={[styles.unitText, { color: theme.textSecondary }]}
          >
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
                      ? theme.link + "14"
                      : theme.backgroundElevated,
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

      {/* More details disclosure */}
      <Pressable
        onPress={onToggleExtras}
        style={[
          styles.disclosureHeader,
          { borderBottomColor: theme.border },
        ]}
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
                          ? theme.link + "14"
                          : theme.backgroundElevated,
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
                          ? theme.link + "14"
                          : theme.backgroundElevated,
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
          <ThemedText
            style={[styles.unitText, { color: theme.textSecondary }]}
          >
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
                      ? theme.link + "14"
                      : theme.backgroundElevated,
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
          <ThemedText
            style={[styles.unitText, { color: theme.textSecondary }]}
          >
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
  wrapper: {
    marginTop: Spacing.sm,
  },
  contentOnly: {
    gap: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  compactExcisionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: Spacing.md,
  },
  compactExcisionMethodGroup: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.sm,
  },
  compactMarginGroup: {
    minWidth: 128,
    gap: 6,
  },
  compactMarginLabel: {
    fontSize: 11,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
  compactChip: {
    minWidth: 72,
    alignItems: "center",
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
  compactMarginInput: {
    width: 72,
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
    gap: Spacing.lg,
  },
  marginInputGroup: {
    flex: 1,
    gap: Spacing.sm,
  },
  disclosureHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  disclosureText: {
    fontSize: 14,
    fontWeight: "600",
  },
  disclosureContent: {
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  labRefField: {
    gap: Spacing.sm,
  },
  labRefInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});
