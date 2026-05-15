/**
 * Peripheral Nerve Module — Configuration & Activation Logic
 *
 * Activation is diagnosis-driven (not specialty-gated), matching the
 * skin cancer pattern. The module activates when a diagnosis has
 * `peripheralNerveModule: true` on its picklist entry.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type {
  PeripheralNerveAssessmentData,
  BrachialPlexusAssessmentData,
  BPRoot,
  BPInjuryType,
  BPInjuryPattern,
  BPLevelInjury,
  NeuromaAssessmentData,
  NerveIdentifier,
  MRCMotorGrade,
  BMRCSensoryGrade,
} from "@/types/peripheralNerve";

// ══════════════════════════════════════════════════
// ACTIVATION FUNCTIONS
// ══════════════════════════════════════════════════

/** Returns true when the diagnosis activates the peripheral nerve assessment module */
export function isPeripheralNerveDiagnosis(
  diagnosis: DiagnosisPicklistEntry | undefined,
): boolean {
  return diagnosis?.peripheralNerveModule === true;
}

/** Returns true when the diagnosis activates the brachial plexus sub-module */
export function isBrachialPlexusDiagnosis(
  diagnosis: DiagnosisPicklistEntry | undefined,
): boolean {
  return diagnosis?.brachialPlexusModule === true;
}

/** Returns true when the diagnosis activates the neuroma sub-module */
export function isNeuromaDiagnosis(
  diagnosis: DiagnosisPicklistEntry | undefined,
): boolean {
  return diagnosis?.neuromaModule === true;
}

/** Returns true when the diagnosis activates the nerve tumour minimal assessment */
export function isNerveTumourDiagnosis(
  diagnosis: DiagnosisPicklistEntry | undefined,
): boolean {
  return diagnosis?.nerveTumourModule === true;
}

// ══════════════════════════════════════════════════
// BODY REGION MAPPING
// ══════════════════════════════════════════════════

export type BodyRegion =
  | "upper_extremity"
  | "lower_extremity"
  | "brachial_plexus"
  | "facial"
  | "compression"
  | "nerve_tumour"
  | "any";

/** Map diagnosis subcategory → body region for context-aware nerve filtering */
export function getBodyRegion(
  diagnosis: DiagnosisPicklistEntry | undefined,
): BodyRegion {
  if (!diagnosis) return "any";
  if (diagnosis.nerveTumourModule) return "nerve_tumour";
  if (diagnosis.brachialPlexusModule) return "brachial_plexus";

  switch (diagnosis.subcategory) {
    case "Upper Extremity Nerve Injury":
      return "upper_extremity";
    case "Lower Extremity Nerve Injury":
      return "lower_extremity";
    case "Compression Neuropathies":
      return "compression";
    case "Facial Nerve":
      return "facial";
    case "Neuroma":
    case "Nerve Tumours":
      return "any"; // neuroma/tumour can be on any nerve
    default:
      return "any";
  }
}

// ══════════════════════════════════════════════════
// DIAGNOSIS → NERVE AUTO-SELECT
// ══════════════════════════════════════════════════

/** When a diagnosis maps to a specific nerve, auto-populate on mount */
export const DIAGNOSIS_TO_NERVE: Partial<Record<string, NerveIdentifier>> = {
  // Upper extremity
  pn_dx_median_nerve_injury: "median",
  pn_dx_ulnar_nerve_injury: "ulnar",
  pn_dx_radial_nerve_injury: "radial",
  pn_dx_long_thoracic_palsy: "long_thoracic",
  pn_dx_spinal_accessory_injury: "spinal_accessory",

  // Lower extremity
  pn_dx_common_peroneal_injury: "common_peroneal",
  pn_dx_sciatic_injury: "sciatic",
  pn_dx_femoral_nerve_injury: "femoral",
  pn_dx_obturator_neuropathy: "obturator",
  pn_dx_pudendal_neuropathy: "pudendal",

  // Compression neuropathies
  pn_dx_ain_syndrome: "anterior_interosseous",
  pn_dx_pin_syndrome: "posterior_interosseous",
  pn_dx_radial_tunnel_syndrome: "radial",
  pn_dx_pronator_syndrome: "median",
  pn_dx_guyon_canal_syndrome: "ulnar",
  pn_dx_suprascapular_neuropathy: "suprascapular",
  pn_dx_common_peroneal_compression: "common_peroneal",
  pn_dx_tarsal_tunnel: "tibial",
  pn_dx_meralgia_paresthetica: "lateral_femoral_cutaneous",
  pn_dx_morton_neuroma: "interdigital",
};

