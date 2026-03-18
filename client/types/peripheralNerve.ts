/**
 * Peripheral Nerve Surgery Module — Type Definitions
 *
 * Covers nerve injury classification (Sunderland 0–VI), electrodiagnostic
 * summaries, brachial plexus per-level injury mapping, neuroma management
 * (TMR/RPNI), nerve transfers, and outcome tracking.
 *
 * All fields optional — existing cases load correctly with zero nerve data.
 */

// ══════════════════════════════════════════════════
// NERVE INJURY CLASSIFICATION
// ══════════════════════════════════════════════════

export type SeddonGrade = "neurapraxia" | "axonotmesis" | "neurotmesis";

/** Mackinnon-modified Sunderland (includes Grade 0 and VI) */
export type SunderlandGrade = "0" | "I" | "II" | "III" | "IV" | "V" | "VI";

export const SUNDERLAND_LABELS: Record<SunderlandGrade, string> = {
  "0": "Grade 0 — Ischaemic conduction block",
  I: "Grade I — Neurapraxia (focal demyelination)",
  II: "Grade II — Axonotmesis (axon loss, endoneurium intact)",
  III: "Grade III — Endoneurial disruption",
  IV: "Grade IV — Perineurial disruption (fascicular)",
  V: "Grade V — Neurotmesis (complete transection)",
  VI: "Grade VI — Mixed injury (Mackinnon modification)",
};

export const SUNDERLAND_SHORT_LABELS: Record<SunderlandGrade, string> = {
  "0": "0",
  I: "I",
  II: "II",
  III: "III",
  IV: "IV",
  V: "V",
  VI: "VI",
};

export type NerveInjuryMechanism =
  | "laceration"
  | "crush"
  | "traction"
  | "compression"
  | "injection"
  | "gunshot"
  | "iatrogenic"
  | "thermal"
  | "radiation"
  | "ischaemic"
  | "unknown";

export const MECHANISM_LABELS: Record<NerveInjuryMechanism, string> = {
  laceration: "Laceration",
  crush: "Crush",
  traction: "Traction / stretch",
  compression: "Compression",
  injection: "Injection injury",
  gunshot: "Gunshot / blast",
  iatrogenic: "Iatrogenic",
  thermal: "Thermal / burn",
  radiation: "Radiation",
  ischaemic: "Ischaemic",
  unknown: "Unknown",
};

export type NerveInjuryTiming =
  | "acute" // <3 weeks
  | "subacute" // 3 weeks – 3 months
  | "chronic"; // >3 months

export const TIMING_LABELS: Record<NerveInjuryTiming, string> = {
  acute: "Acute (<3 wk)",
  subacute: "Subacute (3 wk – 3 mo)",
  chronic: "Chronic (>3 mo)",
};

export type RepairTiming =
  | "primary" // <72 hours
  | "delayed_primary" // 72 hours – 3 weeks
  | "secondary"; // >3 weeks

export const REPAIR_TIMING_LABELS: Record<RepairTiming, string> = {
  primary: "Primary (<72 hr)",
  delayed_primary: "Delayed primary (72 hr – 3 wk)",
  secondary: "Secondary (>3 wk)",
};

// ══════════════════════════════════════════════════
// NERVE IDENTIFIERS
// ══════════════════════════════════════════════════

export type NerveIdentifier =
  // Upper extremity — major trunks
  | "median"
  | "ulnar"
  | "radial"
  | "musculocutaneous"
  | "axillary"
  // Upper extremity — branches
  | "anterior_interosseous"
  | "posterior_interosseous"
  | "superficial_radial"
  | "dorsal_ulnar_cutaneous"
  | "palmar_cutaneous_median"
  | "digital_proper"
  | "digital_common"
  | "medial_antebrachial_cutaneous"
  | "lateral_antebrachial_cutaneous"
  // Brachial plexus branches
  | "suprascapular"
  | "long_thoracic"
  | "thoracodorsal"
  | "medial_pectoral"
  | "lateral_pectoral"
  | "subscapular_upper"
  | "subscapular_lower"
  // Lower extremity
  | "sciatic"
  | "common_peroneal"
  | "deep_peroneal"
  | "superficial_peroneal"
  | "tibial"
  | "sural"
  | "saphenous"
  | "femoral"
  | "obturator"
  | "lateral_femoral_cutaneous"
  | "medial_plantar"
  | "lateral_plantar"
  | "baxter_nerve"
  | "medial_calcaneal"
  | "interdigital"
  | "pudendal"
  | "ilioinguinal"
  | "iliohypogastric"
  | "genitofemoral"
  // Cranial (facial reanimation cross-reference)
  | "facial"
  | "spinal_accessory"
  | "hypoglossal"
  // Other
  | "other";

