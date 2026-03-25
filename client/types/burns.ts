/**
 * Burns Module Types
 *
 * Assessment-derived model for acute burns (mirrors HandTraumaAssessment):
 * single "Acute burn" diagnosis → BurnsAssessment captures mechanism, TBSA,
 * depth, regions, injury event → deriveBurnDiagnosis() resolves SNOMED code.
 *
 * Reconstructive burn diagnoses (contractures, scars) use standard
 * diagnosis-first flow — no BurnsAssessment.
 *
 * Three-tier TBSA documentation, procedure-specific operative data,
 * severity scoring, and deep episode integration.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BURN PHASE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Burn phase — derived from diagnosis ID, not stored on assessment.
 * Acute = burns_dx_acute; Reconstructive = all other burns_dx_* entries.
 */
export type BurnPhase = "acute" | "reconstructive";

export const BURN_PHASE_LABELS: Record<BurnPhase, string> = {
  acute: "Acute",
  reconstructive: "Reconstructive",
};

// ═══════════════════════════════════════════════════════════════════════════════
// BURN DEPTH
// ═══════════════════════════════════════════════════════════════════════════════

export type BurnDepth =
  | "superficial"
  | "superficial_partial"
  | "deep_partial"
  | "full_thickness"
  | "subdermal"
  | "mixed";

export const BURN_DEPTH_LABELS: Record<BurnDepth, string> = {
  superficial: "Superficial",
  superficial_partial: "Superficial Partial",
  deep_partial: "Deep Partial",
  full_thickness: "Full Thickness",
  subdermal: "Subdermal",
  mixed: "Mixed",
};

// ═══════════════════════════════════════════════════════════════════════════════
// TBSA REGIONS & RULE OF NINES
// ═══════════════════════════════════════════════════════════════════════════════

export type TBSARegion =
  | "head_neck"
  | "right_upper_limb"
  | "left_upper_limb"
  | "anterior_trunk"
  | "posterior_trunk"
  | "perineum"
  | "right_lower_limb"
  | "left_lower_limb";

export const TBSA_REGION_LABELS: Record<TBSARegion, string> = {
  head_neck: "Head & Neck",
  right_upper_limb: "R Upper Limb",
  left_upper_limb: "L Upper Limb",
  anterior_trunk: "Anterior Trunk",
  posterior_trunk: "Posterior Trunk",
  perineum: "Perineum",
  right_lower_limb: "R Lower Limb",
  left_lower_limb: "L Lower Limb",
};

/** Adult Rule of Nines — max % per region */
export const RULE_OF_NINES_ADULT: Record<TBSARegion, number> = {
  head_neck: 9,
  right_upper_limb: 9,
  left_upper_limb: 9,
  anterior_trunk: 18,
  posterior_trunk: 18,
  perineum: 1,
  right_lower_limb: 18,
  left_lower_limb: 18,
};

export const ALL_TBSA_REGIONS: TBSARegion[] = [
  "head_neck",
  "right_upper_limb",
  "left_upper_limb",
  "anterior_trunk",
  "posterior_trunk",
  "perineum",
  "right_lower_limb",
  "left_lower_limb",
];

// ═══════════════════════════════════════════════════════════════════════════════
// TBSA DATA (THREE-TIER)
// ═══════════════════════════════════════════════════════════════════════════════

/** Tier 2: Per-region breakdown */
export interface TBSARegionalEntry {
  region: TBSARegion;
  percentage: number;
  depth: BurnDepth;
  circumferential?: boolean;
}

/** Lund-Browder region IDs (19 half-body regions, left/right) */
export type LundBrowderRegion =
  | "half_head"
  | "half_neck"
  | "anterior_trunk"
  | "posterior_trunk"
  | "buttock"
  | "genitalia"
  | "upper_arm"
  | "lower_arm"
  | "hand"
  | "half_thigh"
  | "half_lower_leg"
  | "foot";

