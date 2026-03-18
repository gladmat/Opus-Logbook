// client/types/aesthetics.ts

// ═══════════════════════════════════════════
// INTENT & CONTEXT
// ═══════════════════════════════════════════

export type AestheticIntent =
  | "cosmetic"
  | "post_bariatric_mwl"
  | "functional_reconstructive"
  | "combined";

export type AestheticInterventionType =
  | "surgical"
  | "non_surgical_injectable"
  | "non_surgical_energy"
  | "non_surgical_skin_treatment";

// ═══════════════════════════════════════════
// ACGME TRAINING CATEGORY AUTO-MAP
// ═══════════════════════════════════════════

export type AcgmeAestheticCategory =
  | "head_neck_aesthetic" // Index, min 50
  | "breast_aesthetic" // Index, min 30 (lives in Breast module)
  | "trunk_extremity_aesthetic" // Index, min 50
  | "injectable_non_index" // Non-index, min 21
  | "laser_non_index" // Non-index, min 10
  | "other_non_index";

export type AcgmeAestheticSubcategory =
  | "facelift" // min 10
  | "blepharoplasty" // min 20
  | "rhinoplasty" // min 10
  | "brow_lift" // min 2
  | "abdominoplasty" // min 10
  | "liposuction" // min 15
  | "brachioplasty" // min 2
  | "body_lift" // min 2
  | "thighplasty" // min 2
  | "botulinum_toxin" // min 7
  | "soft_tissue_filler" // min 7
  | "autologous_fat" // min 7
  | "laser_aesthetic" // min 10 (combined aes + recon)
  | "other";

// ═══════════════════════════════════════════
// PRODUCT DATABASE TYPES
// ═══════════════════════════════════════════

export interface AestheticProduct {
  id: string;
  category: AestheticProductCategory;
  manufacturer: string;
  brandFamily: string;
  productName: string;
  activeIngredient?: string;
  regulatoryStatus: RegulatoryStatus;
  availableRegions: MarketRegion[];
}

export type AestheticProductCategory =
  | "neurotoxin"
  | "ha_filler"
  | "non_ha_filler"
  | "biostimulator"
  | "prp_system"
  | "energy_device"
  | "breast_implant"
  | "thread_lift"
  | "suture"
  | "fat_processing";

export type RegulatoryStatus =
  | "fda_approved"
  | "ce_marked"
  | "tga_approved"
  | "kfda_approved"
  | "other";
export type MarketRegion =
  | "us"
  | "eu"
  | "uk"
  | "au_nz"
  | "asia"
  | "latam"
  | "global";

// ═══════════════════════════════════════════
// NEUROTOXIN LOGGING
// ═══════════════════════════════════════════

export interface NeurotoxinDetails {
  productId: string;
  lotNumber?: string;
  totalUnits: number;
  dilutionMl?: number;
  needleGauge?: NeedleGauge;
  sites: NeurotoxinInjectionSite[];
}

export interface NeurotoxinInjectionSite {
  site: NeurotoxinSiteId;
  unitsPerSite: number;
  injectionPoints?: number;
  side?: "left" | "right" | "bilateral" | "midline";
}

export type NeurotoxinSiteId =
  | "glabella"
  | "frontalis"
  | "lateral_canthal"
  | "bunny_lines"
  | "perioral"
  | "lip_flip"
  | "mentalis"
  | "masseter"
  | "platysmal_bands"
  | "gummy_smile"
  | "nefertiti"
  | "brow_lift"
  | "axillary_hyperhidrosis"
  | "palmar_hyperhidrosis"
  | "other";

export type NeedleGauge =
  | "25G"
  | "27G"
  | "29G"
  | "30G"
  | "31G"
  | "32G"
  | "33G";

// ═══════════════════════════════════════════
// DERMAL FILLER LOGGING
// ═══════════════════════════════════════════

export interface FillerDetails {
  productId: string;
  lotNumber?: string;
  syringesUsed: number;
  volumePerSyringeMl: number;
  totalVolumeMl: number;
  injectionTool: "needle" | "cannula";
  toolGauge?: string;
  sites: FillerInjectionSite[];
  hyaluronidaseAvailable?: boolean;
}

export interface FillerInjectionSite {
  site: FillerSiteId;
  volumeMl?: number;
  side?: "left" | "right" | "bilateral" | "midline";
  technique?: FillerTechnique;
  depth?: InjectionDepth;
}

