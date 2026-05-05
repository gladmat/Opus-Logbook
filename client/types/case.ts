import { InfectionOverlay } from "./infection";
import { WoundAssessment } from "@/types/wound";
import { EncounterClass } from "@/types/episode";
import type {
  AnticoagulationProtocolId,
  FlapMonitoringProtocolId,
} from "@/types/surgicalPreferences";
import type {
  SkinCancerLesionAssessment,
  ExcisionCompleteness,
} from "./skinCancer";
import type { JointImplantDetails } from "./jointImplant";
import type { MediaTag } from "./media";
import type { OperativeRole, SupervisionLevel } from "./operativeRole";
import type { CaseTeamMember } from "./teamContacts";
import { parseDateOnlyValue } from "@/lib/dateValues";

// Case status for active patient tracking
export type CaseStatus = "active" | "discharged" | "incomplete" | "planned";

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  active: "Active",
  discharged: "Discharged",
  incomplete: "Incomplete",
  planned: "Planned",
};

// Procedure categories by specialty (high-level classification)
export type HandSurgeryCategory =
  | "trauma"
  | "degenerative"
  | "peripheral_nerve"
  | "congenital"
  | "tumour"
  | "infection"
  | "vascular"
  | "other";
export type OrthoplasticCategory =
  | "trauma"
  | "oncological"
  | "infection"
  | "pressure_sore"
  | "other";
export type BreastCategory =
  | "reconstruction"
  | "reduction"
  | "augmentation"
  | "oncoplastic"
  | "revision"
  | "other";
export type BodyContouringCategory =
  | "post_bariatric"
  | "cosmetic"
  | "reconstruction"
  | "other";
export type BurnsCategory =
  | "acute"
  | "reconstruction"
  | "contracture_release"
  | "other";
export type HeadNeckCategory =
  | "oncological"
  | "trauma"
  | "congenital"
  | "other";
export type GeneralCategory = "other";
export type CleftCranioCategory =
  | "congenital"
  | "secondary_revision"
  | "syndromic"
  | "other";
export type SkinCancerCategory =
  | "bcc"
  | "scc"
  | "melanoma"
  | "other_malignant"
  | "premalignant"
  | "diagnostic"
  | "other";
export type LymphoedemaCategory =
  | "primary"
  | "secondary"
  | "combined_treatment"
  | "other";
export type PeripheralNerveCategory =
  | "trauma"
  | "tumour"
  | "compression"
  | "reconstruction"
  | "brachial_plexus"
  | "other";

export type ProcedureCategory =
  | HandSurgeryCategory
  | OrthoplasticCategory
  | BreastCategory
  | BodyContouringCategory
  | BurnsCategory
  | HeadNeckCategory
  | GeneralCategory
  | CleftCranioCategory
  | SkinCancerCategory
  | LymphoedemaCategory
  | PeripheralNerveCategory;

// Procedure category options by specialty
export const PROCEDURE_CATEGORY_OPTIONS: Record<
  Specialty,
  { value: string; label: string }[]
> = {
  hand_wrist: [
    { value: "trauma", label: "Trauma" },
    { value: "degenerative", label: "Degenerative" },
    { value: "peripheral_nerve", label: "Peripheral Nerve" },
    { value: "congenital", label: "Congenital" },
    { value: "tumour", label: "Tumour" },
    { value: "infection", label: "Infection" },
    { value: "vascular", label: "Vascular" },
    { value: "other", label: "Other" },
  ],
  orthoplastic: [
    { value: "trauma", label: "Trauma" },
    { value: "oncological", label: "Oncological" },
    { value: "infection", label: "Infection" },
    { value: "pressure_sore", label: "Pressure Sore" },
    { value: "other", label: "Other" },
  ],
  breast: [
    { value: "reconstruction", label: "Reconstruction" },
    { value: "reduction", label: "Reduction" },
    { value: "augmentation", label: "Augmentation" },
    { value: "oncoplastic", label: "Oncoplastic" },
    { value: "revision", label: "Revision" },
    { value: "other", label: "Other" },
  ],
  body_contouring: [
    { value: "face", label: "Face" },
    { value: "body", label: "Body" },
    { value: "breast", label: "Breast" },
    { value: "post_bariatric", label: "Post-Bariatric" },
    { value: "cosmetic", label: "Cosmetic" },
    { value: "reconstruction", label: "Reconstruction" },
    { value: "other", label: "Other" },
  ],
  burns: [
    { value: "acute", label: "Acute Burns" },
    { value: "reconstruction", label: "Reconstruction" },
    { value: "contracture_release", label: "Contracture Release" },
    { value: "other", label: "Other" },
  ],
  head_neck: [
    { value: "oncological", label: "Oncological" },
    { value: "trauma", label: "Trauma" },
    { value: "congenital", label: "Congenital" },
    { value: "other", label: "Other" },
  ],
  aesthetics: [
    { value: "face", label: "Face" },
    { value: "body", label: "Body" },
    { value: "breast", label: "Breast" },
    { value: "post_bariatric", label: "Post-Bariatric" },
    { value: "cosmetic", label: "Cosmetic" },
    { value: "reconstruction", label: "Reconstruction" },
    { value: "other", label: "Other" },
  ],
  general: [{ value: "other", label: "Other" }],
  cleft_cranio: [
    { value: "congenital", label: "Congenital" },
    { value: "secondary_revision", label: "Secondary / Revision" },
    { value: "syndromic", label: "Syndromic" },
    { value: "other", label: "Other" },
  ],
  skin_cancer: [
    { value: "bcc", label: "BCC" },
    { value: "scc", label: "SCC" },
    { value: "melanoma", label: "Melanoma" },
    { value: "other_malignant", label: "Other Malignant" },
    { value: "premalignant", label: "Pre-Malignant" },
    { value: "diagnostic", label: "Diagnostic / Biopsy" },
  ],
  lymphoedema: [
    { value: "primary", label: "Primary" },
    { value: "secondary", label: "Secondary" },
    { value: "combined_treatment", label: "Combined Treatment" },
    { value: "other", label: "Other" },
  ],
  peripheral_nerve: [
    { value: "trauma", label: "Trauma" },
    { value: "tumour", label: "Tumour" },
    { value: "compression", label: "Compression / Entrapment" },
    { value: "reconstruction", label: "Reconstruction" },
    { value: "brachial_plexus", label: "Brachial Plexus" },
    { value: "other", label: "Other" },
  ],
};

export type Specialty =
  | "breast"
  | "hand_wrist"
  | "head_neck"
  | "cleft_cranio"
  | "skin_cancer"
  | "orthoplastic"
  | "burns"
  | "lymphoedema"
  | "body_contouring"
  | "aesthetics"
  | "peripheral_nerve"
  | "general";

export interface QuickCasePrefillData {
  patientIdentifier: string;
  facility?: string;
}

// Procedure tags for cross-specialty categorization
export type ProcedureTag =
  | "free_flap"
  | "pedicled_flap"
  | "local_flap"
  | "skin_graft"
  | "microsurgery"
  | "replant"
  | "nerve_repair"
  | "tendon_repair"
  | "oncological"
  | "trauma"
  | "acute"
  | "elective"
  | "revision"
  | "complex_wound"
  | "lipofilling"
  | "gender_affirming"
  | "cleft"
  | "craniosynostosis"
  | "craniofacial"
  | "bone_graft"
  | "vpi"
  | "rhinoplasty"
  | "osteotomy"
  | "orthognathic"
  | "distraction"
  | "endoscopic"
  | "donor_site"
  | "tissue_expansion"
  | "concurrent"
  | "presurgical"
  | "non_surgical_injectable"
  | "non_surgical_energy"
  | "non_surgical_skin_treatment"
  | "supermicrosurgery"
  | "prophylactic"
  | "debulking"
  | "experimental";

export type ASAScore = 1 | 2 | 3 | 4 | 5 | 6;

export type SmokingStatus = "yes" | "no" | "ex";

export const SMOKING_STATUS_LABELS: Record<SmokingStatus, string> = {
  no: "Non-smoker",
  ex: "Ex-smoker",
  yes: "Current smoker",
};

export type Gender = "male" | "female" | "other";

export type AdmissionUrgency = "elective" | "acute";

export type StayType = "day_case" | "inpatient";

export type UnplannedReadmissionReason =
  | "no"
  | "pain"
  | "bleeding"
  | "electrolyte_imbalance"
  | "infection"
  | "pulmonary_embolism"
  | "intra_abdominal_collection"
  | "organ_failure"
  | "other";

export type WoundInfectionRisk =
  | "clean"
  | "clean_contaminated"
  | "contaminated"
  | "dirty"
  | "na";

export type AnaestheticType =
  | "general"
  | "local"
  | "regional_block"
  | "spinal"
  | "epidural"
  | "sedation"
  | "sedation_local"
  | "walant";

export type UnplannedICUReason =
  | "no"
  | "localised_sepsis"
  | "generalised_sepsis"
  | "pneumonia"
  | "renal_failure"
  | "arrhythmia"
  | "myocardial_infarction"
  | "pulmonary_embolism"
  | "other";

export type DischargeOutcome =
  | "died"
  | "discharged_home"
  | "discharged_care"
  | "transferred_complex_care"
  | "absconded"
  | "referred_other_services";

export type MortalityClassification =
  | "expected"
  | "unexpected"
  | "not_applicable";

export type ClavienDindoGrade =
  | "none"
  | "I"
  | "II"
  | "IIIa"
  | "IIIb"
  | "IVa"
  | "IVb"
  | "V";

export interface ComplicationEntry {
  id: string;
  description: string;
  clavienDindoGrade?: ClavienDindoGrade;
  dateIdentified?: string;
  managementNotes?: string;
  resolved?: boolean;
  resolvedDate?: string;
}

export type Indication =
  | "trauma"
  | "oncologic"
  | "congenital"
  | "reconstructive"
  | "elective";

export type AnastomosisType = "end_to_end" | "end_to_side" | "side_to_side";

export type VesselType = "artery" | "vein";

export type CouplingMethod = "hand_sewn" | "coupler" | "hybrid";

export type AnatomicalRegion =
  | "lower_leg"
  | "knee"
  | "foot"
  | "thigh"
  | "hand"
  | "forearm"
  | "upper_arm"
  | "head_neck"
  | "breast_chest"
  | "perineum";

export type HarvestSide = "left" | "right";

export type ElevationPlane =
  | "subfascial"
  | "suprafascial"
  | "epifascial"
  | "thin"
  | "superthin"
  | "ultrathin"
  | "subdermal";