/** Tier 3: Lund-Browder entry */
export interface LundBrowderEntry {
  region: LundBrowderRegion;
  side: "left" | "right" | "midline";
  percentage: number;
  depth: BurnDepth;
}

/**
 * Age-adjusted percentages for Lund-Browder regions.
 * Key = region, value = record of age bracket → max percentage per half-body.
 */
export const LUND_BROWDER_AGE_ADJUSTMENT: Record<
  string,
  Record<string, number>
> = {
  half_head: {
    "0": 9.5,
    "1": 8.5,
    "5": 6.5,
    "10": 5.5,
    "15": 4.5,
    adult: 3.5,
  },
  half_thigh: {
    "0": 2.75,
    "1": 3.25,
    "5": 4.0,
    "10": 4.25,
    "15": 4.5,
    adult: 4.75,
  },
  half_lower_leg: {
    "0": 2.5,
    "1": 2.5,
    "5": 2.75,
    "10": 3.0,
    "15": 3.25,
    adult: 3.5,
  },
};

/** Three-tier TBSA data */
export interface TBSAData {
  // Tier 1: Quick entry
  totalTBSA?: number;
  predominantDepth?: BurnDepth;
  regionsAffected?: TBSARegion[];
  partialThicknessTBSA?: number;
  fullThicknessTBSA?: number;

  // Tier 2: Regional breakdown (optional)
  regionalBreakdown?: TBSARegionalEntry[];

  // Tier 3: Lund-Browder (optional, paediatric/complex)
  lundBrowder?: LundBrowderEntry[];
  lundBrowderPatientAgeYears?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BURN MECHANISM & INJURY EVENT
// ═══════════════════════════════════════════════════════════════════════════════

export type BurnMechanism =
  | "thermal"
  | "chemical"
  | "electrical"
  | "radiation"
  | "friction"
  | "cold";

export const BURN_MECHANISM_LABELS: Record<BurnMechanism, string> = {
  thermal: "Thermal",
  chemical: "Chemical",
  electrical: "Electrical",
  radiation: "Radiation",
  friction: "Friction",
  cold: "Cold / Frostbite",
};

export type BurnMechanismDetail =
  // thermal
  | "flame"
  | "scald"
  | "contact"
  | "flash"
  | "steam"
  // chemical
  | "acid"
  | "alkali"
  | "other_chemical"
  // electrical
  | "low_voltage"
  | "high_voltage"
  | "lightning"
  | "arc"
  // cold
  | "frostbite"
  | "hypothermia";

export const BURN_MECHANISM_DETAIL_LABELS: Record<BurnMechanismDetail, string> =
  {
    flame: "Flame",
    scald: "Scald",
    contact: "Contact",
    flash: "Flash",
    steam: "Steam",
    acid: "Acid",
    alkali: "Alkali",
    other_chemical: "Other Chemical",
    low_voltage: "Low Voltage (<1000V)",
    high_voltage: "High Voltage (≥1000V)",
    lightning: "Lightning",
    arc: "Arc",
    frostbite: "Frostbite",
    hypothermia: "Hypothermia",
  };

/** Mechanism → valid detail subtypes */
export const MECHANISM_DETAILS: Record<BurnMechanism, BurnMechanismDetail[]> = {
  thermal: ["flame", "scald", "contact", "flash", "steam"],
  chemical: ["acid", "alkali", "other_chemical"],
  electrical: ["low_voltage", "high_voltage", "lightning", "arc"],
  radiation: [],
  friction: [],
  cold: ["frostbite", "hypothermia"],
};

export type BurnIntent =
  | "accidental"
  | "self_harm"
  | "assault"
  | "undetermined"
  | "nai_suspected";

export const BURN_INTENT_LABELS: Record<BurnIntent, string> = {
  accidental: "Accidental",
  self_harm: "Self-Harm",
  assault: "Assault",
  undetermined: "Undetermined",
  nai_suspected: "NAI Suspected",
};

export type BurnPlaceOfInjury =
  | "home_kitchen"
  | "home_bathroom"
  | "home_other"
  | "workplace"
  | "public"
  | "vehicle"
  | "outdoor"
  | "other";

export const BURN_PLACE_LABELS: Record<BurnPlaceOfInjury, string> = {
  home_kitchen: "Home — Kitchen",
  home_bathroom: "Home — Bathroom",
  home_other: "Home — Other",
  workplace: "Workplace",
  public: "Public Place",
  vehicle: "Vehicle",
  outdoor: "Outdoor",
  other: "Other",
};

export type BurnReferralSource =
  | "self"
  | "gp"
  | "ed"
  | "other_hospital"
  | "ambulance";

export const BURN_REFERRAL_LABELS: Record<BurnReferralSource, string> = {
  self: "Self",
  gp: "GP",
  ed: "Emergency Department",
  other_hospital: "Other Hospital",
  ambulance: "Ambulance",
};

/** Injury event — captured once per episode on first acute case */
export interface BurnInjuryEvent {
  // === Tier 1 (mandatory) ===
  dateTimeOfInjury?: string;
  mechanism?: BurnMechanism;
  mechanismDetail?: BurnMechanismDetail;
  inhalationInjury?: boolean;

