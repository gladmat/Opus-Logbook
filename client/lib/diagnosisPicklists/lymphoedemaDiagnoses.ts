/**
 * Lymphoedema Diagnosis Picklist
 *
 * Re-maps gen_dx_lymphoedema from generalDiagnoses.ts with
 * specialty: "lymphoedema". Expands into primary (Milroy, Meige, praecox, tarda),
 * secondary (post-lymphadenectomy, post-radiation), and by-site subtypes.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMARY LYMPHOEDEMA
// ═══════════════════════════════════════════════════════════════════════════════

const LE_DX_PRIMARY: DiagnosisPicklistEntry[] = [
  {
    id: "le_dx_primary_congenital",
    displayName: "Primary lymphoedema — congenital (Milroy disease)",
    shortName: "Milroy",
    snomedCtCode: "56266002",
    snomedCtDisplay: "Congenital lymphedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Primary Lymphoedema",
    clinicalGroup: "congenital",
    hasStaging: true, // ISL staging
    searchSynonyms: [
      "Milroy",
      "congenital lymphoedema",
      "primary lymphoedema",
      "hereditary lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_lymph_lva",
        displayName: "Lymphovenous anastomosis (LVA)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_lymph_vlnt",
        displayName: "Vascularised lymph node transfer (VLNT)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "le_dx_primary_praecox",
    displayName: "Primary lymphoedema — praecox (Meige disease)",
    shortName: "Lymphoedema praecox",
    snomedCtCode: "234097001",
    snomedCtDisplay: "Lymphedema praecox (disorder)",
    specialty: "lymphoedema",
    subcategory: "Primary Lymphoedema",
    clinicalGroup: "elective",
    hasStaging: true,
    searchSynonyms: [
      "Meige",
      "praecox",
      "lymphoedema praecox",
      "adolescent onset",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_lymph_lva",
        displayName: "Lymphovenous anastomosis (LVA)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_lymph_vlnt",
        displayName: "Vascularised lymph node transfer (VLNT)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_lymph_liposuction",
        displayName: "Liposuction for lymphoedema",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For ISL Stage II-III",
        conditionStagingMatch: {
          stagingSystemName: "ISL Stage",
          matchValues: ["II", "IIb", "III"],
        },
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "le_dx_primary_tarda",
    displayName: "Primary lymphoedema — tarda (onset > 35 years)",
    shortName: "Lymphoedema tarda",
    snomedCtCode: "234097001",
    snomedCtDisplay: "Lymphedema tarda (disorder)",
    specialty: "lymphoedema",
    subcategory: "Primary Lymphoedema",
    clinicalGroup: "elective",
    hasStaging: true,
    searchSynonyms: [
      "tarda",
      "late onset",
      "lymphoedema tarda",
      "adult onset lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_lymph_lva",
        displayName: "Lymphovenous anastomosis (LVA)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_lymph_vlnt",
        displayName: "Vascularised lymph node transfer (VLNT)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SECONDARY LYMPHOEDEMA
// ═══════════════════════════════════════════════════════════════════════════════

const LE_DX_SECONDARY: DiagnosisPicklistEntry[] = [
  {
    id: "le_dx_secondary_post_lymphadenectomy",
    displayName: "Secondary lymphoedema — post-lymphadenectomy",
    shortName: "Post-LND lymphoedema",
    snomedCtCode: "234097001",
    snomedCtDisplay: "Secondary lymphedema (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary Lymphoedema",
    clinicalGroup: "elective",
    hasStaging: true,
    searchSynonyms: [
      "post-lymphadenectomy",
      "post-axillary clearance",
      "post-groin dissection",
      "cancer lymphoedema",
      "secondary lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_lymph_lva",
        displayName: "Lymphovenous anastomosis (LVA)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_lymph_vlnt",
        displayName: "Vascularised lymph node transfer (VLNT)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "le_lympha",
        displayName: "LYMPHA (Lymphatic Microsurgical Preventive Healing Approach)",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "le_dx_secondary_post_radiation",
    displayName: "Secondary lymphoedema — post-radiation",
    shortName: "Post-RT lymphoedema",
    snomedCtCode: "234097001",
    snomedCtDisplay: "Lymphedema due to radiation therapy (disorder)",
    specialty: "lymphoedema",
    subcategory: "Secondary Lymphoedema",
    clinicalGroup: "elective",
    hasStaging: true,
    searchSynonyms: [
      "post-radiation",
      "post-radiotherapy",
      "radiation lymphoedema",
      "combined lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_lymph_lva",
        displayName: "Lymphovenous anastomosis (LVA)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_lymph_vlnt",
        displayName: "Vascularised lymph node transfer (VLNT)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BY SITE
// ═══════════════════════════════════════════════════════════════════════════════

const LE_DX_BY_SITE: DiagnosisPicklistEntry[] = [
  {
    id: "le_dx_upper_limb",
    displayName: "Lymphoedema — upper limb (breast cancer related)",
    shortName: "Upper limb LE",
    snomedCtCode: "234097001",
    snomedCtDisplay: "Lymphedema of upper limb (disorder)",
    specialty: "lymphoedema",
    subcategory: "By Site",
    clinicalGroup: "elective",
    hasStaging: true,
    searchSynonyms: [
      "arm swelling",
      "upper limb lymphoedema",
      "breast cancer arm",
      "BCRL",
      "arm lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "le_lva_upper",
        displayName: "LVA — upper limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "le_vlnt_groin",
        displayName: "VLNT — groin-to-axilla transfer",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_lymph_liposuction",
        displayName: "Liposuction for lymphoedema",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For ISL Stage II-III",
        conditionStagingMatch: {
          stagingSystemName: "ISL Stage",
          matchValues: ["II", "IIb", "III"],
        },
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "le_dx_lower_limb",
    displayName: "Lymphoedema — lower limb",
    shortName: "Lower limb LE",
    snomedCtCode: "234097001",
    snomedCtDisplay: "Lymphedema of lower limb (disorder)",
    specialty: "lymphoedema",
    subcategory: "By Site",
    clinicalGroup: "elective",
    hasStaging: true,
    searchSynonyms: [
      "leg swelling",
      "lower limb lymphoedema",
      "leg lymphoedema",
      "groin lymphoedema",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "le_lva_lower",
        displayName: "LVA — lower limb",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "le_vlnt_supraclavicular",
        displayName: "VLNT — supraclavicular transfer",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_lymph_liposuction",
        displayName: "Liposuction for lymphoedema",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For ISL Stage II-III",
        conditionStagingMatch: {
          stagingSystemName: "ISL Stage",
          matchValues: ["II", "IIb", "III"],
        },
        sortOrder: 3,
      },
      {
        procedurePicklistId: "gen_lymph_debulking",
        displayName: "Debulking / Charles procedure",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For ISL Stage III (elephantiasis)",
        conditionStagingMatch: {
          stagingSystemName: "ISL Stage",
          matchValues: ["III"],
        },
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const LYMPHOEDEMA_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...LE_DX_PRIMARY,
  ...LE_DX_SECONDARY,
  ...LE_DX_BY_SITE,
];