export type FreeFlap =
  | "alt"
  | "latissimus_dorsi"
  | "gracilis"
  | "tug"
  | "scip"
  | "siea"
  | "radial_forearm"
  | "fibula"
  | "diep"
  | "medial_sural"
  | "sgap"
  | "igap"
  | "pap"
  | "tdap"
  | "parascapular"
  | "scapular"
  | "serratus_anterior"
  | "lap"
  | "medial_femoral_condyle"
  | "omentum"
  | "other";

export const FREE_FLAP_LABELS: Record<FreeFlap, string> = {
  alt: "ALT (Anterolateral Thigh)",
  latissimus_dorsi: "Latissimus Dorsi (LD)",
  gracilis: "Gracilis",
  tug: "TUG (Transverse Upper Gracilis)",
  scip: "SCIP (Superficial Circumflex Iliac Perforator)",
  siea: "SIEA (Superficial Inferior Epigastric Artery)",
  radial_forearm: "RFFF (Radial Forearm)",
  fibula: "Fibula (Osteocutaneous)",
  diep: "DIEP",
  medial_sural: "MSAP (Medial Sural Artery Perforator)",
  sgap: "SGAP (Superior Gluteal Artery Perforator)",
  igap: "IGAP (Inferior Gluteal Artery Perforator)",
  pap: "PAP (Profunda Artery Perforator)",
  tdap: "TDAP (Thoracodorsal Artery Perforator)",
  parascapular: "Parascapular",
  scapular: "Scapular System",
  serratus_anterior: "Serratus Anterior",
  lap: "LAP (Lumbar Artery Perforator)",
  medial_femoral_condyle: "Medial Femoral Condyle (MFC)",
  omentum: "Omentum Free Flap",
  other: "Other",
};

export const ELEVATION_PLANE_LABELS: Record<ElevationPlane, string> = {
  subfascial: "Subfascial",
  suprafascial: "Suprafascial",
  epifascial: "Epifascial",
  thin: "Thin (~4\u201311 mm)",
  superthin: "Superthin (~2\u20134 mm)",
  ultrathin: "Ultrathin (<5 mm)",
  subdermal: "Subdermal / Pure Skin",
};

export type ALTPerforatorType =
  | "musculocutaneous"
  | "septocutaneous"
  | "oblique_branch";
export type ALTPedicleSource =
  | "type_i_descending"
  | "type_ii_transverse"
  | "type_iii_profunda";
export type ALTPerforatorLocation = "a_proximal" | "b_midpoint" | "c_distal";
export type ALTTissueComposition =
  | "fasciocutaneous"
  | "myocutaneous"
  | "chimeric"
  | "adipofascial"
  | "fascial_only"
  | "de_epithelialized";
export type ALTExtendedVariant =
  | "standard"
  | "extended"
  | "bipedicled"
  | "conjoined_alt_tfl";

export type DIEPPerfusionZones =
  | "zone_i_only"
  | "zone_i_iii"
  | "zone_i_ii_iii"
  | "zone_i_ii_iii_iv";
export type DIEPPerforatorRow = "medial" | "lateral" | "both";
export type MSTRAMClassification = "ms_0" | "ms_1" | "ms_2" | "ms_3";
export type GillDIEPSubtype = "diep_1" | "diep_2" | "diep_3";
export type DIEPFlapConfiguration =
  | "standard_unilateral"
  | "hemi_diep"
  | "stacked"
  | "conjoined_double_pedicle"
  | "bipedicled";
export type DIEPVenousSupercharge =
  | "none"
  | "siev_ipsilateral"
  | "siev_contralateral"
  | "bipedicled"
  | "turbocharged";
export type DIEPFlapExtent = "hemi_diep" | "full_diep";

export type SIEAVesselStatus =
  | "present_adequate"
  | "present_inadequate"
  | "absent";
export type SIEAOriginPattern = "independent" | "common_trunk_scia" | "absent";
export type SIEAFlapExtent = "hemi_abdominal" | "full_abdominal";

export type GracilisTissueComposition =
  | "muscle_only"
  | "myocutaneous"
  | "myofasciocutaneous"
  | "perforator_only";
export type GracilisSkinPaddle =
  | "none"
  | "transverse_tug"
  | "vertical"
  | "oblique_dug"
  | "l_shaped";
export type GracilisNerveTarget =
  | "cfng"
  | "masseteric"
  | "dual"
  | "hypoglossal"
  | "spinal_accessory";
export type GracilisCoaptation = "end_to_end" | "end_to_side" | "dual";
export type GracilisHarvestExtent =
  | "complete"
  | "partial_proximal"
  | "segmental";

export type PAPSkinPaddle =
  | "transverse_tpap"
  | "vertical_vpap"
  | "diagonal_dpap"
  | "fleur_de_lis"
  | "s_shaped";
export type PAPPerforatorType = "musculocutaneous" | "septocutaneous";
export type PAPStacking =
  | "single"
  | "stacked_bilateral"
  | "stacked_diep_pap"
  | "tug_pap";

export type SCIPPedicleBranch = "superficial_scias" | "deep_sciad" | "both";
export type SCIPThickness = "standard" | "thin" | "superthin" | "subdermal";
export type SCIPLymphatic = "none" | "vlnt" | "vlvt" | "lyst";
export type SCIPTissueComposition =
  | "cutaneous"
  | "adipofascial"
  | "fasciocutaneous";

export type LDHarvestExtent =
  | "tdap"
  | "msld_i"
  | "msld_ii"
  | "msld_iii"
  | "complete_ld"
  | "extended_ld";
export type LDTissueComposition =
  | "muscle_only"
  | "myocutaneous"
  | "fasciocutaneous_tdap"
  | "osteomyocutaneous_rib"
  | "osteomyocutaneous_scapular_tip";
export type LDNerveStatus = "divided" | "preserved";
export type LDExtensionArea =
  | "scapular_fat"
  | "parascapular_fat"
  | "lumbar_fat"
  | "combined";
export type LDSkinPaddle =
  | "transverse"
  | "vertical"
  | "oblique"
  | "fleur_de_lis"
  | "none";
export type LDMuscleBranch =
  | "whole_muscle"
  | "descending"
  | "transverse"
  | "bilobed";

export type TDAPTissueComposition =
  | "fasciocutaneous"
  | "adipofascial"
  | "chimeric_ld_cuff"
  | "chimeric_serratus";
export type TDAPPerforatorSource =
  | "descending_branch"
  | "transverse_branch"
  | "main_tda_trunk";
export type TDAPThinning = "standard" | "primary_thinned" | "superthin";
export type TDAPConversion =
  | "completed_tdap"
  | "converted_msld"
  | "converted_full_ld";
export type TDAPSkinPaddle =
  | "transverse"
  | "vertical"
  | "oblique"
  | "propeller";

export type FibulaTissueComposition =
  | "bone_only"
  | "osteocutaneous"
  | "osteomyocutaneous";
export type FibulaSkinPaddleType =
  | "type_a_septocutaneous"
  | "type_b_septo_musculo"
  | "type_c_musculocutaneous"
  | "type_d_popliteal";
export type FibulaBarrel =
  | "single"
  | "double"
  | "hybrid_1_2_1"
  | "biaxial_double";
export type FibulaPlanningMethod =
  | "freehand"
  | "vsp_models"
  | "vsp_cutting_guides"
  | "vsp_psi"
  | "in_house_vsp";
export type FibulaFixation =
  | "reconstruction_plate"
  | "miniplates"
  | "patient_specific_plate"
  | "combination";
export type FibulaDentalImplant = "immediate" | "delayed" | "not_planned";
export type FibulaReconSite = "mandible" | "maxilla" | "long_bone";
export type BrownMandibleClass =
  | "I"
  | "IIa"
  | "IIb"
  | "IIc"
  | "IId"
  | "III"
  | "IV";
export type MandibleSegment =
  | "symphysis"
  | "parasymphysis"
  | "body"
  | "angle"
  | "ramus"
  | "condyle";

export const BROWN_MANDIBLE_CLASS_LABELS: Record<BrownMandibleClass, string> = {
  I: "Class I — Lateral defect, condyle preserved",
  IIa: "Class IIa — Hemimandible, condyle preserved",
  IIb: "Class IIb — Hemimandible with condyle",
  IIc: "Class IIc — Anterior + lateral, condyle preserved",
  IId: "Class IId — Anterior + lateral with condyle",
  III: "Class III — Central/anterior defect",
  IV: "Class IV — Extensive bilateral/anterior defect",
};

export const MANDIBLE_SEGMENT_LABELS: Record<MandibleSegment, string> = {
  symphysis: "Symphysis",
  parasymphysis: "Parasymphysis",
  body: "Body",
  angle: "Angle",
  ramus: "Ramus",
  condyle: "Condyle",
};

export type MFCBoneSource =
  | "medial_condyle"
  | "supracondylar"
  | "medial_epicondyle";
export type MFCTissueComposition =
  | "bone_only"
  | "osteocutaneous"
  | "osteoperiosteal";
export type MFCFixation = "screws" | "plate_and_screws" | "wires";

export type ScapularSkinPaddle =
  | "scapular"
  | "parascapular"
  | "both_boomerang"
  | "none";
export type ScapularBoneComponent =
  | "none"
  | "lateral_border"
  | "scapular_tip"
  | "both";
export type ScapularVascularPedicle =
  | "csa_only"
  | "subscapular_extended"
  | "tda_for_tip";

export type GAPSubtype = "sgap" | "igap" | "sc_gap";
export type SGAPSkinPaddle = "oblique" | "transverse" | "modified_lateral";
export type IGAPSkinPaddle = "in_the_crease" | "oblique" | "transverse";
export type GAPPerforatorType = "musculocutaneous" | "septocutaneous";

export type RFFFTissueComposition =
  | "fasciocutaneous"
  | "osteocutaneous"
  | "adipofascial"
  | "composite_palmaris"
  | "composite_neuroteno";
export type RFFFSensateNerve = "non_sensate" | "labcn" | "mabcn" | "both";
export type RFFFDissectionPlane = "subfascial" | "suprafascial";
export type RFFFVenousDrainage = "venae_comitantes" | "cephalic_vein" | "both";
export type RFFFVariant = "radial" | "ulnar";
export type RFFFConfiguration = "standard" | "folded" | "tubed";

export type MSAPTissueComposition =
  | "fasciocutaneous"
  | "adipofascial"
  | "chimeric_gastrocnemius";
export type MSAPBranchingPattern =
  | "type_i_single"
  | "type_iia_dual_superior"
  | "type_iib_dual_inferior"
  | "type_iii_triple";
export type MSAPPerforatorCourse =
  | "type_1_direct"
  | "type_2_oblique"
  | "type_3_tortuous";
export type MSAPSensate =
  | "non_sensate"
  | "medial_sural_cutaneous"
  | "sural_nerve";
export type MSAPThinning = "standard" | "thinned";