// ══════════════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════════════

/** Empty assessment with no populated fields */
export function getDefaultPeripheralNerveAssessment(): PeripheralNerveAssessmentData {
  return {};
}

/** Default brachial plexus roots — all unknown */
export function getDefaultBrachialPlexusRoots(): PeripheralNerveAssessmentData {
  return {
    brachialPlexus: {
      roots: {},
    },
  };
}

/** Default brachial plexus assessment — empty roots */
export function getDefaultBrachialPlexusAssessment(): BrachialPlexusAssessmentData {
  return { roots: {} };
}

/** Default neuroma assessment for a given aetiology */
export function getDefaultNeuromaAssessment(
  aetiology: NeuromaAssessmentData["aetiology"],
): NeuromaAssessmentData {
  return { aetiology };
}

// ══════════════════════════════════════════════════
// BRACHIAL PLEXUS — INJURY PATTERN HELPERS
// ══════════════════════════════════════════════════

/** Ordered root keys for iteration */
export const BP_ROOT_ORDER: readonly BPRoot[] = [
  "C5",
  "C6",
  "C7",
  "C8",
  "T1",
] as const;

/** Injury type cycle order for diagram tap interaction */
const INJURY_CYCLE: readonly BPInjuryType[] = [
  "unknown",
  "intact",
  "stretch",
  "rupture",
  "avulsion",
] as const;

/** Cycle to the next injury type (tap-to-cycle in diagram) */
export function cycleInjuryType(current?: BPInjuryType): BPInjuryType {
  const idx = current ? INJURY_CYCLE.indexOf(current) : -1;
  const next = INJURY_CYCLE[(idx + 1) % INJURY_CYCLE.length];
  return next ?? "unknown";
}

/** Build a BPLevelInjury with the given injury type */
function rootInjury(injuryType: BPInjuryType): BPLevelInjury {
  return { injuryType };
}

/**
 * Apply a named injury pattern to auto-fill root injuries.
 * The "zero-tap happy path" for straightforward injuries.
 */
export function applyInjuryPattern(
  pattern: BPInjuryPattern,
): Partial<Record<BPRoot, BPLevelInjury>> {
  switch (pattern) {
    case "upper_c5_c6":
      return {
        C5: rootInjury("rupture"),
        C6: rootInjury("rupture"),
        C7: rootInjury("intact"),
        C8: rootInjury("intact"),
        T1: rootInjury("intact"),
      };
    case "extended_upper_c5_c7":
      return {
        C5: rootInjury("rupture"),
        C6: rootInjury("rupture"),
        C7: rootInjury("rupture"),
        C8: rootInjury("intact"),
        T1: rootInjury("intact"),
      };
    case "complete_c5_t1":
      return {
        C5: rootInjury("avulsion"),
        C6: rootInjury("rupture"),
        C7: rootInjury("rupture"),
        C8: rootInjury("rupture"),
        T1: rootInjury("avulsion"),
      };
    case "lower_c8_t1":
      return {
        C5: rootInjury("intact"),
        C6: rootInjury("intact"),
        C7: rootInjury("intact"),
        C8: rootInjury("rupture"),
        T1: rootInjury("rupture"),
      };
    case "isolated_root":
    case "other":
      // No auto-fill — surgeon sets roots manually
      return {};
  }
}

/**
 * Derive the closest matching injury pattern from root injuries.
 * Returns undefined if no standard pattern matches.
 */
export function deriveInjuryPattern(
  roots: Partial<Record<BPRoot, BPLevelInjury>>,
): BPInjuryPattern | undefined {
  const injured = (root: BPRoot) => {
    const type = roots[root]?.injuryType;
    return type && type !== "intact" && type !== "unknown";
  };
  const intact = (root: BPRoot) => {
    const type = roots[root]?.injuryType;
    return type === "intact";
  };

  const c5i = injured("C5");
  const c6i = injured("C6");
  const c7i = injured("C7");
  const c8i = injured("C8");
  const t1i = injured("T1");

  if (c5i && c6i && c7i && c8i && t1i) return "complete_c5_t1";
  if (c5i && c6i && c7i && !c8i && !t1i) return "extended_upper_c5_c7";
  if (c5i && c6i && !c7i && !c8i && !t1i) return "upper_c5_c6";
  if (!c5i && !c6i && !c7i && c8i && t1i) return "lower_c8_t1";

  // Check for a single injured root = isolated
  const injuredCount = [c5i, c6i, c7i, c8i, t1i].filter(Boolean).length;
  if (injuredCount === 1) return "isolated_root";

  return undefined;
}

