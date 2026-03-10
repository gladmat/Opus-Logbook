/**
 * Hand infection details — focused inline data for acute hand cases.
 * Stored on DiagnosisGroup alongside diagnosis and procedures.
 * Can be mapped to/from InfectionOverlay for escalation to the full module.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface HandInfectionDetails {
  // ── Auto-derived from diagnosis (Layer 0) ─────────────────────────────
  infectionType: HandInfectionType;

  // ── Anatomy (Layer 1) ─────────────────────────────────────────────────
  affectedDigits: DigitKey[];
  affectedSpace?: HandSpace;
  kanavelSigns?: KanavelSigns; // Only for tendon_sheath type

  // ── Cultures & Antibiotics (Layer 2) ──────────────────────────────────
  culturesTaken?: boolean;
  empiricalAntibiotic?: HandAntibioticRegimen;
  antibioticRoute?: AntibioticRoute;

  // ── Culture Results (Layer 3) ─────────────────────────────────────────
  organism?: HandOrganism;
  organismOther?: string; // Free text only when organism === "other"
  sensitivities?: Partial<Record<string, SensitivityResult>>;

  // ── Extended details (Layer 4) ────────────────────────────────────────
  severity: HandInfectionSeverity;
  imaging?: HandInfectionImaging[];
  ivDurationDays?: number;
  /** If true, user has opened the full InfectionSheet and that data takes precedence */
  escalatedToFullModule?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS & UNION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type HandInfectionType =
  | "superficial" // Paronychia, felon
  | "tendon_sheath" // Septic flexor tenosynovitis
  | "deep_space" // Thenar, midpalmar, web space abscesses
  | "joint" // Septic arthritis
  | "bone" // Osteomyelitis
  | "necrotising" // Necrotising fasciitis
  | "bite" // Fight bite, animal bite
  | "post_operative"; // SSI

export type DigitKey = "thumb" | "index" | "middle" | "ring" | "little";

export type HandSpace =
  | "thenar"
  | "midpalmar"
  | "hypothenar"
  | "web_space_1" // Between thumb-index
  | "web_space_2" // Between index-middle
  | "web_space_3" // Between middle-ring
  | "web_space_4" // Between ring-little
  | "parona" // Parona's space (deep to pronator quadratus)
  | "radial_bursa"
  | "ulnar_bursa";

export interface KanavelSigns {
  fusiformSwelling: boolean;
  flexedPosture: boolean;
  sheathTenderness: boolean;
  painOnPassiveExtension: boolean;
}

export type HandAntibioticRegimen =
  | "flucloxacillin"
  | "co_amoxiclav"
  | "cefazolin"
  | "cefazolin_metronidazole"
  | "piperacillin_tazobactam"
  | "vancomycin"
  | "clindamycin"
  | "ciprofloxacin_metronidazole"
  | "meropenem"
  | "other";

export type AntibioticRoute = "iv" | "oral" | "iv_then_oral";

export type HandOrganism =
  | "staph_aureus_mssa"
  | "staph_aureus_mrsa"
  | "strep_pyogenes" // Group A Strep
  | "strep_other"
  | "pasteurella_multocida" // Cat/dog bite
  | "eikenella_corrodens" // Fight bite
  | "pseudomonas"
  | "enterobacteriaceae"
  | "mixed_anaerobes"
  | "polymicrobial"
  | "mycobacterium" // Atypical
  | "fungal"
  | "no_growth"
  | "pending"
  | "other";

export type SensitivityResult =
  | "sensitive"
  | "resistant"
  | "intermediate"
  | "unknown";

export type HandInfectionSeverity = "local" | "spreading" | "systemic";

export type HandInfectionImaging = "xray" | "ultrasound" | "mri" | "ct";

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL MAPS
// ═══════════════════════════════════════════════════════════════════════════════

export const HAND_INFECTION_TYPE_LABELS: Record<HandInfectionType, string> = {
  superficial: "Superficial",
  tendon_sheath: "Tendon sheath",
  deep_space: "Deep space",
  joint: "Joint",
  bone: "Bone",
  necrotising: "Necrotising",
  bite: "Bite wound",
  post_operative: "Post-operative",
};

export const DIGIT_LABELS: Record<DigitKey, string> = {
  thumb: "Thumb",
  index: "Index",
  middle: "Middle",
  ring: "Ring",
  little: "Little",
};

export const HAND_SPACE_LABELS: Record<HandSpace, string> = {
  thenar: "Thenar space",
  midpalmar: "Midpalmar space",
  hypothenar: "Hypothenar space",
  web_space_1: "1st web space",
  web_space_2: "2nd web space",
  web_space_3: "3rd web space",
  web_space_4: "4th web space",
  parona: "Parona's space",
  radial_bursa: "Radial bursa",
  ulnar_bursa: "Ulnar bursa",
};