export type SerratusTissueComposition =
  | "muscle_only"
  | "myocutaneous"
  | "fascia_only"
  | "osteomuscular"
  | "osteomyocutaneous";
export type SerratusNerveStatus = "preserved" | "divided";
export type SerratusNerveTarget = "masseteric" | "facial_nerve" | "cfng";
export type SerratusChimeric =
  | "serratus_alone"
  | "plus_ld"
  | "plus_ld_rib"
  | "plus_ld_scapular_bone"
  | "mega_flap";

export interface FlapSpecificDetails {
  altTissueComposition?: ALTTissueComposition;
  altPerforatorType?: ALTPerforatorType;
  altPedicleSource?: ALTPedicleSource;
  altPerforatorLocation?: ALTPerforatorLocation;
  altNumberOfSkinPaddles?: number;
  altFlowThrough?: boolean;
  altSensate?: boolean;
  altPrimaryThinning?: boolean;
  altExtendedVariant?: ALTExtendedVariant;

  diepPerfusionZones?: DIEPPerfusionZones;
  diepPerforatorRow?: DIEPPerforatorRow;
  diepMSTRAM?: MSTRAMClassification;
  diepGillSubtype?: GillDIEPSubtype;
  diepFlapConfiguration?: DIEPFlapConfiguration;
  diepVenousSupercharge?: DIEPVenousSupercharge;
  diepMotorNervePreservation?: string;
  diepSensoryNeurotization?: boolean;
  diepFlapExtent?: DIEPFlapExtent;

  sieaVesselStatus?: SIEAVesselStatus;
  sieaArterialDiameterMm?: number;
  sieaOriginPattern?: SIEAOriginPattern;
  sieaConvertedToDiep?: boolean;
  sieaFlapExtent?: SIEAFlapExtent;
  sieaConjoinedWithDiep?: boolean;

  gracilisTissueComposition?: GracilisTissueComposition;
  gracilisSkinPaddle?: GracilisSkinPaddle;
  gracilisFunctionalTransfer?: boolean;
  gracilisNerveTarget?: GracilisNerveTarget;
  gracilisCoaptation?: GracilisCoaptation;
  gracilisCFNGStaging?: "single_stage" | "two_stage";
  gracilisHarvestExtent?: GracilisHarvestExtent;

  papSkinPaddle?: PAPSkinPaddle;
  papPerforatorType?: PAPPerforatorType;
  papSensate?: boolean;
  papSensateNerve?: string;
  papStacking?: PAPStacking;

  scipPedicleBranch?: SCIPPedicleBranch;
  scipThickness?: SCIPThickness;
  scipLymphatic?: SCIPLymphatic;
  scipTissueComposition?: SCIPTissueComposition;
  scipBoneIncluded?: boolean;
  scipSensate?: boolean;
  scipChimericComponents?: string[];

  ldHarvestExtent?: LDHarvestExtent;
  ldTissueComposition?: LDTissueComposition;
  ldNerveStatus?: LDNerveStatus;
  ldNerveTarget?: string;
  ldExtensionArea?: LDExtensionArea;
  ldSkinPaddle?: LDSkinPaddle;
  ldMuscleBranch?: LDMuscleBranch;
  ldChimericComponents?: string[];

  tdapTissueComposition?: TDAPTissueComposition;
  tdapPerforatorSource?: TDAPPerforatorSource;
  tdapThinning?: TDAPThinning;
  tdapConversion?: TDAPConversion;
  tdapSkinPaddle?: TDAPSkinPaddle;
  tdapChimericComponents?: string[];

  fibulaTissueComposition?: FibulaTissueComposition;
  fibulaSkinPaddleType?: FibulaSkinPaddleType;
  fibulaOsteotomyCount?: number;
  fibulaBarrel?: FibulaBarrel;
  fibulaPlanningMethod?: FibulaPlanningMethod;
  fibulaFixation?: FibulaFixation;
  fibulaBoneLengthCm?: number;
  fibulaSkinPaddleCount?: number;
  fibulaDentalImplant?: FibulaDentalImplant;
  fibulaReconSite?: FibulaReconSite;
  fibulaBrownClass?: BrownMandibleClass;
  fibulaMandibleSegments?: MandibleSegment[];

  scapularSkinPaddle?: ScapularSkinPaddle;
  scapularBoneComponent?: ScapularBoneComponent;
  scapularVascularPedicle?: ScapularVascularPedicle;
  scapularMusclesIncluded?: string[];
  scapularChimericCount?: number;

  gapSubtype?: GAPSubtype;
  sgapSkinPaddle?: SGAPSkinPaddle;
  igapSkinPaddle?: IGAPSkinPaddle;
  gapPerforatorType?: GAPPerforatorType;
  gapSensate?: boolean;
  gapStacked?: boolean;
  gapPositionChange?: boolean;

  rfffTissueComposition?: RFFFTissueComposition;
  rfffSensateNerve?: RFFFSensateNerve;
  rfffDissectionPlane?: RFFFDissectionPlane;
  rfffPalmarisIncluded?: "yes" | "no" | "absent";
  rfffBrachioradialisIncluded?: boolean;
  rfffFcrIncluded?: boolean;
  rfffVenousDrainage?: RFFFVenousDrainage;
  rfffBoneSegmentCm?: number;
  rfffProphylacticPlating?: boolean;
  rfffVariant?: RFFFVariant;
  rfffConfiguration?: RFFFConfiguration;
  rfffSkinPaddleCount?: number;

  msapTissueComposition?: MSAPTissueComposition;
  msapBranchingPattern?: MSAPBranchingPattern;
  msapPerforatorCourse?: MSAPPerforatorCourse;
  msapSensate?: MSAPSensate;
  msapDominantBranch?: "lateral" | "medial";
  msapChimericMuscle?: "none" | "medial_gastrocnemius";
  msapThinning?: MSAPThinning;

  serratusSlipCount?: number;
  serratusSpecificSlips?: string;
  serratusTissueComposition?: SerratusTissueComposition;
  serratusRibIncluded?: boolean;
  serratusRibNumbers?: string;
  serratusNerveStatus?: SerratusNerveStatus;
  serratusNerveTarget?: SerratusNerveTarget;
  serratusChimeric?: SerratusChimeric;

  mfcBoneSource?: MFCBoneSource;
  mfcTissueComposition?: MFCTissueComposition;
  mfcFixation?: MFCFixation;
  mfcBoneLength?: number;
}

export const FLAP_SNOMED_MAP: Partial<
  Record<FreeFlap, { code: string; display: string }>
> = {
  alt: {
    code: "234298008",
    display: "Anterolateral thigh free flap (procedure)",
  },
  diep: {
    code: "234294006",
    display: "Deep inferior epigastric perforator flap (procedure)",
  },
  radial_forearm: {
    code: "234295007",
    display: "Free radial forearm flap (procedure)",
  },
  fibula: {
    code: "234289000",
    display: "Free fibula osteocutaneous flap (procedure)",
  },
  latissimus_dorsi: {
    code: "234296008",
    display: "Free latissimus dorsi flap (procedure)",
  },
  gracilis: { code: "234297004", display: "Free gracilis flap (procedure)" },
  tug: { code: "234297004", display: "Free gracilis flap (procedure)" },
  scip: {
    code: "234299000",
    display: "Free superficial circumflex iliac artery flap (procedure)",
  },
  siea: {
    code: "234300002",
    display: "Free superficial inferior epigastric artery flap (procedure)",
  },
  medial_sural: {
    code: "234306008",
    display: "Free medial sural artery perforator flap (procedure)",
  },
  sgap: {
    code: "234301003",
    display: "Free superior gluteal artery perforator flap (procedure)",
  },
  igap: {
    code: "234302005",
    display: "Free inferior gluteal artery perforator flap (procedure)",
  },
  pap: {
    code: "234308009",
    display: "Free profunda artery perforator flap (procedure)",
  },
  tdap: {
    code: "234307004",
    display: "Free thoracodorsal artery perforator flap (procedure)",
  },
  parascapular: {
    code: "234304006",
    display: "Free parascapular flap (procedure)",
  },
  serratus_anterior: {
    code: "234305007",
    display: "Free serratus anterior flap (procedure)",
  },
  scapular: { code: "234303000", display: "Free scapular flap (procedure)" },
};

export const RECIPIENT_SITE_SNOMED_MAP: Partial<
  Record<AnatomicalRegion, { code: string; display: string }>
> = {
  lower_leg: {
    code: "30021000",
    display: "Lower leg structure (body structure)",
  },
  knee: { code: "72696002", display: "Knee region structure (body structure)" },
  foot: { code: "56459004", display: "Foot structure (body structure)" },
  thigh: { code: "68367000", display: "Thigh structure (body structure)" },
  hand: { code: "85562004", display: "Hand structure (body structure)" },
  forearm: { code: "14975008", display: "Forearm structure (body structure)" },
  upper_arm: {
    code: "40983000",
    display: "Upper arm structure (body structure)",
  },
  head_neck: {
    code: "774007",
    display: "Head and neck structure (body structure)",
  },
  breast_chest: {
    code: "80248007",
    display: "Breast structure (body structure)",
  },
  perineum: {
    code: "261157007",
    display: "Perineal structure (body structure)",
  },
};

export type CountryCode = "CH" | "GB" | "PL" | "AU" | "NZ" | "US";

export interface TeamMember {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  role: string;
  confirmed: boolean;
  addedAt: string;
}

export interface SurgeryTiming {
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
}

export interface SnomedCodedItem {
  snomedCtCode: string;
  displayName: string;
  commonName?: string;
}

export type Laterality = "left" | "right" | "bilateral" | "not_applicable";

export type DigitId = "I" | "II" | "III" | "IV" | "V";

export type HandTraumaCompleteness = "partial" | "complete";

export interface PerfusionStatusEntry {
  digit: DigitId;
  status: "impaired" | "absent";
}

export type CoverageZone =
  | "fingertip"
  | "digit_shaft"
  | "web_space"
  | "palm"
  | "dorsum_hand"
  | "wrist_forearm";

export type CoverageSize = "small" | "medium" | "large";

export interface SoftTissueDescriptor {
  type: "defect" | "loss" | "degloving" | "contamination";
  surfaces?: ("palmar" | "dorsal")[];
  digits?: DigitId[];
  zone?: CoverageZone;
  size?: CoverageSize;
}

export interface HandTraumaStructure {
  category:
    | "flexor_tendon"
    | "extensor_tendon"
    | "nerve"
    | "artery"
    | "ligament"
    | "other";
  structureId: string;
  displayName: string;
  digit?: DigitId;
  zone?: string;
  side?: "radial" | "ulnar";
  completeness?: HandTraumaCompleteness;
  generatedProcedurePicklistId?: string;
  generatedProcedureId?: string;
}

