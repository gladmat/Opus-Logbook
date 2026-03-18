/**
 * Aesthetics Diagnosis Picklist
 *
 * ~42 structured diagnoses covering aesthetics + body contouring (merged).
 * Each entry carries an `intent` modifier (cosmetic / post_bariatric_mwl /
 * functional_reconstructive / combined) determined by the diagnosis, not
 * the procedure.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 *
 * Body contouring diagnoses absorbed from bodyContouringDiagnoses.ts in Phase 2.
 * Original `bc_dx_*` IDs renamed to `aes_dx_*`; aliases in index.ts.
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
  // ── New facial diagnoses (Phase 2) ──
  {
    id: "aes_dx_lip_ageing",
    displayName: "Lip ageing / thin lips",
    shortName: "Lip ageing",
    snomedCtCode: "201093004",
    snomedCtDisplay: "Redundant skin (disorder)",
    specialty: "aesthetics",
    subcategory: "Facial Ageing",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "thin lips",
      "lip lines",
      "lip augmentation",
      "lip lift",
      "perioral ageing",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_inj_filler_lips",
        displayName: "Dermal filler — lips",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_lip_lift",
        displayName: "Lip lift",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "aes_dx_periorbital_ageing",
    displayName: "Periorbital ageing / hollowing",
    shortName: "Periorbital ageing",
    snomedCtCode: "201093004",
    snomedCtDisplay: "Redundant skin (disorder)",
    specialty: "aesthetics",
    subcategory: "Facial Ageing",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "tear trough",
      "under eye hollows",
      "periorbital volume loss",
      "sunken eyes",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_inj_filler_tear_trough",
        displayName: "Dermal filler — tear trough",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_face_fat_transfer",
        displayName: "Fat transfer — periorbital",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 7,
  },
  {
    id: "aes_dx_facial_asymmetry_aesthetic",
    displayName: "Facial asymmetry — aesthetic correction",
    shortName: "Facial asymmetry",
    snomedCtCode: "15253005",
    snomedCtDisplay: "Facial asymmetry (disorder)",
    specialty: "aesthetics",
    subcategory: "Facial Ageing",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: ["asymmetry", "uneven face", "facial imbalance"],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_inj_filler_midface",
        displayName: "Dermal filler — facial balancing",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_face_fat_transfer",
        displayName: "Fat transfer — face",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 8,
  },
  {
    id: "aes_dx_jawline_contour",
    displayName: "Jawline / chin contour dissatisfaction",
    shortName: "Jawline contour",
    snomedCtCode: "201093004",
    snomedCtDisplay: "Redundant skin (disorder)",
    specialty: "aesthetics",
    subcategory: "Facial Ageing",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "jawline",
      "chin implant",
      "chin augmentation",
      "jowls",
      "submental",
      "double chin",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_inj_filler_jawline_chin",
        displayName: "Dermal filler — jawline/chin",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_face_chin_implant",
        displayName: "Chin implant (mentoplasty)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "aes_body_liposuction",
        displayName: "Submental liposuction",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 9,
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
    intent: "cosmetic",
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
    intent: "functional_reconstructive",
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
      {
        procedurePicklistId: "aes_energy_rf_microneedling",
        displayName: "RF microneedling",
        isDefault: false,
        sortOrder: 5,
      },
      {
        procedurePicklistId: "aes_skin_laser_ipl",
        displayName: "IPL / BBL",
        isDefault: false,
        sortOrder: 6,
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
    intent: "cosmetic",
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
    intent: "functional_reconstructive",
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
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: ["double chin", "submental", "chin liposuction", "Kybella"],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_body_liposuction",
        displayName: "Liposuction — submental",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_energy_cryolipolysis",
        displayName: "Cryolipolysis (CoolSculpting)",
        isDefault: false,
        sortOrder: 2,
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
    intent: "cosmetic",
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
    intent: "cosmetic",
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
    intent: "functional_reconstructive",
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
  // ── New body diagnoses (Phase 2) ──
  {
    id: "aes_dx_gynecomastia",
    displayName: "Gynaecomastia (aesthetic)",
    shortName: "Gynaecomastia",
    snomedCtCode: "4754008",
    snomedCtDisplay: "Gynecomastia (disorder)",
    specialty: "aesthetics",
    subcategory: "Body Aesthetics",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "gynecomastia",
      "male breast",
      "man boobs",
      "chest reduction male",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_aes_gynaecomastia",
        displayName: "Gynaecomastia excision ± liposuction",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "aes_dx_calf_contour",
    displayName: "Calf contour dissatisfaction",
    shortName: "Calf contour",
    snomedCtCode: "201093004", // POST-COORDINATED: redundant skin + calf body site
    snomedCtDisplay: "Redundant skin (disorder)",
    specialty: "aesthetics",
    subcategory: "Body Aesthetics",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: ["calf implant", "calf augmentation", "thin calves"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_other_calf_implant",
        displayName: "Calf implant",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY-BASED (new Phase 2)
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_ENERGY: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_skin_laxity",
    displayName: "Skin laxity — non-surgical candidate",
    shortName: "Skin laxity",
    snomedCtCode: "201093004",
    snomedCtDisplay: "Redundant skin (disorder)",
    specialty: "aesthetics",
    subcategory: "Energy-Based",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "skin tightening",
      "laxity",
      "sagging",
      "Thermage",
      "Ultherapy",
      "RF",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_energy_rf_microneedling",
        displayName: "RF microneedling",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_energy_hifu",
        displayName: "HIFU",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "aes_energy_monopolar_rf",
        displayName: "Monopolar RF (Thermage)",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GENITAL / INTIMATE (new Phase 2)
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_GENITAL: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_clitoral_hood_excess",
    displayName: "Clitoral hood excess",
    shortName: "Clitoral hood",
    snomedCtCode: "16924008",
    snomedCtDisplay: "Hypertrophy of vulva (disorder)",
    specialty: "aesthetics",
    subcategory: "Genital / Intimate",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: ["clitoral hood reduction", "clitoroplasty"],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_genital_clitoral_hood",
        displayName: "Clitoral hood reduction",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "aes_dx_vaginal_laxity",
    displayName: "Vaginal laxity (aesthetic)",
    shortName: "Vaginal laxity",
    snomedCtCode: "3751000119101", // POST-COORDINATED: hypertrophy of labia — closest concept for vaginal laxity
    snomedCtDisplay: "Hypertrophy of labia (disorder)",
    specialty: "aesthetics",
    subcategory: "Genital / Intimate",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "vaginoplasty",
      "vaginal tightening",
      "vaginal rejuvenation",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_genital_vaginoplasty",
        displayName: "Aesthetic vaginoplasty",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "aes_dx_penile_aesthetic",
    displayName: "Penile aesthetic concern",
    shortName: "Penile aesthetic",
    snomedCtCode: "201093004", // POST-COORDINATED: redundant skin + penile body site
    snomedCtDisplay: "Redundant skin (disorder)",
    specialty: "aesthetics",
    subcategory: "Genital / Intimate",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "penile augmentation",
      "penile girth",
      "penile aesthetics",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_genital_penile",
        displayName: "Penile procedure (aesthetic)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ABDOMEN / TRUNK (absorbed from body contouring)
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_ABDOMEN: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_abdominal_excess",
    displayName: "Abdominal skin / fat excess",
    shortName: "Abdominal excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of abdomen (disorder)",
    specialty: "aesthetics",
    subcategory: "Abdomen",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "tummy tuck",
      "abdominal skin",
      "apron",
      "abdominoplasty indication",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_abdo_full",
        displayName: "Abdominoplasty — full (with muscle plication)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_abdo_mini",
        displayName: "Mini abdominoplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "bc_abdo_lipoabdominoplasty",
        displayName: "Lipoabdominoplasty",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "bc_abdo_extended",
        displayName: "Extended abdominoplasty",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "bc_abdo_fleur_de_lis",
        displayName: "Fleur-de-lis abdominoplasty",
        isDefault: false,
        sortOrder: 5,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "aes_dx_panniculitis",
    displayName: "Panniculitis / functional panniculus",
    shortName: "Pannus",
    snomedCtCode: "129649009",
    snomedCtDisplay: "Panniculitis (disorder)",
    specialty: "aesthetics",
    subcategory: "Abdomen",
    clinicalGroup: "elective",
    intent: "functional_reconstructive",
    hasStaging: false,
    searchSynonyms: [
      "pannus",
      "panniculectomy",
      "functional panniculus",
      "intertrigo",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_abdo_panniculectomy",
        displayName: "Panniculectomy (functional — non-cosmetic)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "aes_dx_diastasis_recti",
    displayName: "Rectus diastasis",
    shortName: "Diastasis recti",
    snomedCtCode: "225587006",
    snomedCtDisplay: "Diastasis recti (disorder)",
    specialty: "aesthetics",
    subcategory: "Abdomen",
    clinicalGroup: "elective",
    intent: "combined",
    hasStaging: false,
    searchSynonyms: [
      "diastasis recti",
      "rectus separation",
      "plication",
      "abdominal wall laxity",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_abdo_diastasis_repair",
        displayName: "Rectus diastasis repair (plication only)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_abdo_full",
        displayName: "Abdominoplasty — full (with muscle plication)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// UPPER BODY (absorbed from body contouring)
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_UPPER_BODY: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_upper_arm_excess",
    displayName: "Upper arm skin excess",
    shortName: "Arm excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of upper arm (disorder)",
    specialty: "aesthetics",
    subcategory: "Upper Body",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "arm lift",
      "bingo wings",
      "brachioplasty indication",
      "upper arm laxity",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_upper_brachioplasty",
        displayName: "Brachioplasty (arm lift)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_upper_brachioplasty_extended",
        displayName: "Extended brachioplasty (arm + lateral chest wall)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "aes_dx_back_excess",
    displayName: "Upper back / bra-line skin excess",
    shortName: "Back excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of trunk (disorder)",
    specialty: "aesthetics",
    subcategory: "Upper Body",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: ["back rolls", "bra roll", "bra-line", "upper back lift"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_upper_bra_line_lift",
        displayName: "Bra-line back lift (upper back excess)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LOWER BODY (absorbed from body contouring)
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_LOWER_BODY: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_thigh_excess",
    displayName: "Thigh skin excess",
    shortName: "Thigh excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of thigh (disorder)",
    specialty: "aesthetics",
    subcategory: "Lower Body",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "thigh lift",
      "inner thigh",
      "medial thigh",
      "lateral thigh",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_lower_thigh_lift_medial",
        displayName: "Medial thigh lift",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_lower_thigh_lift_lateral",
        displayName: "Lateral thigh lift",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "aes_dx_buttock_ptosis",
    displayName: "Buttock ptosis / excess",
    shortName: "Buttock ptosis",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Buttock ptosis (disorder)",
    specialty: "aesthetics",
    subcategory: "Lower Body",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: ["buttock lift", "buttock ptosis", "gluteal ptosis"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_buttock_lift",
        displayName: "Buttock lift",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_buttock_implant",
        displayName: "Buttock augmentation — implant",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "aes_dx_mons",
    displayName: "Mons pubis excess",
    shortName: "Mons excess",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess tissue of mons pubis (disorder)",
    specialty: "aesthetics",
    subcategory: "Lower Body",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: ["monsplasty", "mons pubis", "FUPA"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_postbar_mons_lift",
        displayName: "Monsplasty",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// POST-BARIATRIC (absorbed from body contouring)
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_POST_BARIATRIC: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_post_bariatric_body",
    displayName: "Post-bariatric body contour deformity — trunk",
    shortName: "Post-bariatric trunk",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin following weight loss (disorder)",
    specialty: "aesthetics",
    subcategory: "Post-Bariatric",
    clinicalGroup: "elective",
    intent: "post_bariatric_mwl",
    hasStaging: false,
    searchSynonyms: [
      "post-bariatric",
      "massive weight loss",
      "MWL",
      "body lift",
      "belt lipectomy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_postbar_combined_upper_lower",
        displayName: "Circumferential body lift",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "bc_lower_belt_lipectomy",
        displayName: "Belt lipectomy",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "bc_abdo_fleur_de_lis",
        displayName: "Fleur-de-lis abdominoplasty",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "aes_dx_post_bariatric_arm",
    displayName: "Post-bariatric arm excess",
    shortName: "Post-bariatric arms",
    snomedCtCode: "419459005",
    snomedCtDisplay:
      "Excess skin of upper arm following weight loss (disorder)",
    specialty: "aesthetics",
    subcategory: "Post-Bariatric",
    clinicalGroup: "elective",
    intent: "post_bariatric_mwl",
    hasStaging: false,
    searchSynonyms: ["post-bariatric arms", "massive weight loss arms"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_upper_brachioplasty_extended",
        displayName: "Extended brachioplasty (arm + lateral chest wall)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "aes_dx_post_bariatric_thigh",
    displayName: "Post-bariatric thigh excess",
    shortName: "Post-bariatric thighs",
    snomedCtCode: "419459005",
    snomedCtDisplay: "Excess skin of thigh following weight loss (disorder)",
    specialty: "aesthetics",
    subcategory: "Post-Bariatric",
    clinicalGroup: "elective",
    intent: "post_bariatric_mwl",
    hasStaging: false,
    searchSynonyms: ["post-bariatric thighs", "massive weight loss thighs"],
    suggestedProcedures: [
      {
        procedurePicklistId: "bc_lower_thigh_lift_medial",
        displayName: "Thigh lift — post-bariatric",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  // ── New post-bariatric diagnosis (Phase 2) ──
  {
    id: "aes_dx_post_bariatric_breast",
    displayName: "Post-bariatric breast ptosis",
    shortName: "Post-bariatric breast",
    snomedCtCode: "201093004", // POST-COORDINATED: redundant skin + breast body site
    snomedCtDisplay: "Redundant skin (disorder)",
    specialty: "aesthetics",
    subcategory: "Post-Bariatric",
    clinicalGroup: "elective",
    intent: "post_bariatric_mwl",
    hasStaging: false,
    searchSynonyms: [
      "bariatric breast",
      "breast deflation",
      "weight loss breast",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "breast_aes_mastopexy_wise",
        displayName: "Mastopexy — Wise pattern",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "breast_aes_augmentation_mastopexy",
        displayName: "Augmentation-mastopexy",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// LIPODYSTROPHY (absorbed from body contouring)
// ═══════════════════════════════════════════════════════════════════════════════

const AES_DX_LIPODYSTROPHY: DiagnosisPicklistEntry[] = [
  {
    id: "aes_dx_lipodystrophy",
    displayName: "Lipodystrophy / localised fat excess",
    shortName: "Lipodystrophy",
    snomedCtCode: "238849006",
    snomedCtDisplay: "Lipodystrophy (disorder)",
    specialty: "aesthetics",
    subcategory: "Lipodystrophy",
    clinicalGroup: "elective",
    intent: "cosmetic",
    hasStaging: false,
    searchSynonyms: [
      "lipodystrophy",
      "localised fat",
      "liposuction indication",
      "stubborn fat",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "aes_body_liposuction",
        displayName: "Liposuction (any site)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "aes_body_liposuction_hd",
        displayName: "High-definition liposuction / VASER",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
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
  ...AES_DX_ENERGY,
  ...AES_DX_GENITAL,
  ...AES_DX_ABDOMEN,
  ...AES_DX_UPPER_BODY,
  ...AES_DX_LOWER_BODY,
  ...AES_DX_POST_BARIATRIC,
  ...AES_DX_LIPODYSTROPHY,
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
