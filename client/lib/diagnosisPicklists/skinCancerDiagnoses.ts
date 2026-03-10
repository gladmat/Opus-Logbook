/**
 * Skin Cancer Diagnosis Picklist
 *
 * Re-maps skin cancer entries from generalDiagnoses.ts (GEN_DX_SKIN_CANCER)
 * with specialty: "skin_cancer". Adds Merkel cell, DFSP, AFX, keratoacanthoma,
 * and Bowen's disease entries that are specific to the skin cancer specialty.
 *
 * H&N site-specific skin cancers remain in headNeckDiagnoses.ts but are
 * cross-tagged with skin_cancer via the SPECIALTY_MAP in index.ts.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMARY SKIN CANCERS — trunk / limbs
// ═══════════════════════════════════════════════════════════════════════════════

const SC_DX_PRIMARY: DiagnosisPicklistEntry[] = [
  {
    id: "sc_dx_skin_lesion_excision_biopsy",
    displayName: "Skin lesion — excision biopsy (awaiting histology)",
    shortName: "Excision biopsy",
    snomedCtCode: "95324001",
    snomedCtDisplay: "Skin lesion (finding)",
    specialty: "skin_cancer",
    subcategory: "Unclear Lesion",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: false,
    searchSynonyms: [
      "excision biopsy",
      "diagnostic excision",
      "skin lesion",
      "suspicious lesion",
      "awaiting histology",
      "?BCC",
      "?SCC",
      "?melanoma",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_benign_lesion",
        displayName: "Skin lesion excision (diagnostic)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_skin_biopsy_punch",
        displayName: "Skin biopsy — punch / incisional",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_skin_shave_curette",
        displayName: "Shave excision / curettage",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 0,
  },
  {
    id: "sc_dx_bcc",
    displayName: "Basal cell carcinoma (BCC)",
    shortName: "BCC",
    snomedCtCode: "254701007",
    snomedCtDisplay: "Basal cell carcinoma of skin (disorder)",
    specialty: "skin_cancer",
    subcategory: "Non-Melanoma Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: [
      "BCC",
      "basal cell",
      "rodent ulcer",
      "basal cell carcinoma",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_bcc_excision_body",
        displayName: "BCC excision — trunk / limbs",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_skin_biopsy_punch",
        displayName: "Skin biopsy — punch / incisional",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "sc_dx_scc",
    displayName: "Squamous cell carcinoma (SCC)",
    shortName: "SCC",
    snomedCtCode: "254651007",
    snomedCtDisplay: "Squamous cell carcinoma of skin (disorder)",
    specialty: "skin_cancer",
    subcategory: "Non-Melanoma Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["SCC", "squamous cell", "cutaneous SCC", "cSCC"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_scc_excision_body",
        displayName: "SCC excision — trunk / limbs",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_mel_slnb_body",
        displayName: "Sentinel lymph node biopsy (high-risk SCC)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "sc_dx_bowens",
    displayName: "Bowen's disease (SCC in situ)",
    shortName: "Bowen's",
    snomedCtCode: "254656002",
    snomedCtDisplay: "Squamous cell carcinoma in situ of skin (disorder)",
    specialty: "skin_cancer",
    subcategory: "Non-Melanoma Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: [
      "Bowen's",
      "Bowen disease",
      "SCC in situ",
      "intraepidermal SCC",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_scc_excision_body",
        displayName: "Excision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_skin_shave_curette",
        displayName: "Shave excision / curettage",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "sc_dx_keratoacanthoma",
    displayName: "Keratoacanthoma",
    shortName: "KA",
    snomedCtCode: "254662007",
    snomedCtDisplay: "Keratoacanthoma (disorder)",
    specialty: "skin_cancer",
    subcategory: "Non-Melanoma Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["keratoacanthoma", "KA", "well-differentiated SCC"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_scc_excision_body",
        displayName: "Excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "sc_dx_actinic_keratosis",
    displayName: "Actinic keratosis",
    shortName: "AK",
    snomedCtCode: "201101007",
    snomedCtDisplay: "Actinic keratosis (disorder)",
    specialty: "skin_cancer",
    subcategory: "Premalignant",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: false,
    searchSynonyms: ["actinic keratosis", "AK", "solar keratosis", "sun spot"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_shave_curette",
        displayName: "Shave excision / curettage",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_skin_biopsy_punch",
        displayName: "Skin biopsy — punch / incisional",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MELANOMA
// ═══════════════════════════════════════════════════════════════════════════════

const SC_DX_MELANOMA: DiagnosisPicklistEntry[] = [
  {
    id: "sc_dx_melanoma",
    displayName: "Melanoma",
    shortName: "Melanoma",
    snomedCtCode: "93655004",
    snomedCtDisplay: "Malignant melanoma of skin (disorder)",
    specialty: "skin_cancer",
    subcategory: "Melanoma",
    clinicalGroup: "oncological",
    hasStaging: true,
    hasEnhancedHistology: true,
    searchSynonyms: [
      "melanoma",
      "malignant melanoma",
      "MM",
      "WLE",
      "wide local excision",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_mel_wle_body",
        displayName: "Melanoma wide local excision — trunk / limbs",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_mel_slnb_body",
        displayName: "Sentinel lymph node biopsy",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Breslow >= 0.8 mm",
        conditionStagingMatch: {
          stagingSystemName: "Breslow Thickness",
          matchValues: ["0.81-1.0", "1.01-2.0", "2.01-4.0", ">4.0"],
        },
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_mel_clnd",
        displayName: "Completion lymph node dissection",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "gen_mel_in_transit_excision",
        displayName: "In-transit metastasis excision",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "sc_dx_melanoma_primary",
    displayName: "Melanoma — primary excision biopsy",
    shortName: "Melanoma biopsy",
    snomedCtCode: "93655004",
    snomedCtDisplay: "Malignant melanoma of skin (disorder)",
    specialty: "skin_cancer",
    subcategory: "Melanoma",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: [
      "melanoma excision biopsy",
      "suspicious mole excision",
      "pigmented lesion",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_mel_excision_body",
        displayName: "Melanoma excision — trunk / limbs (primary)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RARE / OTHER MALIGNANT
// ═══════════════════════════════════════════════════════════════════════════════

const SC_DX_RARE: DiagnosisPicklistEntry[] = [
  {
    id: "sc_dx_merkel_cell",
    displayName: "Merkel cell carcinoma (MCC)",
    shortName: "MCC",
    snomedCtCode: "253001006",
    snomedCtDisplay: "Merkel cell carcinoma of skin (disorder)",
    specialty: "skin_cancer",
    subcategory: "Rare / Other Malignant",
    clinicalGroup: "oncological",
    hasStaging: true,
    hasEnhancedHistology: true,
    searchSynonyms: ["Merkel cell", "MCC", "neuroendocrine carcinoma skin"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_mel_merkel_excision",
        displayName: "Merkel cell carcinoma excision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_mel_slnb_body",
        displayName: "Sentinel lymph node biopsy",
        isDefault: true,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "sc_dx_dfsp",
    displayName: "Dermatofibrosarcoma protuberans (DFSP)",
    shortName: "DFSP",
    snomedCtCode: "276799004",
    snomedCtDisplay: "Dermatofibrosarcoma protuberans (disorder)",
    specialty: "skin_cancer",
    subcategory: "Rare / Other Malignant",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["DFSP", "dermatofibrosarcoma", "protuberans"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_mel_dfsp_excision",
        displayName: "DFSP wide excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "sc_dx_afx",
    displayName: "Atypical fibroxanthoma (AFX)",
    shortName: "AFX",
    snomedCtCode: "254754005",
    snomedCtDisplay: "Atypical fibroxanthoma of skin (disorder)",
    specialty: "skin_cancer",
    subcategory: "Rare / Other Malignant",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: [
      "AFX",
      "atypical fibroxanthoma",
      "fibroxanthoma",
      "pleomorphic dermal sarcoma",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "sc_afx_excision",
        displayName: "AFX wide excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const SKIN_CANCER_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...SC_DX_PRIMARY,
  ...SC_DX_MELANOMA,
  ...SC_DX_RARE,
];