export interface DislocationEntry {
  joint: "pip" | "mcp" | "cmc" | "thumb_cmc" | "druj" | "perilunate" | "lunate";
  digit?: DigitId;
  direction?: "dorsal" | "volar" | "lateral";
  hasFracture?: boolean;
  isComplex?: boolean;
}

export type AmputationLevel =
  | "fingertip"
  | "distal_phalanx"
  | "middle_phalanx"
  | "proximal_phalanx"
  | "mcp"
  | "ray"
  | "hand_wrist";

export interface DigitAmputation {
  digit: DigitId;
  level: AmputationLevel;
  type: "complete" | "subtotal";
  isReplantable?: boolean;
}

export interface HandTraumaDetails {
  /** Deprecated write target. Keep for backward compatibility on read. */
  injuryMechanism?: string;
  affectedDigits?: DigitId[];
  injuredStructures?: HandTraumaStructure[];
  dislocations?: DislocationEntry[];
  perfusionStatuses?: PerfusionStatusEntry[];
  softTissueDescriptors?: SoftTissueDescriptor[];
  isHighPressureInjection?: boolean;
  isFightBite?: boolean;
  isCompartmentSyndrome?: boolean;
  isRingAvulsion?: boolean;
  /** Per-digit amputation data */
  digitAmputations?: DigitAmputation[];
}

export interface DiagnosisClinicalDetails {
  laterality?: Laterality;
  injuryMechanism?: string;
  injuryMechanismOther?: string;
  handTrauma?: HandTraumaDetails;
}

export interface Diagnosis {
  snomedCtCode?: string;
  displayName: string;
  date?: string;
  clinicalDetails?: DiagnosisClinicalDetails;
}

export interface Prophylaxis {
  antibiotics: boolean;
  dvtPrevention: boolean;
  antibioticName?: string;
  dvtMethod?: string;
}

export interface SnomedRefItem {
  id: number;
  snomedCtCode: string;
  displayName: string;
  commonName?: string | null;
  category: string;
  subcategory?: string | null;
  anatomicalRegion?: string | null;
  specialty?: string | null;
}

export interface AnastomosisEntry {
  id: string;
  vesselType: VesselType;
  recipientVesselSnomedCode?: string;
  recipientVesselName: string;
  donorVesselSnomedCode?: string;
  donorVesselName?: string;
  couplingMethod?: CouplingMethod;
  couplerSizeMm?: number;
  configuration?: AnastomosisType;
  sutureType?: string;
  sutureSize?: string;
  patencyConfirmed?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// PREOPERATIVE & INTRAOPERATIVE ENUMS (Free Flap Registry)
// ═══════════════════════════════════════════════════════════════════════════

export type PreoperativeImaging =
  | "none"
  | "handheld_doppler"
  | "duplex_ultrasound"
  | "ct_angiography"
  | "mr_angiography"
  | "conventional_angiography";

export const PREOPERATIVE_IMAGING_LABELS: Record<PreoperativeImaging, string> =
  {
    none: "None",
    handheld_doppler: "Handheld Doppler",
    duplex_ultrasound: "Duplex Ultrasound",
    ct_angiography: "CT Angiography",
    mr_angiography: "MR Angiography",
    conventional_angiography: "Conventional Angiography",
  };

export type ReconstructionTiming =
  | "immediate"
  | "delayed_immediate"
  | "delayed"
  | "secondary"
  | "salvage";

export const RECONSTRUCTION_TIMING_LABELS: Record<
  ReconstructionTiming,
  string
> = {
  immediate: "Immediate",
  delayed_immediate: "Delayed-Immediate",
  delayed: "Delayed",
  secondary: "Secondary (revision)",
  salvage: "Salvage (after failed reconstruction)",
};

export type JointCasePartnerSpecialty =
  | "ent"
  | "omfs"
  | "neurosurgery"
  | "other";
export type JointCaseAblativeSurgeon = "partner" | "self";
export type JointCaseReconstructionSequence = "immediate" | "delayed";
export type JointCaseStructureResected =
  | "skin"
  | "mucosa"
  | "bone_mandible"
  | "bone_maxilla"
  | "tongue"
  | "floor_of_mouth"
  | "palate"
  | "pharynx"
  | "larynx"
  | "nerve_facial"
  | "nerve_lingual"
  | "nerve_hypoglossal"
  | "nerve_inferior_alveolar"
  | "parotid_gland"
  | "submandibular_gland"
  | "other";

export interface JointCaseDefectDimensions {
  length?: number;
  width?: number;
  depth?: number;
}

export interface JointCaseContext {
  isJointCase: boolean;
  partnerSpecialty?: JointCasePartnerSpecialty;
  partnerConsultantName?: string;
  ablativeSurgeon?: JointCaseAblativeSurgeon;
  reconstructionSequence?: JointCaseReconstructionSequence;
  ablativeProcedureDescription?: string;
  defectDimensions?: JointCaseDefectDimensions;
  structuresResected?: JointCaseStructureResected[];
}

export const JOINT_CASE_PARTNER_SPECIALTY_LABELS: Record<
  JointCasePartnerSpecialty,
  string
> = {
  ent: "ENT (Otolaryngology)",
  omfs: "OMFS (Oral & Maxillofacial)",
  neurosurgery: "Neurosurgery",
  other: "Other",
};

export const JOINT_CASE_ABLATIVE_SURGEON_LABELS: Record<
  JointCaseAblativeSurgeon,
  string
> = {
  partner: "Partner team",
  self: "Self",
};

export const JOINT_CASE_RECONSTRUCTION_SEQUENCE_LABELS: Record<
  JointCaseReconstructionSequence,
  string
> = {
  immediate: "Immediate",
  delayed: "Delayed",
};

export const JOINT_CASE_STRUCTURE_RESECTED_LABELS: Record<
  JointCaseStructureResected,
  string
> = {
  skin: "Skin",
  mucosa: "Mucosa",
  bone_mandible: "Mandible",
  bone_maxilla: "Maxilla",
  tongue: "Tongue",
  floor_of_mouth: "Floor of mouth",
  palate: "Palate",
  pharynx: "Pharynx",
  larynx: "Larynx",
  nerve_facial: "Facial nerve",
  nerve_lingual: "Lingual nerve",
  nerve_hypoglossal: "Hypoglossal nerve",
  nerve_inferior_alveolar: "Inferior alveolar nerve",
  parotid_gland: "Parotid gland",
  submandibular_gland: "Submandibular gland",
  other: "Other",
};

export type RecipientVesselQuality =
  | "normal"
  | "irradiated_usable"
  | "irradiated_vein_graft_required"
  | "previously_operated";

export const RECIPIENT_VESSEL_QUALITY_LABELS: Record<
  RecipientVesselQuality,
  string
> = {
  normal: "Normal",
  irradiated_usable: "Irradiated but usable",
  irradiated_vein_graft_required: "Irradiated — vein graft required",
  previously_operated: "Previously operated neck",
};

export type VeinGraftSource =
  | "saphenous"
  | "cephalic"
  | "external_jugular"
  | "other";

export const VEIN_GRAFT_SOURCE_LABELS: Record<VeinGraftSource, string> = {
  saphenous: "Great saphenous",
  cephalic: "Cephalic",
  external_jugular: "External jugular",
  other: "Other",
};

export type PerfusionAssessment =
  | "none"
  | "clinical_only"
  | "icg_fluorescence"
  | "handheld_doppler"
  | "implantable_doppler"
  | "laser_doppler"
  | "spo2_probe"
  | "thermography";

export const PERFUSION_ASSESSMENT_LABELS: Record<PerfusionAssessment, string> =
  {
    none: "None",
    clinical_only: "Clinical Only",
    icg_fluorescence: "ICG Fluorescence Angiography",
    handheld_doppler: "Handheld Doppler",
    implantable_doppler: "Implantable Doppler",
    laser_doppler: "Laser Doppler",
    spo2_probe: "SpO\u2082 Probe",
    thermography: "Thermography",
  };

export type DonorSiteClosureMethod =
  | "primary_closure"
  | "skin_graft_split"
  | "skin_graft_full"
  | "dermal_substitute"
  | "secondary_intention"
  | "local_flap"
  | "combination";

export const DONOR_SITE_CLOSURE_LABELS: Record<DonorSiteClosureMethod, string> =
  {
    primary_closure: "Primary Closure",
    skin_graft_split: "Split-Thickness Skin Graft",
    skin_graft_full: "Full-Thickness Skin Graft",
    dermal_substitute: "Dermal Substitute",
    secondary_intention: "Secondary Intention",
    local_flap: "Local Flap",
    combination: "Combination",
  };

// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURE-SPECIFIC OUTCOMES (Polymorphic)
// ═══════════════════════════════════════════════════════════════════════════

export type ProcedureOutcomeType = "free_flap"; // Extend: | "joint_implant" | "nerve_repair"

export interface ProcedureOutcomeBase {
  id: string;
  caseProcedureId: string;
  outcomeType: ProcedureOutcomeType;
  assessedAt?: string;
  assessedDaysPostOp?: number;
}

export interface ProcedureOutcome extends ProcedureOutcomeBase {
  details: FreeFlapOutcomeDetails; // Union later: | JointImplantDetails | ...
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE FLAP OUTCOME DETAILS (lives in clinicalDetails.flapOutcome JSONB)
// ═══════════════════════════════════════════════════════════════════════════

export interface FreeFlapOutcomeDetails {
  assessedAt?: string;
  assessedDaysPostOp?: number;
  flapSurvival: FlapSurvivalStatus;
  partialLossPercentage?: number;
  partialLossManagement?: PartialLossManagement;
  monitoringProtocol?: FlapMonitoringProtocolId;
  reExploration?: FlapReExploration;
  donorSiteComplications?: DonorSiteComplication[];
  recipientSiteComplications?: RecipientSiteComplication[];
}

export type FlapSurvivalStatus =
  | "complete_survival"
  | "partial_loss"
  | "total_loss";

export const FLAP_SURVIVAL_LABELS: Record<FlapSurvivalStatus, string> = {
  complete_survival: "Complete Survival",
  partial_loss: "Partial Loss",
  total_loss: "Total Loss",
};

export type PartialLossManagement =
  | "conservative"
  | "debridement_only"
  | "skin_graft"
  | "revision_flap"
  | "other";

export const PARTIAL_LOSS_MANAGEMENT_LABELS: Record<
  PartialLossManagement,
  string
> = {
  conservative: "Conservative (secondary intention)",
  debridement_only: "Debridement Only",
  skin_graft: "Skin Graft",
  revision_flap: "Revision Flap",
  other: "Other",
};

export interface FlapReExploration {
  reExplored: boolean;
  events?: FlapReExplorationEvent[];
}

export interface FlapReExplorationEvent {
  id: string;
  hoursPostOp: number;
  finding: ReExplorationFinding;
  intervention: ReExplorationIntervention;
  salvageOutcome: SalvageOutcome;
}

export type ReExplorationFinding =
  | "arterial_thrombosis"
  | "venous_thrombosis"
  | "combined_thrombosis"
  | "haematoma_compression"
  | "pedicle_kink"
  | "pedicle_stretch"
  | "vasospasm"
  | "infection"
  | "no_cause_found"
  | "other";

export const RE_EXPLORATION_FINDING_LABELS: Record<
  ReExplorationFinding,
  string
> = {
  arterial_thrombosis: "Arterial Thrombosis",
  venous_thrombosis: "Venous Thrombosis",
  combined_thrombosis: "Combined (Arterial + Venous)",
  haematoma_compression: "Haematoma Compression",
  pedicle_kink: "Pedicle Kink",
  pedicle_stretch: "Pedicle Stretch/Tension",
  vasospasm: "Vasospasm",
  infection: "Infection",
  no_cause_found: "No Cause Found",
  other: "Other",
};

export type ReExplorationIntervention =
  | "thrombectomy_reanastomosis"
  | "vein_graft_interposition"
  | "additional_anastomosis"
  | "haematoma_evacuation"
  | "pedicle_repositioning"
  | "thrombolytics"
  | "leech_therapy"
  | "flap_removal"
  | "observation_only"
  | "other";

export const RE_EXPLORATION_INTERVENTION_LABELS: Record<
  ReExplorationIntervention,
  string
> = {
  thrombectomy_reanastomosis: "Thrombectomy + Re-anastomosis",
  vein_graft_interposition: "Vein Graft Interposition",
  additional_anastomosis: "Additional Anastomosis",
  haematoma_evacuation: "Haematoma Evacuation",
  pedicle_repositioning: "Pedicle Repositioning",
  thrombolytics: "Thrombolytics",
  leech_therapy: "Leech Therapy",
  flap_removal: "Flap Removal",
  observation_only: "Observation Only",
  other: "Other",
};

export type SalvageOutcome =
  | "salvaged_complete"
  | "salvaged_partial_loss"
  | "failed_total_loss";

export const SALVAGE_OUTCOME_LABELS: Record<SalvageOutcome, string> = {
  salvaged_complete: "Salvaged \u2014 Complete Survival",
  salvaged_partial_loss: "Salvaged \u2014 Partial Loss",
  failed_total_loss: "Failed \u2014 Total Loss",
};

export type DonorSiteComplication =
  | "wound_dehiscence"
  | "infection"
  | "seroma"
  | "haematoma"
  | "skin_graft_loss"
  | "chronic_pain"
  | "sensory_deficit"
  | "motor_deficit"
  | "hernia"
  | "bulge"
  | "contour_deformity"
  | "fat_necrosis"
  | "tendon_adhesion"
  | "fracture"
  | "other";

export const DONOR_SITE_COMPLICATION_LABELS: Record<
  DonorSiteComplication,
  string
> = {
  wound_dehiscence: "Wound Dehiscence",
  infection: "Infection",
  seroma: "Seroma",
  haematoma: "Haematoma",
  skin_graft_loss: "Skin Graft Loss",
  chronic_pain: "Chronic Pain",
  sensory_deficit: "Sensory Deficit",
  motor_deficit: "Motor Deficit",
  hernia: "Hernia",
  bulge: "Bulge",
  contour_deformity: "Contour Deformity",
  fat_necrosis: "Fat Necrosis",
  tendon_adhesion: "Tendon Adhesion",
  fracture: "Fracture (donor bone)",
  other: "Other",
};

export type RecipientSiteComplication =
  | "wound_dehiscence"
  | "infection"
  | "seroma"
  | "haematoma"
  | "fat_necrosis"
  | "flap_congestion"
  | "partial_skin_paddle_loss"
  | "fistula"
  | "plate_exposure"
  | "implant_exposure"
  | "other";

export const RECIPIENT_SITE_COMPLICATION_LABELS: Record<
  RecipientSiteComplication,
  string
> = {
  wound_dehiscence: "Wound Dehiscence",
  infection: "Infection",
  seroma: "Seroma",
  haematoma: "Haematoma",
  fat_necrosis: "Fat Necrosis",
  flap_congestion: "Flap Congestion",
  partial_skin_paddle_loss: "Partial Skin Paddle Loss",
  fistula: "Fistula",
  plate_exposure: "Plate Exposure",
  implant_exposure: "Implant Exposure",
  other: "Other",
};

// ═══════════════════════════════════════════════════════════════════════════
// FREE FLAP DETAILS (Extended with Registry Fields)
// ═══════════════════════════════════════════════════════════════════════════

export interface FreeFlapDetails {
  harvestSide: HarvestSide;
  indication?: Indication;
  flapType?: FreeFlap;
  flapSnomedCode?: string;
  flapSnomedDisplay?: string;
  flapCommonName?: string;
  composition?: string;
  harvestTechnique?: string;
  skinIsland?: boolean;
  recipientSite?: string;
  recipientSiteRegion?: AnatomicalRegion;
  recipientSiteSnomedCode?: string;
  recipientSiteSnomedDisplay?: string;
  ischemiaTimeMinutes?: number;
  flapWidthCm?: number;
  flapLengthCm?: number;
  perforatorCount?: 1 | 2 | 3;
  elevationPlane?: ElevationPlane;
  isFlowThrough?: boolean;
  anastomoses: AnastomosisEntry[];
  flapDisplayName?: string;
  recipientArteryName?: string;
  recipientVeinName?: string;
  anastomosisType?: AnastomosisType;
  couplerSizeMm?: number;
  flapSpecificDetails?: FlapSpecificDetails;

