/**
 * Procedure Picklist — Layer 1 of the three-layer terminology architecture
 *
 * Each entry maps surgeon-colloquial display names to canonical SNOMED CT
 * concept IDs. SNOMED codes marked // VERIFY should be confirmed in
 * https://browser.ihtsdotools.org/ before production use.
 *
 * Specialties sharing procedures (e.g. skin grafting) use a single entry
 * tagged to multiple specialties — context comes from case metadata,
 * not duplicate entries.
 */

import type { Specialty, ProcedureTag, FreeFlap } from "@/types/case";

export interface ProcedurePicklistEntry {
  id: string;
  displayName: string;
  snomedCtCode: string;
  snomedCtDisplay: string;
  specialties: Specialty[];
  subcategory: string;
  tags: ProcedureTag[];
  hasFreeFlap?: boolean;
  /** Triggers the SLNB basin detail form in ProcedureClinicalDetails */
  hasSlnb?: boolean;
  sortOrder: number;
}

export const PICKLIST_TO_FLAP_TYPE: Partial<Record<string, FreeFlap>> = {
  orth_ff_alt: "alt",
  orth_ff_gracilis: "gracilis",
  orth_ff_tug: "tug",
  orth_ff_rfff: "radial_forearm",
  orth_ff_fibula: "fibula",
  orth_ff_ld: "latissimus_dorsi",
  orth_ff_msap: "medial_sural",
  orth_ff_tdap: "tdap",
  orth_ff_pap: "pap",
  orth_ff_scapular: "scapular",
  orth_ff_parascapular: "parascapular",
  orth_ff_serratus: "serratus_anterior",
  orth_ff_scip: "scip",
  breast_recon_diep: "diep",
  breast_recon_sgap: "sgap",
  breast_recon_igap: "igap",
  breast_recon_siea: "siea",
  breast_recon_scip: "scip",
  hn_fn_free_gracilis: "gracilis",
};

// ═══════════════════════════════════════════════════════════════════════════
// ORTHOPLASTIC (~45 procedures)
// ═══════════════════════════════════════════════════════════════════════════

