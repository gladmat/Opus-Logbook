/**
 * Lymphoedema & Lymphatic Surgery Module — Type Definitions
 *
 * Structured assessment data for lymphatic surgery cases:
 * - LymphaticAssessment (inline on DiagnosisGroup)
 * - LVAOperativeDetails (per-procedure)
 * - VLNTSpecificDetails (extends free flap)
 * - SAPLOperativeDetails (per-procedure)
 * - LymphaticFollowUp + LYMQOL scores
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STAGING
// ═══════════════════════════════════════════════════════════════════════════════

export type ISLStage = "0" | "I" | "II_early" | "II_late" | "III";
export type ISLSeverity = "mild" | "moderate" | "severe";
export type MDAndersonICGStage = "0" | "1" | "2" | "3" | "4" | "5";
export type ChengGrade = "0" | "I" | "II" | "III" | "IV";

export const ISL_STAGE_LABELS: Record<ISLStage, string> = {
  "0": "Stage 0 — Subclinical",
  I: "Stage I — Reversible",
  II_early: "Stage II Early — Persistent, pitting",
  II_late: "Stage II Late — Fibrotic, non-pitting",
  III: "Stage III — Elephantiasis",
};

export const ISL_SEVERITY_LABELS: Record<ISLSeverity, string> = {
  mild: "Mild (<20% excess volume)",
  moderate: "Moderate (20–40%)",
  severe: "Severe (>40%)",
};

export const MD_ANDERSON_ICG_LABELS: Record<MDAndersonICGStage, string> = {
  "0": "Stage 0 — No dermal backflow",
  "1": "Stage 1 — Many patent lymphatics, minimal backflow",
  "2": "Stage 2 — Moderate patent lymphatics, segmental backflow",
  "3": "Stage 3 — Few patent lymphatics, extensive backflow",
  "4": "Stage 4 — Severe backflow (stardust pattern)",
  "5": "Stage 5 — Diffuse backflow, no patent lymphatics",
};

export const CHENG_GRADE_LABELS: Record<ChengGrade, string> = {
  "0": "Grade 0 — No clinical lymphoedema",
  I: "Grade I — Mild, reversible",
  II: "Grade II — Moderate, irreversible without fibrosis",
  III: "Grade III — Severe fibrosis with recurrent cellulitis",
  IV: "Grade IV — Elephantiasis",
};

// ═══════════════════════════════════════════════════════════════════════════════
// AFFECTED REGION
// ═══════════════════════════════════════════════════════════════════════════════

export type LymphoedemaRegion =
  | "upper_limb"
  | "lower_limb"
  | "breast_trunk"
  | "genital"
  | "face_neck"
  | "bilateral_lower"
  | "bilateral_upper";

export const LYMPHOEDEMA_REGION_LABELS: Record<LymphoedemaRegion, string> = {
  upper_limb: "Upper limb",
  lower_limb: "Lower limb",
  breast_trunk: "Breast / trunk",
  genital: "Genital",
  face_neck: "Face / neck",
  bilateral_lower: "Bilateral lower limbs",
  bilateral_upper: "Bilateral upper limbs",
};

// ═══════════════════════════════════════════════════════════════════════════════
// ICG LYMPHOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════════

export type ICGDevice =
  | "spy_stryker"
  | "pde_neo_ii"
  | "fluobeam"
  | "microscope_integrated"
  | "other";

export const ICG_DEVICE_LABELS: Record<ICGDevice, string> = {
  spy_stryker: "SPY (Stryker)",
  pde_neo_ii: "PDE-NEO II (Hamamatsu)",
  fluobeam: "Fluobeam (Fluoptics)",
  microscope_integrated: "Microscope-integrated",
  other: "Other",
};

export type ICGPattern =
  | "linear"
  | "splash"
  | "stardust"
  | "diffuse"
  | "no_flow";

export const ICG_PATTERN_LABELS: Record<ICGPattern, string> = {
  linear: "Linear — normal",
  splash: "Splash — mild backflow",
  stardust: "Stardust — moderate backflow",
  diffuse: "Diffuse — severe backflow",
  no_flow: "No flow",
};

export interface ICGInjectionSite {
  location: string; // e.g., "2nd web space dorsal hand"
  volumeMl?: number; // 0.05–0.2 mL typically
  pattern: ICGPattern;
}

export interface ICGLymphographyData {
  device?: ICGDevice;
  injectionSites: ICGInjectionSite[];
  yamamotoDBStage?: number; // 0–V for arm; equivalent for leg
  overallPattern?: ICGPattern;
  functionalVesselsIdentified?: number;
  skinMarkingsPlaced?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIOIMPEDANCE
// ═══════════════════════════════════════════════════════════════════════════════

export type BioimpedanceDevice = "sozo" | "u400" | "other";

export const BIOIMPEDANCE_DEVICE_LABELS: Record<BioimpedanceDevice, string> = {
  sozo: "SOZO (ImpediMed)",
  u400: "U400 (ImpediMed)",
  other: "Other",
};

export interface BioimpedanceData {
  device?: BioimpedanceDevice;
  baselineLDex?: number;
  currentLDex?: number;
  changeFromBaseline?: number; // auto-calculated
  date?: string; // ISO date
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMB MEASUREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export type MeasurementMethod =
  | "tape_circumference"
  | "perometry"
  | "water_displacement"
  | "3d_scan";

export const MEASUREMENT_METHOD_LABELS: Record<MeasurementMethod, string> = {
  tape_circumference: "Tape circumference",
  perometry: "Perometry",
  water_displacement: "Water displacement",
  "3d_scan": "3D scan",
};

export interface CircumferenceMeasurement {
  distanceFromReference: number; // cm from wrist/ankle
  circumferenceCm: number;
}

export interface LimbMeasurementData {
  method: MeasurementMethod;
  affectedLimb: CircumferenceMeasurement[];
  contralateralLimb: CircumferenceMeasurement[];
  excessVolumeMl?: number; // auto-calculated
  excessVolumePercent?: number; // auto-calculated
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

export type OnsetType = "acute" | "gradual";
export type CDTResponse = "complete" | "partial" | "none";
export type CompressionClass = "I" | "II" | "III";
export type CompressionKnit = "flat_knit" | "round_knit";
export type CancerSurgeryType =
  | "alnd"
  | "slnb"
  | "pelvic_dissection"
  | "inguinal_dissection"
  | "neck_dissection"
  | "other";

export interface LymphoedemaHistory {
  durationMonths?: number;
  onsetType?: OnsetType;
  priorCDT?: boolean;
  cdtCourses?: number;
  cdtResponse?: CDTResponse;
  compressionGarment?: {
    class?: CompressionClass;
    type?: CompressionKnit;
    hoursPerDay?: number;
  };
  cellulitisEpisodesPerYear?: number;
  priorHospitalisationCellulitis?: boolean;
  bmi?: number;
  cancerType?: string;
  surgeryType?: CancerSurgeryType;
  nodesRemoved?: number;
  priorRadiation?: boolean;
  priorChemotherapy?: boolean;
  taxaneUse?: boolean;
  stemmerSign?: boolean;
  pittingPresent?: boolean;
  priorLymphaticSurgery?: boolean;
  priorLymphaticSurgeryDetails?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LYMPHATIC ASSESSMENT (stored on DiagnosisGroup)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LymphaticAssessment {
  // ── Staging ──
  islStage?: ISLStage;
  islSeverity?: ISLSeverity;
  mdAndersonICGStage?: MDAndersonICGStage;
  chengGrade?: ChengGrade;

  // ── ICG Lymphography ──
  icgLymphography?: ICGLymphographyData;

  // ── Bioimpedance ──
  bioimpedance?: BioimpedanceData;

  // ── Limb Measurements ──
  limbMeasurements?: LimbMeasurementData;

  // ── Clinical History ──
  clinicalHistory?: LymphoedemaHistory;

  // ── Affected Limb ──
  affectedSide?: "left" | "right" | "bilateral";
  affectedRegion?: LymphoedemaRegion;

  // ── Follow-Up (Phase 6) ──
  followUp?: LymphaticFollowUp;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LVA OPERATIVE DETAILS (stored on CaseProcedure)
// ═══════════════════════════════════════════════════════════════════════════════

export type NECSTGrade = "normal" | "ectasis" | "contraction" | "sclerosis";

export const NECST_LABELS: Record<NECSTGrade, string> = {
  normal: "Normal — translucent, thin-walled",
  ectasis: "Ectasis — dilated, thin-walled",
  contraction: "Contraction — cloudy, thick, narrowed",
  sclerosis: "Sclerosis — opaque, fibrotic, no lumen",
};

export type LVATechnique =
  | "end_to_end"
  | "end_to_side"
  | "side_to_end"
  | "side_to_side"
  | "intussusception"
  | "octopus"
  | "lambda"
  | "pi"
  | "parachute"
  | "ola"
  | "ivas"
  | "sequential"
  | "other";

export const LVA_TECHNIQUE_LABELS: Record<LVATechnique, string> = {
  end_to_end: "End-to-end (E-E)",
  end_to_side: "End-to-side (E-S)",
  side_to_end: "Side-to-end (S-E)",
  side_to_side: "Side-to-side (S-S)",
  intussusception: "Intussusception",
  octopus: "Octopus (multi-lymphatic → single vein)",
  lambda: "Lambda (λ) — two lymphatics to one venule",
  pi: "Pi (π) — two E-S on same vein",
  parachute: "Parachute (all sutures placed before seating)",
  ola: "Overlapping Lockup (OLA)",
  ivas: "IVaS (Intravascular Stenting)",
  sequential: "Sequential (multiple LVAs on one venule)",
  other: "Other",
};

export type LVAAnastomosisRegion =
  | "wrist"
  | "forearm"
  | "elbow"
  | "arm"
  | "ankle"
  | "calf"
  | "knee"
  | "thigh"
  | "cervical"
  | "other";

export const LVA_REGION_LABELS: Record<LVAAnastomosisRegion, string> = {
  wrist: "Wrist",
  forearm: "Forearm",
  elbow: "Elbow",
  arm: "Upper arm",
  ankle: "Ankle",
  calf: "Calf",
  knee: "Knee",
  thigh: "Thigh",
  cervical: "Cervical",
  other: "Other",
};

export type SutureMaterial = "11-0_nylon" | "12-0_nylon" | "12-0s_nylon";

export const SUTURE_MATERIAL_LABELS: Record<SutureMaterial, string> = {
  "11-0_nylon": "11-0 Nylon",
  "12-0_nylon": "12-0 Nylon",
  "12-0s_nylon": "12-0S Nylon",
};

export type PatencyConfirmation =
  | "icg_transit"
  | "milking_test"
  | "blue_dye"
  | "none";

export const PATENCY_CONFIRMATION_LABELS: Record<PatencyConfirmation, string> =
  {
    icg_transit: "ICG transit",
    milking_test: "Milking test",
    blue_dye: "Blue dye",
    none: "None",
  };

export interface LVAAnastomosis {
  id: string; // UUID
  site: string; // Anatomical description
  region: LVAAnastomosisRegion;
  lymphaticQuality?: NECSTGrade;
  lymphaticDiameterMm?: number; // 0.2–0.8 typical
  venuleDiameterMm?: number; // 0.3–0.8 typical
  technique?: LVATechnique;
  sutureMaterial?: SutureMaterial;
  sutureCount?: number; // 3–6 typical
  patencyConfirmation?: PatencyConfirmation;
}

export type RoboticAssistance = "none" | "symani" | "musa" | "other";

export const ROBOTIC_ASSISTANCE_LABELS: Record<RoboticAssistance, string> = {
  none: "None",
  symani: "Symani (MMI)",
  musa: "MUSA (Microsure)",
  other: "Other",
};

export interface LVAOperativeDetails {
  anastomoses: LVAAnastomosis[];
  totalAnastomosisCount?: number; // auto-count
  anaesthesiaType?: "general" | "regional" | "local_sedation" | "local";
  microscopeModel?: string;
  magnificationRange?: string; // e.g., "12–30x"
  icgIntraoperativeUse?: boolean;
  icgDose?: string;
  roboticAssistance?: RoboticAssistance;
  operativeTimeMinutes?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VLNT SPECIFIC DETAILS (extends FreeFlapDetails on CaseProcedure)
// ═══════════════════════════════════════════════════════════════════════════════

export type VLNTDonorSite =
  | "submental"
  | "supraclavicular"
  | "lateral_thoracic"
  | "thoracodorsal"
  | "inguinal"
  | "gastroepiploic"
  | "jejunal_mesenteric"
  | "appendicular"
  | "other";

export const VLNT_DONOR_SITE_LABELS: Record<VLNTDonorSite, string> = {
  submental: "Submental (Level Ia/Ib)",
  supraclavicular: "Supraclavicular (Level Vb)",
  lateral_thoracic: "Lateral thoracic",
  thoracodorsal: "Thoracodorsal",
  inguinal: "Inguinal (SCIP-based)",
  gastroepiploic: "Gastroepiploic / omental",
  jejunal_mesenteric: "Jejunal mesenteric",
  appendicular: "Appendicular",
  other: "Other",
};

export type VLNTRecipientSite =
  | "axilla"
  | "wrist"
  | "elbow"
  | "groin"
  | "ankle"
  | "knee"
  | "cervical"
  | "other";

export const VLNT_RECIPIENT_SITE_LABELS: Record<VLNTRecipientSite, string> = {
  axilla: "Axilla",
  wrist: "Wrist",
  elbow: "Elbow",
  groin: "Groin",
  ankle: "Ankle",
  knee: "Knee",
  cervical: "Cervical",
  other: "Other",
};

export type ReverseMapTechnique =
  | "tc99m_icg"
  | "icg_only"
  | "blue_dye"
  | "other";

export const REVERSE_MAP_TECHNIQUE_LABELS: Record<ReverseMapTechnique, string> =
  {
    tc99m_icg: "Tc-99m + ICG",
    icg_only: "ICG only",
    blue_dye: "Blue dye",
    other: "Other",
  };

export interface VLNTSpecificDetails {
  donorSite?: VLNTDonorSite;
  nodeCount?: number;
  reverseLymphaticMapping?: boolean;
  reverseMapTechnique?: ReverseMapTechnique;
  recipientSite?: VLNTRecipientSite;
  insetTechnique?: string;
  simultaneousLVA?: boolean;
  flapDesignDimensions?: string; // e.g., "6x4 cm"
  drainPlaced?: boolean;
  donorSiteClosure?: "primary" | "skin_graft" | "local_flap";
}

export const VLNT_DONOR_PEDICLE_MAP: Record<
  VLNTDonorSite,
  { artery: string; vein: string }
> = {
  submental: { artery: "Submental artery", vein: "Submental vein" },
  supraclavicular: {
    artery: "Transverse cervical artery",
    vein: "Transverse cervical vein",
  },
  lateral_thoracic: {
    artery: "Lateral thoracic artery",
    vein: "Lateral thoracic vein",
  },
  thoracodorsal: {
    artery: "Thoracodorsal artery",
    vein: "Thoracodorsal vein",
  },
  inguinal: { artery: "SCIA / SIEA", vein: "SCIV / SIEV" },
  gastroepiploic: {
    artery: "Right gastroepiploic artery",
    vein: "Right gastroepiploic vein",
  },
  jejunal_mesenteric: { artery: "SMA branch", vein: "SMV branch" },
  appendicular: {
    artery: "Appendicular artery",
    vein: "Appendicular vein",
  },
  other: { artery: "", vein: "" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SAPL OPERATIVE DETAILS (stored on CaseProcedure)
// ═══════════════════════════════════════════════════════════════════════════════

export type SAPLTechnique = "power_assisted" | "manual" | "other";

export const SAPL_TECHNIQUE_LABELS: Record<SAPLTechnique, string> = {
  power_assisted: "Power-assisted",
  manual: "Manual",
  other: "Other",
};

export interface SAPLOperativeDetails {
  tumescentVolumeMl?: number;
  tourniquetUsed?: boolean;
  tourniquetLocation?: string;
  tourniquetTimeMinutes?: number;
  totalAspirateMl?: number;
  aspirateFatPercent?: number;
  accessIncisionCount?: number;
  cannulaSizeMm?: number;
  technique?: SAPLTechnique;
  areasZonesTreated?: string[];
  garmentAppliedIntraop?: boolean;
  garmentClass?: CompressionClass;
  estimatedBloodLossMl?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOLLOW-UP & LYMQOL
// ═══════════════════════════════════════════════════════════════════════════════

export type FollowUpTimepoint =
  | "1_month"
  | "3_months"
  | "6_months"
  | "12_months"
  | "annual";

export const FOLLOW_UP_TIMEPOINT_LABELS: Record<FollowUpTimepoint, string> = {
  "1_month": "1 month",
  "3_months": "3 months",
  "6_months": "6 months",
  "12_months": "12 months",
  annual: "Annual",
};

export type LYMQOLVersion = "arm" | "leg";

export interface LYMQOLScore {
  version: LYMQOLVersion;
  functionDomain: number; // 1–4 (higher = worse)
  appearanceDomain: number;
  symptomsDomain: number;
  moodDomain: number;
  overallQoL: number; // 0–10 NRS (higher = better)
}

export type CompressionStatus =
  | "unchanged"
  | "reduced_class"
  | "reduced_hours"
  | "discontinued";

export interface LymphaticFollowUp {
  timepoint: FollowUpTimepoint;
  date: string; // ISO
  circumferences?: LimbMeasurementData;
  lDex?: BioimpedanceData;
  icgStage?: MDAndersonICGStage;
  icgPattern?: ICGPattern;
  lymqolScore?: LYMQOLScore;
  cellulitisEpisodesSinceLastVisit?: number;
  compressionStatus?: CompressionStatus;
  complications?: string[];
}