export const NERVE_LABELS: Record<NerveIdentifier, string> = {
  median: "Median nerve",
  ulnar: "Ulnar nerve",
  radial: "Radial nerve",
  musculocutaneous: "Musculocutaneous nerve",
  axillary: "Axillary nerve",
  anterior_interosseous: "Anterior interosseous nerve (AIN)",
  posterior_interosseous: "Posterior interosseous nerve (PIN)",
  superficial_radial: "Superficial branch of radial nerve",
  dorsal_ulnar_cutaneous: "Dorsal cutaneous branch of ulnar nerve",
  palmar_cutaneous_median: "Palmar cutaneous branch of median nerve",
  digital_proper: "Proper digital nerve",
  digital_common: "Common digital nerve",
  medial_antebrachial_cutaneous:
    "Medial antebrachial cutaneous nerve (MABC)",
  lateral_antebrachial_cutaneous:
    "Lateral antebrachial cutaneous nerve (LABC)",
  suprascapular: "Suprascapular nerve",
  long_thoracic: "Long thoracic nerve",
  thoracodorsal: "Thoracodorsal nerve",
  medial_pectoral: "Medial pectoral nerve",
  lateral_pectoral: "Lateral pectoral nerve",
  subscapular_upper: "Upper subscapular nerve",
  subscapular_lower: "Lower subscapular nerve",
  sciatic: "Sciatic nerve",
  common_peroneal: "Common peroneal nerve",
  deep_peroneal: "Deep peroneal nerve",
  superficial_peroneal: "Superficial peroneal nerve",
  tibial: "Tibial nerve",
  sural: "Sural nerve",
  saphenous: "Saphenous nerve",
  femoral: "Femoral nerve",
  obturator: "Obturator nerve",
  lateral_femoral_cutaneous: "Lateral femoral cutaneous nerve (LFCN)",
  medial_plantar: "Medial plantar nerve",
  lateral_plantar: "Lateral plantar nerve",
  baxter_nerve: "First branch of lateral plantar nerve (Baxter)",
  medial_calcaneal: "Medial calcaneal nerve",
  interdigital: "Interdigital nerve (Morton)",
  pudendal: "Pudendal nerve",
  ilioinguinal: "Ilioinguinal nerve",
  iliohypogastric: "Iliohypogastric nerve",
  genitofemoral: "Genitofemoral nerve",
  facial: "Facial nerve",
  spinal_accessory: "Spinal accessory nerve",
  hypoglossal: "Hypoglossal nerve",
  other: "Other",
};

/** Nerve groups for organised picker display */
export type NerveGroup =
  | "upper_extremity"
  | "upper_extremity_branches"
  | "brachial_plexus_branches"
  | "lower_extremity"
  | "cranial"
  | "other";

export const NERVE_GROUP_LABELS: Record<NerveGroup, string> = {
  upper_extremity: "Upper Extremity",
  upper_extremity_branches: "Upper Extremity — Branches",
  brachial_plexus_branches: "Brachial Plexus Branches",
  lower_extremity: "Lower Extremity",
  cranial: "Cranial",
  other: "Other",
};

export const NERVE_GROUPS: Record<NerveGroup, NerveIdentifier[]> = {
  upper_extremity: ["median", "ulnar", "radial", "musculocutaneous", "axillary"],
  upper_extremity_branches: [
    "anterior_interosseous",
    "posterior_interosseous",
    "superficial_radial",
    "dorsal_ulnar_cutaneous",
    "palmar_cutaneous_median",
    "digital_proper",
    "digital_common",
    "medial_antebrachial_cutaneous",
    "lateral_antebrachial_cutaneous",
  ],
  brachial_plexus_branches: [
    "suprascapular",
    "long_thoracic",
    "thoracodorsal",
    "medial_pectoral",
    "lateral_pectoral",
    "subscapular_upper",
    "subscapular_lower",
  ],
  lower_extremity: [
    "sciatic",
    "common_peroneal",
    "deep_peroneal",
    "superficial_peroneal",
    "tibial",
    "sural",
    "saphenous",
    "femoral",
    "obturator",
    "lateral_femoral_cutaneous",
    "medial_plantar",
    "lateral_plantar",
    "baxter_nerve",
    "medial_calcaneal",
    "interdigital",
    "pudendal",
    "ilioinguinal",
    "iliohypogastric",
    "genitofemoral",
  ],
  cranial: ["facial", "spinal_accessory", "hypoglossal"],
  other: ["other"],
};