const ORTHOPLASTIC_FREE_FLAP: ProcedurePicklistEntry[] = [
  {
    id: "orth_ff_alt",
    displayName: "Free ALT flap",
    snomedCtCode: "234298008",
    snomedCtDisplay: "Anterolateral thigh free flap (procedure)",
    specialties: ["orthoplastic", "head_neck", "general"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 1,
  },
  {
    id: "orth_ff_gracilis",
    displayName: "Free Gracilis flap",
    snomedCtCode: "234297004",
    snomedCtDisplay: "Free gracilis flap (procedure)",
    specialties: ["orthoplastic", "head_neck", "general"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 2,
  },
  {
    id: "orth_ff_tug",
    displayName: "TUG flap (Transverse Upper Gracilis)",
    snomedCtCode: "234297004",
    snomedCtDisplay: "Free gracilis flap (procedure)",
    specialties: ["orthoplastic", "breast"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 3,
  },
  {
    id: "orth_ff_rfff",
    displayName: "Free Radial Forearm Flap (RFFF)",
    snomedCtCode: "234295007",
    snomedCtDisplay: "Free radial forearm flap (procedure)",
    specialties: ["orthoplastic", "head_neck", "general"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 4,
  },
  {
    id: "orth_ff_fibula",
    displayName: "Free Fibula osteocutaneous flap",
    snomedCtCode: "234289000",
    snomedCtDisplay: "Free fibula flap (procedure)",
    specialties: ["orthoplastic", "head_neck"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 5,
  },
  {
    id: "orth_ff_ld",
    displayName: "Free Latissimus Dorsi (LD) flap",
    snomedCtCode: "234296008",
    snomedCtDisplay: "Free latissimus dorsi flap (procedure)",
    specialties: ["orthoplastic", "head_neck", "breast"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 6,
  },
  {
    id: "orth_ff_msap",
    displayName: "Free MSAP flap (Medial Sural Artery Perforator)",
    snomedCtCode: "234306008",
    snomedCtDisplay: "Free medial sural artery perforator flap (procedure)",
    specialties: ["orthoplastic", "head_neck"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 7,
  },
  {
    id: "orth_ff_tdap",
    displayName: "Free TDAP flap (Thoracodorsal Artery Perforator)",
    snomedCtCode: "234307004",
    snomedCtDisplay: "Free thoracodorsal artery perforator flap (procedure)",
    specialties: ["orthoplastic", "head_neck"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 8,
  },
  {
    id: "orth_ff_pap",
    displayName: "Free PAP flap (Profunda Artery Perforator)",
    snomedCtCode: "234308009",
    snomedCtDisplay: "Free profunda artery perforator flap (procedure)",
    specialties: ["orthoplastic", "breast"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 9,
  },
  {
    id: "orth_ff_scapular",
    displayName: "Free Scapular flap",
    snomedCtCode: "234303000",
    snomedCtDisplay: "Free scapular flap (procedure)",
    specialties: ["orthoplastic", "head_neck"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 10,
  },
  {
    id: "orth_ff_parascapular",
    displayName: "Free Parascapular flap",
    snomedCtCode: "234304006",
    snomedCtDisplay: "Free parascapular flap (procedure)",
    specialties: ["orthoplastic", "head_neck"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 11,
  },
  {
    id: "orth_ff_serratus",
    displayName: "Free Serratus Anterior flap",
    snomedCtCode: "234305007",
    snomedCtDisplay: "Free serratus anterior flap (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 12,
  },
  {
    id: "orth_ff_scip",
    displayName: "Free SCIP flap (Superficial Circumflex Iliac Perforator)",
    snomedCtCode: "234299000",
    snomedCtDisplay:
      "Free superficial circumflex iliac artery flap (procedure)",
    specialties: ["orthoplastic", "head_neck"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 13,
  },
  {
    id: "orth_ff_other",
    displayName: "Free flap — other (specify in notes)",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic", "head_neck", "general"],
    subcategory: "Free Flap Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 14,
  },
];

const ORTHOPLASTIC_PEDICLED_FLAP: ProcedurePicklistEntry[] = [
  {
    id: "orth_ped_gastrocnemius_medial",
    displayName: "Pedicled Gastrocnemius flap — medial head",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Pedicled Flap Coverage",
    tags: ["pedicled_flap"],
    sortOrder: 1,
  },
  {
    id: "orth_ped_gastrocnemius_lateral",
    displayName: "Pedicled Gastrocnemius flap — lateral head",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Pedicled Flap Coverage",
    tags: ["pedicled_flap"],
    sortOrder: 2,
  },
  {
    id: "orth_ped_soleus",
    displayName: "Pedicled Soleus flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Pedicled Flap Coverage",
    tags: ["pedicled_flap"],
    sortOrder: 3,
  },
  {
    id: "orth_ped_propeller",
    displayName: "Propeller perforator flap (pedicled)",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Pedicled Flap Coverage",
    tags: ["pedicled_flap"],
    sortOrder: 4,
  },
  {
    id: "orth_ped_reversed_sural",
    displayName: "Reversed sural artery flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Pedicled Flap Coverage",
    tags: ["pedicled_flap"],
    sortOrder: 5,
  },
  {
    id: "orth_ped_ld",
    displayName: "Pedicled Latissimus Dorsi flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Pedicled Flap Coverage",
    tags: ["pedicled_flap"],
    sortOrder: 6,
  },
  {
    id: "orth_ped_vy_fasciocutaneous",
    displayName: "V-Y fasciocutaneous advancement flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Pedicled Flap Coverage",
    tags: ["pedicled_flap", "local_flap"],
    sortOrder: 7,
  },
  {
    id: "orth_ped_alt_pedicled",
    displayName: "Pedicled ALT flap (islanded)",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Pedicled Flap Coverage",
    tags: ["pedicled_flap"],
    sortOrder: 8,
  },
];

const ORTHOPLASTIC_LOCAL_FLAP: ProcedurePicklistEntry[] = [
  {
    id: "orth_local_rotation",
    displayName: "Rotation fasciocutaneous flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Local Flap Coverage",
    tags: ["local_flap"],
    sortOrder: 1,
  },
  {
    id: "orth_local_transposition",
    displayName: "Transposition fasciocutaneous flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Local Flap Coverage",
    tags: ["local_flap"],
    sortOrder: 2,
  },
  {
    id: "orth_local_bipedicle",
    displayName: "Bipedicle advancement flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Local Flap Coverage",
    tags: ["local_flap"],
    sortOrder: 3,
  },
];

const ORTHOPLASTIC_SKIN_GRAFT: ProcedurePicklistEntry[] = [
  {
    id: "orth_ssg_meshed",
    displayName: "Split-thickness skin graft (STSG) — meshed",
    snomedCtCode: "14413003",
    snomedCtDisplay: "Split-thickness skin graft (procedure)",
    specialties: ["orthoplastic", "burns", "general", "head_neck"],
    subcategory: "Skin Grafting",
    tags: ["skin_graft"],
    sortOrder: 1,
  },
  {
    id: "orth_ssg_sheet",
    displayName: "Split-thickness skin graft (STSG) — sheet",
    snomedCtCode: "14413003",
    snomedCtDisplay: "Split-thickness skin graft (procedure)",
    specialties: ["orthoplastic", "burns", "general", "head_neck"],
    subcategory: "Skin Grafting",
    tags: ["skin_graft"],
    sortOrder: 2,
  },
  {
    id: "orth_ftsg",
    displayName: "Full-thickness skin graft (FTSG)",
    snomedCtCode: "265336007",
    snomedCtDisplay: "Full-thickness skin graft (procedure)",
    specialties: ["orthoplastic", "general", "head_neck"],
    subcategory: "Skin Grafting",
    tags: ["skin_graft"],
    sortOrder: 3,
  },
  {
    id: "orth_dermal_substitute",
    displayName: "Dermal substitute ± STSG (staged reconstruction)",
    snomedCtCode: "14413003",
    snomedCtDisplay: "Split-thickness skin graft (procedure)",
    specialties: ["orthoplastic", "burns"],
    subcategory: "Skin Grafting",
    tags: ["skin_graft", "complex_wound"],
    sortOrder: 4,
  },
];

const ORTHOPLASTIC_WOUND: ProcedurePicklistEntry[] = [
  {
    id: "orth_debride_surgical",
    displayName: "Surgical debridement",
    snomedCtCode: "36777000",
    snomedCtDisplay: "Debridement (procedure)",
    specialties: ["orthoplastic", "burns", "general"],
    subcategory: "Wound Management",
    tags: ["complex_wound"],
    sortOrder: 1,
  },
  {
    id: "orth_npwt",
    displayName: "Negative pressure wound therapy (NPWT / VAC)",
    snomedCtCode: "229070002",
    snomedCtDisplay: "Negative pressure wound therapy (procedure)",
    specialties: ["orthoplastic", "burns", "general"],
    subcategory: "Wound Management",
    tags: ["complex_wound"],
    sortOrder: 2,
  },
  {
    id: "orth_washout",
    displayName: "Wound washout + debridement",
    snomedCtCode: "36777000",
    snomedCtDisplay: "Debridement (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Wound Management",
    tags: ["complex_wound"],
    sortOrder: 3,
  },
  {
    id: "orth_sequestrectomy",
    displayName: "Sequestrectomy (bone debridement)",
    snomedCtCode: "87085001",
    snomedCtDisplay: "Sequestrectomy (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Wound Management",
    tags: ["complex_wound"],
    sortOrder: 4,
  },
  {
    id: "orth_wound_closure_delayed",
    displayName: "Delayed primary wound closure",
    snomedCtCode: "36777000",
    snomedCtDisplay: "Debridement (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Wound Management",
    tags: ["complex_wound"],
    sortOrder: 5,
  },
];

const ORTHOPLASTIC_LIMB_SALVAGE: ProcedurePicklistEntry[] = [
  {
    id: "orth_acute_reconstruction_gustilo_iiib",
    displayName: "Acute orthoplastic reconstruction — Gustilo IIIb/IIIc",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Limb Salvage",
    tags: ["free_flap", "microsurgery", "trauma", "complex_wound"],
    hasFreeFlap: true,
    sortOrder: 1,
  },
  {
    id: "orth_bka",
    displayName: "Below-knee amputation (BKA)",
    snomedCtCode: "84367004",
    snomedCtDisplay: "Amputation below knee (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Limb Salvage",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "orth_aka",
    displayName: "Above-knee amputation (AKA)",
    snomedCtCode: "13771000",
    snomedCtDisplay: "Amputation above knee (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Limb Salvage",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "orth_ray_amputation",
    displayName: "Ray amputation",
    snomedCtCode: "71906001",
    snomedCtDisplay: "Ray amputation of finger (procedure)",
    specialties: ["orthoplastic", "hand_wrist"],
    subcategory: "Limb Salvage",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "orth_stump_revision",
    displayName: "Amputation stump revision",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic"],
    subcategory: "Limb Salvage",
    tags: ["revision"],
    sortOrder: 5,
  },
];

const ORTHOPLASTIC_COMPLEX_RECONSTRUCTION: ProcedurePicklistEntry[] = [
  {
    id: "orth_pressure_sore_flap",
    displayName: "Pressure sore flap reconstruction",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Complex Reconstruction",
    tags: ["pedicled_flap", "complex_wound"],
    sortOrder: 1,
  },
  {
    id: "orth_perineal_reconstruction",
    displayName: "Perineal / pelvic reconstruction",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Complex Reconstruction",
    tags: ["free_flap", "pedicled_flap", "complex_wound"],
    sortOrder: 2,
  },
  {
    id: "orth_chest_wall_reconstruction",
    displayName: "Chest wall reconstruction",
    snomedCtCode: "234254005",
    snomedCtDisplay: "Reconstruction of chest wall (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Complex Reconstruction",
    tags: ["pedicled_flap", "complex_wound"],
    sortOrder: 3,
  },
  {
    id: "orth_abdominal_wall_reconstruction",
    displayName: "Abdominal wall reconstruction",
    snomedCtCode: "234256007",
    snomedCtDisplay: "Reconstruction of abdominal wall (procedure)",
    specialties: ["orthoplastic", "general"],
    subcategory: "Complex Reconstruction",
    tags: ["pedicled_flap", "complex_wound"],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HAND SURGERY (~100 procedures across 9 subcategories)
// ═══════════════════════════════════════════════════════════════════════════

const HAND_FRACTURE_FIXATION: ProcedurePicklistEntry[] = [
  {
    id: "hand_fx_distal_radius_orif",
    displayName: "Distal radius ORIF (volar plate)",
    snomedCtCode: "73994004",
    snomedCtDisplay:
      "Open reduction of fracture of radius with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "hand_fx_distal_radius_crif",
    displayName: "Distal radius CRIF (K-wires)",
    snomedCtCode: "179097006",
    snomedCtDisplay:
      "Closed reduction of fracture of radius with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "hand_fx_distal_radius_exfix",
    displayName: "Distal radius external fixation",
    snomedCtCode: "302191005", // VERIFY
    snomedCtDisplay: "Application of external fixator to radius (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "hand_fx_metacarpal_orif",
    displayName: "Metacarpal fracture ORIF",
    snomedCtCode: "263135001", // VERIFY
    snomedCtDisplay:
      "Open reduction of fracture of metacarpal with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "hand_fx_metacarpal_crif",
    displayName: "Metacarpal fracture CRIF (K-wires)",
    snomedCtCode: "263136000", // VERIFY
    snomedCtDisplay:
      "Closed reduction of fracture of metacarpal with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "hand_fx_phalanx_orif",
    displayName: "Phalangeal fracture ORIF",
    snomedCtCode: "15257006",
    snomedCtDisplay:
      "Open reduction of fracture of phalanx with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 6,
  },
  {
    id: "hand_fx_phalanx_crif",
    displayName: "Phalangeal fracture CRIF (K-wires)",
    snomedCtCode: "179097006",
    snomedCtDisplay:
      "Closed reduction of fracture with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 7,
  },
  {
    id: "hand_fx_scaphoid_orif",
    displayName: "Scaphoid fracture ORIF (headless screw)",
    snomedCtCode: "41585002",
    snomedCtDisplay:
      "Open reduction of fracture of carpal bone with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 8,
  },
  {
    id: "hand_fx_scaphoid_percutaneous",
    displayName: "Scaphoid fracture percutaneous fixation",
    snomedCtCode: "41585002", // VERIFY
    snomedCtDisplay: "Fixation of fracture of carpal bone (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 9,
  },
  {
    id: "hand_fx_bennett",
    displayName: "Bennett's fracture fixation",
    snomedCtCode: "263135001", // VERIFY — metacarpal parent
    snomedCtDisplay: "Fixation of fracture of first metacarpal (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 10,
  },
  {
    id: "hand_fx_rolando",
    displayName: "Rolando's fracture fixation",
    snomedCtCode: "263135001", // VERIFY
    snomedCtDisplay: "Fixation of fracture of first metacarpal (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 11,
  },
  {
    id: "hand_fx_carpal_other",
    displayName: "Carpal fracture fixation — other",
    snomedCtCode: "41585002",
    snomedCtDisplay:
      "Open reduction of fracture of carpal bone with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 12,
  },
  {
    id: "hand_fx_phalanx_crif_ccs",
    displayName: "Phalangeal fracture CRIF (headless compression screw)",
    snomedCtCode: "VERIFY",
    snomedCtDisplay:
      "Closed reduction of fracture of phalanx with internal fixation using compression screw (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 8,
  },
  {
    id: "hand_fx_phalanx_exfix",
    displayName: "Phalangeal fracture external fixation",
    snomedCtCode: "VERIFY",
    snomedCtDisplay: "Application of external fixation to phalanx (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 9,
  },
  {
    id: "hand_fx_metacarpal_crif_ccs",
    displayName: "Metacarpal fracture CRIF (headless compression screw)",
    snomedCtCode: "VERIFY",
    snomedCtDisplay:
      "Closed reduction of fracture of metacarpal with internal fixation using compression screw (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 10,
  },
  {
    id: "hand_fx_metacarpal_exfix",
    displayName: "Metacarpal fracture external fixation",
    snomedCtCode: "VERIFY",
    snomedCtDisplay:
      "Application of external fixation to metacarpal (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 11,
  },
  {
    id: "hand_fx_carpal_orif",
    displayName: "Carpal fracture ORIF",
    snomedCtCode: "VERIFY",
    snomedCtDisplay:
      "Open reduction of fracture of carpal bone with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 12,
  },
  {
    id: "hand_fx_carpal_crif",
    displayName: "Carpal fracture CRIF (K-wires)",
    snomedCtCode: "VERIFY",
    snomedCtDisplay:
      "Closed reduction of fracture of carpal bone with internal fixation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["trauma"],
    sortOrder: 13,
  },
  {
    id: "hand_fx_corrective_osteotomy",
    displayName: "Corrective osteotomy (malunion)",
    snomedCtCode: "178728004", // VERIFY
    snomedCtDisplay: "Corrective osteotomy of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["revision"],
    sortOrder: 13,
  },
  {
    id: "hand_fx_scaphoid_nonunion_graft",
    displayName: "Scaphoid non-union bone graft",
    snomedCtCode: "41585002", // VERIFY
    snomedCtDisplay: "Bone graft to scaphoid (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Fracture & Joint Fixation",
    tags: ["revision"],
    sortOrder: 14,
  },
];

const HAND_TENDON_SURGERY: ProcedurePicklistEntry[] = [
  {
    id: "hand_tend_flexor_primary",
    displayName: "Flexor tendon primary repair",
    snomedCtCode: "41727003",
    snomedCtDisplay: "Repair of tendon of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair", "trauma"],
    sortOrder: 1,
  },
  {
    id: "hand_tend_flexor_delayed",
    displayName: "Flexor tendon delayed primary repair",
    snomedCtCode: "41727003",
    snomedCtDisplay: "Repair of tendon of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair", "trauma"],
    sortOrder: 2,
  },
  {
    id: "hand_tend_flexor_graft",
    displayName: "Flexor tendon graft (staged or single-stage)",
    snomedCtCode: "53363003", // VERIFY
    snomedCtDisplay: "Tendon graft to hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair"],
    sortOrder: 3,
  },
  {
    id: "hand_tend_extensor_primary",
    displayName: "Extensor tendon primary repair",
    snomedCtCode: "41727003",
    snomedCtDisplay: "Repair of tendon of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair", "trauma"],
    sortOrder: 4,
  },
  {
    id: "hand_tend_extensor_central_slip",
    displayName: "Central slip reconstruction",
    snomedCtCode: "41727003", // VERIFY
    snomedCtDisplay:
      "Reconstruction of extensor mechanism of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair"],
    sortOrder: 5,
  },
  {
    id: "hand_tend_mallet_finger",
    displayName: "Mallet finger repair / splintage",
    snomedCtCode: "178730002",
    snomedCtDisplay: "Repair of mallet deformity (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair", "trauma"],
    sortOrder: 6,
  },
  {
    id: "hand_tend_boutonniere_reconstruction",
    displayName: "Boutonnière reconstruction",
    snomedCtCode: "41727003", // VERIFY
    snomedCtDisplay:
      "Reconstruction of extensor mechanism of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair"],
    sortOrder: 7,
  },
  {
    id: "hand_tend_swan_neck_correction",
    displayName: "Swan-neck deformity correction",
    snomedCtCode: "41727003", // VERIFY
    snomedCtDisplay: "Correction of swan-neck deformity (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair"],
    sortOrder: 8,
  },
  {
    id: "hand_tend_tendon_transfer",
    displayName: "Tendon transfer",
    snomedCtCode: "28778006",
    snomedCtDisplay: "Transfer of tendon of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair"],
    sortOrder: 9,
  },
  {
    id: "hand_tend_tenolysis",
    displayName: "Tenolysis (flexor or extensor)",
    snomedCtCode: "240360007", // VERIFY
    snomedCtDisplay: "Tenolysis of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair", "revision"],
    sortOrder: 10,
  },
  {
    id: "hand_tend_fpl_repair",
    displayName: "FPL tendon repair",
    snomedCtCode: "41727003",
    snomedCtDisplay: "Repair of tendon of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair", "trauma"],
    sortOrder: 11,
  },
  {
    id: "hand_tend_epl_rupture_repair",
    displayName: "EPL rupture — EIP transfer",
    snomedCtCode: "28778006",
    snomedCtDisplay: "Transfer of tendon of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["tendon_repair"],
    sortOrder: 12,
  },
  {
    id: "hand_tend_central_slip_repair",
    displayName: "Central slip repair (PIP extensor mechanism)",
    snomedCtCode: "122465003",
    snomedCtDisplay: "Repair of extensor tendon of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["trauma", "tendon_repair"],
    sortOrder: 13,
  },
  {
    id: "hand_tend_sagittal_band_repair",
    displayName: "Sagittal band repair (MCP extensor subluxation)",
    snomedCtCode: "122465003",
    snomedCtDisplay: "Repair of sagittal band (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["trauma", "tendon_repair"],
    sortOrder: 14,
  },
  {
    id: "hand_tend_fdp_avulsion_repair",
    displayName: "FDP avulsion repair (Jersey finger — Leddy-Packer)",
    snomedCtCode: "122465003",
    snomedCtDisplay: "Repair of flexor digitorum profundus tendon (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["trauma", "tendon_repair"],
    sortOrder: 15,
  },
  {
    id: "hand_tend_staged_reconstruction",
    displayName: "Staged flexor tendon reconstruction (Hunter rod)",
    snomedCtCode: "122465003",
    snomedCtDisplay: "Staged flexor tendon reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Tendon Surgery",
    tags: ["revision", "tendon_repair"],
    sortOrder: 16,
  },
];

const HAND_NERVE_SURGERY: ProcedurePicklistEntry[] = [
  {
    id: "hand_nerve_digital_repair",
    displayName: "Digital nerve repair",
    snomedCtCode: "69505002",
    snomedCtDisplay: "Repair of nerve of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Nerve Surgery",
    tags: ["nerve_repair", "microsurgery", "trauma"],
    sortOrder: 1,
  },
  {
    id: "hand_nerve_median_repair",
    displayName: "Median nerve repair",
    snomedCtCode: "44946003",
    snomedCtDisplay: "Repair of median nerve (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Nerve Surgery",
    tags: ["nerve_repair", "microsurgery", "trauma"],
    sortOrder: 2,
  },
  {
    id: "hand_nerve_ulnar_repair",
    displayName: "Ulnar nerve repair",
    snomedCtCode: "51825000",
    snomedCtDisplay: "Repair of ulnar nerve (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Nerve Surgery",
    tags: ["nerve_repair", "microsurgery", "trauma"],
    sortOrder: 3,
  },
  {
    id: "hand_nerve_radial_repair",
    displayName: "Radial nerve / PIN / SRN repair",
    snomedCtCode: "74561000",
    snomedCtDisplay: "Repair of radial nerve (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Nerve Surgery",
    tags: ["nerve_repair", "microsurgery", "trauma"],
    sortOrder: 4,
  },
  {
    id: "hand_nerve_graft",
    displayName: "Nerve graft",
    snomedCtCode: "7428004",
    snomedCtDisplay: "Nerve graft (procedure)",
    specialties: ["hand_wrist", "peripheral_nerve"],
    subcategory: "Nerve Surgery",
    tags: ["nerve_repair", "microsurgery"],
    sortOrder: 5,
  },
  {
    id: "hand_nerve_conduit",
    displayName: "Nerve conduit repair",
    snomedCtCode: "7428004", // VERIFY
    snomedCtDisplay: "Nerve conduit repair (procedure)",
    specialties: ["hand_wrist", "peripheral_nerve"],
    subcategory: "Nerve Surgery",
    tags: ["nerve_repair", "microsurgery"],
    sortOrder: 6,
  },
  {
    id: "hand_nerve_transfer",
    displayName: "Nerve transfer (distal)",
    snomedCtCode: "56625009", // VERIFY
    snomedCtDisplay: "Transfer of nerve (procedure)",
    specialties: ["hand_wrist", "peripheral_nerve"],
    subcategory: "Nerve Surgery",
    tags: ["nerve_repair", "microsurgery"],
    sortOrder: 7,
  },
  {
    id: "hand_nerve_neuroma_excision",
    displayName: "Neuroma excision ± TMR / RPNI",
    snomedCtCode: "81003001", // VERIFY
    snomedCtDisplay: "Excision of neuroma (procedure)",
    specialties: ["hand_wrist", "peripheral_nerve"],
    subcategory: "Nerve Surgery",
    tags: ["nerve_repair"],
    sortOrder: 8,
  },
];

const HAND_JOINT_PROCEDURES: ProcedurePicklistEntry[] = [
  {
    id: "hand_joint_trapeziectomy",
    displayName: "Trapeziectomy ± LRTI",
    snomedCtCode: "60645001",
    snomedCtDisplay: "Excision of trapezium (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "hand_joint_cmc1_prosthesis",
    displayName: "CMC1 joint prosthesis (e.g., Ivory / Touch / Maïa)",
    snomedCtCode: "74589006", // VERIFY
    snomedCtDisplay:
      "Arthroplasty of carpometacarpal joint of thumb (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "hand_joint_pip_arthroplasty",
    displayName: "PIP joint arthroplasty",
    snomedCtCode: "34380001", // VERIFY
    snomedCtDisplay:
      "Arthroplasty of proximal interphalangeal joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "hand_joint_mcp_arthroplasty",
    displayName: "MCP joint arthroplasty",
    snomedCtCode: "76916001", // VERIFY
    snomedCtDisplay: "Arthroplasty of metacarpophalangeal joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "hand_joint_dip_arthrodesis",
    displayName: "DIP joint arthrodesis",
    snomedCtCode: "42191004", // VERIFY
    snomedCtDisplay: "Arthrodesis of distal interphalangeal joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 5,
  },
  {
    id: "hand_joint_pip_arthrodesis",
    displayName: "PIP joint arthrodesis",
    snomedCtCode: "51459001", // VERIFY
    snomedCtDisplay:
      "Arthrodesis of proximal interphalangeal joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "hand_joint_wrist_arthrodesis",
    displayName: "Wrist arthrodesis (total or partial)",
    snomedCtCode: "45484004",
    snomedCtDisplay: "Arthrodesis of wrist (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 7,
  },
  {
    id: "hand_joint_wrist_arthroscopy_diag",
    displayName: "Wrist arthroscopy — diagnostic",
    snomedCtCode: "80372005",
    snomedCtDisplay: "Arthroscopy of wrist (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 8,
  },
  {
    id: "hand_joint_wrist_arthroscopy_ther",
    displayName: "Wrist arthroscopy — therapeutic (debridement / repair)",
    snomedCtCode: "80372005",
    snomedCtDisplay: "Arthroscopy of wrist (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 9,
  },
  {
    id: "hand_joint_tfcc_repair",
    displayName: "TFCC repair / debridement",
    snomedCtCode: "80372005", // VERIFY
    snomedCtDisplay: "Repair of triangular fibrocartilage complex (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["trauma", "elective"],
    sortOrder: 10,
  },
  {
    id: "hand_joint_prc",
    displayName: "Proximal row carpectomy",
    snomedCtCode: "15484003",
    snomedCtDisplay: "Proximal row carpectomy (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 11,
  },
  {
    id: "hand_joint_wrist_denervation",
    displayName: "Wrist denervation",
    snomedCtCode: "34508009", // VERIFY
    snomedCtDisplay: "Denervation of wrist joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 12,
  },
  {
    id: "hand_joint_sl_ligament_repair",
    displayName: "Scapholunate ligament repair / reconstruction",
    snomedCtCode: "80372005", // VERIFY
    snomedCtDisplay: "Repair of ligament of wrist (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["trauma", "elective"],
    sortOrder: 13,
  },
  {
    id: "hand_joint_mcp_collateral_repair",
    displayName: "MCP / UCL collateral ligament repair",
    snomedCtCode: "239227006", // VERIFY
    snomedCtDisplay:
      "Repair of collateral ligament of finger joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["trauma"],
    sortOrder: 14,
  },
  {
    id: "hand_joint_pip_collateral_repair",
    displayName: "PIP collateral ligament repair",
    snomedCtCode: "239227006",
    snomedCtDisplay:
      "Repair of collateral ligament of finger joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["trauma"],
    sortOrder: 15,
  },
  {
    id: "hand_joint_volar_plate_repair",
    displayName: "Volar plate repair (PIP)",
    snomedCtCode: "239227006",
    snomedCtDisplay:
      "Repair of volar plate of proximal interphalangeal joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["trauma"],
    sortOrder: 16,
  },
  {
    id: "hand_lig_ucl_repair",
    displayName: "UCL repair — thumb MCP (gamekeeper's / skier's thumb)",
    snomedCtCode: "239227006",
    snomedCtDisplay:
      "Repair of ulnar collateral ligament of thumb (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["trauma"],
    sortOrder: 17,
  },
  {
    id: "hand_lig_ucl_reconstruction",
    displayName: "UCL reconstruction — thumb MCP (chronic)",
    snomedCtCode: "239227006",
    snomedCtDisplay:
      "Reconstruction of ulnar collateral ligament of thumb (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Joint Procedures",
    tags: ["elective"],
    sortOrder: 18,
  },
];

const HAND_VASCULAR_PROCEDURES: ProcedurePicklistEntry[] = [
  {
    id: "hand_vasc_digital_artery_repair",
    displayName: "Digital artery repair",
    snomedCtCode: "3490005",
    snomedCtDisplay: "Repair of digital artery (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Vascular Repair",
    tags: ["microsurgery", "trauma"],
    sortOrder: 1,
  },
  {
    id: "hand_vasc_radial_artery_repair",
    displayName: "Radial artery repair",
    snomedCtCode: "27523000",
    snomedCtDisplay: "Repair of radial artery (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Vascular Repair",
    tags: ["microsurgery", "trauma"],
    sortOrder: 2,
  },
  {
    id: "hand_vasc_ulnar_artery_repair",
    displayName: "Ulnar artery repair",
    snomedCtCode: "74994001",
    snomedCtDisplay: "Repair of ulnar artery (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Vascular Repair",
    tags: ["microsurgery", "trauma"],
    sortOrder: 3,
  },
  {
    id: "hand_vasc_palmar_arch_repair",
    displayName: "Palmar arch repair",
    snomedCtCode: "3490005",
    snomedCtDisplay: "Repair of palmar arterial arch (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Vascular Repair",
    tags: ["microsurgery", "trauma"],
    sortOrder: 4,
  },
];

const HAND_COMPRESSION_NEUROPATHY: ProcedurePicklistEntry[] = [
  {
    id: "hand_comp_ctr_open",
    displayName: "Carpal tunnel release — open",
    snomedCtCode: "83579003",
    snomedCtDisplay: "Decompression of carpal tunnel (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Compression Neuropathies",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "hand_comp_ctr_endoscopic",
    displayName: "Carpal tunnel release — endoscopic",
    snomedCtCode: "83579003",
    snomedCtDisplay: "Decompression of carpal tunnel (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Compression Neuropathies",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "hand_comp_cubital_insitu",
    displayName: "Cubital tunnel decompression — in situ",
    snomedCtCode: "36048009",
    snomedCtDisplay: "Decompression of ulnar nerve at elbow (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Compression Neuropathies",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "hand_comp_cubital_transposition",
    displayName: "Cubital tunnel — anterior transposition",
    snomedCtCode: "3953006",
    snomedCtDisplay: "Anterior transposition of ulnar nerve (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Compression Neuropathies",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "hand_comp_dequervain",
    displayName: "De Quervain's release",
    snomedCtCode: "78617001",
    snomedCtDisplay: "Release of first dorsal compartment (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Compression Neuropathies",
    tags: ["elective"],
    sortOrder: 5,
  },
  {
    id: "hand_comp_trigger_finger",
    displayName: "Trigger finger release (A1 pulley)",
    snomedCtCode: "18268001",
    snomedCtDisplay: "Release of trigger finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Compression Neuropathies",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "hand_comp_trigger_thumb",
    displayName: "Trigger thumb release",
    snomedCtCode: "18268001",
    snomedCtDisplay: "Release of trigger finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Compression Neuropathies",
    tags: ["elective"],
    sortOrder: 7,
  },
  {
    id: "hand_comp_guyon",
    displayName: "Guyon's canal release",
    snomedCtCode: "36048009", // VERIFY
    snomedCtDisplay: "Decompression of ulnar nerve at wrist (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Compression Neuropathies",
    tags: ["elective"],
    sortOrder: 8,
  },
];

const HAND_DUPUYTREN: ProcedurePicklistEntry[] = [
  {
    id: "hand_dup_limited_fasciectomy",
    displayName: "Dupuytren's limited fasciectomy",
    snomedCtCode: "43107005",
    snomedCtDisplay: "Fasciectomy of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dupuytren's Disease",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "hand_dup_radical_fasciectomy",
    displayName: "Dupuytren's radical fasciectomy",
    snomedCtCode: "43107005",
    snomedCtDisplay: "Fasciectomy of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dupuytren's Disease",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "hand_dup_needle_fasciotomy",
    displayName: "Needle aponeurotomy / fasciotomy",
    snomedCtCode: "446701009", // VERIFY
    snomedCtDisplay:
      "Percutaneous needle fasciotomy for Dupuytren contracture (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dupuytren's Disease",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "hand_dup_dermofasciectomy",
    displayName: "Dermofasciectomy + FTSG",
    snomedCtCode: "43107005", // VERIFY
    snomedCtDisplay: "Dermofasciectomy of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dupuytren's Disease",
    tags: ["elective", "skin_graft"],
    sortOrder: 4,
  },
  {
    id: "hand_dup_collagenase",
    displayName: "Collagenase injection (Xiapex)",
    snomedCtCode: "450509001", // VERIFY
    snomedCtDisplay: "Injection of collagenase into palmar fascia (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dupuytren's Disease",
    tags: ["elective"],
    sortOrder: 5,
  },
];

const HAND_SOFT_TISSUE_COVERAGE: ProcedurePicklistEntry[] = [
  {
    id: "hand_cov_cross_finger",
    displayName: "Cross-finger flap",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["local_flap", "trauma"],
    sortOrder: 1,
  },
  {
    id: "hand_cov_moberg",
    displayName: "Moberg advancement flap",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["local_flap", "trauma"],
    sortOrder: 2,
  },
  {
    id: "hand_cov_vy_advancement",
    displayName: "V-Y advancement flap (fingertip)",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["local_flap", "trauma"],
    sortOrder: 3,
  },
  {
    id: "hand_cov_homodigital_island",
    displayName: "Homodigital island flap",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["local_flap", "trauma"],
    sortOrder: 4,
  },
  {
    id: "hand_cov_fdma_foucher",
    displayName: "First dorsal metacarpal artery flap (Foucher)",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["pedicled_flap", "trauma"],
    sortOrder: 5,
  },
  {
    id: "hand_cov_reverse_radial_forearm",
    displayName: "Reverse radial forearm flap (pedicled)",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["pedicled_flap", "trauma"],
    sortOrder: 6,
  },
  {
    id: "hand_cov_posterior_interosseous",
    displayName: "Posterior interosseous artery flap",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["pedicled_flap", "trauma"],
    sortOrder: 7,
  },
  {
    id: "hand_cov_groin_flap",
    displayName: "Groin flap (pedicled, staged)",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["pedicled_flap", "trauma"],
    sortOrder: 8,
  },
  {
    id: "hand_cov_free_flap",
    displayName: "Free flap to hand (specify type in notes)",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["free_flap", "microsurgery", "trauma"],
    hasFreeFlap: true,
    sortOrder: 9,
  },
  {
    id: "hand_cov_skin_graft",
    displayName: "Skin graft to hand (STSG / FTSG)",
    snomedCtCode: "14413003",
    snomedCtDisplay: "Skin graft to hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["skin_graft", "trauma"],
    sortOrder: 10,
  },
  {
    id: "hand_cov_nail_bed_repair",
    displayName: "Nail bed repair",
    snomedCtCode: "7131001", // VERIFY
    snomedCtDisplay: "Repair of nail bed (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["trauma"],
    sortOrder: 11,
  },
  {
    id: "hand_cov_replantation",
    displayName: "Digital replantation",
    snomedCtCode: "46989001",
    snomedCtDisplay: "Replantation of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["replant", "microsurgery", "trauma"],
    sortOrder: 12,
  },
  {
    id: "hand_cov_revascularisation",
    displayName: "Digital revascularisation",
    snomedCtCode: "46989001", // VERIFY
    snomedCtDisplay: "Revascularisation of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["microsurgery", "trauma"],
    sortOrder: 13,
  },
  {
    id: "hand_cov_toe_to_thumb",
    displayName: "Toe-to-thumb transfer",
    snomedCtCode: "31946009",
    snomedCtDisplay: "Toe-to-thumb transfer (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 14,
  },
  {
    id: "hand_cov_pollicisation",
    displayName: "Pollicisation",
    snomedCtCode: "22169001",
    snomedCtDisplay: "Pollicisation of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Soft Tissue Coverage",
    tags: ["elective"],
    sortOrder: 15,
  },
];

const HAND_DISLOCATION_MANAGEMENT: ProcedurePicklistEntry[] = [
  {
    id: "hand_disloc_pip_cr",
    displayName: "PIP joint closed reduction + splinting",
    snomedCtCode: "44806002",
    snomedCtDisplay: "Closed reduction of dislocation of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "hand_disloc_pip_extension_block_kwire",
    displayName: "Extension block K-wire fixation (PIP / Ishiguro)",
    snomedCtCode: "44806002",
    snomedCtDisplay: "Internal fixation of joint of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "hand_disloc_pip_volar_plate_arthroplasty",
    displayName: "Volar plate arthroplasty (PIP)",
    snomedCtCode: "44806002",
    snomedCtDisplay:
      "Arthroplasty of proximal interphalangeal joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "hand_disloc_pip_hemihamate",
    displayName: "Hemi-hamate arthroplasty (PIP pilon fracture)",
    snomedCtCode: "44806002",
    snomedCtDisplay:
      "Reconstruction of proximal interphalangeal joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "hand_disloc_mcp_cr",
    displayName: "MCP joint closed reduction",
    snomedCtCode: "44806002",
    snomedCtDisplay: "Closed reduction of dislocation of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "hand_disloc_mcp_open_reduction",
    displayName: "MCP joint open reduction (complex / irreducible dislocation)",
    snomedCtCode: "44806002",
    snomedCtDisplay: "Open reduction of dislocation of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma"],
    sortOrder: 6,
  },
  {
    id: "hand_disloc_cmc_crif",
    displayName: "CMC joint reduction + K-wire fixation",
    snomedCtCode: "44806002",
    snomedCtDisplay:
      "Closed reduction of dislocation of carpometacarpal joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma"],
    sortOrder: 7,
  },
  {
    id: "hand_disloc_perilunate_orif",
    displayName:
      "Perilunate dislocation — open reduction + ligament repair",
    snomedCtCode: "44806002",
    snomedCtDisplay: "Open reduction of perilunate dislocation (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma", "microsurgery"],
    sortOrder: 8,
  },
  {
    id: "hand_disloc_druj_reduction_kwire",
    displayName: "DRUJ closed reduction + K-wire stabilisation",
    snomedCtCode: "44806002",
    snomedCtDisplay: "Reduction of distal radioulnar joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma"],
    sortOrder: 9,
  },
  {
    id: "hand_disloc_druj_tfcc_repair",
    displayName: "TFCC repair (acute — arthroscopic or open)",
    snomedCtCode: "44806002",
    snomedCtDisplay:
      "Repair of triangular fibrocartilage complex (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Dislocation Management",
    tags: ["trauma"],
    sortOrder: 10,
  },
];