  // === Tier 2 (progressive disclosure) ===
  intent?: BurnIntent;
  placeOfInjury?: BurnPlaceOfInjury;
  firstAidGiven?: boolean;
  coolRunningWater?: boolean;
  coolingDurationMin?: number;
  circumferentialBurn?: boolean;
  referralSource?: BurnReferralSource;
  patientWeightKg?: number;

  // === Tier 3 (mechanism-specific) ===
  electricalDetails?: {
    voltage?: "low_lt1000" | "high_gte1000" | "lightning";
    currentPathway?: string;
    entryPoint?: string;
    exitPoint?: string;
  };
  chemicalDetails?: {
    agent?: string;
    acidOrAlkali?: "acid" | "alkali" | "other";
    exposureDurationMin?: number;
    decontaminationMethod?: string;
  };
  associatedInjuries?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY SCORES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BurnSeverityScores {
  revisedBaux?: number;
  absi?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BURNS ASSESSMENT DATA (TOP-LEVEL CONTAINER)
// ═══════════════════════════════════════════════════════════════════════════════

/** Stored on DiagnosisGroup.burnsAssessment — acute burns only */
export interface BurnsAssessmentData {
  tbsa?: TBSAData;
  injuryEvent?: BurnInjuryEvent;
  severityScores?: BurnSeverityScores;
  outcomes?: BurnOutcomeData;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVED BURN DIAGNOSIS
// ═══════════════════════════════════════════════════════════════════════════════

/** Derived from BurnsAssessment injury event data via deriveBurnDiagnosis() */
export interface DerivedBurnDiagnosis {
  snomedCtCode: string;
  snomedCtDisplay: string;
  displayName: string;
  /** Secondary diagnoses (e.g., inhalation injury alongside the primary burn) */
  secondaryDiagnoses?: Array<{
    snomedCtCode: string;
    snomedCtDisplay: string;
    displayName: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURE-SPECIFIC DATA (BURN)
// ═══════════════════════════════════════════════════════════════════════════════

export type GraftType =
  | "stsg_sheet"
  | "stsg_meshed"
  | "ftsg"
  | "meek"
  | "cea"
  | "recell";

export const GRAFT_TYPE_LABELS: Record<GraftType, string> = {
  stsg_sheet: "STSG — Sheet",
  stsg_meshed: "STSG — Meshed",
  ftsg: "FTSG",
  meek: "Meek Micrografting",
  cea: "CEA",
  recell: "ReCell",
};

export type GraftDonorSite =
  | "thigh_anterior"
  | "thigh_lateral"
  | "thigh_posterior"
  | "scalp"
  | "buttock"
  | "abdomen"
  | "back"
  | "arm_upper"
  | "arm_lower"
  | "groin"
  | "other";

export const GRAFT_DONOR_LABELS: Record<GraftDonorSite, string> = {
  thigh_anterior: "Thigh (Anterior)",
  thigh_lateral: "Thigh (Lateral)",
  thigh_posterior: "Thigh (Posterior)",
  scalp: "Scalp",
  buttock: "Buttock",
  abdomen: "Abdomen",
  back: "Back",
  arm_upper: "Upper Arm",
  arm_lower: "Lower Arm",
  groin: "Groin",
  other: "Other",
};

export type MeshRatio =
  | "1:1"
  | "1:1.5"
  | "1:3"
  | "1:4"
  | "1:6"
  | "unmeshed";

export const MESH_RATIO_LABELS: Record<MeshRatio, string> = {
  "1:1": "1:1",
  "1:1.5": "1:1.5",
  "1:3": "1:3",
  "1:4": "1:4",
  "1:6": "1:6",
  unmeshed: "Unmeshed",
};

export type GraftFixation =
  | "staples"
  | "sutures"
  | "fibrin_glue"
  | "npwt"
  | "bolster"
  | "steristrips";

export const GRAFT_FIXATION_LABELS: Record<GraftFixation, string> = {
  staples: "Staples",
  sutures: "Sutures",
  fibrin_glue: "Fibrin Glue",
  npwt: "NPWT",
  bolster: "Bolster",
  steristrips: "Steristrips",
};

export type DermalSubstituteProduct =
  | "integra_bilayer"
  | "integra_thin"
  | "matriderm"
  | "btm_novosorb"
  | "alloderm"
  | "pelnac"
  | "other";

export const DERMAL_SUBSTITUTE_LABELS: Record<DermalSubstituteProduct, string> =
  {
    integra_bilayer: "Integra — Bilayer",
    integra_thin: "Integra — Thin (Single Layer)",
    matriderm: "Matriderm",
    btm_novosorb: "BTM / NovoSorb",
    alloderm: "AlloDerm",
    pelnac: "Pelnac",
    other: "Other",
  };

export type TemporaryCoverageProduct =
  | "allograft"
  | "xenograft_porcine"
  | "biobrane"
  | "suprathel"
  | "other_synthetic";

export const TEMPORARY_COVERAGE_LABELS: Record<
  TemporaryCoverageProduct,
  string
> = {
  allograft: "Allograft (Cadaveric Skin)",
  xenograft_porcine: "Xenograft (Porcine)",
  biobrane: "Biobrane",
  suprathel: "Suprathel",
  other_synthetic: "Other Synthetic",
};

export type BurnContractureJoint =
  | "neck"
  | "shoulder"
  | "elbow"
  | "wrist"
  | "mcp"
  | "pip"
  | "dip"
  | "thumb_web"
  | "hip"
  | "knee"
  | "ankle"
  | "axilla"
  | "antecubital"
  | "popliteal"
  | "perineal"
  | "other";

export const CONTRACTURE_JOINT_LABELS: Record<BurnContractureJoint, string> = {
  neck: "Neck",
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist",
  mcp: "MCP Joint",
  pip: "PIP Joint",
  dip: "DIP Joint",
  thumb_web: "Thumb Web Space",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle",
  axilla: "Axilla",
  antecubital: "Antecubital Fossa",
  popliteal: "Popliteal Fossa",
  perineal: "Perineum",
  other: "Other",
};

/** Stored on CaseProcedure.burnProcedureDetails */
export interface BurnProcedureDetails {
  excision?: {
    tbsaExcised?: number;
    regions?: TBSARegion[];
    excisionDepth?: "viable_dermis" | "subcutaneous_fat" | "fascia";
    estimatedBloodLossMl?: number;
    tourniquetUsed?: boolean;
    tourniquetTimeMin?: number;
  };

  grafting?: {
    graftType?: GraftType;
    donorSite?: GraftDonorSite;
    donorSiteSecondary?: GraftDonorSite;
    meshRatio?: MeshRatio;
    graftThickness?: "thin" | "intermediate" | "thick";
    graftThicknessMm?: number;
    recipientAreaCm2?: number;
    recipientAreaTBSA?: number;
    fixationMethod?: GraftFixation;
    graftTakePercentage?: number;
    graftTakeAssessmentDate?: string;
  };

  dermalSubstitute?: {
    product?: DermalSubstituteProduct;
    areaCm2?: number;
    simultaneousSTSG?: boolean;
    plannedIntervalToAutograftDays?: number;
    sealFormation?: "complete" | "partial" | "none";
  };

  temporaryCoverage?: {
    product?: TemporaryCoverageProduct;
    areaCm2?: number;
    source?: string;
    preservation?: "fresh" | "cryopreserved" | "glycerol_preserved";
  };

  contractureRelease?: {
    joint?: BurnContractureJoint;
    romPreOpDegrees?: number;
    romPostOpDegrees?: number;
    releaseDepth?: "skin_only" | "subcutaneous" | "deep_fascial";
    defectSizeCm2?: number;
    coverageMethod?:
      | "graft"
      | "local_flap"
      | "regional_flap"
      | "free_flap"
      | "healing";
  };

  laser?: {
    laserType?: "co2_fractional" | "pulsed_dye" | "nonablative_fractional";
    treatmentAreaCm2?: number;
    sessionNumber?: number;
    totalPlannedSessions?: number;
    settings?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTCOME DATA
// ═══════════════════════════════════════════════════════════════════════════════

export type BurnComplication =
  | "graft_failure_partial"
  | "graft_failure_total"
  | "wound_infection"
  | "sepsis"
  | "pneumonia"
  | "vte"
  | "ards"
  | "compartment_syndrome"
  | "donor_site_complication"
  | "heterotopic_ossification"
  | "contracture"
  | "hypertrophic_scarring"
  | "return_to_theatre"
  | "death"
  | "other";

export const BURN_COMPLICATION_LABELS: Record<BurnComplication, string> = {
  graft_failure_partial: "Partial Graft Failure",
  graft_failure_total: "Total Graft Failure",
  wound_infection: "Wound Infection",
  sepsis: "Sepsis",
  pneumonia: "Pneumonia",
  vte: "VTE",
  ards: "ARDS",
  compartment_syndrome: "Compartment Syndrome",
  donor_site_complication: "Donor Site Complication",
  heterotopic_ossification: "Heterotopic Ossification",
  contracture: "Contracture",
  hypertrophic_scarring: "Hypertrophic Scarring",
  return_to_theatre: "Return to Theatre",
  death: "Death",
  other: "Other",
};

export interface VancouverScarScale {
  vascularity: 0 | 1 | 2 | 3;
  pigmentation: 0 | 1 | 2;
  pliability: 0 | 1 | 2 | 3 | 4 | 5;
  height: 0 | 1 | 2 | 3;
}

export interface POSASObserver {
  vascularity: number; // 1–10
  pigmentation: number;
  thickness: number;
  relief: number;
  pliability: number;
  surfaceArea: number;
  overallOpinion: number;
}

export interface BurnOutcomeData {
  graftTakePercentage?: number;
  lengthOfStayDays?: number;
  icuDays?: number;
  ventilatorDays?: number;
  numberOfOperations?: number;
  dischargeDestination?:
    | "home"
    | "rehabilitation"
    | "other_hospital"
    | "ltac"
    | "death";
  complications?: BurnComplication[];
  vancouverScarScale?: VancouverScarScale;
  posasObserver?: POSASObserver;
  returnToWorkDate?: string;
  returnToSchoolDate?: string;
}

export const DISCHARGE_DESTINATION_LABELS: Record<
  NonNullable<BurnOutcomeData["dischargeDestination"]>,
  string
> = {
  home: "Home",
  rehabilitation: "Rehabilitation",
  other_hospital: "Other Hospital",
  ltac: "Long-Term Acute Care",
  death: "Death",
};