// ══════════════════════════════════════════════════
// REPAIR AND RECONSTRUCTION
// ══════════════════════════════════════════════════

export type RepairTechnique =
  | "epineurial"
  | "grouped_fascicular"
  | "fascicular"
  | "end_to_side";

export const REPAIR_TECHNIQUE_LABELS: Record<RepairTechnique, string> = {
  epineurial: "Epineurial",
  grouped_fascicular: "Grouped fascicular",
  fascicular: "Fascicular",
  end_to_side: "End-to-side",
};

export interface NerveGraftDetails {
  graftType: "autograft" | "allograft" | "vein_graft";
  graftSource?: NerveGraftSource;
  graftLengthMm?: number;
  numberOfCables?: number;
  graftDiameterMm?: number;
  allograftProduct?: "avance" | "other";
  allograftDiameterCategory?:
    | "1_2mm"
    | "2_3mm"
    | "3_4mm"
    | "4_5mm";
  lotNumber?: string;
}

export type NerveGraftSource =
  | "sural"
  | "mabc"
  | "labc"
  | "pin"
  | "great_auricular"
  | "vascularised_ulnar"
  | "other";

export const GRAFT_SOURCE_LABELS: Record<NerveGraftSource, string> = {
  sural: "Sural nerve",
  mabc: "Medial antebrachial cutaneous (MABC)",
  labc: "Lateral antebrachial cutaneous (LABC)",
  pin: "Posterior interosseous nerve (terminal)",
  great_auricular: "Great auricular nerve",
  vascularised_ulnar: "Vascularised ulnar nerve",
  other: "Other",
};

export interface NerveConduitDetails {
  conduitType: "hollow" | "filled" | "wrap";
  productName?: string;
  material?:
    | "collagen_type_I"
    | "pga"
    | "plcl"
    | "pga_collagen"
    | "porcine_sis"
    | "silk"
    | "other";
  innerDiameterMm?: number;
  lengthMm?: number;
  gapBridgedMm?: number;
}

export interface NerveTransferDetails {
  donorNerve: NerveIdentifier;
  recipientNerve: NerveIdentifier;
  targetFunction?: NerveTransferTargetFunction;
  directVsGraft: "direct" | "via_graft";
  namedTransfer?: NamedNerveTransfer;
  coaptationTechnique?:
    | "epineurial"
    | "grouped_fascicular"
    | "fibrin_glue"
    | "connector";
}

export type NerveTransferTargetFunction =
  | "shoulder_abduction"
  | "shoulder_external_rotation"
  | "elbow_flexion"
  | "elbow_extension"
  | "wrist_extension"
  | "wrist_flexion"
  | "finger_extension"
  | "finger_flexion"
  | "thumb_opposition"
  | "intrinsic_hand"
  | "sensation"
  | "ankle_dorsiflexion"
  | "ankle_eversion"
  | "toe_extension"
  | "other";

export const TARGET_FUNCTION_LABELS: Record<
  NerveTransferTargetFunction,
  string
> = {
  shoulder_abduction: "Shoulder abduction",
  shoulder_external_rotation: "Shoulder external rotation",
  elbow_flexion: "Elbow flexion",
  elbow_extension: "Elbow extension",
  wrist_extension: "Wrist extension",
  wrist_flexion: "Wrist flexion",
  finger_extension: "Finger extension",
  finger_flexion: "Finger flexion",
  thumb_opposition: "Thumb opposition",
  intrinsic_hand: "Intrinsic hand function",
  sensation: "Sensation",
  ankle_dorsiflexion: "Ankle dorsiflexion",
  ankle_eversion: "Ankle eversion",
  toe_extension: "Toe extension",
  other: "Other",
};