  // Registry fields (all optional, added in Free Flap Registry Upgrade)
  preoperativeImaging?: PreoperativeImaging;
  anticoagulationProtocol?: AnticoagulationProtocolId;
  perfusionAssessment?: PerfusionAssessment;
  positionChangeRequired?: boolean;
  donorSiteClosureMethod?: DonorSiteClosureMethod;

  // H&N irradiated neck vessel assessment (shown when head_neck + priorRadiotherapy)
  recipientVesselQuality?: RecipientVesselQuality;
  veinGraftUsed?: boolean;
  veinGraftSource?: VeinGraftSource;
  veinGraftLength?: number;

  // Flap outcome stored in local clinicalDetails
  flapOutcome?: FreeFlapOutcomeDetails;
}

// AO/OTA fracture classification entry
export interface FractureEntry {
  id: string;
  boneId: string;
  boneName: string;
  aoCode: string;
  details: {
    familyCode: string;
    type?: string;
    subBoneId?: string;
    finger?: string;
    phalanx?: string;
    segment?: string;
    openStatus?: "open" | "closed";
    isComminuted?: boolean;
    qualifications?: string[];
  };
}

export interface HandSurgeryDetails {
  injuryMechanism?: string;
  fractures?: FractureEntry[];
  dominantHand?: "left" | "right" | "ambidextrous";
  affectedHand?: "left" | "right";
  /** Legacy free-text fixation material (e.g. "K-wires", "compression plate"). */
  fixationMaterial?: string;
  /** Legacy free-text fracture site (e.g. "Distal radius", "Scaphoid waist"). */
  fractureSite?: string;
}

export interface BodyContouringDetails {
  resectionWeightGrams?: number;
  drainOutputMl?: number;
}

// Re-export from canonical source for backward compatibility
export type { ExcisionCompleteness } from "./skinCancer";
export { EXCISION_COMPLETENESS_LABELS } from "./skinCancer";

export interface SkinLesionExcisionDetails {
  histologyDiagnosis?: string;
  peripheralMarginMm?: number;
  deepMarginMm?: number;
  excisionCompleteness?: ExcisionCompleteness;
  histologyReportCapturedAt?: string;
}

// ─── SLNB Basin Types ─────────────────────────────────────────────────────────

/**
 * Anatomical lymph node basin sampled during sentinel lymph node biopsy.
 * Multiple basins can be sampled in the same operation (bilateral drainage,
 * discordant drainage patterns common in trunk and H&N melanomas).
 */
export type SlnbBasin =
  | "right_axilla"
  | "left_axilla"
  | "right_groin"
  | "left_groin"
  | "right_popliteal"
  | "left_popliteal"
  | "right_cervical_parotid"
  | "left_cervical_parotid"
  | "other";

export const SLNB_BASIN_LABELS: Record<SlnbBasin, string> = {
  right_axilla: "Right axilla",
  left_axilla: "Left axilla",
  right_groin: "Right groin (inguinal)",
  left_groin: "Left groin (inguinal)",
  right_popliteal: "Right popliteal",
  left_popliteal: "Left popliteal",
  right_cervical_parotid: "Right cervical / parotid",
  left_cervical_parotid: "Left cervical / parotid",
  other: "Other",
};

/** Per-basin pathological result */
export interface SlnbBasinResult {
  basin: SlnbBasin;
  /** Total nodes removed from this basin */
  nodesRemoved?: number;
  /** Number of positive (metastatic) nodes */
  nodesPositive?: number;
  /** Size of largest metastatic deposit in mm */
  largestDepositMm?: number;
  /** Extranodal extension (capsular breach) */
  extranodalExtension?: boolean;
  /** Free text for 'other' basin or extra detail */
  basinNote?: string;
}

/**
 * Clinical details for sentinel lymph node biopsy procedures.
 * Supports multi-basin documentation (bilateral axillae, axilla + groin, etc.)
 * with per-basin node counts and pathological results.
 *
 * SNOMED CT post-coordination:
 *   - Procedure: 396487001 | Sentinel lymph node biopsy (procedure)
 *   - Site (per basin): post-coordinated using 363698007 | Finding site
 *   - Laterality: post-coordinated using 272741003 | Laterality
 */
export interface SlnbDetails {
  /** All basins sampled in this operation */
  basins: SlnbBasinResult[];
  /** Whether radioisotope (Tc-99m nanocolloid) mapping was used */
  radioisotopeUsed?: boolean;
  /** Whether blue dye was used (isosulfan blue, patent blue V, methylene blue) */
  blueDyeUsed?: boolean;
  /** Whether intraoperative gamma probe was used */
  gammaProbeUsed?: boolean;
  /** Whether SPECT/CT lymphoscintigraphy performed pre-op */
  spectCtPerformed?: boolean;
}

export type ClinicalDetails =
  | FreeFlapDetails
  | HandTraumaDetails
  | HandSurgeryDetails
  | BodyContouringDetails
  | SkinLesionExcisionDetails
  | SlnbDetails
  | Record<string, unknown>;

// ─── Multi-Lesion Session Types ─────────────────────────────────────────────

export type LesionPathologyType =
  | "bcc"
  | "scc"
  | "melanoma"
  | "benign"
  | "other";

export type LesionReconstruction =
  | "primary_closure"
  | "local_flap"
  | "skin_graft"
  | "secondary_healing"
  | "other";

export interface LesionInstance {
  id: string;
  site: string;
  pathologyType?: LesionPathologyType;
  procedurePicklistId?: string;
  procedureName?: string;
  reconstruction?: LesionReconstruction;
  lengthMm?: number;
  widthMm?: number;
  peripheralMarginMm?: number;
  deepMarginMm?: number;
  marginStatus?: "clear" | "involved" | "pending";
  histologyConfirmed?: boolean;
  snomedSiteCode?: string;
  snomedSiteDisplay?: string;
  /** Skin cancer assessment workflow data (per-lesion in multi-lesion mode) */
  skinCancerAssessment?: SkinCancerLesionAssessment;
}

export interface ProcedureCode {
  snomedCtCode: string;
  snomedCtDisplay: string;
  localCode?: string;
  localDisplay?: string;
  localSystem?: string;
}

export interface CaseProcedure {
  id: string;
  sequenceOrder: number;
  procedureName: string;
  specialty?: Specialty;
  subcategory?: string;
  picklistEntryId?: string;
  tags?: ProcedureTag[];
  snomedCtCode?: string;
  snomedCtDisplay?: string;
  localCode?: string;
  localCodeSystem?: string;
  surgeonRole?: string;
  /** Per-procedure operative role override (overrides case-level defaultOperativeRole) */
  operativeRoleOverride?: OperativeRole;
  /** Per-procedure supervision level override (overrides case-level defaultSupervisionLevel) */
  supervisionLevelOverride?: SupervisionLevel;
  clinicalDetails?: ClinicalDetails;
  implantDetails?: JointImplantDetails;
  /** Burn-specific procedure details (graft, excision, dermal substitute, etc.) */
  burnProcedureDetails?: import("./burns").BurnProcedureDetails;
  /** LVA per-anastomosis operative details (lymphatic surgery) */
  lvaOperativeDetails?: import("./lymphatic").LVAOperativeDetails;
  /** VLNT donor-specific details extending free flap (lymphatic surgery) */
  vlntDetails?: import("./lymphatic").VLNTSpecificDetails;
  /** SAPL / liposuction operative details (lymphatic surgery) */
  saplDetails?: import("./lymphatic").SAPLOperativeDetails;
  /** Corrective osteotomy details (post-traumatic bone, elective hand) */
  osteotomyDetails?: import("./osteotomy").CorrectiveOsteotomyData;
  notes?: string;
  /** Which specific digit this procedure targets (for multi-digit cases like trigger finger). */
  digitId?: DigitId;
  /** Procedure-level laterality for bilateral cases (e.g., bilateral DIEP) */
  laterality?: "left" | "right";
}

// ─── Diagnosis Certainty ─────────────────────────────────────────────────────
export type DiagnosisCertainty = "clinical" | "histological";

export const DIAGNOSIS_CERTAINTY_LABELS: Record<DiagnosisCertainty, string> = {
  clinical: "Clinical (awaiting histology)",
  histological: "Histologically confirmed",
};

// ─── Clinical Suspicion (for excision biopsies) ─────────────────────────────
export type ClinicalSuspicion =
  | "suspect_bcc"
  | "suspect_scc"
  | "suspect_melanoma"
  | "uncertain";

export const CLINICAL_SUSPICION_LABELS: Record<ClinicalSuspicion, string> = {
  suspect_bcc: "Suspect BCC",
  suspect_scc: "Suspect SCC",
  suspect_melanoma: "Suspect melanoma",
  uncertain: "Uncertain",
};

/** IDs of diagnosis picklist entries that represent an excision biopsy awaiting histology */
export const EXCISION_BIOPSY_DIAGNOSIS_IDS = [
  "gen_dx_skin_lesion_excision_biopsy",
  "hn_dx_skin_lesion_excision_biopsy",
] as const;

export function isExcisionBiopsyDiagnosis(
  diagnosisPicklistId?: string,
): boolean {
  if (!diagnosisPicklistId) return false;
  return (EXCISION_BIOPSY_DIAGNOSIS_IDS as readonly string[]).includes(
    diagnosisPicklistId,
  );
}

export interface DiagnosisGroup {
  id: string;
  sequenceOrder: number;
  specialty: Specialty;
  diagnosis?: Diagnosis;
  diagnosisPicklistId?: string;
  diagnosisStagingSelections?: Record<string, string>;
  diagnosisClinicalDetails?: DiagnosisClinicalDetails;
  procedureSuggestionSource?:
    | "picklist"
    | "skinCancer"
    | "acuteHand"
    | "manual";
  pathologicalDiagnosis?: Diagnosis;
  fractures?: FractureEntry[];
  procedures: CaseProcedure[];
  isMultiLesion?: boolean;
  lesionInstances?: LesionInstance[];
  /** Clinical vs histological certainty of the diagnosis */
  diagnosisCertainty?: DiagnosisCertainty;
  /** Pre-operative clinical impression (only for excision biopsy / awaiting histology cases) */
  clinicalSuspicion?: ClinicalSuspicion;
  /** Wound assessment data for this diagnosis group (per-group for multi-site burns) */
  woundAssessment?: WoundAssessment;
  /** Skin cancer assessment workflow data (single-lesion mode) */
  skinCancerAssessment?: SkinCancerLesionAssessment;
  /** General histology result for non-skin-cancer cases (enchondroma, neuroma, etc.) */
  histologyResult?: GeneralHistologyResult;
  /** Hand infection inline assessment data (acute hand cases) */
  handInfectionDetails?: import("./handInfection").HandInfectionDetails;
  /** Breast surgery assessment data (per-side details, implants, flaps, lipofilling) */
  breastAssessment?: import("./breast").BreastAssessmentData;
  /** Affected fingers for per-finger conditions (trigger finger, Dupuytren's) */
  affectedFingers?: string[];
  /** Affected digits using DigitId (I-V) for multi-digit diagnoses (trigger digit). */
  affectedDigits?: DigitId[];
  /** Per-finger Quinnell grading for trigger finger/thumb (finger ID → grade "0"-"4") */
  triggerFingerGrading?: Record<string, string>;
  /** Dupuytren's disease assessment data (per-ray contracture measurements) */
  dupuytrenAssessment?: import("./dupuytren").DupuytrenAssessment;
  /** Transient hint for auto-selecting hand case type on new groups. Not persisted. */
  handCaseTypeHint?: "trauma" | "acute" | "elective";
  /** Craniofacial assessment data (cleft classification, craniosynostosis, OMENS+) */
  craniofacialAssessment?: import("./craniofacial").CraniofacialAssessmentData;
  /** Aesthetic assessment data (injectable/energy/surgical details) */
  aestheticAssessment?: import("./aesthetics").AestheticAssessment;
  /** Burns assessment data (TBSA, injury event, severity scores) */
  burnsAssessment?: import("./burns").BurnsAssessmentData;
  /** Peripheral nerve assessment data (Sunderland grade, EDX, brachial plexus, neuroma) */
  peripheralNerveAssessment?: import("./peripheralNerve").PeripheralNerveAssessmentData;
  /** Lymphoedema assessment data (ISL staging, ICG, bioimpedance, limb measurements, history) */
  lymphoedemaAssessment?: import("./lymphatic").LymphaticAssessment;
}

export type GeneralHistologyCategory =
  | "benign"
  | "malignant"
  | "uncertain"
  | "other";

export type HistologyMarginStatus =
  | "complete"
  | "close"
  | "incomplete"
  | "pending"
  | "not_applicable";

export interface GeneralHistologyResult {
  category: GeneralHistologyCategory;
  report: string;
  marginStatus?: HistologyMarginStatus;
  snomedCode?: string;
  snomedDisplay?: string;
  reviewedAt?: string;
}

export interface SuggestionAcceptanceEntry {
  diagnosisGroupId: string;
  diagnosisPicklistId: string;
  suggestedProcedureIds: string[];
  acceptedProcedureIds: string[];
  addedManuallyIds: string[];
}

export interface Case {
  id: string;
  patientIdentifier: string;
  procedureDate: string;
  facility: string;
  specialty: Specialty;
  procedureType: string;
  procedureCode?: ProcedureCode;
  diagnosisGroups: DiagnosisGroup[];
  surgeryTiming?: SurgeryTiming;

