/**
 * Hand Trauma Assessment → Diagnosis + Procedure Auto-Mapping
 *
 * Given the surgeon's injury selections (fractures, dislocations,
 * soft tissue injuries), resolve the best-matching diagnosis and
 * suggest procedures ranked by clinical relevance.
 *
 * This SUPPLEMENTS the existing AO-to-diagnosis mapping in
 * aoToDiagnosisMapping.ts — it extends it to cover dislocations,
 * soft tissue injuries, and combined injury patterns.
 */

import type {
  CoverageSize,
  CoverageZone,
  DigitId,
  DislocationEntry,
  FractureEntry,
  HandTraumaStructure,
  Laterality,
  PerfusionStatusEntry,
  SoftTissueDescriptor,
} from "@/types/case";
import {
  buildAmputationBullets,
  buildDislocationBullets,
  buildFractureBullets,
  buildNerveBullets,
  buildSoftTissueBullets,
  buildTendonBullets,
  buildVesselBullets,
  generateHandTraumaDiagnosis,
  normalizeSelection,
  type HandTraumaDiagnosisSelection,
  type MachineSummary,
  type SoftTissueInjury,
  type TendonInjury,
} from "@/lib/handTraumaDiagnosis";
import { resolveAOToDiagnosis } from "@/lib/aoToDiagnosisMapping";
import {
  evaluateSuggestions,
  findDiagnosisById,
} from "@/lib/diagnosisPicklists";
import { findPicklistEntry } from "@/lib/procedurePicklist";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InjuryCategory =
  | "fracture"
  | "dislocation"
  | "tendon"
  | "nerve"
  | "vessel"
  | "ligament"
  | "soft_tissue"
  | "special"
  | "amputation";

export interface HandTraumaSelection {
  laterality?: Laterality;
  injuryMechanism?: string;
  injuryMechanismOther?: string;
  affectedDigits: DigitId[];
  activeCategories: InjuryCategory[];

  // Fracture data (from AO cascade)
  fractures?: FractureEntry[];

  // Dislocation data
  dislocations?: DislocationEntry[];

  // Soft tissue structures (from existing structure picker)
  injuredStructures?: HandTraumaStructure[];
  perfusionStatuses?: PerfusionStatusEntry[];
  softTissueDescriptors?: SoftTissueDescriptor[];

  // Special injury flags
  isHighPressureInjection?: boolean;
  isFightBite?: boolean;
  isCompartmentSyndrome?: boolean;
  isRingAvulsion?: boolean;

  // Per-digit amputations (preferred)
  digitAmputations?: import("@/types/case").DigitAmputation[];
  // Legacy amputation level
  amputationLevel?: import("@/types/case").AmputationLevel;
  amputationType?: "complete" | "subtotal";
  isReplantable?: boolean;
}

export interface TraumaProcedureSuggestion {
  procedurePicklistId: string;
  displayName: string;
  isDefault: boolean;
  reason: string;
  codes?: CodingReference[];
}

export interface CodingReference {
  system: string;
  code: string;
  displayName?: string;
}

export interface TraumaDiagnosisPair {
  key: string;
  source:
    | "fracture"
    | "dislocation"
    | "tendon"
    | "nerve"
    | "vessel"
    | "ligament"
    | "soft_tissue"
    | "special"
    | "amputation";
  diagnosis: {
    diagnosisPicklistId?: string;
    displayName: string;
    snomedCtCode?: string;
    codes?: CodingReference[];
  };
  selectionMode: "single" | "multiple";
  suggestedProcedures: TraumaProcedureSuggestion[];
}

export interface TraumaMappingResult {
  representativeDiagnosis: {
    diagnosisPicklistId: string;
    displayName: string;
    snomedCtCode: string;
    codes?: CodingReference[];
  };
  /** Compatibility alias for older consumers. */
  primaryDiagnosis: {
    diagnosisPicklistId: string;
    displayName: string;
    snomedCtCode: string;
    codes?: CodingReference[];
  };
  summaryDiagnosisDisplay: string;
  diagnosisTextShort: string;
  diagnosisTextLong: string;
  machineSummary: MachineSummary;
  pairs: TraumaDiagnosisPair[];
  suggestedProcedures: TraumaProcedureSuggestion[];
}

interface LegacyTraumaResult {
  primaryDiagnosis: DiagnosisRef;
  additionalDiagnoses?: {
    diagnosisPicklistId: string;
    displayName: string;
  }[];
  suggestedProcedures: TraumaProcedureSuggestion[];
}

// ─── Diagnosis Lookup Helper ─────────────────────────────────────────────────

interface DiagnosisRef {
  diagnosisPicklistId: string;
  displayName: string;
  snomedCtCode: string;
}

const DIGIT_INDEX: Record<DigitId, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
};

const DIGITAL_NERVE_LABELS: Record<
  string,
  { side: "radial" | "ulnar"; digit: DigitId }
> = {
  N1: { digit: "I", side: "radial" },
  N2: { digit: "I", side: "ulnar" },
  N3: { digit: "II", side: "radial" },
  N4: { digit: "II", side: "ulnar" },
  N5: { digit: "III", side: "radial" },
  N6: { digit: "III", side: "ulnar" },
  N7: { digit: "IV", side: "radial" },
  N8: { digit: "IV", side: "ulnar" },
  N9: { digit: "V", side: "radial" },
  N10: { digit: "V", side: "ulnar" },
};

