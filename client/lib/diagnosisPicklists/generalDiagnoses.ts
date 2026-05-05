/**
 * General Plastics Diagnosis Picklist
 *
 * ~56 structured diagnoses across 10 subcategories covering general plastics
 * conditions that don't fit into the 11 dedicated specialty modules.
 *
 * Subcategories:
 * 1. Soft Tissue Infections (NSTI, Fournier's, abscess)
 * 2. Trunk & Torso Reconstruction (abdominal wall, chest wall, radiation injury)
 * 3. Soft Tissue Tumours (sarcoma, DFSP)
 * 4. Perineal & Genitourinary (post-cancer, post-NSTI, hypospadias)
 * 5. Pressure Injury (sacral, ischial, trochanteric, heel, other)
 * 6. HS & Pilonidal Disease (hidradenitis suppurativa, pilonidal sinus)
 * 7. Benign Lesions, Scars & Wounds (benign lesions, scars, vascular malformations, extravasation)
 * 8. Soft Tissue Trauma (lacerations, degloving, amputation)
 * 9. Gender-Affirming Surgery (chest, breast, facial, genital)
 * 10. Congenital Conditions (GCMN, Poland, aplasia cutis, myelomeningocele)
 *
 * Includes staging-conditional logic for:
 * - Pressure injuries (NPUAP staging — in diagnosisStagingConfig.ts)
 * - Hidradenitis suppurativa (Hurley staging)
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SOFT TISSUE INFECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_INFECTIONS: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_nec_fasc_trunk",
    displayName: "Necrotizing fasciitis — trunk",
    shortName: "Nec fasc trunk",
    snomedCtCode: "52486002",
    snomedCtDisplay: "Necrotizing fasciitis (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Infections",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "necrotizing fasciitis",
      "necrotising fasciitis",
      "nec fasc",
      "NF",
      "NSTI",
      "trunk",
      "abdominal wall",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_nsti_debridement", // Phase 3
        displayName: "NSTI debridement (serial / radical)",
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
    sortOrder: 1,
  },
  {
    id: "gen_dx_nec_fasc_perineal",
    displayName: "Necrotizing fasciitis — perineal / Fournier's gangrene",
    shortName: "Fournier's",
    snomedCtCode: "398318005",
    snomedCtDisplay:
      "Necrotising fasciitis of perineal and/or genital and/or perianal region (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Infections",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "Fournier's",
      "Fournier",
      "perineal necrotizing",
      "scrotal gangrene",
      "perineal NSTI",
      "genital gangrene",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_nsti_debridement", // Phase 3
        displayName: "NSTI debridement (serial / radical)",
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
        procedurePicklistId: "gen_perineal_flap_gracilis", // Phase 3
        displayName: "Perineal reconstruction — gracilis flap",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_nec_fasc_cervical",
    displayName: "Necrotizing fasciitis — cervical / neck",
    shortName: "Nec fasc neck",
    snomedCtCode: "52486002",
    snomedCtDisplay: "Necrotizing fasciitis (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Infections",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "cervical necrotizing",
      "neck NSTI",
      "cervical nec fasc",
      "neck fasciitis",
      "Ludwig's angina",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_nsti_debridement", // Phase 3
        displayName: "NSTI debridement (serial / radical)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy (NPWT)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_severe_soft_tissue_infection",
    displayName: "Severe soft tissue infection (non-NSTI)",
    shortName: "Severe STI",
    snomedCtCode: "128477000",
    snomedCtDisplay: "Abscess (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Infections",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "soft tissue infection",
      "cellulitis requiring surgery",
      "deep infection",
      "spreading infection",
      "surgical infection",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_abscess_id",
        displayName: "Abscess incision and drainage",
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
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy (NPWT)",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "gen_dx_abscess",
    displayName: "Abscess — soft tissue (requiring surgical drainage)",
    shortName: "Abscess",
    snomedCtCode: "128477000",
    snomedCtDisplay: "Abscess (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Infections",
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
// 2. TRUNK & TORSO RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_TRUNK_RECONSTRUCTION: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_abwall_hernia",
    displayName: "Abdominal wall defect — complex incisional / ventral hernia",
    shortName: "Complex hernia",
    snomedCtCode: "236037000",
    snomedCtDisplay: "Incisional hernia (disorder)",
    specialty: "general",
    subcategory: "Trunk & Torso Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "incisional hernia",
      "ventral hernia",
      "abdominal wall",
      "complex hernia",
      "component separation",
      "hernia reconstruction",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_abwall_component_sep", // Phase 3
        displayName: "Abdominal wall — component separation",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_abwall_mesh_reinforcement", // Phase 3
        displayName: "Abdominal wall — mesh reinforcement",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_abwall_enterocutaneous",
    displayName: "Abdominal wall defect — enterocutaneous fistula",
    shortName: "ECF + abwall",
    snomedCtCode: "197247001",
    snomedCtDisplay: "Enterocutaneous fistula (disorder)",
    specialty: "general",
    subcategory: "Trunk & Torso Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "enterocutaneous fistula",
      "ECF",
      "abdominal fistula",
      "intestinal fistula",
      "open abdomen",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_abwall_component_sep", // Phase 3
        displayName: "Abdominal wall — component separation",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy (NPWT)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_abwall_tumour",
    displayName: "Abdominal wall defect — tumour resection",
    shortName: "Abwall tumour recon",
    snomedCtCode: "448707007",
    snomedCtDisplay: "Abdominal wall tumour (disorder)",
    specialty: "general",
    subcategory: "Trunk & Torso Reconstruction",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "abdominal wall tumour",
      "abdominal wall neoplasm",
      "desmoid tumour abdominal",
      "abdominal wall reconstruction",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_abwall_component_sep", // Phase 3
        displayName: "Abdominal wall — component separation",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_abwall_mesh_reinforcement", // Phase 3
        displayName: "Abdominal wall — mesh reinforcement",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_chestwall_oncological",
    displayName:
      "Chest wall defect — post-oncological (sternectomy / tumour resection)",
    shortName: "Chest wall onco",
    snomedCtCode: "448707007",
    snomedCtDisplay: "Neoplasm of trunk (disorder)",
    specialty: "general",
    subcategory: "Trunk & Torso Reconstruction",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "chest wall tumour",
      "sternectomy",
      "chest wall reconstruction",
      "sternal tumour",
      "chest wall defect",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_chestwall_flap", // Phase 3
        displayName: "Chest wall — flap reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_chestwall_mesh_reconstruction", // Phase 3
        displayName: "Chest wall — mesh / prosthetic reconstruction",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "gen_dx_chestwall_radiation",
    displayName: "Chest wall defect — radiation necrosis",
    shortName: "Chest wall radiation",
    snomedCtCode: "49084001",
    snomedCtDisplay: "Dermatitis caused by radiation (disorder)",
    specialty: "general",
    subcategory: "Trunk & Torso Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "radiation necrosis chest",
      "chest wall radiation",
      "post-radiation chest",
      "radiation ulcer chest",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_chestwall_flap", // Phase 3
        displayName: "Chest wall — flap reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "gen_dx_pectus",
    displayName: "Pectus deformity (excavatum / carinatum)",
    shortName: "Pectus",
    snomedCtCode: "444693004",
    snomedCtDisplay: "Pectus deformity of chest (disorder)",
    specialty: "general",
    subcategory: "Trunk & Torso Reconstruction",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "pectus excavatum",
      "pectus carinatum",
      "funnel chest",
      "pigeon chest",
      "Nuss",
      "Ravitch",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_pectus_repair", // Phase 3
        displayName: "Pectus deformity repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "gen_dx_radiation_injury",
    displayName:
      "Radiation injury / chronic radiation dermatitis — trunk or extremity",
    shortName: "Radiation injury",
    snomedCtCode: "49084001",
    snomedCtDisplay: "Dermatitis caused by radiation (disorder)",
    specialty: "general",
    subcategory: "Trunk & Torso Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "radiation injury",
      "radiation dermatitis",
      "radiation ulcer",
      "chronic radiation",
      "osteoradionecrosis",
      "radiation necrosis",
    ],
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
    sortOrder: 7,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SOFT TISSUE TUMOURS
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_SOFT_TISSUE_TUMOURS: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_sarcoma_trunk",
    displayName: "Soft tissue sarcoma — trunk",
    shortName: "STS trunk",
    snomedCtCode: "424952003",
    snomedCtDisplay: "Sarcoma of soft tissue (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Tumours",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "sarcoma",
      "soft tissue sarcoma",
      "STS",
      "trunk sarcoma",
      "liposarcoma",
      "leiomyosarcoma",
      "undifferentiated sarcoma",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_sarcoma_excision", // Phase 3
        displayName: "Soft tissue tumour / sarcoma — wide local excision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_sarcoma_extremity",
    displayName: "Soft tissue sarcoma — extremity",
    shortName: "STS extremity",
    snomedCtCode: "424952003",
    snomedCtDisplay: "Sarcoma of soft tissue (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Tumours",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "extremity sarcoma",
      "limb sarcoma",
      "arm sarcoma",
      "leg sarcoma",
      "thigh sarcoma",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_sarcoma_excision", // Phase 3
        displayName: "Soft tissue tumour / sarcoma — wide local excision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_dfsp",
    displayName: "Dermatofibrosarcoma protuberans (DFSP)",
    shortName: "DFSP",
    snomedCtCode: "276799004",
    snomedCtDisplay: "Dermatofibrosarcoma protuberans (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Tumours",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: ["DFSP", "dermatofibrosarcoma", "protuberans"],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_sarcoma_excision", // Phase 3
        displayName: "DFSP wide excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_soft_tissue_tumour_other",
    displayName:
      "Soft tissue tumour — other (lipomatous / fibrous / vascular / neural)",
    shortName: "ST tumour NOS",
    snomedCtCode: "387837005",
    snomedCtDisplay: "Neoplasm of soft tissue (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Tumours",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "soft tissue tumour",
      "soft tissue mass",
      "atypical lipomatous tumour",
      "schwannoma",
      "fibrous tumour",
      "neurofibroma",
      "desmoid",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_sarcoma_excision", // Phase 3
        displayName: "Soft tissue tumour excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PERINEAL & GENITOURINARY RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_PERINEAL: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_perineal_post_nsti",
    displayName: "Perineal reconstruction — post-Fournier's / post-NSTI",
    shortName: "Perineal recon NSTI",
    snomedCtCode: "398318005",
    snomedCtDisplay:
      "Necrotising fasciitis of perineal and/or genital and/or perianal region (disorder)",
    specialty: "general",
    subcategory: "Perineal & Genitourinary",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "perineal reconstruction",
      "post-Fournier's",
      "perineal defect",
      "scrotal reconstruction",
      "perineal NSTI reconstruction",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_perineal_flap_gracilis", // Phase 3
        displayName: "Perineal reconstruction — gracilis flap",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_perineal_flap_pudendal_thigh", // Phase 3
        displayName: "Perineal reconstruction — pudendal thigh flap",
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
    sortOrder: 1,
  },
  {
    id: "gen_dx_perineal_cancer_defect",
    displayName:
      "Perineal reconstruction — cancer defect (vulval / anorectal / APR)",
    shortName: "Perineal recon cancer",
    snomedCtCode: "1263479005",
    snomedCtDisplay: "Malignant neoplasm of perineum (disorder)",
    specialty: "general",
    subcategory: "Perineal & Genitourinary",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "vulval cancer reconstruction",
      "anorectal reconstruction",
      "APR defect",
      "abdominoperineal resection",
      "perineal cancer",
      "vulvectomy defect",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_perineal_flap_vram", // Phase 3
        displayName: "Perineal reconstruction — VRAM flap",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_perineal_flap_gracilis", // Phase 3
        displayName: "Perineal reconstruction — gracilis flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_perineal_flap_pudendal_thigh", // Phase 3
        displayName: "Perineal reconstruction — pudendal thigh flap",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_perineal_radiation",
    displayName: "Perineal reconstruction — radiation injury",
    shortName: "Perineal radiation",
    snomedCtCode: "49084001",
    snomedCtDisplay: "Dermatitis caused by radiation (disorder)",
    specialty: "general",
    subcategory: "Perineal & Genitourinary",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "perineal radiation",
      "radiation injury perineum",
      "post-radiation perineal",
      "pelvic radiation wound",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_perineal_flap_gracilis", // Phase 3
        displayName: "Perineal reconstruction — gracilis flap",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_hypospadias",
    displayName: "Hypospadias repair",
    shortName: "Hypospadias",
    snomedCtCode: "416010008",
    snomedCtDisplay: "Hypospadias (disorder)",
    specialty: "general",
    subcategory: "Perineal & Genitourinary",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "hypospadias",
      "urethral",
      "penile reconstruction",
      "urethroplasty",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_hypospadias_repair", // Phase 3
        displayName: "Hypospadias repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "gen_dx_genitourinary_other",
    displayName: "Genitourinary reconstruction — other",
    shortName: "GU recon NOS",
    snomedCtCode: "118674002",
    snomedCtDisplay: "Procedure on genitourinary system (procedure)",
    specialty: "general",
    subcategory: "Perineal & Genitourinary",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "genitourinary",
      "GU reconstruction",
      "genital reconstruction",
      "urological reconstruction",
    ],
    suggestedProcedures: [],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PRESSURE INJURY — with NPUAP staging conditional logic
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
    hasStaging: true,
    searchSynonyms: [
      "sacral pressure sore",
      "sacral pressure ulcer",
      "bed sore sacrum",
      "decubitus sacral",
    ],
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
    searchSynonyms: [
      "ischial pressure sore",
      "ischial tuberosity",
      "sitting sore",
    ],
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
    searchSynonyms: [
      "trochanteric pressure sore",
      "hip sore",
      "lateral hip pressure",
    ],
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
  {
    id: "gen_dx_pressure_other",
    displayName: "Pressure injury — other site (coccygeal / elbow / occiput)",
    shortName: "PI other",
    snomedCtCode: "399912005",
    snomedCtDisplay: "Pressure injury (disorder)",
    specialty: "general",
    subcategory: "Pressure Injury",
    clinicalGroup: "reconstructive",
    hasStaging: true,
    searchSynonyms: [
      "coccygeal pressure",
      "elbow pressure sore",
      "occiput pressure",
      "pressure sore other",
      "pressure injury",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "NPWT",
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
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 6. HS & PILONIDAL DISEASE
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_HS_PILONIDAL: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_hidradenitis",
    displayName: "Hidradenitis suppurativa",
    shortName: "HS",
    snomedCtCode: "59393003",
    snomedCtDisplay: "Hidradenitis suppurativa (disorder)",
    specialty: "general",
    subcategory: "HS & Pilonidal Disease",
    clinicalGroup: "elective",
    hasStaging: true, // Hurley staging in diagnosisStagingConfig
    searchSynonyms: [
      "HS",
      "hidradenitis",
      "acne inversa",
      "axilla abscess recurrent",
      "groin abscess recurrent",
    ],
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
    id: "gen_dx_hs_axillary",
    displayName: "Hidradenitis suppurativa — axillary",
    shortName: "HS axilla",
    snomedCtCode: "59393003",
    snomedCtDisplay: "Hidradenitis suppurativa (disorder)",
    specialty: "general",
    subcategory: "HS & Pilonidal Disease",
    clinicalGroup: "elective",
    hasStaging: true,
    searchSynonyms: [
      "axillary HS",
      "armpit HS",
      "axilla hidradenitis",
      "recurrent axillary abscess",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_hs_excision_axilla",
        displayName: "HS excision — axilla",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_hs_deroofing",
        displayName: "Deroofing / unroofing",
        isDefault: false,
        sortOrder: 2,
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
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_hs_inguinoperineal",
    displayName: "Hidradenitis suppurativa — inguinal / perineal",
    shortName: "HS groin",
    snomedCtCode: "59393003",
    snomedCtDisplay: "Hidradenitis suppurativa (disorder)",
    specialty: "general",
    subcategory: "HS & Pilonidal Disease",
    clinicalGroup: "elective",
    hasStaging: true,
    searchSynonyms: [
      "groin HS",
      "inguinal HS",
      "perineal HS",
      "inguinoperineal hidradenitis",
      "recurrent groin abscess",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_hs_excision_groin",
        displayName: "HS excision — groin / perineal",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_hs_deroofing",
        displayName: "Deroofing / unroofing",
        isDefault: false,
        sortOrder: 2,
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
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_pilonidal",
    displayName: "Pilonidal sinus — primary",
    shortName: "Pilonidal",
    snomedCtCode: "238496008",
    snomedCtDisplay: "Pilonidal sinus (disorder)",
    specialty: "general",
    subcategory: "HS & Pilonidal Disease",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "pilonidal",
      "sacral sinus",
      "natal cleft",
      "pilonidal cyst",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_pilonidal_excision_primary", // Phase 3 — replaces gen_other_pilonidal_excision
        displayName: "Pilonidal sinus excision — primary closure",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_pilonidal_flap_limberg", // Phase 3
        displayName: "Pilonidal sinus — Limberg / rhomboid flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_pilonidal_cleft_lift", // Phase 3
        displayName: "Pilonidal sinus — cleft lift / Bascom",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "gen_dx_pilonidal_recurrent",
    displayName: "Pilonidal sinus — recurrent / complex",
    shortName: "Pilonidal recurrent",
    snomedCtCode: "238496008",
    snomedCtDisplay: "Pilonidal sinus (disorder)",
    specialty: "general",
    subcategory: "HS & Pilonidal Disease",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "recurrent pilonidal",
      "complex pilonidal",
      "pilonidal recurrence",
      "failed pilonidal repair",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_pilonidal_flap_limberg", // Phase 3
        displayName: "Pilonidal sinus — Limberg / rhomboid flap",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_pilonidal_cleft_lift", // Phase 3
        displayName: "Pilonidal sinus — cleft lift / Bascom",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_pilonidal_excision_primary", // Phase 3
        displayName: "Pilonidal sinus excision — primary closure",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 7. BENIGN LESIONS, SCARS & WOUNDS
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_BENIGN_SCAR_WOUND: DiagnosisPicklistEntry[] = [
  // — Benign lesions —
  {
    id: "gen_dx_lipoma",
    displayName: "Lipoma",
    snomedCtCode: "93163002",
    snomedCtDisplay: "Lipoma (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
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
    snomedCtCode: "419893006",
    snomedCtDisplay: "Epidermoid cyst (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "sebaceous cyst",
      "epidermoid cyst",
      "pilar cyst",
      "trichilemmal",
    ],
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
    snomedCtCode: "92384009",
    snomedCtDisplay: "Benign neoplasm of skin (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "mole",
      "naevus",
      "seborrhoeic keratosis",
      "dermatofibroma",
      "benign lesion",
    ],
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
    snomedCtCode: "400096001",
    snomedCtDisplay: "Melanocytic naevus (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "mole excision",
      "atypical naevus",
      "dysplastic naevus",
      "changing mole",
    ],
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
  // — Scars —
  {
    id: "gen_dx_hypertrophic_scar",
    displayName: "Hypertrophic scar",
    shortName: "Hypertrophic scar",
    snomedCtCode: "19843006",
    snomedCtDisplay: "Hypertrophic scar (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "hypertrophic scar",
      "raised scar",
      "red scar",
      "scar revision",
    ],
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
    sortOrder: 5,
  },
  {
    id: "gen_dx_keloid",
    displayName: "Keloid scar",
    shortName: "Keloid",
    snomedCtCode: "33659008",
    snomedCtDisplay: "Keloid scar (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
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
    sortOrder: 6,
  },
  // — Wounds —
  {
    id: "gen_dx_chronic_wound",
    displayName: "Chronic non-healing wound (non-diabetic, non-pressure)",
    shortName: "Chronic wound",
    snomedCtCode: "92161000112103",
    snomedCtDisplay: "Chronic wound (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "chronic wound",
      "non-healing",
      "leg ulcer",
      "venous ulcer",
      "wound",
    ],
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
    sortOrder: 7,
  },
  // — Vascular malformations (moved from Specialist Conditions) —
  {
    id: "gen_dx_vasc_malformation_low_flow",
    displayName: "Vascular malformation — low flow (venous / lymphatic)",
    shortName: "Low-flow VM",
    snomedCtCode: "400159008",
    snomedCtDisplay: "Congenital vascular malformation (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "venous malformation",
      "lymphatic malformation",
      "low flow",
      "VM",
      "cystic hygroma",
    ],
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
    sortOrder: 8,
  },
  {
    id: "gen_dx_vasc_malformation_high_flow",
    displayName: "Vascular malformation — high flow (arteriovenous)",
    shortName: "High-flow AVM",
    snomedCtCode: "275519006",
    snomedCtDisplay: "Peripheral arteriovenous malformation (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "AVM",
      "arteriovenous malformation",
      "high flow",
      "pulsatile",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_vasc_excision",
        displayName: "Vascular malformation excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 9,
  },
  // — Extravasation injuries —
  {
    id: "gen_dx_extravasation_chemo",
    displayName: "Extravasation injury — chemotherapy agent",
    shortName: "Chemo extrav",
    snomedCtCode: "371100002",
    snomedCtDisplay: "Extravasation injury (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "chemotherapy extravasation",
      "chemo extrav",
      "vesicant",
      "doxorubicin extravasation",
      "cytotoxic extravasation",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_extravasation_washout", // Phase 3
        displayName: "Extravasation injury — washout / liposuction / excision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 10,
  },
  {
    id: "gen_dx_extravasation_other",
    displayName:
      "Extravasation injury — non-chemotherapy (contrast / TPN / calcium)",
    shortName: "Extrav other",
    snomedCtCode: "371100002",
    snomedCtDisplay: "Extravasation injury (disorder)",
    specialty: "general",
    subcategory: "Benign Lesions, Scars & Wounds",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "contrast extravasation",
      "TPN extravasation",
      "calcium extravasation",
      "IV extravasation",
      "infusion injury",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_extravasation_washout", // Phase 3
        displayName: "Extravasation injury — washout / liposuction / excision",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 11,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SOFT TISSUE TRAUMA
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_SOFT_TISSUE_TRAUMA: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_laceration",
    displayName: "Laceration — trunk / extremity",
    shortName: "Laceration",
    snomedCtCode: "274165007",
    snomedCtDisplay: "Laceration of skin (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "laceration",
      "cut",
      "wound",
      "skin laceration",
      "leg laceration",
      "arm laceration",
      "body laceration",
    ],
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
    snomedCtCode: "105616000",
    snomedCtDisplay: "Open wound of limb (finding)",
    specialty: "general",
    subcategory: "Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "pretibial",
      "shin laceration",
      "pretibial flap",
      "shin wound",
      "lower leg laceration",
    ],
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
    searchSynonyms: [
      "degloving",
      "avulsion",
      "skin avulsion",
      "degloved",
      "roller injury",
    ],
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
    snomedCtCode: "321000161101",
    snomedCtDisplay: "Open wound of skin (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "skin loss",
      "tissue loss",
      "traumatic wound",
      "traumatic defect",
      "crush injury skin",
    ],
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
  {
    id: "gen_dx_traumatic_amputation_nonhand",
    displayName:
      "Traumatic amputation — non-upper-limb (ear / nose / lower limb)",
    shortName: "Non-hand amputation",
    snomedCtCode: "262595009",
    snomedCtDisplay: "Traumatic amputation (disorder)",
    specialty: "general",
    subcategory: "Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "traumatic amputation",
      "ear avulsion",
      "nose amputation",
      "lower limb amputation",
      "toe amputation",
      "non-hand amputation",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_trauma_skin_loss_closure",
        displayName: "Wound closure / coverage",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 9. GENDER-AFFIRMING SURGERY
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_GENDER_AFFIRMING: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_gender_affirming_chest",
    displayName: "Gender dysphoria — chest masculinisation (FTM)",
    shortName: "Top surgery FTM",
    snomedCtCode: "93461009",
    snomedCtDisplay: "Gender dysphoria (disorder)",
    specialty: "general",
    subcategory: "Gender-Affirming Surgery",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "top surgery",
      "FTM",
      "chest masculinisation",
      "transgender",
      "gender affirming",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_ga_chest_masculinisation",
        displayName: "Chest masculinisation (top surgery — FTM)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_gender_affirming_breast_mtf",
    displayName: "Gender dysphoria — breast augmentation (MTF)",
    shortName: "Breast augmentation MTF",
    snomedCtCode: "93461009",
    snomedCtDisplay: "Gender dysphoria (disorder)",
    specialty: "general",
    subcategory: "Gender-Affirming Surgery",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "MTF breast",
      "breast augmentation transgender",
      "MTF augmentation",
      "transfeminine chest",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_ga_breast_augmentation_mtf",
        displayName: "Breast augmentation (MTF)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_gender_affirming_ffs",
    displayName: "Gender dysphoria — facial feminisation surgery (FFS)",
    shortName: "FFS",
    snomedCtCode: "93461009",
    snomedCtDisplay: "Gender dysphoria (disorder)",
    specialty: "general",
    subcategory: "Gender-Affirming Surgery",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "FFS",
      "facial feminisation",
      "facial feminization",
      "brow bone",
      "tracheal shave",
      "forehead feminisation",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_ga_facial_feminisation",
        displayName: "Facial feminisation surgery (FFS)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_gender_affirming_genital",
    displayName:
      "Gender dysphoria — genital reconstruction (vaginoplasty / phalloplasty / metoidioplasty)",
    shortName: "Genital GAS",
    snomedCtCode: "93461009",
    snomedCtDisplay: "Gender dysphoria (disorder)",
    specialty: "general",
    subcategory: "Gender-Affirming Surgery",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "vaginoplasty",
      "phalloplasty",
      "metoidioplasty",
      "genital reconstruction",
      "bottom surgery",
      "GCS",
      "gender confirmation",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_ga_vaginoplasty", // Phase 3
        displayName: "Vaginoplasty (penile inversion / peritoneal)",
        isDefault: false,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "gen_ga_phalloplasty", // Phase 3
        displayName: "Phalloplasty (radial forearm / ALT / fibula)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "gen_ga_metoidioplasty", // Phase 3
        displayName: "Metoidioplasty",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "gen_dx_gender_affirming_other",
    displayName: "Gender-affirming surgery — other",
    shortName: "GAS other",
    snomedCtCode: "93461009",
    snomedCtDisplay: "Gender dysphoria (disorder)",
    specialty: "general",
    subcategory: "Gender-Affirming Surgery",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "gender affirming other",
      "GAS other",
      "body contouring transgender",
      "voice surgery",
      "Adam's apple",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_ga_other",
        displayName: "Gender-affirming surgery — other",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 10. CONGENITAL CONDITIONS — OTHER
// ═══════════════════════════════════════════════════════════════════════════════

const GEN_DX_CONGENITAL: DiagnosisPicklistEntry[] = [
  {
    id: "gen_dx_gcmn",
    displayName: "Giant congenital melanocytic naevus (GCMN)",
    shortName: "GCMN",
    snomedCtCode: "1260467009",
    snomedCtDisplay:
      "Large congenital pigmented melanocytic naevus of skin (disorder)",
    specialty: "general",
    subcategory: "Congenital Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "GCMN",
      "giant naevus",
      "congenital melanocytic naevus",
      "bathing trunk naevus",
      "garment naevus",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_gcmn_excision", // Phase 3
        displayName: "GCMN excision ± tissue expansion ± graft",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "gen_dx_poland_nonbreast",
    displayName:
      "Poland syndrome — non-breast manifestations (chest wall / hand)",
    shortName: "Poland non-breast",
    snomedCtCode: "38371006",
    snomedCtDisplay: "Poland anomaly (disorder)",
    specialty: "general",
    subcategory: "Congenital Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "Poland syndrome",
      "Poland anomaly",
      "pectoralis absence",
      "chest wall asymmetry congenital",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_congenital_defect_closure", // Phase 3
        displayName: "Congenital skin defect closure — flap / graft",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "gen_dx_aplasia_cutis",
    displayName: "Aplasia cutis congenita",
    shortName: "Aplasia cutis",
    snomedCtCode: "35484002",
    snomedCtDisplay: "Aplasia cutis congenita (disorder)",
    specialty: "general",
    subcategory: "Congenital Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "aplasia cutis",
      "congenital skin absence",
      "scalp defect congenital",
      "congenital wound",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_congenital_defect_closure", // Phase 3
        displayName: "Congenital skin defect closure — flap / graft",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "gen_dx_myelomeningocele_defect",
    displayName: "Myelomeningocele / meningocele — coverage defect",
    shortName: "MMC defect",
    snomedCtCode: "414667000",
    snomedCtDisplay: "Meningomyelocele (disorder)",
    specialty: "general",
    subcategory: "Congenital Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "myelomeningocele",
      "meningocele",
      "spina bifida closure",
      "neural tube defect coverage",
      "MMC",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_congenital_defect_closure", // Phase 3
        displayName: "Congenital skin defect closure — flap / graft",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "gen_dx_congenital_other",
    displayName: "Congenital condition — other (NOS)",
    shortName: "Congenital NOS",
    snomedCtCode: "66091009",
    snomedCtDisplay: "Congenital disease (disorder)",
    specialty: "general",
    subcategory: "Congenital Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "congenital",
      "congenital anomaly",
      "birth defect",
      "congenital malformation",
    ],
    suggestedProcedures: [],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const GENERAL_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...GEN_DX_INFECTIONS,
  ...GEN_DX_TRUNK_RECONSTRUCTION,
  ...GEN_DX_SOFT_TISSUE_TUMOURS,
  ...GEN_DX_PERINEAL,
  ...GEN_DX_PRESSURE,
  ...GEN_DX_HS_PILONIDAL,
  ...GEN_DX_BENIGN_SCAR_WOUND,
  ...GEN_DX_SOFT_TISSUE_TRAUMA,
  ...GEN_DX_GENDER_AFFIRMING,
  ...GEN_DX_CONGENITAL,
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
  subcategory: string,
): DiagnosisPicklistEntry[] {
  return GENERAL_DIAGNOSES.filter((dx) => dx.subcategory === subcategory);
}
