// client/lib/aestheticsConfig.ts

import type {
  AestheticIntent,
  AcgmeAestheticCategory,
  AcgmeAestheticSubcategory,
  AestheticInterventionType,
} from "../types/aesthetics";
import { findDiagnosisById } from "./diagnosisPicklists/index";
import type { DiagnosisPicklistEntry } from "./diagnosisPicklists/index";

/**
 * Category merge: body_contouring → aesthetics.
 * This constant resolves the old category ID to the new one.
 */
export const BODY_CONTOURING_MERGED_CATEGORY = "aesthetics" as const;

/**
 * Returns true if a specialty string should resolve to aesthetics.
 * Used throughout the app to handle backward compatibility.
 */
export function resolveSpecialty(specialty: string): string {
  if (specialty === "body_contouring") return "aesthetics";
  return specialty;
}

/**
 * Checks if a procedure belongs to the aesthetics module
 * by examining its ID prefix or specialty tags.
 */
export function isAestheticProcedure(procedurePicklistId: string): boolean {
  return (
    procedurePicklistId.startsWith("aes_") ||
    procedurePicklistId.startsWith("bc_")
  );
}

/**
 * Determines the intervention type from a procedure ID.
 */
export function getInterventionType(
  procedurePicklistId: string,
): AestheticInterventionType {
  if (
    procedurePicklistId.includes("_inj_") ||
    procedurePicklistId.includes("_botox_") ||
    procedurePicklistId.includes("_filler_") ||
    procedurePicklistId.includes("_biostim_") ||
    procedurePicklistId.includes("_prp")
  ) {
    return "non_surgical_injectable";
  }
  if (
    procedurePicklistId.includes("_laser_") ||
    procedurePicklistId.includes("_rf_") ||
    procedurePicklistId.includes("_hifu") ||
    procedurePicklistId.includes("_ipl") ||
    procedurePicklistId.includes("_cryo") ||
    procedurePicklistId.includes("_plasma") ||
    procedurePicklistId.includes("_emsculpt") ||
    procedurePicklistId.includes("_led")
  ) {
    return "non_surgical_energy";
  }
  if (
    procedurePicklistId.includes("_peel_") ||
    procedurePicklistId.includes("_microneedling") ||
    procedurePicklistId.includes("_thread_") ||
    procedurePicklistId.startsWith("aes_thread_") ||
    procedurePicklistId.includes("_dermabrasion")
  ) {
    return "non_surgical_skin_treatment";
  }
  return "surgical";
}

/**
 * Intent is determined by the diagnosis, not the procedure.
 * This maps diagnosis IDs to their default intent.
 */
const DIAGNOSIS_INTENT_MAP: Record<string, AestheticIntent> = {
  // Post-bariatric
  aes_dx_post_bariatric_body: "post_bariatric_mwl",
  aes_dx_post_bariatric_arm: "post_bariatric_mwl",
  aes_dx_post_bariatric_thigh: "post_bariatric_mwl",
  aes_dx_post_bariatric_breast: "post_bariatric_mwl",
  // Functional / reconstructive
  aes_dx_panniculitis: "functional_reconstructive",
  aes_dx_nasal_functional: "functional_reconstructive",
  aes_dx_rhinophyma: "functional_reconstructive",
  aes_dx_hyperhidrosis: "functional_reconstructive",
  // Combined
  aes_dx_diastasis_recti: "combined",
  aes_dx_upper_eyelid_dermatochalasis: "cosmetic", // can be overridden to functional
  aes_dx_labia_hypertrophy: "cosmetic", // can be overridden to functional
};

export function getAestheticIntentFromDiagnosis(
  diagnosisId: string,
): AestheticIntent {
  return DIAGNOSIS_INTENT_MAP[diagnosisId] ?? "cosmetic";
}

/**
 * ACGME category mapping for training documentation exports.
 */