const DIAGNOSIS_LOOKUP: Record<string, DiagnosisRef> = {
  hand_dx_pip_dislocation_dorsal: {
    diagnosisPicklistId: "hand_dx_pip_dislocation_dorsal",
    displayName: "PIP joint dislocation — dorsal",
    snomedCtCode: "239178008",
  },
  hand_dx_pip_dislocation_volar: {
    diagnosisPicklistId: "hand_dx_pip_dislocation_volar",
    displayName: "PIP joint dislocation — volar",
    snomedCtCode: "239178008",
  },
  hand_dx_pip_fracture_dislocation: {
    diagnosisPicklistId: "hand_dx_pip_fracture_dislocation",
    displayName: "PIP fracture-dislocation",
    snomedCtCode: "263207003",
  },
  hand_dx_mcp_dislocation_simple: {
    diagnosisPicklistId: "hand_dx_mcp_dislocation_simple",
    displayName: "MCP joint dislocation — simple",
    snomedCtCode: "239173003",
  },
  hand_dx_mcp_dislocation_complex: {
    diagnosisPicklistId: "hand_dx_mcp_dislocation_complex",
    displayName: "MCP joint dislocation — complex / irreducible (Kaplan)",
    snomedCtCode: "239173003",
  },
  hand_dx_cmc_dislocation: {
    diagnosisPicklistId: "hand_dx_cmc_dislocation",
    displayName: "CMC joint dislocation / fracture-dislocation (2nd–5th)",
    snomedCtCode: "72081002",
  },
  hand_dx_thumb_cmc_dislocation: {
    diagnosisPicklistId: "hand_dx_thumb_cmc_dislocation",
    displayName: "Thumb CMC dislocation",
    snomedCtCode: "72081002",
  },
  hand_dx_perilunate_dislocation: {
    diagnosisPicklistId: "hand_dx_perilunate_dislocation",
    displayName: "Perilunate dislocation",
    snomedCtCode: "58610006",
  },
  hand_dx_transscaphoid_perilunate: {
    diagnosisPicklistId: "hand_dx_transscaphoid_perilunate",
    displayName: "Trans-scaphoid perilunate fracture-dislocation",
    snomedCtCode: "263148004",
  },
  hand_dx_lunate_dislocation: {
    diagnosisPicklistId: "hand_dx_lunate_dislocation",
    displayName: "Lunate dislocation",
    snomedCtCode: "72553001",
  },
  hand_dx_druj_dislocation: {
    diagnosisPicklistId: "hand_dx_druj_dislocation",
    displayName: "DRUJ dislocation / instability (acute)",
    snomedCtCode: "239166008",
  },
  hand_dx_high_pressure_injection: {
    diagnosisPicklistId: "hand_dx_high_pressure_injection",
    displayName: "High-pressure injection injury",
    snomedCtCode: "283682007",
  },
  hand_dx_fight_bite: {
    diagnosisPicklistId: "hand_dx_fight_bite",
    displayName: "Fight bite (human bite to MCP)",
    snomedCtCode: "283680004",
  },
  hand_dx_compartment_syndrome_hand: {
    diagnosisPicklistId: "hand_dx_compartment_syndrome_hand",
    displayName: "Compartment syndrome of hand",
    snomedCtCode: "111254007",
  },
  hand_dx_digital_amputation: {
    diagnosisPicklistId: "hand_dx_digital_amputation",
    displayName: "Digital amputation (replantable)",
    snomedCtCode: "30998006",
  },
  hand_dx_digital_amputation_nonreplantable: {
    diagnosisPicklistId: "hand_dx_digital_amputation_nonreplantable",
    displayName: "Digital amputation — non-replantable (terminalisation)",
    snomedCtCode: "30998006",
  },
  hand_dx_thumb_amputation: {
    diagnosisPicklistId: "hand_dx_thumb_amputation",
    displayName: "Thumb amputation",
    snomedCtCode: "30998006",
  },
  hand_dx_multiple_digit_amputation: {
    diagnosisPicklistId: "hand_dx_multiple_digit_amputation",
    displayName: "Multiple digit amputation",
    snomedCtCode: "30998006",
  },
  hand_dx_hand_amputation: {
    diagnosisPicklistId: "hand_dx_hand_amputation",
    displayName: "Hand / wrist amputation (major replant)",
    snomedCtCode: "34731002",
  },
  hand_dx_ring_avulsion: {
    diagnosisPicklistId: "hand_dx_ring_avulsion",
    displayName: "Ring avulsion injury",
    snomedCtCode: "283020001",
  },
  hand_dx_fingertip_injury: {
    diagnosisPicklistId: "hand_dx_fingertip_injury",
    displayName: "Fingertip injury / amputation",
    snomedCtCode: "283593005",
  },
  hand_dx_ucl_thumb: {
    diagnosisPicklistId: "hand_dx_ucl_thumb",
    displayName: "Thumb UCL injury (Gamekeeper's / Skier's)",
    snomedCtCode: "239227006",
  },
  hand_dx_flexor_tendon_lac: {
    diagnosisPicklistId: "hand_dx_flexor_tendon_lac",
    displayName: "Flexor tendon laceration",
    snomedCtCode: "283588004",
  },
  hand_dx_extensor_tendon_lac: {
    diagnosisPicklistId: "hand_dx_extensor_tendon_lac",
    displayName: "Extensor tendon laceration",
    snomedCtCode: "283589007",
  },
  hand_dx_digital_nerve_lac: {
    diagnosisPicklistId: "hand_dx_digital_nerve_lac",
    displayName: "Digital nerve laceration",
    snomedCtCode: "283013008",
  },
  hand_dx_median_nerve_lac: {
    diagnosisPicklistId: "hand_dx_median_nerve_lac",
    displayName: "Median nerve injury / laceration",
    snomedCtCode: "283018004",
  },
  hand_dx_ulnar_nerve_lac: {
    diagnosisPicklistId: "hand_dx_ulnar_nerve_lac",
    displayName: "Ulnar nerve injury / laceration",
    snomedCtCode: "283019007",
  },
  hand_dx_radial_nerve_lac: {
    diagnosisPicklistId: "hand_dx_radial_nerve_lac",
    displayName: "Radial nerve / PIN / SRN injury",
    snomedCtCode: "283020001",
  },
  hand_dx_dbun_injury: {
    diagnosisPicklistId: "hand_dx_dbun_injury",
    displayName: "Dorsal branch of ulnar nerve injury",
    snomedCtCode: "283019007",
  },
  hand_dx_complex_laceration: {
    diagnosisPicklistId: "hand_dx_complex_laceration",
    displayName: "Complex hand laceration (multistructure)",
    snomedCtCode: "284003005",
  },
  hand_dx_nail_bed_injury: {
    diagnosisPicklistId: "hand_dx_nail_bed_injury",
    displayName: "Nail bed injury",
    snomedCtCode: "283028008",
  },
  hand_dx_hand_degloving: {
    diagnosisPicklistId: "hand_dx_hand_degloving",
    displayName: "Hand / finger degloving injury",
    snomedCtCode: "283681000",
  },
};

function lookup(id: string): DiagnosisRef {
  const ref = DIAGNOSIS_LOOKUP[id];
  if (!ref) {
    throw new Error(`Unknown diagnosis ID in trauma mapping: ${id}`);
  }
  return ref;
}

function toDiagnosisSelection(
  selection: HandTraumaSelection,
): HandTraumaDiagnosisSelection {
  return {
    laterality: selection.laterality,
    injuryMechanism: selection.injuryMechanism,
    injuryMechanismOther: selection.injuryMechanismOther,
    affectedDigits: selection.affectedDigits,
    fractures: selection.fractures,
    dislocations: selection.dislocations,
    injuredStructures: selection.injuredStructures,
    perfusionStatuses: selection.perfusionStatuses,
    softTissueDescriptors: selection.softTissueDescriptors,
    isHighPressureInjection: selection.isHighPressureInjection,
    isFightBite: selection.isFightBite,
    isCompartmentSyndrome: selection.isCompartmentSyndrome,
    isRingAvulsion: selection.isRingAvulsion,
    digitAmputations: selection.digitAmputations,
    amputationLevel: selection.amputationLevel,
    amputationType: selection.amputationType,
    isReplantable: selection.isReplantable,
  };
}

function createProcedureSuggestion(
  procedurePicklistId: string,
  reason: string,
  isDefault = true,
): TraumaProcedureSuggestion | null {
  const entry = findPicklistEntry(procedurePicklistId);
  if (!entry) return null;
  return {
    procedurePicklistId,
    displayName: entry.displayName,
    isDefault,
    reason,
    codes: buildCodingReferences(entry.snomedCtCode, entry.snomedCtDisplay),
  };
}

function buildCodingReferences(
  code?: string,
  displayName?: string,
): CodingReference[] {
  return code
    ? [
        {
          system: "SNOMED_CT",
          code,
          displayName,
        },
      ]
    : [];
}