  // Operative Role & Supervision (3-dimensional model)
  responsibleConsultantName?: string;
  responsibleConsultantUserId?: string;
  defaultOperativeRole?: OperativeRole;
  defaultSupervisionLevel?: SupervisionLevel;

  // Entry tracking (Phase 4)
  formOpenedAt?: string;
  formSavedAt?: string;
  entryDurationSeconds?: number;
  suggestionAcceptanceLog?: SuggestionAcceptanceEntry[];

  // Episode linkage (Phase 6a)
  episodeId?: string;
  episodeSequence?: number;
  encounterClass?: EncounterClass;

  // Patient Identity (on-device only, never synced to server)
  patientFirstName?: string;
  patientLastName?: string;
  patientDateOfBirth?: string; // YYYY-MM-DD
  patientNhi?: string; // NZ National Health Index (format: ABC1234)

  // Patient Demographics
  gender?: Gender;
  ethnicity?: string;

  // Admission Details
  admissionDate?: string;
  dischargeDate?: string;
  admissionUrgency?: AdmissionUrgency;
  stayType?: StayType;
  unplannedReadmission?: UnplannedReadmissionReason;
  injuryDate?: string;

  // Co-morbidities (SNOMED CT coded)
  comorbidities?: SnomedCodedItem[];

  // Risk Factors
  asaScore?: ASAScore;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  smoker?: SmokingStatus;
  diabetes?: boolean;

  // Operative Factors
  woundInfectionRisk?: WoundInfectionRisk;
  anaestheticType?: AnaestheticType;
  prophylaxis?: Prophylaxis;

  // Treatment Context (Free Flap Registry — case-level fields)
  reconstructionTiming?: ReconstructionTiming;
  priorRadiotherapy?: boolean;
  priorChemotherapy?: boolean;
  intraoperativeTransfusion?: boolean;
  transfusionUnits?: number;

  // Outcomes
  unplannedICU?: UnplannedICUReason;
  returnToTheatre?: boolean;
  returnToTheatreReason?: string;
  outcome?: DischargeOutcome;
  mortalityClassification?: MortalityClassification;
  recurrenceDate?: string;
  discussedAtMDM?: boolean;

  // 30-Day Complication Follow-up
  complicationsReviewed?: boolean;
  complicationsReviewedAt?: string;
  hasComplications?: boolean;
  complications?: ComplicationEntry[];