export type FillerSiteId =
  | "temples"
  | "brow"
  | "tear_trough"
  | "glabella"
  | "nose_dorsum"
  | "nose_tip"
  | "nose_radix"
  | "malar"
  | "submalar"
  | "nasolabial_folds"
  | "marionette_lines"
  | "lips_vermilion"
  | "lips_body"
  | "lips_cupids_bow"
  | "lips_philtrum"
  | "perioral"
  | "oral_commissures"
  | "chin"
  | "prejowl_sulcus"
  | "jawline_angle"
  | "jawline_body"
  | "earlobes"
  | "hands"
  | "decolletage"
  | "neck"
  | "acne_scars"
  | "other";

export type FillerTechnique =
  | "linear_threading"
  | "serial_puncture"
  | "bolus_depot"
  | "fanning"
  | "cross_hatching"
  | "retrograde_threading"
  | "microdroplet"
  | "sandwich";

export type InjectionDepth =
  | "intradermal"
  | "mid_dermal"
  | "deep_dermal"
  | "subcutaneous"
  | "supraperiosteal"
  | "submucosal";

// ═══════════════════════════════════════════
// ENERGY DEVICE LOGGING
// ═══════════════════════════════════════════

export interface EnergyDeviceDetails {
  deviceCategory: EnergyDeviceCategory;
  manufacturer: string;
  deviceModel: string;
  handpiece?: string;
  wavelengthNm?: number;
  fluenceJcm2?: number;
  pulseWidth?: string;
  spotSizeMm?: number;
  repetitionRateHz?: number;
  numberOfPasses?: number;
  coverageDensityPercent?: number;
  totalEnergyDelivered?: string;
  needleDepthMm?: number;
  rfEnergyLevel?: number;
  pinCount?: number;
  tipType?: "insulated" | "non_insulated" | "semi_insulated";
  transducerDepthMm?: number;
  linesPerZone?: number;
  energyPerLineJ?: number;
  applicatorType?: string;
  treatmentTimeMin?: number;
  treatmentTemperatureC?: number;
  treatmentAreas: string[];
  skinType?: FitzpatrickType;
  coolingMethod?: CoolingMethod;
  endpointObserved?: TreatmentEndpoint[];
  anesthesia?: AestheticAnesthesia;
}

export type EnergyDeviceCategory =
  | "ablative_laser"
  | "fractional_nonablative_laser"
  | "hybrid_fractional"
  | "vascular_laser"
  | "pigment_laser"
  | "picosecond_laser"
  | "hair_removal_laser"
  | "rf_microneedling"
  | "monopolar_rf"
  | "hifu_ultrasound"
  | "ipl"
  | "cryolipolysis"
  | "plasma"
  | "emsculpt_hifem"
  | "led"
  | "other";

export type FitzpatrickType = "I" | "II" | "III" | "IV" | "V" | "VI";

export type CoolingMethod =
  | "dcd_cryogen"
  | "contact_sapphire"
  | "contact_chill_tip"
  | "air_cooling"
  | "zimmer_cryo"
  | "vacuum_assist"
  | "ice_plus"
  | "none";

export type TreatmentEndpoint =
  | "erythema_mild"
  | "erythema_moderate"
  | "erythema_severe"
  | "frosting_level_1"
  | "frosting_level_2"
  | "frosting_level_3"
  | "purpura"
  | "pinpoint_bleeding"
  | "edema"
  | "whitening"
  | "mends"
  | "perifollicular_edema"
  | "none";

export type AestheticAnesthesia =
  | "none"
  | "topical_numbing"
  | "nerve_block"
  | "tumescent"
  | "iv_sedation"
  | "general"
  | "product_contains_lidocaine";

// ═══════════════════════════════════════════
// BIOSTIMULATOR & PRP
// ═══════════════════════════════════════════

export interface BiostimulatorDetails {
  productId: string;
  numberOfVials: number;
  reconstitutionProtocol?: string;
  dilutionRatio?: string;
  totalVolumeMl: number;
  sites: string[];
  technique?: FillerTechnique;
  sessionNumberInSeries?: number;
  totalSessionsPlanned?: number;
}

export interface PrpDetails {
  system: string;
  bloodDrawVolumeMl: number;
  centrifugeRpm?: number;
  centrifugeTimeMin?: number;
  prpYieldVolumeMl?: number;
  plateletConcentrationFactor?: string;
  additives?: string[];
  recipientSites: string[];
  volumePerSiteMl?: number;
}

// ═══════════════════════════════════════════
// THREAD LIFT
// ═══════════════════════════════════════════

export interface ThreadLiftDetails {
  productId: string;
  material: "pdo" | "plla" | "pcl";
  threadType:
    | "mono"
    | "screw"
    | "cog_unidirectional"
    | "cog_bidirectional"
    | "mesh"
    | "cone";
  threadGauge?: string;
  threadLengthCm?: number;
  insertionNeedleGauge?: string;
  threadsPerSide?: number;
  totalThreads: number;
  treatmentArea: string;
  anchoringTechnique?: string;
  bilateral?: boolean;
}

