/**
 * Breast Surgery Module — Type Definitions
 *
 * Per-side data model: every breast field is captured independently for left and right.
 * Modules (implant, flap, lipofilling, etc.) auto-activate based on procedure type.
 *
 * @see breast-module-blueprint.md for architecture decisions
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE BREAST ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

export type BreastClinicalContext =
  | "reconstructive"
  | "aesthetic"
  | "gender_affirming";

export const BREAST_CLINICAL_CONTEXT_LABELS: Record<
  BreastClinicalContext,
  string
> = {
  reconstructive: "Reconstructive",
  aesthetic: "Aesthetic",
  gender_affirming: "Gender-Affirming",
};

export type BreastLaterality = "left" | "right";

export interface BreastAssessmentData {
  /** Which side(s) this case involves */
  laterality: "left" | "right" | "bilateral";
  /** Independent per-side data */
  sides: {
    left?: BreastSideAssessment;
    right?: BreastSideAssessment;
  };
  /** Optional link to a reconstruction episode */
  reconstructionEpisodeId?: string;
  /** Shared lipofilling data with per-side injection payloads */
  lipofilling?: LipofillingData;
  /** Case-level liposuction data (shared across sides) */
  liposuction?: LiposuctionData;
}

export interface BreastSideAssessment {
  side: BreastLaterality;
  clinicalContext: BreastClinicalContext;

  // ── Reconstructive context fields ──
  reconstructionTiming?: BreastReconTiming;
  priorRadiotherapy?: boolean;
  priorChemotherapy?: boolean;
  priorReconstructionType?: PriorReconstructionType;
  mdtDiscussed?: boolean;

  // ── Gender-affirming context fields ──
  genderAffirmingContext?: GenderAffirmingContext;

  // ── Module data (populated by specialty cards in Phase 3+) ──
  implantDetails?: ImplantDetailsData;
  flapDetails?: BreastFlapDetailsData;
  chestMasculinisation?: ChestMasculinisationData;
  nippleDetails?: NippleDetailsData;
}

// Note: Case-level ReconstructionTiming from free-flap-registry-upgrade-v3
// has 5 values (immediate, delayed_immediate, delayed, secondary, salvage).
// Breast per-side timing uses a 3-value subset for clarity.
export type BreastReconTiming = "immediate" | "delayed_immediate" | "delayed";

export const BREAST_RECON_TIMING_LABELS: Record<BreastReconTiming, string> = {
  immediate: "Immediate (at mastectomy)",
  delayed_immediate:
    "Delayed-Immediate (expander at mastectomy, definitive later)",
  delayed: "Delayed (separate operation)",
};

export type PriorReconstructionType =
  | "none"
  | "implant"
  | "expander"
  | "autologous"
  | "combined"
  | "failed_implant"
  | "failed_autologous";

export const PRIOR_RECONSTRUCTION_LABELS: Record<
  PriorReconstructionType,
  string
> = {
  none: "None / Primary",
  implant: "Prior implant reconstruction",
  expander: "Expander in situ",
  autologous: "Prior autologous reconstruction",
  combined: "Prior combined (autologous + implant)",
  failed_implant: "Failed implant reconstruction",
  failed_autologous: "Failed autologous reconstruction",
};

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLANT DETAILS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImplantDetailsData {
  deviceType?: ImplantDeviceType;
  manufacturer?: string;
  productName?: string;
  catalogReference?: string;
  serialNumber?: string;
  lotNumber?: string;
  udi?: string;

  volumeCc?: number;
  shellSurface?: ImplantSurface;
  fillMaterial?: ImplantFill;
  shape?: ImplantShape;
  profile?: ImplantProfile;
  shellType?: ImplantShellType;

  implantPlane?: ImplantPlane;
  dualPlaneType?: DualPlaneType;
  incisionSite?: ImplantIncision;

  admUsed?: boolean;
  admDetails?: AdmDetails;

  expanderMaxVolumeCc?: number;
  expanderIntraopFillCc?: number;
  expanderTargetFillCc?: number;
  expanderPortType?: ExpanderPortType;

  antibiotic14PointPlan?: boolean;
  gloveChangePriorToInsertion?: boolean;
  deliverySleeveOrFunnel?: boolean;
  pocketRinseSolution?: PocketRinse;
  occlusiveNippleShield?: boolean;
  drainUsed?: boolean;

  sizerUsed?: boolean;
  sizerSizeCc?: number;
}