  // Operative Media (photos/files attached during case documentation)
  operativeMedia?: OperativeMediaItem[];

  // Infection Overlay (can be attached to any case as primary or secondary pathology)
  infectionOverlay?: InfectionOverlay;

  // Joint case context (H&N free flap cases with ENT/OMFS/neurosurgery)
  jointCaseContext?: JointCaseContext;

  // Case Status (active until discharge note recorded)
  caseStatus?: CaseStatus;

  // Planned case fields (caseStatus === "planned")
  plannedDate?: string; // YYYY-MM-DD — scheduled surgery date
  plannedNote?: string; // Free-text planning note
  plannedTemplateId?: string; // Capture protocol ID chosen at plan time

  clinicalDetails: ClinicalDetails;
  teamMembers: TeamMember[];
  operativeTeam?: CaseTeamMember[];
  ownerId: string;
  encryptionKeyId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TimelineEventType =
  | "note"
  | "photo"
  | "imaging"
  | "prom"
  | "complication"
  | "follow_up_visit"
  | "wound_assessment"
  | "discharge_photo";

export type FollowUpInterval =
  | "2_weeks"
  | "6_weeks"
  | "3_months"
  | "6_months"
  | "1_year"
  | "custom";

export type PROMQuestionnaire =
  | "dash"
  | "michigan_hand"
  | "sf36"
  | "eq5d"
  | "breast_q"
  | "custom";

export interface PROMData {
  questionnaire: PROMQuestionnaire;
  score?: number;
  rawScores?: Record<string, number>;
  responses?: Record<string, string | number>;
}

export interface MediaAttachment {
  id: string;
  localUri: string;
  thumbnailUri?: string;
  mimeType: string;
  caption?: string;
  createdAt: string;
  tag?: MediaTag;
  timestamp?: string; // User-selected date for the media (e.g. pre-op X-ray date)
}

export interface OperativeMediaItem {
  id: string;
  localUri: string;
  thumbnailUri?: string;
  mimeType: string;
  tag?: MediaTag;
  caption?: string;
  timestamp?: string;
  createdAt: string;
  templateId?: string; // Opus Camera protocol ID
  templateStepIndex?: number; // Protocol step index at capture time
  /**
   * Draft-only provenance for transactional Inbox assignment.
   * Removed before final case persistence.
   */
  sourceInboxId?: string;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  eventType: TimelineEventType;
  note: string;
  authorId?: string;
  createdAt: string;
  updatedAt?: string;
  clinicalContext?: TimelineEventContext;
  followUpInterval?: FollowUpInterval;
  mediaAttachments?: MediaAttachment[];
  promData?: PROMData;
  complicationData?: ComplicationEntry;
  woundAssessmentData?: WoundAssessment;
  nerveOutcome?: import("./peripheralNerve").NerveOutcomeAssessment;
}

export type TimelineEventContext =
  | "intraoperative"
  | "early_postop"
  | "discharge"
  | "outpatient_review";

export const TIMELINE_EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  note: "Note",
  photo: "Photo",
  imaging: "X-ray / Imaging",
  prom: "PROM Score",
  complication: "Complication",
  follow_up_visit: "Follow-up Visit",
  wound_assessment: "Wound Assessment",
  discharge_photo: "Discharge Photo",
};

export const FOLLOW_UP_INTERVAL_LABELS: Record<FollowUpInterval, string> = {
  "2_weeks": "2 Weeks",
  "6_weeks": "6 Weeks",
  "3_months": "3 Months",
  "6_months": "6 Months",
  "1_year": "1 Year",
  custom: "Custom",
};

export const PROM_QUESTIONNAIRE_LABELS: Record<PROMQuestionnaire, string> = {
  dash: "DASH (Disabilities of Arm, Shoulder, Hand)",
  michigan_hand: "Michigan Hand Questionnaire",
  sf36: "SF-36 Health Survey",
  eq5d: "EQ-5D Quality of Life",
  breast_q: "BREAST-Q",
  custom: "Custom Questionnaire",
};

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  breast: "Breast",
  hand_wrist: "Hand & Wrist",
  head_neck: "Head & Neck",
  cleft_cranio: "Cleft & Craniofacial",
  skin_cancer: "Skin Cancer",
  orthoplastic: "Orthoplastic & Limb",
  burns: "Burns",
  lymphoedema: "Lymphoedema",
  body_contouring: "Body Contouring",
  aesthetics: "Aesthetics",
  peripheral_nerve: "Facial & Peripheral Nerve",
  general: "General / Other",
};

export const PROCEDURE_TAG_LABELS: Record<ProcedureTag, string> = {
  free_flap: "Free Flap",
  pedicled_flap: "Pedicled Flap",
  local_flap: "Local Flap",
  skin_graft: "Skin Graft",
  microsurgery: "Microsurgery",
  replant: "Replant",
  nerve_repair: "Nerve Repair",
  tendon_repair: "Tendon Repair",
  oncological: "Oncological",
  trauma: "Trauma",
  acute: "Acute",
  elective: "Elective",
  revision: "Revision",
  complex_wound: "Complex Wound",
  lipofilling: "Lipofilling",
  gender_affirming: "Gender-Affirming",
  cleft: "Cleft",
  craniosynostosis: "Craniosynostosis",
  craniofacial: "Craniofacial",
  bone_graft: "Bone Graft",
  vpi: "VPI",
  rhinoplasty: "Rhinoplasty",
  osteotomy: "Osteotomy",
  orthognathic: "Orthognathic",
  distraction: "Distraction",
  endoscopic: "Endoscopic",
  donor_site: "Donor Site",
  tissue_expansion: "Tissue Expansion",
  concurrent: "Concurrent",
  presurgical: "Presurgical",
  non_surgical_injectable: "Non-Surgical Injectable",
  non_surgical_energy: "Non-Surgical Energy",
  non_surgical_skin_treatment: "Non-Surgical Skin Treatment",
  supermicrosurgery: "Supermicrosurgery",
  prophylactic: "Prophylactic",
  debulking: "Debulking",
  experimental: "Experimental",
};

export const INDICATION_LABELS: Record<Indication, string> = {
  trauma: "Trauma",
  oncologic: "Oncologic",
  congenital: "Congenital",
  reconstructive: "Reconstructive",
  elective: "Elective",
};

export const ANASTOMOSIS_LABELS: Record<AnastomosisType, string> = {
  end_to_end: "End-to-End",
  end_to_side: "End-to-Side",
  side_to_side: "Side-to-Side",
};

export const VESSEL_TYPE_LABELS: Record<VesselType, string> = {
  artery: "Artery",
  vein: "Vein",
};

export const COUPLING_METHOD_LABELS: Record<CouplingMethod, string> = {
  hand_sewn: "Hand-sewn",
  coupler: "Coupler",
  hybrid: "Hybrid", // Legacy - not used in UI
};

// For venous anastomosis - only coupler or hand-sewn (no hybrid)
export const VEIN_COUPLING_METHOD_OPTIONS: {
  value: CouplingMethod;
  label: string;
}[] = [
  { value: "hand_sewn", label: "Hand-sewn" },
  { value: "coupler", label: "Coupler" },
];

export const ANATOMICAL_REGION_LABELS: Record<AnatomicalRegion, string> = {
  lower_leg: "Lower Leg",
  knee: "Knee",
  foot: "Foot",
  thigh: "Thigh",
  hand: "Hand",
  forearm: "Forearm",
  upper_arm: "Upper Arm",
  head_neck: "Head & Neck",
  breast_chest: "Breast / Chest Wall",
  perineum: "Perineum / Pelvis",
};

export const COUNTRY_LABELS: Record<CountryCode, string> = {
  CH: "Switzerland",
  GB: "United Kingdom",
  PL: "Poland",
  AU: "Australia",
  NZ: "New Zealand",
  US: "United States",
};

export const PROCEDURE_TYPES: Record<Specialty, string[]> = {
  breast: [
    "Breast Reconstruction (DIEP)",
    "Breast Reconstruction (LD Flap)",
    "Breast Reconstruction (Implant)",
    "Breast Reconstruction (TRAM)",
    "Breast Reduction",
    "Mastopexy",
    "Nipple Reconstruction",
    "Fat Grafting to Breast",
    "Capsulectomy",
    "Implant Exchange",
  ],
  body_contouring: [
    "Rhinoplasty",
    "Blepharoplasty",
    "Facelift",
    "Breast Augmentation",
    "Neck Lift",
    "Brow Lift",
    "Fat Transfer",
    "Otoplasty",
    "Abdominoplasty",
    "Brachioplasty",
    "Thigh Lift",
    "Belt Lipectomy",
    "Liposuction",
    "Panniculectomy",
    "Lower Body Lift",
    "Buttock Lift",
  ],
  aesthetics: [
    "Rhinoplasty",
    "Blepharoplasty",
    "Facelift",
    "Breast Augmentation",
    "Neck Lift",
    "Brow Lift",
    "Fat Transfer",
    "Otoplasty",
    "Abdominoplasty",
    "Brachioplasty",
    "Thigh Lift",
    "Belt Lipectomy",
    "Liposuction",
    "Panniculectomy",
    "Lower Body Lift",
    "Buttock Lift",
  ],
  hand_wrist: [
    "Fracture Fixation",
    "Tendon Repair",
    "Nerve Repair",
    "Soft Tissue Reconstruction",
    "Carpal Tunnel Release",
    "Trigger Finger Release",
    "Dupuytren Fasciectomy",
    "Ganglion Excision",
    "TFCC Repair",
    "Replantation",
    "Revascularization",
  ],
  orthoplastic: [
    "Free Flap Coverage",
    "Pedicled Flap Coverage",
    "Local Flap Coverage",
    "Skin Grafting",
    "Debridement",
    "Negative Pressure Wound Therapy",
    "Limb Salvage",
    "Amputation Revision",
  ],
  burns: [
    "Skin Grafting",
    "Escharotomy",
    "Debridement",
    "Burn Reconstruction",
    "Contracture Release",
    "Laser Treatment",
  ],
  general: [
    "Excision of Lipoma",
    "Skin Lesion Excision",
    "Scar Revision",
    "Local Flap",
    "Skin Graft",
    "Debridement",
    "Abscess Incision and Drainage",
    "Foreign Body Removal",
  ],
  head_neck: [
    "Free Flap Reconstruction",
    "Pedicled Flap Reconstruction",
    "Parotidectomy",
    "Neck Dissection",
    "Facial Nerve Repair",
    "Facial Reanimation",
    "Mandible Reconstruction",
    "Lip Reconstruction",
    "Ear Reconstruction",
  ],
  cleft_cranio: [
    "Cleft Lip Repair",
    "Cleft Palate Repair",
    "Alveolar Bone Graft",
    "Craniosynostosis Surgery",
    "Le Fort Osteotomy",
    "VPI Surgery",
  ],
  skin_cancer: [
    "BCC Excision",
    "SCC Excision",
    "Melanoma Excision",
    "Wide Local Excision",
    "Mohs Defect Reconstruction",
    "Sentinel Lymph Node Biopsy",
  ],
  lymphoedema: [
    "Lymphovenous Anastomosis",
    "Vascularised Lymph Node Transfer",
    "Liposuction for Lymphoedema",
    "Debulking / Charles Procedure",
  ],
  peripheral_nerve: [
    "Nerve Graft",
    "Nerve Transfer",
    "Brachial Plexus Repair",
    "Neuroma Excision",
    "Nerve Conduit",
  ],
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export const ADMISSION_URGENCY_LABELS: Record<AdmissionUrgency, string> = {
  elective: "Elective",
  acute: "Acute",
};

export const STAY_TYPE_LABELS: Record<StayType, string> = {
  day_case: "Day Case",
  inpatient: "Inpatient",
};

export const UNPLANNED_READMISSION_LABELS: Record<
  UnplannedReadmissionReason,
  string
> = {
  no: "No",
  pain: "Yes - Pain",
  bleeding: "Yes - Bleeding",
  electrolyte_imbalance: "Yes - Electrolyte Imbalance",
  infection: "Yes - Infection",
  pulmonary_embolism: "Yes - Pulmonary Embolism",
  intra_abdominal_collection: "Yes - Intra-abdominal Collection",
  organ_failure: "Yes - Organ Failure",
  other: "Yes - Other Cause",
};

export const WOUND_INFECTION_RISK_LABELS: Record<WoundInfectionRisk, string> = {
  clean: "Clean",
  clean_contaminated: "Clean/Contaminated",
  contaminated: "Contaminated",
  dirty: "Dirty",
  na: "N/A",
};

export const ANAESTHETIC_TYPE_LABELS: Record<AnaestheticType, string> = {
  general: "General",
  local: "Local",
  regional_block: "Regional Block",
  spinal: "Spinal",
  epidural: "Epidural",
  sedation: "Sedation",
  sedation_local: "Sedation + Local",
  walant: "WALANT (Wide Awake Local Anaesthesia No Tourniquet)",
};

export const UNPLANNED_ICU_LABELS: Record<UnplannedICUReason, string> = {
  no: "No",
  localised_sepsis: "Yes - Localised Sepsis (Wound)",
  generalised_sepsis: "Yes - Generalised Sepsis",
  pneumonia: "Yes - Pneumonia",
  renal_failure: "Yes - Renal Failure",
  arrhythmia: "Yes - Arrhythmia",
  myocardial_infarction: "Yes - Myocardial Infarction",
  pulmonary_embolism: "Yes - Pulmonary Embolism",
  other: "Yes - Other Cause",
};

export const DISCHARGE_OUTCOME_LABELS: Record<DischargeOutcome, string> = {
  died: "Died",
  discharged_home: "Discharged Home",
  discharged_care: "Discharged for Care or Respite",
  transferred_complex_care: "Transferred for More Complex Care",
  absconded: "Absconded/Took Own Discharge",
  referred_other_services: "Referred to Other Services",
};

export const MORTALITY_CLASSIFICATION_LABELS: Record<
  MortalityClassification,
  string
> = {
  expected: "Expected",
  unexpected: "Unexpected",
  not_applicable: "Not Applicable",
};

export const CLAVIEN_DINDO_LABELS: Record<ClavienDindoGrade, string> = {
  none: "No Complication",
  I: "Grade I - Minor deviation",
  II: "Grade II - Pharmacological treatment",
  IIIa: "Grade IIIa - Intervention without GA",
  IIIb: "Grade IIIb - Intervention under GA",
  IVa: "Grade IVa - Single organ dysfunction",
  IVb: "Grade IVb - Multi-organ dysfunction",
  V: "Grade V - Death",
};

export const ETHNICITY_OPTIONS: { value: string; label: string }[] = [
  { value: "nz_european", label: "NZ European" },
  { value: "maori", label: "Maori" },
  { value: "pacific_islander", label: "Pacific Islander" },
  { value: "asian", label: "Asian" },
  { value: "middle_eastern", label: "Middle Eastern" },
  { value: "african", label: "African" },
  { value: "latin_american", label: "Latin American" },
  { value: "european", label: "European" },
  { value: "south_asian", label: "South Asian" },
  { value: "southeast_asian", label: "Southeast Asian" },
  { value: "east_asian", label: "East Asian" },
  { value: "other", label: "Other" },
  { value: "not_stated", label: "Not Stated" },
];

export const ASA_GRADE_LABELS: Record<ASAScore, string> = {
  1: "I - Normal Healthy Patient",
  2: "II - Mild Systemic Disease",
  3: "III - Severe Systemic Disease",
  4: "IV - Severe Systemic Disease (Constant Threat to Life)",
  5: "V - Moribund Patient",
  6: "VI - Brain-Dead Organ Donor",
};

export function getAllProcedures(c: Case): CaseProcedure[] {
  return (c.diagnosisGroups ?? []).flatMap((g) => g.procedures ?? []);
}

export function getCaseSpecialties(c: Case): Specialty[] {
  const specialties = new Set<Specialty>([c.specialty]);
  for (const group of c.diagnosisGroups ?? []) {
    specialties.add(group.specialty);
  }
  return Array.from(specialties);
}

export function getPrimaryDiagnosisName(c: Case): string | undefined {
  return (c.diagnosisGroups ?? [])[0]?.diagnosis?.displayName;
}

/**
 * Resolve the effective case status with backward-compatible fallback.
 * Older cases may not have caseStatus set — derive from discharge state.
 */
export function resolvedCaseStatus(c: Case): CaseStatus {
  if (c.caseStatus) return c.caseStatus;
  return c.dischargeDate ? "discharged" : "active";
}

export function isPlannedCase(c: Case): boolean {
  return c.caseStatus === "planned";
}

export function getAllLesionInstances(c: Case): LesionInstance[] {
  return (c.diagnosisGroups ?? []).flatMap((g) => g.lesionInstances ?? []);
}

export function getExcisionCount(c: Case): number {
  const lesionCount = getAllLesionInstances(c).length;
  const nonLesionProcedures = (c.diagnosisGroups ?? [])
    .filter((g) => !g.isMultiLesion)
    .flatMap((g) => g.procedures ?? []).length;
  return lesionCount + nonLesionProcedures;
}

export function getPrimaryLaterality(c: Case): Laterality | undefined {
  return (c.diagnosisGroups ?? [])[0]?.diagnosisClinicalDetails?.laterality;
}

export function getPrimarySiteLabel(c: Case): string | null {
  const group = (c.diagnosisGroups ?? [])[0];
  if (!group) return null;
  const laterality = group.diagnosisClinicalDetails?.laterality;
  const side =
    laterality === "left"
      ? "Left"
      : laterality === "right"
        ? "Right"
        : laterality === "bilateral"
          ? "Bilateral"
          : null;
  const lesionSite = group.lesionInstances?.[0]?.site;
  if (side && lesionSite) return `${side} ${lesionSite}`;
  if (lesionSite) return lesionSite;
  if (side) return side;
  return null;
}

/**
 * Calculate age in whole years from a YYYY-MM-DD date of birth.
 * Uses parseDateOnlyValue for timezone-safe parsing.
 * Returns undefined if dob is missing or invalid.
 */
export function calculateAgeFromDob(
  dob: string | undefined,
  referenceDate?: Date,
): number | undefined {
  if (!dob) return undefined;
  const birthDate = parseDateOnlyValue(dob);
  if (!birthDate) return undefined;
  const ref = referenceDate ?? new Date();
  let age = ref.getFullYear() - birthDate.getFullYear();
  const monthDiff = ref.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && ref.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age >= 0 ? age : undefined;
}

/**
 * Get display name for a patient from their identity fields.
 * Returns "First Last", "First", "Last", or undefined.
 */
export function getPatientDisplayName(c: {
  patientFirstName?: string;
  patientLastName?: string;
}): string | undefined {
  const parts = [c.patientFirstName, c.patientLastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export const COMMON_COMORBIDITIES: SnomedCodedItem[] = [
  { snomedCtCode: "84114007", displayName: "Acquired Brain Injury" },
  { snomedCtCode: "49436004", displayName: "Atrial Fibrillation (AF)" },
  { snomedCtCode: "7200002", displayName: "Alcohol Abuse" },
  { snomedCtCode: "26929004", displayName: "Alzheimer's Disease" },
  { snomedCtCode: "87522002", displayName: "Anaemia - Blood Loss" },
  { snomedCtCode: "271737000", displayName: "Anaemia - Deficiency" },
  { snomedCtCode: "194828000", displayName: "Angina Pectoris" },
  { snomedCtCode: "48694002", displayName: "Anxiety" },
  { snomedCtCode: "195967001", displayName: "Asthma" },
  { snomedCtCode: "73211009", displayName: "Diabetes Mellitus" },
  { snomedCtCode: "38341003", displayName: "Hypertension" },
  { snomedCtCode: "13645005", displayName: "COPD" },
  { snomedCtCode: "84757009", displayName: "Epilepsy" },
  { snomedCtCode: "22298006", displayName: "Myocardial Infarction (Previous)" },
  { snomedCtCode: "230690007", displayName: "Stroke (Previous)" },
  { snomedCtCode: "90708001", displayName: "Kidney Disease" },
  { snomedCtCode: "235856003", displayName: "Liver Disease" },
  { snomedCtCode: "36971009", displayName: "Sinusitis" },
  { snomedCtCode: "35489007", displayName: "Depression" },
  { snomedCtCode: "414545008", displayName: "Ischaemic Heart Disease" },
  { snomedCtCode: "84027008", displayName: "Heart Failure" },
  { snomedCtCode: "59621000", displayName: "Hypertension Essential" },
  { snomedCtCode: "40930008", displayName: "Hypothyroidism" },
  { snomedCtCode: "34486009", displayName: "Hyperthyroidism" },
  { snomedCtCode: "64859006", displayName: "Osteoporosis" },
  { snomedCtCode: "396275006", displayName: "Osteoarthritis" },
  { snomedCtCode: "69896004", displayName: "Rheumatoid Arthritis" },
  { snomedCtCode: "363346000", displayName: "Malignancy (Active)" },
  { snomedCtCode: "414916001", displayName: "Obesity" },
  { snomedCtCode: "59282003", displayName: "Pulmonary Embolism (Previous)" },
  { snomedCtCode: "128053003", displayName: "Deep Vein Thrombosis (Previous)" },
];
