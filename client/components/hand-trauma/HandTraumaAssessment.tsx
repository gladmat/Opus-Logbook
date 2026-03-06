/**
 * Unified Hand Trauma Assessment component.
 * Replaces two separate modules (fracture classification + structure picker)
 * with one streamlined flow.
 *
 * Layout:
 * 1. DigitSelector — affected digits (I-V)
 * 2. InjuryCategoryChips — Fracture | Dislocation | Tendon | Nerve | Vessel | Soft Tissue
 * 3. Expandable sections — only visible when chip is active
 * 4. DiagnosisProcedureSuggestionPanel — auto-resolved diagnosis + suggested procedures
 *
 * Data contract:
 * - Receives HandTraumaDetails + FractureEntry[] + CaseProcedure[]
 * - Outputs updated versions of all three on save
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { v4 as uuidv4 } from "uuid";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  DigitId,
  HandTraumaDetails,
  HandTraumaStructure,
  FractureEntry,
  DislocationEntry,
  CaseProcedure,
} from "@/types/case";
import type { DiagnosisPicklistEntry } from "@/lib/diagnosisPicklists";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import {
  STRUCTURE_PROCEDURE_MAP,
  SMART_DEFAULTS,
  type StructureCategory,
} from "./structureConfig";
import type { InjuryCategory, TraumaMappingResult } from "@/lib/handTraumaMapping";
import { resolveTraumaDiagnosis } from "@/lib/handTraumaMapping";
import { resolveAOToDiagnosis } from "@/lib/aoToDiagnosisMapping";
import { findDiagnosisById, evaluateSuggestions } from "@/lib/diagnosisPicklists";

// Sub-components
import { DigitSelector } from "./DigitSelector";
import { InjuryCategoryChips } from "./InjuryCategoryChips";
import { FractureSection } from "./FractureSection";
import { DislocationSection } from "./DislocationSection";
import { SoftTissueSection, type SoftTissueState } from "./SoftTissueSection";
import { DiagnosisProcedureSuggestionPanel } from "./DiagnosisProcedureSuggestionPanel";

// Existing structure sections (reused from old picker)
import { FlexorTendonSection } from "./FlexorTendonSection";
import { ExtensorTendonSection } from "./ExtensorTendonSection";
import { NerveSection } from "./NerveSection";
import { ArterySection } from "./ArterySection";
import { LigamentSection } from "./LigamentSection";
import { OtherStructuresSection } from "./OtherStructuresSection";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HandTraumaAssessmentProps {
  value: HandTraumaDetails;
  onChange: (details: HandTraumaDetails) => void;
  fractures: FractureEntry[];
  onFracturesChange: (fractures: FractureEntry[]) => void;
  procedures: CaseProcedure[];
  onProceduresChange: (
    updater: (prev: CaseProcedure[]) => CaseProcedure[],
  ) => void;
  selectedDiagnosis?: DiagnosisPicklistEntry;
  /** Called when the user accepts suggestions and wants to save */
  onAccept: () => void;
}

// Map InjuryCategory to StructureCategory for the existing section components
const STRUCTURE_CATEGORY_MAP: Partial<Record<InjuryCategory, StructureCategory[]>> = {
  tendon: ["flexor_tendon", "extensor_tendon"],
  nerve: ["nerve"],
  vessel: ["artery"],
};

function lookupProcedureMap(structureId: string): string | undefined {
  if (STRUCTURE_PROCEDURE_MAP[structureId])
    return STRUCTURE_PROCEDURE_MAP[structureId];
  if (structureId.startsWith("pip_collateral_"))
    return STRUCTURE_PROCEDURE_MAP["pip_collateral"];
  if (structureId.startsWith("volar_plate_"))
    return STRUCTURE_PROCEDURE_MAP["volar_plate"];
  return undefined;
}