export type ImplantDeviceType =
  | "permanent_implant"
  | "tissue_expander"
  | "expander_implant";

export const IMPLANT_DEVICE_TYPE_LABELS: Record<ImplantDeviceType, string> = {
  permanent_implant: "Permanent Implant",
  tissue_expander: "Tissue Expander",
  expander_implant: "Expander-Implant (Becker type)",
};

export type ImplantSurface =
  | "smooth"
  | "microtextured"
  | "macrotextured"
  | "polyurethane"
  | "nanotextured";

export const IMPLANT_SURFACE_LABELS: Record<ImplantSurface, string> = {
  smooth: "Smooth",
  microtextured: "Microtextured",
  macrotextured: "Macrotextured",
  polyurethane: "Polyurethane-coated",
  nanotextured: "Nanotextured (SilkSurface / VelvetSurface)",
};

export type ImplantFill =
  | "silicone_standard"
  | "silicone_highly_cohesive"
  | "saline"
  | "structured_saline"
  | "composite";

export const IMPLANT_FILL_LABELS: Record<ImplantFill, string> = {
  silicone_standard: "Silicone Gel",
  silicone_highly_cohesive: "Highly Cohesive Silicone (form-stable)",
  saline: "Saline",
  structured_saline: "Structured Saline (IDEAL)",
  composite: "Composite / Adjustable",
};

export type ImplantShape = "round" | "anatomical";
export const IMPLANT_SHAPE_LABELS: Record<ImplantShape, string> = {
  round: "Round",
  anatomical: "Anatomical",
};

export type ImplantProfile =
  | "low"
  | "moderate"
  | "moderate_plus"
  | "high"
  | "extra_high";

export const IMPLANT_PROFILE_LABELS: Record<ImplantProfile, string> = {
  low: "Low",
  moderate: "Moderate",
  moderate_plus: "Moderate Plus",
  high: "High / Full",
  extra_high: "Extra High / Extra Full",
};

export type ImplantShellType = "single_lumen" | "dual_lumen";

export const IMPLANT_SHELL_TYPE_LABELS: Record<ImplantShellType, string> = {
  single_lumen: "Single Lumen",
  dual_lumen: "Dual Lumen",
};

export type DualPlaneType = "I" | "II" | "III";

export const DUAL_PLANE_TYPE_LABELS: Record<DualPlaneType, string> = {
  I: "Type I",
  II: "Type II",
  III: "Type III",
};

export type ImplantPlane =
  | "subglandular"
  | "subfascial"
  | "subpectoral"
  | "dual_plane"
  | "prepectoral";

export const IMPLANT_PLANE_LABELS: Record<ImplantPlane, string> = {
  subglandular: "Subglandular",
  subfascial: "Subfascial",
  subpectoral: "Subpectoral (total submuscular)",
  dual_plane: "Dual Plane",
  prepectoral: "Prepectoral",
};

export type ImplantIncision =
  | "inframammary"
  | "periareolar"
  | "axillary"
  | "mastectomy_wound"
  | "mastopexy_pattern";

export const IMPLANT_INCISION_LABELS: Record<ImplantIncision, string> = {
  inframammary: "Inframammary fold",
  periareolar: "Periareolar",
  axillary: "Axillary (transaxillary)",
  mastectomy_wound: "Mastectomy wound",
  mastopexy_pattern: "Mastopexy pattern incision",
};

