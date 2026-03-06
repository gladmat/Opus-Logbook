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
  DigitId,
  DislocationEntry,
  FractureEntry,
  HandTraumaStructure,
} from "@/types/case";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InjuryCategory =
  | "fracture"
  | "dislocation"
  | "tendon"
  | "nerve"
  | "vessel"
  | "soft_tissue";

export interface HandTraumaSelection {
  affectedDigits: DigitId[];
  activeCategories: InjuryCategory[];

  // Fracture data (from AO cascade)
  fractures?: FractureEntry[];

  // Dislocation data
  dislocations?: DislocationEntry[];

  // Soft tissue structures (from existing structure picker)
  injuredStructures?: HandTraumaStructure[];

  // Special injury flags
  isHighPressureInjection?: boolean;
  isFightBite?: boolean;
  isCompartmentSyndrome?: boolean;
  isRingAvulsion?: boolean;

  // Amputation level
  amputationLevel?:
    | "fingertip"
    | "distal_phalanx"
    | "middle_phalanx"
    | "proximal_phalanx"
    | "mcp"
    | "ray"
    | "hand_wrist";
  isReplantable?: boolean;
}

export interface TraumaMappingResult {
  /** Primary suggested diagnosis */
  primaryDiagnosis: {
    diagnosisPicklistId: string;
    displayName: string;
    snomedCtCode: string;
  };
  /** Additional diagnoses for multi-structure injuries */
  additionalDiagnoses?: {
    diagnosisPicklistId: string;
    displayName: string;
  }[];
  /** Suggested procedures, ranked */
  suggestedProcedures: {
    procedurePicklistId: string;
    displayName: string;
    isDefault: boolean;
    reason: string;
  }[];
}

// ─── Diagnosis Lookup Helper ─────────────────────────────────────────────────

interface DiagnosisRef {
  diagnosisPicklistId: string;
  displayName: string;
  snomedCtCode: string;
}

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
): TraumaMappingResult {
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
): TraumaMappingResult {
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
): TraumaMappingResult | null {
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
): TraumaMappingResult | null {
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

  if (hasStructure((id) => id === "radial")) {
    return {
      primaryDiagnosis: lookup("hand_dx_radial_nerve_lac"),
      suggestedProcedures: [
        {
          procedurePicklistId: "hand_nerve_radial_repair",
          displayName: "Radial nerve / PIN / SRN repair",
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

/**
 * Main mapping function.
 * Priority order for diagnosis resolution:
 * 1. Special injuries (HPI, fight bite, compartment syndrome) — override all
 * 2. Amputation/replantation — if amputation level set
 * 3. Dislocation — if any dislocations selected
 * 4. Fracture — delegates to existing aoToDiagnosisMapping (not handled here)
 * 5. Tendon/nerve/vessel — falls through to existing structure-based mapping
 *
 * Returns null if no mapping can be resolved from the selection
 * (e.g., fracture-only cases should use aoToDiagnosisMapping instead).
 */
export function resolveTraumaDiagnosis(
  selection: HandTraumaSelection,
): TraumaMappingResult | null {
  // 1. Special injuries take priority
  const specialResult = resolveSpecialInjury(selection);
  if (specialResult) {
    return specialResult;
  }

  // 2. Amputation / replantation
  if (selection.amputationLevel || selection.isRingAvulsion) {
    return resolveAmputationDiagnosis(selection);
  }

  // 3. Dislocations
  const dislocations = selection.dislocations;
  const firstDislocation = dislocations?.[0];
  if (firstDislocation && dislocations) {
    const result = resolveDislocationDiagnosis(firstDislocation);

    // If multiple dislocations, add as additional diagnoses
    if (dislocations.length > 1) {
      result.additionalDiagnoses = dislocations
        .slice(1)
        .map((d) => {
          const key = getDislocationKey(d);
          const mapping = DISLOCATION_DIAGNOSIS_MAP[key];
          if (!mapping) return null;
          const ref = lookup(mapping.diagnosisId);
          return {
            diagnosisPicklistId: ref.diagnosisPicklistId,
            displayName: ref.displayName,
          };
        })
        .filter(
          (d): d is { diagnosisPicklistId: string; displayName: string } =>
            d !== null,
        );

      // Merge all dislocation procedures
      for (const d of dislocations.slice(1)) {
        const key = getDislocationKey(d);
        const mapping = DISLOCATION_DIAGNOSIS_MAP[key];
        if (mapping) {
          for (const p of mapping.procedures) {
            // Avoid duplicate procedure suggestions
            if (
              !result.suggestedProcedures.some(
                (sp) => sp.procedurePicklistId === p.id,
              )
            ) {
              result.suggestedProcedures.push({
                procedurePicklistId: p.id,
                displayName: p.displayName,
                isDefault: p.isDefault,
                reason: `Matched from ${key} dislocation`,
              });
            }
          }
        }
      }
    }

    return result;
  }

  // 4. Fractures — delegate to aoToDiagnosisMapping (not handled here)

  // 5. Tendon/nerve/vessel/ligament/other structure-driven diagnosis fallback
  const structureResult = resolveStructureDrivenDiagnosis(selection);
  if (structureResult) {
    return structureResult;
  }

  return null;
}
