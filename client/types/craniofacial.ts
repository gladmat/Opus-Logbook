/**
 * Craniofacial & Cleft Module Types
 *
 * Structured data capture for cleft lip/palate, craniosynostosis,
 * and craniofacial conditions. Renders inline in DiagnosisGroupEditor
 * when specialty === "cleft_cranio".
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CLEFT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/** LAHSHAL notation — 6-position structured input per CRANE registry */
export interface LAHSHALClassification {
  rightLip: CleftCompleteness;
  rightAlveolus: CleftCompleteness;
  hardPalate: CleftCompleteness;
  softPalate: CleftCompleteness;
  leftAlveolus: CleftCompleteness;
  leftLip: CleftCompleteness;
}

export type CleftCompleteness = "complete" | "incomplete" | "none";

export type VeauClassification = "I" | "II" | "III" | "IV" | "submucous";

export type CleftLaterality = "left" | "right" | "bilateral" | "midline";

export interface CleftClassification {
  lahshal?: LAHSHALClassification;
  veauClass?: VeauClassification;
  laterality?: CleftLaterality;
  submucousCleft?: boolean;
  bifidUvula?: boolean;
  simonartBand?: boolean;
  microformCleft?: boolean;
  tessierNumber?: number; // 0-14, rare craniofacial clefts only
  associatedSyndrome?: string;
  geneticTesting?: GeneticTestResult;
}

export interface GeneticTestResult {
  tested: boolean;
  gene?: string; // e.g., "FGFR2", "TWIST1", "22q11.2"
  result?: "pathogenic" | "likely_pathogenic" | "vus" | "benign" | "pending";
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATIVE DETAILS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CraniofacialOperativeDetails {
  ageAtSurgery?: AgeAtSurgery;
  weightKg?: number;
  namedTechnique?: string;
  concurrentProcedures?: string[];

  // Bone graft (for ABG, cranioplasty)
  boneGraftDonor?:
    | "iliac_crest"
    | "cranial"
    | "tibial"
    | "rib"
    | "mandibular_symphysis"
    | "other";

  // Distraction osteogenesis
  distraction?: DistractionDetails;

  // Custom implant
  implant?: CraniofacialImplantDetails;

  // Fistula (Pittsburgh classification, for SC03 oronasal fistula)
  pittsburghFistulaType?: PittsburghFistulaType;

  // Stage in longitudinal pathway
  pathwayStage?: "primary" | "secondary" | "revision" | "definitive";

  // Blood loss (critical for cranial vault procedures)
  estimatedBloodLossMl?: number;
  transfusionRequired?: boolean;
  transfusionVolumeMl?: number;
}

export interface AgeAtSurgery {
  years: number;
  months: number;
  weeks?: number; // For neonatal/infant procedures <6mo
}

export interface DistractionDetails {
  deviceType: "internal" | "external";
  deviceManufacturer?: string;
  activationProtocol?: string; // e.g., "1mm/day for 14 days"
  totalDistractionMm?: number;
  consolidationWeeks?: number;
}

export interface CraniofacialImplantDetails {
  material: "PEEK" | "titanium" | "polyethylene" | "hydroxyapatite" | "other";
  patientSpecific: boolean;
  manufacturer?: string;
}

export type PittsburghFistulaType =
  | "I"
  | "II"
  | "III"
  | "IV"
  | "V"
  | "VI"
  | "VII";
// I=Bifid uvula, II=Soft palate, III=Junction hard/soft,
// IV=Hard palate, V=Junction primary/secondary,
// VI=Lingual-alveolar, VII=Labial-alveolar

// ═══════════════════════════════════════════════════════════════════════════════
// CRANIOSYNOSTOSIS DETAILS
// ═══════════════════════════════════════════════════════════════════════════════

export type CranialSuture =
  | "sagittal"
  | "metopic"
  | "right_coronal"
  | "left_coronal"
  | "right_lambdoid"
  | "left_lambdoid";

export type WhitakerCategory = "I" | "II" | "III" | "IV";
// I=No revision, II=Minor refinement, III=Major osteotomy, IV=Equivalent to original

export interface CraniosynostosisDetails {
  suturesInvolved: CranialSuture[];
  syndromic: boolean;
  syndromeName?: string;

  icpAssessment?: {
    preOperative?: {
      measured: boolean;
      valueMmHg?: number;
      method?: "invasive_monitoring" | "lumbar_puncture" | "clinical_only";
      papilledema?: "present" | "absent" | "equivocal";
      copperBeating?: boolean; // Skull X-ray finding
    };
  };

  whitakerOutcome?: WhitakerCategory;