function buildDiagnosisCodingReferences(
  diagnosis: Pick<DiagnosisRef, "snomedCtCode" | "displayName">,
): CodingReference[] {
  return buildCodingReferences(diagnosis.snomedCtCode, diagnosis.displayName);
}

function attachProcedureCoding(
  suggestion: TraumaProcedureSuggestion,
): TraumaProcedureSuggestion {
  if (suggestion.codes && suggestion.codes.length > 0) {
    return suggestion;
  }

  const entry = findPicklistEntry(suggestion.procedurePicklistId);
  if (!entry) return suggestion;

  return {
    ...suggestion,
    codes: buildCodingReferences(entry.snomedCtCode, entry.snomedCtDisplay),
  };
}

function mergeProcedureSuggestions(
  suggestions: TraumaProcedureSuggestion[],
): TraumaProcedureSuggestion[] {
  const byId = new Map<string, TraumaProcedureSuggestion>();

  for (const suggestion of suggestions) {
    const normalizedSuggestion = attachProcedureCoding(suggestion);
    const current = byId.get(normalizedSuggestion.procedurePicklistId);
    if (!current) {
      byId.set(normalizedSuggestion.procedurePicklistId, normalizedSuggestion);
      continue;
    }

    byId.set(normalizedSuggestion.procedurePicklistId, {
      ...current,
      isDefault: current.isDefault || normalizedSuggestion.isDefault,
      reason:
        current.reason === normalizedSuggestion.reason
          ? current.reason
          : `${current.reason}; ${normalizedSuggestion.reason}`,
      codes:
        current.codes && current.codes.length > 0
          ? current.codes
          : normalizedSuggestion.codes,
    });
  }

  return Array.from(byId.values());
}

function normalizeSingleSelectSuggestions(
  suggestions: TraumaProcedureSuggestion[],
): TraumaProcedureSuggestion[] {
  const merged = mergeProcedureSuggestions(suggestions);
  if (merged.length === 0) return merged;

  const defaultIndex = merged.findIndex((suggestion) => suggestion.isDefault);
  const activeIndex = defaultIndex >= 0 ? defaultIndex : 0;

  return merged.map((suggestion, index) => ({
    ...suggestion,
    isDefault: index === activeIndex,
  }));
}

function buildRepresentativeDiagnosis(
  pairs: TraumaDiagnosisPair[],
  summaryDiagnosisDisplay: string,
): TraumaMappingResult["representativeDiagnosis"] {
  const firstStructured = pairs.find((pair) => pair.diagnosis.diagnosisPicklistId);
  if (firstStructured?.diagnosis.diagnosisPicklistId) {
    return {
      diagnosisPicklistId: firstStructured.diagnosis.diagnosisPicklistId,
      displayName: firstStructured.diagnosis.displayName,
      snomedCtCode: firstStructured.diagnosis.snomedCtCode ?? "",
      codes: firstStructured.diagnosis.codes,
    };
  }

  return {
    diagnosisPicklistId: "",
    displayName: summaryDiagnosisDisplay,
    snomedCtCode: "",
    codes: [],
  };
}

function finalizePairs(
  pairs: TraumaDiagnosisPair[],
  diagnosisOutput: NonNullable<ReturnType<typeof generateHandTraumaDiagnosis>>,
): TraumaMappingResult {
  const dedupedPairs = pairs.filter(
    (pair, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.key === pair.key &&
          candidate.diagnosis.displayName === pair.diagnosis.displayName,
      ) === index,
  );
  const representativeDiagnosis = buildRepresentativeDiagnosis(
    dedupedPairs,
    diagnosisOutput.headerLine,
  );

  return {
    representativeDiagnosis,
    primaryDiagnosis: representativeDiagnosis,
    summaryDiagnosisDisplay: diagnosisOutput.headerLine,
    diagnosisTextShort: diagnosisOutput.diagnosisTextShort,
    diagnosisTextLong: diagnosisOutput.diagnosisTextLong,
    machineSummary: diagnosisOutput.machineSummary,
    pairs: dedupedPairs,
    suggestedProcedures: mergeProcedureSuggestions(
      dedupedPairs.flatMap((pair) => pair.suggestedProcedures),
    ),
  };
}

// ─── Dislocation Mapping Table ───────────────────────────────────────────────

interface DislocationMapping {
  diagnosisId: string;
  procedures: { id: string; displayName: string; isDefault: boolean }[];
}

function getDislocationKey(d: DislocationEntry): string {
  const base = d.joint;
  if (d.joint === "mcp") {
    return d.isComplex ? "mcp_complex" : "mcp_simple";
  }
  if (d.joint === "pip") {
    if (d.hasFracture) return "pip_fracture";
    return d.direction === "volar" ? "pip_volar" : "pip_dorsal";
  }
  if (d.joint === "perilunate") {
    return d.hasFracture ? "perilunate_fracture" : "perilunate";
  }
  return base;
}

const DISLOCATION_DIAGNOSIS_MAP: Record<string, DislocationMapping> = {
  pip_dorsal: {
    diagnosisId: "hand_dx_pip_dislocation_dorsal",
    procedures: [
      {
        id: "hand_disloc_pip_cr",
        displayName: "PIP closed reduction + splinting",
        isDefault: true,
      },
    ],
  },
  pip_fracture: {
    diagnosisId: "hand_dx_pip_fracture_dislocation",
    procedures: [
      {
        id: "hand_disloc_pip_extension_block_kwire",
        displayName: "Extension block K-wire (Ishiguro)",
        isDefault: true,
      },
      {
        id: "hand_disloc_pip_volar_plate_arthroplasty",
        displayName: "Volar plate arthroplasty (PIP)",
        isDefault: false,
      },
      {
        id: "hand_disloc_pip_hemihamate",
        displayName: "Hemi-hamate arthroplasty",
        isDefault: false,
      },
    ],
  },
  pip_volar: {
    diagnosisId: "hand_dx_pip_dislocation_volar",
    procedures: [
      {
        id: "hand_disloc_pip_cr",
        displayName: "PIP closed reduction",
        isDefault: true,
      },
      {
        id: "hand_tend_central_slip_repair",
        displayName: "Central slip repair",
        isDefault: false,
      },
    ],
  },
  mcp_simple: {
    diagnosisId: "hand_dx_mcp_dislocation_simple",
    procedures: [
      {
        id: "hand_disloc_mcp_cr",
        displayName: "MCP closed reduction",
        isDefault: true,
      },
    ],
  },
  mcp_complex: {
    diagnosisId: "hand_dx_mcp_dislocation_complex",
    procedures: [
      {
        id: "hand_disloc_mcp_open_reduction",
        displayName: "MCP open reduction",
        isDefault: true,
      },
    ],
  },
  cmc: {
    diagnosisId: "hand_dx_cmc_dislocation",
    procedures: [
      {
        id: "hand_disloc_cmc_crif",
        displayName: "CMC reduction + K-wire fixation",
        isDefault: true,
      },
    ],
  },
  thumb_cmc: {
    diagnosisId: "hand_dx_thumb_cmc_dislocation",
    procedures: [
      {
        id: "hand_disloc_cmc_crif",
        displayName: "CMC reduction + K-wire fixation",
        isDefault: true,
      },
      {
        id: "hand_fx_bennett",
        displayName: "Bennett's fracture CRIF",
        isDefault: false,
      },
    ],
  },
  perilunate: {
    diagnosisId: "hand_dx_perilunate_dislocation",
    procedures: [
      {
        id: "hand_disloc_perilunate_orif",
        displayName: "Perilunate open reduction + ligament repair",
        isDefault: true,
      },
    ],
  },
  perilunate_fracture: {
    diagnosisId: "hand_dx_transscaphoid_perilunate",
    procedures: [
      {
        id: "hand_disloc_perilunate_orif",
        displayName: "Perilunate open reduction + ligament repair",
        isDefault: true,
      },
      {
        id: "hand_fx_scaphoid_orif",
        displayName: "Scaphoid ORIF",
        isDefault: true,
      },
    ],
  },
  lunate: {
    diagnosisId: "hand_dx_lunate_dislocation",
    procedures: [
      {
        id: "hand_disloc_perilunate_orif",
        displayName: "Open reduction + ligament repair",
        isDefault: true,
      },
    ],
  },
  druj: {
    diagnosisId: "hand_dx_druj_dislocation",
    procedures: [
      {
        id: "hand_disloc_druj_reduction_kwire",
        displayName: "DRUJ reduction + K-wire stabilisation",
        isDefault: true,
      },
      {
        id: "hand_disloc_druj_tfcc_repair",
        displayName: "TFCC repair (acute)",
        isDefault: false,
      },
    ],
  },
};

