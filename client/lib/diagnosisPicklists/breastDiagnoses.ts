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
    snomedCtCode: "109889007",
    snomedCtDisplay: "Intraductal carcinoma in situ of breast (disorder)",
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
    snomedCtCode: "712989008",
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
    snomedCtCode: "721551005",
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
      "post radiation",
      "radiation reconstruction",
      "irradiated breast",
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
    snomedCtCode: "449844005",
    snomedCtDisplay: "Breast prosthesis in situ (finding)",
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
    snomedCtCode: "69260008",
    snomedCtDisplay: "Complication of internal prosthetic device (disorder)",
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
  {
    id: "breast_dx_failed_implant_autologous",
    displayName: "Failed implant reconstruction — autologous conversion",
    shortName: "Failed implant → autologous",
    snomedCtCode: "69260008",
    snomedCtDisplay: "Complication of internal prosthetic device (disorder)",
    specialty: "breast",
    subcategory: "Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "failed implant",
      "implant failure",
      "autologous conversion",
      "salvage reconstruction",
      "tertiary reconstruction",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_implant_removal",
        displayName: "Implant removal ± capsulectomy",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_recon_diep",
        displayName: "DIEP flap breast reconstruction",
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "breast_recon_ld_implant",
        displayName: "Pedicled LD flap ± implant",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "breast_dx_contralateral_symmetry",
    displayName: "Contralateral breast — symmetrisation procedure",
    shortName: "Symmetrisation",
    snomedCtCode: "123581000119101",
    snomedCtDisplay: "Disproportion of reconstructed breast (disorder)",
    specialty: "breast",
    subcategory: "Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "symmetry",
      "symmetrisation",
      "contralateral",
      "matching procedure",
      "balancing procedure",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_onco_contralateral_symmetrisation",
        displayName: "Contralateral symmetrisation",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_aes_reduction_wise",
        displayName: "Breast reduction (Wise pattern)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "breast_aes_mastopexy_vertical",
        displayName: "Mastopexy (vertical)",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "breast_aes_augmentation_implant",
        displayName: "Breast augmentation — implant",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 5,
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
    snomedCtCode: "237474000",
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
    snomedCtCode: "237473006",
    snomedCtDisplay: "Rupture of breast prosthesis (disorder)",
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
    snomedCtCode: "783541009",
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
    snomedCtCode: "69260008",
    snomedCtDisplay: "Complication of internal prosthetic device (disorder)",
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
    snomedCtCode: "8915006",
    snomedCtDisplay: "Congenital hypoplasia of breast (disorder)",
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
    snomedCtCode: "372281005",
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
    snomedCtCode: "36199004",
    snomedCtDisplay: "Pendulous breast (disorder)",
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
    snomedCtCode: "248806007",
    snomedCtDisplay: "Size of breasts unequal (finding)",
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
    snomedCtCode: "8915006",
    snomedCtDisplay: "Congenital hypoplasia of breast (disorder)",
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
    snomedCtCode: "38371006",
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
    snomedCtCode: "21381006",
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
// IMPLANT COMPLICATIONS — EXTENDED
// ═══════════════════════════════════════════════════════════════════════════════

const BREAST_DX_IMPLANT_COMPLICATIONS_EXTENDED: DiagnosisPicklistEntry[] = [
  {
    id: "breast_dx_implant_malposition",
    displayName: "Implant malposition",
    shortName: "Malposition",
    snomedCtCode: "236507001", // VERIFY
    snomedCtDisplay: "Malposition of breast implant (disorder)",
    specialty: "breast",
    subcategory: "Implant Complications",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "implant malposition",
      "bottoming out",
      "lateral displacement",
      "high riding implant",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_capsulorrhaphy",
        displayName: "Capsulorrhaphy (pocket adjustment)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_rev_pocket_plane_conversion",
        displayName: "Pocket plane conversion",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "breast_dx_animation_deformity",
    displayName: "Animation deformity",
    shortName: "Animation deformity",
    snomedCtCode: "236507001", // VERIFY
    snomedCtDisplay: "Animation deformity of breast (disorder)",
    specialty: "breast",
    subcategory: "Implant Complications",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "animation deformity",
      "dynamic distortion",
      "pectoralis muscle movement",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_animation_deformity",
        displayName: "Animation deformity correction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_rev_pocket_plane_conversion",
        displayName: "Pocket plane conversion (to prepectoral)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "breast_dx_symmastia",
    displayName: "Symmastia (breadloafing / uniboob)",
    shortName: "Symmastia",
    snomedCtCode: "236507001", // VERIFY
    snomedCtDisplay: "Symmastia (disorder)",
    specialty: "breast",
    subcategory: "Implant Complications",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "symmastia",
      "breadloafing",
      "uniboob",
      "medial implant communication",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_symmastia_repair",
        displayName: "Symmastia repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_rev_capsulorrhaphy",
        displayName: "Capsulorrhaphy",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 7,
  },
  {
    id: "breast_dx_implant_infection",
    displayName: "Breast implant infection / periprosthetic infection",
    shortName: "Implant infection",
    snomedCtCode: "236507001", // VERIFY
    snomedCtDisplay: "Infection of breast implant (disorder)",
    specialty: "breast",
    subcategory: "Implant Complications",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "implant infection",
      "periprosthetic infection",
      "infected implant",
      "prosthetic infection breast",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_rev_implant_removal",
        displayName: "Implant removal",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 8,
  },
  {
    id: "breast_dx_capsule_calcification",
    displayName: "Capsule calcification",
    shortName: "Capsule calcification",
    snomedCtCode: "236507001", // VERIFY
    snomedCtDisplay: "Calcification of breast implant capsule (disorder)",
    specialty: "breast",
    subcategory: "Implant Complications",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "capsule calcification",
      "calcified capsule",
      "eggshell capsule",
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
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 9,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GENDER-AFFIRMING
// ═══════════════════════════════════════════════════════════════════════════════

const BREAST_DX_GENDER_AFFIRMING: DiagnosisPicklistEntry[] = [
  {
    id: "breast_dx_gender_dysphoria_transmasc",
    displayName: "Gender dysphoria — transmasculine (chest masculinisation)",
    shortName: "Gender dysphoria (TM)",
    snomedCtCode: "93461009", // VERIFY
    snomedCtDisplay: "Gender dysphoria (finding)",
    specialty: "breast",
    subcategory: "Gender-Affirming",
    clinicalGroup: "gender_affirming",
    hasStaging: false,
    searchSynonyms: [
      "gender dysphoria",
      "transmasculine",
      "chest masculinisation",
      "top surgery ftm",
      "mastectomy transgender",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_ga_chest_masc_di_fng",
        displayName: "Chest masculinisation — double incision with FNG",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_ga_chest_masc_periareolar",
        displayName: "Chest masculinisation — periareolar",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "breast_ga_chest_masc_keyhole",
        displayName: "Chest masculinisation — keyhole",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "breast_ga_chest_masc_buttonhole",
        displayName: "Chest masculinisation — buttonhole",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "breast_dx_gender_dysphoria_transfem",
    displayName: "Gender dysphoria — transfeminine (breast augmentation)",
    shortName: "Gender dysphoria (TF)",
    snomedCtCode: "93461009", // VERIFY
    snomedCtDisplay: "Gender dysphoria (finding)",
    specialty: "breast",
    subcategory: "Gender-Affirming",
    clinicalGroup: "gender_affirming",
    hasStaging: false,
    searchSynonyms: [
      "gender dysphoria",
      "transfeminine",
      "breast augmentation transgender",
      "top surgery mtf",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_ga_augmentation_transfem",
        displayName: "Breast augmentation — transfeminine",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// POST-TREATMENT
// ═══════════════════════════════════════════════════════════════════════════════

const BREAST_DX_POST_TREATMENT: DiagnosisPicklistEntry[] = [
  {
    id: "breast_dx_lymphoedema",
    displayName: "Breast lymphoedema (post-axillary surgery)",
    shortName: "Breast lymphoedema",
    snomedCtCode: "234097001", // VERIFY
    snomedCtDisplay: "Lymphoedema of upper limb (disorder)",
    specialty: "breast",
    subcategory: "Post-Treatment",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "breast lymphoedema",
      "arm swelling",
      "post-axillary",
      "lymphedema",
    ],
    suggestedProcedures: [],
    sortOrder: 1,
  },
  {
    id: "breast_dx_radiation_damage",
    displayName: "Radiation-damaged breast",
    shortName: "Radiation damage",
    snomedCtCode: "200936003", // VERIFY
    snomedCtDisplay: "Radiation injury of breast (disorder)",
    specialty: "breast",
    subcategory: "Post-Treatment",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "radiation damage",
      "radiation fibrosis",
      "post-radiotherapy breast",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_fat_recon",
        displayName: "Fat grafting — breast reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "breast_dx_fibrosis",
    displayName: "Breast fibrosis (post-treatment)",
    shortName: "Breast fibrosis",
    snomedCtCode: "367643001", // VERIFY
    snomedCtDisplay: "Fibrosis of breast (disorder)",
    specialty: "breast",
    subcategory: "Post-Treatment",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["breast fibrosis", "scarring", "post-treatment fibrosis"],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_fat_recon",
        displayName: "Fat grafting — breast reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "breast_dx_post_bct_deformity",
    displayName: "Post-BCT deformity (breast-conserving therapy)",
    shortName: "Post-BCT deformity",
    snomedCtCode: "392090004", // VERIFY
    snomedCtDisplay: "Deformity of breast following surgery (disorder)",
    specialty: "breast",
    subcategory: "Post-Treatment",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "post-BCT deformity",
      "lumpectomy defect",
      "breast-conserving therapy deformity",
      "partial mastectomy defect",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_fat_recon",
        displayName: "Fat grafting — breast reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_onco_oncoplastic_level2",
        displayName: "Oncoplastic Level 2 (volume replacement)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONGENITAL & OTHER
// ═══════════════════════════════════════════════════════════════════════════════

const BREAST_DX_CONGENITAL_OTHER: DiagnosisPicklistEntry[] = [
  {
    id: "breast_dx_accessory_breast",
    displayName: "Accessory breast tissue (polymastia)",
    shortName: "Accessory breast",
    snomedCtCode: "33552001", // VERIFY
    snomedCtDisplay: "Polymastia (disorder)",
    specialty: "breast",
    subcategory: "Congenital & Other",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "accessory breast",
      "polymastia",
      "supernumerary breast",
      "axillary breast tissue",
    ],
    suggestedProcedures: [],
    sortOrder: 1,
  },
  {
    id: "breast_dx_amastia",
    displayName: "Amastia / athelia (congenital absence)",
    shortName: "Amastia",
    snomedCtCode: "69285007", // VERIFY
    snomedCtDisplay: "Amastia (disorder)",
    specialty: "breast",
    subcategory: "Congenital & Other",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "amastia",
      "athelia",
      "congenital absence breast",
      "absent breast",
    ],
    suggestedProcedures: [],
    sortOrder: 2,
  },
  {
    id: "breast_dx_lactational_abscess",
    displayName: "Lactational breast abscess",
    shortName: "Lactational abscess",
    snomedCtCode: "46217008", // VERIFY
    snomedCtDisplay: "Lactational abscess of breast (disorder)",
    specialty: "breast",
    subcategory: "Congenital & Other",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "lactational abscess",
      "breast abscess breastfeeding",
      "puerperal abscess",
    ],
    suggestedProcedures: [],
    sortOrder: 3,
  },
  {
    id: "breast_dx_non_lactational_abscess",
    displayName: "Non-lactational breast abscess / periareolar abscess",
    shortName: "Non-lactational abscess",
    snomedCtCode: "57162001", // VERIFY
    snomedCtDisplay: "Non-lactational abscess of breast (disorder)",
    specialty: "breast",
    subcategory: "Congenital & Other",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "non-lactational abscess",
      "periareolar abscess",
      "Zuska disease",
      "idiopathic granulomatous mastitis",
    ],
    suggestedProcedures: [],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const BREAST_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...BREAST_DX_ONCOLOGICAL,
  ...BREAST_DX_RECONSTRUCTION,
  ...BREAST_DX_IMPLANT_COMPLICATIONS,
  ...BREAST_DX_IMPLANT_COMPLICATIONS_EXTENDED,
  ...BREAST_DX_AESTHETIC,
  ...BREAST_DX_GENDER_AFFIRMING,
  ...BREAST_DX_POST_TREATMENT,
  ...BREAST_DX_CONGENITAL_OTHER,
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