export type NamedNerveTransfer =
  | "oberlin"
  | "mackinnon_double"
  | "somsak"
  | "sungpet"
  | "sxa_to_ssn"
  | "intercostal_to_mcn"
  | "phrenic_to_mcn"
  | "contralateral_c7"
  | "hypoglossal_full"
  | "hypoglossal_split"
  | "masseteric_to_facial"
  | "distal_tibial_to_deep_peroneal"
  | "other";

export const NAMED_TRANSFER_LABELS: Record<NamedNerveTransfer, string> = {
  oberlin: "Oberlin (ulnar fascicle \u2192 biceps)",
  mackinnon_double:
    "Double fascicular (Mackinnon: ulnar + median \u2192 biceps + brachialis)",
  somsak: "Leechavengvongs (triceps LH branch \u2192 axillary)",
  sungpet: "Medial pectoral \u2192 musculocutaneous",
  sxa_to_ssn: "Spinal accessory \u2192 suprascapular",
  intercostal_to_mcn: "Intercostal (T3\u2013T6) \u2192 musculocutaneous",
  phrenic_to_mcn: "Phrenic \u2192 musculocutaneous (via graft)",
  contralateral_c7: "Contralateral C7 \u2192 median (prespinal route)",
  hypoglossal_full: "Hypoglossal \u2192 facial (full)",
  hypoglossal_split: "Hypoglossal \u2192 facial (partial/split)",
  masseteric_to_facial: "Masseteric \u2192 facial",
  distal_tibial_to_deep_peroneal:
    "Distal tibial branch \u2192 deep peroneal (foot drop)",
  other: "Other nerve transfer",
};

// ══════════════════════════════════════════════════
// ELECTRODIAGNOSTIC SUMMARY
// ══════════════════════════════════════════════════

export interface ElectrodiagnosticSummary {
  datePerformed?: string;
  weeksSinceInjury?: number;
  snapsPresent?: boolean;
  denervationPresent?: boolean;
  reinnervationPresent?: boolean;
  fibrillationPotentials?: boolean;
  paraspinalDenervation?: boolean;
  overallSeverity?:
    | "normal"
    | "mild"
    | "moderate"
    | "severe"
    | "complete";
  keyFindings?: string;
}

export const EDX_SEVERITY_LABELS: Record<string, string> = {
  normal: "Normal",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
  complete: "Complete denervation",
};

// ══════════════════════════════════════════════════
// PERIPHERAL NERVE ASSESSMENT DATA
// ══════════════════════════════════════════════════

export interface PeripheralNerveAssessmentData {
  // Injury details
  nerveInjured?: NerveIdentifier;
  injuryLevel?: string;
  sunderlandGrade?: SunderlandGrade;
  mechanism?: NerveInjuryMechanism;
  timing?: NerveInjuryTiming;
  openVsClosed?: "open" | "closed";
  associatedVascularInjury?: boolean;
  associatedFracture?: boolean;

  // Electrodiagnostic summary
  electrodiagnostics?: ElectrodiagnosticSummary;

  // Nerve gap (intraoperative finding)
  nerveGapMm?: number;
  neuromaPresentIntraop?: boolean;
  napAcrossLesion?: "positive" | "negative" | "not_tested";

  // Repair details
  repairTiming?: RepairTiming;
  repairTechnique?: RepairTechnique;
  graftDetails?: NerveGraftDetails;
  conduitDetails?: NerveConduitDetails;
  transferDetails?: NerveTransferDetails;

  // Brachial plexus sub-module
  brachialPlexus?: BrachialPlexusAssessmentData;

  // Neuroma sub-module
  neuroma?: NeuromaAssessmentData;
}

// ══════════════════════════════════════════════════
// BRACHIAL PLEXUS SUB-MODULE
// ══════════════════════════════════════════════════

export type BPRoot = "C5" | "C6" | "C7" | "C8" | "T1";
export type BPTrunk = "upper" | "middle" | "lower";
export type BPDivision =
  | "upper_anterior"
  | "upper_posterior"
  | "middle_anterior"
  | "middle_posterior"
  | "lower_anterior"
  | "lower_posterior";
export type BPCord = "lateral" | "posterior" | "medial";
export type BPTerminalBranch =
  | "musculocutaneous"
  | "axillary"
  | "radial"
  | "median"
  | "ulnar";

export type BPInjuryType =
  | "avulsion"
  | "rupture"
  | "stretch"
  | "intact"
  | "unknown";