// ─── Special Injury Mapping ──────────────────────────────────────────────────

const SPECIAL_INJURY_MAP = {
  highPressureInjection: {
    diagnosisId: "hand_dx_high_pressure_injection",
    procedures: [
      {
        id: "hand_other_hpi_debridement",
        displayName: "HPI debridement",
        isDefault: true,
      },
      {
        id: "hand_other_fasciotomy",
        displayName: "Fasciotomy",
        isDefault: false,
      },
    ],
  },
  fightBite: {
    diagnosisId: "hand_dx_fight_bite",
    procedures: [
      {
        id: "hand_other_fight_bite_washout",
        displayName: "Fight bite washout + debridement",
        isDefault: true,
      },
    ],
  },
  compartmentSyndrome: {
    diagnosisId: "hand_dx_compartment_syndrome_hand",
    procedures: [
      {
        id: "hand_other_hand_compartment_release",
        displayName: "Hand compartment release",
        isDefault: true,
      },
      {
        id: "hand_other_fasciotomy",
        displayName: "Fasciotomy — forearm / hand",
        isDefault: true,
      },
    ],
  },
} as const;

// ─── Amputation / Replantation Decision Logic ────────────────────────────────

function resolveAmputationDiagnosis(
  selection: HandTraumaSelection,
): LegacyTraumaResult {
  const { amputationLevel, isReplantable, affectedDigits } = selection;
  const isThumb = affectedDigits.includes("I");
  const multipleDigits = affectedDigits.length > 1;

  // Ring avulsion gets its own diagnosis
  if (selection.isRingAvulsion) {
    return {
      primaryDiagnosis: lookup("hand_dx_ring_avulsion"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_cov_revascularisation",
          displayName: "Digital revascularisation",
          isDefault: true,
          reason: "Ring avulsion — revascularisation if viable",
        },
        {
          procedurePicklistId: "hand_cov_replantation",
          displayName: "Digital replantation",
          isDefault: false,
          reason: "Ring avulsion — replantation if complete",
        },
        {
          procedurePicklistId: "hand_amp_terminalisation",
          displayName: "Terminalisation",
          isDefault: false,
          reason: "If revascularisation/replantation not feasible",
        },
      ],
    };
  }

  // Thumb always gets its own diagnosis
  if (isThumb && amputationLevel !== "fingertip") {
    return {
      primaryDiagnosis: lookup("hand_dx_thumb_amputation"),
      suggestedProcedures: isReplantable
        ? [
            {
              procedurePicklistId: "hand_cov_replantation",
              displayName: "Digital replantation",
              isDefault: true,
              reason: "Thumb — always attempt replantation",
            },
            {
              procedurePicklistId: "hand_amp_terminalisation",
              displayName: "Terminalisation",
              isDefault: false,
              reason: "If replantation not feasible",
            },
          ]
        : [
            {
              procedurePicklistId: "hand_amp_terminalisation",
              displayName: "Terminalisation",
              isDefault: true,
              reason: "Non-replantable",
            },
            {
              procedurePicklistId: "hand_cov_toe_to_thumb",
              displayName: "Toe-to-thumb transfer",
              isDefault: false,
              reason: "Secondary reconstruction",
            },
            {
              procedurePicklistId: "hand_cov_pollicisation",
              displayName: "Pollicisation (index to thumb)",
              isDefault: false,
              reason: "If MCP/CMC lost",
            },
          ],
    };
  }

  // Multiple digits
  if (multipleDigits) {
    return {
      primaryDiagnosis: lookup("hand_dx_multiple_digit_amputation"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_cov_replantation",
          displayName: "Digital replantation",
          isDefault: true,
          reason: "Multiple digits — replant all viable",
        },
        {
          procedurePicklistId: "hand_amp_terminalisation",
          displayName: "Terminalisation (non-viable digits)",
          isDefault: false,
          reason: "Non-viable digits",
        },
      ],
    };
  }

  // Fingertip level
  if (amputationLevel === "fingertip") {
    return {
      primaryDiagnosis: lookup("hand_dx_fingertip_injury"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_cov_vy_advancement",
          displayName: "V-Y advancement flap",
          isDefault: true,
          reason: "Standard fingertip reconstruction",
        },
        {
          procedurePicklistId: "hand_cov_cross_finger",
          displayName: "Cross-finger flap",
          isDefault: false,
          reason: "Volar oblique defect",
        },
        {
          procedurePicklistId: "hand_cov_moberg",
          displayName: "Moberg advancement flap",
          isDefault: false,
          reason: "Thumb only",
        },
        {
          procedurePicklistId: "hand_amp_terminalisation",
          displayName: "Terminalisation",
          isDefault: false,
          reason: "If reconstruction not indicated",
        },
      ],
    };
  }

  // Hand/wrist level
  if (amputationLevel === "hand_wrist") {
    return {
      primaryDiagnosis: lookup("hand_dx_hand_amputation"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_recon_major_replantation",
          displayName: "Major replantation (hand / wrist / forearm)",
          isDefault: true,
          reason: "Major replant",
        },
      ],
    };
  }

  // Single digit, non-fingertip
  return {
    primaryDiagnosis: isReplantable
      ? lookup("hand_dx_digital_amputation")
      : lookup("hand_dx_digital_amputation_nonreplantable"),
    suggestedProcedures: isReplantable
      ? [
          {
            procedurePicklistId: "hand_cov_replantation",
            displayName: "Digital replantation",
            isDefault: true,
            reason: "Replantable digit",
          },
        ]
      : [
          {
            procedurePicklistId: "hand_amp_terminalisation",
            displayName: "Terminalisation",
            isDefault: true,
            reason: "Terminalisation",
          },
          {
            procedurePicklistId: "hand_amp_revision_stump",
            displayName: "Stump revision / remodelling",
            isDefault: false,
            reason: "Stump revision if needed",
          },
        ],
  };
}

