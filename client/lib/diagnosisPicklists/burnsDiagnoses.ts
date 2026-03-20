/**
 * Burns Diagnosis Picklist
 *
 * ~36 structured diagnoses covering acute burns (by mechanism), reconstruction
 * (contractures, scars, anatomic-specific), and non-operative management.
 *
 * Staging systems (Depth + TBSA%) already exist in diagnosisStagingConfig.ts.
 * The key feature is STAGING-CONDITIONAL procedure suggestions:
 * burn depth and TBSA% drive which procedures are suggested for acute burns.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 * All codes validated against CSIRO Ontoserver (2026-03-20).
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// ACUTE BURNS — By mechanism
// Each shares the same conditional procedure logic based on depth/TBSA staging
// ═══════════════════════════════════════════════════════════════════════════════

const BURNS_DX_ACUTE: DiagnosisPicklistEntry[] = [
  {
    id: "burns_dx_thermal",
    displayName: "Thermal burn (flame / flash)",
    shortName: "Thermal burn",
    snomedCtCode: "284196006",
    snomedCtDisplay: "Burn of skin (disorder)",
    specialty: "burns",
    subcategory: "Acute Burns",
    clinicalGroup: "trauma",
    hasStaging: true, // Depth + TBSA% in diagnosisStagingConfig
    searchSynonyms: ["flame burn", "flash burn", "thermal injury", "fire"],
    suggestedProcedures: [
      // === ALWAYS suggested for any burn ===
      {
        procedurePicklistId: "burns_acute_wound_dressing",
        displayName: "Burns wound dressing / biological dressing",
        isDefault: true,
        sortOrder: 1,
      },
      // === Conditional on DEPTH ===
      {
        procedurePicklistId: "burns_acute_tangential_excision",
        displayName: "Tangential excision (burn wound)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For deep partial (2b) or full thickness burns",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["deep_partial", "full_thickness"],
        },
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "Split-thickness skin graft (STSG) — meshed",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For deep partial (2b) or full thickness burns",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["deep_partial", "full_thickness"],
        },
        sortOrder: 3,
      },
      {
        procedurePicklistId: "burns_acute_fascial_excision",
        displayName: "Fascial excision (deep burn)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For full thickness burns",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["full_thickness"],
        },
        sortOrder: 4,
      },
      {
        procedurePicklistId: "burns_graft_dermal_substitute",
        displayName: "Dermal substitute (Integra / Matriderm / BTM)",
        isDefault: false,
        isConditional: true,
        conditionDescription:
          "For full thickness burns — staged reconstruction",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["full_thickness"],
        },
        sortOrder: 5,
      },
      // === Conditional on TBSA ===
      {
        procedurePicklistId: "burns_graft_meek",
        displayName: "Meek micrografting",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For major burns TBSA >30%",
        conditionStagingMatch: {
          stagingSystemName: "TBSA %",
          matchValues: ["30-50", ">50"],
        },
        sortOrder: 6,
      },
      {
        procedurePicklistId: "burns_graft_xenograft",
        displayName: "Xenograft / allograft (temporary cover)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For major burns TBSA >20%",
        conditionStagingMatch: {
          stagingSystemName: "TBSA %",
          matchValues: ["20-30", "30-50", ">50"],
        },
        sortOrder: 7,
      },
      {
        procedurePicklistId: "burns_graft_cea",
        displayName: "Cultured epithelial autograft (CEA)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For major burns TBSA >50%",
        conditionStagingMatch: {
          stagingSystemName: "TBSA %",
          matchValues: [">50"],
        },
        sortOrder: 8,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "burns_dx_scald",
    displayName: "Scald burn",
    shortName: "Scald",
    snomedCtCode: "423858006",
    snomedCtDisplay: "Scald of skin (disorder)",
    specialty: "burns",
    subcategory: "Acute Burns",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["scald", "hot water", "steam burn", "boiling water"],
    // Same conditional logic as thermal — reference same procedure IDs
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_acute_wound_dressing",
        displayName: "Burns wound dressing / biological dressing",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_acute_tangential_excision",
        displayName: "Tangential excision (burn wound)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For deep partial (2b) or full thickness burns",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["deep_partial", "full_thickness"],
        },
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "Split-thickness skin graft (STSG) — meshed",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For deep partial (2b) or full thickness burns",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["deep_partial", "full_thickness"],
        },
        sortOrder: 3,
      },
      {
        procedurePicklistId: "burns_graft_dermal_substitute",
        displayName: "Dermal substitute (Integra / Matriderm / BTM)",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For full thickness burns",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["full_thickness"],
        },
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "burns_dx_contact",
    displayName: "Contact burn",
    shortName: "Contact burn",
    snomedCtCode: "385516009",
    snomedCtDisplay: "Contact burn of skin (disorder)",
    specialty: "burns",
    subcategory: "Acute Burns",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["contact burn", "iron burn", "exhaust burn", "radiator"],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_acute_wound_dressing",
        displayName: "Burns wound dressing / biological dressing",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_acute_tangential_excision",
        displayName: "Tangential excision",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For deep partial or full thickness",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["deep_partial", "full_thickness"],
        },
        sortOrder: 2,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For deep partial or full thickness",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["deep_partial", "full_thickness"],
        },
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "burns_dx_chemical",
    displayName: "Chemical burn",
    shortName: "Chemical burn",
    snomedCtCode: "426284001",
    snomedCtDisplay: "Chemical burn (disorder)",
    specialty: "burns",
    subcategory: "Acute Burns",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: [
      "acid burn",
      "alkali burn",
      "chemical injury",
      "HF",
      "hydrofluoric",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_site_chemical",
        displayName: "Chemical burn management",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_acute_wound_dressing",
        displayName: "Burns wound dressing",
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "burns_acute_tangential_excision",
        displayName: "Tangential excision",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For deep partial or full thickness",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["deep_partial", "full_thickness"],
        },
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_ssg_meshed",
        displayName: "STSG — meshed",
        isDefault: false,
        isConditional: true,
        conditionDescription: "For deep partial or full thickness",
        conditionStagingMatch: {
          stagingSystemName: "Depth",
          matchValues: ["deep_partial", "full_thickness"],
        },
        sortOrder: 4,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "burns_dx_electrical",
    displayName: "Electrical burn",
    shortName: "Electrical burn",
    snomedCtCode: "405571006",
    snomedCtDisplay: "Electrical burn (disorder)",
    specialty: "burns",
    subcategory: "Acute Burns",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: [
      "electrical burn",
      "high voltage",
      "arc burn",
      "flash burn electrical",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_site_electrical",
        displayName: "Electrical burn management",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_acute_fasciotomy",
        displayName: "Fasciotomy — burns",
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "burns_acute_wound_dressing",
        displayName: "Burns wound dressing",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "burns_acute_tangential_excision",
        displayName: "Tangential excision",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "burns_acute_amputation",
        displayName: "Amputation — non-salvageable burn limb",
        isDefault: false,
        sortOrder: 5,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "burns_dx_circumferential",
    displayName: "Circumferential burn (requiring escharotomy)",
    shortName: "Circumferential burn",
    snomedCtCode: "284196006",
    snomedCtDisplay: "Burn of skin (disorder)",
    specialty: "burns",
    subcategory: "Acute Burns",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: [
      "circumferential",
      "escharotomy",
      "compartment syndrome burn",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_acute_escharotomy",
        displayName: "Escharotomy",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_acute_fasciotomy",
        displayName: "Fasciotomy — burns",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "burns_acute_tangential_excision",
        displayName: "Tangential excision",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ACUTE BURNS — Expanded mechanism variants + new mechanisms
// Split from generic entries for richer reporting. Original IDs preserved above.
// ═══════════════════════════════════════════════════════════════════════════════

/** Shared conditional procedure suggestions for standard acute burns */
const STANDARD_ACUTE_SUGGESTIONS: DiagnosisPicklistEntry["suggestedProcedures"] =
  [
    {
      procedurePicklistId: "burns_acute_wound_dressing",
      displayName: "Burns wound dressing",
      isDefault: true,
      sortOrder: 1,
    },
    {
      procedurePicklistId: "burns_acute_tangential_excision",
      displayName: "Tangential excision",
      isDefault: false,
      isConditional: true,
      conditionDescription: "For deep partial or full thickness burns",
      conditionStagingMatch: {
        stagingSystemName: "Depth",
        matchValues: ["deep_partial", "full_thickness"],
      },
      sortOrder: 2,
    },
    {
      procedurePicklistId: "burns_graft_stsg_meshed",
      displayName: "STSG — meshed (burns)",
      isDefault: false,
      isConditional: true,
      conditionDescription: "For deep partial or full thickness burns",
      conditionStagingMatch: {
        stagingSystemName: "Depth",
        matchValues: ["deep_partial", "full_thickness"],
      },
      sortOrder: 3,
    },
    {
      procedurePicklistId: "burns_graft_dermal_substitute",
      displayName: "Dermal substitute (Integra / Matriderm / BTM)",
      isDefault: false,
      isConditional: true,
      conditionDescription: "For full thickness burns",
      conditionStagingMatch: {
        stagingSystemName: "Depth",
        matchValues: ["full_thickness"],
      },
      sortOrder: 4,
    },
  ];

