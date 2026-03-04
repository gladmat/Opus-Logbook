/**
 * AO Fracture → Diagnosis & Procedure Auto-Mapping
 *
 * When a surgeon classifies a fracture using the AO picker, this module
 * automatically resolves the correct DiagnosisPicklistEntry and filters
 * procedure suggestions based on the specific bone/fracture type.
 *
 * This is OPTIONAL — if the surgeon skips AO classification, they use
 * the normal diagnosis picker pathway unchanged.
 *
 * Flow: AO Code → bone familyCode → mapped diagnosis ID → filtered procedures
 */

import type {
  DiagnosisPicklistEntry,
  ProcedureSuggestion,
} from "@/types/diagnosis";

// ─── AO Family Code → Diagnosis Mapping ──────────────────────────────────────

export interface AODiagnosisMapping {
  /** AO bone familyCode (e.g., "77" = Metacarpal, "78" = Phalanx) */
  aoFamilyCode: string;

  /** Human-readable bone name for display */
  boneName: string;

  /** The diagnosis picklist ID this maps to */
  diagnosisPicklistId: string;

  /**
   * Optional: if a specific finger/subBone further narrows the diagnosis.
   * e.g., Thumb metacarpal base fracture → Bennett's or Rolando's
   */
  refinements?: AODiagnosisRefinement[];

  /**
   * Procedure overrides: when AO classification provides enough info
   * to narrow procedures beyond what the diagnosis alone suggests.
   * e.g., articular fracture type C → ORIF more likely than K-wire
   */
  procedureHints?: AOProcedureHint[];
}

export interface AODiagnosisRefinement {
  /** Condition to match (e.g., finger "1", segment "1" for thumb base) */
  condition: {
    finger?: string;
    segment?: string;
    type?: string; // A, B, or C
    phalanx?: string;
    subBoneId?: string;
  };
  /** Override diagnosis to this ID instead */
  overrideDiagnosisId: string;
  /** Description for debugging/display */
  description: string;
}

export interface AOProcedureHint {
  /** Condition from AO classification */
  condition: {
    segment?: string; // "1" = proximal, "2" = shaft, "3" = distal
    type?: string; // "A" = simple/extra-articular, "B" = partial articular, "C" = complete articular
  };
  /** Procedure IDs to promote as default (override isDefault) */
  promoteToDefault: string[];
  /** Procedure IDs to demote (set isDefault: false) */
  demoteFromDefault?: string[];
  /** Description for display */
  description: string;
}

// ─── Mapping Table ───────────────────────────────────────────────────────────

export const AO_DIAGNOSIS_MAPPINGS: AODiagnosisMapping[] = [
  // ── Carpal bones ──
  {
    aoFamilyCode: "71", // Lunate
    boneName: "Lunate",
    diagnosisPicklistId: "hand_dx_carpal_fracture_other",
    // No specific diagnosis entry for lunate fracture — falls to generic carpal
    // Could be added later if volume warrants it
  },
  {
    aoFamilyCode: "72", // Scaphoid
    boneName: "Scaphoid",
    diagnosisPicklistId: "hand_dx_scaphoid_fx",
    // No refinements needed — scaphoid fracture is a specific diagnosis
  },
  {
    aoFamilyCode: "73", // Capitate
    boneName: "Capitate",
    diagnosisPicklistId: "hand_dx_carpal_fracture_other",
  },
  {
    aoFamilyCode: "74", // Hamate
    boneName: "Hamate",
    diagnosisPicklistId: "hand_dx_carpal_fracture_other",
  },
  {
    aoFamilyCode: "75", // Trapezium
    boneName: "Trapezium",
    diagnosisPicklistId: "hand_dx_carpal_fracture_other",
  },
  {
    aoFamilyCode: "76", // Other carpal (Pisiform, Triquetrum, Trapezoid)
    boneName: "Other Carpal",
    diagnosisPicklistId: "hand_dx_carpal_fracture_other",
  },

  // ── Metacarpal ──
  {
    aoFamilyCode: "77",
    boneName: "Metacarpal",
    diagnosisPicklistId: "hand_dx_metacarpal_fx",
    refinements: [
      {
        // Thumb metacarpal, base, partial articular → Bennett's
        condition: { finger: "1", segment: "1", type: "B" },
        overrideDiagnosisId: "hand_dx_bennett_fx",
        description: "Thumb MC base, partial articular → Bennett's fracture",
      },
      {
        // Thumb metacarpal, base, complete articular → Rolando's
        condition: { finger: "1", segment: "1", type: "C" },
        overrideDiagnosisId: "hand_dx_rolando_fx",
        description: "Thumb MC base, complete articular → Rolando's fracture",
      },
    ],
    procedureHints: [
      {
        // Articular fractures (B or C) → ORIF preferred
        condition: { type: "B" },
        promoteToDefault: ["hand_fx_metacarpal_orif"],
        demoteFromDefault: ["hand_fx_metacarpal_crif"],
        description: "Partial articular → ORIF preferred",
      },
      {
        condition: { type: "C" },
        promoteToDefault: ["hand_fx_metacarpal_orif"],
        demoteFromDefault: ["hand_fx_metacarpal_crif"],
        description: "Complete articular → ORIF preferred",
      },
      {
        // Simple shaft fractures → K-wire or ORIF both reasonable
        condition: { segment: "2", type: "A" },
        promoteToDefault: [
          "hand_fx_metacarpal_crif",
          "hand_fx_metacarpal_orif",
        ],
        description: "Simple shaft → K-wire and ORIF both options",
      },
    ],
  },

  // ── Phalanx ──
  {
    aoFamilyCode: "78",
    boneName: "Phalanx",
    diagnosisPicklistId: "hand_dx_phalanx_fx",
    procedureHints: [
      {
        // Articular fractures → ORIF preferred
        condition: { segment: "1", type: "B" },
        promoteToDefault: ["hand_fx_phalanx_orif"],
        demoteFromDefault: ["hand_fx_phalanx_crif"],
        description: "Base partial articular → ORIF preferred",
      },
      {
        condition: { segment: "1", type: "C" },
        promoteToDefault: ["hand_fx_phalanx_orif"],
        demoteFromDefault: ["hand_fx_phalanx_crif"],
        description: "Base complete articular → ORIF preferred",
      },
      {
        condition: { segment: "3", type: "B" },
        promoteToDefault: ["hand_fx_phalanx_orif"],
        demoteFromDefault: ["hand_fx_phalanx_crif"],
        description: "Head partial articular → ORIF preferred",
      },
      {
        condition: { segment: "3", type: "C" },
        promoteToDefault: ["hand_fx_phalanx_orif"],
        demoteFromDefault: ["hand_fx_phalanx_crif"],
        description: "Head complete articular → ORIF preferred",
      },
      {
        // Simple shaft fractures → K-wire often sufficient
        condition: { segment: "2", type: "A" },
        promoteToDefault: ["hand_fx_phalanx_crif"],
        description: "Simple shaft → K-wire often sufficient",
      },
    ],
  },

  // ── Crush / Multiple ──
  {
    aoFamilyCode: "79",
    boneName: "Crush / Multiple fractures",
    diagnosisPicklistId: "hand_dx_crush_injury",
    // Crush injuries map to a broader diagnosis with wider procedure options
  },
];