// ─── Dislocation Resolution ──────────────────────────────────────────────────

function resolveDislocationDiagnosis(
  dislocation: DislocationEntry,
): LegacyTraumaResult {
  const key = getDislocationKey(dislocation);
  const mapping = DISLOCATION_DIAGNOSIS_MAP[key];

  if (!mapping) {
    // Fallback — shouldn't happen with complete mapping
    return {
      primaryDiagnosis: {
        diagnosisPicklistId: "",
        displayName: "Unknown dislocation",
        snomedCtCode: "",
      },
      suggestedProcedures: [],
    };
  }

  return {
    primaryDiagnosis: lookup(mapping.diagnosisId),
    suggestedProcedures: mapping.procedures.map((p) => ({
      procedurePicklistId: p.id,
      displayName: p.displayName,
      isDefault: p.isDefault,
      reason: `Matched from ${key} dislocation`,
    })),
  };
}

// ─── Special Injury Resolution ───────────────────────────────────────────────

function resolveSpecialInjury(
  selection: HandTraumaSelection,
): LegacyTraumaResult | null {
  if (selection.isHighPressureInjection) {
    const m = SPECIAL_INJURY_MAP.highPressureInjection;
    return {
      primaryDiagnosis: lookup(m.diagnosisId),
      suggestedProcedures: m.procedures.map((p) => ({
        procedurePicklistId: p.id,
        displayName: p.displayName,
        isDefault: p.isDefault,
        reason: "High-pressure injection injury",
      })),
    };
  }

  if (selection.isFightBite) {
    const m = SPECIAL_INJURY_MAP.fightBite;
    return {
      primaryDiagnosis: lookup(m.diagnosisId),
      suggestedProcedures: m.procedures.map((p) => ({
        procedurePicklistId: p.id,
        displayName: p.displayName,
        isDefault: p.isDefault,
        reason: "Fight bite",
      })),
    };
  }

  if (selection.isCompartmentSyndrome) {
    const m = SPECIAL_INJURY_MAP.compartmentSyndrome;
    return {
      primaryDiagnosis: lookup(m.diagnosisId),
      suggestedProcedures: m.procedures.map((p) => ({
        procedurePicklistId: p.id,
        displayName: p.displayName,
        isDefault: p.isDefault,
        reason: "Compartment syndrome",
      })),
    };
  }

  return null;
}

// ─── Structure-Driven Diagnosis Resolution ────────────────────────────────────

function resolveStructureDrivenDiagnosis(
  selection: HandTraumaSelection,
): LegacyTraumaResult | null {
  const structures = selection.injuredStructures ?? [];
  if (structures.length === 0) return null;

  const hasStructure = (predicate: (id: string) => boolean) =>
    structures.some((s) => predicate(s.structureId));

  if (hasStructure((id) => id === "mcp1_ucl")) {
    return {
      primaryDiagnosis: lookup("hand_dx_ucl_thumb"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_lig_ucl_repair",
          displayName: "UCL repair — thumb MCP",
          isDefault: true,
          reason: "Thumb MCP UCL selected",
        },
        {
          procedurePicklistId: "hand_lig_ucl_reconstruction",
          displayName: "UCL reconstruction — thumb MCP (chronic)",
          isDefault: false,
          reason: "Alternative for chronic insufficiency",
        },
      ],
    };
  }

  if (structures.some((s) => s.category === "flexor_tendon")) {
    return {
      primaryDiagnosis: lookup("hand_dx_flexor_tendon_lac"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_tend_flexor_primary",
          displayName: "Flexor tendon repair",
          isDefault: true,
          reason: "Flexor tendon injury selected",
        },
      ],
    };
  }

  if (structures.some((s) => s.category === "extensor_tendon")) {
    return {
      primaryDiagnosis: lookup("hand_dx_extensor_tendon_lac"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_tend_extensor_primary",
          displayName: "Extensor tendon repair",
          isDefault: true,
          reason: "Extensor tendon injury selected",
        },
      ],
    };
  }

  if (hasStructure((id) => id === "median")) {
    return {
      primaryDiagnosis: lookup("hand_dx_median_nerve_lac"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_nerve_median_repair",
          displayName: "Median nerve repair",
          isDefault: true,
          reason: "Median nerve selected",
        },
      ],
    };
  }

  if (hasStructure((id) => id === "ulnar" || id === "dbun")) {
    return {
      primaryDiagnosis: hasStructure((id) => id === "dbun")
        ? lookup("hand_dx_dbun_injury")
        : lookup("hand_dx_ulnar_nerve_lac"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_nerve_ulnar_repair",
          displayName: "Ulnar nerve repair",
          isDefault: true,
          reason: "Ulnar nerve branch selected",
        },
      ],
    };
  }

  if (hasStructure((id) => id === "pin" || id === "srn")) {
    return {
      primaryDiagnosis: lookup("hand_dx_radial_nerve_lac"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_nerve_radial_repair",
          displayName: "Radial branch repair",
          isDefault: true,
          reason: "Radial nerve branch selected",
        },
      ],
    };
  }

  if (structures.some((s) => s.category === "nerve")) {
    return {
      primaryDiagnosis: lookup("hand_dx_digital_nerve_lac"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_nerve_digital_repair",
          displayName: "Digital nerve repair",
          isDefault: true,
          reason: "Digital nerve injury selected",
        },
      ],
    };
  }

  if (hasStructure((id) => id === "nail_bed")) {
    return {
      primaryDiagnosis: lookup("hand_dx_nail_bed_injury"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_cov_nail_bed_repair",
          displayName: "Nail bed repair",
          isDefault: true,
          reason: "Nail bed injury selected",
        },
      ],
    };
  }

  if (
    hasStructure((id) => id === "skin_loss") ||
    structures.some((s) => s.category === "artery")
  ) {
    return {
      primaryDiagnosis: hasStructure((id) => id === "skin_loss")
        ? lookup("hand_dx_hand_degloving")
        : lookup("hand_dx_complex_laceration"),
      suggestedProcedures: [],
    };
  }

  return null;
}

// ─── Main Mapping Function ───────────────────────────────────────────────────

function pairFromLegacyResult(
  key: string,
  source: TraumaDiagnosisPair["source"],
  displayName: string,
  result: LegacyTraumaResult,
  selectionMode: TraumaDiagnosisPair["selectionMode"] = "multiple",
): TraumaDiagnosisPair {
  return {
    key,
    source,
    diagnosis: {
      diagnosisPicklistId: result.primaryDiagnosis.diagnosisPicklistId,
      displayName,
      snomedCtCode: result.primaryDiagnosis.snomedCtCode,
      codes: buildCodingReferences(
        result.primaryDiagnosis.snomedCtCode,
        result.primaryDiagnosis.displayName,
      ),
    },
    selectionMode,
    suggestedProcedures:
      selectionMode === "single"
        ? normalizeSingleSelectSuggestions(result.suggestedProcedures)
        : mergeProcedureSuggestions(result.suggestedProcedures),
  };
}