const HAND_AMPUTATION_REPLANTATION: ProcedurePicklistEntry[] = [
  {
    id: "hand_amp_terminalisation",
    displayName: "Terminalisation / revision amputation (finger)",
    snomedCtCode: "81723002",
    snomedCtDisplay: "Amputation of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Amputation & Replantation",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "hand_amp_revision_stump",
    displayName: "Stump revision / remodelling (finger)",
    snomedCtCode: "81723002",
    snomedCtDisplay: "Revision of amputation stump of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Amputation & Replantation",
    tags: ["revision"],
    sortOrder: 2,
  },
  {
    id: "hand_recon_major_replantation",
    displayName: "Major replantation (hand / wrist / forearm level)",
    snomedCtCode: "46989001",
    snomedCtDisplay: "Replantation of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Amputation & Replantation",
    tags: ["replant", "microsurgery", "trauma"],
    sortOrder: 3,
  },
];

const HAND_CONGENITAL: ProcedurePicklistEntry[] = [
  {
    id: "hand_cong_syndactyly",
    displayName: "Syndactyly release",
    snomedCtCode: "178751001",
    snomedCtDisplay: "Release of syndactyly (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Congenital Hand",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "hand_cong_polydactyly",
    displayName: "Polydactyly excision",
    snomedCtCode: "51975008",
    snomedCtDisplay: "Excision of supernumerary digit (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Congenital Hand",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "hand_cong_radial_deficiency",
    displayName:
      "Radial longitudinal deficiency — centralisation / radialisation",
    snomedCtCode: "178751001", // VERIFY
    snomedCtDisplay: "Reconstruction for radial deficiency (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Congenital Hand",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "hand_cong_thumb_hypoplasia",
    displayName: "Thumb hypoplasia reconstruction",
    snomedCtCode: "178751001", // VERIFY
    snomedCtDisplay: "Reconstruction of hypoplastic thumb (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Congenital Hand",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "hand_cong_clinodactyly",
    displayName: "Clinodactyly / camptodactyly correction",
    snomedCtCode: "178728004", // VERIFY
    snomedCtDisplay: "Corrective osteotomy of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Congenital Hand",
    tags: ["elective"],
    sortOrder: 5,
  },
  {
    id: "hand_cong_cleft_hand",
    displayName: "Cleft hand reconstruction",
    snomedCtCode: "178751001", // VERIFY
    snomedCtDisplay: "Reconstruction of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Congenital Hand",
    tags: ["elective"],
    sortOrder: 6,
  },
];

const HAND_OTHER: ProcedurePicklistEntry[] = [
  {
    id: "hand_other_ganglion",
    displayName: "Ganglion excision (wrist / hand)",
    snomedCtCode: "88867009",
    snomedCtDisplay: "Excision of ganglion (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "hand_other_gct_excision",
    displayName: "Giant cell tumour of tendon sheath excision",
    snomedCtCode: "24837003", // VERIFY
    snomedCtDisplay: "Excision of tumour of tendon sheath of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["elective", "oncological"],
    sortOrder: 2,
  },
  {
    id: "hand_other_tumour_excision",
    displayName: "Hand tumour excision — other",
    snomedCtCode: "24837003", // VERIFY
    snomedCtDisplay: "Excision of tumour of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["oncological"],
    sortOrder: 3,
  },
  {
    id: "hand_other_rheumatoid",
    displayName: "Rheumatoid hand surgery (synovectomy / reconstruction)",
    snomedCtCode: "54936004", // VERIFY
    snomedCtDisplay: "Synovectomy of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "hand_other_amputation",
    displayName: "Finger amputation (primary)",
    snomedCtCode: "81723002",
    snomedCtDisplay: "Amputation of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "hand_other_amputation_revision",
    displayName: "Finger amputation — revision / stump plasty",
    snomedCtCode: "81723002", // VERIFY
    snomedCtDisplay: "Revision of amputation stump of finger (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["revision"],
    sortOrder: 6,
  },
  {
    id: "hand_other_infection_washout",
    displayName: "Hand infection — washout / debridement",
    snomedCtCode: "36777000",
    snomedCtDisplay: "Debridement (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["trauma"],
    sortOrder: 7,
  },
  {
    id: "hand_other_flexor_sheath_washout",
    displayName: "Flexor sheath washout (septic flexor tenosynovitis)",
    snomedCtCode: "43289009",
    snomedCtDisplay: "Drainage of tendon sheath (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["trauma"],
    sortOrder: 8,
  },
  {
    id: "hand_other_steroid_injection",
    displayName: "Steroid injection (hand / wrist)",
    snomedCtCode: "91602001", // VERIFY
    snomedCtDisplay: "Injection of steroid into joint (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["elective"],
    sortOrder: 9,
  },
  {
    id: "hand_other_fasciotomy",
    displayName: "Fasciotomy — forearm / hand (compartment syndrome)",
    snomedCtCode: "81121007",
    snomedCtDisplay: "Fasciotomy (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["trauma"],
    sortOrder: 10,
  },
  {
    id: "hand_other_foreign_body",
    displayName: "Foreign body removal (hand / wrist)",
    snomedCtCode: "68526006",
    snomedCtDisplay: "Removal of foreign body from hand (procedure)",
    specialties: ["hand_wrist", "general"],
    subcategory: "Other Hand",
    tags: ["trauma"],
    sortOrder: 11,
  },
  {
    id: "hand_other_hpi_debridement",
    displayName: "High-pressure injection injury — debridement",
    snomedCtCode: "36777000",
    snomedCtDisplay: "Debridement (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["trauma"],
    sortOrder: 12,
  },
  {
    id: "hand_other_fight_bite_washout",
    displayName: "Fight bite — washout + debridement (MCP)",
    snomedCtCode: "36777000",
    snomedCtDisplay: "Debridement (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["trauma"],
    sortOrder: 13,
  },
  {
    id: "hand_other_hand_compartment_release",
    displayName: "Hand compartment release (fasciotomy — hand specific)",
    snomedCtCode: "81121007",
    snomedCtDisplay: "Fasciotomy of hand (procedure)",
    specialties: ["hand_wrist"],
    subcategory: "Other Hand",
    tags: ["trauma"],
    sortOrder: 14,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HEAD & NECK (~85 procedures across 9 subcategories)
// ═══════════════════════════════════════════════════════════════════════════

const HEAD_NECK_SKIN_CANCER: ProcedurePicklistEntry[] = [
  {
    id: "hn_skin_bcc_excision",
    displayName: "BCC excision — face / head / neck",
    snomedCtCode: "177302008",
    snomedCtDisplay: "Excision of basal cell carcinoma of skin (procedure)",
    specialties: ["skin_cancer", "head_neck", "general"],
    subcategory: "Skin Cancer Excision",
    tags: ["oncological"],
    sortOrder: 1,
  },
  {
    id: "hn_skin_scc_excision",
    displayName: "SCC excision — face / head / neck",
    snomedCtCode: "177304009",
    snomedCtDisplay: "Excision of squamous cell carcinoma of skin (procedure)",
    specialties: ["skin_cancer", "head_neck", "general"],
    subcategory: "Skin Cancer Excision",
    tags: ["oncological"],
    sortOrder: 2,
  },
  {
    id: "hn_skin_melanoma_excision",
    displayName: "Melanoma excision — face / head / neck",
    snomedCtCode: "177306006",
    snomedCtDisplay: "Excision of malignant melanoma of skin (procedure)",
    specialties: ["skin_cancer", "head_neck", "general"],
    subcategory: "Skin Cancer Excision",
    tags: ["oncological"],
    sortOrder: 3,
  },
  {
    id: "hn_skin_melanoma_wle",
    displayName: "Melanoma wide local excision — face / head / neck",
    snomedCtCode: "177306006",
    snomedCtDisplay: "Wide excision of malignant melanoma of skin (procedure)",
    specialties: ["skin_cancer", "head_neck", "general"],
    subcategory: "Skin Cancer Excision",
    tags: ["oncological"],
    sortOrder: 4,
  },
  {
    id: "hn_skin_mohs_defect",
    displayName: "Mohs defect reconstruction",
    snomedCtCode: "440299008",
    snomedCtDisplay: "Mohs micrographic surgery (procedure)",
    specialties: ["skin_cancer", "head_neck", "general"],
    subcategory: "Skin Cancer Excision",
    tags: ["oncological"],
    sortOrder: 5,
  },
  {
    id: "hn_skin_excision_other",
    displayName: "Skin lesion excision — face / head / neck — other",
    snomedCtCode: "177300000",
    snomedCtDisplay: "Excision of lesion of skin (procedure)",
    specialties: ["skin_cancer", "head_neck", "general"],
    subcategory: "Skin Cancer Excision",
    tags: ["oncological"],
    sortOrder: 6,
  },
  {
    id: "hn_skin_slnb",
    displayName: "Sentinel lymph node biopsy — head / neck",
    snomedCtCode: "396487001",
    snomedCtDisplay: "Sentinel lymph node biopsy (procedure)",
    specialties: ["skin_cancer", "head_neck", "general"],
    subcategory: "Skin Cancer Excision",
    tags: ["oncological"],
    hasSlnb: true,
    sortOrder: 7,
  },
];

const HEAD_NECK_LOCAL_FLAPS: ProcedurePicklistEntry[] = [
  {
    id: "hn_local_advancement",
    displayName: "Advancement flap — face",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Local Flaps",
    tags: ["local_flap"],
    sortOrder: 1,
  },
  {
    id: "hn_local_rotation",
    displayName: "Rotation flap — face / scalp",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Local Flaps",
    tags: ["local_flap"],
    sortOrder: 2,
  },
  {
    id: "hn_local_transposition",
    displayName: "Transposition flap — face",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Local Flaps",
    tags: ["local_flap"],
    sortOrder: 3,
  },
  {
    id: "hn_local_bilobed",
    displayName: "Bilobed flap (nose / cheek)",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Local Flaps",
    tags: ["local_flap"],
    sortOrder: 4,
  },
  {
    id: "hn_local_rhomboid",
    displayName: "Rhomboid / Limberg flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck", "general"],
    subcategory: "Local Flaps",
    tags: ["local_flap"],
    sortOrder: 5,
  },
  {
    id: "hn_local_vy",
    displayName: "V-Y advancement flap — face",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Local Flaps",
    tags: ["local_flap"],
    sortOrder: 6,
  },
  {
    id: "hn_local_nasolabial",
    displayName: "Nasolabial flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Local Flaps",
    tags: ["local_flap"],
    sortOrder: 7,
  },
  {
    id: "hn_local_zplasty",
    displayName: "Z-plasty (scar revision / contracture release)",
    snomedCtCode: "13760004",
    snomedCtDisplay: "Z-plasty (procedure)",
    specialties: ["head_neck", "general"],
    subcategory: "Local Flaps",
    tags: ["local_flap", "revision"],
    sortOrder: 8,
  },
];

const HEAD_NECK_REGIONAL_FLAPS: ProcedurePicklistEntry[] = [
  {
    id: "hn_reg_paramedian_forehead",
    displayName: "Paramedian forehead flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Regional Flaps",
    tags: ["pedicled_flap"],
    sortOrder: 1,
  },
  {
    id: "hn_reg_cervicofacial",
    displayName: "Cervicofacial advancement flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Regional Flaps",
    tags: ["pedicled_flap"],
    sortOrder: 2,
  },
  {
    id: "hn_reg_abbe",
    displayName: "Abbe flap (lip switch)",
    snomedCtCode: "53410002", // VERIFY
    snomedCtDisplay: "Abbe flap reconstruction of lip (procedure)",
    specialties: ["head_neck"],
    subcategory: "Regional Flaps",
    tags: ["pedicled_flap"],
    sortOrder: 3,
  },
  {
    id: "hn_reg_karapandzic",
    displayName: "Karapandzic flap",
    snomedCtCode: "13372005",
    snomedCtDisplay: "Reconstruction of lip (procedure)",
    specialties: ["head_neck"],
    subcategory: "Regional Flaps",
    tags: ["pedicled_flap"],
    sortOrder: 4,
  },
  {
    id: "hn_reg_estlander",
    displayName: "Estlander flap",
    snomedCtCode: "13372005",
    snomedCtDisplay: "Reconstruction of lip (procedure)",
    specialties: ["head_neck"],
    subcategory: "Regional Flaps",
    tags: ["pedicled_flap"],
    sortOrder: 5,
  },
  {
    id: "hn_reg_submental_island",
    displayName: "Submental island flap",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Regional Flaps",
    tags: ["pedicled_flap"],
    sortOrder: 6,
  },
  {
    id: "hn_reg_supraclavicular",
    displayName: "Supraclavicular flap",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Regional Flaps",
    tags: ["pedicled_flap"],
    sortOrder: 7,
  },
  {
    id: "hn_reg_deltopectoral",
    displayName: "Deltopectoral flap",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["head_neck"],
    subcategory: "Regional Flaps",
    tags: ["pedicled_flap"],
    sortOrder: 8,
  },
  {
    id: "hn_reg_pectoralis_major",
    displayName: "Pectoralis major flap (PMMC)",
    snomedCtCode: "234281001", // VERIFY
    snomedCtDisplay: "Pedicled pectoralis major flap (procedure)",
    specialties: ["head_neck"],
    subcategory: "Regional Flaps",
    tags: ["pedicled_flap"],
    sortOrder: 9,
  },
];

// Note: Head & Neck free flaps reuse Orthoplastic entries via specialty tagging.
// These are H&N-specific free flaps NOT already covered by orthoplastic.
const HEAD_NECK_FREE_FLAPS: ProcedurePicklistEntry[] = [
  {
    id: "hn_ff_vram",
    displayName: "Free VRAM flap (Vertical Rectus Abdominis Myocutaneous)",
    snomedCtCode: "446078000", // VERIFY — TRAM parent
    snomedCtDisplay:
      "Free vertical rectus abdominis myocutaneous flap (procedure)",
    specialties: ["head_neck", "general"],
    subcategory: "Free Flap — Head & Neck",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 1,
  },
  {
    id: "hn_ff_jejunal",
    displayName: "Free jejunal flap",
    snomedCtCode: "234290004", // VERIFY
    snomedCtDisplay: "Free jejunal flap transfer (procedure)",
    specialties: ["head_neck"],
    subcategory: "Free Flap — Head & Neck",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 2,
  },
  {
    id: "hn_ff_iliac_crest",
    displayName: "Free iliac crest (DCIA) flap",
    snomedCtCode: "234291003", // VERIFY
    snomedCtDisplay: "Free iliac crest flap transfer (procedure)",
    specialties: ["head_neck"],
    subcategory: "Free Flap — Head & Neck",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 3,
  },
];

const HEAD_NECK_SITE_RECONSTRUCTION: ProcedurePicklistEntry[] = [
  {
    id: "hn_recon_nose_partial",
    displayName: "Nasal reconstruction — partial",
    snomedCtCode: "54002009", // VERIFY
    snomedCtDisplay: "Reconstruction of nose (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological"],
    sortOrder: 1,
  },
  {
    id: "hn_recon_nose_total",
    displayName: "Nasal reconstruction — total / subtotal",
    snomedCtCode: "54002009", // VERIFY
    snomedCtDisplay: "Total reconstruction of nose (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological"],
    sortOrder: 2,
  },
  {
    id: "hn_recon_lip",
    displayName: "Lip reconstruction (primary closure / flap)",
    snomedCtCode: "83891000", // VERIFY
    snomedCtDisplay: "Reconstruction of lip (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological"],
    sortOrder: 3,
  },
  {
    id: "hn_recon_ear_partial",
    displayName: "Ear reconstruction — partial / wedge",
    snomedCtCode: "287777008", // VERIFY
    snomedCtDisplay: "Reconstruction of external ear (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological"],
    sortOrder: 4,
  },
  {
    id: "hn_recon_ear_total",
    displayName: "Ear reconstruction — total (rib framework / Medpor)",
    snomedCtCode: "287777008", // VERIFY
    snomedCtDisplay: "Total reconstruction of external ear (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["elective"],
    sortOrder: 5,
  },
  {
    id: "hn_recon_ear_prosthetic",
    displayName: "Ear reconstruction — osseointegrated prosthesis",
    snomedCtCode: "287777008", // VERIFY
    snomedCtDisplay: "Reconstruction of ear with prosthesis (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "hn_recon_eyelid_upper",
    displayName: "Eyelid reconstruction — upper",
    snomedCtCode: "274883006", // VERIFY
    snomedCtDisplay: "Reconstruction of upper eyelid (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological"],
    sortOrder: 7,
  },
  {
    id: "hn_recon_eyelid_lower",
    displayName: "Eyelid reconstruction — lower",
    snomedCtCode: "274884000", // VERIFY
    snomedCtDisplay: "Reconstruction of lower eyelid (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological"],
    sortOrder: 8,
  },
  {
    id: "hn_recon_scalp",
    displayName: "Scalp reconstruction (flap / graft / tissue expansion)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Reconstruction of scalp (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological", "complex_wound"],
    sortOrder: 9,
  },
  {
    id: "hn_recon_oral_tongue_floor",
    displayName: "Oral cavity / tongue / floor of mouth reconstruction",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Reconstruction of oral cavity (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological", "free_flap"],
    sortOrder: 10,
  },
  {
    id: "hn_recon_mandible",
    displayName: "Mandible reconstruction (plate / fibula / flap)",
    snomedCtCode: "66567009", // VERIFY
    snomedCtDisplay: "Reconstruction of mandible (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological", "free_flap"],
    sortOrder: 11,
  },
  {
    id: "hn_recon_maxilla",
    displayName: "Maxillary / midface reconstruction",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Reconstruction of maxilla (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological"],
    sortOrder: 12,
  },
  {
    id: "hn_recon_pharynx",
    displayName: "Pharyngeal / oesophageal reconstruction",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Reconstruction of pharynx (procedure)",
    specialties: ["head_neck"],
    subcategory: "Site-Specific Reconstruction",
    tags: ["oncological", "free_flap"],
    sortOrder: 13,
  },
];