export type ExpanderPortType =
  | "integrated_magnetic"
  | "integrated_rfid"
  | "remote"
  | "external";

export const EXPANDER_PORT_TYPE_LABELS: Record<ExpanderPortType, string> = {
  integrated_magnetic: "Integrated Magnetic (AllerganPort)",
  integrated_rfid: "Integrated RFID (AirXpander)",
  remote: "Remote Port",
  external: "External Fill Tube",
};

export type PocketRinse =
  | "none"
  | "saline_only"
  | "betadine"
  | "triple_antibiotic"
  | "adams_solution"
  | "other";

export const POCKET_RINSE_LABELS: Record<PocketRinse, string> = {
  none: "None",
  saline_only: "Saline only",
  betadine: "Betadine (povidone-iodine)",
  triple_antibiotic: "Triple antibiotic solution",
  adams_solution: "Adams solution (betadine + cefazolin + gentamicin)",
  other: "Other",
};

export interface AdmDetails {
  productName?: string;
  manufacturer?: string;
  origin?: AdmOrigin;
  position?: AdmPosition;
}

export type AdmOrigin =
  | "human_allograft"
  | "porcine_xenograft"
  | "bovine_xenograft"
  | "synthetic_absorbable"
  | "synthetic_nonabsorbable"
  | "other";

export const ADM_ORIGIN_LABELS: Record<AdmOrigin, string> = {
  human_allograft: "Human Allograft (ADM)",
  porcine_xenograft: "Porcine Xenograft",
  bovine_xenograft: "Bovine Xenograft",
  synthetic_absorbable: "Synthetic Absorbable",
  synthetic_nonabsorbable: "Synthetic Non-Absorbable",
  other: "Other",
};

export type AdmPosition =
  | "inferior_sling"
  | "anterior_wrap"
  | "total_wrap"
  | "partial_coverage";

export const ADM_POSITION_LABELS: Record<AdmPosition, string> = {
  inferior_sling: "Inferior Pole Sling",
  anterior_wrap: "Anterior Coverage / Wrap",
  total_wrap: "Total Wrap",
  partial_coverage: "Partial Coverage",
};

// ═══════════════════════════════════════════════════════════════════════════════
// BREAST FLAP DETAILS (extends existing FreeFlapDetails)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BreastFlapDetailsData {
  perforators?: PerforatorEntry[];
  recipientArtery?: BreastRecipientArtery;
  recipientVein?: BreastRecipientVein;
  imaInterspace?: ImaInterspace;
  ribManagement?: RibManagement;
  arterialTechnique?: AnastomosisTechnique;
  venousTechnique?: AnastomosisTechnique;
  venousCouplerUsed?: boolean;
  venousCouplerSizeMm?: number;
  numberOfVenousAnastomoses?: 1 | 2;
  sievSupercharging?: boolean;
  flapWeightGrams?: number;
  skinPaddleDimensions?: { lengthCm?: number; widthCm?: number };
  dieaBranchingPattern?: DieaBranchingPattern;
  fascialClosureMethod?: FascialClosureMethod;
  meshReinforcement?: boolean;
  meshType?: string;
  umbilicoplasty?: boolean;
  thoracodorsalNerve?: ThoracodorsalNerveManagement;
  quiltingSutures?: boolean;
}

export interface PerforatorEntry {
  id: string;
  row?: PerforatorRow;
  calibreMm?: number;
  type?: PerforatorType;
  intramuscularCourse?: IntramuscularCourse;
}

export type PerforatorRow = "medial" | "lateral";

export const PERFORATOR_ROW_LABELS: Record<PerforatorRow, string> = {
  medial: "Medial Row",
  lateral: "Lateral Row",
};

export type PerforatorType = "musculocutaneous" | "septocutaneous";

export const PERFORATOR_TYPE_LABELS: Record<PerforatorType, string> = {
  musculocutaneous: "Musculocutaneous",
  septocutaneous: "Septocutaneous",
};

export type IntramuscularCourse = "short_direct" | "long_oblique";