const BURNS_DX_ACUTE_EXPANDED: DiagnosisPicklistEntry[] = [
  // --- Thermal variants (split from burns_dx_thermal) ---
  {
    id: "burns_dx_thermal_flame",
    displayName: "Flame burn",
    shortName: "Flame burn",
    snomedCtCode: "314534006",
    snomedCtDisplay: "Thermal burn (disorder)",
    specialty: "burns",
    subcategory: "Acute Thermal",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["flame", "fire", "house fire", "campfire"],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 10,
  },
  {
    id: "burns_dx_thermal_scald",
    displayName: "Scald burn",
    shortName: "Scald burn",
    snomedCtCode: "423858006",
    snomedCtDisplay: "Scald of skin (disorder)",
    specialty: "burns",
    subcategory: "Acute Thermal",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["scald", "hot water", "boiling", "kettle", "bath"],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 11,
  },
  {
    id: "burns_dx_thermal_contact",
    displayName: "Contact burn",
    shortName: "Contact burn",
    snomedCtCode: "385516009",
    snomedCtDisplay: "Contact burn of skin (disorder)",
    specialty: "burns",
    subcategory: "Acute Thermal",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["iron", "exhaust", "radiator", "heater", "press"],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 12,
  },
  {
    id: "burns_dx_thermal_flash",
    displayName: "Flash burn",
    shortName: "Flash burn",
    snomedCtCode: "385515008",
    snomedCtDisplay: "Flash burn of skin (disorder)",
    specialty: "burns",
    subcategory: "Acute Thermal",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["flash", "explosion", "gas ignition"],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 13,
  },

  // --- Chemical variants (split from burns_dx_chemical) ---
  {
    id: "burns_dx_chemical_acid",
    displayName: "Chemical burn — acid",
    shortName: "Acid burn",
    snomedCtCode: "426284001",
    snomedCtDisplay: "Chemical burn (disorder)",
    specialty: "burns",
    subcategory: "Acute Chemical",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: [
      "acid",
      "HF",
      "hydrofluoric",
      "sulphuric",
      "hydrochloric",
    ],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 20,
  },
  {
    id: "burns_dx_chemical_alkali",
    displayName: "Chemical burn — alkali",
    shortName: "Alkali burn",
    snomedCtCode: "426284001",
    snomedCtDisplay: "Chemical burn (disorder)",
    specialty: "burns",
    subcategory: "Acute Chemical",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["alkali", "cement", "sodium hydroxide", "lye", "ammonia"],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 21,
  },
  {
    id: "burns_dx_chemical_other",
    displayName: "Chemical burn — other agent",
    shortName: "Chemical burn other",
    snomedCtCode: "426284001",
    snomedCtDisplay: "Chemical burn (disorder)",
    specialty: "burns",
    subcategory: "Acute Chemical",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["chemical", "industrial", "phosphorus", "bitumen"],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 22,
  },

  // --- Electrical variants (split from burns_dx_electrical) ---
  {
    id: "burns_dx_electrical_low",
    displayName: "Electrical burn — low voltage (<1000V)",
    shortName: "LV electrical burn",
    snomedCtCode: "405571006",
    snomedCtDisplay: "Electrical burn (disorder)",
    specialty: "burns",
    subcategory: "Acute Electrical",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["low voltage", "household", "domestic", "240V"],
    suggestedProcedures: [
      ...STANDARD_ACUTE_SUGGESTIONS,
      {
        procedurePicklistId: "burns_acute_fasciotomy",
        displayName: "Fasciotomy",
        isDefault: false,
        sortOrder: 5,
      },
    ],
    sortOrder: 30,
  },
  {
    id: "burns_dx_electrical_high",
    displayName: "Electrical burn — high voltage (≥1000V)",
    shortName: "HV electrical burn",
    snomedCtCode: "405571006",
    snomedCtDisplay: "Electrical burn (disorder)",
    specialty: "burns",
    subcategory: "Acute Electrical",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: [
      "high voltage",
      "HT",
      "power line",
      "industrial electrical",
    ],
    suggestedProcedures: [
      ...STANDARD_ACUTE_SUGGESTIONS,
      {
        procedurePicklistId: "burns_acute_fasciotomy",
        displayName: "Fasciotomy",
        isDefault: true,
        sortOrder: 5,
      },
      {
        procedurePicklistId: "burns_acute_amputation",
        displayName: "Amputation (burn)",
        isDefault: false,
        sortOrder: 6,
      },
    ],
    sortOrder: 31,
  },

  // --- New acute mechanisms ---
  {
    id: "burns_dx_radiation",
    displayName: "Radiation burn",
    shortName: "Radiation burn",
    snomedCtCode: "425656005",
    snomedCtDisplay: "Burn caused by radiation (disorder)",
    specialty: "burns",
    subcategory: "Acute Other",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["radiation", "sunburn severe", "radiotherapy"],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 40,
  },
  {
    id: "burns_dx_friction",
    displayName: "Friction burn",
    shortName: "Friction burn",
    snomedCtCode: "284196006",
    snomedCtDisplay: "Burn of skin (disorder)",
    specialty: "burns",
    subcategory: "Acute Other",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["friction", "road rash", "treadmill", "carpet"],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 41,
  },
  {
    id: "burns_dx_cold_frostbite",
    displayName: "Cold injury / frostbite",
    shortName: "Frostbite",
    snomedCtCode: "370977006",
    snomedCtDisplay: "Frostbite (disorder)",
    specialty: "burns",
    subcategory: "Acute Other",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: ["frostbite", "cold injury", "hypothermia local"],
    suggestedProcedures: STANDARD_ACUTE_SUGGESTIONS,
    sortOrder: 42,
  },
  {
    id: "burns_dx_inhalation",
    displayName: "Inhalation injury",
    shortName: "Inhalation injury",
    snomedCtCode: "423234004",
    snomedCtDisplay: "Injury to respiratory system due to inhaled substance (disorder)",
    specialty: "burns",
    subcategory: "Acute Other",
    clinicalGroup: "trauma",
    hasStaging: false, // No depth/TBSA staging for inhalation
    searchSynonyms: [
      "inhalation",
      "smoke inhalation",
      "airway burn",
      "lung burn",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_acute_tracheostomy",
        displayName: "Tracheostomy",
        isDefault: false,
        sortOrder: 1,
      },
    ],
    sortOrder: 43,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BURNS RECONSTRUCTION (delayed / elective)
// ═══════════════════════════════════════════════════════════════════════════════

const BURNS_DX_RECONSTRUCTION: DiagnosisPicklistEntry[] = [
  {
    id: "burns_dx_contracture_hand",
    displayName: "Burn contracture — hand / digits",
    shortName: "Burn contracture hand",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burns Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "burn contracture",
      "hand contracture",
      "web space",
      "first web",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_recon_contracture_zplasty",
        displayName: "Contracture release — Z-plasty",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_recon_contracture_graft",
        displayName: "Contracture release — skin graft",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "burns_recon_contracture_local_flap",
        displayName: "Contracture release — local flap",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "burns_recon_web_space",
        displayName: "Web space reconstruction",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "burns_dx_contracture_neck",
    displayName: "Burn contracture — neck",
    shortName: "Burn contracture neck",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burns Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["neck contracture", "mentosternal", "chin contracture"],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_recon_contracture_graft",
        displayName: "Contracture release — skin graft",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_recon_contracture_regional_flap",
        displayName: "Contracture release — regional / pedicled flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "burns_recon_tissue_expansion",
        displayName: "Tissue expansion for burns reconstruction",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "burns_recon_contracture_free_flap",
        displayName: "Contracture release — free flap",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "burns_dx_contracture_other",
    displayName: "Burn contracture — axilla / elbow / other",
    shortName: "Burn contracture",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burns Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "axilla contracture",
      "elbow contracture",
      "knee contracture",
      "burn scar contracture",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_recon_contracture_graft",
        displayName: "Contracture release — skin graft",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_recon_contracture_local_flap",
        displayName: "Contracture release — local flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "burns_recon_contracture_zplasty",
        displayName: "Contracture release — Z-plasty",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "burns_recon_contracture_regional_flap",
        displayName: "Contracture release — regional / pedicled flap",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "burns_dx_web_space_contracture",
    displayName: "Burn web space contracture",
    shortName: "Web space contracture",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burns Reconstruction",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["web space", "first web", "interdigital", "web creep"],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_recon_web_space",
        displayName: "Web space reconstruction (hand / neck)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_recon_contracture_zplasty",
        displayName: "Z-plasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "burns_recon_contracture_graft",
        displayName: "Skin graft",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BURNS RECONSTRUCTION — Expanded (new site-specific + anatomic diagnoses)
// ═══════════════════════════════════════════════════════════════════════════════

/** Shared contracture release procedure suggestions */
const CONTRACTURE_RELEASE_SUGGESTIONS: DiagnosisPicklistEntry["suggestedProcedures"] =
  [
    {
      procedurePicklistId: "burns_recon_contracture_release",
      displayName: "Scar contracture release",
      isDefault: true,
      sortOrder: 1,
    },
    {
      procedurePicklistId: "burns_recon_contracture_graft",
      displayName: "Contracture release + skin graft",
      isDefault: false,
      sortOrder: 2,
    },
    {
      procedurePicklistId: "burns_recon_contracture_zplasty",
      displayName: "Z-plasty",
      isDefault: false,
      sortOrder: 3,
    },
    {
      procedurePicklistId: "burns_recon_contracture_local_flap",
      displayName: "Local flap",
      isDefault: false,
      sortOrder: 4,
    },
  ];

const BURNS_DX_RECON_EXPANDED: DiagnosisPicklistEntry[] = [
  {
    id: "burns_dx_contracture_axilla",
    displayName: "Burn contracture — axilla",
    shortName: "Axilla contracture",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burn Contractures",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["axilla", "armpit", "axillary contracture"],
    suggestedProcedures: CONTRACTURE_RELEASE_SUGGESTIONS,
    sortOrder: 10,
  },
  {
    id: "burns_dx_contracture_elbow",
    displayName: "Burn contracture — elbow / antecubital",
    shortName: "Elbow contracture",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burn Contractures",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["elbow", "antecubital", "flexion contracture"],
    suggestedProcedures: CONTRACTURE_RELEASE_SUGGESTIONS,
    sortOrder: 11,
  },
  {
    id: "burns_dx_contracture_knee",
    displayName: "Burn contracture — knee / popliteal",
    shortName: "Knee contracture",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burn Contractures",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["knee", "popliteal", "flexion contracture"],
    suggestedProcedures: CONTRACTURE_RELEASE_SUGGESTIONS,
    sortOrder: 12,
  },
  {
    id: "burns_dx_contracture_perineum",
    displayName: "Burn contracture — perineum",
    shortName: "Perineal contracture",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burn Contractures",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["perineum", "perineal", "groin contracture"],
    suggestedProcedures: CONTRACTURE_RELEASE_SUGGESTIONS,
    sortOrder: 13,
  },
  {
    id: "burns_dx_contracture_trunk",
    displayName: "Burn contracture — trunk / breast",
    shortName: "Trunk contracture",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burn Contractures",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["trunk", "chest", "breast", "abdominal contracture"],
    suggestedProcedures: CONTRACTURE_RELEASE_SUGGESTIONS,
    sortOrder: 14,
  },
  {
    id: "burns_dx_ectropion_burn",
    displayName: "Burn ectropion (eyelid)",
    shortName: "Burn ectropion",
    snomedCtCode: "28914006",
    snomedCtDisplay: "Cicatricial ectropion (disorder)",
    specialty: "burns",
    subcategory: "Burn Contractures",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["ectropion", "eyelid", "eye", "lid retraction"],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_recon_eyelid",
        displayName: "Eyelid reconstruction (burn)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_recon_contracture_graft",
        displayName: "Contracture release + skin graft",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 15,
  },
  {
    id: "burns_dx_microstomia",
    displayName: "Burn microstomia",
    shortName: "Microstomia",
    snomedCtCode: "14582003",
    snomedCtDisplay: "Microstomia (disorder)",
    specialty: "burns",
    subcategory: "Burn Contractures",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "microstomia",
      "mouth",
      "oral commissure",
      "lip contracture",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_recon_microstomia_release",
        displayName: "Microstomia release",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 16,
  },
  {
    id: "burns_dx_nasal_contracture",
    displayName: "Burn nasal contracture / stenosis",
    shortName: "Nasal contracture",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burn Contractures",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["nose", "nasal", "nostril", "stenosis"],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_recon_nose",
        displayName: "Nasal reconstruction (burn)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 17,
  },
  {
    id: "burns_dx_ear_contracture",
    displayName: "Burn ear deformity",
    shortName: "Ear deformity",
    snomedCtCode: "408294007",
    snomedCtDisplay: "Burn contracture of skin (disorder)",
    specialty: "burns",
    subcategory: "Burn Contractures",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["ear", "auricle", "pinna", "helical contracture"],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_recon_ear",
        displayName: "Ear reconstruction (burn)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 18,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BURN SCAR (expanded)
// ═══════════════════════════════════════════════════════════════════════════════

const BURNS_DX_SCAR: DiagnosisPicklistEntry[] = [
  {
    id: "burns_dx_hypertrophic_scar",
    displayName: "Hypertrophic burn scar",
    shortName: "Burn scar",
    snomedCtCode: "19843006",
    snomedCtDisplay: "Hypertrophic scar (disorder)",
    specialty: "burns",
    subcategory: "Burn Scars",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "hypertrophic scar",
      "burn scar",
      "raised scar",
      "scar management",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_scar_laser",
        displayName: "Laser treatment — burn scar",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_scar_steroid_injection",
        displayName: "Intralesional steroid injection",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "burns_recon_scar_excision",
        displayName: "Burn scar excision + closure / graft",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "burns_scar_fat_grafting",
        displayName: "Fat grafting to burn scar",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "burns_dx_scar_keloid",
    displayName: "Keloid burn scar",
    shortName: "Keloid scar",
    snomedCtCode: "33659008",
    snomedCtDisplay: "Keloid scar (disorder)",
    specialty: "burns",
    subcategory: "Burn Scars",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["keloid", "keloid scar", "burn keloid"],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_scar_steroid_injection",
        displayName: "Intralesional steroid injection",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "burns_scar_laser",
        displayName: "Laser treatment",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "burns_recon_scar_excision",
        displayName: "Scar excision + re-grafting",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "burns_dx_scar_unstable",
    displayName: "Unstable burn scar (Marjolin concern)",
    shortName: "Unstable scar",
    snomedCtCode: "448165009",
    snomedCtDisplay: "Squamous cell carcinoma arising in chronic ulcer (disorder)",
    specialty: "burns",
    subcategory: "Burn Scars",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "unstable scar",
      "marjolin",
      "ulcerating",
      "malignant change",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_recon_scar_excision",
        displayName: "Scar excision + re-grafting",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "burns_dx_heterotopic_ossification",
    displayName: "Post-burn heterotopic ossification",
    shortName: "HO (burn)",
    snomedCtCode: "128491006",
    snomedCtDisplay: "Heterotopic ossification (disorder)",
    specialty: "burns",
    subcategory: "Burn Scars",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "heterotopic ossification",
      "HO",
      "myositis ossificans",
      "ectopic bone",
    ],
    suggestedProcedures: [],
    sortOrder: 4,
  },
  {
    id: "burns_dx_neuropathic_pain",
    displayName: "Post-burn neuropathic pain",
    shortName: "Neuropathic pain",
    snomedCtCode: "247398009",
    snomedCtDisplay: "Neuropathic pain (finding)",
    specialty: "burns",
    subcategory: "Burn Scars",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: ["neuropathic", "neuroma", "pain", "itch"],
    suggestedProcedures: [],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NON-OPERATIVE BURNS
// ═══════════════════════════════════════════════════════════════════════════════

const BURNS_DX_NON_OPERATIVE: DiagnosisPicklistEntry[] = [
  {
    id: "burns_dx_nonop_wound_care",
    displayName: "Burn wound — conservative management",
    shortName: "Conservative wound care",
    snomedCtCode: "284196006",
    snomedCtDisplay: "Burn of skin (disorder)",
    specialty: "burns",
    subcategory: "Non-Operative Burns",
    clinicalGroup: "trauma",
    hasStaging: true,
    searchSynonyms: [
      "conservative",
      "wound care",
      "non operative",
      "dressing only",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_acute_wound_dressing",
        displayName: "Burns wound dressing",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "burns_dx_nonop_dressing_ga",
    displayName: "Burn dressing change under GA",
    shortName: "Dressing change GA",
    snomedCtCode: "284196006",
    snomedCtDisplay: "Burn of skin (disorder)",
    specialty: "burns",
    subcategory: "Non-Operative Burns",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "dressing change",
      "GA",
      "general anaesthetic",
      "paediatric dressing",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_acute_wound_dressing",
        displayName: "Burns wound dressing",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "burns_dx_nonop_scar_review",
    displayName: "Burn scar review / assessment",
    shortName: "Scar review",
    snomedCtCode: "19843006",
    snomedCtDisplay: "Hypertrophic scar (disorder)",
    specialty: "burns",
    subcategory: "Non-Operative Burns",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "scar review",
      "scar assessment",
      "follow up",
      "scar clinic",
    ],
    suggestedProcedures: [],
    sortOrder: 3,
  },
  {
    id: "burns_dx_nonop_garment_fit",
    displayName: "Pressure garment fitting",
    shortName: "Garment fitting",
    snomedCtCode: "403193008",
    snomedCtDisplay: "Burn scar (disorder)",
    specialty: "burns",
    subcategory: "Non-Operative Burns",
    clinicalGroup: "reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "pressure garment",
      "compression",
      "garment fitting",
      "silicone",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "burns_nonop_garment_fitting",
        displayName: "Pressure garment fitting",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const BURNS_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...BURNS_DX_ACUTE,
  ...BURNS_DX_ACUTE_EXPANDED,
  ...BURNS_DX_RECONSTRUCTION,
  ...BURNS_DX_RECON_EXPANDED,
  ...BURNS_DX_SCAR,
  ...BURNS_DX_NON_OPERATIVE,
];

/** Get burns diagnoses grouped by subcategory */
export function getBurnsSubcategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dx of BURNS_DIAGNOSES) {
    if (!seen.has(dx.subcategory)) {
      seen.add(dx.subcategory);
      result.push(dx.subcategory);
    }
  }
  return result;
}

/** Get burns diagnoses for a specific subcategory */
export function getBurnsDiagnosesForSubcategory(
  subcategory: string,
): DiagnosisPicklistEntry[] {
  return BURNS_DIAGNOSES.filter((dx) => dx.subcategory === subcategory);
}