const HEAD_NECK_FACIAL_NERVE: ProcedurePicklistEntry[] = [
  {
    id: "hn_fn_primary_repair",
    displayName: "Facial nerve primary repair",
    snomedCtCode: "22649006",
    snomedCtDisplay: "Repair of facial nerve (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Nerve & Reanimation",
    tags: ["nerve_repair", "microsurgery", "trauma"],
    sortOrder: 1,
  },
  {
    id: "hn_fn_cable_graft",
    displayName: "Facial nerve cable graft",
    snomedCtCode: "7428004",
    snomedCtDisplay: "Nerve graft (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Nerve & Reanimation",
    tags: ["nerve_repair", "microsurgery"],
    sortOrder: 2,
  },
  {
    id: "hn_fn_cross_face",
    displayName: "Cross-face nerve graft (CFNG)",
    snomedCtCode: "7428004", // VERIFY
    snomedCtDisplay: "Cross-face nerve graft (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Nerve & Reanimation",
    tags: ["nerve_repair", "microsurgery"],
    sortOrder: 3,
  },
  {
    id: "hn_fn_masseteric_transfer",
    displayName: "Masseteric nerve transfer to facial nerve",
    snomedCtCode: "56625009", // VERIFY
    snomedCtDisplay: "Nerve transfer to facial nerve (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Nerve & Reanimation",
    tags: ["nerve_repair", "microsurgery"],
    sortOrder: 4,
  },
  {
    id: "hn_fn_free_gracilis",
    displayName: "Free gracilis transfer for facial reanimation",
    snomedCtCode: "234297004",
    snomedCtDisplay: "Free gracilis flap (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Nerve & Reanimation",
    tags: ["free_flap", "microsurgery"],
    hasFreeFlap: true,
    sortOrder: 5,
  },
  {
    id: "hn_fn_static_sling",
    displayName: "Static sling (fascia lata / alloplastic)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Static sling procedure for facial palsy (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Nerve & Reanimation",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "hn_fn_gold_weight",
    displayName: "Upper eyelid gold / platinum weight",
    snomedCtCode: "274883006", // VERIFY
    snomedCtDisplay: "Insertion of eyelid weight (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Nerve & Reanimation",
    tags: ["elective"],
    sortOrder: 7,
  },
];

const HEAD_NECK_CLEFT_CRANIOFACIAL: ProcedurePicklistEntry[] = [
  {
    id: "hn_cleft_lip_unilateral",
    displayName: "Cleft lip repair — unilateral",
    snomedCtCode: "13895006",
    snomedCtDisplay: "Repair of cleft lip (procedure)",
    specialties: ["cleft_cranio", "head_neck"],
    subcategory: "Cleft & Craniofacial",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "hn_cleft_lip_bilateral",
    displayName: "Cleft lip repair — bilateral",
    snomedCtCode: "13895006",
    snomedCtDisplay: "Repair of cleft lip (procedure)",
    specialties: ["cleft_cranio", "head_neck"],
    subcategory: "Cleft & Craniofacial",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "hn_cleft_palate",
    displayName: "Cleft palate repair",
    snomedCtCode: "172735006",
    snomedCtDisplay: "Repair of cleft palate (procedure)",
    specialties: ["cleft_cranio", "head_neck"],
    subcategory: "Cleft & Craniofacial",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "hn_cleft_alveolar_bone_graft",
    displayName: "Alveolar bone graft",
    snomedCtCode: "54550001",
    snomedCtDisplay: "Bone graft of alveolar ridge (procedure)",
    specialties: ["cleft_cranio", "head_neck"],
    subcategory: "Cleft & Craniofacial",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "hn_cleft_lip_revision",
    displayName: "Cleft lip / nose revision",
    snomedCtCode: "13895006", // VERIFY
    snomedCtDisplay: "Revision of cleft lip repair (procedure)",
    specialties: ["cleft_cranio", "head_neck"],
    subcategory: "Cleft & Craniofacial",
    tags: ["revision"],
    sortOrder: 5,
  },
  {
    id: "hn_cleft_velopharyngeal_insufficiency",
    displayName: "VPI surgery (pharyngoplasty / pharyngeal flap)",
    snomedCtCode: "41925006",
    snomedCtDisplay: "Pharyngoplasty (procedure)",
    specialties: ["cleft_cranio", "head_neck"],
    subcategory: "Cleft & Craniofacial",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "hn_craniosynostosis",
    displayName: "Craniosynostosis surgery (cranial vault remodelling)",
    snomedCtCode: "274038009", // VERIFY
    snomedCtDisplay: "Craniosynostosis repair (procedure)",
    specialties: ["cleft_cranio", "head_neck"],
    subcategory: "Cleft & Craniofacial",
    tags: ["elective"],
    sortOrder: 7,
  },
  {
    id: "hn_lefort_osteotomy",
    displayName: "Le Fort osteotomy (I / II / III)",
    snomedCtCode: "59782002", // VERIFY
    snomedCtDisplay: "Le Fort osteotomy (procedure)",
    specialties: ["cleft_cranio", "head_neck"],
    subcategory: "Cleft & Craniofacial",
    tags: ["elective"],
    sortOrder: 8,
  },
  {
    id: "hn_distraction_osteogenesis",
    displayName: "Distraction osteogenesis — craniofacial",
    snomedCtCode: "431548006", // VERIFY
    snomedCtDisplay: "Distraction osteogenesis (procedure)",
    specialties: ["cleft_cranio", "head_neck"],
    subcategory: "Cleft & Craniofacial",
    tags: ["elective"],
    sortOrder: 9,
  },
];

const HEAD_NECK_FACIAL_FRACTURES: ProcedurePicklistEntry[] = [
  {
    id: "hn_fx_mandible_orif",
    displayName: "Mandible fracture ORIF",
    snomedCtCode: "24529004",
    snomedCtDisplay:
      "Open reduction of fracture of mandible with internal fixation (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "hn_fx_mandible_imf",
    displayName: "Mandible fracture — IMF / closed reduction",
    snomedCtCode: "24529004", // VERIFY — may have closed-specific code
    snomedCtDisplay: "Closed reduction of fracture of mandible (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "hn_fx_zygoma_orif",
    displayName: "Zygoma fracture ORIF",
    snomedCtCode: "50528002",
    snomedCtDisplay: "Open reduction of fracture of zygoma (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "hn_fx_zygoma_gillies",
    displayName: "Zygoma reduction — Gillies approach",
    snomedCtCode: "50528002", // VERIFY
    snomedCtDisplay: "Closed reduction of fracture of zygoma (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "hn_fx_orbital_floor",
    displayName: "Orbital floor fracture repair",
    snomedCtCode: "359634005",
    snomedCtDisplay: "Repair of fracture of orbital floor (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "hn_fx_lefort",
    displayName: "Le Fort fracture ORIF (I / II / III)",
    snomedCtCode: "50528002", // VERIFY
    snomedCtDisplay: "Open reduction of Le Fort fracture (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 6,
  },
  {
    id: "hn_fx_frontal_sinus",
    displayName: "Frontal sinus fracture repair",
    snomedCtCode: "50528002", // VERIFY
    snomedCtDisplay: "Repair of fracture of frontal sinus (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 7,
  },
  {
    id: "hn_fx_nasal",
    displayName: "Nasal fracture reduction (closed / open)",
    snomedCtCode: "36070001",
    snomedCtDisplay: "Reduction of nasal fracture (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 8,
  },
  {
    id: "hn_fx_noe",
    displayName: "Naso-orbito-ethmoidal (NOE) fracture repair",
    snomedCtCode: "50528002", // VERIFY
    snomedCtDisplay: "Repair of naso-orbito-ethmoidal fracture (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 9,
  },
  {
    id: "hn_fx_panfacial",
    displayName: "Panfacial fracture reconstruction",
    snomedCtCode: "50528002", // VERIFY
    snomedCtDisplay: "Repair of panfacial fracture (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Fractures",
    tags: ["trauma"],
    sortOrder: 10,
  },
];

const HEAD_NECK_FACIAL_SOFT_TISSUE_TRAUMA: ProcedurePicklistEntry[] = [
  {
    id: "hn_trauma_facial_lac_simple",
    displayName: "Facial laceration repair — simple",
    snomedCtCode: "238182008",
    snomedCtDisplay: "Suture of skin (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "hn_trauma_facial_lac_complex",
    displayName: "Facial laceration repair — complex / layered",
    snomedCtCode: "20720004",
    snomedCtDisplay: "Wound repair (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "hn_trauma_nasal_lac",
    displayName: "Nasal laceration repair",
    snomedCtCode: "238182008",
    snomedCtDisplay: "Suture of skin (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "hn_trauma_lip_lac",
    displayName: "Lip laceration repair",
    snomedCtCode: "238182008",
    snomedCtDisplay: "Suture of skin (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "hn_trauma_eyelid_lac",
    displayName: "Eyelid / periorbital laceration repair",
    snomedCtCode: "238182008",
    snomedCtDisplay: "Suture of skin (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "hn_trauma_ear_lac",
    displayName: "Ear laceration repair ± cartilage",
    snomedCtCode: "238182008",
    snomedCtDisplay: "Suture of skin (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 6,
  },
  {
    id: "hn_trauma_scalp_lac",
    displayName: "Scalp laceration repair",
    snomedCtCode: "238182008",
    snomedCtDisplay: "Suture of skin (procedure)",
    specialties: ["head_neck", "general"],
    subcategory: "Facial Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 7,
  },
  {
    id: "hn_trauma_facial_wound_exploration",
    displayName: "Facial wound exploration + debridement",
    snomedCtCode: "360160003",
    snomedCtDisplay: "Exploration of wound (procedure)",
    specialties: ["head_neck"],
    subcategory: "Facial Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 8,
  },
];

