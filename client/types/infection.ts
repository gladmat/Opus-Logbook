// Infection Module Types
// Based on GPT Pro recommendation for comprehensive infection documentation

// ===== INFECTION OVERLAY (attached to any case) =====

export type InfectionSyndrome =
  | "skin_soft_tissue"
  | "deep_infection"
  | "device_implant_related"
  | "bone_joint"
  | "necrotising_soft_tissue_infection"
  | "wound_infection_dehiscence"
  | "bite_related"
  | "burn_wound_infection";

export const INFECTION_SYNDROME_LABELS: Record<InfectionSyndrome, string> = {
  skin_soft_tissue: "Skin/Soft Tissue",
  deep_infection: "Deep Infection",
  device_implant_related: "Device/Implant Related",
  bone_joint: "Bone/Joint",
  necrotising_soft_tissue_infection: "Necrotising Soft Tissue Infection",
  wound_infection_dehiscence: "Wound Infection/Dehiscence",
  bite_related: "Bite Related",
  burn_wound_infection: "Burn Wound Infection",
};

export type InfectionRegion =
  | "hand"
  | "upper_limb"
  | "lower_limb"
  | "trunk"
  | "breast"
  | "head_neck"
  | "perineum"
  | "other";

export const INFECTION_REGION_LABELS: Record<InfectionRegion, string> = {
  hand: "Hand",
  upper_limb: "Upper Limb",
  lower_limb: "Lower Limb",
  trunk: "Trunk",
  breast: "Breast",
  head_neck: "Head & Neck",
  perineum: "Perineum",
  other: "Other",
};

export type InfectionLaterality =
  | "left"
  | "right"
  | "bilateral"
  | "midline"
  | "na";

export const INFECTION_LATERALITY_LABELS: Record<InfectionLaterality, string> =
  {
    left: "Left",
    right: "Right",
    bilateral: "Bilateral",
    midline: "Midline",
    na: "N/A",
  };

export type InfectionExtent =
  | "localized"
  | "regional"
  | "multi_compartment"
  | "disseminated";

export const INFECTION_EXTENT_LABELS: Record<InfectionExtent, string> = {
  localized: "Localized",
  regional: "Regional",
  multi_compartment: "Multi-compartment",
  disseminated: "Disseminated",
};

export type InfectionSeverity = "local" | "systemic_sepsis" | "shock_icu";

export const INFECTION_SEVERITY_LABELS: Record<InfectionSeverity, string> = {
  local: "Local",
  systemic_sepsis: "Systemic/Sepsis",
  shock_icu: "Shock/ICU",
};

export type SourceControlStatus = "yes" | "no" | "unclear";

export const SOURCE_CONTROL_LABELS: Record<SourceControlStatus, string> = {
  yes: "Yes",
  no: "No",
  unclear: "Unclear",
};

// ===== MICROBIOLOGY =====

export type CultureStatus = "pending" | "negative" | "positive";

export const CULTURE_STATUS_LABELS: Record<CultureStatus, string> = {
  pending: "Pending",
  negative: "Negative",
  positive: "Positive",
};

export type ResistanceFlag = "none" | "MRSA" | "ESBL" | "CRE" | "VRE" | "other";

export const RESISTANCE_FLAG_LABELS: Record<ResistanceFlag, string> = {
  none: "None",
  MRSA: "MRSA",
  ESBL: "ESBL",
  CRE: "CRE",
  VRE: "VRE",
  other: "Other",
};

export type BloodCultureStatus =
  | "not_taken"
  | "pending"
  | "negative"
  | "positive";

export const BLOOD_CULTURE_LABELS: Record<BloodCultureStatus, string> = {
  not_taken: "Not Taken",
  pending: "Pending",
  negative: "Negative",
  positive: "Positive",
};

export interface OrganismEntry {
  id: string;
  organismName: string;
  resistanceFlag?: ResistanceFlag;
  freeTextResistance?: string;
}

export interface MicrobiologyData {
  culturesTaken: boolean;
  cultureStatus?: CultureStatus;
  organisms?: OrganismEntry[];
  bloodCultures?: BloodCultureStatus;
}

// ===== CLINICAL SCORES =====

export type ScoreType = "LRINEC" | "qSOFA" | "SOFA" | "other";

export const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
  LRINEC: "LRINEC",
  qSOFA: "qSOFA",
  SOFA: "SOFA",
  other: "Other",
};

export interface ScoreEntry {
  id: string;
  scoreType: ScoreType;
  scoreValue: number;
  datetime: string;
  notes?: string;
}

// ===== OPERATIVE EPISODE =====

export type EpisodeIntent =
  | "incision_and_drainage"
  | "debridement"
  | "fasciotomy"
  | "explant_hardware_removal"
  | "washout"
  | "amputation"
  | "reconstruction_coverage"
  | "relook_planned";

export const EPISODE_INTENT_LABELS: Record<EpisodeIntent, string> = {
  incision_and_drainage: "Incision & Drainage",
  debridement: "Debridement",
  fasciotomy: "Fasciotomy",
  explant_hardware_removal: "Explant/Hardware Removal",
  washout: "Washout",
  amputation: "Amputation",
  reconstruction_coverage: "Reconstruction/Coverage",
  relook_planned: "Planned Relook",
};

export type DebridementExtent = "limited" | "extensive" | "radical";

