/**
 * Head & Neck Diagnosis Picklist
 *
 * ~25 structured diagnoses covering ~80% of H&N cases.
 *
 * Mixed determinism:
 * - Skin cancer excisions → highly predictable (site-based reconstruction)
 * - Facial fractures → very deterministic (1:1 mapping)
 * - Cleft / craniofacial → deterministic
 * - Facial nerve / major reconstruction → LOOSE suggestions only
 *   (procedure depends on defect + patient factors, not just diagnosis)
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// SKIN CANCER — H&N sites
// Site-specific diagnoses with site-appropriate reconstruction suggestions.
// The existing skin cancer picklist in General handles non-site-specific entries.
// ═══════════════════════════════════════════════════════════════════════════════

export const HN_DX_SKIN_CANCER: DiagnosisPicklistEntry[] = [
  {
    id: "hn_dx_skin_lesion_excision_biopsy",
    displayName: "Skin lesion — excision biopsy (awaiting histology)",
    shortName: "Excision biopsy",
    snomedCtCode: "95324001",
    snomedCtDisplay: "Skin lesion (finding)",
    specialty: "head_neck",
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
    id: "hn_dx_bcc_face",
    displayName: "BCC of face / head / neck",
    shortName: "BCC face",
    snomedCtCode: "254701007",
    snomedCtDisplay: "Basal cell carcinoma of skin of face (disorder)",
    specialty: "head_neck",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["basal cell", "BCC", "rodent ulcer", "face skin cancer"],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_skin_bcc_excision",
        displayName: "BCC excision — face / head / neck",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_local_advancement",
        displayName: "Local advancement flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_local_rotation",
        displayName: "Local rotation flap",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "hn_local_transposition",
        displayName: "Local transposition flap",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "hn_dx_scc_face",
    displayName: "SCC of face / head / neck",
    shortName: "SCC face",
    snomedCtCode: "254651007",
    snomedCtDisplay: "Squamous cell carcinoma of skin of face (disorder)",
    specialty: "head_neck",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["squamous cell", "SCC", "cutaneous SCC", "cSCC"],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_skin_scc_excision",
        displayName: "SCC excision — face / head / neck",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_skin_slnb",
        displayName: "Sentinel lymph node biopsy",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_local_advancement",
        displayName: "Local advancement flap",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "hn_dx_melanoma_face",
    displayName: "Melanoma of head / neck",
    shortName: "Melanoma H&N",
    snomedCtCode: "93655004",
    snomedCtDisplay: "Malignant melanoma of skin of face (disorder)",
    specialty: "head_neck",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: true, // Breslow + ulceration in diagnosisStagingConfig
    hasEnhancedHistology: true,
    searchSynonyms: ["melanoma", "malignant melanoma", "head neck melanoma"],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_skin_melanoma_wle",
        displayName: "Melanoma wide local excision — face / head / neck",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_skin_slnb",
        displayName: "Sentinel lymph node biopsy",
        isDefault: true,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_other_neck_dissection",
        displayName: "Neck dissection",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "hn_dx_skin_cancer_nose",
    displayName: "Skin cancer of nose (BCC / SCC)",
    shortName: "Skin cancer nose",
    snomedCtCode: "254701007",
    snomedCtDisplay: "Basal cell carcinoma of skin of nose (disorder)",
    specialty: "head_neck",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["nasal BCC", "nasal SCC", "nose cancer", "alar", "dorsum"],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_skin_bcc_excision",
        displayName: "Skin cancer excision — nose",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_local_bilobed",
        displayName: "Bilobed flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_reg_paramedian_forehead",
        displayName: "Paramedian forehead flap",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "hn_recon_nose_partial",
        displayName: "Partial nasal reconstruction",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "hn_dx_skin_cancer_ear",
    displayName: "Skin cancer of ear (BCC / SCC)",
    shortName: "Skin cancer ear",
    snomedCtCode: "254701007",
    snomedCtDisplay: "Basal cell carcinoma of skin of ear (disorder)",
    specialty: "head_neck",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: ["ear BCC", "ear SCC", "auricular", "pinna", "helix"],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_skin_bcc_excision",
        displayName: "Skin cancer excision — ear",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_local_advancement",
        displayName: "Local advancement flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_recon_ear_partial",
        displayName: "Partial ear reconstruction",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "hn_dx_skin_cancer_lip",
    displayName: "Skin cancer of lip (BCC / SCC)",
    shortName: "Skin cancer lip",
    snomedCtCode: "254701007",
    snomedCtDisplay: "Squamous cell carcinoma of lip (disorder)",
    specialty: "head_neck",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: [
      "lip SCC",
      "lip BCC",
      "vermilion",
      "lower lip cancer",
      "upper lip cancer",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_skin_scc_excision",
        displayName: "Skin cancer excision — lip",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_reg_abbe",
        displayName: "Abbe flap (lip switch)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_reg_karapandzic",
        displayName: "Karapandzic flap",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "hn_recon_lip",
        displayName: "Lip reconstruction",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "hn_dx_skin_cancer_eyelid",
    displayName: "Skin cancer of eyelid (BCC / SCC)",
    shortName: "Skin cancer eyelid",
    snomedCtCode: "254701007",
    snomedCtDisplay: "Basal cell carcinoma of skin of eyelid (disorder)",
    specialty: "head_neck",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    hasEnhancedHistology: true,
    searchSynonyms: [
      "eyelid BCC",
      "eyelid SCC",
      "periorbital",
      "lid margin",
      "medial canthus",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_skin_bcc_excision",
        displayName: "Skin cancer excision — eyelid",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_recon_eyelid_upper",
        displayName: "Upper eyelid reconstruction",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_recon_eyelid_lower",
        displayName: "Lower eyelid reconstruction",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 7,
  },
  {
    id: "hn_dx_mohs_defect",
    displayName: "Mohs surgery defect (reconstruction required)",
    shortName: "Mohs defect",
    snomedCtCode: "254701007",
    snomedCtDisplay: "Defect of skin following Mohs surgery (finding)",
    specialty: "head_neck",
    subcategory: "Skin Cancer",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: ["Mohs", "Mohs defect", "post-Mohs", "Mohs reconstruction"],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_skin_mohs_defect",
        displayName: "Mohs defect reconstruction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_local_advancement",
        displayName: "Local advancement flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_local_bilobed",
        displayName: "Bilobed flap",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "hn_reg_paramedian_forehead",
        displayName: "Paramedian forehead flap",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 8,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FACIAL FRACTURES — Highly deterministic
// ═══════════════════════════════════════════════════════════════════════════════

const HN_DX_FACIAL_FRACTURES: DiagnosisPicklistEntry[] = [
  {
    id: "hn_dx_fx_mandible",
    displayName: "Mandible fracture",
    shortName: "Mandible #",
    snomedCtCode: "263177004",
    snomedCtDisplay: "Fracture of mandible (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Fractures",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "mandible fracture",
      "jaw fracture",
      "angle fracture",
      "condylar fracture",
      "parasymphysis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fx_mandible_orif",
        displayName: "Mandible ORIF",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_fx_mandible_imf",
        displayName: "Mandible IMF / closed reduction",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "hn_dx_fx_zygoma",
    displayName: "Zygoma fracture",
    shortName: "Zygoma #",
    snomedCtCode: "263176008",
    snomedCtDisplay: "Fracture of zygoma (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Fractures",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "zygoma",
      "zygomatic",
      "malar",
      "cheekbone",
      "ZMC",
      "tripod fracture",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fx_zygoma_orif",
        displayName: "Zygoma ORIF",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_fx_zygoma_gillies",
        displayName: "Zygoma reduction (Gillies approach)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "hn_dx_fx_orbital_floor",
    displayName: "Orbital floor fracture",
    shortName: "Orbital floor #",
    snomedCtCode: "359817006",
    snomedCtDisplay: "Fracture of orbital floor (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Fractures",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "orbital blowout",
      "blowout fracture",
      "orbit fracture",
      "diplopia",
      "enophthalmos",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fx_orbital_floor",
        displayName: "Orbital floor repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "hn_dx_fx_nasal",
    displayName: "Nasal fracture",
    shortName: "Nasal #",
    snomedCtCode: "81400005",
    snomedCtDisplay: "Fracture of nasal bone (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Fractures",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "nasal fracture",
      "broken nose",
      "nasal bone",
      "septal fracture",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fx_nasal",
        displayName: "Nasal fracture reduction (MUA)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "hn_dx_fx_lefort",
    displayName: "Le Fort fracture (I / II / III)",
    shortName: "Le Fort #",
    snomedCtCode: "263175007",
    snomedCtDisplay: "Le Fort fracture (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Fractures",
    clinicalGroup: "trauma",
    hasStaging: true, // Le Fort classification in staging config
    searchSynonyms: [
      "Le Fort",
      "LeFort",
      "midface fracture",
      "maxillary fracture",
      "Le Fort I",
      "Le Fort II",
      "Le Fort III",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fx_lefort",
        displayName: "Le Fort fracture ORIF",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "hn_dx_fx_frontal_sinus",
    displayName: "Frontal sinus fracture",
    shortName: "Frontal sinus #",
    snomedCtCode: "263174006",
    snomedCtDisplay: "Fracture of frontal bone (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Fractures",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "frontal bone",
      "frontal sinus",
      "anterior table",
      "posterior table",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fx_frontal_sinus",
        displayName: "Frontal sinus fracture repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "hn_dx_fx_noe",
    displayName: "Naso-orbito-ethmoidal (NOE) fracture",
    shortName: "NOE #",
    snomedCtCode: "263176008",
    snomedCtDisplay: "Fracture of naso-ethmoidal complex (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Fractures",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "NOE",
      "naso-orbito-ethmoidal",
      "naso-ethmoid",
      "telecanthus",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fx_noe",
        displayName: "NOE fracture repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 7,
  },
  {
    id: "hn_dx_fx_panfacial",
    displayName: "Panfacial fracture",
    shortName: "Panfacial #",
    snomedCtCode: "263175007",
    snomedCtDisplay: "Panfacial fracture (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Fractures",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "panfacial",
      "multiple facial fractures",
      "complex facial trauma",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fx_panfacial",
        displayName: "Panfacial fracture repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 8,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CLEFT / CRANIOFACIAL — Deterministic
// ═══════════════════════════════════════════════════════════════════════════════

const HN_DX_CLEFT_CRANIOFACIAL: DiagnosisPicklistEntry[] = [
  {
    id: "hn_dx_cleft_lip_unilateral",
    displayName: "Cleft lip — unilateral",
    shortName: "Unilateral cleft lip",
    snomedCtCode: "80281008",
    snomedCtDisplay: "Unilateral cleft lip (disorder)",
    specialty: "head_neck",
    subcategory: "Cleft / Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "unilateral cleft",
      "cleft lip",
      "CL",
      "lip cleft",
      "Millard",
      "Mohler",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_cleft_lip_unilateral",
        displayName: "Unilateral cleft lip repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "hn_dx_cleft_lip_bilateral",
    displayName: "Cleft lip — bilateral",
    shortName: "Bilateral cleft lip",
    snomedCtCode: "87979003",
    snomedCtDisplay: "Bilateral cleft lip (disorder)",
    specialty: "head_neck",
    subcategory: "Cleft / Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: ["bilateral cleft", "BCL", "bilateral CLP"],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_cleft_lip_bilateral",
        displayName: "Bilateral cleft lip repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "hn_dx_cleft_palate",
    displayName: "Cleft palate",
    shortName: "Cleft palate",
    snomedCtCode: "87979003",
    snomedCtDisplay: "Cleft palate (disorder)",
    specialty: "head_neck",
    subcategory: "Cleft / Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "palate cleft",
      "CP",
      "palatoplasty",
      "Veau",
      "Furlow",
      "von Langenbeck",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_cleft_palate",
        displayName: "Cleft palate repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_cleft_velopharyngeal_insufficiency",
        displayName: "VPI surgery (secondary)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "hn_dx_alveolar_cleft",
    displayName: "Alveolar cleft",
    shortName: "Alveolar cleft",
    snomedCtCode: "87979003",
    snomedCtDisplay: "Alveolar cleft (disorder)",
    specialty: "head_neck",
    subcategory: "Cleft / Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "alveolar bone graft",
      "ABG",
      "secondary bone graft",
      "alveolar cleft",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_cleft_alveolar_bone_graft",
        displayName: "Alveolar bone graft",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FACIAL NERVE / HEAD & NECK ONCOLOGY / OTHER
// Procedure suggestions are intentionally LOOSE — too many variables.
// ═══════════════════════════════════════════════════════════════════════════════

const HN_DX_NERVE_ONCO_OTHER: DiagnosisPicklistEntry[] = [
  {
    id: "hn_dx_facial_nerve_acute",
    displayName: "Facial nerve palsy — acute / traumatic",
    shortName: "Facial nerve palsy (acute)",
    snomedCtCode: "280816001",
    snomedCtDisplay: "Facial nerve palsy (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Nerve & Other",
    clinicalGroup: "trauma",
    hasStaging: true, // House-Brackmann in staging config
    searchSynonyms: [
      "facial nerve injury",
      "Bell's palsy",
      "facial palsy",
      "VII nerve",
      "House-Brackmann",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fn_primary_repair",
        displayName: "Facial nerve primary repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_fn_cable_graft",
        displayName: "Facial nerve cable graft",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "hn_dx_facial_nerve_chronic",
    displayName: "Facial nerve palsy — chronic / established",
    shortName: "Facial nerve palsy (chronic)",
    snomedCtCode: "280816001",
    snomedCtDisplay: "Chronic facial nerve palsy (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Nerve & Other",
    clinicalGroup: "reconstructive",
    hasStaging: true, // House-Brackmann in staging config
    searchSynonyms: [
      "chronic facial palsy",
      "facial reanimation",
      "smile surgery",
      "longstanding palsy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_fn_masseteric_transfer",
        displayName: "Masseteric-facial nerve transfer",
        isDefault: false,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_fn_free_gracilis",
        displayName: "Free gracilis transfer (facial reanimation)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_fn_cross_face",
        displayName: "Cross-face nerve graft",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "hn_fn_static_sling",
        displayName: "Static facial sling",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "hn_fn_gold_weight",
        displayName: "Gold weight / lid loading",
        isDefault: false,
        sortOrder: 5,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "hn_dx_oral_cavity_scc",
    displayName: "Oral cavity SCC (tongue / floor / buccal)",
    shortName: "Oral SCC",
    snomedCtCode: "363505006",
    snomedCtDisplay: "Malignant neoplasm of oral cavity (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Nerve & Other",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "oral cancer",
      "tongue cancer",
      "floor of mouth",
      "buccal SCC",
      "oral SCC",
      "intraoral",
    ],
    suggestedProcedures: [
      // Suggestions loose — actual procedure depends on site/size/neck status
      {
        procedurePicklistId: "hn_other_neck_dissection",
        displayName: "Neck dissection",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_recon_oral_tongue_floor",
        displayName: "Oral / tongue / floor of mouth reconstruction",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_recon_mandible",
        displayName: "Mandible reconstruction",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "orth_ff_rfff",
        displayName: "Free RFFF (radial forearm free flap)",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "orth_ff_fibula",
        displayName: "Free fibula flap (osteocutaneous)",
        isDefault: false,
        sortOrder: 5,
      },
      {
        procedurePicklistId: "orth_ff_alt",
        displayName: "Free ALT flap",
        isDefault: false,
        sortOrder: 6,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "hn_dx_parotid_tumour",
    displayName: "Parotid tumour",
    shortName: "Parotid tumour",
    snomedCtCode: "126667008",
    snomedCtDisplay: "Neoplasm of parotid gland (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Nerve & Other",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "parotid",
      "salivary gland tumour",
      "pleomorphic adenoma",
      "Warthin",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_other_parotidectomy",
        displayName: "Parotidectomy",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "hn_dx_microtia",
    displayName: "Microtia / anotia",
    shortName: "Microtia",
    snomedCtCode: "35541004",
    snomedCtDisplay: "Microtia (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Nerve & Other",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "microtia",
      "anotia",
      "ear reconstruction",
      "rib cartilage",
      "Medpor",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_recon_ear_total",
        displayName: "Total ear reconstruction (autologous)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_recon_ear_prosthetic",
        displayName: "Ear reconstruction — prosthetic (BAHA/Medpor)",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
];

const HN_DX_FACIAL_SOFT_TISSUE_TRAUMA: DiagnosisPicklistEntry[] = [
  {
    id: "hn_dx_facial_lac",
    displayName: "Facial laceration",
    shortName: "Facial lac",
    snomedCtCode: "284009009",
    snomedCtDisplay: "Laceration of face (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "facial laceration",
      "face cut",
      "forehead laceration",
      "cheek laceration",
      "chin laceration",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_trauma_facial_lac_simple",
        displayName: "Facial laceration repair — simple",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_trauma_facial_lac_complex",
        displayName: "Facial laceration repair — complex / layered",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_trauma_facial_wound_exploration",
        displayName: "Facial wound exploration + debridement",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "hn_dx_nasal_lac",
    displayName: "Nasal laceration",
    shortName: "Nasal lac",
    snomedCtCode: "283682007",
    snomedCtDisplay: "Laceration of nose (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "nose laceration",
      "nose cut",
      "nasal wound",
      "nose injury",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_trauma_nasal_lac",
        displayName: "Nasal laceration repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_trauma_facial_lac_complex",
        displayName: "Facial laceration repair — complex / layered",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "hn_dx_lip_lac",
    displayName: "Lip laceration",
    shortName: "Lip lac",
    snomedCtCode: "283679001",
    snomedCtDisplay: "Laceration of lip (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "lip laceration",
      "lip cut",
      "vermilion border",
      "lip injury",
      "through-and-through lip",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_trauma_lip_lac",
        displayName: "Lip laceration repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_trauma_facial_lac_complex",
        displayName: "Facial laceration repair — complex / layered",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "hn_dx_eyelid_lac",
    displayName: "Eyelid / periorbital laceration",
    shortName: "Eyelid lac",
    snomedCtCode: "284003008",
    snomedCtDisplay: "Laceration of eyelid (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "eyelid laceration",
      "periorbital laceration",
      "canalicular",
      "lid margin",
      "eyelid cut",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_trauma_eyelid_lac",
        displayName: "Eyelid / periorbital laceration repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "hn_dx_ear_lac",
    displayName: "Ear laceration ± cartilage involvement",
    shortName: "Ear lac",
    snomedCtCode: "283545005",
    snomedCtDisplay: "Laceration of ear (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "ear laceration",
      "pinna laceration",
      "auricular laceration",
      "ear cartilage",
      "ear avulsion",
      "through-and-through ear",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_trauma_ear_lac",
        displayName: "Ear laceration repair ± cartilage",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_trauma_facial_lac_complex",
        displayName: "Facial laceration repair — complex / layered",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "hn_dx_scalp_lac",
    displayName: "Scalp laceration",
    shortName: "Scalp lac",
    snomedCtCode: "262560009",
    snomedCtDisplay: "Laceration of scalp (disorder)",
    specialty: "head_neck",
    subcategory: "Facial Soft Tissue Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "scalp laceration",
      "scalp wound",
      "head laceration",
      "head cut",
      "scalp injury",
      "scalp staples",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hn_trauma_scalp_lac",
        displayName: "Scalp laceration repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_trauma_facial_lac_complex",
        displayName: "Facial laceration repair — complex / layered",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hn_trauma_facial_wound_exploration",
        displayName: "Facial wound exploration + debridement",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const HEAD_NECK_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...HN_DX_SKIN_CANCER,
  ...HN_DX_FACIAL_FRACTURES,
  ...HN_DX_FACIAL_SOFT_TISSUE_TRAUMA,
  ...HN_DX_CLEFT_CRANIOFACIAL,
  ...HN_DX_NERVE_ONCO_OTHER,
];

/** Get H&N diagnoses grouped by subcategory */
export function getHeadNeckSubcategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dx of HEAD_NECK_DIAGNOSES) {
    if (!seen.has(dx.subcategory)) {
      seen.add(dx.subcategory);
      result.push(dx.subcategory);
    }
  }
  return result;
}

/** Get H&N diagnoses for a specific subcategory */
export function getHeadNeckDiagnosesForSubcategory(
  subcategory: string,
): DiagnosisPicklistEntry[] {
  return HEAD_NECK_DIAGNOSES.filter((dx) => dx.subcategory === subcategory);
}