/** Human-readable label for a derived injury pattern */
export function deriveInjuryPatternLabel(
  roots: Partial<Record<BPRoot, BPLevelInjury>>,
): string | undefined {
  const pattern = deriveInjuryPattern(roots);
  if (!pattern) return undefined;

  const labels: Record<BPInjuryPattern, string> = {
    upper_c5_c6: "Upper (C5\u2013C6, Erb)",
    extended_upper_c5_c7: "Extended upper (C5\u2013C7)",
    complete_c5_t1: "Complete (C5\u2013T1)",
    lower_c8_t1: "Lower (C8\u2013T1, Klumpke)",
    isolated_root: "Isolated root",
    other: "Other / atypical",
  };
  return labels[pattern];
}

// ══════════════════════════════════════════════════
// BRACHIAL PLEXUS — DISPLAY LABELS
// ══════════════════════════════════════════════════

export const BP_APPROACH_LABELS: Record<
  NonNullable<BrachialPlexusAssessmentData["approach"]>,
  string
> = {
  supraclavicular: "Supraclavicular",
  infraclavicular: "Infraclavicular",
  combined: "Combined",
  posterior_subscapular: "Posterior subscapular",
};

export const BP_PROCEDURE_TYPE_LABELS: Record<
  NonNullable<
    NonNullable<
      BrachialPlexusAssessmentData["procedures"]
    >[number]["procedureType"]
  >,
  string
> = {
  neurolysis: "Neurolysis",
  nerve_graft: "Nerve graft",
  nerve_transfer: "Nerve transfer",
  ffmt: "Free functional muscle transfer",
  other: "Other",
};

export const FFMT_DONOR_MUSCLE_LABELS: Record<
  NonNullable<import("@/types/peripheralNerve").FFMTDetails["donorMuscle"]>,
  string
> = {
  gracilis: "Gracilis",
  latissimus_dorsi: "Latissimus dorsi",
  other: "Other",
};

export const FFMT_TARGET_LABELS: Record<
  NonNullable<import("@/types/peripheralNerve").FFMTDetails["targetFunction"]>,
  string
> = {
  elbow_flexion: "Elbow flexion",
  finger_flexion: "Finger/wrist flexion",
  elbow_extension: "Elbow extension",
  other: "Other",
};

// ══════════════════════════════════════════════════
// BRACHIAL PLEXUS — ANATOMY MAPPING (for diagram)
// ══════════════════════════════════════════════════

/** Which roots contribute to each trunk */
export const TRUNK_ROOT_MAP: Record<
  import("@/types/peripheralNerve").BPTrunk,
  BPRoot[]
> = {
  upper: ["C5", "C6"],
  middle: ["C7"],
  lower: ["C8", "T1"],
};

/** Which trunks contribute to each cord */
export const CORD_TRUNK_MAP: Record<
  import("@/types/peripheralNerve").BPCord,
  import("@/types/peripheralNerve").BPTrunk[]
> = {
  lateral: ["upper", "middle"],
  posterior: ["upper", "middle", "lower"],
  medial: ["lower"],
};

/** Which cords contribute to each terminal branch */
export const TERMINAL_CORD_MAP: Record<
  import("@/types/peripheralNerve").BPTerminalBranch,
  import("@/types/peripheralNerve").BPCord[]
> = {
  musculocutaneous: ["lateral"],
  axillary: ["posterior"],
  radial: ["posterior"],
  median: ["lateral", "medial"],
  ulnar: ["medial"],
};

export const BP_TRUNK_LABELS: Record<
  import("@/types/peripheralNerve").BPTrunk,
  string
> = {
  upper: "Upper",
  middle: "Middle",
  lower: "Lower",
};

export const BP_CORD_LABELS: Record<
  import("@/types/peripheralNerve").BPCord,
  string
> = {
  lateral: "Lateral",
  posterior: "Posterior",
  medial: "Medial",
};

export const BP_TERMINAL_LABELS: Record<
  import("@/types/peripheralNerve").BPTerminalBranch,
  string
> = {
  musculocutaneous: "MCN",
  axillary: "Axillary",
  radial: "Radial",
  median: "Median",
  ulnar: "Ulnar",
};

