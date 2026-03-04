/**
 * Burns Diagnosis Picklist
 *
 * ~12 structured diagnoses covering ~95% of burns cases.
 * The key feature here is STAGING-CONDITIONAL procedure suggestions:
 * burn depth and TBSA% drive which procedures are suggested.
 *
 * Staging systems (Depth + TBSA%) already exist in diagnosisStagingConfig.ts.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
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
    snomedCtCode: "48333001",
    snomedCtDisplay: "Burn injury (disorder)",
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
    snomedCtCode: "62404004",
    snomedCtDisplay: "Scald (disorder)",
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
    snomedCtCode: "274261003",
    snomedCtDisplay: "Contact burn (disorder)",
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
    snomedCtCode: "37019002",
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
    snomedCtCode: "48333001",
    snomedCtDisplay: "Burn injury (disorder)",
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
// BURNS RECONSTRUCTION (delayed / elective)
// ═══════════════════════════════════════════════════════════════════════════════

const BURNS_DX_RECONSTRUCTION: DiagnosisPicklistEntry[] = [
  {
    id: "burns_dx_contracture_hand",
    displayName: "Burn contracture — hand / digits",
    shortName: "Burn contracture hand",
    snomedCtCode: "262562005",
    snomedCtDisplay: "Contracture of hand due to burn (disorder)",
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
    snomedCtCode: "262562005",
    snomedCtDisplay: "Contracture of neck due to burn (disorder)",
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
    snomedCtCode: "262562005",
    snomedCtDisplay: "Post-burn contracture (disorder)",
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
    snomedCtCode: "262562005",
    snomedCtDisplay: "Web space contracture due to burn (disorder)",
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
// BURN SCAR
// ═══════════════════════════════════════════════════════════════════════════════

const BURNS_DX_SCAR: DiagnosisPicklistEntry[] = [
  {
    id: "burns_dx_hypertrophic_scar",
    displayName: "Hypertrophic burn scar",
    shortName: "Burn scar",
    snomedCtCode: "403191005",
    snomedCtDisplay: "Hypertrophic scar due to burn (disorder)",
    specialty: "burns",
    subcategory: "Burn Scar",
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
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const BURNS_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...BURNS_DX_ACUTE,
  ...BURNS_DX_RECONSTRUCTION,
  ...BURNS_DX_SCAR,
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
