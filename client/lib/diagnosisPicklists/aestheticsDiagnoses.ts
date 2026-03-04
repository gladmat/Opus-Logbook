/**
 * Aesthetics Diagnosis Picklist
 *
 * ~18 structured diagnoses (framed as indications) covering ~85% of aesthetic cases.
 * Highly deterministic — each indication maps cleanly to 1-3 procedures.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// FACIAL AGEING
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_FACIAL_AGEING: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_facial_ageing_lower",
    displayName: "Facial ageing — lower face / neck",
    shortName: "Lower face ageing",
    snomedCtCode: "248296006",
    snomedCtDisplay: "Ageing face (finding)",
    specialty: "aesthetics",
    subcategory: "Facial Ageing",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "facelift",
      "jowls",
      "lower face",
      "neck laxity",
      "rhytidectomy",
      "SMAS",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_face_smas_facelift",
        displayName: "SMAS facelift (rhytidectomy)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_face_deep_plane",
        displayName: "Deep plane facelift",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "aes_face_mini_facelift",
        displayName: "Mini facelift / MACS",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "aes_dx_neck_ageing",
    displayName: "Facial ageing — neck only",
    shortName: "Neck ageing",
    snomedCtCode: "248296006",
    snomedCtDisplay: "Ageing appearance of neck (finding)",
    specialty: "aesthetics",
    subcategory: "Facial Ageing",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "neck lift",
      "turkey neck",
      "platysma bands",
      "submentoplasty",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_face_neck_lift",
        displayName: "Neck lift (platysmaplasty ± submentoplasty)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "aes_dx_upper_eyelid_dermatochalasis",
    displayName: "Upper eyelid dermatochalasis",
    shortName: "Upper bleph",
    snomedCtCode: "53441006",
    snomedCtDisplay: "Dermatochalasis (disorder)",
    specialty: "aesthetics",
    subcategory: "Facial Ageing",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "upper bleph",
      "blepharoplasty",
      "hooded eyelids",
      "excess upper eyelid skin",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_face_upper_bleph",
        displayName: "Upper blepharoplasty",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "aes_dx_lower_eyelid_bags",
    displayName: "Lower eyelid bags / laxity",
    shortName: "Lower bleph",
    snomedCtCode: "422413001",
    snomedCtDisplay: "Baggy lower eyelids (finding)",
    specialty: "aesthetics",
    subcategory: "Facial Ageing",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "lower bleph",
      "eye bags",
      "lower lid",
      "transconjunctival",
      "tear trough",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_face_lower_bleph",
        displayName: "Lower blepharoplasty",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "aes_dx_brow_ptosis",
    displayName: "Brow ptosis",
    shortName: "Brow ptosis",
    snomedCtCode: "11934000",
    snomedCtDisplay: "Brow ptosis (disorder)",
    specialty: "aesthetics",
    subcategory: "Facial Ageing",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["brow lift", "forehead", "brow ptosis", "heavy brow"],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_face_brow_lift_endoscopic",
        displayName: "Brow lift — endoscopic",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_face_brow_lift_open",
        displayName: "Brow lift — open (coronal / pretrichial)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NOSE / EAR
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_NOSE_EAR: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_nasal_cosmetic",
    displayName: "Nasal deformity — cosmetic",
    shortName: "Cosmetic nose",
    snomedCtCode: "249310007",
    snomedCtDisplay: "Deformity of nose (disorder)",
    specialty: "aesthetics",
    subcategory: "Nose & Ear",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "rhinoplasty",
      "nose job",
      "dorsal hump",
      "wide tip",
      "crooked nose",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_rhino_open",
        displayName: "Rhinoplasty — open",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_rhino_closed",
        displayName: "Rhinoplasty — closed (endonasal)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "aes_rhino_tip",
        displayName: "Tip rhinoplasty / alarplasty",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "aes_dx_nasal_functional",
    displayName: "Nasal deformity — functional obstruction",
    shortName: "Functional nose",
    snomedCtCode: "249310007",
    snomedCtDisplay: "Nasal obstruction (disorder)",
    specialty: "aesthetics",
    subcategory: "Nose & Ear",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "septorhinoplasty",
      "deviated septum",
      "nasal obstruction",
      "breathing",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_rhino_septorhinoplasty",
        displayName: "Septorhinoplasty (functional + aesthetic)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "aes_dx_nasal_revision",
    displayName: "Nasal deformity — revision (post-rhinoplasty)",
    shortName: "Revision rhino",
    snomedCtCode: "249310007",
    snomedCtDisplay: "Post-rhinoplasty nasal deformity (disorder)",
    specialty: "aesthetics",
    subcategory: "Nose & Ear",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "revision rhinoplasty",
      "secondary rhinoplasty",
      "redo nose",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_rhino_revision",
        displayName: "Revision rhinoplasty",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "aes_dx_prominent_ears",
    displayName: "Prominent ears",
    shortName: "Prominent ears",
    snomedCtCode: "15923001",
    snomedCtDisplay: "Prominent ear (disorder)",
    specialty: "aesthetics",
    subcategory: "Nose & Ear",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "prominent ears",
      "bat ears",
      "otoplasty",
      "pinnaplasty",
      "ear pinning",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_oto_prominent_ear",
        displayName: "Otoplasty — prominent ear correction",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "aes_dx_earlobe_deformity",
    displayName: "Earlobe deformity — split / stretched",
    shortName: "Earlobe deformity",
    snomedCtCode: "274730004",
    snomedCtDisplay: "Deformity of earlobe (disorder)",
    specialty: "aesthetics",
    subcategory: "Nose & Ear",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "split earlobe",
      "stretched earlobe",
      "torn ear",
      "gauge repair",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_oto_earlobe_reduction",
        displayName: "Earlobe reduction / repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SKIN / VOLUME
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_SKIN_VOLUME: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_volume_loss",
    displayName: "Facial volume loss",
    shortName: "Volume loss",
    snomedCtCode: "248296006",
    snomedCtDisplay: "Facial volume loss (finding)",
    specialty: "aesthetics",
    subcategory: "Skin & Volume",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "hollow cheeks",
      "volume loss",
      "fat transfer face",
      "filler face",
      "temple hollowing",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_inj_filler_midface",
        displayName: "Dermal filler — midface / cheeks",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_face_fat_transfer",
        displayName: "Facial fat transfer / lipofilling",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "aes_inj_filler_temples",
        displayName: "Dermal filler — temples",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "aes_dx_dynamic_wrinkles",
    displayName: "Dynamic facial wrinkles",
    shortName: "Dynamic wrinkles",
    snomedCtCode: "37890007",
    snomedCtDisplay: "Wrinkling of skin (finding)",
    specialty: "aesthetics",
    subcategory: "Skin & Volume",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "Botox",
      "botulinum toxin",
      "frown lines",
      "crow's feet",
      "forehead lines",
      "wrinkles",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_inj_botox_upper_face",
        displayName: "Botulinum toxin — upper face",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_inj_botox_lower_face",
        displayName: "Botulinum toxin — lower face / neck",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "aes_dx_skin_ageing",
    displayName: "Skin ageing / photodamage",
    shortName: "Skin ageing",
    snomedCtCode: "402618004",
    snomedCtDisplay: "Photoaged skin (disorder)",
    specialty: "aesthetics",
    subcategory: "Skin & Volume",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "photodamage",
      "sun damage",
      "skin texture",
      "resurfacing",
      "chemical peel",
      "laser skin",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_skin_chemical_peel_medium",
        displayName: "Chemical peel — medium (TCA)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_skin_laser_ablative",
        displayName: "Laser resurfacing — ablative (CO₂ / Er:YAG)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "aes_skin_laser_fractional",
        displayName: "Laser resurfacing — fractional",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "aes_skin_microneedling",
        displayName: "Microneedling ± PRP",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "aes_dx_alopecia",
    displayName: "Alopecia / hair loss",
    shortName: "Hair loss",
    snomedCtCode: "278040002",
    snomedCtDisplay: "Alopecia (disorder)",
    specialty: "aesthetics",
    subcategory: "Skin & Volume",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "alopecia",
      "hair loss",
      "male pattern baldness",
      "hair transplant",
      "FUE",
      "FUT",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_hair_fue",
        displayName: "Hair transplant — FUE",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_hair_fut",
        displayName: "Hair transplant — FUT (strip)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "aes_dx_rhinophyma",
    displayName: "Rhinophyma",
    shortName: "Rhinophyma",
    snomedCtCode: "31099005",
    snomedCtDisplay: "Rhinophyma (disorder)",
    specialty: "aesthetics",
    subcategory: "Skin & Volume",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["rhinophyma", "bulbous nose", "rosacea nose"],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_skin_laser_ablative",
        displayName: "Laser resurfacing — ablative (CO₂)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_skin_dermabrasion",
        displayName: "Dermabrasion",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BODY AESTHETICS
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_BODY: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_submental_fullness",
    displayName: "Submental fullness (double chin)",
    shortName: "Submental fat",
    snomedCtCode: "248296006",
    snomedCtDisplay: "Submental fullness (finding)",
    specialty: "aesthetics",
    subcategory: "Body Aesthetics",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["double chin", "submental", "chin liposuction", "Kybella"],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_body_liposuction",
        displayName: "Liposuction — submental",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "aes_dx_labia_hypertrophy",
    displayName: "Labia minora hypertrophy",
    shortName: "Labia hypertrophy",
    snomedCtCode: "289544001",
    snomedCtDisplay: "Hypertrophy of labia minora (disorder)",
    specialty: "aesthetics",
    subcategory: "Body Aesthetics",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: ["labiaplasty", "labia hypertrophy", "labial reduction"],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_body_labiaplasty",
        displayName: "Labiaplasty",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "aes_dx_tattoo_unwanted",
    displayName: "Unwanted tattoo",
    shortName: "Tattoo removal",
    snomedCtCode: "11381005",
    snomedCtDisplay: "Tattoo (finding)",
    specialty: "aesthetics",
    subcategory: "Body Aesthetics",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "tattoo removal",
      "laser tattoo",
      "unwanted tattoo",
      "Q-switched",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_skin_laser_pigment",
        displayName: "Pigment laser (Q-switched / picosecond)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "aes_dx_hyperhidrosis",
    displayName: "Hyperhidrosis (axillary / palmar)",
    shortName: "Hyperhidrosis",
    snomedCtCode: "312230002",
    snomedCtDisplay: "Hyperhidrosis (disorder)",
    specialty: "aesthetics",
    subcategory: "Body Aesthetics",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "hyperhidrosis",
      "excessive sweating",
      "sweaty palms",
      "sweaty armpits",
      "Botox sweating",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_inj_botox_hyperhidrosis",
        displayName: "Botulinum toxin — hyperhidrosis",
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

export const AESTHETICS_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...AES_DX_FACIAL_AGEING,
  ...AES_DX_NOSE_EAR,
  ...AES_DX_SKIN_VOLUME,
  ...AES_DX_BODY,
];

export function getAestheticsSubcategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dx of AESTHETICS_DIAGNOSES) {
    if (!seen.has(dx.subcategory)) {
      seen.add(dx.subcategory);
      result.push(dx.subcategory);
    }
  }
  return result;
}

export function getAestheticsDiagnosesForSubcategory(
  subcategory: string,
): DiagnosisPicklistEntry[] {
  return AESTHETICS_DIAGNOSES.filter((dx) => dx.subcategory === subcategory);
}