export const KANAVEL_SIGN_LABELS: Record<keyof KanavelSigns, string> = {
  fusiformSwelling: "Fusiform (sausage) swelling",
  flexedPosture: "Semi-flexed posture of digit",
  sheathTenderness: "Tenderness along flexor sheath",
  painOnPassiveExtension: "Pain on passive extension",
};

export const HAND_ANTIBIOTIC_LABELS: Record<HandAntibioticRegimen, string> = {
  flucloxacillin: "Flucloxacillin",
  co_amoxiclav: "Co-amoxiclav (Augmentin)",
  cefazolin: "Cefazolin",
  cefazolin_metronidazole: "Cefazolin + Metronidazole",
  piperacillin_tazobactam: "Piperacillin-tazobactam (Tazocin)",
  vancomycin: "Vancomycin",
  clindamycin: "Clindamycin",
  ciprofloxacin_metronidazole: "Ciprofloxacin + Metronidazole",
  meropenem: "Meropenem",
  other: "Other",
};

export const ANTIBIOTIC_ROUTE_LABELS: Record<AntibioticRoute, string> = {
  iv: "IV",
  oral: "Oral",
  iv_then_oral: "IV → Oral",
};

export const HAND_ORGANISM_LABELS: Record<HandOrganism, string> = {
  staph_aureus_mssa: "S. aureus (MSSA)",
  staph_aureus_mrsa: "S. aureus (MRSA)",
  strep_pyogenes: "Strep. pyogenes (GAS)",
  strep_other: "Streptococcus spp. (other)",
  pasteurella_multocida: "Pasteurella multocida",
  eikenella_corrodens: "Eikenella corrodens",
  pseudomonas: "Pseudomonas aeruginosa",
  enterobacteriaceae: "Enterobacteriaceae",
  mixed_anaerobes: "Mixed anaerobes",
  polymicrobial: "Polymicrobial",
  mycobacterium: "Mycobacterium (atypical)",
  fungal: "Fungal",
  no_growth: "No growth",
  pending: "Pending",
  other: "Other",
};

export const SEVERITY_LABELS: Record<HandInfectionSeverity, string> = {
  local: "Local",
  spreading: "Spreading",
  systemic: "Systemic (sepsis)",
};