// ═══════════════════════════════════════════
// FAT GRAFTING (AESTHETIC CONTEXT)
// ═══════════════════════════════════════════

export interface AestheticFatGraftingDetails {
  harvestSite: string;
  harvestTechnique:
    | "coleman_syringe"
    | "pal"
    | "vaser"
    | "wal"
    | "standard_cannula";
  harvestCannulaSpec?: string;
  tumescentUsed: boolean;
  totalAspirateMl?: number;
  processingMethod:
    | "centrifugation"
    | "filtration_revolve"
    | "filtration_puregraft"
    | "decantation"
    | "nanofat";
  centrifugeRpm?: number;
  centrifugeTimeMin?: number;
  processedVolumeMl: number;
  fatType: "macrofat" | "microfat" | "nanofat" | "svf_enriched";
  recipientSites: AestheticFatGraftingRecipientSite[];
  injectionCannulaGauge?: string;
  injectionTechnique?:
    | "microdroplet"
    | "structural"
    | "bolus"
    | "retrograde_fan";
}

export interface AestheticFatGraftingRecipientSite {
  site: string;
  volumeInjectedMl: number;
}

// ═══════════════════════════════════════════
// LIPOSUCTION (STANDALONE OR ADJUNCT)
// ═══════════════════════════════════════════

export interface LiposuctionDetails {
  technique: "sal" | "pal" | "vaser" | "lal" | "rfal" | "wal" | "hd_vaser";
  role: "primary" | "adjunct";
  wettingTechnique: "dry" | "wet" | "superwet" | "tumescent";
  areas: LiposuctionArea[];
  totalAspirateMl?: number;
  totalTumescentMl?: number;
  cannulaSizeMm?: number;
}

export interface LiposuctionArea {
  site: string;
  aspirateVolumeMl?: number;
}

// ═══════════════════════════════════════════
// AESTHETIC ASSESSMENT (INLINE COMPONENT DATA)
// ═══════════════════════════════════════════

export interface AestheticAssessment {
  interventionType: AestheticInterventionType;
  intent: AestheticIntent;
  acgmeCategory?: AcgmeAestheticCategory;
  acgmeSubcategory?: AcgmeAestheticSubcategory;
  neurotoxinDetails?: NeurotoxinDetails;
  fillerDetails?: FillerDetails;
  biostimulatorDetails?: BiostimulatorDetails;
  prpDetails?: PrpDetails;
  energyDeviceDetails?: EnergyDeviceDetails;
  threadLiftDetails?: ThreadLiftDetails;
  fatGraftingDetails?: AestheticFatGraftingDetails;
  liposuctionDetails?: LiposuctionDetails;
  isPartOfCombinationSession?: boolean;
  combinationPreset?: CombinationPreset;
  preBariatricWeightKg?: number;
  currentWeightKg?: number;
  weightLossKg?: number;
  heightCm?: number;
  bmi?: number;
  bariatricProcedureType?: BariatricProcedureType;
  timeSinceBariatricSurgery?: TimeSinceBariatricSurgery;
  weightStable?: boolean;
  pittsburghRatingScale?: PittsburghRatingScale;
}

// ═══════════════════════════════════════════
// POST-BARIATRIC CONTEXT
// ═══════════════════════════════════════════

export type BariatricProcedureType =
  | "gastric_bypass_rygb"
  | "sleeve_gastrectomy"
  | "gastric_band"
  | "duodenal_switch"
  | "bpd"
  | "sadi_s"
  | "other"
  | "unknown";

export type TimeSinceBariatricSurgery =
  | "less_than_6m"
  | "6_to_12m"
  | "1_to_2y"
  | "2_to_5y"
  | "over_5y";

export type PittsburghRegion =
  | "chin_neck"
  | "chest"
  | "arms"
  | "abdomen"
  | "flanks_back"
  | "buttock"
  | "inner_thighs"
  | "outer_thighs"
  | "breasts"
  | "mons_pubis";

export type PittsburghScore = 0 | 1 | 2 | 3;

export interface PittsburghRatingScale {
  scores: Partial<Record<PittsburghRegion, PittsburghScore>>;
  /** Auto-calculated sum (0–30) */
  total?: number;
}

export type CombinationPreset =
  | "mommy_makeover"
  | "full_facelift"
  | "bbl"
  | "post_bariatric_lower"
  | "post_bariatric_upper"
  | "facial_rejuvenation"
  | "custom";
