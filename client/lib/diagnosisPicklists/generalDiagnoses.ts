/**
 * General Plastics Diagnosis Picklist
 *
 * ~27 structured diagnoses covering ~85% of general plastics cases.
 * Now includes skin cancer diagnoses (previously only in skinCancerDiagnoses.ts).
 *
 * Skin cancer entries use the same SNOMED CT codes as skinCancerDiagnoses.ts
 * and set hasEnhancedHistology: true so the enhanced histology workflow
 * (BCC subtypes, SCC differentiation, melanoma Breslow/AJCC staging)
 * can be triggered from the DiagnosisPicker flow.
 *
 * Includes staging-conditional logic for:
 * - Melanoma (Breslow thickness → SLNB conditional on ≥0.8mm)
 * - Pressure injuries (NPUAP staging — in diagnosisStagingConfig.ts)
 * - Hidradenitis suppurativa (Hurley staging)
 * - Lymphoedema (ISL staging)
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// SKIN CANCER — trunk / limbs (non-H&N sites)
// H&N skin cancers are in headNeckDiagnoses.ts with site-specific reconstruction.
// These share SNOMED codes with skinCancerDiagnoses.ts and set
// hasEnhancedHistology: true so the histology overlay is available.
// ═══════════════════════════════════════════════════════════════════════════════

export const GEN_DX_SKIN_CANCER: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_skin_lesion_excision_biopsy",
    displayName: "Skin lesion — excision biopsy (awaiting histology)",
    shortName: "Excision biopsy",
    snomedCtCode: "95324001",
    snomedCtDisplay: "Skin lesion (finding)",
    specialty: "general",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: false,
    searchSynonyms: [
      "excision biopsy",
      "diagnostic excision",
      "skin lesion",
      "suspicious lesion",
      "awaiting histology",
      "query BCC",
      "query SCC",
      "query melanoma",
      "?BCC",
      "?SCC",
      "?melanoma",
      "unknown",
      "biopsy",
      "excise and wait",
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
    id: "gen_dx_bcc",
    displayName: "Basal cell carcinoma (BCC)",
    shortName: "BCC",
    snomedCtCode: "254701007",
    snomedCtDisplay: "Basal cell carcinoma of skin (disorder)",
    specialty: "general",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["BCC", "basal cell", "rodent ulcer", "basal cell carcinoma"],
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
      {
        procedurePicklistId: "gen_skin_shave_curette",
        displayName: "Shave excision / curettage",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_scc",
    displayName: "Squamous cell carcinoma (SCC)",
    shortName: "SCC",
    snomedCtCode: "254651007",
    snomedCtDisplay: "Squamous cell carcinoma of skin (disorder)",
    specialty: "general",
    subcategory: "Skin Cancer",
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
      {
        procedurePicklistId: "gen_skin_biopsy_punch",
        displayName: "Skin biopsy — punch / incisional",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_melanoma",
    displayName: "Melanoma",
    shortName: "Melanoma",
    snomedCtCode: "93655004",
    snomedCtDisplay: "Malignant melanoma of skin (disorder)",
    specialty: "general",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: true,
    hasEnhancedHistology: true,
    searchSynonyms: ["melanoma", "malignant melanoma", "MM", "WLE", "wide local excision"],
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
        conditionDescription: "For Breslow ≥ 0.8 mm",
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
    sortOrder: 3,
  },
  {
    id: "gen_dx_melanoma_primary",
    displayName: "Melanoma — primary excision biopsy",
    shortName: "Melanoma biopsy",
    snomedCtCode: "93655004",
    snomedCtDisplay: "Malignant melanoma of skin (disorder)",
    specialty: "general",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["melanoma excision biopsy", "suspicious mole excision", "pigmented lesion"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_mel_excision_body",
        displayName: "Melanoma excision — trunk / limbs (primary)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "gen_dx_merkel_cell",
    displayName: "Merkel cell carcinoma (MCC)",
    shortName: "MCC",
    snomedCtCode: "253001006",
    snomedCtDisplay: "Merkel cell carcinoma of skin (disorder)",
    specialty: "general",
    subcategory: "Skin Cancer",
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
    sortOrder: 5,
  },
  {
    id: "gen_dx_bowens",
    displayName: "Bowen's disease (SCC in situ)",
    shortName: "Bowen's",
    snomedCtCode: "92579001",
    snomedCtDisplay: "Squamous cell carcinoma in situ of skin (disorder)",
    specialty: "general",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["Bowen's", "Bowen disease", "SCC in situ", "intraepidermal SCC"],
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
    sortOrder: 6,
  },
  {
    id: "gen_dx_actinic_keratosis",
    displayName: "Actinic keratosis",
    shortName: "AK",
    snomedCtCode: "396233003",
    snomedCtDisplay: "Actinic keratosis (disorder)",
    specialty: "general",
    subcategory: "Skin Cancer",
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
    sortOrder: 7,
  },
  {
    id: "gen_dx_keratoacanthoma",
    displayName: "Keratoacanthoma",
    shortName: "KA",
    snomedCtCode: "78209005",
    snomedCtDisplay: "Keratoacanthoma (disorder)",
    specialty: "general",
    subcategory: "Skin Cancer",
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
    sortOrder: 8,
  },
  {
    id: "gen_dx_dfsp",
    displayName: "Dermatofibrosarcoma protuberans (DFSP)",
    shortName: "DFSP",
    snomedCtCode: "404037006",
    snomedCtDisplay: "Dermatofibrosarcoma protuberans (disorder)",
    specialty: "general",
    subcategory: "Skin Cancer",
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
    sortOrder: 9,
  },
];

// BENIGN LESIONS
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_BENIGN: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_lipoma",
    displayName: "Lipoma",
    snomedCtCode: "93163002",
    snomedCtDisplay: "Lipoma (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["lipoma", "fatty lump", "subcutaneous lump"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_lipoma",
        displayName: "Lipoma excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_sebaceous_cyst",
    displayName: "Sebaceous / epidermoid cyst",
    shortName: "Cyst",
    snomedCtCode: "419201005",
    snomedCtDisplay: "Sebaceous cyst (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["sebaceous cyst", "epidermoid cyst", "pilar cyst", "trichilemmal"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_sebaceous_cyst",
        displayName: "Sebaceous / epidermal cyst excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_benign_lesion",
    displayName: "Benign skin lesion — other",
    shortName: "Benign lesion",
    snomedCtCode: "92384003",
    snomedCtDisplay: "Benign neoplasm of skin (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["mole", "naevus", "seborrhoeic keratosis", "dermatofibroma", "benign lesion"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_benign_lesion",
        displayName: "Benign skin lesion excision",
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
    sortOrder: 3,
  },
  {
    id: "gen_dx_naevus_excision",
    displayName: "Benign naevus — excision biopsy",
    shortName: "Naevus biopsy",
    snomedCtCode: "398049005",
    snomedCtDisplay: "Melanocytic naevus (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["mole excision", "atypical naevus", "dysplastic naevus", "changing mole"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_skin_benign_lesion",
        displayName: "Benign skin lesion excision",
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
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCAR / WOUND
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_SCAR_WOUND: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_hypertrophic_scar",
    displayName: "Hypertrophic scar",
    shortName: "Hypertrophic scar",
    snomedCtCode: "76742009",
    snomedCtDisplay: "Hypertrophic scar (disorder)",
    specialty: "general",
    subcategory: "Scar & Wound",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["hypertrophic scar", "raised scar", "red scar", "scar revision"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_scar_revision",
        displayName: "Scar revision (excision + direct closure)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_scar_steroid_injection",
        displayName: "Intralesional steroid injection",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_keloid",
    displayName: "Keloid scar",
    shortName: "Keloid",
    snomedCtCode: "49564006",
    snomedCtDisplay: "Keloid scar (disorder)",
    specialty: "general",
    subcategory: "Scar & Wound",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["keloid", "keloid scar", "ear keloid", "chest keloid"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_scar_steroid_injection",
        displayName: "Intralesional steroid injection",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_scar_revision",
        displayName: "Scar revision (excision ± adjuvant)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_chronic_wound",
    displayName: "Chronic non-healing wound",
    shortName: "Chronic wound",
    snomedCtCode: "13954005",
    snomedCtDisplay: "Non-healing wound (disorder)",
    specialty: "general",
    subcategory: "Scar & Wound",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: ["chronic wound", "non-healing", "leg ulcer", "venous ulcer", "wound"],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy (NPWT)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_pilonidal",
    displayName: "Pilonidal sinus",
    shortName: "Pilonidal",
    snomedCtCode: "47639008",
    snomedCtDisplay: "Pilonidal cyst (disorder)",
    specialty: "general",
    subcategory: "Scar & Wound",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["pilonidal", "sacral sinus", "natal cleft", "pilonidal cyst"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_other_pilonidal_excision",
        displayName: "Pilonidal sinus excision + closure / flap",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "gen_dx_abscess",
    displayName: "Abscess (soft tissue)",
    shortName: "Abscess",
    snomedCtCode: "128477000",
    snomedCtDisplay: "Abscess (disorder)",
    specialty: "general",
    subcategory: "Scar & Wound",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: ["abscess", "collection", "I&D", "incision and drainage"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_abscess_id",
        displayName: "Abscess incision and drainage",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PRESSURE INJURY — with NPUAP staging conditional logic
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_PRESSURE: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_pressure_sacral",
    displayName: "Pressure injury — sacral",
    shortName: "Sacral PI",
    snomedCtCode: "399912005",
    snomedCtDisplay: "Pressure injury of sacral region (disorder)",
    specialty: "general",
    subcategory: "Pressure Injury",
    clinicalGroup: "reconstructive",
    hasStaging: true, // NPUAP staging in diagnosisStagingConfig
    searchSynonyms: ["sacral pressure sore", "sacral pressure ulcer", "bed sore sacrum", "decubitus sacral"],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_ps_sacral_flap",
        displayName: "Sacral pressure sore — flap closure",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Stage 3–4 or unstageable",
        conditionStagingMatch: {
          stagingSystemName: "NPUAP Stage",
          matchValues: ["3", "4", "unstageable"],
        },
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "NPWT",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_pressure_ischial",
    displayName: "Pressure injury — ischial",
    shortName: "Ischial PI",
    snomedCtCode: "399912005",
    snomedCtDisplay: "Pressure injury of ischial region (disorder)",
    specialty: "general",
    subcategory: "Pressure Injury",
    clinicalGroup: "reconstructive",
    hasStaging: true,
    searchSynonyms: ["ischial pressure sore", "ischial tuberosity", "sitting sore"],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_ps_ischial_flap",
        displayName: "Ischial pressure sore — flap closure",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Stage 3–4 or unstageable",
        conditionStagingMatch: {
          stagingSystemName: "NPUAP Stage",
          matchValues: ["3", "4", "unstageable"],
        },
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "NPWT",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_pressure_trochanteric",
    displayName: "Pressure injury — trochanteric",
    shortName: "Trochanteric PI",
    snomedCtCode: "399912005",
    snomedCtDisplay: "Pressure injury of trochanteric region (disorder)",
    specialty: "general",
    subcategory: "Pressure Injury",
    clinicalGroup: "reconstructive",
    hasStaging: true,
    searchSynonyms: ["trochanteric pressure sore", "hip sore", "lateral hip pressure"],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_ps_trochanteric_flap",
        displayName: "Trochanteric pressure sore — flap closure",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Stage 3–4 or unstageable",
        conditionStagingMatch: {
          stagingSystemName: "NPUAP Stage",
          matchValues: ["3", "4", "unstageable"],
        },
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "NPWT",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_pressure_heel",
    displayName: "Pressure injury — heel",
    shortName: "Heel PI",
    snomedCtCode: "399912005",
    snomedCtDisplay: "Pressure injury of heel (disorder)",
    specialty: "general",
    subcategory: "Pressure Injury",
    clinicalGroup: "reconstructive",
    hasStaging: true,
    searchSynonyms: ["heel pressure sore", "heel ulcer", "calcaneal pressure"],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Stage 3–4",
        conditionStagingMatch: {
          stagingSystemName: "NPUAP Stage",
          matchValues: ["3", "4"],
        },
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "NPWT",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIALIST CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_SPECIALIST: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_hidradenitis",
    displayName: "Hidradenitis suppurativa",
    shortName: "HS",
    snomedCtCode: "59393003",
    snomedCtDisplay: "Hidradenitis suppurativa (disorder)",
    specialty: "general",
    subcategory: "Specialist Conditions",
    clinicalGroup: "elective",
    hasStaging: true, // Hurley staging — NEW staging config needed
    searchSynonyms: ["HS", "hidradenitis", "acne inversa", "axilla abscess recurrent", "groin abscess recurrent"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_hs_deroofing",
        displayName: "Deroofing / unroofing",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_hs_excision_axilla",
        displayName: "HS excision — axilla",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_hs_excision_groin",
        displayName: "HS excision — groin / perineal",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "gen_hs_excision_other",
        displayName: "HS excision — other site",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed (defect coverage)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Hurley III (wide excision)",
        conditionStagingMatch: {
          stagingSystemName: "Hurley Stage",
          matchValues: ["III"],
        },
        sortOrder: 5,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_lymphoedema",
    displayName: "Lymphoedema (primary or secondary)",
    shortName: "Lymphoedema",
    snomedCtCode: "234097001",
    snomedCtDisplay: "Lymphedema (disorder)",
    specialty: "general",
    subcategory: "Specialist Conditions",
    clinicalGroup: "elective",
    hasStaging: true, // ISL staging — NEW staging config needed
    searchSynonyms: ["lymphoedema", "lymphedema", "arm swelling post-cancer", "leg swelling", "LVA", "VLNT"],
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
        conditionDescription: "For ISL Stage II–III (non-pitting / fibrotic)",
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
  {
    id: "gen_dx_vasc_malformation_low_flow",
    displayName: "Vascular malformation — low flow (venous / lymphatic)",
    shortName: "Low-flow VM",
    snomedCtCode: "234143007",
    snomedCtDisplay: "Vascular malformation (disorder)",
    specialty: "general",
    subcategory: "Specialist Conditions",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["venous malformation", "lymphatic malformation", "low flow", "VM", "cystic hygroma"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_vasc_excision",
        displayName: "Vascular malformation excision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_vasc_sclerotherapy",
        displayName: "Sclerotherapy",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_vasc_laser",
        displayName: "Laser treatment",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_vasc_malformation_high_flow",
    displayName: "Vascular malformation — high flow (arteriovenous)",
    shortName: "High-flow AVM",
    snomedCtCode: "234143007",
    snomedCtDisplay: "Arteriovenous malformation (disorder)",
    specialty: "general",
    subcategory: "Specialist Conditions",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["AVM", "arteriovenous malformation", "high flow", "pulsatile"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_vasc_excision",
        displayName: "Vascular malformation excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "gen_dx_gender_affirming_chest",
    displayName: "Gender dysphoria — chest masculinisation",
    shortName: "Top surgery FTM",
    snomedCtCode: "93461009",
    snomedCtDisplay: "Gender dysphoria (disorder)",
    specialty: "general",
    subcategory: "Specialist Conditions",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["top surgery", "FTM", "chest masculinisation", "transgender", "gender affirming"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_ga_chest_masculinisation",
        displayName: "Chest masculinisation (top surgery — FTM)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 5,
  },
];

const GEN_DX_SOFT_TISSUE_TRAUMA: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_laceration",
    displayName: "Laceration — trunk / extremity",
    shortName: "Laceration",
    snomedCtCode: "283681000",
    snomedCtDisplay: "Laceration of skin (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: ["laceration", "cut", "wound", "skin laceration", "leg laceration", "arm laceration", "body laceration"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_trauma_lac_simple",
        displayName: "Laceration repair — simple",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_trauma_lac_complex",
        displayName: "Laceration repair — complex / layered",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_trauma_wound_exploration",
        displayName: "Wound exploration + repair (non-hand)",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_pretibial_lac",
    displayName: "Pretibial laceration",
    shortName: "Pretibial lac",
    snomedCtCode: "283680004",
    snomedCtDisplay: "Laceration of pretibial skin (finding)",
    specialty: "general",
    subcategory: "Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: ["pretibial", "shin laceration", "pretibial flap", "shin wound", "lower leg laceration"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_trauma_pretibial_repair",
        displayName: "Pretibial laceration repair — primary closure",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_trauma_lac_complex",
        displayName: "Laceration repair — complex / layered",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_ssg_sheet",
        displayName: "STSG — sheet",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_degloving",
    displayName: "Degloving injury",
    shortName: "Degloving",
    snomedCtCode: "262561008",
    snomedCtDisplay: "Avulsion injury of skin (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: ["degloving", "avulsion", "skin avulsion", "degloved", "roller injury"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_trauma_degloving",
        displayName: "Degloving injury — primary management",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_traumatic_skin_loss",
    displayName: "Traumatic skin loss (requiring closure / graft)",
    shortName: "Traumatic skin loss",
    snomedCtCode: "282026001",
    snomedCtDisplay: "Traumatic loss of skin (finding)",
    specialty: "general",
    subcategory: "Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: ["skin loss", "tissue loss", "traumatic wound", "traumatic defect", "crush injury skin"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_trauma_skin_loss_closure",
        displayName: "Traumatic skin loss — direct closure / graft",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const GENERAL_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...GEN_DX_SKIN_CANCER,
  ...GEN_DX_BENIGN,
  ...GEN_DX_SCAR_WOUND,
  ...GEN_DX_SOFT_TISSUE_TRAUMA,
  ...GEN_DX_PRESSURE,
  ...GEN_DX_SPECIALIST,
];

export function getGeneralSubcategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dx of GENERAL_DIAGNOSES) {
    if (!seen.has(dx.subcategory)) {
      seen.add(dx.subcategory);
      result.push(dx.subcategory);
    }
  }
  return result;
}

export function getGeneralDiagnosesForSubcategory(
  subcategory: string
): DiagnosisPicklistEntry[] {
  return GENERAL_DIAGNOSES.filter((dx) => dx.subcategory === subcategory);
}