// ══════════════════════════════════════════════════
// NEUROMA — CLEANUP HELPERS
// ══════════════════════════════════════════════════

export const NEUROMA_AETIOLOGY_LABELS: Record<
  NeuromaAssessmentData["aetiology"],
  string
> = {
  post_amputation: "Post-amputation",
  traumatic: "Post-traumatic",
  iatrogenic: "Iatrogenic",
};

export const NEUROMA_MORPHOLOGY_LABELS: Record<
  NonNullable<NeuromaAssessmentData["morphology"]>,
  string
> = {
  bulbous: "Bulbous",
  fusiform: "Fusiform",
  atypical: "Atypical",
};

export const AMPUTATION_CAUSE_LABELS: Record<
  NonNullable<NeuromaAssessmentData["amputationCause"]>,
  string
> = {
  trauma: "Trauma",
  vascular: "Vascular",
  oncologic: "Oncologic",
  infection: "Infection",
  congenital: "Congenital",
};

export const STUMP_POSITION_LABELS: Record<
  NonNullable<NeuromaAssessmentData["neuromaPositionInStump"]>,
  string
> = {
  anterior: "Anterior",
  posterior: "Posterior",
  medial: "Medial",
  lateral: "Lateral",
};

export const CAUSATIVE_PROCEDURE_LABELS: Record<
  NonNullable<NeuromaAssessmentData["causativeProcedure"]>,
  string
> = {
  arthroplasty: "Arthroplasty",
  hernia_repair: "Hernia repair",
  mastectomy: "Mastectomy",
  nerve_biopsy: "Nerve biopsy",
  amputation: "Amputation",
  other: "Other",
};

export const RPNI_MUSCLE_SOURCE_LABELS: Record<
  NonNullable<NeuromaAssessmentData["rpniMuscleSource"]>,
  string
> = {
  vastus_lateralis: "Vastus lateralis",
  gracilis: "Gracilis",
  brachioradialis: "Brachioradialis",
  other: "Other",
};

export const RPNI_VARIANT_LABELS: Record<
  NonNullable<NeuromaAssessmentData["rpniVariant"]>,
  string
> = {
  standard: "Standard RPNI",
  ds_rpni: "DS-RPNI (dermal sensory)",
  c_rpni: "C-RPNI (composite)",
  mc_rpni: "MC-RPNI (muscle cuff)",
};

/**
 * Clean neuroma data when aetiology changes.
 * Preserves shared fields, clears aetiology-specific fields from previous selection.
 */
export function cleanNeuromaForAetiologyChange(
  current: NeuromaAssessmentData,
  newAetiology: NeuromaAssessmentData["aetiology"],
): NeuromaAssessmentData {
  // Shared fields preserved across all aetiologies
  const shared: NeuromaAssessmentData = {
    aetiology: newAetiology,
    morphology: current.morphology,
    neuromaSizeMm: current.neuromaSizeMm,
    technique: current.technique,
    tmrRecipientMotorNerve: current.tmrRecipientMotorNerve,
    tmrTargetMuscle: current.tmrTargetMuscle,
    rpniCount: current.rpniCount,
    rpniMuscleSource: current.rpniMuscleSource,
    rpniGraftDimensions: current.rpniGraftDimensions,
    rpniVariant: current.rpniVariant,
  };

  // Carry aetiology-specific fields only when matching
  if (newAetiology === "post_amputation") {
    return {
      ...shared,
      amputationLevel: current.amputationLevel,
      amputationCause: current.amputationCause,
      timeSinceAmputationMonths: current.timeSinceAmputationMonths,
      prostheticUse: current.prostheticUse,
      prostheticHoursPerDay: current.prostheticHoursPerDay,
      phantomLimbPainNRS: current.phantomLimbPainNRS,
      residualLimbPainNRS: current.residualLimbPainNRS,
      neuromaPositionInStump: current.neuromaPositionInStump,
      proximityToWeightBearing: current.proximityToWeightBearing,
    };
  }

  if (newAetiology === "traumatic") {
    return {
      ...shared,
      priorNerveRepairAttempted: current.priorNerveRepairAttempted,
    };
  }

  if (newAetiology === "iatrogenic") {
    return {
      ...shared,
      causativeProcedure: current.causativeProcedure,
    };
  }

  return shared;
}

// ══════════════════════════════════════════════════
// OUTCOME TRACKING — NERVE-TO-MUSCLE MAPPING
// ══════════════════════════════════════════════════

