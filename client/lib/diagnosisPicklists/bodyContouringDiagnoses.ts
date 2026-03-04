/**
 * Body Contouring Diagnosis Picklist
 *
 * ~12 structured diagnoses covering ~90% of body contouring cases.
 * Near 1:1 diagnosis → procedure mapping — the most deterministic specialty.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// ABDOMEN / TRUNK
// ═══════════════════════════════════════════════════════════════════════════════

const BC_DX_ABDOMEN: DiagnosisPicklistEntry[] = [
  {
    id: "bc_dx_abdominal_excess",
    displayName: "Abdominal skin / fat excess",
    shortName: "Abdominal excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of abdomen (disorder)",
    specialty: "body_contouring",
    subcategory: "Abdomen",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "tummy tuck",
      "abdominal skin",
      "apron",
      "abdominoplasty indication",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_abdo_full",
        displayName: "Abdominoplasty — full (with muscle plication)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_abdo_mini",
        displayName: "Mini abdominoplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "bc_abdo_lipoabdominoplasty",
        displayName: "Lipoabdominoplasty",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "bc_abdo_extended",
        displayName: "Extended abdominoplasty",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "bc_abdo_fleur_de_lis",
        displayName: "Fleur-de-lis abdominoplasty",
        isDefault: false,
        sortOrder: 5,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "bc_dx_panniculitis",
    displayName: "Panniculitis / functional panniculus",
    shortName: "Pannus",
    snomedCtCode: "129649009",
    snomedCtDisplay: "Panniculitis (disorder)",
    specialty: "body_contouring",
    subcategory: "Abdomen",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "pannus",
      "panniculectomy",
      "functional panniculus",
      "intertrigo",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_abdo_panniculectomy",
        displayName: "Panniculectomy (functional — non-cosmetic)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "bc_dx_diastasis",
    displayName: "Rectus diastasis",
    shortName: "Diastasis recti",
    snomedCtCode: "225587006",
    snomedCtDisplay: "Diastasis recti (disorder)",
    specialty: "body_contouring",
    subcategory: "Abdomen",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "diastasis recti",
      "rectus separation",
      "plication",
      "abdominal wall laxity",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_abdo_diastasis_repair",
        displayName: "Rectus diastasis repair (plication only)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_abdo_full",
        displayName: "Abdominoplasty — full (with muscle plication)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// UPPER BODY
// ═══════════════════════════════════════════════════════════════════════════════

const BC_DX_UPPER: DiagnosisPicklistEntry[] = [
  {
    id: "bc_dx_upper_arm_excess",
    displayName: "Upper arm skin excess",
    shortName: "Arm excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of upper arm (disorder)",
    specialty: "body_contouring",
    subcategory: "Upper Body",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "arm lift",
      "bingo wings",
      "brachioplasty indication",
      "upper arm laxity",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_upper_brachioplasty",
        displayName: "Brachioplasty (arm lift)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_upper_brachioplasty_extended",
        displayName: "Extended brachioplasty (arm + lateral chest wall)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "bc_dx_back_excess",
    displayName: "Upper back / bra-line skin excess",
    shortName: "Back excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of trunk (disorder)",
    specialty: "body_contouring",
    subcategory: "Upper Body",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["back rolls", "bra roll", "bra-line", "upper back lift"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_upper_bra_line_lift",
        displayName: "Bra-line back lift (upper back excess)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LOWER BODY
// ═══════════════════════════════════════════════════════════════════════════════

const BC_DX_LOWER: DiagnosisPicklistEntry[] = [
  {
    id: "bc_dx_thigh_excess",
    displayName: "Thigh skin excess",
    shortName: "Thigh excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of thigh (disorder)",
    specialty: "body_contouring",
    subcategory: "Lower Body",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "thigh lift",
      "inner thigh",
      "medial thigh",
      "lateral thigh",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_lower_medial_thigh",
        displayName: "Medial thigh lift",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_lower_lateral_thigh",
        displayName: "Lateral thigh lift",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "bc_dx_buttock_ptosis",
    displayName: "Buttock ptosis / excess",
    shortName: "Buttock ptosis",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Buttock ptosis (disorder)",
    specialty: "body_contouring",
    subcategory: "Lower Body",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["buttock lift", "buttock ptosis", "gluteal ptosis"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_buttock_lift",
        displayName: "Buttock lift",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_buttock_augment_implant",
        displayName: "Buttock augmentation — implant",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "bc_dx_mons",
    displayName: "Mons pubis excess",
    shortName: "Mons excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess tissue of mons pubis (disorder)",
    specialty: "body_contouring",
    subcategory: "Lower Body",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["monsplasty", "mons pubis", "FUPA"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_other_monsplasty",
        displayName: "Monsplasty",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// POST-BARIATRIC
// ═══════════════════════════════════════════════════════════════════════════════

const BC_DX_POST_BARIATRIC: DiagnosisPicklistEntry[] = [
  {
    id: "bc_dx_post_bariatric_trunk",
    displayName: "Post-bariatric body contour deformity — trunk",
    shortName: "Post-bariatric trunk",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin following weight loss (disorder)",
    specialty: "body_contouring",
    subcategory: "Post-Bariatric",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "post-bariatric",
      "massive weight loss",
      "MWL",
      "body lift",
      "belt lipectomy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_postbar_circumferential_body_lift",
        displayName: "Circumferential body lift",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_postbar_belt_lipectomy",
        displayName: "Belt lipectomy",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "bc_abdo_fleur_de_lis",
        displayName: "Fleur-de-lis abdominoplasty",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "bc_dx_post_bariatric_arms",
    displayName: "Post-bariatric arm excess",
    shortName: "Post-bariatric arms",
    snomedCtCode: "419459005",
    snomedCtDisplay:
      "Excess skin of upper arm following weight loss (disorder)",
    specialty: "body_contouring",
    subcategory: "Post-Bariatric",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["post-bariatric arms", "massive weight loss arms"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_upper_brachioplasty_extended",
        displayName: "Extended brachioplasty (arm + lateral chest wall)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "bc_dx_post_bariatric_thighs",
    displayName: "Post-bariatric thigh excess",
    shortName: "Post-bariatric thighs",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of thigh following weight loss (disorder)",
    specialty: "body_contouring",
    subcategory: "Post-Bariatric",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["post-bariatric thighs", "massive weight loss thighs"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_postbar_thigh_lift",
        displayName: "Thigh lift — post-bariatric",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LIPODYSTROPHY
// ═══════════════════════════════════════════════════════════════════════════════

const BC_DX_LIPODYSTROPHY: DiagnosisPicklistEntry[] = [
  {
    id: "bc_dx_lipodystrophy",
    displayName: "Lipodystrophy / localised fat excess",
    shortName: "Lipodystrophy",
    snomedCtCode: "238849006",
    snomedCtDisplay: "Lipodystrophy (disorder)",
    specialty: "body_contouring",
    subcategory: "Lipodystrophy",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "lipodystrophy",
      "localised fat",
      "liposuction indication",
      "stubborn fat",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_body_liposuction",
        displayName: "Liposuction (any site)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_body_liposuction_hd",
        displayName: "High-definition liposuction / VASER",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const BODY_CONTOURING_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...BC_DX_ABDOMEN,
  ...BC_DX_UPPER,
  ...BC_DX_LOWER,
  ...BC_DX_POST_BARIATRIC,
  ...BC_DX_LIPODYSTROPHY,
];

/** Get body contouring diagnoses grouped by subcategory */
export function getBodyContouringSubcategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dx of BODY_CONTOURING_DIAGNOSES) {
    if (!seen.has(dx.subcategory)) {
      seen.add(dx.subcategory);
      result.push(dx.subcategory);
    }
  }
  return result;
}

/** Get body contouring diagnoses for a specific subcategory */
export function getBodyContouringDiagnosesForSubcategory(
  subcategory: string,
): DiagnosisPicklistEntry[] {
  return BODY_CONTOURING_DIAGNOSES.filter(
    (dx) => dx.subcategory === subcategory,
  );
}