const ACGME_CATEGORY_MAP: Record<string, AcgmeAestheticCategory> = {
  // Facial surgical → Head & Neck Aesthetic
  aes_facelift: "head_neck_aesthetic",
  aes_bleph: "head_neck_aesthetic",
  aes_brow: "head_neck_aesthetic",
  aes_rhino: "head_neck_aesthetic",
  aes_oto: "head_neck_aesthetic",
  aes_lip: "head_neck_aesthetic",
  aes_face: "head_neck_aesthetic",
  aes_hair: "head_neck_aesthetic",
  // Body surgical → Trunk/Extremity Aesthetic
  aes_body: "trunk_extremity_aesthetic",
  bc_abdo: "trunk_extremity_aesthetic",
  bc_upper: "trunk_extremity_aesthetic",
  bc_lower: "trunk_extremity_aesthetic",
  bc_buttock: "trunk_extremity_aesthetic",
  bc_postbar: "trunk_extremity_aesthetic",
  bc_other: "trunk_extremity_aesthetic",
  aes_genital: "trunk_extremity_aesthetic",
  // Injectables
  aes_inj: "injectable_non_index",
  // Energy
  aes_energy: "laser_non_index",
  aes_laser: "laser_non_index",
  aes_rf: "laser_non_index",
  // Skin treatments
  aes_skin: "other_non_index",
  aes_thread: "other_non_index",
};

export function getAcgmeCategory(
  procedurePicklistId: string,
): AcgmeAestheticCategory {
  // Try progressively shorter prefixes
  const parts = procedurePicklistId.split("_");
  for (let i = parts.length; i >= 2; i--) {
    const prefix = parts.slice(0, i).join("_");
    if (ACGME_CATEGORY_MAP[prefix]) return ACGME_CATEGORY_MAP[prefix]!;
  }
  return "other_non_index";
}

const ACGME_SUBCATEGORY_MAP: Record<string, AcgmeAestheticSubcategory> = {
  aes_facelift: "facelift",
  aes_bleph: "blepharoplasty",
  aes_rhino: "rhinoplasty",
  aes_brow: "brow_lift",
  bc_abdo: "abdominoplasty",
  aes_body_liposuction: "liposuction",
  bc_upper_brachioplasty: "brachioplasty",
  bc_lower_body_lift: "body_lift",
  bc_postbar_circumferential: "body_lift",
  bc_lower_medial_thigh: "thighplasty",
  bc_lower_lateral_thigh: "thighplasty",
  aes_inj_botox: "botulinum_toxin",
  aes_inj_filler: "soft_tissue_filler",
  aes_body_fat_transfer: "autologous_fat",
  aes_laser: "laser_aesthetic",
  aes_energy: "laser_aesthetic",
};

export function getAcgmeSubcategory(
  procedurePicklistId: string,
): AcgmeAestheticSubcategory {
  const parts = procedurePicklistId.split("_");
  for (let i = parts.length; i >= 2; i--) {
    const prefix = parts.slice(0, i).join("_");
    if (ACGME_SUBCATEGORY_MAP[prefix]) return ACGME_SUBCATEGORY_MAP[prefix]!;
  }
  return "other";
}

/**
 * Combination session presets — defines which procedures
 * auto-populate when a preset is selected.
 */
export const COMBINATION_PRESETS = {
  mommy_makeover: {
    label: "Mommy Makeover",
    procedures: [
      "bc_abdo_full",
      "breast_aes_augmentation_implant",
      "aes_body_liposuction",
    ],
    description: "Abdominoplasty + breast procedure + liposuction",
  },
  full_facelift: {
    label: "Full Facelift",
    procedures: [
      "aes_face_deep_plane",
      "aes_face_neck_lift",
      "aes_face_upper_bleph",
      "aes_face_fat_transfer",
    ],
    description: "Facelift + neck lift ± blepharoplasty ± fat grafting",
  },
  bbl: {
    label: "Brazilian Butt Lift",
    procedures: ["aes_body_liposuction", "aes_body_fat_transfer_buttock"],
    description: "Liposuction (multi-area) + buttock fat grafting",
  },
  post_bariatric_lower: {
    label: "Post-Bariatric Lower Body",
    procedures: [
      "bc_postbar_combined_upper_lower",
      "bc_lower_thigh_lift_medial",
      "aes_body_liposuction",
    ],
    description: "Lower body lift + thighplasty ± liposuction",
  },
} as const;

// ─── Shared display constants (used by AestheticAssessment + ProcedureFirstFlow) ─

export const INTENT_LABELS: Record<AestheticIntent, string> = {
  cosmetic: "Cosmetic",
  post_bariatric_mwl: "Post-Bariatric",
  functional_reconstructive: "Functional / Reconstructive",
  combined: "Combined",
};

export const INTENT_COLORS: Record<AestheticIntent, string> = {
  cosmetic: "#E5A00D",
  post_bariatric_mwl: "#58A6FF",
  functional_reconstructive: "#2EA043",
  combined: "#D8B4FE",
};