export const INTRAMUSCULAR_COURSE_LABELS: Record<IntramuscularCourse, string> =
  {
    short_direct: "Short / Direct",
    long_oblique: "Long / Oblique",
  };

export type BreastRecipientArtery =
  | "ima"
  | "ima_perforator"
  | "thoracodorsal"
  | "circumflex_scapular"
  | "lateral_thoracic"
  | "other";

export const BREAST_RECIPIENT_ARTERY_LABELS: Record<
  BreastRecipientArtery,
  string
> = {
  ima: "Internal Mammary Artery",
  ima_perforator: "IMA Perforator (rib-sparing)",
  thoracodorsal: "Thoracodorsal Artery",
  circumflex_scapular: "Circumflex Scapular Artery",
  lateral_thoracic: "Lateral Thoracic Artery",
  other: "Other",
};

export type BreastRecipientVein =
  | "imv"
  | "imv_perforator"
  | "thoracodorsal"
  | "cephalic"
  | "other";

export const BREAST_RECIPIENT_VEIN_LABELS: Record<BreastRecipientVein, string> =
  {
    imv: "Internal Mammary Vein",
    imv_perforator: "IMV Perforator",
    thoracodorsal: "Thoracodorsal Vein",
    cephalic: "Cephalic Vein",
    other: "Other",
  };

export type ImaInterspace = "2nd" | "3rd" | "4th";

export const IMA_INTERSPACE_LABELS: Record<ImaInterspace, string> = {
  "2nd": "2nd Interspace",
  "3rd": "3rd Interspace",
  "4th": "4th Interspace",
};

export type RibManagement =
  | "total_preservation"
  | "partial_removal"
  | "full_segment_removal";

export const RIB_MANAGEMENT_LABELS: Record<RibManagement, string> = {
  total_preservation: "Rib cartilage totally preserved",
  partial_removal: "Partial rib cartilage removal",
  full_segment_removal: "Full rib cartilage segment removed",
};

export type AnastomosisTechnique =
  | "end_to_end_handsewn"
  | "end_to_side_handsewn"
  | "coupler"
  | "end_to_end_coupler";

export const ANASTOMOSIS_TECHNIQUE_LABELS: Record<
  AnastomosisTechnique,
  string
> = {
  end_to_end_handsewn: "End-to-End (handsewn)",
  end_to_side_handsewn: "End-to-Side (handsewn)",
  coupler: "Coupler",
  end_to_end_coupler: "End-to-End (coupler-assisted)",
};

export type DieaBranchingPattern = "type_1" | "type_2" | "type_3" | "unknown";

export const DIEA_BRANCHING_LABELS: Record<DieaBranchingPattern, string> = {
  type_1: "Type 1 (single dominant)",
  type_2: "Type 2 (bifurcating)",
  type_3: "Type 3 (trifurcating)",
  unknown: "Unknown / Not assessed",
};

export type FascialClosureMethod =
  | "primary"
  | "mesh_onlay"
  | "mesh_sublay"
  | "mesh_inlay"
  | "component_separation";

export const FASCIAL_CLOSURE_LABELS: Record<FascialClosureMethod, string> = {
  primary: "Primary Closure",
  mesh_onlay: "Mesh Onlay",
  mesh_sublay: "Mesh Sublay (retromuscular)",
  mesh_inlay: "Mesh Inlay (bridging)",
  component_separation: "Component Separation",
};

export type ThoracodorsalNerveManagement =
  | "preserved"
  | "divided"
  | "partial_neurectomy";

export const THORACODORSAL_NERVE_LABELS: Record<
  ThoracodorsalNerveManagement,
  string
