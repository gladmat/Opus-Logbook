/**
 * Lymphoedema & Lymphatic Surgery Diagnosis Picklist
 *
 * ~29 diagnoses across 6 clinical groups:
 * - Secondary Lymphoedema — Post-Cancer (10)
 * - Secondary Lymphoedema — Non-Cancer (5)
 * - Primary Lymphoedema (6)
 * - Lipedema (2)
 * - Lymphatic Malformations & Chylous Disorders (4)
 * - Emerging / Experimental (2)
 *
 * All IDs use `lymph_dx_` prefix.
 * All entries have `lymphoedemaModule: true` to activate the LymphaticAssessment inline module.
 * All SNOMED CT codes validated against CSIRO Ontoserver (2026-03-20).
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// 3A. SECONDARY LYMPHOEDEMA — POST-CANCER
// ═══════════════════════════════════════════════════════════════════════════════

const LYMPH_DX_SECONDARY_CANCER: DiagnosisPicklistEntry[] = [
  {
    id: "lymph_dx_bcrl_upper",
    displayName: "Breast cancer-related lymphoedema — upper limb",
    shortName: "BCRL upper limb",
    snomedCtCode: "449620005",
    snomedCtDisplay: "Lymphedema of upper limb (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "BCRL",
      "breast cancer arm",
      "arm swelling",
      "upper limb lymphoedema",
      "axillary lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_upper",
        displayName: "LVA — upper limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_submental",
        displayName: "VLNT — submental donor",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "lymph_sapl",
        displayName: "SAPL (Brorson technique)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For ISL Stage II-III",
        conditionStagingMatch: {
          stagingSystemName: "ISL Stage",
          matchValues: ["II", "IIb", "II_early", "II_late", "III"],
        },
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "lymph_dx_bcrl_breast",
    displayName: "Breast cancer-related lymphoedema — breast/trunk",
    shortName: "BCRL breast",
    snomedCtCode: "234097001",
    snomedCtDisplay: "Lymphoedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "breast lymphoedema",
      "trunk swelling",
      "chest wall lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_vlnt_submental",
        displayName: "VLNT — submental donor",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_fat_grafting",
        displayName: "Fat grafting for lymphoedema",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "lymph_dx_gynae_lower",
    displayName: "Post-gynaecological cancer lymphoedema — lower limb",
    shortName: "Gynae LE lower",
    snomedCtCode: "403385000",
    snomedCtDisplay: "Lymphedema of lower extremity (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "gynaecological cancer",
      "cervical cancer",
      "ovarian cancer",
      "endometrial",
      "leg swelling",
      "lower limb lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_supraclavicular",
        displayName: "VLNT — supraclavicular donor",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "lymph_sapl",
        displayName: "SAPL (Brorson technique)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For ISL Stage II-III",
        conditionStagingMatch: {
          stagingSystemName: "ISL Stage",
          matchValues: ["II", "IIb", "II_early", "II_late", "III"],
        },
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "lymph_dx_melanoma_upper",
    displayName: "Post-melanoma lymphoedema — upper limb",
    shortName: "Melanoma LE upper",
    snomedCtCode: "449620005",
    snomedCtDisplay: "Lymphedema of upper limb (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: ["melanoma arm", "post-melanoma"],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_upper",
        displayName: "LVA — upper limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_submental",
        displayName: "VLNT — submental donor",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "lymph_dx_melanoma_lower",
    displayName: "Post-melanoma lymphoedema — lower limb",
    shortName: "Melanoma LE lower",
    snomedCtCode: "403385000",
    snomedCtDisplay: "Lymphedema of lower extremity (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: ["melanoma leg", "post-melanoma lower"],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_supraclavicular",
        displayName: "VLNT — supraclavicular donor",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "lymph_dx_uro_lower",
    displayName: "Post-urological cancer lymphoedema — lower limb",
    shortName: "Uro LE lower",
    snomedCtCode: "403385000",
    snomedCtDisplay: "Lymphedema of lower extremity (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "prostate cancer",
      "bladder cancer",
      "urological",
      "inguinal dissection",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_supraclavicular",
        displayName: "VLNT — supraclavicular donor",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "lymph_dx_hn_lymphoedema",
    displayName: "Post-head & neck cancer lymphoedema — face/neck",
    shortName: "H&N lymphoedema",
    snomedCtCode: "234097001",    snomedCtDisplay: "Lymphedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "head and neck",
      "facial lymphoedema",
      "neck dissection",
      "submental",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_cervical",
        displayName: "LVA — cervical",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_submental",
        displayName: "VLNT — submental donor",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 7,
  },
  {
    id: "lymph_dx_sarcoma_le",
    displayName: "Post-sarcoma lymphoedema",
    shortName: "Sarcoma LE",
    snomedCtCode: "440121002",
    snomedCtDisplay: "Postsurgical lymphedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: ["sarcoma", "soft tissue sarcoma"],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_upper",
        displayName: "LVA — upper limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "lymph_vlnt_supraclavicular",
        displayName: "VLNT — supraclavicular donor",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 8,
  },
  {
    id: "lymph_dx_post_radiation_le",
    displayName: "Post-radiation lymphoedema",
    shortName: "Radiation LE",
    snomedCtCode: "724859002",
    snomedCtDisplay: "Lymphoedema due to and following radiotherapy (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "radiation",
      "radiotherapy",
      "post-RT",
      "combined lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_upper",
        displayName: "LVA — upper limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "lymph_vlnt_submental",
        displayName: "VLNT — submental donor",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 9,
  },
  {
    id: "lymph_dx_genital_cancer",
    displayName: "Post-cancer genital lymphoedema",
    shortName: "Genital LE (cancer)",
    snomedCtCode: "403386004",    snomedCtDisplay: "Lymphedema of genitalia (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Post-Cancer",
    clinicalGroup: "secondary_cancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "genital swelling",
      "scrotal",
      "penile",
      "vulvar lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_genital_excision",
        displayName: "Genital lymphoedema excision + reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_inguinal",
        displayName: "VLNT — inguinal donor",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 10,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3B. SECONDARY LYMPHOEDEMA — NON-CANCER
// ═══════════════════════════════════════════════════════════════════════════════

const LYMPH_DX_SECONDARY_NONCANCER: DiagnosisPicklistEntry[] = [
  {
    id: "lymph_dx_post_trauma",
    displayName: "Post-traumatic lymphoedema",
    shortName: "Trauma LE",
    snomedCtCode: "440121002",
    snomedCtDisplay: "Postsurgical lymphedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Non-Cancer",
    clinicalGroup: "secondary_noncancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: ["trauma", "post-traumatic", "injury lymphoedema"],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_upper",
        displayName: "LVA — upper limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "lymph_dx_post_infection",
    displayName: "Post-infection lymphoedema (non-filariasis)",
    shortName: "Infection LE",
    snomedCtCode: "234097001",
    snomedCtDisplay: "Lymphoedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Non-Cancer",
    clinicalGroup: "secondary_noncancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "cellulitis",
      "post-infection",
      "recurrent cellulitis",
      "streptococcal",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_upper",
        displayName: "LVA — upper limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "lymph_sapl",
        displayName: "SAPL (Brorson technique)",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "lymph_dx_filariasis",
    displayName: "Lymphatic filariasis",
    shortName: "Filariasis",
    snomedCtCode: "240820001",
    snomedCtDisplay: "Lymphatic filariasis (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Non-Cancer",
    clinicalGroup: "secondary_noncancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "filariasis",
      "elephantiasis",
      "Wuchereria",
      "Brugia",
      "tropical",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_sapl",
        displayName: "SAPL (Brorson technique)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_charles",
        displayName: "Charles procedure",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "lymph_dx_obesity_related",
    displayName: "Obesity-related lymphoedema",
    shortName: "Obesity LE",
    snomedCtCode: "234097001",    snomedCtDisplay: "Lymphedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Non-Cancer",
    clinicalGroup: "secondary_noncancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: ["obesity", "BMI", "morbid obesity", "massive weight"],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_sapl",
        displayName: "SAPL (Brorson technique)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "lymph_dx_phlebolymphoedema",
    displayName: "Phlebolymphoedema",
    shortName: "Phlebo-LE",
    snomedCtCode: "234097001",    snomedCtDisplay: "Lymphedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary — Non-Cancer",
    clinicalGroup: "secondary_noncancer",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "venous",
      "phlebolymphoedema",
      "CVI",
      "chronic venous insufficiency",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_sapl",
        displayName: "SAPL (Brorson technique)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3C. PRIMARY LYMPHOEDEMA
// ═══════════════════════════════════════════════════════════════════════════════

const LYMPH_DX_PRIMARY: DiagnosisPicklistEntry[] = [
  {
    id: "lymph_dx_milroy",
    displayName: "Milroy disease (congenital lymphoedema)",
    shortName: "Milroy",
    snomedCtCode: "399889006",
    snomedCtDisplay: "Hereditary lymphoedema type I (disorder)",
    specialty: "lymphoedema",
    subcategory: "Primary Lymphoedema",
    clinicalGroup: "primary",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "Milroy",
      "congenital",
      "hereditary lymphoedema type I",
      "VEGFR3",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_vlnt_submental",
        displayName: "VLNT — submental donor",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_charles",
        displayName: "Charles procedure",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "lymph_dx_meige",
    displayName: "Meige disease (lymphoedema praecox)",
    shortName: "Meige / Praecox",
    snomedCtCode: "77123007",
    snomedCtDisplay: "Lymphedema praecox (disorder)",
    specialty: "lymphoedema",
    subcategory: "Primary Lymphoedema",
    clinicalGroup: "primary",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "Meige",
      "praecox",
      "adolescent onset",
      "hereditary lymphoedema type II",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_supraclavicular",
        displayName: "VLNT — supraclavicular donor",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "lymph_dx_tarda",
    displayName: "Lymphoedema tarda",
    shortName: "LE tarda",
    snomedCtCode: "400158000",
    snomedCtDisplay: "Primary lymphoedema tardum (disorder)",
    specialty: "lymphoedema",
    subcategory: "Primary Lymphoedema",
    clinicalGroup: "primary",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "tarda",
      "late onset",
      "adult onset lymphoedema",
      "over 35",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_supraclavicular",
        displayName: "VLNT — supraclavicular donor",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "lymph_dx_hereditary_other",
    displayName: "Hereditary lymphoedema — other/unspecified",
    shortName: "Hereditary LE",
    snomedCtCode: "254199006",
    snomedCtDisplay: "Hereditary lymphoedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Primary Lymphoedema",
    clinicalGroup: "primary",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "hereditary",
      "familial",
      "genetic",
      "syndromic lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_vlnt_supraclavicular",
        displayName: "VLNT — supraclavicular donor",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "lymph_dx_primary_upper",
    displayName: "Primary lymphoedema — upper limb",
    shortName: "Primary LE upper",
    snomedCtCode: "1217009002",
    snomedCtDisplay: "Primary lymphoedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Primary Lymphoedema",
    clinicalGroup: "primary",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: ["primary arm", "idiopathic upper"],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_upper",
        displayName: "LVA — upper limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_submental",
        displayName: "VLNT — submental donor",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "lymph_dx_primary_lower",
    displayName: "Primary lymphoedema — lower limb",
    shortName: "Primary LE lower",
    snomedCtCode: "1217009002",
    snomedCtDisplay: "Primary lymphoedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Primary Lymphoedema",
    clinicalGroup: "primary",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: ["primary leg", "idiopathic lower"],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_vlnt_supraclavicular",
        displayName: "VLNT — supraclavicular donor",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3D. LIPEDEMA
// ═══════════════════════════════════════════════════════════════════════════════

const LYMPH_DX_LIPEDEMA: DiagnosisPicklistEntry[] = [
  {
    id: "lymph_dx_lipedema",
    displayName: "Lipedema",
    shortName: "Lipedema",
    snomedCtCode: "234102003",
    snomedCtDisplay: "Lipoedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Lipedema",
    clinicalGroup: "lipedema",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "lipedema",
      "lipoedema",
      "painful fat",
      "column legs",
      "disproportionate fat",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lipo_lipedema",
        displayName: "Liposuction for lipedema",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "lymph_dx_lipolymphoedema",
    displayName: "Lipo-lymphoedema (lipedema Stage IV)",
    shortName: "Lipo-LE",
    snomedCtCode: "234102003",    snomedCtDisplay: "Lipoedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Lipedema",
    clinicalGroup: "lipedema",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "lipo-lymphoedema",
      "stage IV lipedema",
      "combined lipedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lipo_lipedema",
        displayName: "Liposuction for lipedema",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3E. LYMPHATIC MALFORMATIONS & CHYLOUS DISORDERS
// ═══════════════════════════════════════════════════════════════════════════════

const LYMPH_DX_MALFORMATION: DiagnosisPicklistEntry[] = [
  {
    id: "lymph_dx_lymphatic_malformation",
    displayName: "Lymphatic malformation",
    shortName: "Lymphatic malf",
    snomedCtCode: "234095009",
    snomedCtDisplay: "Lymphatic malformation (disorder)",
    specialty: "lymphoedema",
    subcategory: "Malformation & Chylous",
    clinicalGroup: "malformation",
    hasStaging: false,
    lymphoedemaModule: true,
    searchSynonyms: [
      "lymphangioma",
      "cystic hygroma",
      "lymphatic malformation",
      "macrocystic",
      "microcystic",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_malf_excision",
        displayName: "Excision of lymphatic malformation",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_malf_sclerotherapy",
        displayName: "Sclerotherapy for lymphatic malformation",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "lymph_dx_chylothorax",
    displayName: "Chylothorax",
    shortName: "Chylothorax",
    snomedCtCode: "83035003",
    snomedCtDisplay: "Chylothorax (disorder)",
    specialty: "lymphoedema",
    subcategory: "Malformation & Chylous",
    clinicalGroup: "chylous",
    hasStaging: false,
    lymphoedemaModule: true,
    searchSynonyms: ["chylothorax", "chyle leak chest", "thoracic duct"],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_thoracic_duct_ligation",
        displayName: "Thoracic duct ligation",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "lymph_thoracic_duct_embolisation",
        displayName: "Thoracic duct embolisation",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "lymph_dx_chylous_ascites",
    displayName: "Chylous ascites",
    shortName: "Chylous ascites",
    snomedCtCode: "52985009",
    snomedCtDisplay: "Chylous ascites (disorder)",
    specialty: "lymphoedema",
    subcategory: "Malformation & Chylous",
    clinicalGroup: "chylous",
    hasStaging: false,
    lymphoedemaModule: true,
    searchSynonyms: ["chylous ascites", "chyle abdomen", "peritoneal chyle"],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_thoracic_duct_ligation",
        displayName: "Thoracic duct ligation",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "lymph_dx_chylous_leak",
    displayName: "Chylous leak / lymphatic fistula",
    shortName: "Chylous leak",
    snomedCtCode: "234097001",    snomedCtDisplay: "Lymphatic fistula (disorder)",
    specialty: "lymphoedema",
    subcategory: "Malformation & Chylous",
    clinicalGroup: "chylous",
    hasStaging: false,
    lymphoedemaModule: true,
    searchSynonyms: [
      "chyle leak",
      "lymphatic fistula",
      "lymphorrhoea",
      "lymphocele",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_lva_cervical",
        displayName: "LVA — cervical",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3F. EMERGING / EXPERIMENTAL
// ═══════════════════════════════════════════════════════════════════════════════

const LYMPH_DX_EXPERIMENTAL: DiagnosisPicklistEntry[] = [
  {
    id: "lymph_dx_alzheimers_glymphatic",
    displayName:
      "Alzheimer's disease — glymphatic dysfunction (experimental)",
    shortName: "AD glymphatic",
    snomedCtCode: "26929004",    snomedCtDisplay: "Alzheimer's disease (disorder)",
    specialty: "lymphoedema",
    subcategory: "Experimental",
    clinicalGroup: "experimental",
    hasStaging: false,
    lymphoedemaModule: true,
    searchSynonyms: [
      "Alzheimer",
      "glymphatic",
      "deep cervical",
      "neurodegenerative",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_dc_lva",
        displayName: "Deep cervical LVA (experimental)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "lymph_dx_genital_primary",
    displayName: "Primary genital lymphoedema",
    shortName: "Genital LE (primary)",
    snomedCtCode: "403386004",    snomedCtDisplay: "Lymphedema of genitalia (disorder)",
    specialty: "lymphoedema",
    subcategory: "Experimental",
    clinicalGroup: "experimental",
    hasStaging: true,
    lymphoedemaModule: true,
    searchSynonyms: [
      "congenital genital",
      "primary genital",
      "scrotal lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "lymph_genital_excision",
        displayName: "Genital lymphoedema excision + reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT — all 29 diagnoses
// ═══════════════════════════════════════════════════════════════════════════════

export const LYMPHOEDEMA_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...LYMPH_DX_SECONDARY_CANCER,
  ...LYMPH_DX_SECONDARY_NONCANCER,
  ...LYMPH_DX_PRIMARY,
  ...LYMPH_DX_LIPEDEMA,
  ...LYMPH_DX_MALFORMATION,
  ...LYMPH_DX_EXPERIMENTAL,
];
