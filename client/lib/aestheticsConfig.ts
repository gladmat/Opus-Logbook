// client/lib/aestheticsConfig.ts

import type {
  AestheticIntent,
  AcgmeAestheticCategory,
  AcgmeAestheticSubcategory,
  AestheticInterventionType,
} from "../types/aesthetics";

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