function buildFracturePairs(
  normalized: MachineSummary,
): TraumaDiagnosisPair[] {
  const groups = new Map<string, typeof normalized.fractures>();

  for (const fracture of normalized.fractures) {
    const key = [
      fracture.familyCode,
      fracture.familyCode === "78" ? (fracture.phalanx ?? "") : "",
      fracture.segment ?? "",
      fracture.openStatus ?? "",
      fracture.isComminuted ? "1" : "0",
      fracture.digit ?? "",
    ].join("|");
    const current = groups.get(key);
    if (current) {
      current.push(fracture);
    } else {
      groups.set(key, [fracture]);
    }
  }

  return Array.from(groups.entries()).map(([key, fractures]) => {
    const displayName =
      buildFractureBullets(fractures, "shorthand_english", "short")[0] ??
      "Fracture";
    const procedureSuggestions: TraumaProcedureSuggestion[] = [];
    let representative: DiagnosisRef | undefined;

    for (const fracture of fractures) {
      const aoResult = resolveAOToDiagnosis({
        familyCode: fracture.familyCode,
        finger: fracture.ray ? String(DIGIT_INDEX[fracture.ray]) : undefined,
        phalanx: fracture.phalanx,
        segment: fracture.segment,
        type: fracture.aoCode.match(/[A-C]/)?.[0],
      });
      if (!aoResult) continue;
      const diagnosis = findDiagnosisById(aoResult.diagnosisPicklistId);
      if (!diagnosis) continue;
      representative = representative ?? {
        diagnosisPicklistId: diagnosis.id,
        displayName: diagnosis.displayName,
        snomedCtCode: diagnosis.snomedCtCode,
      };
      for (const suggestion of evaluateSuggestions(diagnosis)) {
        procedureSuggestions.push({
          procedurePicklistId: suggestion.procedurePicklistId,
          displayName: suggestion.displayName ?? suggestion.procedurePicklistId,
          isDefault: suggestion.isDefault,
          reason: "Matched from AO classification",
        });
      }
    }

    return {
      key: `fracture:${key}`,
      source: "fracture",
      diagnosis: representative
        ? {
            diagnosisPicklistId: representative.diagnosisPicklistId,
            displayName,
            snomedCtCode: representative.snomedCtCode,
            codes: buildDiagnosisCodingReferences(representative),
          }
        : { displayName },
      selectionMode: "single" as const,
      suggestedProcedures: normalizeSingleSelectSuggestions(
        procedureSuggestions,
      ),
    };
  });
}

function buildDislocationPairs(
  normalized: MachineSummary,
): TraumaDiagnosisPair[] {
  return normalized.dislocations.map((injury, index) => {
    const legacy = resolveDislocationDiagnosis(injury);
    const displayName =
      buildDislocationBullets([injury], "shorthand_english", "short")[0] ??
      legacy.primaryDiagnosis.displayName;
    return pairFromLegacyResult(
      `dislocation:${injury.joint}:${injury.digit ?? "na"}:${index}`,
      "dislocation",
      displayName,
      legacy,
      "multiple",
    );
  });
}

function buildTendonPairs(
  normalized: MachineSummary,
): TraumaDiagnosisPair[] {
  const groups = new Map<string, TendonInjury[]>();

  for (const injury of normalized.tendons) {
    const key = [
      injury.category,
      injury.zone ?? "",
      injury.completeness ?? "",
      injury.structures.join("/"),
    ].join("|");
    const current = groups.get(key);
    if (current) {
      current.push(injury);
    } else {
      groups.set(key, [injury]);
    }
  }

  return Array.from(groups.entries()).map(([key, injuries]) => {
    const sample = injuries[0]!;
    const displayName =
      buildTendonBullets(injuries, "shorthand_english", "short")[0] ??
      "Tendon injury";
    const isFlexor = sample.category === "flexor_tendon";
    const diagnosis = lookup(
      isFlexor ? "hand_dx_flexor_tendon_lac" : "hand_dx_extensor_tendon_lac",
    );
    const preferredProcedure =
      isFlexor && sample.structures.includes("FPL")
        ? "hand_tend_fpl_repair"
        : isFlexor
          ? "hand_tend_flexor_primary"
          : "hand_tend_extensor_primary";
    const suggestion = createProcedureSuggestion(
      preferredProcedure,
      `${isFlexor ? "Flexor" : "Extensor"} tendon injury`,
    );

    return {
      key: `tendon:${key}`,
      source: "tendon",
      diagnosis: {
        diagnosisPicklistId: diagnosis.diagnosisPicklistId,
        displayName,
        snomedCtCode: diagnosis.snomedCtCode,
        codes: buildCodingReferences(
          diagnosis.snomedCtCode,
          diagnosis.displayName,
        ),
      },
      selectionMode: "single" as const,
      suggestedProcedures: suggestion
        ? normalizeSingleSelectSuggestions([suggestion])
        : [],
    };
  });
}

function buildNervePairs(
  normalized: MachineSummary,
): TraumaDiagnosisPair[] {
  const namedPairs = normalized.nerves
    .filter((injury) => !DIGITAL_NERVE_LABELS[injury.structureId])
    .map((injury) => {
      const displayName =
        buildNerveBullets([injury], "shorthand_english", "short")[0] ??
        "Nerve injury";
      const diagnosisId =
        injury.structureId === "median"
          ? "hand_dx_median_nerve_lac"
          : injury.structureId === "pin" ||
              injury.structureId === "srn" ||
              injury.structureId === "radial"
            ? "hand_dx_radial_nerve_lac"
          : injury.structureId === "dbun"
              ? "hand_dx_dbun_injury"
              : "hand_dx_ulnar_nerve_lac";
      const procedureId =
        injury.structureId === "median"
          ? "hand_nerve_median_repair"
          : injury.structureId === "pin" ||
              injury.structureId === "srn" ||
              injury.structureId === "radial"
            ? "hand_nerve_radial_repair"
            : "hand_nerve_ulnar_repair";
      const diagnosis = lookup(diagnosisId);
      const suggestions: TraumaProcedureSuggestion[] = [];
      const repair = createProcedureSuggestion(
        procedureId,
        `${displayName} selected`,
        true,
      );
      if (repair) suggestions.push(repair);
      const graft = createProcedureSuggestion(
        "hand_nerve_graft",
        "Nerve graft reconstruction",
        false,
      );
      if (graft) suggestions.push(graft);
      const conduit = createProcedureSuggestion(
        "hand_nerve_conduit",
        "Nerve conduit repair",
        false,
      );
      if (conduit) suggestions.push(conduit);

      return {
        key: `nerve:${injury.structureId}`,
        source: "nerve" as const,
        diagnosis: {
          diagnosisPicklistId: diagnosis.diagnosisPicklistId,
          displayName,
          snomedCtCode: diagnosis.snomedCtCode,
          codes: buildCodingReferences(
            diagnosis.snomedCtCode,
            diagnosis.displayName,
          ),
        },
        selectionMode: "single" as const,
        suggestedProcedures: normalizeSingleSelectSuggestions(suggestions),
      };
    });

  const digitalBySide = new Map<string, typeof normalized.nerves>();
  for (const injury of normalized.nerves.filter((entry) =>
    Boolean(DIGITAL_NERVE_LABELS[entry.structureId]),
  )) {
    const key =
      injury.side ?? DIGITAL_NERVE_LABELS[injury.structureId]?.side ?? "digital";
    const current = digitalBySide.get(key);
    if (current) {
      current.push(injury);
    } else {
      digitalBySide.set(key, [injury]);
    }
  }

  const digitalPairs = Array.from(digitalBySide.entries()).map(
    ([key, injuries]) => {
      const diagnosis = lookup("hand_dx_digital_nerve_lac");
      const displayName =
        buildNerveBullets(injuries, "shorthand_english", "short")[0] ??
        diagnosis.displayName;
      const suggestions: TraumaProcedureSuggestion[] = [];
      const repair = createProcedureSuggestion(
        "hand_nerve_digital_repair",
        "Digital nerve injury",
        true,
      );
      if (repair) suggestions.push(repair);
      const graft = createProcedureSuggestion(
        "hand_nerve_graft",
        "Nerve graft reconstruction",
        false,
      );
      if (graft) suggestions.push(graft);
      const conduit = createProcedureSuggestion(
        "hand_nerve_conduit",
        "Nerve conduit repair",
        false,
      );
      if (conduit) suggestions.push(conduit);
      return {
        key: `nerve:digital:${key}`,
        source: "nerve" as const,
        diagnosis: {
          diagnosisPicklistId: diagnosis.diagnosisPicklistId,
          displayName,
          snomedCtCode: diagnosis.snomedCtCode,
          codes: buildCodingReferences(
            diagnosis.snomedCtCode,
            diagnosis.displayName,
          ),
        },
        selectionMode: "single" as const,
        suggestedProcedures: normalizeSingleSelectSuggestions(suggestions),
      };
    },
  );

  return [...namedPairs, ...digitalPairs];
}