/** Target muscles to assess per nerve at follow-up */
export const NERVE_TARGET_MUSCLES: Partial<
  Record<NerveIdentifier, { muscle: string }[]>
> = {
  median: [
    { muscle: "APB (abductor pollicis brevis)" },
    { muscle: "FPL (flexor pollicis longus)" },
    { muscle: "FDS (flexor digitorum superficialis)" },
  ],
  ulnar: [
    { muscle: "FDI (first dorsal interosseous)" },
    { muscle: "ADM (abductor digiti minimi)" },
  ],
  radial: [
    { muscle: "ECRL (extensor carpi radialis longus)" },
    { muscle: "EDC (extensor digitorum communis)" },
    { muscle: "EPL (extensor pollicis longus)" },
  ],
  musculocutaneous: [{ muscle: "Biceps brachii" }, { muscle: "Brachialis" }],
  axillary: [{ muscle: "Deltoid" }],
  anterior_interosseous: [
    { muscle: "FPL (flexor pollicis longus)" },
    { muscle: "FDP I–II (flexor digitorum profundus)" },
    { muscle: "PQ (pronator quadratus)" },
  ],
  posterior_interosseous: [
    { muscle: "EDC (extensor digitorum communis)" },
    { muscle: "ECU (extensor carpi ulnaris)" },
    { muscle: "EPL (extensor pollicis longus)" },
  ],
  common_peroneal: [
    { muscle: "TA (tibialis anterior)" },
    { muscle: "EHL (extensor hallucis longus)" },
    { muscle: "Peronei (longus/brevis)" },
  ],
  deep_peroneal: [
    { muscle: "TA (tibialis anterior)" },
    { muscle: "EHL (extensor hallucis longus)" },
  ],
  tibial: [
    { muscle: "Gastrocnemius" },
    { muscle: "FHL (flexor hallucis longus)" },
    { muscle: "FDL (flexor digitorum longus)" },
  ],
  femoral: [{ muscle: "Quadriceps femoris" }],
  sciatic: [
    { muscle: "Hamstrings" },
    { muscle: "TA (tibialis anterior)" },
    { muscle: "Gastrocnemius" },
  ],
  long_thoracic: [{ muscle: "Serratus anterior" }],
  spinal_accessory: [{ muscle: "Trapezius (upper/middle)" }],
  suprascapular: [{ muscle: "Supraspinatus" }, { muscle: "Infraspinatus" }],
};

/** Recommended follow-up intervals in months */
export const NERVE_OUTCOME_INTERVALS = [3, 6, 12, 18, 24] as const;

export const MRC_MOTOR_GRADE_LABELS: Record<MRCMotorGrade, string> = {
  M0: "M0 — No contraction",
  M1: "M1 — Flicker",
  M2: "M2 — Movement, gravity eliminated",
  M3: "M3 — Movement against gravity",
  M4_minus: "M4− — Against slight resistance",
  M4: "M4 — Against moderate resistance",
  M4_plus: "M4+ — Against strong resistance",
  M5: "M5 — Normal",
};

export const MRC_MOTOR_GRADE_SHORT: Record<MRCMotorGrade, string> = {
  M0: "M0",
  M1: "M1",
  M2: "M2",
  M3: "M3",
  M4_minus: "M4−",
  M4: "M4",
  M4_plus: "M4+",
  M5: "M5",
};

export const BMRC_SENSORY_GRADE_LABELS: Record<BMRCSensoryGrade, string> = {
  S0: "S0 — Anaesthesia",
  S1: "S1 — Deep cutaneous pain",
  S1_plus: "S1+ — Superficial pain",
  S2: "S2 — Some touch/pain",
  S2_plus: "S2+ — Pain + partial touch",
  S3: "S3 — Pain + touch, no over-response",
  S3_plus: "S3+ — Some 2PD recovery",
  S4: "S4 — Normal",
};

export const SWMT_RESULT_LABELS: Record<
  NonNullable<
    import("@/types/peripheralNerve").NerveOutcomeAssessment["swmtResult"]
  >,
  string
> = {
  normal: "Normal (green/2.83)",
  diminished_light_touch: "Diminished light touch (blue/3.61)",
  diminished_protective: "Diminished protective (purple/4.31)",
  loss_of_protective: "Loss of protective (red/4.56)",
  deep_pressure_only: "Deep pressure only (red-lined/6.65)",
  anaesthetic: "Anaesthetic (untestable)",
};