export const BP_INJURY_TYPE_LABELS: Record<BPInjuryType, string> = {
  avulsion: "Avulsion",
  rupture: "Rupture",
  stretch: "Stretch / neurapraxia",
  intact: "Intact",
  unknown: "Unknown",
};

export type BPPrePostGanglionic =
  | "preganglionic"
  | "postganglionic"
  | "mixed"
  | "unknown";

export interface BPLevelInjury {
  injuryType: BPInjuryType;
  sunderlandGrade?: SunderlandGrade;
  prePostGanglionic?: BPPrePostGanglionic;
  imagingConfirmed?: boolean;
  intraopConfirmed?: boolean;
  pseudomeningocelePresent?: boolean;
  pseudomeningocoleSizeMm?: number;
  napAcrossLesion?: "positive" | "negative" | "not_tested";
}

export interface BrachialPlexusAssessmentData {
  roots: Partial<Record<BPRoot, BPLevelInjury>>;
  trunks?: Partial<Record<BPTrunk, BPLevelInjury>>;
  cords?: Partial<Record<BPCord, BPLevelInjury>>;
  terminalBranches?: Partial<Record<BPTerminalBranch, BPLevelInjury>>;

  mechanism?: BPMechanism;
  energyLevel?: "high" | "low";
  associatedVascularInjury?: boolean;
  hornerSyndrome?: boolean;
  phrenicNervePalsy?: boolean;
  wingedScapula?: boolean;

  narakasGroup?: "I" | "II" | "III" | "IV";
  injuryPattern?: BPInjuryPattern;

  mriNeurography?: boolean;
  ctMyelography?: boolean;
  ultrasound?: boolean;

  approach?:
    | "supraclavicular"
    | "infraclavicular"
    | "combined"
    | "posterior_subscapular";
  clavicleOsteotomy?: boolean;

  procedures?: BrachialPlexusProcedureEntry[];
}

export type BPMechanism =
  | "motorcycle"
  | "mva"
  | "bicycle"
  | "fall"
  | "shoulder_dislocation"
  | "clavicle_fracture"
  | "penetrating"
  | "gunshot"
  | "obstetric"
  | "iatrogenic"
  | "compression"
  | "radiation"
  | "other";

export const BP_MECHANISM_LABELS: Record<BPMechanism, string> = {
  motorcycle: "Motorcycle accident",
  mva: "Motor vehicle accident",
  bicycle: "Bicycle accident",
  fall: "Fall",
  shoulder_dislocation: "Shoulder dislocation",
  clavicle_fracture: "Clavicle fracture",
  penetrating: "Penetrating / stab",
  gunshot: "Gunshot / blast",
  obstetric: "Obstetric",
  iatrogenic: "Iatrogenic",
  compression: "Compression / positioning",
  radiation: "Radiation",
  other: "Other",
};

export type BPInjuryPattern =
  | "upper_c5_c6"
  | "extended_upper_c5_c7"
  | "lower_c8_t1"
  | "complete_c5_t1"
  | "isolated_root"
  | "other";

export const BP_PATTERN_LABELS: Record<BPInjuryPattern, string> = {
  upper_c5_c6: "Upper (C5\u2013C6, Erb)",
  extended_upper_c5_c7: "Extended upper (C5\u2013C7)",
  lower_c8_t1: "Lower (C8\u2013T1, Klumpke)",
  complete_c5_t1: "Complete (C5\u2013T1)",
  isolated_root: "Isolated root",
  other: "Other pattern",
};

export interface BrachialPlexusProcedureEntry {
  procedureType:
    | "neurolysis"
    | "nerve_graft"
    | "nerve_transfer"
    | "ffmt"
    | "other";
  targetNerve?: NerveIdentifier;
  targetFunction?: NerveTransferTargetFunction;
  graftDetails?: NerveGraftDetails;
  transferDetails?: NerveTransferDetails;
  ffmtDetails?: FFMTDetails;
}

export interface FFMTDetails {
  donorMuscle: "gracilis" | "latissimus_dorsi" | "other";
  motorNerveSource: NerveIdentifier;
  targetFunction:
    | "elbow_flexion"
    | "finger_flexion"
    | "elbow_extension"
    | "other";
  donorVessel?: string;
  recipientVessel?: string;
  muscleLength?: number;
  ischaemiaTimeMinutes?: number;
}