export const ACGME_LABELS: Record<string, string> = {
  head_neck_aesthetic: "Head & Neck Aesthetic",
  breast_aesthetic: "Breast Aesthetic",
  trunk_extremity_aesthetic: "Trunk / Extremity",
  injectable_non_index: "Injectables",
  laser_non_index: "Laser / Energy",
  other_non_index: "Other Non-Index",
};

// ─── Detail card type (shared with AestheticAssessment) ─────────────────────

export type AestheticDetailCardType =
  | "neurotoxin"
  | "filler"
  | "energy"
  | "biostimulator"
  | "prp"
  | "thread"
  | "fat_grafting"
  | "liposuction"
  | "post_bariatric"
  | null;

// ─── Procedure-first config map ─────────────────────────────────────────────

export interface AestheticProcedureConfig {
  /** Does this procedure need an intent prompt? */
  needsIntentPrompt: boolean;
  /** If needsIntentPrompt, what are the options? */
  intentOptions?: Array<{ value: AestheticIntent; label: string }>;
  /** Default intent if no prompt needed */
  defaultIntent: AestheticIntent;
  /** Auto-inferred diagnosis ID (from aestheticsDiagnoses.ts) */
  autoInferredDiagnosisId: string | ((intent: AestheticIntent) => string);
  /** Should laterality chips be shown? */
  showLaterality: boolean;
  /** Is this a surgical procedure needing standard operative fields? */
  isSurgical: boolean;
  /** Which detail card to show (if any) */
  detailCard: AestheticDetailCardType;
}

// Intent option presets
const COSMETIC_FUNCTIONAL: Array<{ value: AestheticIntent; label: string }> = [
  { value: "cosmetic", label: "Cosmetic" },
  { value: "functional_reconstructive", label: "Functional" },
];

const COSMETIC_POSTBAR: Array<{ value: AestheticIntent; label: string }> = [
  { value: "cosmetic", label: "Cosmetic" },
  { value: "post_bariatric_mwl", label: "Post-bariatric" },
];

const COSMETIC_POSTBAR_FUNCTIONAL: Array<{
  value: AestheticIntent;
  label: string;
}> = [
  { value: "cosmetic", label: "Cosmetic" },
  { value: "post_bariatric_mwl", label: "Post-bariatric" },
  { value: "functional_reconstructive", label: "Functional" },
];

const RHINO_INTENT: Array<{ value: AestheticIntent; label: string }> = [
  { value: "cosmetic", label: "Cosmetic" },
  { value: "functional_reconstructive", label: "Functional" },
  { value: "combined", label: "Combined" },
];

export const AESTHETIC_PROCEDURE_CONFIG: Record<
  string,
  AestheticProcedureConfig
> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // NON-SURGICAL INJECTABLES
  // ═══════════════════════════════════════════════════════════════════════════

  // Neurotoxins
  aes_inj_botox_upper_face: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_dynamic_wrinkles",
    showLaterality: false,
    isSurgical: false,
    detailCard: "neurotoxin",
  },
  aes_inj_botox_lower_face: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_dynamic_wrinkles",
    showLaterality: false,
    isSurgical: false,
    detailCard: "neurotoxin",
  },
  aes_inj_botox_masseter: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_jawline_contour",
    showLaterality: true,
    isSurgical: false,
    detailCard: "neurotoxin",
  },
  aes_inj_botox_platysma: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_neck_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "neurotoxin",
  },
  aes_inj_botox_hyperhidrosis: {
    needsIntentPrompt: false,
    defaultIntent: "functional_reconstructive",
    autoInferredDiagnosisId: "aes_dx_hyperhidrosis",
    showLaterality: true,
    isSurgical: false,
    detailCard: "neurotoxin",
  },

  // Fillers
  aes_inj_filler_midface: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_volume_loss",
    showLaterality: false,
    isSurgical: false,
    detailCard: "filler",
  },
  aes_inj_filler_lips: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lip_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "filler",
  },
  aes_inj_filler_nasolabial: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_volume_loss",
    showLaterality: false,
    isSurgical: false,
    detailCard: "filler",
  },
  aes_inj_filler_jawline_chin: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_jawline_contour",
    showLaterality: false,
    isSurgical: false,
    detailCard: "filler",
  },
  aes_inj_filler_tear_trough: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_periorbital_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "filler",
  },
  aes_inj_filler_nose: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_nasal_cosmetic",
    showLaterality: false,
    isSurgical: false,
    detailCard: "filler",
  },
  aes_inj_filler_temples: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_volume_loss",
    showLaterality: false,
    isSurgical: false,
    detailCard: "filler",
  },
  aes_inj_filler_hands: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: true,
    isSurgical: false,
    detailCard: "filler",
  },
  aes_inj_filler_other: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_volume_loss",
    showLaterality: false,
    isSurgical: false,
    detailCard: "filler",
  },
  aes_inj_filler_dissolve: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_volume_loss",
    showLaterality: false,
    isSurgical: false,
    detailCard: "filler",
  },

  // Biostimulators
  aes_inj_biostim_sculptra: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_volume_loss",
    showLaterality: false,
    isSurgical: false,
    detailCard: "biostimulator",
  },
  aes_inj_biostim_radiesse_dilute: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_laxity",
    showLaterality: false,
    isSurgical: false,
    detailCard: "biostimulator",
  },
  aes_inj_biostim_profhilo: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "biostimulator",
  },

  // PRP
  aes_inj_prp: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "prp",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NON-SURGICAL ENERGY DEVICES
  // ═══════════════════════════════════════════════════════════════════════════

  aes_skin_laser_ablative: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_skin_laser_fractional: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_energy_laser_hybrid: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_skin_laser_vascular: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_skin_laser_pigment: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_energy_laser_hair_removal: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_skin_laser_ipl: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_energy_rf_microneedling: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_laxity",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_energy_monopolar_rf: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_laxity",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_energy_hifu: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_laxity",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_energy_cryolipolysis: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lipodystrophy",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_energy_plasma: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_laxity",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_energy_emsculpt: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lipodystrophy",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },
  aes_energy_led: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "energy",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NON-SURGICAL SKIN TREATMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  aes_skin_chemical_peel_superficial: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: null,
  },
  aes_skin_chemical_peel_medium: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: null,
  },
  aes_skin_chemical_peel_deep: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: null,
  },
  aes_skin_microneedling: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: null,
  },
  aes_skin_dermabrasion: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: null,
  },

  // Thread lifts
  aes_face_thread_lift: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_facial_ageing_lower",
    showLaterality: false,
    isSurgical: false,
    detailCard: "thread",
  },
  aes_thread_neck: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_neck_ageing",
    showLaterality: false,
    isSurgical: false,
    detailCard: "thread",
  },
  aes_thread_body: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_laxity",
    showLaterality: false,
    isSurgical: false,
    detailCard: "thread",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SURGICAL — UNAMBIGUOUS (no intent prompt)
  // ═══════════════════════════════════════════════════════════════════════════

  // Facelift
  aes_face_smas_facelift: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_facial_ageing_lower",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_face_deep_plane: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_facial_ageing_lower",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_face_mini_facelift: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_facial_ageing_lower",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_face_neck_lift: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_neck_ageing",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_facelift_submentoplasty: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_submental_fullness",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Brow lift
  aes_face_brow_lift_endoscopic: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_brow_ptosis",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_face_brow_lift_open: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_brow_ptosis",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Otoplasty
  aes_oto_prominent_ear: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_prominent_ears",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },
  aes_oto_earlobe_reduction: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_earlobe_deformity",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },

  // Lips
  aes_lip_lift: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lip_ageing",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_lip_reduction: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lip_ageing",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Facial implants / dermabrasion
  aes_face_fat_transfer: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_volume_loss",
    showLaterality: false,
    isSurgical: true,
    detailCard: "fat_grafting",
  },
  aes_face_chin_implant: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_jawline_contour",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_face_perioral_dermabrasion: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Asian blepharoplasty (always cosmetic)
  aes_bleph_asian: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_upper_eyelid_dermatochalasis",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },

  // Lower bleph (always cosmetic)
  aes_face_lower_bleph: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lower_eyelid_bags",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },
  aes_bleph_lower_canthoplasty: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lower_eyelid_bags",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },

  // Rhinoplasty — septo always functional
  aes_rhino_septorhinoplasty: {
    needsIntentPrompt: false,
    defaultIntent: "functional_reconstructive",
    autoInferredDiagnosisId: "aes_dx_nasal_functional",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_rhino_tip: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_nasal_cosmetic",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Hair
  aes_hair_fut: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_alopecia",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_hair_fue: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_alopecia",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_hair_eyebrow: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_alopecia",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_hair_scar_excision: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_alopecia",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Body — unambiguous
  aes_body_gynaecomastia_excision: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_gynecomastia",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },
  aes_body_scar_revision: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },
  aes_body_tattoo_removal: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_tattoo_unwanted",
    showLaterality: false,
    isSurgical: false,
    detailCard: null,
  },

  // Liposuction
  aes_body_liposuction: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lipodystrophy",
    showLaterality: false,
    isSurgical: true,
    detailCard: "liposuction",
  },
  aes_body_liposuction_hd: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lipodystrophy",
    showLaterality: false,
    isSurgical: true,
    detailCard: "liposuction",
  },

  // Fat transfer
  aes_body_fat_transfer_buttock: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_buttock_ptosis",
    showLaterality: false,
    isSurgical: true,
    detailCard: "fat_grafting",
  },

  // Genital — unambiguous
  aes_genital_clitoral_hood: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_clitoral_hood_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_genital_penile: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_penile_aesthetic",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_genital_vaginoplasty: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_vaginal_laxity",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_genital_monsplasty: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_mons",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Body contouring — unambiguous
  bc_abdo_mini: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_abdominal_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_abdo_panniculectomy: {
    needsIntentPrompt: false,
    defaultIntent: "functional_reconstructive",
    autoInferredDiagnosisId: "aes_dx_panniculitis",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_abdo_diastasis_repair: {
    needsIntentPrompt: false,
    defaultIntent: "functional_reconstructive",
    autoInferredDiagnosisId: "aes_dx_diastasis_recti",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_abdo_reverse: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_abdominal_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Buttock
  bc_buttock_lift: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_buttock_ptosis",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_buttock_implant: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_buttock_ptosis",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_buttock_auto_augmentation: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_buttock_ptosis",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Post-bariatric specific — always post-bariatric
  bc_postbar_combined_upper_lower: {
    needsIntentPrompt: false,
    defaultIntent: "post_bariatric_mwl",
    autoInferredDiagnosisId: "aes_dx_post_bariatric_body",
    showLaterality: false,
    isSurgical: true,
    detailCard: "post_bariatric",
  },
  bc_postbar_mons_lift: {
    needsIntentPrompt: false,
    defaultIntent: "post_bariatric_mwl",
    autoInferredDiagnosisId: "aes_dx_post_bariatric_body",
    showLaterality: false,
    isSurgical: true,
    detailCard: "post_bariatric",
  },
  bc_postbar_skin_excision_other: {
    needsIntentPrompt: false,
    defaultIntent: "post_bariatric_mwl",
    autoInferredDiagnosisId: "aes_dx_post_bariatric_body",
    showLaterality: false,
    isSurgical: true,
    detailCard: "post_bariatric",
  },

  // Other body contouring
  bc_other_calf_implant: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_calf_contour",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },
  bc_other_pectoral_implant: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_lipodystrophy",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_other_revision_scar: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_other_dog_ear_revision: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_other_seroma_management: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_ageing",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_lower_knee_lift: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_skin_laxity",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },
  bc_upper_bra_line_lift: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_back_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_upper_axillary_roll: {
    needsIntentPrompt: false,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_back_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_lower_body_lift: {
    needsIntentPrompt: false,
    defaultIntent: "post_bariatric_mwl",
    autoInferredDiagnosisId: "aes_dx_post_bariatric_body",
    showLaterality: false,
    isSurgical: true,
    detailCard: "post_bariatric",
  },
  bc_lower_belt_lipectomy: {
    needsIntentPrompt: false,
    defaultIntent: "post_bariatric_mwl",
    autoInferredDiagnosisId: "aes_dx_post_bariatric_body",
    showLaterality: false,
    isSurgical: true,
    detailCard: "post_bariatric",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SURGICAL — INTENT AMBIGUOUS (show intent prompt)
  // ═══════════════════════════════════════════════════════════════════════════

  // Rhinoplasty
  aes_rhino_open: {
    needsIntentPrompt: true,
    intentOptions: RHINO_INTENT,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: (intent) =>
      intent === "functional_reconstructive" || intent === "combined"
        ? "aes_dx_nasal_functional"
        : "aes_dx_nasal_cosmetic",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_rhino_closed: {
    needsIntentPrompt: true,
    intentOptions: RHINO_INTENT,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: (intent) =>
      intent === "functional_reconstructive" || intent === "combined"
        ? "aes_dx_nasal_functional"
        : "aes_dx_nasal_cosmetic",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_rhino_revision: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_FUNCTIONAL,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_nasal_revision",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Blepharoplasty — upper is ambiguous
  aes_face_upper_bleph: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_FUNCTIONAL,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_upper_eyelid_dermatochalasis",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },

  // Abdominoplasty variants — intent ambiguous
  bc_abdo_full: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_POSTBAR_FUNCTIONAL,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: (intent) =>
      intent === "post_bariatric_mwl"
        ? "aes_dx_post_bariatric_body"
        : intent === "functional_reconstructive"
          ? "aes_dx_panniculitis"
          : "aes_dx_abdominal_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_abdo_extended: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_POSTBAR,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: (intent) =>
      intent === "post_bariatric_mwl"
        ? "aes_dx_post_bariatric_body"
        : "aes_dx_abdominal_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_abdo_fleur_de_lis: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_POSTBAR,
    defaultIntent: "post_bariatric_mwl",
    autoInferredDiagnosisId: (intent) =>
      intent === "post_bariatric_mwl"
        ? "aes_dx_post_bariatric_body"
        : "aes_dx_abdominal_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  bc_abdo_lipoabdominoplasty: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_POSTBAR,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: (intent) =>
      intent === "post_bariatric_mwl"
        ? "aes_dx_post_bariatric_body"
        : "aes_dx_abdominal_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
  aes_body_high_tension_abdominoplasty: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_POSTBAR,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: (intent) =>
      intent === "post_bariatric_mwl"
        ? "aes_dx_post_bariatric_body"
        : "aes_dx_abdominal_excess",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },

  // Brachioplasty
  bc_upper_brachioplasty: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_POSTBAR,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: (intent) =>
      intent === "post_bariatric_mwl"
        ? "aes_dx_post_bariatric_arm"
        : "aes_dx_upper_arm_excess",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },
  bc_upper_brachioplasty_extended: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_POSTBAR,
    defaultIntent: "post_bariatric_mwl",
    autoInferredDiagnosisId: (intent) =>
      intent === "post_bariatric_mwl"
        ? "aes_dx_post_bariatric_arm"
        : "aes_dx_upper_arm_excess",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },

  // Thigh lift
  bc_lower_thigh_lift_medial: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_POSTBAR,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: (intent) =>
      intent === "post_bariatric_mwl"
        ? "aes_dx_post_bariatric_thigh"
        : "aes_dx_thigh_excess",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },
  bc_lower_thigh_lift_lateral: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_POSTBAR,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: (intent) =>
      intent === "post_bariatric_mwl"
        ? "aes_dx_post_bariatric_thigh"
        : "aes_dx_thigh_excess",
    showLaterality: true,
    isSurgical: true,
    detailCard: null,
  },

  // Labiaplasty — intent ambiguous
  aes_body_labiaplasty: {
    needsIntentPrompt: true,
    intentOptions: COSMETIC_FUNCTIONAL,
    defaultIntent: "cosmetic",
    autoInferredDiagnosisId: "aes_dx_labia_hypertrophy",
    showLaterality: false,
    isSurgical: true,
    detailCard: null,
  },
};