export function HandTraumaAssessment({
  value,
  onChange,
  fractures,
  onFracturesChange,
  procedures,
  onProceduresChange,
  selectedDiagnosis,
  onAccept,
}: HandTraumaAssessmentProps) {
  const { theme } = useTheme();

  // Active injury categories
  const [activeCategories, setActiveCategories] = useState<Set<InjuryCategory>>(
    new Set(),
  );

  // Tendon zone state (reused from structure picker)
  const [flexorZone, setFlexorZone] = useState("");
  const [extensorZone, setExtensorZone] = useState("");

  // Suggested procedure selections
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<Set<string>>(
    new Set(),
  );

  const initializedRef = useRef(false);

  const selectedDigits = value.affectedDigits ?? [];
  const injuredStructures = value.injuredStructures ?? [];
  const dislocations = value.dislocations ?? [];

  // ─── Initialize from existing data ─────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const cats = new Set<InjuryCategory>();

    // Auto-open categories based on existing data
    if (fractures.length > 0) cats.add("fracture");
    if (dislocations.length > 0) cats.add("dislocation");
    if (injuredStructures.some((s) => s.category === "flexor_tendon" || s.category === "extensor_tendon"))
      cats.add("tendon");
    if (injuredStructures.some((s) => s.category === "nerve")) cats.add("nerve");
    if (injuredStructures.some((s) => s.category === "artery")) cats.add("vessel");
    if (
      value.isHighPressureInjection ||
      value.isFightBite ||
      value.isCompartmentSyndrome ||
      value.isRingAvulsion ||
      value.amputationLevel ||
      injuredStructures.some((s) => s.category === "ligament" || s.category === "other")
    )
      cats.add("soft_tissue");

    // Smart defaults from diagnosis
    if (selectedDiagnosis) {
      const defaults = SMART_DEFAULTS[selectedDiagnosis.id];
      if (defaults) {
        for (const cat of defaults) {
          if (cat === "flexor_tendon" || cat === "extensor_tendon") cats.add("tendon");
          else if (cat === "nerve") cats.add("nerve");
          else if (cat === "artery") cats.add("vessel");
          else if (cat === "ligament" || cat === "other") cats.add("soft_tissue");
        }
      }
    }

    if (cats.size > 0) setActiveCategories(cats);
  }, [selectedDiagnosis, fractures, dislocations, injuredStructures, value]);

  // ─── Category toggle ───────────────────────────────────────────────────────
  const handleCategoryToggle = useCallback((category: InjuryCategory) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // ─── Digit change handler ──────────────────────────────────────────────────
  const handleDigitsChange = useCallback(
    (digits: DigitId[]) => {
      const removedDigits = selectedDigits.filter((d) => !digits.includes(d));

      if (removedDigits.length > 0) {
        const structuresToRemove = injuredStructures.filter(
          (s) => s.digit && removedDigits.includes(s.digit),
        );
        const procIdsToRemove = structuresToRemove
          .map((s) => s.generatedProcedureId)
          .filter(Boolean) as string[];

        if (procIdsToRemove.length > 0) {
          onProceduresChange((prev) =>
            prev.filter((p) => !procIdsToRemove.includes(p.id)),
          );
        }

        const remainingStructures = injuredStructures.filter(
          (s) => !s.digit || !removedDigits.includes(s.digit),
        );
        onChange({
          ...value,
          affectedDigits: digits,
          injuredStructures: remainingStructures,
        });
      } else {
        onChange({ ...value, affectedDigits: digits });
      }
    },
    [value, injuredStructures, selectedDigits, onChange, onProceduresChange],
  );

  // ─── Structure toggle handlers (reused from HandTraumaStructurePicker) ─────
  const createProcedure = useCallback(
    (structure: HandTraumaStructure): string | undefined => {
      const picklistId = lookupProcedureMap(structure.structureId);
      if (!picklistId) return undefined;

      const entry = findPicklistEntry(picklistId);
      if (!entry) return undefined;

      const procId = uuidv4();
      const notesParts: string[] = [structure.displayName];
      if (structure.zone) notesParts.push(`Zone ${structure.zone}`);
      if (structure.digit) notesParts.push(`Digit ${structure.digit}`);

      const newProc: CaseProcedure = {
        id: procId,
        sequenceOrder: 0,
        procedureName: entry.displayName,
        specialty: "hand_wrist",
        subcategory: entry.subcategory,
        picklistEntryId: entry.id,
        tags: entry.tags as CaseProcedure["tags"],
        snomedCtCode: entry.snomedCtCode,
        snomedCtDisplay: entry.snomedCtDisplay,
        surgeonRole: "PS",
        notes: notesParts.join(" | "),
      };

      onProceduresChange((prev) => {
        const maxSeq = prev.reduce((m, p) => Math.max(m, p.sequenceOrder), 0);
        return [...prev, { ...newProc, sequenceOrder: maxSeq + 1 }];
      });

      return procId;
    },
    [onProceduresChange],
  );

  const removeProcedure = useCallback(
    (generatedProcedureId: string) => {
      onProceduresChange((prev) =>
        prev.filter((p) => p.id !== generatedProcedureId),
      );
    },
    [onProceduresChange],
  );

  const handleToggleTendonStructure = useCallback(
    (structure: HandTraumaStructure) => {
      const existing = injuredStructures.find(
        (s) =>
          s.category === structure.category &&
          s.structureId === structure.structureId &&
          s.digit === structure.digit,
      );

      if (existing) {
        if (existing.generatedProcedureId) {
          removeProcedure(existing.generatedProcedureId);
        }
        const updated = injuredStructures.filter((s) => s !== existing);
        onChange({ ...value, injuredStructures: updated });
      } else {
        const procId = createProcedure(structure);
        const newStructure: HandTraumaStructure = {
          ...structure,
          generatedProcedurePicklistId: lookupProcedureMap(
            structure.structureId,
          ),
          generatedProcedureId: procId,
        };
        onChange({
          ...value,
          injuredStructures: [...injuredStructures, newStructure],
        });
      }
    },
    [value, injuredStructures, onChange, createProcedure, removeProcedure],
  );

  const handleToggleParamStructure = useCallback(
    (
      structureId: string,
      category: StructureCategory,
      displayName: string,
      digit?: DigitId,
      side?: "radial" | "ulnar",
    ) => {
      const existing = injuredStructures.find(
        (s) => s.category === category && s.structureId === structureId,
      );

      if (existing) {
        if (existing.generatedProcedureId) {
          removeProcedure(existing.generatedProcedureId);
        }
        const updated = injuredStructures.filter((s) => s !== existing);
        onChange({ ...value, injuredStructures: updated });
      } else {
        const structure: HandTraumaStructure = {
          category,
          structureId,
          displayName,
          digit,
          side,
        };
        const procId = createProcedure(structure);
        const newStructure: HandTraumaStructure = {
          ...structure,
          generatedProcedurePicklistId: lookupProcedureMap(structureId),
          generatedProcedureId: procId,
        };
        onChange({
          ...value,
          injuredStructures: [...injuredStructures, newStructure],
        });
      }
    },
    [value, injuredStructures, onChange, createProcedure, removeProcedure],
  );

  // ─── Dislocation handler ───────────────────────────────────────────────────
  const handleDislocationsChange = useCallback(
    (newDislocations: DislocationEntry[]) => {
      onChange({ ...value, dislocations: newDislocations });
    },
    [value, onChange],
  );

  // ─── Soft tissue state ─────────────────────────────────────────────────────
  const softTissueState = useMemo(
    () => ({
      isHighPressureInjection: value.isHighPressureInjection ?? false,
      isFightBite: value.isFightBite ?? false,
      isCompartmentSyndrome: value.isCompartmentSyndrome ?? false,
      isRingAvulsion: value.isRingAvulsion ?? false,
      amputationLevel: value.amputationLevel,
      isReplantable: value.isReplantable,
    }),
    [value],
  );

  const handleSoftTissueChange = useCallback(
    (state: SoftTissueState) => {
      onChange({
        ...value,
        isHighPressureInjection: state.isHighPressureInjection || undefined,
        isFightBite: state.isFightBite || undefined,
        isCompartmentSyndrome: state.isCompartmentSyndrome || undefined,
        isRingAvulsion: state.isRingAvulsion || undefined,
        amputationLevel: state.amputationLevel,
        isReplantable: state.isReplantable,
      });
    },
    [value, onChange],
  );

  // ─── Mapping resolution ────────────────────────────────────────────────────
  const mappingResult = useMemo<TraumaMappingResult | null>(() => {
    // Build the selection from current state
    const selection = {
      affectedDigits: selectedDigits,
      activeCategories: Array.from(activeCategories),
      fractures,
      dislocations,
      injuredStructures,
      isHighPressureInjection: value.isHighPressureInjection,
      isFightBite: value.isFightBite,
      isCompartmentSyndrome: value.isCompartmentSyndrome,
      isRingAvulsion: value.isRingAvulsion,
      amputationLevel: value.amputationLevel,
      isReplantable: value.isReplantable,
    };

    // Try the extended mapping first (dislocations, special injuries, amputation)
    const traumaResult = resolveTraumaDiagnosis(selection);
    if (traumaResult) return traumaResult;

    // Fall back to AO fracture mapping
    const fx = fractures[0];
    if (fx) {
      const aoResult = resolveAOToDiagnosis({
        familyCode: fx.details.familyCode,
        finger: fx.details.finger,
        phalanx: fx.details.phalanx,
        segment: fx.details.segment,
        type: fx.details.type,
        subBoneId: fx.details.subBoneId,
      });
      if (aoResult) {
        // Convert AO mapping result to TraumaMappingResult shape
        const diagEntry = findDiagnosisById(aoResult.diagnosisPicklistId);
        if (diagEntry) {
          const evaluated = evaluateSuggestions(diagEntry);
          return {
            primaryDiagnosis: {
              diagnosisPicklistId: diagEntry.id,
              displayName: diagEntry.displayName,
              snomedCtCode: diagEntry.snomedCtCode ?? "",
            },
            suggestedProcedures: evaluated.map((s) => ({
              procedurePicklistId: s.procedurePicklistId,
              displayName: s.displayName ?? s.procedurePicklistId,
              isDefault: s.isDefault,
              reason: "Matched from AO classification",
            })),
          };
        }
      }
    }

    return null;
  }, [
    selectedDigits,
    activeCategories,
    fractures,
    dislocations,
    injuredStructures,
    value,
  ]);

  // Auto-select default procedures when mapping changes
  useEffect(() => {
    if (!mappingResult) return;
    const defaults = new Set<string>();
    for (const proc of mappingResult.suggestedProcedures) {
      if (proc.isDefault) {
        defaults.add(proc.procedurePicklistId);
      }
    }
    setSelectedProcedureIds(defaults);
  }, [mappingResult]);

  const handleToggleProcedure = useCallback((procedureId: string) => {
    setSelectedProcedureIds((prev) => {
      const next = new Set(prev);
      if (next.has(procedureId)) {
        next.delete(procedureId);
      } else {
        next.add(procedureId);
      }
      return next;
    });
  }, []);

  // ─── Category counts for badge display ─────────────────────────────────────
  const categoryCounts = useMemo<Partial<Record<InjuryCategory, number>>>(() => {
    const counts: Partial<Record<InjuryCategory, number>> = {};
    if (fractures.length > 0) counts.fracture = fractures.length;
    if (dislocations.length > 0) counts.dislocation = dislocations.length;

    const tendonCount = injuredStructures.filter(
      (s) => s.category === "flexor_tendon" || s.category === "extensor_tendon",
    ).length;
    if (tendonCount > 0) counts.tendon = tendonCount;

    const nerveCount = injuredStructures.filter(
      (s) => s.category === "nerve",
    ).length;
    if (nerveCount > 0) counts.nerve = nerveCount;

    const vesselCount = injuredStructures.filter(
      (s) => s.category === "artery",
    ).length;
    if (vesselCount > 0) counts.vessel = vesselCount;

    const softCount =
      injuredStructures.filter(
        (s) => s.category === "ligament" || s.category === "other",
      ).length +
      (value.isHighPressureInjection ? 1 : 0) +
      (value.isFightBite ? 1 : 0) +
      (value.isCompartmentSyndrome ? 1 : 0) +
      (value.isRingAvulsion ? 1 : 0) +
      (value.amputationLevel ? 1 : 0);
    if (softCount > 0) counts.soft_tissue = softCount;

    return counts;
  }, [fractures, dislocations, injuredStructures, value]);

  const structureProcedureCount = injuredStructures.filter(
    (s) => s.generatedProcedureId,
  ).length;

  return (
    <View style={styles.container}>
      {/* 1. Digit Selector */}
      <DigitSelector
        selectedDigits={selectedDigits}
        onChange={handleDigitsChange}
      />

      {/* 2. Injury Category Chips */}
      <InjuryCategoryChips
        activeCategories={activeCategories}
        onToggle={handleCategoryToggle}
        categoryCounts={categoryCounts}
      />

      {/* 3. Expandable Sections */}

      {/* Fracture Section */}
      {activeCategories.has("fracture") ? (
        <SectionWrapper
          title="Fracture Classification"
          icon="hexagon"
          theme={theme}
        >
          <FractureSection
            fractures={fractures}
            onFracturesChange={onFracturesChange}
            selectedDigits={selectedDigits}
          />
        </SectionWrapper>
      ) : null}

      {/* Dislocation Section */}
      {activeCategories.has("dislocation") ? (
        <SectionWrapper title="Dislocation" icon="shuffle" theme={theme}>
          <DislocationSection
            dislocations={dislocations}
            onDislocationsChange={handleDislocationsChange}
            selectedDigits={selectedDigits}
          />
        </SectionWrapper>
      ) : null}

      {/* Tendon Section (flexor + extensor) */}
      {activeCategories.has("tendon") ? (
        <SectionWrapper title="Tendons" icon="trending-up" theme={theme}>
          <View style={styles.tendonSubSections}>
            <ThemedText
              style={[styles.tendonSubLabel, { color: theme.textSecondary }]}
            >
              FLEXOR
            </ThemedText>
            <FlexorTendonSection
              selectedDigits={selectedDigits}
              checkedStructures={injuredStructures}
              zone={flexorZone}
              onZoneChange={setFlexorZone}
              onToggleStructure={handleToggleTendonStructure}
            />
            <View
              style={[styles.tendonDivider, { backgroundColor: theme.border }]}
            />
            <ThemedText
              style={[styles.tendonSubLabel, { color: theme.textSecondary }]}
            >
              EXTENSOR
            </ThemedText>
            <ExtensorTendonSection
              selectedDigits={selectedDigits}
              checkedStructures={injuredStructures}
              zone={extensorZone}
              onZoneChange={setExtensorZone}
              onToggleStructure={handleToggleTendonStructure}
            />
          </View>
        </SectionWrapper>
      ) : null}

      {/* Nerve Section */}
      {activeCategories.has("nerve") ? (
        <SectionWrapper title="Nerves" icon="zap" theme={theme}>
          <NerveSection
            selectedDigits={selectedDigits}
            checkedStructures={injuredStructures}
            onToggleStructure={handleToggleParamStructure}
          />
        </SectionWrapper>
      ) : null}

      {/* Vessel Section */}
      {activeCategories.has("vessel") ? (
        <SectionWrapper title="Vessels" icon="droplet" theme={theme}>
          <ArterySection
            selectedDigits={selectedDigits}
            checkedStructures={injuredStructures}
            onToggleStructure={handleToggleParamStructure}
          />
        </SectionWrapper>
      ) : null}

      {/* Soft Tissue Section */}
      {activeCategories.has("soft_tissue") ? (
        <SectionWrapper title="Soft Tissue" icon="layers" theme={theme}>
          {/* Ligaments + Other structures */}
          <View style={styles.ligOtherSections}>
            <LigamentSection
              selectedDigits={selectedDigits}
              checkedStructures={injuredStructures}
              onToggleStructure={handleToggleParamStructure}
            />
            <OtherStructuresSection
              selectedDigits={selectedDigits}
              checkedStructures={injuredStructures}
              onToggleStructure={handleToggleParamStructure}
            />
          </View>
          <View
            style={[styles.tendonDivider, { backgroundColor: theme.border }]}
          />
          <SoftTissueSection
            value={softTissueState}
            onChange={handleSoftTissueChange}
            selectedDigits={selectedDigits}
          />
        </SectionWrapper>
      ) : null}

      {/* 4. Diagnosis & Procedure Suggestion Panel */}
      <DiagnosisProcedureSuggestionPanel
        mappingResult={mappingResult}
        selectedProcedureIds={selectedProcedureIds}
        onToggleProcedure={handleToggleProcedure}
        onAccept={onAccept}
        hasStructureProcedures={structureProcedureCount > 0}
        structureProcedureCount={structureProcedureCount}
      />
    </View>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function SectionWrapper({
  title,
  icon,
  theme,
  children,
}: {
  title: string;
  icon: string;
  theme: any;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Feather name={icon as any} size={16} color={theme.link} />
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          {title}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  sectionCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  tendonSubSections: {
    gap: Spacing.md,
  },
  tendonSubLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tendonDivider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  ligOtherSections: {
    gap: Spacing.md,
  },
});