  helmetTherapy?: {
    prescribed: boolean;
    durationMonths?: number;
    compliance?: "good" | "moderate" | "poor";
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OMENS+ CLASSIFICATION (Craniofacial Microsomia)
// ═══════════════════════════════════════════════════════════════════════════════

export interface OMENSClassification {
  orbit: 0 | 1 | 2 | 3;
  // 0=Normal, 1=Abnormal size, 2=Abnormal position, 3=Both
  mandible: "I" | "IIa" | "IIb" | "III";
  // Pruzansky-Kaban: I=Small, IIa=Short ramus normal TMJ,
  // IIb=Abnormal ramus, III=Absent ramus
  ear: 0 | 1 | 2 | 3;
  // 0=Normal, 1=Small all structures, 2=No canal, 3=Absent
  nerve: 0 | 1 | 2 | 3;
  // 0=Normal, 1=Upper branches, 2=Lower branches, 3=All
  softTissue: 0 | 1 | 2 | 3;
  // 0=Normal, 1=Minimal, 2=Moderate, 3=Severe
  extracraniofacialAnomalies?: {
    cardiac?: boolean;
    vertebral?: boolean;
    renal?: boolean;
    limb?: boolean;
    other?: string;
  };
  laterality: "left" | "right" | "bilateral";
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ASSESSMENT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CraniofacialAssessmentData {
  cleftClassification?: CleftClassification;
  operativeDetails: CraniofacialOperativeDetails;
  craniosynostosisDetails?: CraniosynostosisDetails;
  omensClassification?: OMENSClassification;
  outcomes?: CraniofacialOutcomes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTCOMES (optional, audit-ready)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CraniofacialOutcomes {
  speech?: SpeechOutcome;
  dental?: DentalOutcome;
  hearing?: HearingOutcome;
  feeding?: FeedingOutcome;
  complications?: CraniofacialComplications;
}

export interface SpeechOutcome {
  vpcRating?: 0 | 1 | 2; // 0=Competent, 1=Borderline, 2=Incompetent
  hypernasality?: "none" | "mild" | "moderate" | "severe";
  audibleNasalEmission?: boolean;
  secondarySpeechSurgeryNeeded?: boolean;
  assessmentAgeMonths?: number;
}

export interface DentalOutcome {
  fiveYearOldIndex?: 1 | 2 | 3 | 4 | 5;
  goslonScore?: 1 | 2 | 3 | 4 | 5;
  assessmentAgeMonths?: number;
}

export interface HearingOutcome {
  grommetsInserted?: boolean;
  grommetSets?: number;
  hearingAidUse?: boolean;
}

export interface FeedingOutcome {
  method?:
    | "breast"
    | "bottle_standard"
    | "bottle_specialist"
    | "ng_tube"
    | "mixed";
  weightPercentileAt3mo?: number;
}

export interface CraniofacialComplications {
  bleedingRequiringOR?: boolean;
  infectionRequiringOR?: boolean;
  oronasalFistula?: boolean;
  completeDehiscence?: boolean;
  respiratoryDistress?: boolean;
  readmissionWithin30d?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION VISIBILITY HELPER
// ═══════════════════════════════════════════════════════════════════════════════

export type CraniofacialSubcategory =
  | "Cleft Lip"
  | "Cleft Palate"
  | "Cleft Lip & Palate"
  | "Secondary Cleft Deformity"
  | "Velopharyngeal Insufficiency"
  | "Alveolar & Maxillary"
  | "Non-Syndromic Craniosynostosis"
  | "Syndromic Craniosynostosis"
  | "Craniofacial Conditions";

/** Determines which assessment sections to show for a given diagnosis */
export function getCraniofacialSections(subcategory: CraniofacialSubcategory): {
  showCleftClassification: boolean;
  showCraniosynostosis: boolean;
  showOMENS: boolean;
  showFistula: boolean;
  showSpeechOutcome: boolean;
  showDentalOutcome: boolean;
  showHearingOutcome: boolean;
  showFeedingOutcome: boolean;
} {
  const cleftSubs: CraniofacialSubcategory[] = [
    "Cleft Lip",
    "Cleft Palate",
    "Cleft Lip & Palate",
  ];
  const cranioSubs: CraniofacialSubcategory[] = [
    "Non-Syndromic Craniosynostosis",
    "Syndromic Craniosynostosis",
  ];

  const isCleft = cleftSubs.includes(subcategory);

  return {
    showCleftClassification: isCleft,
    showCraniosynostosis: cranioSubs.includes(subcategory),
    showOMENS: subcategory === "Craniofacial Conditions", // Narrowed to CF01 in UI
    showFistula: subcategory === "Secondary Cleft Deformity", // Narrowed to SC03 in UI
    showSpeechOutcome:
      isCleft || subcategory === "Velopharyngeal Insufficiency",
    showDentalOutcome: isCleft || subcategory === "Alveolar & Maxillary",
    showHearingOutcome: isCleft,
    showFeedingOutcome: isCleft,
  };
}
