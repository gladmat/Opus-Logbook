/**
 * HandElectiveAssessment
 * ═════════════════════
 * Main orchestrator for the elective hand progressive disclosure flow.
 * Rendered inline in DiagnosisGroupEditor when handCaseType === "elective".
 *
 * Layout:
 *   SectionWrapper "1. Diagnosis"  ← subcategory grid + diagnosis list
 *
 *   SectionWrapper "2. Classification"  ← staging + laterality (only when relevant)
 *
 *   SectionWrapper "3. Summary & Procedures"  ← suggested procedures
 */

import React, { useState, useCallback, useEffect } from "react";
import { View, Pressable, LayoutAnimation, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@/components/FeatherIcon";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { HandElectivePicker } from "./HandElectivePicker";
import { SelectedDiagnosisCard } from "@/components/SelectedDiagnosisCard";
import { InlineStagingButtons } from "@/components/staging/InlineStagingButtons";
import { PickerField } from "@/components/FormField";
import { ProcedureSuggestions } from "@/components/ProcedureSuggestions";
import { FingerSelectionChips } from "./FingerSelectionChips";
import { DigitMultiSelect } from "./DigitMultiSelect";
import { PerFingerQuinnellGrading } from "./PerFingerQuinnellGrading";
import { getFingerConfigForDiagnosis, hasPerFingerQuinnell, formatTriggerFingerGrading, FINGER_OPTIONS } from "@/lib/handElectiveFieldConfig";
import { DIGIT_LABELS } from "@/lib/diagnosisPicklists/multiDigitConfig";
import { generateDupuytrenSummaryText } from "@/lib/dupuytrenHelpers";
import { DupuytrenAssessment as DupuytrenAssessmentUI } from "@/components/dupuytren/DupuytrenAssessment";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { Laterality, DigitId } from "@/types/case";
import type { DupuytrenAssessment as DupuytrenAssessmentType } from "@/types/dupuytren";
import type { DiagnosisStagingConfig } from "@/lib/snomedApi";

// ═══════════════════════════════════════════════════════════════
// Laterality options (subset of DiagnosisClinicalFields)
// ═══════════════════════════════════════════════════════════════

const LATERALITY_OPTIONS: { value: Laterality; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface HandElectiveAssessmentProps {
  /** Currently selected diagnosis (from picklist or null) */
  selectedDiagnosis: DiagnosisPicklistEntry | null;
  /** SNOMED primary diagnosis (for display when selected via SNOMED fallback) */
  primaryDiagnosis: { conceptId: string; term: string } | null;
  /** Called when a diagnosis is selected from the picklist */
  onDiagnosisSelect: (dx: DiagnosisPicklistEntry) => void;
  /** Called when a SNOMED fallback diagnosis is selected */
  onSnomedSelect: (
    concept: { conceptId: string; term: string } | null,
  ) => void;
  /** Called when diagnosis is cleared */
  onDiagnosisClear: () => void;
  /** Staging config fetched from server (null if none) */
  diagnosisStaging: DiagnosisStagingConfig | null;
  /** Current staging selections */
  stagingValues: Record<string, string>;
  /** Called when a staging value changes */
  onStagingChange: (systemName: string, value: string) => void;
  /** Current laterality value */
  laterality: Laterality | undefined;
  /** Called when laterality changes */
  onLateralityChange: (value: Laterality | undefined) => void;
  /** Affected fingers for per-finger conditions (legacy) */
  affectedFingers?: string[];
  /** Called when affected fingers change */
  onAffectedFingersChange?: (fingers: string[]) => void;
  /** Affected digits for multi-digit diagnoses (trigger digit unified entry) */
  affectedDigits?: DigitId[];
  /** Called when affected digits change */
  onAffectedDigitsChange?: (digits: DigitId[]) => void;
  /** Multi-digit diagnosis awaiting digit selection (null when confirmed or not applicable) */
  pendingMultiDigitDiagnosis?: DiagnosisPicklistEntry | null;
  /** Currently selected digits for pending multi-digit diagnosis */
  selectedDigits?: DigitId[];
  /** Called when selected digits change */
  onDigitsChange?: (digits: DigitId[]) => void;
  /** Called when multi-digit selection is confirmed */
  onMultiDigitConfirm?: () => void;
  /** Per-finger Quinnell grading (finger ID → grade value) */
  triggerFingerGrading?: Record<string, string>;
  /** Called when per-finger Quinnell grading changes */
  onTriggerFingerGradingChange?: (grading: Record<string, string>) => void;
  /** Dupuytren assessment data */
  dupuytrenAssessment?: DupuytrenAssessmentType;
  /** Called when Dupuytren assessment changes */
  onDupuytrenAssessmentChange?: (assessment: DupuytrenAssessmentType) => void;
  /** Currently selected suggestion procedure IDs */
  selectedSuggestionIds: Set<string>;
  /** Called when a procedure suggestion is toggled */
  onToggleProcedureSuggestion: (
    procedurePicklistId: string,
    isSelected: boolean,
  ) => void;
  /** Whether to show procedure browse escape hatch */
  onShowAllProcedures: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function HandElectiveAssessment({
  selectedDiagnosis,
  primaryDiagnosis,
  onDiagnosisSelect,
  onSnomedSelect,
  onDiagnosisClear,
  diagnosisStaging,
  stagingValues,
  onStagingChange,
  laterality,
  onLateralityChange,
  affectedFingers,
  onAffectedFingersChange,
  affectedDigits,
  onAffectedDigitsChange,
  pendingMultiDigitDiagnosis,
  selectedDigits,
  onDigitsChange,
  onMultiDigitConfirm,
  triggerFingerGrading,
  onTriggerFingerGradingChange,
  dupuytrenAssessment,
  onDupuytrenAssessmentChange,
  selectedSuggestionIds,
  onToggleProcedureSuggestion,
  onShowAllProcedures,
}: HandElectiveAssessmentProps) {
  const { theme } = useTheme();

  // ── Collapse state ─────────────────────────────────────────
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const isSectionCollapsed = useCallback(
    (key: string) => collapsedSections[key] ?? false,
    [collapsedSections],
  );

  const setSectionCollapsed = useCallback(
    (key: string, collapsed: boolean) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsedSections((prev) => ({ ...prev, [key]: collapsed }));
    },
    [],
  );

  // ── Derived state ──────────────────────────────────────────

  const hasDiagnosis = !!(selectedDiagnosis || primaryDiagnosis);
  const hasStaging =
    (diagnosisStaging?.stagingSystems?.length ?? 0) > 0;
  const hasDupuytren = selectedDiagnosis?.hasDupuytrenAssessment === true;
  const fingerConfig = getFingerConfigForDiagnosis(selectedDiagnosis?.id);
  const isPendingMultiDigit = !!pendingMultiDigitDiagnosis;
  const showQuinnell = hasPerFingerQuinnell(selectedDiagnosis?.id) && (affectedFingers?.length ?? 0) > 0;
  const showClassificationSection = hasDiagnosis && !isPendingMultiDigit;

  // Auto-progression: collapse diagnosis, expand next section
  const handleDiagnosisSelect = useCallback(
    (dx: DiagnosisPicklistEntry) => {
      onDiagnosisSelect(dx);
      // Auto-collapse diagnosis section, expand classification or procedures
      setSectionCollapsed("diagnosis", true);
      if (dx.hasStaging || dx.hasDupuytrenAssessment) {
        setSectionCollapsed("classification", false);
        setSectionCollapsed("procedures", true);
      } else {
        setSectionCollapsed("classification", false);
        setSectionCollapsed("procedures", false);
      }
    },
    [onDiagnosisSelect, setSectionCollapsed],
  );

  const handleDiagnosisClear = useCallback(() => {
    onDiagnosisClear();
    setSectionCollapsed("diagnosis", false);
    setSectionCollapsed("classification", true);
    setSectionCollapsed("procedures", true);
  }, [onDiagnosisClear, setSectionCollapsed]);

  // When staging is loaded for a diagnosis that has it, expand classification
  useEffect(() => {
    if (hasStaging && hasDiagnosis && isSectionCollapsed("classification")) {
      setSectionCollapsed("classification", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStaging]);

  // ── Section numbering (fixed, not conditional) ──────────────
  // Section 1 = Diagnosis (always)
  // Section 2 = Classification (only when diagnosis selected)
  // Section 3 = Summary & Procedures (only when diagnosis selected)

  // ── Diagnosis summary subtitle for collapsed state ─────────
  const diagnosisSubtitle = selectedDiagnosis
    ? selectedDiagnosis.displayName
    : primaryDiagnosis
      ? primaryDiagnosis.term
      : undefined;

  // Staging summary for collapsed classification section
  const stagingSummaryParts: string[] = [];
  if (laterality && laterality !== "not_applicable") {
    stagingSummaryParts.push(
      laterality.charAt(0).toUpperCase() + laterality.slice(1),
    );
  }
  if (affectedDigits && affectedDigits.length > 0) {
    const digitLabels = affectedDigits
      .map((d) => DIGIT_LABELS[d])
      .join(", ");
    stagingSummaryParts.push(digitLabels);
  } else if (affectedFingers && affectedFingers.length > 0) {
    if (triggerFingerGrading && Object.keys(triggerFingerGrading).length > 0) {
      const gradingText = formatTriggerFingerGrading(triggerFingerGrading, affectedFingers);
      if (gradingText) stagingSummaryParts.push(gradingText);
      // Show ungraded fingers too
      const ungradedFingers = affectedFingers.filter((f) => !triggerFingerGrading[f]);
      if (ungradedFingers.length > 0) {
        const labels = ungradedFingers
          .map((id) => FINGER_OPTIONS.find((f) => f.id === id)?.label ?? id)
          .join(", ");
        stagingSummaryParts.push(labels);
      }
    } else {
      const fingerLabels = affectedFingers
        .map((id) => FINGER_OPTIONS.find((f) => f.id === id)?.label ?? id)
        .join(", ");
      stagingSummaryParts.push(fingerLabels);
    }
  }
  if (hasDupuytren && dupuytrenAssessment && dupuytrenAssessment.rays.length > 0) {
    stagingSummaryParts.push(generateDupuytrenSummaryText(dupuytrenAssessment));
  }
  if (hasStaging) {
    for (const system of diagnosisStaging!.stagingSystems) {
      const val = stagingValues[system.name];
      if (val) {
        const opt = system.options.find((o) => o.value === val);
        if (opt) stagingSummaryParts.push(`${system.name}: ${opt.label}`);
      }
    }
  }
  const classificationSubtitle =
    stagingSummaryParts.length > 0
      ? stagingSummaryParts.join(" · ")
      : undefined;

  return (
    <View style={styles.container}>
      {/* ── Section 1: Diagnosis ───────────────────────────── */}
      <SectionWrapper
        title="1. Diagnosis"
        icon="search"
        collapsible={hasDiagnosis}
        isCollapsed={isSectionCollapsed("diagnosis")}
        onCollapsedChange={(c) => setSectionCollapsed("diagnosis", c)}
        subtitle={diagnosisSubtitle}
      >
        {hasDiagnosis ? (
          <>
            <SelectedDiagnosisCard
              diagnosis={
                selectedDiagnosis ?? {
                  displayName: primaryDiagnosis?.term ?? "",
                  snomedCtCode: primaryDiagnosis?.conceptId ?? "",
                }
              }
              onClear={handleDiagnosisClear}
            />

            {/* Digit multi-select for unified trigger digit */}
            {isPendingMultiDigit &&
              selectedDigits &&
              onDigitsChange &&
              onMultiDigitConfirm && (
                <DigitMultiSelect
                  selectedDigits={selectedDigits}
                  onDigitsChange={onDigitsChange}
                  onConfirm={onMultiDigitConfirm}
                />
              )}
          </>
        ) : (
          <HandElectivePicker
            onSelect={handleDiagnosisSelect}
            onSnomedSelect={onSnomedSelect}
          />
        )}
      </SectionWrapper>

      {/* ── Section 2: Classification / Staging ────────────── */}
      {showClassificationSection ? (
        <SectionWrapper
          title="2. Classification"
          icon="sliders"
          collapsible
          isCollapsed={isSectionCollapsed("classification")}
          onCollapsedChange={(c) => setSectionCollapsed("classification", c)}
          subtitle={classificationSubtitle}
        >
          {/* Laterality */}
          <View style={styles.fieldGroup}>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Laterality
            </ThemedText>
            <View style={styles.chipRow}>
              {LATERALITY_OPTIONS.map((opt) => {
                const isSelected = laterality === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onLateralityChange(isSelected ? undefined : opt.value);
                    }}
                    style={[
                      styles.lateralityChip,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundTertiary,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.lateralityChipText,
                        {
                          color: isSelected ? theme.buttonText : theme.text,
                        },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Confirmed digit summary (read-only after multi-digit confirm) */}
          {affectedDigits &&
            affectedDigits.length > 0 &&
            selectedDiagnosis?.hasDigitMultiSelect === true && (
              <View style={styles.fieldGroup}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Affected Digits
                </ThemedText>
                <ThemedText style={{ fontSize: 14, color: theme.text }}>
                  {affectedDigits.map((d) => DIGIT_LABELS[d]).join(", ")}
                </ThemedText>
              </View>
            )}

          {/* Per-finger selection (legacy, non-multi-digit diagnoses) */}
          {fingerConfig &&
            !selectedDiagnosis?.hasDigitMultiSelect &&
            onAffectedFingersChange ? (
              <FingerSelectionChips
                config={fingerConfig}
                selectedFingers={affectedFingers ?? []}
                onChange={onAffectedFingersChange}
              />
            ) : null}

          {/* Per-finger Quinnell grading */}
          {showQuinnell && onTriggerFingerGradingChange ? (
            <PerFingerQuinnellGrading
              affectedFingers={affectedFingers ?? []}
              grading={triggerFingerGrading ?? {}}
              onChange={onTriggerFingerGradingChange}
            />
          ) : null}

          {/* Dupuytren per-ray assessment */}
          {hasDupuytren && onDupuytrenAssessmentChange ? (
            <DupuytrenAssessmentUI
              value={dupuytrenAssessment}
              onChange={onDupuytrenAssessmentChange}
              laterality={laterality as "left" | "right" | undefined}
              isRevision={selectedDiagnosis?.isRevision ?? false}
            />
          ) : null}

          {/* Staging systems */}
          {hasStaging
            ? diagnosisStaging!.stagingSystems.map((system) => {
                const handleSelect = (value: string) => {
                  onStagingChange(system.name, value);
                };
                if (system.options.length <= 5) {
                  return (
                    <InlineStagingButtons
                      key={system.name}
                      label={system.name}
                      options={system.options.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                        description: opt.description,
                      }))}
                      selectedValue={stagingValues[system.name] || ""}
                      onSelect={handleSelect}
                    />
                  );
                }
                return (
                  <PickerField
                    key={system.name}
                    label={system.name}
                    value={stagingValues[system.name] || ""}
                    options={system.options.map((opt) => ({
                      value: opt.value,
                      label: opt.description
                        ? `${opt.label} - ${opt.description}`
                        : opt.label,
                    }))}
                    onSelect={handleSelect}
                    placeholder={`Select ${system.name.toLowerCase()}...`}
                  />
                );
              })
            : null}
        </SectionWrapper>
      ) : null}

      {/* ── Section 3: Summary & Procedures ────────────────── */}
      {hasDiagnosis && !isPendingMultiDigit ? (
        <SectionWrapper
          title="3. Summary & Procedures"
          icon="check-circle"
          collapsible
          isCollapsed={isSectionCollapsed("procedures")}
          onCollapsedChange={(c) => setSectionCollapsed("procedures", c)}
        >
          {/* Summary card */}
          {selectedDiagnosis ? (
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.summaryHeader}>
                <Feather name="file-text" size={14} color={theme.link} />
                <ThemedText
                  style={[styles.summaryLabel, { color: theme.textSecondary }]}
                >
                  ASSESSMENT SUMMARY
                </ThemedText>
              </View>
              <ThemedText style={[styles.summaryTitle, { color: theme.text }]}>
                {selectedDiagnosis.displayName}
              </ThemedText>
              {classificationSubtitle ? (
                <ThemedText
                  style={[
                    styles.summarySubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {classificationSubtitle}
                </ThemedText>
              ) : null}
            </View>
          ) : primaryDiagnosis ? (
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText style={[styles.summaryTitle, { color: theme.text }]}>
                {primaryDiagnosis.term}
              </ThemedText>
              <ThemedText
                style={[styles.summarySubtitle, { color: theme.textSecondary }]}
              >
                SNOMED CT: {primaryDiagnosis.conceptId}
              </ThemedText>
            </View>
          ) : null}

          {/* Procedure suggestions */}
          {selectedDiagnosis ? (
            <ProcedureSuggestions
              diagnosis={selectedDiagnosis}
              stagingSelections={stagingValues}
              selectedProcedureIds={selectedSuggestionIds}
              onToggle={onToggleProcedureSuggestion}
            />
          ) : null}

          {/* Browse all procedures link */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onShowAllProcedures();
            }}
            style={styles.browseLink}
          >
            <Feather name="list" size={14} color={theme.link} />
            <ThemedText style={[styles.browseLinkText, { color: theme.link }]}>
              Browse full procedure picker
            </ThemedText>
          </Pressable>
        </SectionWrapper>
      ) : (
        /* Placeholder when no diagnosis selected */
        <View style={styles.placeholderContainer}>
          <ThemedText
            style={[styles.placeholderText, { color: theme.textTertiary }]}
          >
            Select a diagnosis above to see suggested procedures
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  lateralityChip: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  lateralityChipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  summarySubtitle: {
    fontSize: 13,
  },
  browseLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  browseLinkText: {
    fontSize: 13,
    fontWeight: "500",
  },
  placeholderContainer: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 13,
    textAlign: "center",
  },
});
