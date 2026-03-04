/**
 * Orthoplastic Diagnosis Picklist
 *
 * ~14 structured diagnoses covering ~75% of orthoplastic cases.
 *
 * Orthoplastic is the LOOSEST specialty for procedure suggestions.
 * The diagnosis tells you the problem, but the procedure depends on
 * defect size, location, exposed structures, and available tissue.
 * Suggestions stay broad: "debridement + flap coverage" not "ALT flap".
 *
 * Key staging system: Gustilo-Anderson (already in diagnosisStagingConfig.ts).
 * New staging: Wagner classification for diabetic foot ulcers.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// ACUTE TRAUMA / OPEN FRACTURES
// Gustilo staging drives conditional procedure suggestions.
// ═══════════════════════════════════════════════════════════════════════════════

const ORTH_DX_TRAUMA: DiagnosisPicklistEntry[] = [
  {
    id: "orth_dx_open_fx_lower_leg",
    displayName: "Open fracture — lower leg (tibia / fibula)",
    shortName: "Open # lower leg",
    snomedCtCode: "22640007",
    snomedCtDisplay: "Open fracture of lower leg (disorder)",
    specialty: "orthoplastic",
    subcategory: "Trauma / Open Fractures",
    clinicalGroup: "trauma",
    hasStaging: true, // Gustilo-Anderson in diagnosisStagingConfig
    searchSynonyms: [
      "open tibia",
      "compound fracture",
      "tibial fracture",
      "open leg fracture",
      "Gustilo",
    ],
    suggestedProcedures: [
      // === ALWAYS for open fractures ===
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_washout",
        displayName: "Surgical washout",
        isDefault: true,
        sortOrder: 2,
      },
      // === Gustilo I–II: graft likely sufficient ===
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Gustilo I–II with granulating wound",
        conditionStagingMatch: {
          stagingSystemName: "Gustilo-Anderson Classification",
          matchValues: ["I", "II"],
        },
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_wound_closure_delayed",
        displayName: "Delayed primary closure",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Gustilo I–II if wound allows closure",
        conditionStagingMatch: {
          stagingSystemName: "Gustilo-Anderson Classification",
          matchValues: ["I", "II"],
        },
        sortOrder: 4,
      },
      // === Gustilo IIIa: may need local flap ===
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Gustilo IIIa–IIIc as temporising measure",
        conditionStagingMatch: {
          stagingSystemName: "Gustilo-Anderson Classification",
          matchValues: ["IIIa", "IIIb", "IIIc"],
        },
        sortOrder: 5,
      },
      // === Gustilo IIIb: flap coverage required ===
      {
        procedurePicklistId: "orth_ped_gastrocnemius_medial",
        displayName: "Gastrocnemius flap (proximal defect)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Gustilo IIIb — proximal third tibia",
        conditionStagingMatch: {
          stagingSystemName: "Gustilo-Anderson Classification",
          matchValues: ["IIIb"],
        },
        sortOrder: 6,
      },
      {
        procedurePicklistId: "orth_ped_soleus",
        displayName: "Soleus flap (middle third defect)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Gustilo IIIb — middle third tibia",
        conditionStagingMatch: {
          stagingSystemName: "Gustilo-Anderson Classification",
          matchValues: ["IIIb"],
        },
        sortOrder: 7,
      },
      {
        procedurePicklistId: "orth_ff_alt",
        displayName: "Free flap (ALT / other — distal third)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Gustilo IIIb — distal third or large defect",
        conditionStagingMatch: {
          stagingSystemName: "Gustilo-Anderson Classification",
          matchValues: ["IIIb", "IIIc"],
        },
        sortOrder: 8,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "orth_dx_open_fx_upper_limb",
    displayName: "Open fracture — upper limb (humerus / forearm)",
    shortName: "Open # upper limb",
    snomedCtCode: "263225007",
    snomedCtDisplay: "Open fracture of upper limb (disorder)",
    specialty: "orthoplastic",
    subcategory: "Trauma / Open Fractures",
    clinicalGroup: "trauma",
    hasStaging: true, // Gustilo-Anderson
    searchSynonyms: [
      "open arm fracture",
      "open humerus",
      "open forearm",
      "compound upper limb",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_washout",
        displayName: "Surgical washout",
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "orth_ped_ld",
        displayName: "Pedicled LD flap",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Gustilo IIIb with exposed structures",
        conditionStagingMatch: {
          stagingSystemName: "Gustilo-Anderson Classification",
          matchValues: ["IIIb", "IIIc"],
        },
        sortOrder: 5,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "orth_dx_traumatic_wound",
    displayName: "Traumatic wound — exposed bone / tendon / hardware",
    shortName: "Traumatic wound",
    snomedCtCode: "283680004",
    snomedCtDisplay: "Traumatic wound with exposed deep structure (finding)",
    specialty: "orthoplastic",
    subcategory: "Trauma / Open Fractures",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "exposed bone",
      "exposed tendon",
      "exposed hardware",
      "traumatic tissue loss",
      "degloving",
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
        displayName: "Negative pressure wound therapy",
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
        procedurePicklistId: "orth_local_rotation",
        displayName: "Local rotation flap",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "orth_ped_propeller",
        displayName: "Propeller flap",
        isDefault: false,
        sortOrder: 5,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "orth_dx_degloving",
    displayName: "Degloving injury",
    shortName: "Degloving",
    snomedCtCode: "283681000",
    snomedCtDisplay: "Degloving injury (disorder)",
    specialty: "orthoplastic",
    subcategory: "Trauma / Open Fractures",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "degloving",
      "avulsion injury",
      "Morel-Lavallée",
      "shearing injury",
    ],
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
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHRONIC WOUNDS / INFECTION
// ═══════════════════════════════════════════════════════════════════════════════

const ORTH_DX_CHRONIC: DiagnosisPicklistEntry[] = [
  {
    id: "orth_dx_chronic_wound",
    displayName: "Chronic non-healing wound",
    shortName: "Chronic wound",
    snomedCtCode: "13954005",
    snomedCtDisplay: "Chronic wound (disorder)",
    specialty: "orthoplastic",
    subcategory: "Chronic Wounds / Infection",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "non-healing wound",
      "chronic leg ulcer",
      "surgical wound breakdown",
      "wound dehiscence",
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
        displayName: "Negative pressure wound therapy",
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
    id: "orth_dx_osteomyelitis",
    displayName: "Osteomyelitis (requiring plastic surgery input)",
    shortName: "Osteomyelitis",
    snomedCtCode: "60168000",
    snomedCtDisplay: "Osteomyelitis (disorder)",
    specialty: "orthoplastic",
    subcategory: "Chronic Wounds / Infection",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "osteomyelitis",
      "bone infection",
      "chronic osteomyelitis",
      "Cierny-Mader",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_sequestrectomy",
        displayName: "Sequestrectomy",
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_ped_gastrocnemius_medial",
        displayName: "Gastrocnemius muscle flap (dead space filling)",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "orth_dx_diabetic_foot",
    displayName: "Diabetic foot ulcer",
    shortName: "Diabetic foot",
    snomedCtCode: "280137006",
    snomedCtDisplay: "Diabetic foot ulcer (disorder)",
    specialty: "orthoplastic",
    subcategory: "Chronic Wounds / Infection",
    clinicalGroup: "elective",
    hasStaging: true, // Wagner classification — new staging to add
    searchSynonyms: [
      "diabetic foot",
      "diabetic ulcer",
      "Wagner",
      "neuropathic ulcer",
      "Charcot",
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
        displayName: "Negative pressure wound therapy",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Wagner 1–2 after granulation",
        conditionStagingMatch: {
          stagingSystemName: "Wagner Grade",
          matchValues: ["1", "2"],
        },
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_ped_reversed_sural",
        displayName: "Reversed sural flap (heel/hindfoot defect)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Wagner 3–4 with exposed deep structure",
        conditionStagingMatch: {
          stagingSystemName: "Wagner Grade",
          matchValues: ["3", "4"],
        },
        sortOrder: 4,
      },
      {
        procedurePicklistId: "orth_bka",
        displayName: "Below-knee amputation",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Wagner 5 — non-salvageable foot",
        conditionStagingMatch: {
          stagingSystemName: "Wagner Grade",
          matchValues: ["5"],
        },
        sortOrder: 5,
      },
      {
        procedurePicklistId: "orth_ray_amputation",
        displayName: "Ray amputation",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For Wagner 4 — localized gangrene",
        conditionStagingMatch: {
          stagingSystemName: "Wagner Grade",
          matchValues: ["4"],
        },
        sortOrder: 6,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "orth_dx_pretibial_laceration",
    displayName: "Pretibial laceration",
    shortName: "Pretibial lac",
    snomedCtCode: "283680004",
    snomedCtDisplay: "Laceration of pretibial skin (finding)",
    specialty: "orthoplastic",
    subcategory: "Chronic Wounds / Infection",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "pretibial",
      "shin laceration",
      "pretibial flap",
      "degloving shin",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "gen_trauma_pretibial_repair",
        displayName: "Pretibial laceration repair — primary closure",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_sheet",
        displayName: "STSG — sheet",
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
    id: "orth_dx_nec_fasc",
    displayName: "Necrotising fasciitis (requiring reconstruction)",
    shortName: "Nec fasc recon",
    snomedCtCode: "52486002",
    snomedCtDisplay: "Necrotizing fasciitis (disorder)",
    specialty: "orthoplastic",
    subcategory: "Chronic Wounds / Infection",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "necrotising fasciitis",
      "necrotizing fasciitis",
      "nec fasc",
      "NF",
      "soft tissue infection",
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
        displayName: "Negative pressure wound therapy",
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_ped_vy_fasciocutaneous",
        displayName: "V-Y fasciocutaneous flap",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RECONSTRUCTION / COMPLEX CLOSURES
// ═══════════════════════════════════════════════════════════════════════════════

const ORTH_DX_RECONSTRUCTION: DiagnosisPicklistEntry[] = [
  {
    id: "orth_dx_sternal_wound",
    displayName: "Sternal wound (post-cardiac surgery)",
    shortName: "Sternal wound",
    snomedCtCode: "13954005",
    snomedCtDisplay: "Wound of sternum (disorder)",
    specialty: "orthoplastic",
    subcategory: "Complex Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "sternal",
      "sternotomy wound",
      "deep sternal infection",
      "mediastinitis",
      "DSWI",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_reg_pectoralis_major",
        displayName: "Pedicled pectoralis major flap",
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_chest_wall_reconstruction",
        displayName: "Chest wall reconstruction",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "orth_dx_post_traumatic_tissue_loss",
    displayName: "Post-traumatic tissue loss — limb (requiring flap)",
    shortName: "Tissue loss limb",
    snomedCtCode: "283680004",
    snomedCtDisplay: "Post-traumatic tissue loss of limb (finding)",
    specialty: "orthoplastic",
    subcategory: "Complex Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "tissue loss",
      "soft tissue defect",
      "flap coverage needed",
      "wound coverage",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_ff_alt",
        displayName: "Free ALT flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ff_gracilis",
        displayName: "Free gracilis flap",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_ff_ld",
        displayName: "Free LD flap",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "orth_ped_propeller",
        displayName: "Propeller flap",
        isDefault: false,
        sortOrder: 5,
      },
      {
        procedurePicklistId: "orth_ped_reversed_sural",
        displayName: "Reversed sural flap",
        isDefault: false,
        sortOrder: 6,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "orth_dx_amputation_stump_revision",
    displayName: "Amputation stump — revision / breakdown",
    shortName: "Stump revision",
    snomedCtCode: "81723002",
    snomedCtDisplay: "Amputation stump complication (disorder)",
    specialty: "orthoplastic",
    subcategory: "Complex Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "stump revision",
      "stump breakdown",
      "amputation wound",
      "stump ulcer",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_stump_revision",
        displayName: "Amputation stump revision",
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
    ],
    sortOrder: 3,
  },
  {
    id: "orth_dx_nonunion_flap",
    displayName: "Non-union requiring vascularised cover / bone graft",
    shortName: "Non-union + flap",
    snomedCtCode: "73936003",
    snomedCtDisplay: "Non-union of fracture (disorder)",
    specialty: "orthoplastic",
    subcategory: "Complex Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "non-union",
      "nonunion",
      "bone graft",
      "vascularised bone",
      "pseudoarthrosis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_ff_fibula",
        displayName: "Free fibula flap (vascularised bone)",
        isDefault: false,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_ff_ld",
        displayName: "Free LD flap (muscle + bone graft)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "orth_dx_pressure_injury_flap",
    displayName: "Pressure injury requiring flap coverage",
    shortName: "Pressure injury",
    snomedCtCode: "399912005",
    snomedCtDisplay: "Pressure injury (disorder)",
    specialty: "orthoplastic",
    subcategory: "Complex Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: true, // NPUAP in diagnosisStagingConfig
    searchSynonyms: [
      "pressure ulcer",
      "pressure sore",
      "decubitus",
      "sacral",
      "ischial",
      "trochanteric",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "orth_debride_surgical",
        displayName: "Surgical debridement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "orth_pressure_sore_flap",
        displayName: "Pressure sore flap (site-specific)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For NPUAP Stage 3–4",
        conditionStagingMatch: {
          stagingSystemName: "NPUAP Stage",
          matchValues: ["3", "4"],
        },
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_npwt",
        displayName: "Negative pressure wound therapy",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const ORTHOPLASTIC_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...ORTH_DX_TRAUMA,
  ...ORTH_DX_CHRONIC,
  ...ORTH_DX_RECONSTRUCTION,
];

/** Get orthoplastic diagnoses grouped by subcategory */
export function getOrthoplasticSubcategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dx of ORTHOPLASTIC_DIAGNOSES) {
    if (!seen.has(dx.subcategory)) {
      seen.add(dx.subcategory);
      result.push(dx.subcategory);
    }
  }
  return result;
}

/** Get orthoplastic diagnoses for a specific subcategory */
export function getOrthoplasticDiagnosesForSubcategory(
  subcategory: string,
): DiagnosisPicklistEntry[] {
  return ORTHOPLASTIC_DIAGNOSES.filter((dx) => dx.subcategory === subcategory);
}