export const IMAGING_LABELS: Record<HandInfectionImaging, string> = {
  xray: "X-ray",
  ultrasound: "Ultrasound",
  mri: "MRI",
  ct: "CT",
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function countKanavelSigns(signs?: KanavelSigns): number {
  if (!signs) return 0;
  return [
    signs.fusiformSwelling,
    signs.flexedPosture,
    signs.sheathTenderness,
    signs.painOnPassiveExtension,
  ].filter(Boolean).length;
}

export function generateHandInfectionSummary(
  details?: HandInfectionDetails,
): string | null {
  if (!details) return null;

  const parts: string[] = [];

  parts.push(HAND_INFECTION_TYPE_LABELS[details.infectionType]);

  if (details.affectedDigits.length > 0) {
    if (details.affectedDigits.length <= 2) {
      parts.push(details.affectedDigits.map((d) => DIGIT_LABELS[d]).join(", "));
    } else {
      parts.push(`${details.affectedDigits.length} digits`);
    }
  }
  if (details.affectedSpace) {
    parts.push(HAND_SPACE_LABELS[details.affectedSpace]);
  }

  if (details.kanavelSigns) {
    const count = countKanavelSigns(details.kanavelSigns);
    parts.push(`Kanavel ${count}/4`);
  }

  if (details.organism && details.organism !== "pending") {
    parts.push(HAND_ORGANISM_LABELS[details.organism]);
  }

  if (details.severity !== "local") {
    parts.push(SEVERITY_LABELS[details.severity]);
  }

  return parts.join(" · ");
}

/**
 * Creates default HandInfectionDetails from a diagnosis ID.
 * Auto-derives infectionType and severity from the diagnosis.
 */
export function createDefaultHandInfectionDetails(
  diagnosisId: string,
): HandInfectionDetails {
  const infectionType =
    DIAGNOSIS_TO_INFECTION_TYPE[diagnosisId] ?? "superficial";
  const severity = DIAGNOSIS_TO_DEFAULT_SEVERITY[diagnosisId] ?? "local";

  return {
    infectionType,
    affectedDigits: [],
    severity,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSIS → INFECTION TYPE MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

export const DIAGNOSIS_TO_INFECTION_TYPE: Record<string, HandInfectionType> = {
  hand_dx_paronychia: "superficial",
  hand_dx_felon: "superficial",
  hand_dx_flexor_sheath_infection: "tendon_sheath",
  hand_dx_deep_space_infection: "deep_space",
  hand_dx_septic_arthritis_hand: "joint",
  hand_dx_osteomyelitis_hand: "bone",
  hand_dx_necrotising_fasciitis_hand: "necrotising",
  hand_dx_fight_bite: "bite",
  hand_dx_animal_bite_hand: "bite",
  hand_dx_post_op_infection_hand: "post_operative",
};

export const DIAGNOSIS_TO_DEFAULT_SEVERITY: Record<
  string,
  HandInfectionSeverity
> = {
  hand_dx_paronychia: "local",
  hand_dx_felon: "local",
  hand_dx_flexor_sheath_infection: "spreading",
  hand_dx_deep_space_infection: "spreading",
  hand_dx_septic_arthritis_hand: "local",
  hand_dx_osteomyelitis_hand: "local",
  hand_dx_necrotising_fasciitis_hand: "systemic",
  hand_dx_fight_bite: "local",
  hand_dx_animal_bite_hand: "local",
  hand_dx_post_op_infection_hand: "local",
};

/**
 * Returns true if this diagnosis ID is a hand infection
 * (as opposed to a non-infection acute diagnosis like foreign body or acute CTS).
 */
export function isHandInfectionDiagnosis(diagnosisId: string): boolean {
  return diagnosisId in DIAGNOSIS_TO_INFECTION_TYPE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPIRICAL ANTIBIOTIC SUGGESTIONS BY DIAGNOSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns suggested empirical antibiotics ranked by likelihood for a given diagnosis.
 * First entry is the most common/recommended choice (pre-selected as default).
 */
export const DIAGNOSIS_TO_EMPIRICAL_ANTIBIOTICS: Record<
  string,
  HandAntibioticRegimen[]
> = {
  hand_dx_paronychia: ["flucloxacillin", "co_amoxiclav"],
  hand_dx_felon: ["flucloxacillin", "co_amoxiclav"],
  hand_dx_flexor_sheath_infection: [
    "cefazolin",
    "flucloxacillin",
    "co_amoxiclav",
    "vancomycin",
  ],
  hand_dx_deep_space_infection: [
    "cefazolin",
    "co_amoxiclav",
    "piperacillin_tazobactam",
  ],
  hand_dx_septic_arthritis_hand: ["cefazolin", "flucloxacillin", "vancomycin"],
  hand_dx_osteomyelitis_hand: [
    "cefazolin",
    "flucloxacillin",
    "vancomycin",
    "ciprofloxacin_metronidazole",
  ],
  hand_dx_necrotising_fasciitis_hand: [
    "piperacillin_tazobactam",
    "meropenem",
    "clindamycin",
    "vancomycin",
  ],
  hand_dx_fight_bite: [
    "co_amoxiclav",
    "cefazolin_metronidazole",
    "ciprofloxacin_metronidazole",
  ],
  hand_dx_animal_bite_hand: ["co_amoxiclav", "ciprofloxacin_metronidazole"],
  hand_dx_post_op_infection_hand: ["cefazolin", "flucloxacillin", "vancomycin"],
};

/**
 * Returns the most likely organisms for a given diagnosis, ordered by frequency.
 * Used to highlight probable organisms in the picker.
 */
export const DIAGNOSIS_TO_LIKELY_ORGANISMS: Record<string, HandOrganism[]> = {
  hand_dx_paronychia: ["staph_aureus_mssa", "strep_other", "mixed_anaerobes"],
  hand_dx_felon: ["staph_aureus_mssa", "strep_other"],
  hand_dx_flexor_sheath_infection: [
    "staph_aureus_mssa",
    "strep_pyogenes",
    "staph_aureus_mrsa",
  ],
  hand_dx_deep_space_infection: [
    "staph_aureus_mssa",
    "strep_pyogenes",
    "polymicrobial",
  ],
  hand_dx_septic_arthritis_hand: [
    "staph_aureus_mssa",
    "strep_pyogenes",
    "staph_aureus_mrsa",
  ],
  hand_dx_osteomyelitis_hand: [
    "staph_aureus_mssa",
    "staph_aureus_mrsa",
    "pseudomonas",
  ],
  hand_dx_necrotising_fasciitis_hand: [
    "strep_pyogenes",
    "polymicrobial",
    "mixed_anaerobes",
  ],
  hand_dx_fight_bite: [
    "eikenella_corrodens",
    "strep_other",
    "staph_aureus_mssa",
    "mixed_anaerobes",
  ],
  hand_dx_animal_bite_hand: [
    "pasteurella_multocida",
    "staph_aureus_mssa",
    "mixed_anaerobes",
  ],
  hand_dx_post_op_infection_hand: [
    "staph_aureus_mssa",
    "staph_aureus_mrsa",
    "strep_other",
  ],
};
