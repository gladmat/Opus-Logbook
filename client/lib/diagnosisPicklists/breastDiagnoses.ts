/**
 * Breast Diagnosis Picklist
 *
 * ~20 structured diagnoses covering ~85% of breast surgery cases.
 * Includes Baker classification conditional logic for capsular contracture.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// ONCOLOGICAL
// ═══════════════════════════════════════════════════════════════════════════════

const BREAST_DX_ONCOLOGICAL: DiagnosisPicklistEntry[] = [
  {
    id: "breast_dx_invasive_cancer",
    displayName: "Breast cancer — invasive",
    shortName: "Breast Ca invasive",
    snomedCtCode: "254837009",
    snomedCtDisplay: "Malignant neoplasm of breast (disorder)",
    specialty: "breast",
    subcategory: "Oncological",
    clinicalGroup: "oncological",
    hasStaging: true, // TNM staging
    searchSynonyms: [
      "IDC",
      "ILC",
      "invasive ductal",
      "invasive lobular",
      "breast cancer",
      "breast carcinoma",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_onco_ssm",
        displayName: "Skin-sparing mastectomy + immediate reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_onco_nsm",
        displayName: "Nipple-sparing mastectomy + immediate reconstruction",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "breast_onco_therapeutic_mammoplasty",
        displayName: "Therapeutic mammoplasty (oncoplastic)",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "breast_recon_diep",
        displayName: "DIEP flap breast reconstruction",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "breast_impl_expander_insertion",
        displayName: "Tissue expander insertion",
        isDefault: false,
        sortOrder: 5,
      },
      {
        procedurePicklistId: "breast_recon_ld_implant",
        displayName: "Pedicled LD flap ± implant",
        isDefault: false,
        sortOrder: 6,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "breast_dx_dcis",
    displayName: "Ductal carcinoma in situ (DCIS)",
    shortName: "DCIS",
    snomedCtCode: "397016007",
    snomedCtDisplay: "Ductal carcinoma in situ of breast (disorder)",
    specialty: "breast",
    subcategory: "Oncological",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "DCIS",
      "ductal carcinoma in situ",
      "pre-invasive",
      "intraductal",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_onco_therapeutic_mammoplasty",
        displayName: "Therapeutic mammoplasty (oncoplastic)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_onco_ssm",
        displayName: "Skin-sparing mastectomy + reconstruction",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "breast_dx_brca_risk_reducing",
    displayName: "BRCA carrier — risk-reducing mastectomy",
    shortName: "BRCA risk-reducing",
    snomedCtCode: "718220008",
    snomedCtDisplay: "At increased risk of breast cancer (finding)",
    specialty: "breast",
    subcategory: "Oncological",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "BRCA",
      "BRCA1",
      "BRCA2",
      "prophylactic",
      "risk-reducing",
      "bilateral mastectomy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_onco_nsm",
        displayName: "Nipple-sparing mastectomy + immediate reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_recon_diep",
        displayName: "DIEP flap breast reconstruction",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "breast_impl_dti",
        displayName: "Direct-to-implant reconstruction",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "breast_dx_phyllodes",
    displayName: "Phyllodes tumour",
    snomedCtCode: "399935008",
    snomedCtDisplay: "Phyllodes tumor of breast (disorder)",
    specialty: "breast",
    subcategory: "Oncological",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: ["phyllodes", "phylloides", "cystosarcoma"],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_onco_therapeutic_mammoplasty",
        displayName: "Therapeutic mammoplasty (wide excision)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_onco_ssm",
        displayName: "Skin-sparing mastectomy + reconstruction",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RECONSTRUCTION (post-mastectomy / delayed)
// ═══════════════════════════════════════════════════════════════════════════════

const BREAST_DX_RECONSTRUCTION: DiagnosisPicklistEntry[] = [
  {
    id: "breast_dx_post_mastectomy",
    displayName: "Post-mastectomy breast absence — delayed reconstruction",
    shortName: "Post-mastectomy",
    snomedCtCode: "429242008",
    snomedCtDisplay: "Acquired absence of breast (disorder)",
    specialty: "breast",
    subcategory: "Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "delayed reconstruction",
      "post-mastectomy",
      "breast absence",
      "DIEP delayed",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_recon_diep",
        displayName: "DIEP flap breast reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_impl_expander_insertion",
        displayName: "Tissue expander insertion",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "breast_recon_ld_implant",
        displayName: "Pedicled LD flap ± implant",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "breast_recon_tram_free",
        displayName: "Free TRAM flap",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "breast_dx_expander_in_situ",
    displayName: "Tissue expander in situ — second stage",
    shortName: "Expander exchange",
    snomedCtCode: "429242008",
    snomedCtDisplay: "Tissue expander in breast (finding)",
    specialty: "breast",
    subcategory: "Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "expander exchange",
      "second stage",
      "expander to implant",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_impl_expander_to_implant",
        displayName: "Expander-to-implant exchange",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "breast_dx_recon_failure",
    displayName: "Breast reconstruction failure / revision needed",
    shortName: "Recon revision",
    snomedCtCode: "429242008",
    snomedCtDisplay: "Complication of breast reconstruction (disorder)",
    specialty: "breast",
    subcategory: "Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "reconstruction failure",
      "flap revision",
      "breast revision",
      "fat necrosis flap",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_flap_revision",
        displayName: "Autologous reconstruction revision / debulking",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_rev_fat_grafting",
        displayName: "Fat grafting to breast",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLANT COMPLICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const BREAST_DX_IMPLANT_COMPLICATIONS: DiagnosisPicklistEntry[] = [
  {
    id: "breast_dx_capsular_contracture",
    displayName: "Capsular contracture",
    shortName: "Capsular contracture",
    snomedCtCode: "267639000",
    snomedCtDisplay: "Capsular contracture of breast (disorder)",
    specialty: "breast",
    subcategory: "Implant Complications",
    clinicalGroup: "reconstructive",
    hasStaging: true, // Baker classification — NEW staging config needed
    searchSynonyms: [
      "capsular contracture",
      "Baker",
      "hard breast",
      "implant contracture",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_capsulectomy_total",
        displayName: "Total capsulectomy",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_rev_implant_exchange",
        displayName: "Implant exchange",
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "breast_rev_capsulotomy",
        displayName: "Capsulotomy",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Baker II–III (consider before capsulectomy)",
        conditionStagingMatch: {
          stagingSystemName: "Baker Classification",
          matchValues: ["II", "III"],
        },
        sortOrder: 3,
      },
      {
        procedurePicklistId: "breast_rev_capsulectomy_en_bloc",
        displayName: "En bloc capsulectomy",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Baker IV or concern for BIA-ALCL",
        conditionStagingMatch: {
          stagingSystemName: "Baker Classification",
          matchValues: ["IV"],
        },
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "breast_dx_implant_rupture",
    displayName: "Breast implant rupture",
    shortName: "Implant rupture",
    snomedCtCode: "236507001",
    snomedCtDisplay: "Rupture of breast implant (disorder)",
    specialty: "breast",
    subcategory: "Implant Complications",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "implant rupture",
      "ruptured implant",
      "silicone leak",
      "deflation",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_implant_removal",
        displayName: "Implant removal ± capsulectomy",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_rev_implant_exchange",
        displayName: "Implant exchange",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "breast_dx_bia_alcl",
    displayName: "BIA-ALCL (breast implant-associated ALCL)",
    shortName: "BIA-ALCL",
    snomedCtCode: "254837009",
    snomedCtDisplay:
      "Breast implant-associated anaplastic large cell lymphoma (disorder)",
    specialty: "breast",
    subcategory: "Implant Complications",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: ["BIA-ALCL", "ALCL", "lymphoma implant", "seroma late"],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_capsulectomy_en_bloc",
        displayName: "En bloc capsulectomy (mandatory)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_rev_implant_removal",
        displayName: "Implant removal",
        isDefault: true,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "breast_dx_implant_illness",
    displayName: "Breast implant illness (BII) — explant request",
    shortName: "BII explant",
    snomedCtCode: "236507001",
    snomedCtDisplay: "Complication of breast implant (disorder)",
    specialty: "breast",
    subcategory: "Implant Complications",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "BII",
      "breast implant illness",
      "explant",
      "implant removal request",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_implant_removal",
        displayName: "Implant removal ± capsulectomy",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_rev_capsulectomy_total",
        displayName: "Total capsulectomy",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// AESTHETIC / FUNCTIONAL
// ═══════════════════════════════════════════════════════════════════════════════

const BREAST_DX_AESTHETIC: DiagnosisPicklistEntry[] = [
  {
    id: "breast_dx_hypoplasia",
    displayName: "Breast hypoplasia / micromastia",
    shortName: "Micromastia",
    snomedCtCode: "32767007",
    snomedCtDisplay: "Hypoplasia of breast (disorder)",
    specialty: "breast",
    subcategory: "Aesthetic / Functional",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "small breasts",
      "micromastia",
      "augmentation indication",
      "breast hypoplasia",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_aes_augmentation_implant",
        displayName: "Breast augmentation — implant",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_aes_augmentation_fat",
        displayName: "Breast augmentation — fat transfer",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "breast_dx_macromastia",
    displayName: "Macromastia / breast hypertrophy",
    shortName: "Macromastia",
    snomedCtCode: "78246003",
    snomedCtDisplay: "Hypertrophy of breast (disorder)",
    specialty: "breast",
    subcategory: "Aesthetic / Functional",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "large breasts",
      "macromastia",
      "breast hypertrophy",
      "reduction indication",
      "back pain breasts",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_aes_reduction_wise",
        displayName: "Breast reduction — Wise pattern (inverted-T)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_aes_reduction_vertical",
        displayName: "Breast reduction — vertical scar",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "breast_aes_reduction_superomedial",
        displayName: "Breast reduction — superomedial pedicle",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "breast_dx_ptosis",
    displayName: "Breast ptosis",
    shortName: "Breast ptosis",
    snomedCtCode: "95345000",
    snomedCtDisplay: "Ptosis of breast (disorder)",
    specialty: "breast",
    subcategory: "Aesthetic / Functional",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "ptosis",
      "sagging breasts",
      "mastopexy indication",
      "breast lift",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_aes_mastopexy_vertical",
        displayName: "Mastopexy — vertical scar",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_aes_mastopexy_wise",
        displayName: "Mastopexy — Wise pattern (inverted-T)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "breast_aes_mastopexy_periareolar",
        displayName: "Mastopexy — periareolar (Benelli)",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "breast_aes_augmentation_mastopexy",
        displayName: "Augmentation-mastopexy",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "breast_dx_asymmetry",
    displayName: "Breast asymmetry",
    shortName: "Breast asymmetry",
    snomedCtCode: "414950006",
    snomedCtDisplay: "Asymmetry of breasts (disorder)",
    specialty: "breast",
    subcategory: "Aesthetic / Functional",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "asymmetry",
      "uneven breasts",
      "contralateral symmetrisation",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_onco_contralateral_symmetrisation",
        displayName: "Symmetrisation (reduction / mastopexy / augmentation)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "breast_dx_tuberous",
    displayName: "Tuberous breast deformity",
    shortName: "Tuberous breast",
    snomedCtCode: "32767007",
    snomedCtDisplay: "Tuberous breast deformity (disorder)",
    specialty: "breast",
    subcategory: "Aesthetic / Functional",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "tuberous breast",
      "tubular breast",
      "constricted breast",
      "Grolleau",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_tuberous_correction",
        displayName: "Tuberous breast correction",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "breast_dx_poland",
    displayName: "Poland syndrome",
    shortName: "Poland",
    snomedCtCode: "63247009",
    snomedCtDisplay: "Poland syndrome (disorder)",
    specialty: "breast",
    subcategory: "Aesthetic / Functional",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: ["Poland syndrome", "pectoralis absent", "Poland"],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_poland_correction",
        displayName: "Poland syndrome correction",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "breast_dx_gynaecomastia",
    displayName: "Gynaecomastia",
    shortName: "Gynaecomastia",
    snomedCtCode: "4754008",
    snomedCtDisplay: "Gynecomastia (disorder)",
    specialty: "breast",
    subcategory: "Aesthetic / Functional",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "gynaecomastia",
      "gynecomastia",
      "male breast",
      "man boobs",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_aes_gynaecomastia",
        displayName: "Gynaecomastia surgery (liposuction ± excision)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 7,
  },
  {
    id: "breast_dx_nipple_retraction",
    displayName: "Nipple retraction / absence",
    shortName: "Nipple issue",
    snomedCtCode: "57091001",
    snomedCtDisplay: "Retracted nipple (disorder)",
    specialty: "breast",
    subcategory: "Aesthetic / Functional",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "inverted nipple",
      "retracted nipple",
      "nipple absence",
      "nipple reconstruction",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_nipple_inverted_correction",
        displayName: "Inverted nipple correction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_nipple_reconstruction",
        displayName: "Nipple reconstruction (local flap)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 8,
  },
  {
    id: "breast_dx_fat_necrosis",
    displayName: "Fat necrosis — post-reconstruction",
    shortName: "Fat necrosis",
    snomedCtCode: "442097006",
    snomedCtDisplay: "Fat necrosis of breast (disorder)",
    specialty: "breast",
    subcategory: "Aesthetic / Functional",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["fat necrosis", "oil cyst", "palpable lump post-flap"],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_fat_grafting",
        displayName: "Fat grafting to breast",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_rev_flap_revision",
        displayName: "Flap revision / debulking",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 9,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const BREAST_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...BREAST_DX_ONCOLOGICAL,
  ...BREAST_DX_RECONSTRUCTION,
  ...BREAST_DX_IMPLANT_COMPLICATIONS,
  ...BREAST_DX_AESTHETIC,
];

export function getBreastSubcategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dx of BREAST_DIAGNOSES) {
    if (!seen.has(dx.subcategory)) {
      seen.add(dx.subcategory);
      result.push(dx.subcategory);
    }
  }
  return result;
}

export function getBreastDiagnosesForSubcategory(
  subcategory: string,
): DiagnosisPicklistEntry[] {
  return BREAST_DIAGNOSES.filter((dx) => dx.subcategory === subcategory);
}