const HEAD_NECK_OTHER: ProcedurePicklistEntry[] = [
  {
    id: "hn_other_neck_dissection",
    displayName: "Neck dissection (selective / modified radical / radical)",
    snomedCtCode: "24994004",
    snomedCtDisplay: "Neck dissection (procedure)",
    specialties: ["head_neck"],
    subcategory: "Other Head & Neck",
    tags: ["oncological"],
    sortOrder: 1,
  },
  {
    id: "hn_other_parotidectomy",
    displayName: "Parotidectomy (superficial / total)",
    snomedCtCode: "33482003",
    snomedCtDisplay: "Parotidectomy (procedure)",
    specialties: ["head_neck"],
    subcategory: "Other Head & Neck",
    tags: ["oncological"],
    sortOrder: 2,
  },
  {
    id: "hn_other_tracheostomy",
    displayName: "Tracheostomy",
    snomedCtCode: "48387007",
    snomedCtDisplay: "Tracheostomy (procedure)",
    specialties: ["head_neck", "burns"],
    subcategory: "Other Head & Neck",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "hn_other_tissue_expansion",
    displayName: "Tissue expansion — head / neck",
    snomedCtCode: "61218004", // VERIFY
    snomedCtDisplay: "Tissue expansion (procedure)",
    specialties: ["head_neck"],
    subcategory: "Other Head & Neck",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "hn_other_dermoid_excision",
    displayName: "Dermoid cyst excision — face / scalp",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Excision of dermoid cyst (procedure)",
    specialties: ["head_neck"],
    subcategory: "Other Head & Neck",
    tags: ["elective"],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// GENERAL PLASTICS (~75 total visible: ~42 dedicated + ~31 cross-tagged)
// Cross-tagged from Orthoplastic: free flaps (ALT, gracilis, RFFF, other),
//   pedicled flaps (propeller, LD, V-Y), local flaps (rotation, transposition,
//   bipedicle), skin grafts (STSG meshed/sheet, FTSG), wound mgmt (debridement,
//   NPWT, washout, delayed closure), complex recon (pressure sore, perineal,
//   chest wall, abdominal wall)
// Cross-tagged from Hand: foreign body removal
// Cross-tagged from H&N: BCC/SCC/melanoma excision, melanoma WLE, lesion
//   excision other, SLNB, rhomboid flap, Z-plasty, VRAM
// ═══════════════════════════════════════════════════════════════════════════

const GENERAL_SKIN_LESION: ProcedurePicklistEntry[] = [
  {
    id: "gen_skin_lipoma",
    displayName: "Lipoma excision",
    snomedCtCode: "274030003",
    snomedCtDisplay: "Excision of lipoma (procedure)",
    specialties: ["general"],
    subcategory: "Skin Lesion Surgery",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "gen_skin_sebaceous_cyst",
    displayName: "Sebaceous / epidermal cyst excision",
    snomedCtCode: "274029008", // VERIFY
    snomedCtDisplay: "Excision of sebaceous cyst (procedure)",
    specialties: ["general"],
    subcategory: "Skin Lesion Surgery",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "gen_skin_benign_lesion",
    displayName: "Benign skin lesion excision",
    snomedCtCode: "177300000",
    snomedCtDisplay: "Excision of lesion of skin (procedure)",
    specialties: ["general"],
    subcategory: "Skin Lesion Surgery",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "gen_skin_bcc_excision_body",
    displayName: "BCC excision — trunk / limbs",
    snomedCtCode: "177302008",
    snomedCtDisplay: "Excision of basal cell carcinoma of skin (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Skin Lesion Surgery",
    tags: ["oncological"],
    sortOrder: 4,
  },
  {
    id: "gen_skin_scc_excision_body",
    displayName: "SCC excision — trunk / limbs",
    snomedCtCode: "177304009",
    snomedCtDisplay: "Excision of squamous cell carcinoma of skin (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Skin Lesion Surgery",
    tags: ["oncological"],
    sortOrder: 5,
  },
  {
    id: "gen_skin_biopsy_punch",
    displayName: "Skin biopsy — punch / incisional",
    snomedCtCode: "240977001",
    snomedCtDisplay: "Punch biopsy of skin (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Skin Lesion Surgery",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "gen_skin_shave_curette",
    displayName: "Shave excision / curettage",
    snomedCtCode: "63697000",
    snomedCtDisplay: "Curettage of skin lesion (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Skin Lesion Surgery",
    tags: ["elective"],
    sortOrder: 7,
  },
];

const GENERAL_MELANOMA: ProcedurePicklistEntry[] = [
  {
    id: "gen_mel_excision_body",
    displayName: "Melanoma excision — trunk / limbs",
    snomedCtCode: "177306006",
    snomedCtDisplay: "Excision of malignant melanoma of skin (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Melanoma & Oncological",
    tags: ["oncological"],
    sortOrder: 1,
  },
  {
    id: "gen_mel_wle_body",
    displayName: "Melanoma wide local excision — trunk / limbs",
    snomedCtCode: "177306006",
    snomedCtDisplay: "Wide excision of malignant melanoma of skin (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Melanoma & Oncological",
    tags: ["oncological"],
    sortOrder: 2,
  },
  {
    id: "gen_mel_slnb_body",
    displayName: "Sentinel lymph node biopsy — trunk / limbs",
    snomedCtCode: "396487001",
    snomedCtDisplay: "Sentinel lymph node biopsy (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Melanoma & Oncological",
    tags: ["oncological"],
    hasSlnb: true,
    sortOrder: 3,
  },
  {
    id: "gen_mel_clnd",
    displayName: "Completion lymph node dissection (axillary / inguinal)",
    snomedCtCode: "234262008",
    snomedCtDisplay: "Lymph node dissection (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Melanoma & Oncological",
    tags: ["oncological"],
    sortOrder: 4,
  },
  {
    id: "gen_mel_in_transit_excision",
    displayName: "In-transit metastasis excision",
    snomedCtCode: "177306006",
    snomedCtDisplay: "Excision of melanoma metastasis (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Melanoma & Oncological",
    tags: ["oncological"],
    sortOrder: 5,
  },
  {
    id: "gen_mel_merkel_excision",
    displayName: "Merkel cell carcinoma excision",
    snomedCtCode: "287626001",
    snomedCtDisplay: "Excision of malignant neoplasm of skin (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Melanoma & Oncological",
    tags: ["oncological"],
    sortOrder: 6,
  },
  {
    id: "gen_mel_dfsp_excision",
    displayName: "DFSP excision (dermatofibrosarcoma protuberans)",
    snomedCtCode: "287626001",
    snomedCtDisplay: "Excision of malignant neoplasm of skin (procedure)",
    specialties: ["skin_cancer", "general", "head_neck"],
    subcategory: "Melanoma & Oncological",
    tags: ["oncological"],
    sortOrder: 7,
  },
];

const GENERAL_SCAR_WOUND: ProcedurePicklistEntry[] = [
  {
    id: "gen_scar_revision",
    displayName: "Scar revision (excision + direct closure)",
    snomedCtCode: "234140001",
    snomedCtDisplay: "Revision of scar (procedure)",
    specialties: ["general"],
    subcategory: "Scar & Wound Management",
    tags: ["revision", "elective"],
    sortOrder: 1,
  },
  {
    id: "gen_scar_steroid_injection",
    displayName: "Intralesional steroid injection (keloid / hypertrophic scar)",
    snomedCtCode: "91602001", // VERIFY
    snomedCtDisplay: "Injection of steroid into lesion (procedure)",
    specialties: ["general"],
    subcategory: "Scar & Wound Management",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "gen_scar_fat_grafting",
    displayName: "Fat grafting to scar",
    snomedCtCode: "37834008", // VERIFY
    snomedCtDisplay: "Lipofilling (procedure)",
    specialties: ["general"],
    subcategory: "Scar & Wound Management",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "gen_abscess_id",
    displayName: "Abscess incision and drainage",
    snomedCtCode: "174295000",
    snomedCtDisplay: "Incision and drainage of abscess (procedure)",
    specialties: ["general"],
    subcategory: "Scar & Wound Management",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "gen_tissue_expansion",
    displayName: "Tissue expansion (insertion / exchange / removal)",
    snomedCtCode: "61218004", // VERIFY
    snomedCtDisplay: "Tissue expansion (procedure)",
    specialties: ["general"],
    subcategory: "Scar & Wound Management",
    tags: ["elective"],
    sortOrder: 5,
  },
];

const GENERAL_PRESSURE_SORE: ProcedurePicklistEntry[] = [
  {
    id: "gen_ps_sacral_flap",
    displayName:
      "Sacral pressure sore — flap closure (gluteal / fasciocutaneous)",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction for pressure ulcer (procedure)",
    specialties: ["general"],
    subcategory: "Pressure Sore Reconstruction",
    tags: ["pedicled_flap", "complex_wound"],
    sortOrder: 1,
  },
  {
    id: "gen_ps_ischial_flap",
    displayName: "Ischial pressure sore — flap closure (hamstring / VY)",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction for pressure ulcer (procedure)",
    specialties: ["general"],
    subcategory: "Pressure Sore Reconstruction",
    tags: ["pedicled_flap", "complex_wound"],
    sortOrder: 2,
  },
  {
    id: "gen_ps_trochanteric_flap",
    displayName: "Trochanteric pressure sore — flap closure (TFL / VL)",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Flap reconstruction for pressure ulcer (procedure)",
    specialties: ["general"],
    subcategory: "Pressure Sore Reconstruction",
    tags: ["pedicled_flap", "complex_wound"],
    sortOrder: 3,
  },
  {
    id: "gen_ps_other_flap",
    displayName: "Pressure sore — other site / flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction for pressure ulcer (procedure)",
    specialties: ["general"],
    subcategory: "Pressure Sore Reconstruction",
    tags: ["pedicled_flap", "complex_wound"],
    sortOrder: 4,
  },
];

const GENERAL_LYMPHOEDEMA: ProcedurePicklistEntry[] = [
  {
    id: "gen_lymph_lva",
    displayName: "Lymphovenous anastomosis (LVA)",
    snomedCtCode: "438614006", // VERIFY
    snomedCtDisplay: "Lymphovenous anastomosis (procedure)",
    specialties: ["lymphoedema", "general"],
    subcategory: "Lymphoedema Surgery",
    tags: ["microsurgery", "elective"],
    sortOrder: 1,
  },
  {
    id: "gen_lymph_vlnt",
    displayName: "Vascularised lymph node transfer (VLNT)",
    snomedCtCode: "438614006", // VERIFY
    snomedCtDisplay: "Vascularised lymph node transfer (procedure)",
    specialties: ["lymphoedema", "general"],
    subcategory: "Lymphoedema Surgery",
    tags: ["free_flap", "microsurgery", "elective"],
    hasFreeFlap: true,
    sortOrder: 2,
  },
  {
    id: "gen_lymph_liposuction",
    displayName: "Liposuction for lymphoedema",
    snomedCtCode: "302441008", // VERIFY
    snomedCtDisplay: "Liposuction for lymphoedema (procedure)",
    specialties: ["lymphoedema", "general"],
    subcategory: "Lymphoedema Surgery",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "gen_lymph_debulking",
    displayName: "Lymphoedema debulking / Charles procedure",
    snomedCtCode: "302441008", // VERIFY
    snomedCtDisplay: "Excisional debulking for lymphoedema (procedure)",
    specialties: ["lymphoedema", "general"],
    subcategory: "Lymphoedema Surgery",
    tags: ["elective"],
    sortOrder: 4,
  },
];

const GENERAL_VASCULAR_MALFORMATION: ProcedurePicklistEntry[] = [
  {
    id: "gen_vasc_excision",
    displayName: "Vascular malformation excision",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Excision of vascular malformation (procedure)",
    specialties: ["general"],
    subcategory: "Vascular Malformations",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "gen_vasc_sclerotherapy",
    displayName: "Sclerotherapy for vascular malformation",
    snomedCtCode: "17382005", // VERIFY
    snomedCtDisplay: "Sclerotherapy (procedure)",
    specialties: ["general"],
    subcategory: "Vascular Malformations",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "gen_vasc_laser",
    displayName: "Laser treatment for vascular malformation",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Laser therapy (procedure)",
    specialties: ["general"],
    subcategory: "Vascular Malformations",
    tags: ["elective"],
    sortOrder: 3,
  },
];

const GENERAL_HIDRADENITIS: ProcedurePicklistEntry[] = [
  {
    id: "gen_hs_excision_axilla",
    displayName: "Hidradenitis suppurativa excision — axilla",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Excision for hidradenitis suppurativa (procedure)",
    specialties: ["general"],
    subcategory: "Hidradenitis Suppurativa",
    tags: ["oncological", "elective"],
    sortOrder: 1,
  },
  {
    id: "gen_hs_excision_groin",
    displayName: "Hidradenitis suppurativa excision — groin / perineal",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Excision for hidradenitis suppurativa (procedure)",
    specialties: ["general"],
    subcategory: "Hidradenitis Suppurativa",
    tags: ["oncological", "elective"],
    sortOrder: 2,
  },
  {
    id: "gen_hs_excision_other",
    displayName: "Hidradenitis suppurativa excision — other site",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Excision for hidradenitis suppurativa (procedure)",
    specialties: ["general"],
    subcategory: "Hidradenitis Suppurativa",
    tags: ["oncological", "elective"],
    sortOrder: 3,
  },
  {
    id: "gen_hs_deroofing",
    displayName: "Hidradenitis suppurativa — deroofing / unroofing",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Deroofing for hidradenitis suppurativa (procedure)",
    specialties: ["general"],
    subcategory: "Hidradenitis Suppurativa",
    tags: ["elective"],
    sortOrder: 4,
  },
];

const GENERAL_GENDER_AFFIRMING: ProcedurePicklistEntry[] = [
  {
    id: "gen_ga_chest_masculinisation",
    displayName: "Chest masculinisation (top surgery — FTM)",
    snomedCtCode: "456903003", // VERIFY
    snomedCtDisplay: "Gender affirming mastectomy (procedure)",
    specialties: ["general"],
    subcategory: "Gender-Affirming Surgery",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "gen_ga_breast_augmentation_mtf",
    displayName: "Breast augmentation (MTF)",
    snomedCtCode: "69031006", // VERIFY
    snomedCtDisplay: "Gender affirming breast augmentation (procedure)",
    specialties: ["general"],
    subcategory: "Gender-Affirming Surgery",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "gen_ga_facial_feminisation",
    displayName: "Facial feminisation surgery (FFS)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Facial feminisation surgery (procedure)",
    specialties: ["general"],
    subcategory: "Gender-Affirming Surgery",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "gen_ga_other",
    displayName: "Gender-affirming surgery — other (specify in notes)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Gender affirming surgery (procedure)",
    specialties: ["general"],
    subcategory: "Gender-Affirming Surgery",
    tags: ["elective"],
    sortOrder: 4,
  },
];

const GENERAL_SOFT_TISSUE_TRAUMA: ProcedurePicklistEntry[] = [
  {
    id: "gen_trauma_lac_simple",
    displayName: "Laceration repair — simple (skin / subcutaneous)",
    snomedCtCode: "238182008",
    snomedCtDisplay: "Suture of skin (procedure)",
    specialties: ["general"],
    subcategory: "Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "gen_trauma_lac_complex",
    displayName: "Laceration repair — complex / layered",
    snomedCtCode: "20720004",
    snomedCtDisplay: "Wound repair (procedure)",
    specialties: ["general"],
    subcategory: "Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "gen_trauma_pretibial_repair",
    displayName: "Pretibial laceration repair — primary closure",
    snomedCtCode: "238182008",
    snomedCtDisplay: "Suture of skin (procedure)",
    specialties: ["general", "orthoplastic"],
    subcategory: "Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "gen_trauma_degloving",
    displayName: "Degloving injury — primary management",
    snomedCtCode: "20720004",
    snomedCtDisplay: "Wound repair (procedure)",
    specialties: ["general", "orthoplastic"],
    subcategory: "Soft Tissue Trauma",
    tags: ["trauma", "complex_wound"],
    sortOrder: 4,
  },
  {
    id: "gen_trauma_wound_exploration",
    displayName: "Wound exploration + repair (non-hand)",
    snomedCtCode: "360160003",
    snomedCtDisplay: "Exploration of wound (procedure)",
    specialties: ["general"],
    subcategory: "Soft Tissue Trauma",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "gen_trauma_skin_loss_closure",
    displayName: "Traumatic skin loss — direct closure / graft",
    snomedCtCode: "20720004",
    snomedCtDisplay: "Wound repair (procedure)",
    specialties: ["general"],
    subcategory: "Soft Tissue Trauma",
    tags: ["trauma", "skin_graft"],
    sortOrder: 6,
  },
];

const GENERAL_OTHER: ProcedurePicklistEntry[] = [
  {
    id: "gen_other_pilonidal_excision",
    displayName: "Pilonidal sinus excision ± flap closure",
    snomedCtCode: "44558001",
    snomedCtDisplay: "Excision of pilonidal sinus (procedure)",
    specialties: ["general"],
    subcategory: "Other General",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "gen_other_earlobe_repair",
    displayName: "Earlobe repair / reduction",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Repair of earlobe (procedure)",
    specialties: ["general"],
    subcategory: "Other General",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "gen_other_skin_tag_removal",
    displayName: "Skin tag / papilloma removal (multiple)",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Removal of skin tag (procedure)",
    specialties: ["general"],
    subcategory: "Other General",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "gen_other_cryotherapy",
    displayName: "Cryotherapy — skin lesion",
    snomedCtCode: "35025007", // VERIFY
    snomedCtDisplay: "Cryotherapy (procedure)",
    specialties: ["general"],
    subcategory: "Other General",
    tags: ["elective"],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// BREAST (~50 total visible: ~44 dedicated + ~3 cross-tagged + aesthetics share)
// Cross-tagged from Orthoplastic: TUG, Free LD, PAP
// ═══════════════════════════════════════════════════════════════════════════

const BREAST_AUTOLOGOUS_RECON: ProcedurePicklistEntry[] = [
  {
    id: "breast_recon_diep",
    displayName: "DIEP flap breast reconstruction",
    snomedCtCode: "234294006",
    snomedCtDisplay:
      "Free deep inferior epigastric perforator flap (procedure)",
    specialties: ["breast"],
    subcategory: "Autologous Reconstruction",
    tags: ["free_flap", "microsurgery", "oncological"],
    hasFreeFlap: true,
    sortOrder: 1,
  },
  {
    id: "breast_recon_tram_free",
    displayName: "Free TRAM flap breast reconstruction",
    snomedCtCode: "446078000",
    snomedCtDisplay:
      "Free transverse rectus abdominis myocutaneous flap (procedure)",
    specialties: ["breast"],
    subcategory: "Autologous Reconstruction",
    tags: ["free_flap", "microsurgery", "oncological"],
    hasFreeFlap: true,
    sortOrder: 2,
  },
  {
    id: "breast_recon_tram_pedicled",
    displayName: "Pedicled TRAM flap breast reconstruction",
    snomedCtCode: "446078000", // VERIFY — may have pedicled-specific code
    snomedCtDisplay:
      "Pedicled transverse rectus abdominis myocutaneous flap (procedure)",
    specialties: ["breast"],
    subcategory: "Autologous Reconstruction",
    tags: ["pedicled_flap", "oncological"],
    sortOrder: 3,
  },
  {
    id: "breast_recon_ld_implant",
    displayName: "Pedicled LD flap ± implant breast reconstruction",
    snomedCtCode: "234281001",
    snomedCtDisplay: "Pedicled latissimus dorsi flap (procedure)",
    specialties: ["breast"],
    subcategory: "Autologous Reconstruction",
    tags: ["pedicled_flap", "oncological"],
    sortOrder: 4,
  },
  {
    id: "breast_recon_sgap",
    displayName: "SGAP flap breast reconstruction",
    snomedCtCode: "234301003", // VERIFY
    snomedCtDisplay: "Free superior gluteal artery perforator flap (procedure)",
    specialties: ["breast"],
    subcategory: "Autologous Reconstruction",
    tags: ["free_flap", "microsurgery", "oncological"],
    hasFreeFlap: true,
    sortOrder: 5,
  },
  {
    id: "breast_recon_igap",
    displayName: "IGAP flap breast reconstruction",
    snomedCtCode: "234302005", // VERIFY
    snomedCtDisplay: "Free inferior gluteal artery perforator flap (procedure)",
    specialties: ["breast"],
    subcategory: "Autologous Reconstruction",
    tags: ["free_flap", "microsurgery", "oncological"],
    hasFreeFlap: true,
    sortOrder: 6,
  },
  {
    id: "breast_recon_siea",
    displayName: "SIEA flap breast reconstruction",
    snomedCtCode: "234300002",
    snomedCtDisplay:
      "Free superficial inferior epigastric artery flap (procedure)",
    specialties: ["breast"],
    subcategory: "Autologous Reconstruction",
    tags: ["free_flap", "microsurgery", "oncological"],
    hasFreeFlap: true,
    sortOrder: 7,
  },
  {
    id: "breast_recon_stacked",
    displayName: "Stacked / bipedicled flap breast reconstruction",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Stacked free flap breast reconstruction (procedure)",
    specialties: ["breast"],
    subcategory: "Autologous Reconstruction",
    tags: ["free_flap", "microsurgery", "oncological"],
    hasFreeFlap: true,
    sortOrder: 8,
  },
  {
    id: "breast_recon_scip",
    displayName: "SCIP flap breast reconstruction",
    snomedCtCode: "234299000",
    snomedCtDisplay:
      "Free superficial circumflex iliac artery flap (procedure)",
    specialties: ["breast"],
    subcategory: "Autologous Reconstruction",
    tags: ["free_flap", "microsurgery", "oncological"],
    hasFreeFlap: true,
    sortOrder: 9,
  },
];

const BREAST_IMPLANT_RECON: ProcedurePicklistEntry[] = [
  {
    id: "breast_impl_expander_insertion",
    displayName: "Tissue expander insertion",
    snomedCtCode: "384692006", // VERIFY
    snomedCtDisplay: "Insertion of tissue expander into breast (procedure)",
    specialties: ["breast"],
    subcategory: "Implant-Based Reconstruction",
    tags: ["oncological"],
    sortOrder: 1,
  },
  {
    id: "breast_impl_dti",
    displayName: "Direct-to-implant reconstruction",
    snomedCtCode: "69031006",
    snomedCtDisplay: "Insertion of breast prosthesis (procedure)",
    specialties: ["breast"],
    subcategory: "Implant-Based Reconstruction",
    tags: ["oncological"],
    sortOrder: 2,
  },
  {
    id: "breast_impl_expander_to_implant",
    displayName: "Expander-to-implant exchange",
    snomedCtCode: "69031006", // VERIFY
    snomedCtDisplay:
      "Exchange of tissue expander for permanent implant (procedure)",
    specialties: ["breast"],
    subcategory: "Implant-Based Reconstruction",
    tags: ["oncological", "revision"],
    sortOrder: 3,
  },
  {
    id: "breast_impl_adm_assisted",
    displayName: "ADM-assisted implant reconstruction",
    snomedCtCode: "69031006", // VERIFY
    snomedCtDisplay:
      "Acellular dermal matrix assisted breast reconstruction (procedure)",
    specialties: ["breast"],
    subcategory: "Implant-Based Reconstruction",
    tags: ["oncological"],
    sortOrder: 4,
  },
  {
    id: "breast_impl_prepectoral",
    displayName: "Prepectoral implant reconstruction",
    snomedCtCode: "69031006", // VERIFY
    snomedCtDisplay:
      "Prepectoral breast reconstruction with implant (procedure)",
    specialties: ["breast"],
    subcategory: "Implant-Based Reconstruction",
    tags: ["oncological"],
    sortOrder: 5,
  },
  {
    id: "breast_impl_combined_autologous",
    displayName: "Combined autologous + implant reconstruction",
    snomedCtCode: "69031006", // VERIFY
    snomedCtDisplay:
      "Combined autologous and implant breast reconstruction (procedure)",
    specialties: ["breast"],
    subcategory: "Implant-Based Reconstruction",
    tags: ["oncological", "pedicled_flap"],
    sortOrder: 6,
  },
];

const BREAST_ONCOPLASTIC: ProcedurePicklistEntry[] = [
  {
    id: "breast_onco_therapeutic_mammoplasty",
    displayName: "Therapeutic mammoplasty (oncoplastic excision + reshaping)",
    snomedCtCode: "392090004", // VERIFY
    snomedCtDisplay: "Therapeutic mammoplasty (procedure)",
    specialties: ["breast"],
    subcategory: "Oncoplastic Surgery",
    tags: ["oncological"],
    sortOrder: 1,
  },
  {
    id: "breast_onco_volume_displacement",
    displayName: "Volume displacement technique",
    snomedCtCode: "392090004", // VERIFY
    snomedCtDisplay:
      "Oncoplastic breast surgery — volume displacement (procedure)",
    specialties: ["breast"],
    subcategory: "Oncoplastic Surgery",
    tags: ["oncological"],
    sortOrder: 2,
  },
  {
    id: "breast_onco_volume_replacement",
    displayName: "Volume replacement technique (LD / local perforator flap)",
    snomedCtCode: "392090004", // VERIFY
    snomedCtDisplay:
      "Oncoplastic breast surgery — volume replacement (procedure)",
    specialties: ["breast"],
    subcategory: "Oncoplastic Surgery",
    tags: ["oncological", "pedicled_flap"],
    sortOrder: 3,
  },
  {
    id: "breast_onco_ssm",
    displayName: "Skin-sparing mastectomy + immediate reconstruction",
    snomedCtCode: "428564008", // VERIFY
    snomedCtDisplay: "Skin-sparing mastectomy (procedure)",
    specialties: ["breast"],
    subcategory: "Oncoplastic Surgery",
    tags: ["oncological"],
    sortOrder: 4,
  },
  {
    id: "breast_onco_nsm",
    displayName: "Nipple-sparing mastectomy + immediate reconstruction",
    snomedCtCode: "726429001", // VERIFY
    snomedCtDisplay: "Nipple-sparing mastectomy (procedure)",
    specialties: ["breast"],
    subcategory: "Oncoplastic Surgery",
    tags: ["oncological"],
    sortOrder: 5,
  },
  {
    id: "breast_onco_contralateral_symmetrisation",
    displayName:
      "Contralateral symmetrisation (reduction / mastopexy / augmentation)",
    snomedCtCode: "64368001",
    snomedCtDisplay: "Reduction mammoplasty (procedure)",
    specialties: ["breast"],
    subcategory: "Oncoplastic Surgery",
    tags: ["oncological", "elective"],
    sortOrder: 6,
  },
];

const BREAST_AESTHETIC: ProcedurePicklistEntry[] = [
  {
    id: "breast_aes_augmentation_implant",
    displayName: "Breast augmentation — implant",
    snomedCtCode: "69031006",
    snomedCtDisplay: "Augmentation mammoplasty (procedure)",
    specialties: ["breast", "aesthetics"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "breast_aes_augmentation_fat",
    displayName: "Breast augmentation — fat transfer",
    snomedCtCode: "37834008", // VERIFY
    snomedCtDisplay: "Lipofilling breast augmentation (procedure)",
    specialties: ["breast", "aesthetics"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "breast_aes_reduction_wise",
    displayName: "Breast reduction — Wise pattern (inverted-T)",
    snomedCtCode: "64368001",
    snomedCtDisplay: "Reduction mammoplasty (procedure)",
    specialties: ["breast"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "breast_aes_reduction_vertical",
    displayName: "Breast reduction — vertical scar",
    snomedCtCode: "64368001",
    snomedCtDisplay: "Reduction mammoplasty (procedure)",
    specialties: ["breast"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "breast_aes_reduction_superomedial",
    displayName: "Breast reduction — superomedial pedicle",
    snomedCtCode: "64368001",
    snomedCtDisplay: "Reduction mammoplasty (procedure)",
    specialties: ["breast"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 5,
  },
  {
    id: "breast_aes_mastopexy_periareolar",
    displayName: "Mastopexy — periareolar (Benelli)",
    snomedCtCode: "172158009", // VERIFY
    snomedCtDisplay: "Mastopexy (procedure)",
    specialties: ["breast"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "breast_aes_mastopexy_vertical",
    displayName: "Mastopexy — vertical scar",
    snomedCtCode: "172158009", // VERIFY
    snomedCtDisplay: "Mastopexy (procedure)",
    specialties: ["breast"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 7,
  },
  {
    id: "breast_aes_mastopexy_wise",
    displayName: "Mastopexy — Wise pattern (inverted-T)",
    snomedCtCode: "172158009", // VERIFY
    snomedCtDisplay: "Mastopexy (procedure)",
    specialties: ["breast"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 8,
  },
  {
    id: "breast_aes_augmentation_mastopexy",
    displayName: "Augmentation-mastopexy",
    snomedCtCode: "392090004",
    snomedCtDisplay: "Operative procedure on breast (procedure)",
    specialties: ["breast", "aesthetics"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 9,
  },
  {
    id: "breast_aes_gynaecomastia",
    displayName: "Gynaecomastia surgery (liposuction ± excision)",
    snomedCtCode: "45187007", // VERIFY
    snomedCtDisplay: "Excision of gynaecomastia (procedure)",
    specialties: ["breast", "aesthetics"],
    subcategory: "Aesthetic Breast",
    tags: ["elective"],
    sortOrder: 10,
  },
];

const BREAST_NIPPLE: ProcedurePicklistEntry[] = [
  {
    id: "breast_nipple_reconstruction",
    displayName: "Nipple reconstruction (local flap)",
    snomedCtCode: "172230009", // VERIFY
    snomedCtDisplay: "Reconstruction of nipple (procedure)",
    specialties: ["breast"],
    subcategory: "Nipple & Areola",
    tags: ["oncological"],
    sortOrder: 1,
  },
  {
    id: "breast_nipple_tattooing",
    displayName: "Nipple-areola tattooing",
    snomedCtCode: "172230009", // VERIFY
    snomedCtDisplay: "Nipple areola tattooing (procedure)",
    specialties: ["breast"],
    subcategory: "Nipple & Areola",
    tags: ["oncological"],
    sortOrder: 2,
  },
  {
    id: "breast_nipple_inverted_correction",
    displayName: "Inverted nipple correction",
    snomedCtCode: "172230009", // VERIFY
    snomedCtDisplay: "Correction of inverted nipple (procedure)",
    specialties: ["breast"],
    subcategory: "Nipple & Areola",
    tags: ["elective"],
    sortOrder: 3,
  },
];

const BREAST_REVISION: ProcedurePicklistEntry[] = [
  {
    id: "breast_rev_capsulectomy_partial",
    displayName: "Capsulectomy — partial",
    snomedCtCode: "285183003", // VERIFY
    snomedCtDisplay: "Capsulectomy of breast (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["revision"],
    sortOrder: 1,
  },
  {
    id: "breast_rev_capsulectomy_total",
    displayName: "Capsulectomy — total",
    snomedCtCode: "285183003", // VERIFY
    snomedCtDisplay: "Total capsulectomy of breast (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["revision"],
    sortOrder: 2,
  },
  {
    id: "breast_rev_capsulectomy_en_bloc",
    displayName: "Capsulectomy — en bloc",
    snomedCtCode: "285183003", // VERIFY
    snomedCtDisplay: "En bloc capsulectomy of breast (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["revision"],
    sortOrder: 3,
  },
  {
    id: "breast_rev_capsulotomy",
    displayName: "Capsulotomy",
    snomedCtCode: "39853008", // VERIFY
    snomedCtDisplay: "Capsulotomy of breast (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["revision"],
    sortOrder: 4,
  },
  {
    id: "breast_rev_implant_removal",
    displayName: "Implant removal ± capsulectomy",
    snomedCtCode: "69130005",
    snomedCtDisplay: "Removal of breast prosthesis (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["revision"],
    sortOrder: 5,
  },
  {
    id: "breast_rev_implant_exchange",
    displayName: "Implant exchange (size / type change)",
    snomedCtCode: "69130005", // VERIFY
    snomedCtDisplay: "Exchange of breast prosthesis (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["revision"],
    sortOrder: 6,
  },
  {
    id: "breast_rev_fat_grafting",
    displayName: "Fat grafting to breast",
    snomedCtCode: "37834008", // VERIFY
    snomedCtDisplay: "Lipofilling to breast (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["revision", "elective"],
    sortOrder: 7,
  },
  {
    id: "breast_rev_tuberous_correction",
    displayName: "Tuberous breast correction",
    snomedCtCode: "392090004",
    snomedCtDisplay: "Operative procedure on breast (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["elective"],
    sortOrder: 8,
  },
  {
    id: "breast_rev_poland_correction",
    displayName: "Poland syndrome correction",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Reconstruction for Poland syndrome (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["elective"],
    sortOrder: 9,
  },
  {
    id: "breast_rev_flap_revision",
    displayName: "Autologous breast reconstruction revision / debulking",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Revision of breast reconstruction (procedure)",
    specialties: ["breast"],
    subcategory: "Revision & Other",
    tags: ["revision"],
    sortOrder: 10,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// BURNS (~40 total visible: ~34 dedicated + ~6 cross-tagged)
// Cross-tagged from Orthoplastic: STSG meshed/sheet, dermal substitute,
//   surgical debridement, NPWT
// Cross-tagged from H&N: tracheostomy
// ═══════════════════════════════════════════════════════════════════════════

const BURNS_ACUTE: ProcedurePicklistEntry[] = [
  {
    id: "burns_acute_escharotomy",
    displayName: "Escharotomy",
    snomedCtCode: "76743000",
    snomedCtDisplay: "Escharotomy (procedure)",
    specialties: ["burns"],
    subcategory: "Acute Burns Management",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "burns_acute_fasciotomy",
    displayName: "Fasciotomy — burns",
    snomedCtCode: "81121007",
    snomedCtDisplay: "Fasciotomy (procedure)",
    specialties: ["burns"],
    subcategory: "Acute Burns Management",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "burns_acute_tangential_excision",
    displayName: "Tangential excision (burn wound)",
    snomedCtCode: "36777000", // VERIFY — debridement parent
    snomedCtDisplay: "Tangential excision of burn (procedure)",
    specialties: ["burns"],
    subcategory: "Acute Burns Management",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "burns_acute_fascial_excision",
    displayName: "Fascial excision (deep burn)",
    snomedCtCode: "36777000", // VERIFY
    snomedCtDisplay: "Fascial excision of burn (procedure)",
    specialties: ["burns"],
    subcategory: "Acute Burns Management",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "burns_acute_wound_dressing",
    displayName: "Burns wound dressing / biological dressing",
    snomedCtCode: "182531007", // VERIFY
    snomedCtDisplay: "Application of wound dressing (procedure)",
    specialties: ["burns"],
    subcategory: "Acute Burns Management",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "burns_acute_amputation",
    displayName: "Amputation — non-salvageable burn limb",
    snomedCtCode: "81723002", // VERIFY
    snomedCtDisplay: "Amputation (procedure)",
    specialties: ["burns"],
    subcategory: "Acute Burns Management",
    tags: ["trauma"],
    sortOrder: 6,
  },
];

const BURNS_SKIN_GRAFT: ProcedurePicklistEntry[] = [
  {
    id: "burns_graft_meek",
    displayName: "Meek micrografting",
    snomedCtCode: "14413003", // VERIFY
    snomedCtDisplay: "Meek micrografting (procedure)",
    specialties: ["burns"],
    subcategory: "Skin Grafting for Burns",
    tags: ["skin_graft"],
    sortOrder: 1,
  },
  {
    id: "burns_graft_cea",
    displayName: "Cultured epithelial autograft (CEA)",
    snomedCtCode: "14413003", // VERIFY
    snomedCtDisplay: "Application of cultured epithelial autograft (procedure)",
    specialties: ["burns"],
    subcategory: "Skin Grafting for Burns",
    tags: ["skin_graft"],
    sortOrder: 2,
  },
  {
    id: "burns_graft_dermal_substitute",
    displayName: "Dermal substitute application (Integra / Matriderm / BTM)",
    snomedCtCode: "14413003", // VERIFY
    snomedCtDisplay: "Application of dermal substitute (procedure)",
    specialties: ["burns"],
    subcategory: "Skin Grafting for Burns",
    tags: ["skin_graft", "complex_wound"],
    sortOrder: 3,
  },
  {
    id: "burns_graft_xenograft",
    displayName: "Xenograft / allograft (temporary biological cover)",
    snomedCtCode: "14413003", // VERIFY
    snomedCtDisplay: "Application of biological dressing (procedure)",
    specialties: ["burns"],
    subcategory: "Skin Grafting for Burns",
    tags: ["skin_graft"],
    sortOrder: 4,
  },
];

const BURNS_RECONSTRUCTION: ProcedurePicklistEntry[] = [
  {
    id: "burns_recon_contracture_zplasty",
    displayName: "Burn contracture release — Z-plasty",
    snomedCtCode: "13760004",
    snomedCtDisplay: "Z-plasty (procedure)",
    specialties: ["burns"],
    subcategory: "Burns Reconstruction",
    tags: ["local_flap", "revision"],
    sortOrder: 1,
  },
  {
    id: "burns_recon_contracture_graft",
    displayName: "Burn contracture release — skin graft",
    snomedCtCode: "14413003",
    snomedCtDisplay: "Skin graft for burn contracture (procedure)",
    specialties: ["burns"],
    subcategory: "Burns Reconstruction",
    tags: ["skin_graft", "revision"],
    sortOrder: 2,
  },
  {
    id: "burns_recon_contracture_local_flap",
    displayName: "Burn contracture release — local flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["burns"],
    subcategory: "Burns Reconstruction",
    tags: ["local_flap", "revision"],
    sortOrder: 3,
  },
  {
    id: "burns_recon_contracture_regional_flap",
    displayName: "Burn contracture release — regional / pedicled flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["burns"],
    subcategory: "Burns Reconstruction",
    tags: ["pedicled_flap", "revision"],
    sortOrder: 4,
  },
  {
    id: "burns_recon_contracture_free_flap",
    displayName: "Burn contracture release — free flap",
    snomedCtCode: "122462001",
    snomedCtDisplay: "Flap reconstruction (procedure)",
    specialties: ["burns"],
    subcategory: "Burns Reconstruction",
    tags: ["free_flap", "microsurgery", "revision"],
    hasFreeFlap: true,
    sortOrder: 5,
  },
  {
    id: "burns_recon_scar_excision",
    displayName: "Burn scar excision + direct closure / graft",
    snomedCtCode: "234140001",
    snomedCtDisplay: "Revision of scar (procedure)",
    specialties: ["burns"],
    subcategory: "Burns Reconstruction",
    tags: ["revision"],
    sortOrder: 6,
  },
  {
    id: "burns_recon_web_space",
    displayName: "Web space reconstruction (hand / neck)",
    snomedCtCode: "122462001", // VERIFY
    snomedCtDisplay: "Reconstruction of web space (procedure)",
    specialties: ["burns"],
    subcategory: "Burns Reconstruction",
    tags: ["local_flap", "revision"],
    sortOrder: 7,
  },
  {
    id: "burns_recon_tissue_expansion",
    displayName: "Tissue expansion for burns reconstruction",
    snomedCtCode: "61218004", // VERIFY
    snomedCtDisplay: "Tissue expansion (procedure)",
    specialties: ["burns"],
    subcategory: "Burns Reconstruction",
    tags: ["elective", "revision"],
    sortOrder: 8,
  },
];

const BURNS_SITE_SPECIFIC: ProcedurePicklistEntry[] = [
  {
    id: "burns_site_hand",
    displayName: "Burns surgery — hand (acute / reconstruction)",
    snomedCtCode: "89658006",
    snomedCtDisplay: "Treatment of burn (procedure)",
    specialties: ["burns"],
    subcategory: "Site-Specific Burns",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "burns_site_face",
    displayName: "Burns surgery — face (acute / reconstruction)",
    snomedCtCode: "89658006",
    snomedCtDisplay: "Treatment of burn (procedure)",
    specialties: ["burns"],
    subcategory: "Site-Specific Burns",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "burns_site_perineal",
    displayName: "Burns surgery — perineal",
    snomedCtCode: "89658006",
    snomedCtDisplay: "Treatment of burn (procedure)",
    specialties: ["burns"],
    subcategory: "Site-Specific Burns",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "burns_site_paediatric",
    displayName: "Paediatric burns surgery",
    snomedCtCode: "89658006",
    snomedCtDisplay: "Treatment of burn (procedure)",
    specialties: ["burns"],
    subcategory: "Site-Specific Burns",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "burns_site_chemical",
    displayName: "Chemical burn management",
    snomedCtCode: "73553004",
    snomedCtDisplay: "Treatment of chemical burn (procedure)",
    specialties: ["burns"],
    subcategory: "Site-Specific Burns",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "burns_site_electrical",
    displayName: "Electrical burn management",
    snomedCtCode: "409580007",
    snomedCtDisplay: "Treatment of electrical burn (procedure)",
    specialties: ["burns"],
    subcategory: "Site-Specific Burns",
    tags: ["trauma"],
    sortOrder: 6,
  },
];

const BURNS_SCAR_TREATMENT: ProcedurePicklistEntry[] = [
  {
    id: "burns_scar_laser",
    displayName: "Laser treatment — burn scar (fractional / pulsed dye)",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Laser therapy for burn scar (procedure)",
    specialties: ["burns"],
    subcategory: "Burn Scar Treatment",
    tags: ["elective", "revision"],
    sortOrder: 1,
  },
  {
    id: "burns_scar_steroid_injection",
    displayName: "Intralesional steroid injection — burn scar",
    snomedCtCode: "91602001", // VERIFY
    snomedCtDisplay: "Injection of steroid into scar (procedure)",
    specialties: ["burns"],
    subcategory: "Burn Scar Treatment",
    tags: ["elective", "revision"],
    sortOrder: 2,
  },
  {
    id: "burns_scar_fat_grafting",
    displayName: "Fat grafting — burn scar",
    snomedCtCode: "37834008", // VERIFY
    snomedCtDisplay: "Lipofilling for burn scar (procedure)",
    specialties: ["burns"],
    subcategory: "Burn Scar Treatment",
    tags: ["elective", "revision"],
    sortOrder: 3,
  },
  {
    id: "burns_scar_microneedling",
    displayName: "Microneedling — burn scar",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Microneedling for burn scar (procedure)",
    specialties: ["burns"],
    subcategory: "Burn Scar Treatment",
    tags: ["elective", "revision"],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// AESTHETICS (~65 total visible: ~61 dedicated + ~4 cross-tagged)
// Cross-tagged from Breast: augmentation implant/fat, augmentation-mastopexy,
//   gynaecomastia
// ═══════════════════════════════════════════════════════════════════════════

const AESTHETICS_FACELIFT: ProcedurePicklistEntry[] = [
  {
    id: "aes_face_smas_facelift",
    displayName: "SMAS facelift (rhytidectomy)",
    snomedCtCode: "54516008",
    snomedCtDisplay: "Rhytidectomy (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "aes_face_deep_plane",
    displayName: "Deep plane facelift",
    snomedCtCode: "54516008",
    snomedCtDisplay: "Rhytidectomy (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "aes_face_mini_facelift",
    displayName: "Mini facelift / short-scar facelift (MACS)",
    snomedCtCode: "54516008",
    snomedCtDisplay: "Rhytidectomy (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "aes_face_neck_lift",
    displayName: "Neck lift (platysmaplasty ± submentoplasty)",
    snomedCtCode: "54516008", // VERIFY
    snomedCtDisplay: "Platysmaplasty (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "aes_face_upper_bleph",
    displayName: "Upper blepharoplasty",
    snomedCtCode: "75732000",
    snomedCtDisplay: "Blepharoplasty of upper eyelid (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 5,
  },
  {
    id: "aes_face_lower_bleph",
    displayName: "Lower blepharoplasty (transconjunctival / transcutaneous)",
    snomedCtCode: "23420007",
    snomedCtDisplay: "Blepharoplasty of lower eyelid (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "aes_face_brow_lift_endoscopic",
    displayName: "Brow lift — endoscopic",
    snomedCtCode: "239124000", // VERIFY
    snomedCtDisplay: "Endoscopic brow lift (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 7,
  },
  {
    id: "aes_face_brow_lift_open",
    displayName: "Brow lift — open (coronal / pretrichial)",
    snomedCtCode: "239124000", // VERIFY
    snomedCtDisplay: "Open brow lift (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 8,
  },
  {
    id: "aes_face_fat_transfer",
    displayName: "Facial fat transfer / lipofilling",
    snomedCtCode: "37834008", // VERIFY
    snomedCtDisplay: "Lipofilling of face (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 9,
  },
  {
    id: "aes_face_thread_lift",
    displayName: "Thread lift",
    snomedCtCode: "286553006",
    snomedCtDisplay: "Plastic operation on face (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Facial Rejuvenation",
    tags: ["elective"],
    sortOrder: 10,
  },
];

const AESTHETICS_RHINOPLASTY: ProcedurePicklistEntry[] = [
  {
    id: "aes_rhino_open",
    displayName: "Rhinoplasty — open",
    snomedCtCode: "62961003",
    snomedCtDisplay: "Rhinoplasty (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Rhinoplasty",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "aes_rhino_closed",
    displayName: "Rhinoplasty — closed (endonasal)",
    snomedCtCode: "62961003",
    snomedCtDisplay: "Rhinoplasty (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Rhinoplasty",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "aes_rhino_revision",
    displayName: "Revision rhinoplasty",
    snomedCtCode: "62961003", // VERIFY
    snomedCtDisplay: "Revision rhinoplasty (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Rhinoplasty",
    tags: ["revision", "elective"],
    sortOrder: 3,
  },
  {
    id: "aes_rhino_septorhinoplasty",
    displayName: "Septorhinoplasty (functional + aesthetic)",
    snomedCtCode: "62961003", // VERIFY
    snomedCtDisplay: "Septorhinoplasty (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Rhinoplasty",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "aes_rhino_tip",
    displayName: "Tip rhinoplasty / alarplasty",
    snomedCtCode: "62961003", // VERIFY
    snomedCtDisplay: "Tip rhinoplasty (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Rhinoplasty",
    tags: ["elective"],
    sortOrder: 5,
  },
];

const AESTHETICS_OTOPLASTY: ProcedurePicklistEntry[] = [
  {
    id: "aes_oto_prominent_ear",
    displayName: "Otoplasty — prominent ear correction (Mustardé / Converse)",
    snomedCtCode: "52860005",
    snomedCtDisplay: "Otoplasty (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Otoplasty",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "aes_oto_earlobe_reduction",
    displayName: "Earlobe reduction / repair",
    snomedCtCode: "52860005", // VERIFY
    snomedCtDisplay: "Otoplasty — earlobe (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Otoplasty",
    tags: ["elective"],
    sortOrder: 2,
  },
];

const AESTHETICS_INJECTABLES: ProcedurePicklistEntry[] = [
  {
    id: "aes_inj_botox_upper_face",
    displayName:
      "Botulinum toxin — upper face (glabella / forehead / crow's feet)",
    snomedCtCode: "442695005",
    snomedCtDisplay: "Injection of botulinum toxin (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "aes_inj_botox_lower_face",
    displayName:
      "Botulinum toxin — lower face / neck (masseter / platysma / lip)",
    snomedCtCode: "442695005",
    snomedCtDisplay: "Injection of botulinum toxin (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "aes_inj_botox_hyperhidrosis",
    displayName: "Botulinum toxin — hyperhidrosis (axillary / palmar)",
    snomedCtCode: "442695005",
    snomedCtDisplay: "Injection of botulinum toxin (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "aes_inj_filler_midface",
    displayName: "Dermal filler — midface / cheeks",
    snomedCtCode: "787876008",
    snomedCtDisplay: "Injection of dermal filler (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "aes_inj_filler_lips",
    displayName: "Dermal filler — lips",
    snomedCtCode: "787876008",
    snomedCtDisplay: "Injection of dermal filler (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 5,
  },
  {
    id: "aes_inj_filler_nasolabial",
    displayName: "Dermal filler — nasolabial folds / marionette lines",
    snomedCtCode: "787876008",
    snomedCtDisplay: "Injection of dermal filler (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "aes_inj_filler_jawline_chin",
    displayName: "Dermal filler — jawline / chin",
    snomedCtCode: "787876008",
    snomedCtDisplay: "Injection of dermal filler (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 7,
  },
  {
    id: "aes_inj_filler_tear_trough",
    displayName: "Dermal filler — tear trough",
    snomedCtCode: "787876008",
    snomedCtDisplay: "Injection of dermal filler (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 8,
  },
  {
    id: "aes_inj_filler_temples",
    displayName: "Dermal filler — temples",
    snomedCtCode: "787876008",
    snomedCtDisplay: "Injection of dermal filler (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 9,
  },
  {
    id: "aes_inj_filler_hands",
    displayName: "Dermal filler — hands",
    snomedCtCode: "787876008",
    snomedCtDisplay: "Injection of dermal filler (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 10,
  },
  {
    id: "aes_inj_filler_dissolve",
    displayName: "Hyaluronidase injection (filler dissolution)",
    snomedCtCode: "787876008",
    snomedCtDisplay: "Injection of hyaluronidase (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective", "revision"],
    sortOrder: 11,
  },
  {
    id: "aes_inj_prp",
    displayName: "PRP injection — face / scalp",
    snomedCtCode: "13413003", // VERIFY
    snomedCtDisplay: "Platelet-rich plasma injection (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Injectables",
    tags: ["elective"],
    sortOrder: 12,
  },
];

const AESTHETICS_SKIN_RESURFACING: ProcedurePicklistEntry[] = [
  {
    id: "aes_skin_chemical_peel_superficial",
    displayName: "Chemical peel — superficial (glycolic / salicylic)",
    snomedCtCode: "31956003", // VERIFY
    snomedCtDisplay: "Chemical peel of skin (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "aes_skin_chemical_peel_medium",
    displayName: "Chemical peel — medium (TCA)",
    snomedCtCode: "31956003", // VERIFY
    snomedCtDisplay: "Chemical peel of skin (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "aes_skin_chemical_peel_deep",
    displayName: "Chemical peel — deep (phenol)",
    snomedCtCode: "31956003", // VERIFY
    snomedCtDisplay: "Chemical peel of skin (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "aes_skin_laser_ablative",
    displayName: "Laser resurfacing — ablative (CO₂ / Er:YAG)",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Ablative laser resurfacing (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "aes_skin_laser_fractional",
    displayName: "Laser resurfacing — fractional (non-ablative / ablative)",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Fractional laser resurfacing (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 5,
  },
  {
    id: "aes_skin_laser_ipl",
    displayName: "IPL (intense pulsed light) treatment",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Intense pulsed light therapy (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "aes_skin_laser_vascular",
    displayName: "Vascular laser (pulsed dye / Nd:YAG)",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Vascular laser therapy (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 7,
  },
  {
    id: "aes_skin_laser_pigment",
    displayName: "Pigment laser (Q-switched / picosecond)",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Pigment laser therapy (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 8,
  },
  {
    id: "aes_skin_microneedling",
    displayName: "Microneedling ± PRP",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Microneedling (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 9,
  },
  {
    id: "aes_skin_dermabrasion",
    displayName: "Dermabrasion",
    snomedCtCode: "37744006",
    snomedCtDisplay: "Dermabrasion (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Skin Resurfacing",
    tags: ["elective"],
    sortOrder: 10,
  },
];

const AESTHETICS_HAIR: ProcedurePicklistEntry[] = [
  {
    id: "aes_hair_fut",
    displayName: "Hair transplant — FUT (strip)",
    snomedCtCode: "79250004", // VERIFY
    snomedCtDisplay: "Hair transplantation (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Hair Restoration",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "aes_hair_fue",
    displayName: "Hair transplant — FUE",
    snomedCtCode: "79250004", // VERIFY
    snomedCtDisplay: "Follicular unit extraction (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Hair Restoration",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "aes_hair_eyebrow",
    displayName: "Eyebrow restoration / transplant",
    snomedCtCode: "79250004", // VERIFY
    snomedCtDisplay: "Hair transplantation — eyebrow (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Hair Restoration",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "aes_hair_scar_excision",
    displayName: "Scalp scar revision / alopecia surgery",
    snomedCtCode: "234140001", // VERIFY
    snomedCtDisplay: "Scar revision of scalp (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Hair Restoration",
    tags: ["elective", "revision"],
    sortOrder: 4,
  },
];

const AESTHETICS_BODY: ProcedurePicklistEntry[] = [
  {
    id: "aes_body_liposuction",
    displayName: "Liposuction (any site — specify in notes)",
    snomedCtCode: "302441008",
    snomedCtDisplay: "Liposuction (procedure)",
    specialties: ["aesthetics", "body_contouring"],
    subcategory: "Body Aesthetics",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "aes_body_liposuction_hd",
    displayName: "High-definition liposuction / VASER",
    snomedCtCode: "302441008", // VERIFY
    snomedCtDisplay: "Ultrasound-assisted liposuction (procedure)",
    specialties: ["aesthetics", "body_contouring"],
    subcategory: "Body Aesthetics",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "aes_body_fat_transfer_buttock",
    displayName: "Fat transfer — buttock (BBL)",
    snomedCtCode: "37834008", // VERIFY
    snomedCtDisplay: "Lipofilling of buttock (procedure)",
    specialties: ["aesthetics", "body_contouring"],
    subcategory: "Body Aesthetics",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "aes_body_labiaplasty",
    displayName: "Labiaplasty",
    snomedCtCode: "176275007", // VERIFY
    snomedCtDisplay: "Labiaplasty (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Body Aesthetics",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "aes_body_scar_revision",
    displayName: "Scar revision — body (excision / dermabrasion / laser)",
    snomedCtCode: "234140001",
    snomedCtDisplay: "Revision of scar (procedure)",
    specialties: ["aesthetics", "general"],
    subcategory: "Body Aesthetics",
    tags: ["elective", "revision"],
    sortOrder: 5,
  },
  {
    id: "aes_body_tattoo_removal",
    displayName: "Tattoo removal (laser)",
    snomedCtCode: "122456005", // VERIFY
    snomedCtDisplay: "Laser tattoo removal (procedure)",
    specialties: ["aesthetics"],
    subcategory: "Body Aesthetics",
    tags: ["elective"],
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// BODY CONTOURING (~35 total visible: ~32 dedicated + ~3 cross-tagged)
// Cross-tagged from Aesthetics: liposuction, HD liposuction/VASER, BBL
// ═══════════════════════════════════════════════════════════════════════════

const BODY_CONTOUR_ABDOMINOPLASTY: ProcedurePicklistEntry[] = [
  {
    id: "bc_abdo_full",
    displayName: "Abdominoplasty — full (with muscle plication)",
    snomedCtCode: "72310004",
    snomedCtDisplay: "Abdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Abdominoplasty",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "bc_abdo_mini",
    displayName: "Mini abdominoplasty",
    snomedCtCode: "72310004", // VERIFY
    snomedCtDisplay: "Mini abdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Abdominoplasty",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "bc_abdo_extended",
    displayName: "Extended abdominoplasty (with lateral extension)",
    snomedCtCode: "72310004", // VERIFY
    snomedCtDisplay: "Extended abdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Abdominoplasty",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "bc_abdo_fleur_de_lis",
    displayName: "Fleur-de-lis abdominoplasty",
    snomedCtCode: "72310004", // VERIFY
    snomedCtDisplay: "Fleur-de-lis abdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Abdominoplasty",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "bc_abdo_reverse",
    displayName: "Reverse abdominoplasty",
    snomedCtCode: "72310004", // VERIFY
    snomedCtDisplay: "Reverse abdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Abdominoplasty",
    tags: ["elective"],
    sortOrder: 5,
  },
  {
    id: "bc_abdo_lipoabdominoplasty",
    displayName: "Lipoabdominoplasty",
    snomedCtCode: "72310004", // VERIFY
    snomedCtDisplay: "Lipoabdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Abdominoplasty",
    tags: ["elective"],
    sortOrder: 6,
  },
  {
    id: "bc_abdo_panniculectomy",
    displayName: "Panniculectomy (functional — non-cosmetic)",
    snomedCtCode: "86076005",
    snomedCtDisplay: "Panniculectomy (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Abdominoplasty",
    tags: ["elective"],
    sortOrder: 7,
  },
  {
    id: "bc_abdo_diastasis_repair",
    displayName: "Rectus diastasis repair (plication only — no skin excision)",
    snomedCtCode: "72310004", // VERIFY
    snomedCtDisplay: "Rectus abdominis plication (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Abdominoplasty",
    tags: ["elective"],
    sortOrder: 8,
  },
];

const BODY_CONTOUR_UPPER: ProcedurePicklistEntry[] = [
  {
    id: "bc_upper_brachioplasty",
    displayName: "Brachioplasty (arm lift)",
    snomedCtCode: "119954001",
    snomedCtDisplay: "Brachioplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Upper Body Contouring",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "bc_upper_brachioplasty_extended",
    displayName: "Extended brachioplasty (arm + lateral chest wall)",
    snomedCtCode: "119954001", // VERIFY
    snomedCtDisplay: "Extended brachioplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Upper Body Contouring",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "bc_upper_bra_line_lift",
    displayName: "Bra-line back lift (upper back excess)",
    snomedCtCode: "119954001",
    snomedCtDisplay: "Brachioplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Upper Body Contouring",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "bc_upper_axillary_roll",
    displayName: "Axillary roll excision",
    snomedCtCode: "119954001",
    snomedCtDisplay: "Brachioplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Upper Body Contouring",
    tags: ["elective"],
    sortOrder: 4,
  },
];

const BODY_CONTOUR_LOWER: ProcedurePicklistEntry[] = [
  {
    id: "bc_lower_thigh_lift_medial",
    displayName: "Thigh lift — medial",
    snomedCtCode: "392022003", // VERIFY
    snomedCtDisplay: "Thigh lift (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Lower Body Contouring",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "bc_lower_thigh_lift_lateral",
    displayName: "Thigh lift — lateral / spiral",
    snomedCtCode: "392022003", // VERIFY
    snomedCtDisplay: "Thigh lift (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Lower Body Contouring",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "bc_lower_belt_lipectomy",
    displayName: "Belt lipectomy (circumferential body lift)",
    snomedCtCode: "72310004",
    snomedCtDisplay: "Abdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Lower Body Contouring",
    tags: ["elective"],
    sortOrder: 3,
  },
  {
    id: "bc_lower_body_lift",
    displayName: "Lower body lift",
    snomedCtCode: "72310004",
    snomedCtDisplay: "Abdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Lower Body Contouring",
    tags: ["elective"],
    sortOrder: 4,
  },
  {
    id: "bc_lower_knee_lift",
    displayName: "Knee lift / periarticular contouring",
    snomedCtCode: "286553006",
    snomedCtDisplay: "Plastic operation (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Lower Body Contouring",
    tags: ["elective"],
    sortOrder: 5,
  },
];

const BODY_CONTOUR_BUTTOCK: ProcedurePicklistEntry[] = [
  {
    id: "bc_buttock_lift",
    displayName: "Buttock lift (excisional)",
    snomedCtCode: "72310004",
    snomedCtDisplay: "Abdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Buttock Procedures",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "bc_buttock_implant",
    displayName: "Buttock implant",
    snomedCtCode: "69031006", // VERIFY
    snomedCtDisplay: "Insertion of buttock prosthesis (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Buttock Procedures",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "bc_buttock_auto_augmentation",
    displayName: "Buttock auto-augmentation (local flap / de-epithelialised)",
    snomedCtCode: "72310004",
    snomedCtDisplay: "Abdominoplasty (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Buttock Procedures",
    tags: ["elective"],
    sortOrder: 3,
  },
];

const BODY_CONTOUR_POST_BARIATRIC: ProcedurePicklistEntry[] = [
  {
    id: "bc_postbar_combined_upper_lower",
    displayName: "Post-bariatric combined upper + lower body contouring",
    snomedCtCode: "72310004", // VERIFY
    snomedCtDisplay: "Post-bariatric body contouring (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Post-Bariatric",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "bc_postbar_mons_lift",
    displayName: "Mons pubis lift / reduction",
    snomedCtCode: "286553006",
    snomedCtDisplay: "Plastic operation (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Post-Bariatric",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "bc_postbar_skin_excision_other",
    displayName: "Redundant skin excision — other site (specify in notes)",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Excision of redundant skin (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Post-Bariatric",
    tags: ["elective"],
    sortOrder: 3,
  },
];

const BODY_CONTOUR_OTHER: ProcedurePicklistEntry[] = [
  {
    id: "bc_other_calf_implant",
    displayName: "Calf implant",
    snomedCtCode: "69031006", // VERIFY
    snomedCtDisplay: "Insertion of calf prosthesis (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Other Body Contouring",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "bc_other_pectoral_implant",
    displayName: "Pectoral implant",
    snomedCtCode: "69031006", // VERIFY
    snomedCtDisplay: "Insertion of pectoral prosthesis (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Other Body Contouring",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "bc_other_revision_scar",
    displayName: "Body contouring scar revision",
    snomedCtCode: "234140001",
    snomedCtDisplay: "Revision of scar (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Other Body Contouring",
    tags: ["revision", "elective"],
    sortOrder: 3,
  },
  {
    id: "bc_other_dog_ear_revision",
    displayName: "Dog-ear / skin excess revision",
    snomedCtCode: "234140001", // VERIFY
    snomedCtDisplay: "Revision of skin excess (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Other Body Contouring",
    tags: ["revision", "elective"],
    sortOrder: 4,
  },
  {
    id: "bc_other_seroma_management",
    displayName: "Seroma aspiration / capsulectomy (post-contouring)",
    snomedCtCode: "69794004",
    snomedCtDisplay: "Aspiration procedure (procedure)",
    specialties: ["body_contouring"],
    subcategory: "Other Body Contouring",
    tags: ["revision"],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CLEFT & CRANIOFACIAL — additional procedures beyond moved hn_cleft_* entries
// ═══════════════════════════════════════════════════════════════════════════

const CLEFT_CRANIO_ADDITIONAL: ProcedurePicklistEntry[] = [
  {
    id: "cc_cleft_rhinoplasty",
    displayName: "Cleft rhinoplasty (primary / secondary)",
    snomedCtCode: "172523009", // VERIFY
    snomedCtDisplay: "Rhinoplasty (procedure)",
    specialties: ["cleft_cranio"],
    subcategory: "Cleft Lip & Palate",
    tags: ["elective"],
    sortOrder: 20,
  },
  {
    id: "cc_fistula_repair",
    displayName: "Palatal fistula repair",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Repair of palatal fistula (procedure)",
    specialties: ["cleft_cranio"],
    subcategory: "Cleft Lip & Palate",
    tags: ["elective"],
    sortOrder: 21,
  },
  {
    id: "cc_pharyngoplasty",
    displayName: "Pharyngoplasty (sphincter / pharyngeal flap)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Pharyngoplasty (procedure)",
    specialties: ["cleft_cranio"],
    subcategory: "Cleft Lip & Palate",
    tags: ["elective"],
    sortOrder: 22,
  },
  {
    id: "cc_cranial_vault_remodel",
    displayName: "Cranial vault remodelling",
    snomedCtCode: "34713006", // VERIFY
    snomedCtDisplay: "Cranial vault remodeling (procedure)",
    specialties: ["cleft_cranio"],
    subcategory: "Craniofacial",
    tags: ["elective"],
    sortOrder: 30,
  },
  {
    id: "cc_fronto_orbital",
    displayName: "Fronto-orbital advancement",
    snomedCtCode: "34713006", // VERIFY
    snomedCtDisplay: "Fronto-orbital advancement (procedure)",
    specialties: ["cleft_cranio"],
    subcategory: "Craniofacial",
    tags: ["elective"],
    sortOrder: 31,
  },
  {
    id: "cc_midface_advancement",
    displayName: "Midface advancement / Le Fort III",
    snomedCtCode: "34713006", // VERIFY
    snomedCtDisplay: "Le Fort III osteotomy (procedure)",
    specialties: ["cleft_cranio"],
    subcategory: "Craniofacial",
    tags: ["elective"],
    sortOrder: 32,
  },
  {
    id: "cc_monobloc",
    displayName: "Monobloc advancement",
    snomedCtCode: "34713006", // VERIFY
    snomedCtDisplay: "Monobloc advancement (procedure)",
    specialties: ["cleft_cranio"],
    subcategory: "Craniofacial",
    tags: ["elective"],
    sortOrder: 33,
  },
  {
    id: "cc_mandibular_distraction",
    displayName: "Mandibular distraction osteogenesis",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Mandibular distraction osteogenesis (procedure)",
    specialties: ["cleft_cranio"],
    subcategory: "Craniofacial",
    tags: ["elective"],
    sortOrder: 34,
  },
  {
    id: "cc_craniofacial_microsomia",
    displayName: "Craniofacial microsomia reconstruction",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Reconstruction for craniofacial microsomia (procedure)",
    specialties: ["cleft_cranio"],
    subcategory: "Craniofacial",
    tags: ["elective"],
    sortOrder: 35,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// SKIN CANCER — additional procedures (rare types + completion LND)
// ═══════════════════════════════════════════════════════════════════════════

const SKIN_CANCER_ADDITIONAL: ProcedurePicklistEntry[] = [
  {
    id: "sc_afx_excision",
    displayName: "Atypical fibroxanthoma excision",
    snomedCtCode: "177300000", // VERIFY
    snomedCtDisplay: "Excision of atypical fibroxanthoma (procedure)",
    specialties: ["skin_cancer"],
    subcategory: "Rare Skin Cancers",
    tags: ["oncological"],
    sortOrder: 1,
  },
  {
    id: "sc_completion_lnd",
    displayName: "Completion lymph node dissection",
    snomedCtCode: "234262008", // VERIFY
    snomedCtDisplay: "Lymph node dissection (procedure)",
    specialties: ["skin_cancer", "head_neck"],
    subcategory: "Lymph Node Surgery",
    tags: ["oncological"],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// LYMPHOEDEMA — additional procedures beyond moved gen_lymph_* entries
// ═══════════════════════════════════════════════════════════════════════════

const LYMPHOEDEMA_ADDITIONAL: ProcedurePicklistEntry[] = [
  {
    id: "lymph_lva_upper",
    displayName: "Lymphovenous anastomosis (LVA) — upper limb",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Lymphovenous anastomosis of upper limb (procedure)",
    specialties: ["lymphoedema"],
    subcategory: "Physiological (LVA)",
    tags: ["microsurgery"],
    sortOrder: 1,
  },
  {
    id: "lymph_lva_lower",
    displayName: "Lymphovenous anastomosis (LVA) — lower limb",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Lymphovenous anastomosis of lower limb (procedure)",
    specialties: ["lymphoedema"],
    subcategory: "Physiological (LVA)",
    tags: ["microsurgery"],
    sortOrder: 2,
  },
  {
    id: "lymph_vlnt_groin",
    displayName: "VLNT — groin donor (SIEA/SCIP)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Vascularised lymph node transfer from groin (procedure)",
    specialties: ["lymphoedema"],
    subcategory: "Physiological (VLNT)",
    tags: ["free_flap", "microsurgery"],
    sortOrder: 1,
  },
  {
    id: "lymph_vlnt_submental",
    displayName: "VLNT — submental donor",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Vascularised lymph node transfer from submental region (procedure)",
    specialties: ["lymphoedema"],
    subcategory: "Physiological (VLNT)",
    tags: ["free_flap", "microsurgery"],
    sortOrder: 2,
  },
  {
    id: "lymph_vlnt_supraclavicular",
    displayName: "VLNT — supraclavicular donor",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Vascularised lymph node transfer from supraclavicular region (procedure)",
    specialties: ["lymphoedema"],
    subcategory: "Physiological (VLNT)",
    tags: ["free_flap", "microsurgery"],
    sortOrder: 3,
  },
  {
    id: "lymph_vlnt_omental",
    displayName: "VLNT — omental donor",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Vascularised omental lymph node transfer (procedure)",
    specialties: ["lymphoedema"],
    subcategory: "Physiological (VLNT)",
    tags: ["free_flap", "microsurgery"],
    sortOrder: 4,
  },
  {
    id: "lymph_combined_lva_vlnt",
    displayName: "Combined LVA + VLNT",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Combined lymphovenous anastomosis and lymph node transfer (procedure)",
    specialties: ["lymphoedema"],
    subcategory: "Combined Procedures",
    tags: ["free_flap", "microsurgery"],
    sortOrder: 1,
  },
  {
    id: "lymph_lympha",
    displayName: "LYMPHA (lymphatic microsurgical preventive healing approach)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Prophylactic lymphovenous anastomosis (procedure)",
    specialties: ["lymphoedema"],
    subcategory: "Physiological (LVA)",
    tags: ["microsurgery"],
    sortOrder: 5,
  },
  {
    id: "lymph_icg",
    displayName: "ICG lymphography (diagnostic)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Indocyanine green lymphography (procedure)",
    specialties: ["lymphoedema"],
    subcategory: "Diagnostic",
    tags: ["elective"],
    sortOrder: 1,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PERIPHERAL NERVE — brachial plexus, repair, neuroma, tumour
// ═══════════════════════════════════════════════════════════════════════════

const PERIPHERAL_NERVE_BRACHIAL_PLEXUS: ProcedurePicklistEntry[] = [
  {
    id: "pn_bp_exploration",
    displayName: "Brachial plexus exploration",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Exploration of brachial plexus (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Brachial Plexus",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "pn_bp_primary_repair",
    displayName: "Brachial plexus nerve repair — primary",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Primary repair of brachial plexus (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Brachial Plexus",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "pn_bp_nerve_graft",
    displayName: "Brachial plexus nerve graft reconstruction",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Nerve graft reconstruction of brachial plexus (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Brachial Plexus",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "pn_transfer_sas",
    displayName: "Nerve transfer — spinal accessory to suprascapular",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Spinal accessory to suprascapular nerve transfer (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Nerve Transfer",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "pn_transfer_oberlin",
    displayName: "Nerve transfer — Oberlin (ulnar fascicle to biceps)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Oberlin nerve transfer (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Nerve Transfer",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "pn_transfer_triceps_axillary",
    displayName: "Nerve transfer — triceps branch to axillary",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Triceps to axillary nerve transfer (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Nerve Transfer",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "pn_transfer_intercostal",
    displayName: "Nerve transfer — intercostal to musculocutaneous",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Intercostal nerve transfer (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Nerve Transfer",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "pn_transfer_contralateral_c7",
    displayName: "Contralateral C7 transfer",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Contralateral C7 nerve transfer (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Nerve Transfer",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "pn_ffmt_elbow",
    displayName: "Free functioning muscle transfer (gracilis) — elbow flexion",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Free functioning muscle transfer for elbow flexion (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Free Functioning Muscle Transfer",
    tags: ["free_flap", "microsurgery"],
    sortOrder: 1,
  },
  {
    id: "pn_ffmt_finger",
    displayName: "Free functioning muscle transfer (gracilis) — finger flexion",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Free functioning muscle transfer for finger flexion (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Free Functioning Muscle Transfer",
    tags: ["free_flap", "microsurgery"],
    sortOrder: 2,
  },
];

const PERIPHERAL_NERVE_REPAIR: ProcedurePicklistEntry[] = [
  {
    id: "pn_repair_upper",
    displayName: "Nerve repair — upper extremity (above wrist)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Repair of nerve of upper extremity (procedure)",
    specialties: ["peripheral_nerve", "hand_wrist"],
    subcategory: "Nerve Repair & Graft",
    tags: ["trauma"],
    sortOrder: 1,
  },
  {
    id: "pn_repair_lower",
    displayName: "Nerve repair — lower extremity",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Repair of nerve of lower extremity (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Nerve Repair & Graft",
    tags: ["trauma"],
    sortOrder: 2,
  },
  {
    id: "pn_graft_upper",
    displayName: "Nerve graft — upper extremity",
    snomedCtCode: "302199004",
    snomedCtDisplay: "Nerve graft of upper extremity (procedure)",
    specialties: ["peripheral_nerve", "hand_wrist"],
    subcategory: "Nerve Repair & Graft",
    tags: ["trauma"],
    sortOrder: 3,
  },
  {
    id: "pn_graft_lower",
    displayName: "Nerve graft — lower extremity",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Nerve graft of lower extremity (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Nerve Repair & Graft",
    tags: ["trauma"],
    sortOrder: 4,
  },
  {
    id: "pn_conduit_upper",
    displayName: "Nerve conduit — upper extremity",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Nerve conduit repair of upper extremity (procedure)",
    specialties: ["peripheral_nerve", "hand_wrist"],
    subcategory: "Nerve Repair & Graft",
    tags: ["trauma"],
    sortOrder: 5,
  },
  {
    id: "pn_conduit_lower",
    displayName: "Nerve conduit — lower extremity",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Nerve conduit repair of lower extremity (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Nerve Repair & Graft",
    tags: ["trauma"],
    sortOrder: 6,
  },
  {
    id: "pn_neurolysis",
    displayName: "Neurolysis — external / internal",
    snomedCtCode: "35394002",
    snomedCtDisplay: "Neurolysis (procedure)",
    specialties: ["peripheral_nerve", "hand_wrist"],
    subcategory: "Nerve Repair & Graft",
    tags: ["elective"],
    sortOrder: 7,
  },
];

const PERIPHERAL_NERVE_NEUROMA: ProcedurePicklistEntry[] = [
  {
    id: "pn_tmr",
    displayName: "Targeted muscle reinnervation (TMR)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Targeted muscle reinnervation (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Neuroma Surgery",
    tags: ["elective"],
    sortOrder: 1,
  },
  {
    id: "pn_rpni",
    displayName: "Regenerative peripheral nerve interface (RPNI)",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Regenerative peripheral nerve interface (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Neuroma Surgery",
    tags: ["elective"],
    sortOrder: 2,
  },
  {
    id: "pn_neuroma_excision",
    displayName: "Neuroma excision + relocation",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Excision of neuroma (procedure)",
    specialties: ["peripheral_nerve", "hand_wrist"],
    subcategory: "Neuroma Surgery",
    tags: ["elective"],
    sortOrder: 3,
  },
];

const PERIPHERAL_NERVE_TUMOUR: ProcedurePicklistEntry[] = [
  {
    id: "pn_schwannoma",
    displayName: "Schwannoma excision",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Excision of schwannoma (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Peripheral Nerve Tumour",
    tags: ["oncological"],
    sortOrder: 1,
  },
  {
    id: "pn_nerve_sheath_tumour",
    displayName: "Peripheral nerve sheath tumour excision",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Excision of peripheral nerve sheath tumour (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Peripheral Nerve Tumour",
    tags: ["oncological"],
    sortOrder: 2,
  },
  {
    id: "pn_nerve_biopsy",
    displayName: "Nerve biopsy",
    snomedCtCode: "122465003", // VERIFY
    snomedCtDisplay: "Biopsy of peripheral nerve (procedure)",
    specialties: ["peripheral_nerve"],
    subcategory: "Peripheral Nerve Tumour",
    tags: ["oncological"],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MASTER PICKLIST — combine all arrays (all 12 specialties)
// ═══════════════════════════════════════════════════════════════════════════

export const PROCEDURE_PICKLIST: ProcedurePicklistEntry[] = [
  // Orthoplastic
  ...ORTHOPLASTIC_FREE_FLAP,
  ...ORTHOPLASTIC_PEDICLED_FLAP,
  ...ORTHOPLASTIC_LOCAL_FLAP,
  ...ORTHOPLASTIC_SKIN_GRAFT,
  ...ORTHOPLASTIC_WOUND,
  ...ORTHOPLASTIC_LIMB_SALVAGE,
  ...ORTHOPLASTIC_COMPLEX_RECONSTRUCTION,
  // Hand Surgery
  ...HAND_FRACTURE_FIXATION,
  ...HAND_TENDON_SURGERY,
  ...HAND_NERVE_SURGERY,
  ...HAND_JOINT_PROCEDURES,
  ...HAND_VASCULAR_PROCEDURES,
  ...HAND_COMPRESSION_NEUROPATHY,
  ...HAND_DUPUYTREN,
  ...HAND_SOFT_TISSUE_COVERAGE,
  ...HAND_DISLOCATION_MANAGEMENT,
  ...HAND_AMPUTATION_REPLANTATION,
  ...HAND_CONGENITAL,
  ...HAND_OTHER,
  // Head & Neck
  ...HEAD_NECK_SKIN_CANCER,
  ...HEAD_NECK_LOCAL_FLAPS,
  ...HEAD_NECK_REGIONAL_FLAPS,
  ...HEAD_NECK_FREE_FLAPS,
  ...HEAD_NECK_SITE_RECONSTRUCTION,
  ...HEAD_NECK_FACIAL_NERVE,
  ...HEAD_NECK_CLEFT_CRANIOFACIAL,
  ...HEAD_NECK_FACIAL_FRACTURES,
  ...HEAD_NECK_FACIAL_SOFT_TISSUE_TRAUMA,
  ...HEAD_NECK_OTHER,
  // General
  ...GENERAL_SKIN_LESION,
  ...GENERAL_MELANOMA,
  ...GENERAL_SCAR_WOUND,
  ...GENERAL_PRESSURE_SORE,
  ...GENERAL_LYMPHOEDEMA,
  ...GENERAL_VASCULAR_MALFORMATION,
  ...GENERAL_HIDRADENITIS,
  ...GENERAL_SOFT_TISSUE_TRAUMA,
  ...GENERAL_GENDER_AFFIRMING,
  ...GENERAL_OTHER,
  // Breast
  ...BREAST_AUTOLOGOUS_RECON,
  ...BREAST_IMPLANT_RECON,
  ...BREAST_ONCOPLASTIC,
  ...BREAST_AESTHETIC,
  ...BREAST_NIPPLE,
  ...BREAST_REVISION,
  // Burns
  ...BURNS_ACUTE,
  ...BURNS_SKIN_GRAFT,
  ...BURNS_RECONSTRUCTION,
  ...BURNS_SITE_SPECIFIC,
  ...BURNS_SCAR_TREATMENT,
  // Aesthetics
  ...AESTHETICS_FACELIFT,
  ...AESTHETICS_RHINOPLASTY,
  ...AESTHETICS_OTOPLASTY,
  ...AESTHETICS_INJECTABLES,
  ...AESTHETICS_SKIN_RESURFACING,
  ...AESTHETICS_HAIR,
  ...AESTHETICS_BODY,
  // Body Contouring
  ...BODY_CONTOUR_ABDOMINOPLASTY,
  ...BODY_CONTOUR_UPPER,
  ...BODY_CONTOUR_LOWER,
  ...BODY_CONTOUR_BUTTOCK,
  ...BODY_CONTOUR_POST_BARIATRIC,
  ...BODY_CONTOUR_OTHER,
  // Cleft & Craniofacial (new)
  ...CLEFT_CRANIO_ADDITIONAL,
  // Skin Cancer (new)
  ...SKIN_CANCER_ADDITIONAL,
  // Lymphoedema (new)
  ...LYMPHOEDEMA_ADDITIONAL,
  // Peripheral Nerve (new)
  ...PERIPHERAL_NERVE_BRACHIAL_PLEXUS,
  ...PERIPHERAL_NERVE_REPAIR,
  ...PERIPHERAL_NERVE_NEUROMA,
  ...PERIPHERAL_NERVE_TUMOUR,
];

export function getProceduresForSpecialty(
  specialty: Specialty,
): ProcedurePicklistEntry[] {
  return PROCEDURE_PICKLIST.filter((p) => p.specialties.includes(specialty));
}

export function getSubcategoriesForSpecialty(specialty: Specialty): string[] {
  const entries = getProceduresForSpecialty(specialty);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of entries) {
    if (!seen.has(e.subcategory)) {
      seen.add(e.subcategory);
      result.push(e.subcategory);
    }
  }
  return result;
}

export function getProceduresForSubcategory(
  specialty: Specialty,
  subcategory: string,
): ProcedurePicklistEntry[] {
  return getProceduresForSpecialty(specialty).filter(
    (p) => p.subcategory === subcategory,
  );
}

export function findPicklistEntry(
  id: string,
): ProcedurePicklistEntry | undefined {
  return PROCEDURE_PICKLIST.find((p) => p.id === id);
}

export function hasPicklistForSpecialty(specialty: Specialty): boolean {
  return getProceduresForSpecialty(specialty).length > 0;
}