> = {
  preserved: "Preserved",
  divided: "Divided",
  partial_neurectomy: "Partial Neurectomy",
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIPOFILLING
// ═══════════════════════════════════════════════════════════════════════════════

export interface LipofillingData {
  harvestSites?: LipofillingHarvestSite[];
  totalVolumeHarvestedMl?: number;
  harvestTechnique?: LipofillingHarvestTechnique;
  cannulaSizeMm?: number;
  tumescentUsed?: boolean;
  tumescentVolumeMl?: number;

  processingMethod?: LipofillingProcessingMethod;
  centrifugationRpm?: number;
  centrifugationMinutes?: number;
  volumeAfterProcessingMl?: number;
  additives?: LipofillingAdditive[];

  injections?: Partial<Record<BreastLaterality, LipofillingInjectionSide>>;

  sessionNumber?: number;
  intervalFromPreviousMonths?: number;
  indication?: LipofillingIndication;
  context?: LipofillingContext;
}

export interface LipofillingInjectionSide {
  volumeInjectedMl?: number;
  injectionTechnique?: LipofillingInjectionTechnique;
  injectionPlanes?: LipofillingInjectionPlane[];
  recipientSiteCondition?: RecipientSiteCondition;
}

export type LipofillingHarvestTechnique =
  | "coleman_syringe"
  | "power_assisted"
  | "vaser"
  | "water_assisted"
  | "standard_suction"
  | "other";

export const HARVEST_TECHNIQUE_LABELS: Record<
  LipofillingHarvestTechnique,
  string
> = {
  coleman_syringe: "Coleman Syringe (manual)",
  power_assisted: "Power-Assisted Liposuction (PAL)",
  vaser: "VASER Ultrasound-Assisted",
  water_assisted: "Water-Assisted (WAL / BodyJet)",
  standard_suction: "Standard Suction Cannula",
  other: "Other",
};

export type LipofillingProcessingMethod =
  | "coleman_centrifuge"
  | "puregraft"
  | "revolve"
  | "telfa_decanting"
  | "gravity_sedimentation"
  | "filtration"
  | "other";

export const PROCESSING_METHOD_LABELS: Record<
  LipofillingProcessingMethod,
  string
> = {
  coleman_centrifuge: "Coleman Centrifugation (3000 RPM × 3 min)",
  puregraft: "PureGraft (filtration)",
  revolve: "REVOLVE System",
  telfa_decanting: "Telfa / Decanting",
  gravity_sedimentation: "Gravity Sedimentation",
  filtration: "Other Filtration",
  other: "Other",
};

export type LipofillingHarvestSite =
  | "abdomen"
  | "flanks"
  | "inner_thigh"
  | "outer_thigh"
  | "buttocks"
  | "arms"
  | "back"
  | "other";

export const HARVEST_SITE_LABELS: Record<LipofillingHarvestSite, string> = {
  abdomen: "Abdomen",
  flanks: "Flanks / Love Handles",
  inner_thigh: "Inner Thigh",
  outer_thigh: "Outer Thigh",
  buttocks: "Buttocks",
  arms: "Arms",
  back: "Back",
  other: "Other",
};

export type LipofillingAdditive = "none" | "prp" | "prf" | "svf" | "ascs";

export const LIPOFILLING_ADDITIVE_LABELS: Record<LipofillingAdditive, string> =
  {
    none: "None",
    prp: "PRP (Platelet-Rich Plasma)",
    prf: "PRF (Platelet-Rich Fibrin)",
    svf: "SVF (Stromal Vascular Fraction)",
    ascs: "ASCs (Adipose Stem Cells)",
  };

export type LipofillingInjectionTechnique =
  | "microdroplet"
  | "threading"
  | "fan_pattern"
  | "multiplane";

export const LIPOFILLING_INJECTION_TECHNIQUE_LABELS: Record<
  LipofillingInjectionTechnique,
  string
> = {
  microdroplet: "Microdroplet",
  threading: "Threading / Linear",
  fan_pattern: "Fan Pattern",
  multiplane: "Multiplane",
};

export type LipofillingInjectionPlane =
  | "subcutaneous"
  | "intramuscular"
  | "subglandular"
  | "prepectoral";

export const LIPOFILLING_INJECTION_PLANE_LABELS: Record<
  LipofillingInjectionPlane,
  string
> = {
  subcutaneous: "Subcutaneous",
  intramuscular: "Intramuscular",
  subglandular: "Subglandular",
  prepectoral: "Prepectoral",
};

export type RecipientSiteCondition =
  | "native"
  | "irradiated"
  | "scarred"
  | "previously_reconstructed";

export const RECIPIENT_SITE_CONDITION_LABELS: Record<
  RecipientSiteCondition,
  string
> = {
  native: "Native (no prior surgery)",
  irradiated: "Irradiated",
  scarred: "Scarred",
  previously_reconstructed: "Previously Reconstructed",
};

export type LipofillingIndication =
  | "contour_correction"
  | "volume_restoration"
  | "skin_quality_improvement"
  | "rippling_correction"
  | "symmetrisation"
  | "primary_reconstruction"
  | "aesthetic_augmentation";

export const LIPOFILLING_INDICATION_LABELS: Record<
  LipofillingIndication,
  string
> = {
  contour_correction: "Contour Correction",
  volume_restoration: "Volume Restoration",
  skin_quality_improvement: "Skin Quality Improvement",
  rippling_correction: "Rippling Correction",
  symmetrisation: "Symmetrisation",
  primary_reconstruction: "Primary Reconstruction",
  aesthetic_augmentation: "Aesthetic Augmentation",
};

export type LipofillingContext =
  | "adjunct_to_implant"
  | "adjunct_to_flap"
  | "adjunct_to_bct"
  | "primary_reconstruction"
  | "standalone_aesthetic"
  | "revision";

export const LIPOFILLING_CONTEXT_LABELS: Record<LipofillingContext, string> = {
  adjunct_to_implant: "Adjunct to Implant Reconstruction",
  adjunct_to_flap: "Adjunct to Flap Reconstruction",
  adjunct_to_bct: "Adjunct to Breast-Conserving Therapy",
  primary_reconstruction: "Primary Fat-Only Reconstruction",
  standalone_aesthetic: "Standalone Aesthetic",
  revision: "Revision / Touch-up",
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIPOSUCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface LiposuctionData {
  technique?: LiposuctionTechnique;
  wettingTechnique?: WettingTechnique;
  areas?: LiposuctionArea[];
  totalAspirateMl?: number;
  tumescentVolumeMl?: number;
}

export interface LiposuctionArea {
  site: LipofillingHarvestSite;
  volumeAspirateMl?: number;
}

export type LiposuctionTechnique = "sal" | "pal" | "vaser" | "lal" | "wal";

export const LIPOSUCTION_TECHNIQUE_LABELS: Record<
  LiposuctionTechnique,
  string
> = {
  sal: "SAL (Suction-Assisted)",
  pal: "PAL (Power-Assisted)",
  vaser: "VASER (Ultrasound-Assisted)",
  lal: "LAL (Laser-Assisted)",
  wal: "WAL (Water-Assisted)",
};

export type WettingTechnique = "dry" | "wet" | "superwet" | "tumescent";

export const WETTING_TECHNIQUE_LABELS: Record<WettingTechnique, string> = {
  dry: "Dry",
  wet: "Wet",
  superwet: "Super-wet",
  tumescent: "Tumescent",
};

// ═══════════════════════════════════════════════════════════════════════════════
// GENDER-AFFIRMING
// ═══════════════════════════════════════════════════════════════════════════════

export interface GenderAffirmingContext {
  genderIdentity?: string;
  sexAssignedAtBirth?: "male" | "female" | "intersex";
  hormoneTherapyStatus?: HormoneTherapyStatus;
  hormoneType?: "testosterone" | "estrogen_antiandrogen" | "other";
  hormoneTherapyDurationMonths?: number;
  bindingHistory?: boolean;
  wpath8CriteriaMet?: boolean;
  mentalHealthAssessmentCompleted?: boolean;
}

export type HormoneTherapyStatus = "current" | "prior" | "never" | "unknown";

export interface ChestMasculinisationData {
  technique?: ChestMasculinisationTechnique;
  nacManagement?: NacManagement;
  nacTargetDiameterMm?: number;
  nacFinalPosition?: { xCm?: number; yCm?: number };
  specimenWeightLeftGrams?: number;
  specimenWeightRightGrams?: number;
  adjunctiveLiposuction?: boolean;
  pathologySent?: boolean;
}

export type ChestMasculinisationTechnique =
  | "double_incision_fng"
  | "periareolar"
  | "keyhole"
  | "inverted_t"
  | "buttonhole"
  | "other";

export const CHEST_MASC_TECHNIQUE_LABELS: Record<
  ChestMasculinisationTechnique,
  string
> = {
  double_incision_fng: "Double Incision + Free Nipple Graft",
  periareolar: "Periareolar / Circumareolar",
  keyhole: "Keyhole (periareolar pull-through)",
  inverted_t: "Inverted-T",
  buttonhole: "Buttonhole (inferior pedicle NAC preservation)",
  other: "Other",
};

export type NacManagement =
  | "free_nipple_graft"
  | "pedicled"
  | "removed"
  | "tattoo_planned"
  | "not_applicable";

export const NAC_MANAGEMENT_LABELS: Record<NacManagement, string> = {
  free_nipple_graft: "Free Nipple Graft",
  pedicled: "Pedicled NAC",
  removed: "Removed / Discarded",
  tattoo_planned: "Tattoo Planned",
  not_applicable: "N/A",
};

// ═══════════════════════════════════════════════════════════════════════════════
// NIPPLE DETAILS (minimal)
// ═══════════════════════════════════════════════════════════════════════════════

export interface NippleDetailsData {
  technique?: NippleReconTechnique;
  nacPosition?: { xCm?: number; yCm?: number };
}

export type NippleReconTechnique =
  | "cv_flap"
  | "skate_flap"
  | "star_flap"
  | "tattooing_only"
  | "three_d_tattoo"
  | "prosthetic"
  | "other";

export const NIPPLE_RECON_TECHNIQUE_LABELS: Record<
  NippleReconTechnique,
  string
> = {
  cv_flap: "C-V flap",
  skate_flap: "Skate flap",
  star_flap: "Star flap",
  tattooing_only: "Tattooing only",
  three_d_tattoo: "3D tattoo",
  prosthetic: "Prosthetic nipple",
  other: "Other",
};

// ═══════════════════════════════════════════════════════════════════════════════
// RECONSTRUCTION EPISODE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface BreastReconstructionMeta {
  laterality: "left" | "right" | "bilateral";
  primaryReconstructionType?: BreastReconPrimaryType;
  timingClassification?: BreastReconTiming;
  radiationStatus?: RadiationStatus;
  reconEpisodeStatus?: ReconEpisodeStatus;
}

export type BreastReconPrimaryType =
  | "autologous_diep"
  | "autologous_tram"
  | "autologous_ld"
  | "autologous_other"
  | "implant_two_stage"
  | "implant_dti"
  | "combined_autologous_implant"
  | "fat_only";

export type RadiationStatus =
  | "none"
  | "pre_reconstruction"
  | "post_reconstruction"
  | "planned";

export type ReconEpisodeStatus =
  | "primary_reconstruction"
  | "expansion_phase"
  | "awaiting_exchange"
  | "secondary_procedures"
  | "nipple_reconstruction"
  | "revision_phase"
  | "completed";

export type BreastReconStageType =
  | "primary_reconstruction"
  | "expansion_fill"
  | "implant_exchange"
  | "autologous_revision"
  | "fat_grafting"
  | "nipple_reconstruction"
  | "nipple_tattoo"
  | "symmetrisation"
  | "scar_revision"
  | "donor_site_revision"
  | "complication_management"
  | "explant_capsulectomy";