export const DEBRIDEMENT_EXTENT_LABELS: Record<DebridementExtent, string> = {
  limited: "Limited",
  extensive: "Extensive",
  radical: "Radical",
};

export const DEBRIDEMENT_EXTENT_DESCRIPTIONS: Record<
  DebridementExtent,
  string
> = {
  limited:
    "Confined to one tissue layer (skin ± subcutaneous only) AND one anatomical subregion; no deep structure exposure; no compartment opening.",
  extensive:
    "Involves multiple tissue layers (e.g., fascia/muscle/tendon/joint capsule) OR any compartment opened OR extension beyond focal collection required to reach viable margins.",
  radical:
    "Necrotising infection OR excision/sacrifice of entire anatomical compartments or functional units OR would not be closable without staged reconstruction; limb/life-saving wide excision to bleeding viable tissue across planes.",
};

export type CompartmentsInvolved = "superficial_only" | "1" | "2_3" | "ge_4";

export const COMPARTMENTS_INVOLVED_LABELS: Record<
  CompartmentsInvolved,
  string
> = {
  superficial_only: "0 - Superficial Only",
  "1": "1 Compartment",
  "2_3": "2-3 Compartments",
  ge_4: "4+ or Entire Segment",
};

export type ReconstructionType =
  | "delayed_primary_closure"
  | "secondary_intention"
  | "skin_graft"
  | "local_flap"
  | "regional_flap"
  | "free_flap"
  | "vac_negative_pressure";

export const RECONSTRUCTION_TYPE_LABELS: Record<ReconstructionType, string> = {
  delayed_primary_closure: "Delayed Primary Closure",
  secondary_intention: "Secondary Intention",
  skin_graft: "Skin Graft",
  local_flap: "Local Flap",
  regional_flap: "Regional Flap",
  free_flap: "Free Flap",
  vac_negative_pressure: "VAC/Negative Pressure",
};

export type AmputationLevel =
  | "digit"
  | "ray"
  | "partial_hand"
  | "wrist_disarticulation"
  | "below_elbow"
  | "above_elbow"
  | "below_knee"
  | "above_knee"
  | "other";

export const AMPUTATION_LEVEL_LABELS: Record<AmputationLevel, string> = {
  digit: "Digit",
  ray: "Ray",
  partial_hand: "Partial Hand",
  wrist_disarticulation: "Wrist Disarticulation",
  below_elbow: "Below Elbow",
  above_elbow: "Above Elbow",
  below_knee: "Below Knee",
  above_knee: "Above Knee",
  other: "Other",
};

export interface InfectionEpisode {
  id: string;
  episodeDatetime: string;
  episodeNumber: number;
  intents: EpisodeIntent[];
  debridementExtent?: DebridementExtent;
  compartmentsInvolved?: CompartmentsInvolved;
  reconstructionType?: ReconstructionType;
  amputationLevel?: AmputationLevel;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== INFECTION OVERLAY (main structure) =====

export type InfectionCaseStatus = "active" | "resolved" | "deceased";

export const INFECTION_CASE_STATUS_LABELS: Record<InfectionCaseStatus, string> =
  {
    active: "Active",
    resolved: "Resolved",
    deceased: "Deceased",
  };

export interface InfectionOverlay {
  id: string;
  syndromePrimary: InfectionSyndrome;
  syndromeSecondary?: InfectionSyndrome[];
  region: InfectionRegion;
  laterality: InfectionLaterality;
  subregion?: string;
  extent: InfectionExtent;
  severity: InfectionSeverity;
  icu: boolean;
  vasopressors: boolean;
  sourceControlAchievedIndexOp?: SourceControlStatus;
  microbiology?: MicrobiologyData;
  scores?: ScoreEntry[];
  episodes: InfectionEpisode[];
  status: InfectionCaseStatus;
  dischargeNotes?: string;
  resolvedDate?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== QUICK TEMPLATES =====

export type InfectionTemplate =
  | "abscess_id"
  | "implant_infection"
  | "nec_fasc"
  | "deep_space"
  | "bite";

export const INFECTION_TEMPLATE_LABELS: Record<InfectionTemplate, string> = {
  abscess_id: "Abscess / I&D",
  implant_infection: "Implant Infection",
  nec_fasc: "Necrotising Fasciitis",
  deep_space: "Deep Space Infection",
  bite: "Bite Injury",
};

export const INFECTION_TEMPLATES: Record<
  InfectionTemplate,
  Partial<InfectionOverlay>
> = {
  abscess_id: {
    syndromePrimary: "skin_soft_tissue",
    extent: "localized",
    severity: "local",
    icu: false,
    vasopressors: false,
  },
  implant_infection: {
    syndromePrimary: "device_implant_related",
    extent: "localized",
    severity: "local",
    icu: false,
    vasopressors: false,
  },
  nec_fasc: {
    syndromePrimary: "necrotising_soft_tissue_infection",
    extent: "regional",
    severity: "systemic_sepsis",
    icu: true,
    vasopressors: false,
  },
  deep_space: {
    syndromePrimary: "deep_infection",
    extent: "regional",
    severity: "local",
    icu: false,
    vasopressors: false,
  },
  bite: {
    syndromePrimary: "bite_related",
    extent: "localized",
    severity: "local",
    icu: false,
    vasopressors: false,
  },
};