// ─── Lookup Functions ────────────────────────────────────────────────────────

/**
 * Given an AO fracture entry, resolve the appropriate diagnosis.
 * Returns the diagnosis picklist ID and any procedure hint modifications.
 */
export function resolveAOToDiagnosis(params: {
  familyCode: string;
  finger?: string;
  phalanx?: string;
  segment?: string;
  type?: string;
  subBoneId?: string;
}): {
  diagnosisPicklistId: string;
  procedureHints: AOProcedureHint[];
  matchedRefinement?: string;
} | null {
  const mapping = AO_DIAGNOSIS_MAPPINGS.find(
    (m) => m.aoFamilyCode === params.familyCode,
  );
  if (!mapping) return null;

  let diagnosisId = mapping.diagnosisPicklistId;
  let matchedRefinement: string | undefined;

  // Check refinements (e.g., Bennett's, Rolando's)
  if (mapping.refinements) {
    for (const ref of mapping.refinements) {
      const matches = Object.entries(ref.condition).every(([key, value]) => {
        return params[key as keyof typeof params] === value;
      });
      if (matches) {
        diagnosisId = ref.overrideDiagnosisId;
        matchedRefinement = ref.description;
        break;
      }
    }
  }

  // Collect applicable procedure hints
  const applicableHints: AOProcedureHint[] = [];
  if (mapping.procedureHints) {
    for (const hint of mapping.procedureHints) {
      const matches = Object.entries(hint.condition).every(([key, value]) => {
        return params[key as keyof typeof params] === value;
      });
      if (matches) {
        applicableHints.push(hint);
      }
    }
  }

  return {
    diagnosisPicklistId: diagnosisId,
    procedureHints: applicableHints,
    matchedRefinement,
  };
}

/**
 * Apply AO procedure hints to modify the default/active state of suggestions.
 * Returns a new array of suggestions with updated isDefault flags.
 */
export function applyProcedureHints(
  suggestions: ProcedureSuggestion[],
  hints: AOProcedureHint[],
): ProcedureSuggestion[] {
  if (hints.length === 0) return suggestions;

  // Collect all promote/demote IDs
  const promoteSet = new Set<string>();
  const demoteSet = new Set<string>();

  for (const hint of hints) {
    hint.promoteToDefault.forEach((id) => promoteSet.add(id));
    hint.demoteFromDefault?.forEach((id) => demoteSet.add(id));
  }

  return suggestions.map((s) => {
    if (promoteSet.has(s.procedurePicklistId)) {
      return { ...s, isDefault: true };
    }
    if (demoteSet.has(s.procedurePicklistId)) {
      return { ...s, isDefault: false };
    }
    return s;
  });
}

/**
 * Get the list of fracture-type diagnosis IDs that the AO picker can resolve to.
 * Used to determine which diagnoses should be hidden from the manual picker
 * when the AO pathway has already set one.
 */
export function getAOMappableDiagnosisIds(): string[] {
  const ids = new Set<string>();
  for (const mapping of AO_DIAGNOSIS_MAPPINGS) {
    ids.add(mapping.diagnosisPicklistId);
    if (mapping.refinements) {
      for (const ref of mapping.refinements) {
        ids.add(ref.overrideDiagnosisId);
      }
    }
  }
  return Array.from(ids);
}
