/**
 * Burns Diagnosis Picklist
 *
 * Assessment-derived architecture for acute burns:
 * - Single "Acute burn" entry → BurnsAssessment captures mechanism, TBSA, depth
 * - deriveBurnDiagnosis() maps assessment → specific SNOMED CT code
 * - getAssessmentDrivenProcedureSuggestions() generates conditional procedures
 * - hasStaging: false — BurnsAssessment owns all TBSA/depth data
 *
 * Reconstructive diagnoses (contractures, scars, anatomic-specific) use
 * standard diagnosis-first flow — no BurnsAssessment.
 *
 * ~1 acute + ~13 reconstructive/contracture + ~5 scar = ~19 total diagnoses.
 *
 * SNOMED CT codes from the Clinical Finding hierarchy (<<404684003).
 * All codes validated against CSIRO Ontoserver (2026-03-20).
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// ACUTE BURNS — Single entry; mechanism captured in BurnsAssessment
// ═══════════════════════════════════════════════════════════════════════════════

const BURNS_DX_ACUTE_SINGLE: DiagnosisPicklistEntry[] = [
  {
    id: "burns_dx_acute",
    displayName: "Acute burn",
    shortName: "Acute burn",
    snomedCtCode: "284196006", // Generic — refined by BurnsAssessment via deriveBurnDiagnosis()
    snomedCtDisplay: "Burn of skin (disorder)",
    specialty: "burns",
    subcategory: "Acute Burns",
    clinicalGroup: "trauma",
    hasStaging: false, // TBSA + depth handled by BurnsAssessment, NOT generic staging
    searchSynonyms: [
      "burn",
      "thermal",
      "flame",
      "scald",
      "contact",
      "flash",
      "steam",
      "chemical",
      "acid",
      "alkali",
      "electrical",
      "radiation",
      "friction",
      "frostbite",
      "cold injury",
      "inhalation",
      "circumferential",
    ],
    // Default procedure suggestion; dynamic suggestions via
    // getAssessmentDrivenProcedureSuggestions() in burnsConfig.ts
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
// BURNS RECONSTRUCTION — Expanded (site-specific + anatomic diagnoses)
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
// BURN SCAR
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
    snomedCtDisplay:
      "Squamous cell carcinoma arising in chronic ulcer (disorder)",
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
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const BURNS_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...BURNS_DX_ACUTE_SINGLE,
  ...BURNS_DX_RECONSTRUCTION,
  ...BURNS_DX_RECON_EXPANDED,
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
