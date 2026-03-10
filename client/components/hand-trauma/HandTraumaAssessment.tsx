/**
 * Unified Hand Trauma Assessment component.
 * Replaces two separate modules (fracture classification + structure picker)
 * with one streamlined flow.
 *
 * Layout:
 * 1. Incident
 * 2. InjuryCategoryChips + DigitSelector
 * 3. Expandable sections — only visible when chip is active
 * 4. DiagnosisProcedureSuggestionPanel — auto-resolved diagnosis + suggested procedures
 *
 * Data contract:
 * - Receives HandTraumaDetails + FractureEntry[] + CaseProcedure[]
 * - Outputs updated versions of all three on save
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
} from "react-native";
import { v4 as uuidv4 } from "uuid";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { DatePickerField, FormField } from "@/components/FormField";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type {
  DigitId,
  HandTraumaCompleteness,
  HandTraumaDetails,
  HandTraumaStructure,
  FractureEntry,
  DislocationEntry,
  CaseProcedure,
  Laterality,
  PerfusionStatusEntry,
  SoftTissueDescriptor,
} from "@/types/case";
import type { DiagnosisPicklistEntry } from "@/lib/diagnosisPicklists";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import {
  STRUCTURE_PROCEDURE_MAP,
  SMART_DEFAULTS,
  type StructureCategory,
} from "./structureConfig";
import type {
  InjuryCategory,
  TraumaDiagnosisPair,
  TraumaMappingResult,
} from "@/lib/handTraumaMapping";
import { resolveTraumaDiagnosis } from "@/lib/handTraumaMapping";

// Sub-components
import { DigitSelector } from "./DigitSelector";
import { InjuryCategoryChips } from "./InjuryCategoryChips";
import { FractureSection } from "./FractureSection";
import { DislocationSection } from "./DislocationSection";
import {
  SoftTissueDescriptorSection,
  SoftTissueSpecialInjurySection,
  type SoftTissueState,
  type DefectLocation,
} from "./SoftTissueSection";
import { DiagnosisProcedureSuggestionPanel } from "./DiagnosisProcedureSuggestionPanel";

// Existing structure sections (reused from old picker)
import { FlexorTendonSection } from "./FlexorTendonSection";
import { ExtensorTendonSection } from "./ExtensorTendonSection";
import { NerveSection } from "./NerveSection";
import { ArterySection } from "./ArterySection";
import { LigamentSection } from "./LigamentSection";
import { OtherStructuresSection } from "./OtherStructuresSection";
import { AmputationSection, type AmputationState } from "./AmputationSection";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HandTraumaAssessmentProps {
  value: HandTraumaDetails;
  onChange: (details: HandTraumaDetails) => void;
  incident?: HandTraumaIncidentValue;
  onIncidentChange?: (incident: HandTraumaIncidentValue) => void;
  fractures: FractureEntry[];
  onFracturesChange: (fractures: FractureEntry[]) => void;
  procedures: CaseProcedure[];
  onProceduresChange: (
    updater: (prev: CaseProcedure[]) => CaseProcedure[],
  ) => void;
  selectedDiagnosis?: DiagnosisPicklistEntry;
  /** Called when the user accepts suggestions and wants to save */
  onAccept: (payload: HandTraumaAssessmentAcceptPayload) => void;
  /** Reveal manual diagnosis picker in parent container */
  onEditDiagnosis?: () => void;
  /** Reveal the full manual procedure editor in the parent container */
  onReviewProcedures?: (payload: HandTraumaAssessmentAcceptPayload) => void;
}

export interface HandTraumaIncidentValue {
  laterality?: Laterality;
  injuryMechanism?: string;
  injuryMechanismOther?: string;
  injuryDate?: string;
}

export interface HandTraumaAssessmentAcceptPayload {
  mappingResult: TraumaMappingResult | null;
  selectedProcedureIds: string[];
}

const TRAUMA_MECHANISM_OPTIONS = [
  { value: "crush", label: "Crush" },
  { value: "saw_blade", label: "Saw / blade" },
  { value: "fall", label: "Fall" },
  { value: "punch_assault", label: "Punch / assault" },
  { value: "sports", label: "Sports" },
  { value: "mva", label: "MVA" },
  { value: "work_related", label: "Work-related" },
  { value: "other", label: "Other" },
] as const;

const EMPTY_INCIDENT: HandTraumaIncidentValue = {};

/* ── Composite-key helpers for per-pair procedure selection ── */
const PAIR_SEP = "::";
function compositeId(pairKey: string, procedureId: string): string {
  return `${pairKey}${PAIR_SEP}${procedureId}`;
}
function extractProcedureId(composite: string): string {
  const idx = composite.indexOf(PAIR_SEP);
  return idx >= 0 ? composite.slice(idx + PAIR_SEP.length) : composite;
}
function flattenSelections(selectedIds: Set<string>): string[] {
  return [...new Set([...selectedIds].map(extractProcedureId))];
}