function buildVesselPairs(
  normalized: MachineSummary,
): TraumaDiagnosisPair[] {
  const groups = new Map<
    string,
    { vessels: typeof normalized.vessels; perfusion: PerfusionStatusEntry[] }
  >();

  for (const vessel of normalized.vessels) {
    const key = vessel.digit
      ? `digital:${vessel.digit}`
      : `proximal:${vessel.structureId}`;
    const current = groups.get(key);
    if (current) {
      current.vessels.push(vessel);
    } else {
      groups.set(key, {
        vessels: [vessel],
        perfusion: vessel.digit
          ? normalized.perfusion.filter((entry) => entry.digit === vessel.digit)
          : [],
      });
    }
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const displayName =
      buildVesselBullets(
        group.vessels,
        group.perfusion,
        "shorthand_english",
        "short",
      )[0] ?? "Vascular injury";
    const suggestions: TraumaProcedureSuggestion[] = [];
    const sample = group.vessels[0]!;

    if (sample.digit) {
      const repair = createProcedureSuggestion(
        "hand_vasc_digital_artery_repair",
        "Digital artery injury",
        true,
      );
      if (repair) suggestions.push(repair);
    } else if (sample.structureId === "radial_artery") {
      const repair = createProcedureSuggestion(
        "hand_vasc_radial_artery_repair",
        "Radial artery injury",
        true,
      );
      if (repair) suggestions.push(repair);
    } else if (sample.structureId === "ulnar_artery") {
      const repair = createProcedureSuggestion(
        "hand_vasc_ulnar_artery_repair",
        "Ulnar artery injury",
        true,
      );
      if (repair) suggestions.push(repair);
    } else {
      const repair = createProcedureSuggestion(
        "hand_vasc_palmar_arch_repair",
        "Palmar arch injury",
        true,
      );
      if (repair) suggestions.push(repair);
    }

    // Vein graft interposition as alternative repair strategy
    const veinGraft = createProcedureSuggestion(
      "hand_vasc_vein_graft",
      "Vein graft reconstruction",
      false,
    );
    if (veinGraft) suggestions.push(veinGraft);

    if (group.perfusion.length > 0) {
      const revascularisation = createProcedureSuggestion(
        "hand_cov_revascularisation",
        "Perfusion deficit present",
      );
      if (revascularisation) suggestions.unshift(revascularisation);
    }

    return {
      key: `vessel:${key}`,
      source: "vessel",
      diagnosis: { displayName },
      selectionMode: group.perfusion.length > 0 ? "multiple" : "single",
      suggestedProcedures:
        group.perfusion.length > 0
          ? mergeProcedureSuggestions(suggestions)
          : normalizeSingleSelectSuggestions(suggestions),
    };
  });
}

/**
 * Resolve coverage procedure suggestions based on zone, surfaces, and size.
 */
function resolveCoverageProcedures(
  zone: CoverageZone | undefined,
  surfaces: ("palmar" | "dorsal")[] | undefined,
  size: CoverageSize | undefined,
): TraumaProcedureSuggestion[] {
  if (!zone) return [];

  const isPalmar = surfaces?.includes("palmar") ?? false;
  const isDorsal = surfaces?.includes("dorsal") ?? false;
  const suggestions: TraumaProcedureSuggestion[] = [];

  const add = (id: string, reason: string, isDefault = false) => {
    const s = createProcedureSuggestion(id, reason, isDefault);
    if (s) suggestions.push(s);
  };

  switch (zone) {
    case "fingertip":
      if (isPalmar) {
        add("hand_cov_vy_advancement", "Palmar fingertip defect", true);
        add("hand_cov_cross_finger", "Alternative fingertip coverage");
        add("hand_cov_moberg", "Thumb tip coverage option");
      }
      if (isDorsal || (!isPalmar && !isDorsal)) {
        add("hand_cov_skin_graft", "Dorsal fingertip coverage", !isPalmar);
      }
      break;
    case "digit_shaft":
      if (isPalmar) {
        add("hand_cov_cross_finger", "Palmar digit shaft defect", true);
        add("hand_cov_homodigital_island", "Homodigital island flap option");
      }
      if (isDorsal || (!isPalmar && !isDorsal)) {
        add("hand_cov_skin_graft", "Dorsal digit coverage", !isPalmar);
      }
      break;
    case "web_space":
      add("hand_cov_skin_graft", "Web space coverage", true);
      break;
    case "palm":
      add("hand_cov_skin_graft", "Palmar coverage", true);
      break;
    case "dorsum_hand":
      add("hand_cov_skin_graft", "Dorsum of hand coverage", true);
      add("hand_cov_reverse_radial_forearm", "Reverse radial forearm flap option");
      add("hand_cov_groin_flap", "Groin flap for larger dorsal defects");
      break;
    case "wrist_forearm":
      add("hand_cov_skin_graft", "Wrist/forearm coverage", true);
      break;
  }

  if (size === "large") {
    add("hand_cov_free_flap", "Large defect — consider free flap");
  }

  return suggestions;
}