// ══════════════════════════════════════════════════
// NEUROMA SUB-MODULE
// ══════════════════════════════════════════════════

export interface NeuromaAssessmentData {
  aetiology: "post_amputation" | "traumatic" | "iatrogenic";

  morphology?: "bulbous" | "fusiform" | "atypical";
  neuromaSizeMm?: number;

  // Amputation-specific
  amputationLevel?: string;
  amputationCause?:
    | "trauma"
    | "vascular"
    | "oncologic"
    | "infection"
    | "congenital";
  timeSinceAmputationMonths?: number;
  prostheticUse?: boolean;
  prostheticHoursPerDay?: number;
  phantomLimbPainNRS?: number;
  residualLimbPainNRS?: number;
  neuromaPositionInStump?:
    | "anterior"
    | "posterior"
    | "medial"
    | "lateral";
  proximityToWeightBearing?: boolean;

  // Traumatic-specific
  priorNerveRepairAttempted?: boolean;

  // Iatrogenic-specific
  causativeProcedure?:
    | "arthroplasty"
    | "hernia_repair"
    | "mastectomy"
    | "nerve_biopsy"
    | "amputation"
    | "other";

  // Surgical technique
  technique?: NeuromaTechnique;

  // TMR-specific
  tmrRecipientMotorNerve?: string;
  tmrTargetMuscle?: string;

  // RPNI-specific
  rpniCount?: number;
  rpniMuscleSource?:
    | "vastus_lateralis"
    | "gracilis"
    | "brachioradialis"
    | "other";
  rpniGraftDimensions?: string;
  rpniVariant?: "standard" | "ds_rpni" | "c_rpni" | "mc_rpni";
}

export type NeuromaTechnique =
  | "excision_burial_muscle"
  | "excision_burial_bone"
  | "excision_burial_vein"
  | "tmr"
  | "rpni"
  | "ds_rpni"
  | "c_rpni"
  | "mc_rpni"
  | "centro_central"
  | "relocation_nerve_graft"
  | "end_to_side"
  | "nerve_capping"
  | "traction_neurectomy"
  | "other";

export const NEUROMA_TECHNIQUE_LABELS: Record<NeuromaTechnique, string> = {
  excision_burial_muscle: "Excision + burial in muscle",
  excision_burial_bone: "Excision + burial in bone",
  excision_burial_vein: "Excision + burial in vein",
  tmr: "Targeted Muscle Reinnervation (TMR)",
  rpni: "Regenerative Peripheral Nerve Interface (RPNI)",
  ds_rpni: "Dermal Sensory RPNI (DS-RPNI)",
  c_rpni: "Composite RPNI (C-RPNI)",
  mc_rpni: "Muscle Cuff RPNI (MC-RPNI)",
  centro_central: "Centro-central neurorrhaphy",
  relocation_nerve_graft: "Relocation nerve grafting (via allograft)",
  end_to_side: "End-to-side neurorrhaphy",
  nerve_capping: "Nerve capping (synthetic/biologic)",
  traction_neurectomy: "Traction neurectomy",
  other: "Other technique",
};

// ══════════════════════════════════════════════════
// OUTCOME TRACKING (Based on 2025 COS)
// ══════════════════════════════════════════════════

export type MRCMotorGrade =
  | "M0"
  | "M1"
  | "M2"
  | "M3"
  | "M4_minus"
  | "M4"
  | "M4_plus"
  | "M5";

export type BMRCSensoryGrade =
  | "S0"
  | "S1"
  | "S1_plus"
  | "S2"
  | "S2_plus"
  | "S3"
  | "S3_plus"
  | "S4";

export interface NerveOutcomeAssessment {
  assessmentDate: string;
  monthsSinceSurgery: number;

  motorAssessments?: Array<{
    muscle: string;
    nerve: NerveIdentifier;
    mrcGrade: MRCMotorGrade;
  }>;

  sensoryGrade?: BMRCSensoryGrade;
  static2PD_mm?: number;
  moving2PD_mm?: number;
  swmtResult?:
    | "normal"
    | "diminished_light_touch"
    | "diminished_protective"
    | "loss_of_protective"
    | "deep_pressure_only"
    | "anaesthetic";

  painNRS?: number;

  gripStrengthKg?: number;
  pinchStrengthKg?: number;
  percentOfContralateral?: number;

  dashScore?: number;
  quickDashScore?: number;
}