interface AcceptedMappingSnapshot {
  selectionSignature: string;
  mappingResult: TraumaMappingResult;
  selectedProcedureIds: string[];
}

function buildSelectionSignature({
  laterality,
  injuryMechanism,
  injuryMechanismOther,
  digits,
  fractures,
  dislocations,
  injuredStructures,
  perfusionStatuses,
  softTissueDescriptors,
  isHighPressureInjection,
  isFightBite,
  isCompartmentSyndrome,
  isRingAvulsion,
  digitAmputations,
  amputationLevel,
  amputationType,
  isReplantable,
}: {
  laterality?: Laterality;
  injuryMechanism?: string;
  injuryMechanismOther?: string;
  digits: DigitId[];
  fractures: FractureEntry[];
  dislocations: DislocationEntry[];
  injuredStructures: HandTraumaStructure[];
  perfusionStatuses: PerfusionStatusEntry[];
  softTissueDescriptors: SoftTissueDescriptor[];
  isHighPressureInjection?: boolean;
  isFightBite?: boolean;
  isCompartmentSyndrome?: boolean;
  isRingAvulsion?: boolean;
  digitAmputations?: import("@/types/case").DigitAmputation[];
  amputationLevel?: HandTraumaDetails["amputationLevel"];
  amputationType?: HandTraumaDetails["amputationType"];
  isReplantable?: boolean;
}) {
  return JSON.stringify({
    laterality,
    injuryMechanism,
    injuryMechanismOther: injuryMechanismOther?.trim() || undefined,
    digits: [...digits].sort(),
    fractures: [...fractures]
      .map((fracture) => ({
        id: fracture.id,
        boneId: fracture.boneId,
        aoCode: fracture.aoCode,
        details: fracture.details,
      }))
      .sort((a, b) =>
        `${a.boneId}|${a.aoCode}|${a.id}`.localeCompare(
          `${b.boneId}|${b.aoCode}|${b.id}`,
        ),
      ),
    dislocations: [...dislocations].sort((a, b) =>
      [
        a.joint,
        a.digit ?? "",
        a.direction ?? "",
        a.hasFracture ? "1" : "0",
        a.isComplex ? "1" : "0",
      ]
        .join("|")
        .localeCompare(
          [
            b.joint,
            b.digit ?? "",
            b.direction ?? "",
            b.hasFracture ? "1" : "0",
            b.isComplex ? "1" : "0",
          ].join("|"),
        ),
    ),
    injuredStructures: [...injuredStructures]
      .map((structure) => ({
        category: structure.category,
        structureId: structure.structureId,
        digit: structure.digit,
        zone: structure.zone,
        side: structure.side,
        completeness: structure.completeness,
      }))
      .sort((a, b) =>
        [
          a.category,
          a.structureId,
          a.digit ?? "",
          a.zone ?? "",
          a.side ?? "",
          a.completeness ?? "",
        ]
          .join("|")
          .localeCompare(
            [
              b.category,
              b.structureId,
              b.digit ?? "",
              b.zone ?? "",
              b.side ?? "",
              b.completeness ?? "",
            ].join("|"),
          ),
      ),
    perfusionStatuses: [...perfusionStatuses].sort((a, b) =>
      `${a.digit}|${a.status}`.localeCompare(`${b.digit}|${b.status}`),
    ),
    softTissueDescriptors: [...softTissueDescriptors]
      .map((descriptor) => ({
        ...descriptor,
        digits: descriptor.digits ? [...descriptor.digits].sort() : undefined,
        surfaces: descriptor.surfaces
          ? [...descriptor.surfaces].sort()
          : undefined,
      }))
      .sort((a, b) =>
        `${a.type}|${(a.surfaces ?? []).join(",")}|${(a.digits ?? []).join(",")}`.localeCompare(
          `${b.type}|${(b.surfaces ?? []).join(",")}|${(b.digits ?? []).join(",")}`,
        ),
      ),
    flags: {
      isHighPressureInjection,
      isFightBite,
      isCompartmentSyndrome,
      isRingAvulsion,
    },
    digitAmputations,
    amputationLevel,
    amputationType,
    isReplantable,
  });
}

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
  incident,
  onIncidentChange,
  fractures,
  onFracturesChange,
  procedures,
  onProceduresChange,
  selectedDiagnosis,
  onAccept,
  onEditDiagnosis,
  onReviewProcedures,
}: HandTraumaAssessmentProps) {
  const { theme } = useTheme();
  const [localIncident, setLocalIncident] = useState<HandTraumaIncidentValue>(
    incident ?? {},
  );

  // Active injury categories
  const [activeCategories, setActiveCategories] = useState<Set<InjuryCategory>>(
    new Set(),
  );

  // Tendon zone state (reused from structure picker)
  const [flexorZone, setFlexorZone] = useState("");
  const [extensorZone, setExtensorZone] = useState("");
  const [flexorCompleteness, setFlexorCompleteness] =
    useState<HandTraumaCompleteness>("complete");
  const [extensorCompleteness, setExtensorCompleteness] =
    useState<HandTraumaCompleteness>("complete");

  // Suggested procedure selections
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<Set<string>>(
    new Set(),
  );
  const [acceptedMapping, setAcceptedMapping] =
    useState<AcceptedMappingSnapshot | null>(null);
  const [hasPendingReviewChanges, setHasPendingReviewChanges] = useState(false);

  const initializedRef = useRef(false);
  const effectiveIncident = useMemo(
    () => (onIncidentChange ? (incident ?? EMPTY_INCIDENT) : localIncident),
    [incident, localIncident, onIncidentChange],
  );
  const selectedLaterality =
    effectiveIncident.laterality === "left" ||
    effectiveIncident.laterality === "right"
      ? effectiveIncident.laterality
      : undefined;
  const selectedMechanism = effectiveIncident.injuryMechanism;
  const selectedMechanismOther = effectiveIncident.injuryMechanismOther ?? "";
  const injuryDate = effectiveIncident.injuryDate ?? "";
  const isIncidentReady = Boolean(selectedLaterality);

  const selectedDigits = useMemo(
    () => value.affectedDigits ?? [],
    [value.affectedDigits],
  );
  const injuredStructures = useMemo(
    () => value.injuredStructures ?? [],
    [value.injuredStructures],
  );
  const dislocations = useMemo(
    () => value.dislocations ?? [],
    [value.dislocations],
  );
  const perfusionStatuses = useMemo(
    () => value.perfusionStatuses ?? [],
    [value.perfusionStatuses],
  );
  const softTissueDescriptors = useMemo(
    () => value.softTissueDescriptors ?? [],
    [value.softTissueDescriptors],
  );

  const updateIncident = useCallback(
    (updates: Partial<HandTraumaIncidentValue>) => {
      const next: HandTraumaIncidentValue = {
        ...effectiveIncident,
        ...updates,
      };
      if (onIncidentChange) {
        onIncidentChange(next);
      } else {
        setLocalIncident(next);
      }
    },
    [effectiveIncident, onIncidentChange],
  );

  useEffect(() => {
    setLocalIncident(incident ?? EMPTY_INCIDENT);
  }, [incident]);

  // ─── Initialize from existing data ─────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const cats = new Set<InjuryCategory>();

    // Auto-open categories based on existing data
    if (fractures.length > 0) cats.add("fracture");
    if (dislocations.length > 0) cats.add("dislocation");
    if (
      injuredStructures.some(
        (s) =>
          s.category === "flexor_tendon" || s.category === "extensor_tendon",
      )
    )
      cats.add("tendon");
    if (injuredStructures.some((s) => s.category === "nerve"))
      cats.add("nerve");
    if (injuredStructures.some((s) => s.category === "artery"))
      cats.add("vessel");
    // Soft tissue: descriptors + nail bed
    if (
      (value.softTissueDescriptors?.length ?? 0) > 0 ||
      injuredStructures.some(
        (s) => s.category === "other" && s.structureId === "nail_bed",
      )
    )
      cats.add("soft_tissue");
    // Ligament: ligament structures + volar plate
    if (
      injuredStructures.some(
        (s) =>
          s.category === "ligament" ||
          (s.category === "other" && s.structureId.startsWith("volar_plate_")),
      )
    )
      cats.add("ligament");
    // Special injuries
    if (
      value.isHighPressureInjection ||
      value.isFightBite ||
      value.isCompartmentSyndrome ||
      value.isRingAvulsion
    )
      cats.add("special");
    if (
      value.amputationLevel ||
      (value.digitAmputations && value.digitAmputations.length > 0)
    )
      cats.add("amputation");

    // Smart defaults from diagnosis
    if (selectedDiagnosis) {
      const defaults = SMART_DEFAULTS[selectedDiagnosis.id];
      if (defaults) {
        for (const cat of defaults) {
          if (cat === "flexor_tendon" || cat === "extensor_tendon")
            cats.add("tendon");
          else if (cat === "nerve") cats.add("nerve");
          else if (cat === "artery") cats.add("vessel");
          else if (cat === "ligament") cats.add("ligament");
          else if (cat === "other") cats.add("soft_tissue");
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

  const ensureFractureCategory = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveCategories((prev) => {
      if (prev.has("fracture")) return prev;
      const next = new Set(prev);
      next.add("fracture");
      return next;
    });
  }, []);

  // ─── Digit change handler ──────────────────────────────────────────────────
  const handleDigitsChange = useCallback(
    (digits: DigitId[]) => {
      const removedDigits = selectedDigits.filter((d) => !digits.includes(d));
      const removedFingerIds = new Set<string>(
        removedDigits.map((digit) =>
          digit === "I"
            ? "1"
            : digit === "II"
              ? "2"
              : digit === "III"
                ? "3"
                : digit === "IV"
                  ? "4"
                  : "5",
        ),
      );

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
        const remainingFractures = fractures.filter((fracture) => {
          const finger = fracture.details.finger;
          return !finger || !removedFingerIds.has(finger);
        });
        const remainingDislocations = dislocations.filter(
          (entry) => !entry.digit || !removedDigits.includes(entry.digit),
        );
        const remainingPerfusion = perfusionStatuses.filter(
          (entry) => !removedDigits.includes(entry.digit),
        );
        const remainingSoftTissueDescriptors = (
          value.softTissueDescriptors ?? []
        )
          .map((descriptor) => ({
            ...descriptor,
            digits: descriptor.digits?.filter(
              (digit) => !removedDigits.includes(digit),
            ),
          }))
          .filter(
            (descriptor) => !descriptor.digits || descriptor.digits.length > 0,
          );
        onChange({
          ...value,
          affectedDigits: digits,
          injuredStructures: remainingStructures,
          dislocations:
            remainingDislocations.length > 0
              ? remainingDislocations
              : undefined,
          perfusionStatuses:
            remainingPerfusion.length > 0 ? remainingPerfusion : undefined,
          softTissueDescriptors:
            remainingSoftTissueDescriptors.length > 0
              ? remainingSoftTissueDescriptors
              : undefined,
        });
        onFracturesChange(remainingFractures);
      } else {
        onChange({ ...value, affectedDigits: digits });
      }
    },
    [
      dislocations,
      fractures,
      value,
      injuredStructures,
      selectedDigits,
      perfusionStatuses,
      onChange,
      onFracturesChange,
      onProceduresChange,
    ],
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
        if (
          existing.zone !== structure.zone ||
          existing.completeness !== structure.completeness
        ) {
          const updated = injuredStructures.map((entry) =>
            entry === existing ? { ...existing, ...structure } : entry,
          );
          onChange({ ...value, injuredStructures: updated });
          return;
        }
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
        (s) =>
          s.category === category &&
          s.structureId === structureId &&
          s.digit === digit,
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
  const softTissueState = useMemo((): SoftTissueState => {
    const descriptors = value.softTissueDescriptors ?? [];
    // Coverage descriptors (defect/loss/degloving) carry location info
    const coverageDescriptors = descriptors.filter(
      (d) => d.type === "defect" || d.type === "loss" || d.type === "degloving",
    );

    // Group into DefectLocations by unique zone+surfaces+size+digits signature
    const locationMap = new Map<string, DefectLocation>();
    for (const d of coverageDescriptors) {
      const key = JSON.stringify({
        zone: d.zone ?? null,
        surfaces: [...(d.surfaces ?? [])].sort(),
        size: d.size ?? null,
        digits: [...(d.digits ?? [])].sort(),
      });
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          digits: d.digits ?? [],
          zone: d.zone,
          surfaces: (d.surfaces ?? []) as ("palmar" | "dorsal")[],
          size: d.size,
        });
      }
    }
    // If there are coverage types but no locations were derived, add one empty location
    const defectLocations =
      locationMap.size > 0
        ? Array.from(locationMap.values())
        : coverageDescriptors.length > 0
          ? [{ digits: [], surfaces: [] as ("palmar" | "dorsal")[] }]
          : [];

    return {
      isHighPressureInjection: value.isHighPressureInjection ?? false,
      isFightBite: value.isFightBite ?? false,
      isCompartmentSyndrome: value.isCompartmentSyndrome ?? false,
      isRingAvulsion: value.isRingAvulsion ?? false,
      hasSoftTissueDefect: descriptors.some((e) => e.type === "defect"),
      hasSoftTissueLoss: descriptors.some((e) => e.type === "loss"),
      hasDegloving: descriptors.some((e) => e.type === "degloving"),
      hasGrossContamination: descriptors.some(
        (e) => e.type === "contamination",
      ),
      defectLocations,
    };
  }, [value]);

  const amputationState = useMemo((): AmputationState => {
    // Prefer new digitAmputations; fall back to legacy single-level fields
    if (value.digitAmputations && value.digitAmputations.length > 0) {
      return {
        digitAmputations: value.digitAmputations,
        amputationLevel: value.amputationLevel,
        amputationType: value.amputationType,
        isReplantable: value.isReplantable,
      };
    }
    // Legacy migration: wrap single-level in digitAmputations[0]
    if (value.amputationLevel) {
      const legacyDigit = selectedDigits[0] ?? ("D1" as DigitId);
      return {
        digitAmputations: [
          {
            digit: legacyDigit,
            level: value.amputationLevel,
            type: value.amputationType ?? "complete",
            isReplantable: value.isReplantable,
          },
        ],
        amputationLevel: value.amputationLevel,
        amputationType: value.amputationType,
        isReplantable: value.isReplantable,
      };
    }
    return {
      digitAmputations: [],
      amputationLevel: undefined,
      amputationType: undefined,
      isReplantable: undefined,
    };
  }, [
    value.digitAmputations,
    value.amputationLevel,
    value.amputationType,
    value.isReplantable,
    selectedDigits,
  ]);

  const handleSoftTissueChange = useCallback(
    (state: SoftTissueState) => {
      const descriptors: SoftTissueDescriptor[] = [];
      const defaultDigits =
        selectedDigits.length > 0 ? selectedDigits : undefined;

      // Active coverage descriptor types
      const coverageTypes: ("defect" | "loss" | "degloving")[] = [];
      if (state.hasSoftTissueDefect) coverageTypes.push("defect");
      if (state.hasSoftTissueLoss) coverageTypes.push("loss");
      if (state.hasDegloving) coverageTypes.push("degloving");

      // Each coverage type × each defect location = one descriptor
      const locations = state.defectLocations;
      for (const type of coverageTypes) {
        if (locations.length === 0) {
          // No locations yet — create descriptor with default digits only
          descriptors.push({ type, digits: defaultDigits });
        } else {
          for (const loc of locations) {
            descriptors.push({
              type,
              digits: loc.digits.length > 0 ? loc.digits : defaultDigits,
              surfaces: loc.surfaces.length > 0 ? loc.surfaces : undefined,
              zone: loc.zone,
              size: loc.size,
            });
          }
        }
      }

      if (state.hasGrossContamination) {
        descriptors.push({ type: "contamination", digits: defaultDigits });
      }

      onChange({
        ...value,
        isHighPressureInjection: state.isHighPressureInjection || undefined,
        isFightBite: state.isFightBite || undefined,
        isCompartmentSyndrome: state.isCompartmentSyndrome || undefined,
        isRingAvulsion: state.isRingAvulsion || undefined,
        softTissueDescriptors: descriptors.length > 0 ? descriptors : undefined,
      });
    },
    [value, onChange, selectedDigits],
  );

  const handleAmputationChange = useCallback(
    (state: AmputationState) => {
      onChange({
        ...value,
        digitAmputations:
          state.digitAmputations.length > 0
            ? state.digitAmputations
            : undefined,
        // Keep legacy fields in sync for backward compat
        amputationLevel: state.amputationLevel,
        amputationType: state.amputationType,
        isReplantable: state.isReplantable,
      });
    },
    [value, onChange],
  );

  const handlePerfusionChange = useCallback(
    (digit: DigitId, status?: PerfusionStatusEntry["status"]) => {
      const next = perfusionStatuses.filter((entry) => entry.digit !== digit);
      if (status) {
        next.push({ digit, status });
      }
      onChange({
        ...value,
        perfusionStatuses: next.length > 0 ? next : undefined,
      });
    },
    [onChange, perfusionStatuses, value],
  );

  // ─── Mapping resolution ────────────────────────────────────────────────────
  const mappingResult = useMemo<TraumaMappingResult | null>(() => {
    if (!isIncidentReady) return null;

    // Build the selection from current state
    const selection = {
      laterality: selectedLaterality,
      injuryMechanism: selectedMechanism,
      injuryMechanismOther: selectedMechanismOther || undefined,
      affectedDigits: selectedDigits,
      activeCategories: Array.from(activeCategories),
      fractures,
      dislocations,
      injuredStructures,
      perfusionStatuses,
      softTissueDescriptors,
      isHighPressureInjection: value.isHighPressureInjection,
      isFightBite: value.isFightBite,
      isCompartmentSyndrome: value.isCompartmentSyndrome,
      isRingAvulsion: value.isRingAvulsion,
      digitAmputations: value.digitAmputations,
      amputationLevel: value.amputationLevel,
      amputationType: value.amputationType,
      isReplantable: value.isReplantable,
    };

    return resolveTraumaDiagnosis(selection);
  }, [
    isIncidentReady,
    selectedLaterality,
    selectedMechanism,
    selectedMechanismOther,
    selectedDigits,
    activeCategories,
    fractures,
    dislocations,
    injuredStructures,
    perfusionStatuses,
    softTissueDescriptors,
    value.digitAmputations,
    value.amputationLevel,
    value.amputationType,
    value.isCompartmentSyndrome,
    value.isFightBite,
    value.isHighPressureInjection,
    value.isReplantable,
    value.isRingAvulsion,
  ]);

  const hasTraumaSelection = useMemo(
    () =>
      fractures.length > 0 ||
      dislocations.length > 0 ||
      injuredStructures.length > 0 ||
      perfusionStatuses.length > 0 ||
      softTissueDescriptors.length > 0 ||
      Boolean(
        value.isHighPressureInjection ||
          value.isFightBite ||
          value.isCompartmentSyndrome ||
          value.isRingAvulsion ||
          value.amputationLevel ||
          (value.digitAmputations && value.digitAmputations.length > 0),
      ),
    [
      dislocations.length,
      fractures.length,
      injuredStructures.length,
      perfusionStatuses.length,
      softTissueDescriptors.length,
      value.digitAmputations,
      value.amputationLevel,
      value.isCompartmentSyndrome,
      value.isFightBite,
      value.isHighPressureInjection,
      value.isRingAvulsion,
    ],
  );

  const selectionSignature = useMemo(
    () =>
      buildSelectionSignature({
        laterality: selectedLaterality,
        injuryMechanism: selectedMechanism,
        injuryMechanismOther: selectedMechanismOther,
        digits: selectedDigits,
        fractures,
        dislocations,
        injuredStructures,
        perfusionStatuses,
        softTissueDescriptors,
        isHighPressureInjection: value.isHighPressureInjection,
        isFightBite: value.isFightBite,
        isCompartmentSyndrome: value.isCompartmentSyndrome,
        isRingAvulsion: value.isRingAvulsion,
        digitAmputations: value.digitAmputations,
        amputationLevel: value.amputationLevel,
        amputationType: value.amputationType,
        isReplantable: value.isReplantable,
      }),
    [
      dislocations,
      fractures,
      injuredStructures,
      perfusionStatuses,
      selectedDigits,
      selectedLaterality,
      selectedMechanism,
      selectedMechanismOther,
      softTissueDescriptors,
      value.digitAmputations,
      value.amputationLevel,
      value.amputationType,
      value.isCompartmentSyndrome,
      value.isFightBite,
      value.isHighPressureInjection,
      value.isReplantable,
      value.isRingAvulsion,
    ],
  );

  useEffect(() => {
    if (!acceptedMapping) return;
    if (acceptedMapping.selectionSignature === selectionSignature) return;

    setAcceptedMapping(null);
    setHasPendingReviewChanges(hasTraumaSelection);
  }, [acceptedMapping, hasTraumaSelection, selectionSignature]);

  useEffect(() => {
    if (hasTraumaSelection) return;
    setAcceptedMapping(null);
    setHasPendingReviewChanges(false);
  }, [hasTraumaSelection]);

  // Auto-select default procedures when mapping changes (per-pair composite keys)
  useEffect(() => {
    if (!mappingResult) return;
    const defaults = new Set<string>();
    for (const pair of mappingResult.pairs) {
      for (const proc of pair.suggestedProcedures) {
        if (proc.isDefault) {
          defaults.add(compositeId(pair.key, proc.procedurePicklistId));
        }
      }
    }
    setSelectedProcedureIds(defaults);
  }, [mappingResult]);

  const handleSelectProcedure = useCallback(
    (pair: TraumaDiagnosisPair, procedureId: string) => {
      setSelectedProcedureIds((prev) => {
        const next = new Set(prev);
        const composite = compositeId(pair.key, procedureId);

        if (pair.selectionMode === "single") {
          // Remove other procedures for THIS pair only
          for (const procedure of pair.suggestedProcedures) {
            if (procedure.procedurePicklistId !== procedureId) {
              next.delete(compositeId(pair.key, procedure.procedurePicklistId));
            }
          }
          next.add(composite);
          return next;
        }

        if (next.has(composite)) {
          next.delete(composite);
        } else {
          next.add(composite);
        }
        return next;
      });
    },
    [],
  );

  // ─── Category counts for badge display ─────────────────────────────────────
  const categoryCounts = useMemo<
    Partial<Record<InjuryCategory, number>>
  >(() => {
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

    // Soft tissue count: descriptors + nail bed
    const softCount =
      (value.softTissueDescriptors?.length ?? 0) +
      injuredStructures.filter(
        (s) => s.category === "other" && s.structureId === "nail_bed",
      ).length;
    if (softCount > 0) counts.soft_tissue = softCount;

    // Ligament count: ligament structures + volar plates
    const ligamentCount = injuredStructures.filter(
      (s) =>
        s.category === "ligament" ||
        (s.category === "other" && s.structureId.startsWith("volar_plate_")),
    ).length;
    if (ligamentCount > 0) counts.ligament = ligamentCount;

    // Special injury count
    const specialCount =
      (value.isHighPressureInjection ? 1 : 0) +
      (value.isFightBite ? 1 : 0) +
      (value.isCompartmentSyndrome ? 1 : 0) +
      (value.isRingAvulsion ? 1 : 0);
    if (specialCount > 0) counts.special = specialCount;

    const amputationCount =
      (value.digitAmputations?.length ?? 0) || (value.amputationLevel ? 1 : 0);
    if (amputationCount > 0) counts.amputation = amputationCount;

    return counts;
  }, [fractures, dislocations, injuredStructures, value]);

  const structureProcedureCount = injuredStructures.filter(
    (s) => s.generatedProcedureId,
  ).length;

  const handleAccept = useCallback(
    (acceptedProcedureIds: string[]) => {
      if (!mappingResult) return;
      // Flatten composite keys to unique procedure IDs for parent payload
      const flatIds = [
        ...new Set(acceptedProcedureIds.map(extractProcedureId)),
      ];
      onAccept({
        mappingResult,
        selectedProcedureIds: flatIds,
      });
      // Store composite keys internally for per-pair display
      setAcceptedMapping({
        selectionSignature,
        mappingResult,
        selectedProcedureIds: [...new Set(acceptedProcedureIds)].sort(),
      });
      setHasPendingReviewChanges(false);
    },
    [mappingResult, onAccept, selectionSignature],
  );

  const handleEditMapping = useCallback(() => {
    setAcceptedMapping(null);
    setHasPendingReviewChanges(false);
  }, []);

  const handleReviewProcedures = useCallback(() => {
    onReviewProcedures?.({
      mappingResult,
      selectedProcedureIds: flattenSelections(selectedProcedureIds),
    });
  }, [mappingResult, onReviewProcedures, selectedProcedureIds]);

  const acceptedProcedureIdSet = useMemo(
    () => new Set(acceptedMapping?.selectedProcedureIds ?? []),
    [acceptedMapping?.selectedProcedureIds],
  );
  const isAcceptedCurrent =
    Boolean(acceptedMapping) &&
    acceptedMapping?.selectionSignature === selectionSignature;

  const sideLabel =
    selectedLaterality === "left"
      ? "left"
      : selectedLaterality === "right"
        ? "right"
        : undefined;

  return (
    <View style={styles.container}>
      <SectionWrapper title="1. Incident" icon="flag" theme={theme}>
        <View style={styles.incidentBlock}>
          <View style={styles.incidentSection}>
            <ThemedText
              style={[styles.incidentLabel, { color: theme.textSecondary }]}
            >
              Laterality
            </ThemedText>
            <View style={styles.sideButtons}>
              {(["left", "right"] as const).map((side) => {
                const isSelected = selectedLaterality === side;
                return (
                  <Pressable
                    key={side}
                    style={[
                      styles.sideButton,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundDefault,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() =>
                      updateIncident({
                        laterality:
                          selectedLaterality === side ? undefined : side,
                      })
                    }
                  >
                    <ThemedText
                      style={[
                        styles.sideButtonText,
                        {
                          color: isSelected ? theme.buttonText : theme.text,
                        },
                      ]}
                    >
                      {side === "left" ? "Left hand" : "Right hand"}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.incidentSection}>
            <ThemedText
              style={[styles.incidentLabel, { color: theme.textSecondary }]}
            >
              Injury mechanism
            </ThemedText>
            <View style={styles.incidentPillRow}>
              {TRAUMA_MECHANISM_OPTIONS.map((option) => {
                const isSelected = selectedMechanism === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.incidentPill,
                      {
                        backgroundColor: isSelected
                          ? theme.link
                          : theme.backgroundTertiary,
                        borderColor: isSelected ? theme.link : theme.border,
                      },
                    ]}
                    onPress={() =>
                      updateIncident({
                        injuryMechanism:
                          selectedMechanism === option.value
                            ? undefined
                            : option.value,
                        injuryMechanismOther:
                          option.value === "other"
                            ? selectedMechanismOther
                            : undefined,
                      })
                    }
                  >
                    <ThemedText
                      style={[
                        styles.incidentPillText,
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
            {selectedMechanism === "other" ? (
              <FormField
                label="Custom mechanism"
                value={selectedMechanismOther}
                onChangeText={(text) =>
                  updateIncident({
                    injuryMechanism: "other",
                    injuryMechanismOther: text,
                  })
                }
                placeholder="Describe mechanism..."
              />
            ) : null}
          </View>

          <DatePickerField
            label="Day of injury"
            value={injuryDate}
            onChange={(value) => updateIncident({ injuryDate: value })}
            placeholder="Select date..."
            maximumDate={new Date()}
          />

          {sideLabel ? (
            <View
              style={[
                styles.sideSummary,
                {
                  backgroundColor: theme.link + "12",
                  borderColor: theme.link + "35",
                },
              ]}
            >
              <Feather name="check-circle" size={15} color={theme.link} />
              <ThemedText
                style={[styles.sideSummaryText, { color: theme.link }]}
              >
                All selected injuries belong to the {sideLabel} hand.
              </ThemedText>
            </View>
          ) : (
            <View
              style={[
                styles.sideSummary,
                {
                  backgroundColor: theme.warning + "12",
                  borderColor: theme.warning + "35",
                },
              ]}
            >
              <Feather name="alert-circle" size={15} color={theme.warning} />
              <ThemedText
                style={[styles.sideSummaryText, { color: theme.warning }]}
              >
                Select left or right before marking injured structures.
              </ThemedText>
            </View>
          )}
        </View>
      </SectionWrapper>

      {isIncidentReady ? (
        <>
          <SectionWrapper
            title="2. Injured Structures"
            icon="grid"
            theme={theme}
          >
            <InjuryCategoryChips
              activeCategories={activeCategories}
              onToggle={handleCategoryToggle}
              categoryCounts={categoryCounts}
            />

            <DigitSelector
              selectedDigits={selectedDigits}
              onChange={handleDigitsChange}
              label={`Affected digits on ${sideLabel} hand`}
            />
          </SectionWrapper>

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

          {activeCategories.has("dislocation") ? (
            <SectionWrapper title="Dislocation" icon="shuffle" theme={theme}>
              <DislocationSection
                dislocations={dislocations}
                onDislocationsChange={handleDislocationsChange}
                selectedDigits={selectedDigits}
                onAssociatedFractureEnabled={ensureFractureCategory}
              />
            </SectionWrapper>
          ) : null}

          {activeCategories.has("tendon") ? (
            <SectionWrapper title="Tendons" icon="trending-up" theme={theme}>
              <View style={styles.tendonSubSections}>
                <ThemedText
                  style={[
                    styles.tendonSubLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  FLEXOR
                </ThemedText>
                <FlexorTendonSection
                  selectedDigits={selectedDigits}
                  checkedStructures={injuredStructures}
                  zone={flexorZone}
                  onZoneChange={setFlexorZone}
                  completeness={flexorCompleteness}
                  onCompletenessChange={setFlexorCompleteness}
                  onToggleStructure={handleToggleTendonStructure}
                />
                <View
                  style={[
                    styles.tendonDivider,
                    { backgroundColor: theme.border },
                  ]}
                />
                <ThemedText
                  style={[
                    styles.tendonSubLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  EXTENSOR
                </ThemedText>
                <ExtensorTendonSection
                  selectedDigits={selectedDigits}
                  checkedStructures={injuredStructures}
                  zone={extensorZone}
                  onZoneChange={setExtensorZone}
                  completeness={extensorCompleteness}
                  onCompletenessChange={setExtensorCompleteness}
                  onToggleStructure={handleToggleTendonStructure}
                />
              </View>
            </SectionWrapper>
          ) : null}

          {activeCategories.has("nerve") ? (
            <SectionWrapper title="Nerves" icon="zap" theme={theme}>
              <NerveSection
                selectedDigits={selectedDigits}
                checkedStructures={injuredStructures}
                onToggleStructure={handleToggleParamStructure}
              />
            </SectionWrapper>
          ) : null}

          {activeCategories.has("vessel") ? (
            <SectionWrapper title="Vessels" icon="droplet" theme={theme}>
              <ArterySection
                selectedDigits={selectedDigits}
                checkedStructures={injuredStructures}
                onToggleStructure={handleToggleParamStructure}
                perfusionStatuses={perfusionStatuses}
                onPerfusionChange={handlePerfusionChange}
              />
            </SectionWrapper>
          ) : null}

          {activeCategories.has("soft_tissue") ? (
            <SectionWrapper title="Soft Tissue" icon="layers" theme={theme}>
              <SoftTissueDescriptorSection
                value={softTissueState}
                onChange={handleSoftTissueChange}
                selectedDigits={selectedDigits}
              />
              <OtherStructuresSection
                checkedStructures={injuredStructures}
                selectedDigits={selectedDigits}
                onToggleStructure={handleToggleParamStructure}
              />
            </SectionWrapper>
          ) : null}

          {activeCategories.has("ligament") ? (
            <SectionWrapper title="Ligament" icon="link" theme={theme}>
              <LigamentSection
                selectedDigits={selectedDigits}
                checkedStructures={injuredStructures}
                onToggleStructure={handleToggleParamStructure}
              />
            </SectionWrapper>
          ) : null}

          {activeCategories.has("special") ? (
            <SectionWrapper
              title="Special Injuries"
              icon="alert-triangle"
              theme={theme}
            >
              <SoftTissueSpecialInjurySection
                value={softTissueState}
                onChange={handleSoftTissueChange}
              />
            </SectionWrapper>
          ) : null}

          {activeCategories.has("amputation") ? (
            <SectionWrapper title="Amputation" icon="scissors" theme={theme}>
              <AmputationSection
                value={amputationState}
                onChange={handleAmputationChange}
                selectedDigits={selectedDigits}
              />
            </SectionWrapper>
          ) : null}
        </>
      ) : null}

      {hasTraumaSelection && (mappingResult || structureProcedureCount > 0) ? (
        <SectionWrapper
          title="3. Summary & Procedures"
          icon="clipboard"
          theme={theme}
        >
          <DiagnosisProcedureSuggestionPanel
            mappingResult={mappingResult}
            acceptedMappingResult={acceptedMapping?.mappingResult ?? null}
            appliedProcedures={procedures}
            selectedProcedureIds={selectedProcedureIds}
            acceptedProcedureIds={acceptedProcedureIdSet}
            isAccepted={isAcceptedCurrent}
            hasPendingChanges={hasPendingReviewChanges}
            onSelectProcedure={handleSelectProcedure}
            onAccept={handleAccept}
            onEditMapping={handleEditMapping}
            onEditDiagnosis={onEditDiagnosis}
            onReviewProcedures={handleReviewProcedures}
            hasStructureProcedures={structureProcedureCount > 0}
            structureProcedureCount={structureProcedureCount}
          />
        </SectionWrapper>
      ) : null}
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
  incidentBlock: {
    gap: Spacing.md,
  },
  incidentSection: {
    gap: Spacing.sm,
  },
  incidentLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sideButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  sideButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  sideButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  incidentPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  incidentPill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    minHeight: 38,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  incidentPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sideSummary: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sideSummaryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
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
});