function buildCoveragePairs(
  normalized: MachineSummary,
): TraumaDiagnosisPair[] {
  const coverageTypes = new Set([
    "defect", "loss", "degloving", "contamination", "nail_bed",
  ]);
  const injuries = normalized.softTissue.filter((i) => coverageTypes.has(i.type));

  return injuries.map((injury, index) => {
    const displayName =
      buildSoftTissueBullets([injury], "shorthand_english", "short")[0] ??
      "Soft tissue injury";

    if (injury.type === "nail_bed") {
      const diagnosis = lookup("hand_dx_nail_bed_injury");
      const suggestion = createProcedureSuggestion(
        "hand_cov_nail_bed_repair",
        "Nail bed injury selected",
      );
      return {
        key: `soft_tissue:nail_bed:${index}`,
        source: "soft_tissue" as const,
        diagnosis: {
          diagnosisPicklistId: diagnosis.diagnosisPicklistId,
          displayName,
          snomedCtCode: diagnosis.snomedCtCode,
          codes: buildCodingReferences(
            diagnosis.snomedCtCode,
            diagnosis.displayName,
          ),
        },
        selectionMode: "single" as const,
        suggestedProcedures: suggestion
          ? normalizeSingleSelectSuggestions([suggestion])
          : [],
      };
    }

    const deglovingDiagnosis =
      injury.type === "degloving" ||
      injury.type === "loss" ||
      injury.type === "defect"
        ? lookup("hand_dx_hand_degloving")
        : undefined;

    const coverageSuggestions = resolveCoverageProcedures(
      injury.zone,
      injury.surfaces,
      injury.size,
    );

    return {
      key: `soft_tissue:${injury.type}:${index}`,
      source: "soft_tissue" as const,
      diagnosis: deglovingDiagnosis
        ? {
            diagnosisPicklistId: deglovingDiagnosis.diagnosisPicklistId,
            displayName,
            snomedCtCode: deglovingDiagnosis.snomedCtCode,
            codes: buildDiagnosisCodingReferences(deglovingDiagnosis),
          }
        : { displayName },
      selectionMode: "single" as const,
      suggestedProcedures:
        coverageSuggestions.length > 0
          ? normalizeSingleSelectSuggestions(coverageSuggestions)
          : [],
    };
  });
}

function buildLigamentPairs(
  normalized: MachineSummary,
): TraumaDiagnosisPair[] {
  const ligamentTypes = new Set(["ligament", "volar_plate"]);
  const injuries = normalized.softTissue.filter((i) => ligamentTypes.has(i.type));

  return injuries.map((injury, index) => {
    const displayName =
      buildSoftTissueBullets([injury], "shorthand_english", "short")[0] ??
      "Ligament injury";

    if (injury.type === "ligament" && injury.structureId === "mcp1_ucl") {
      const diagnosis = lookup("hand_dx_ucl_thumb");
      const repair = createProcedureSuggestion(
        "hand_lig_ucl_repair",
        "Thumb UCL selected",
      );
      const reconstruction = createProcedureSuggestion(
        "hand_lig_ucl_reconstruction",
        "Alternative reconstruction option",
        false,
      );
      return {
        key: `ligament:ucl:${index}`,
        source: "ligament" as const,
        diagnosis: {
          diagnosisPicklistId: diagnosis.diagnosisPicklistId,
          displayName,
          snomedCtCode: diagnosis.snomedCtCode,
          codes: buildCodingReferences(
            diagnosis.snomedCtCode,
            diagnosis.displayName,
          ),
        },
        selectionMode: "single" as const,
        suggestedProcedures: normalizeSingleSelectSuggestions(
          [repair, reconstruction].filter(
            (suggestion): suggestion is TraumaProcedureSuggestion =>
              suggestion !== null,
          ),
        ),
      };
    }

    if (injury.type === "volar_plate") {
      const repair = createProcedureSuggestion(
        "hand_joint_volar_plate_repair",
        "Volar plate injury selected",
      );
      return {
        key: `ligament:volar_plate:${index}`,
        source: "ligament" as const,
        diagnosis: { displayName },
        selectionMode: "single" as const,
        suggestedProcedures: repair
          ? normalizeSingleSelectSuggestions([repair])
          : [],
      };
    }

    // Generic ligament (PIP collateral, etc.)
    return {
      key: `ligament:${injury.structureId ?? injury.type}:${index}`,
      source: "ligament" as const,
      diagnosis: { displayName },
      selectionMode: "single" as const,
      suggestedProcedures: [],
    };
  });
}

function buildSpecialInjuryPairs(
  selection: HandTraumaSelection,
  normalized: MachineSummary,
): TraumaDiagnosisPair[] {
  const specialTypes = new Set([
    "high_pressure_injection", "fight_bite", "compartment_syndrome", "ring_avulsion",
  ]);
  const injuries = normalized.softTissue.filter((i) => specialTypes.has(i.type));

  return injuries.map((injury, index) => {
    const displayName =
      buildSoftTissueBullets([injury], "shorthand_english", "short")[0] ??
      "Special injury";

    if (injury.type === "high_pressure_injection") {
      return pairFromLegacyResult(
        `special:hpi:${index}`,
        "special",
        displayName,
        resolveSpecialInjury({ ...selection, isHighPressureInjection: true })!,
        "multiple",
      );
    }
    if (injury.type === "fight_bite") {
      return pairFromLegacyResult(
        `special:fight_bite:${index}`,
        "special",
        displayName,
        resolveSpecialInjury({ ...selection, isFightBite: true })!,
        "single",
      );
    }
    if (injury.type === "compartment_syndrome") {
      return pairFromLegacyResult(
        `special:compartment:${index}`,
        "special",
        displayName,
        resolveSpecialInjury({ ...selection, isCompartmentSyndrome: true })!,
        "multiple",
      );
    }
    // ring_avulsion
    return pairFromLegacyResult(
      `special:ring_avulsion:${index}`,
      "special",
      displayName,
      resolveAmputationDiagnosis({
        ...selection,
        isRingAvulsion: true,
      }),
      "single",
    );
  });
}

function buildAmputationPairs(
  selection: HandTraumaSelection,
  normalized: MachineSummary,
): TraumaDiagnosisPair[] {
  if (normalized.amputations.length === 0) return [];

  // Generate one pair per AmputationInjury (one per digit for per-digit mode)
  return normalized.amputations.map((amp, index) => {
    const legacy = resolveAmputationDiagnosis(selection);
    const displayName =
      buildAmputationBullets([amp], "shorthand_english", "short")[0] ??
      legacy.primaryDiagnosis.displayName;
    return pairFromLegacyResult(
      `amputation:${index}`,
      "amputation",
      displayName,
      legacy,
      normalized.amputations.length > 1 ? "multiple" : "single",
    );
  });
}

/**
 * Main mapping function.
 * Normalizes the trauma selection once, uses the same machine summary for
 * diagnosis rendering and mapping, then returns grouped diagnosis-procedure
 * pairs plus a representative structured diagnosis for compatibility.
 */
export function resolveTraumaDiagnosis(
  selection: HandTraumaSelection,
): TraumaMappingResult | null {
  const diagnosisOutput = generateHandTraumaDiagnosis(
    toDiagnosisSelection(selection),
    "shorthand_english",
  );
  const normalized = normalizeSelection(toDiagnosisSelection(selection));

  if (!diagnosisOutput || !normalized) {
    return null;
  }

  const pairs = [
    ...buildAmputationPairs(selection, normalized),
    ...buildFracturePairs(normalized),
    ...buildDislocationPairs(normalized),
    ...buildTendonPairs(normalized),
    ...buildNervePairs(normalized),
    ...buildVesselPairs(normalized),
    ...buildCoveragePairs(normalized),
    ...buildLigamentPairs(normalized),
    ...buildSpecialInjuryPairs(selection, normalized),
  ];

  return finalizePairs(pairs, diagnosisOutput);
}