/** Default config for unmapped procedures */
const DEFAULT_PROCEDURE_CONFIG: AestheticProcedureConfig = {
  needsIntentPrompt: false,
  defaultIntent: "cosmetic",
  autoInferredDiagnosisId: "aes_dx_skin_ageing",
  showLaterality: false,
  isSurgical: true,
  detailCard: null,
};

/**
 * Get config for an aesthetic procedure. Falls back to sensible defaults
 * for any procedure not explicitly mapped.
 */
export function getAestheticProcedureConfig(
  procedureId: string,
): AestheticProcedureConfig {
  return AESTHETIC_PROCEDURE_CONFIG[procedureId] ?? DEFAULT_PROCEDURE_CONFIG;
}

/**
 * Resolve the auto-inferred diagnosis ID, accounting for
 * intent-dependent mappings.
 */
export function resolveAutoInferredDiagnosisId(
  procedureId: string,
  intent: AestheticIntent,
): string {
  const config = getAestheticProcedureConfig(procedureId);
  if (typeof config.autoInferredDiagnosisId === "function") {
    return config.autoInferredDiagnosisId(intent);
  }
  return config.autoInferredDiagnosisId;
}

/**
 * Resolve the full diagnosis entry for auto-inference.
 * Returns undefined if the diagnosis ID doesn't exist in the picklist.
 */
export function autoInferDiagnosisEntry(
  procedureId: string,
  intent: AestheticIntent,
): DiagnosisPicklistEntry | undefined {
  const diagnosisId = resolveAutoInferredDiagnosisId(procedureId, intent);
  return findDiagnosisById(diagnosisId);
}
