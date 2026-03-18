import type {
  AnatomicalRegion,
  Indication,
  FreeFlap,
  FlapSpecificDetails,
  ALTTissueComposition,
} from "@/types/case";

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSIS → RECIPIENT SITE MAPPING
// Key: diagnosis picklist ID (from diagnosisPicklists/*.ts)
// Value: the AnatomicalRegion to auto-fill on the free flap form
// ═══════════════════════════════════════════════════════════════════════════

export const DIAGNOSIS_TO_RECIPIENT_SITE: Record<string, AnatomicalRegion> = {
  // Orthoplastic trauma
  orth_dx_open_fx_lower_leg: "lower_leg",
  orth_dx_open_fx_upper_limb: "upper_arm",
  orth_dx_traumatic_wound: "lower_leg",
  orth_dx_degloving: "lower_leg",

  // Orthoplastic reconstruction
  orth_dx_post_traumatic_tissue_loss: "lower_leg",
  orth_dx_sternal_wound: "breast_chest",
  orth_dx_nonunion_flap: "lower_leg",

  // Breast reconstruction
  breast_dx_invasive_cancer: "breast_chest",
  breast_dx_dcis: "breast_chest",
  breast_dx_brca_risk_reducing: "breast_chest",
  breast_dx_post_mastectomy: "breast_chest",
  breast_dx_expander_in_situ: "breast_chest",
  breast_dx_recon_failure: "breast_chest",
  breast_dx_failed_implant_autologous: "breast_chest",
  breast_dx_hypoplasia: "breast_chest",
  breast_dx_phyllodes: "breast_chest",
  breast_dx_poland: "breast_chest",

  // Head & Neck — Facial nerve (all 9 new diagnoses)
  hn_dx_fn_bells_palsy: "head_neck",
  hn_dx_fn_traumatic_injury: "head_neck",
  hn_dx_fn_post_parotidectomy: "head_neck",
  hn_dx_fn_congenital: "head_neck",
  hn_dx_fn_moebius: "head_neck",
  hn_dx_fn_ramsay_hunt: "head_neck",
  hn_dx_fn_unspecified: "head_neck",
  hn_dx_fn_synkinesis: "head_neck",
  hn_dx_fn_established_palsy: "head_neck",

  // Head & Neck — Cancer (all oncological diagnoses)
  hn_dx_oral_cavity_scc: "head_neck",
  hn_dx_oropharyngeal_scc: "head_neck",
  hn_dx_laryngeal_scc: "head_neck",
  hn_dx_hypopharyngeal_scc: "head_neck",
  hn_dx_nasopharyngeal_ca: "head_neck",
  hn_dx_nasal_sinus_scc: "head_neck",
  hn_dx_salivary_duct_ca: "head_neck",
  hn_dx_acinic_cell_ca: "head_neck",
  hn_dx_adenoid_cystic_ca: "head_neck",
  hn_dx_mucoepidermoid_ca: "head_neck",
  hn_dx_thyroid_ca: "head_neck",

  // Head & Neck — Salivary gland (malignant)
  hn_dx_parotid_tumour: "head_neck",
  hn_dx_submandibular_tumour: "head_neck",

  // Head & Neck — Other
  hn_dx_mohs_defect: "head_neck",
  hn_dx_fx_mandible: "head_neck",

  // Head & Neck — Soft tissue (scalp avulsion, facial tissue loss)
  hn_dx_scalp_avulsion: "head_neck",
  hn_dx_facial_tissue_loss: "head_neck",

  // Head & Neck — Acquired deformities
  hn_dx_post_burn_contracture: "head_neck",

  // Head & Neck — Skin cancer (site-specific, Phase 2+)
  hn_dx_skin_lesion_excision_biopsy: "head_neck",
  hn_dx_bcc_face: "head_neck",
  hn_dx_scc_face: "head_neck",
  hn_dx_melanoma_face: "head_neck",
  hn_dx_skin_cancer_nose: "head_neck",
  hn_dx_skin_cancer_ear: "head_neck",
  hn_dx_skin_cancer_lip: "head_neck",
  hn_dx_skin_cancer_eyelid: "head_neck",

  // Head & Neck — Facial fracture subtypes (Phase 2+)
  hn_dx_fx_mandible_condyle: "head_neck",
  hn_dx_fx_mandible_angle: "head_neck",
  hn_dx_fx_mandible_body: "head_neck",
  hn_dx_fx_mandible_symphysis: "head_neck",
  hn_dx_fx_mandible_parasymphysis: "head_neck",
  hn_dx_fx_mandible_ramus: "head_neck",
  hn_dx_fx_zygoma: "head_neck",
  hn_dx_fx_orbital_floor: "head_neck",
  hn_dx_fx_orbital_medial_wall: "head_neck",
  hn_dx_fx_nasal: "head_neck",
  hn_dx_fx_lefort_1: "head_neck",
  hn_dx_fx_lefort_2: "head_neck",
  hn_dx_fx_lefort_3: "head_neck",
  hn_dx_fx_frontal_sinus: "head_neck",
  hn_dx_fx_noe: "head_neck",
  hn_dx_fx_panfacial: "head_neck",

  // Head & Neck — Facial nerve (Phase 2+ IDs, non-fn_ prefix)
  hn_dx_bells_palsy: "head_neck",
  hn_dx_facial_nerve_palsy: "head_neck",
  hn_dx_traumatic_nerve_injury: "head_neck",
  hn_dx_post_parotidectomy_palsy: "head_neck",
  hn_dx_post_surgical_palsy: "head_neck",
  hn_dx_congenital_palsy: "head_neck",
  hn_dx_moebius: "head_neck",
  hn_dx_ramsay_hunt: "head_neck",
  hn_dx_synkinesis: "head_neck",

  // Head & Neck — Cancer subtypes (Phase 2+)
  hn_dx_oral_cavity_ca: "head_neck",
  hn_dx_tongue_ca: "head_neck",
  hn_dx_floor_mouth_ca: "head_neck",
  hn_dx_buccal_ca: "head_neck",
  hn_dx_oropharynx_ca: "head_neck",
  hn_dx_mandible_tumour: "head_neck",
  hn_dx_maxilla_tumour: "head_neck",
  hn_dx_maxillary_sinus_ca: "head_neck",
  hn_dx_pharynx_ca: "head_neck",
  hn_dx_larynx_ca: "head_neck",
  hn_dx_orn_mandible: "head_neck",
  hn_dx_orn_maxilla: "head_neck",

  // Head & Neck — Salivary gland subtypes (Phase 2+)
  hn_dx_parotid_pleomorphic: "head_neck",
  hn_dx_parotid_warthin: "head_neck",
  hn_dx_parotid_mucoepidermoid: "head_neck",
  hn_dx_parotid_adenoid_cystic: "head_neck",
  hn_dx_parotid_acinic_cell: "head_neck",
  hn_dx_parotid_nos: "head_neck",
  hn_dx_submandibular_malignant: "head_neck",

  // Head & Neck — Soft tissue trauma (Phase 2+)
  hn_dx_facial_laceration: "head_neck",
  hn_dx_laceration_lip: "head_neck",
  hn_dx_laceration_eyelid: "head_neck",
  hn_dx_laceration_nose: "head_neck",
  hn_dx_laceration_ear: "head_neck",
  hn_dx_dog_bite_face: "head_neck",
  hn_dx_animal_bite_face: "head_neck",
  hn_dx_complex_facial_wound: "head_neck",

  // Head & Neck — Acquired deformities (Phase 2+)
  hn_dx_post_burn_contracture_face: "head_neck",
  hn_dx_hypertrophic_scar_face: "head_neck",
  hn_dx_keloid_face: "head_neck",
  hn_dx_post_traumatic_deformity: "head_neck",
  hn_dx_post_surgical_deformity: "head_neck",
  hn_dx_facial_asymmetry: "head_neck",

  // Head & Neck — Vascular malformations (Phase 2+)
  hn_dx_haemangioma_face: "head_neck",
  hn_dx_infantile_haemangioma: "head_neck",
  hn_dx_avm_face: "head_neck",
  hn_dx_venous_malformation_face: "head_neck",
  hn_dx_lymphatic_malformation: "head_neck",
  hn_dx_cystic_hygroma: "head_neck",
  hn_dx_port_wine_stain: "head_neck",

  // Head & Neck — Benign tumours & cysts (Phase 2+)
  hn_dx_dermoid_cyst: "head_neck",
  hn_dx_epidermoid_cyst: "head_neck",
  hn_dx_lipoma_face: "head_neck",
  hn_dx_lipoma_neck: "head_neck",
  hn_dx_neurofibroma: "head_neck",
  hn_dx_pilomatricoma: "head_neck",
  hn_dx_sebaceous_cyst: "head_neck",
  hn_dx_keratoacanthoma: "head_neck",

  // Pressure injuries (general)
  gen_dx_pressure_sacral: "perineum",
  gen_dx_pressure_ischial: "perineum",
  gen_dx_pressure_trochanteric: "thigh",
  gen_dx_pressure_heel: "foot",

  // Craniofacial — potential free tissue transfer
  cc_dx_craniofacial_microsomia: "head_neck",
  cc_dx_treacher_collins: "head_neck",
  cc_dx_fibrous_dysplasia_craniofacial: "head_neck",
  cc_dx_encephalocele: "head_neck",
  cc_dx_orbital_hypertelorism: "head_neck",
};

// ═══════════════════════════════════════════════════════════════════════════
// CLINICAL GROUP → INDICATION AUTO-FILL
// Maps diagnosis clinicalGroup to the FreeFlapDetails indication field
// ═══════════════════════════════════════════════════════════════════════════

export const CLINICAL_GROUP_TO_INDICATION: Record<string, Indication> = {
  trauma: "trauma",
  oncological: "oncologic",
  reconstructive: "reconstructive",
  elective: "elective",
  congenital: "congenital",
};

// ═══════════════════════════════════════════════════════════════════════════
// FLAP TYPE → DEFAULT FLAP-SPECIFIC DETAILS
// Returns typed Partial<FlapSpecificDetails> for each flap
// ═══════════════════════════════════════════════════════════════════════════

export function getDefaultFlapSpecificDetails(
  flapType: FreeFlap,
): Partial<FlapSpecificDetails> {
  switch (flapType) {
    case "alt":
      return { altTissueComposition: "fasciocutaneous" };
    case "diep":
      return {
        diepMSTRAM: "ms_3",
        diepPerforatorRow: "medial",
        diepPerfusionZones: "zone_i_iii",
      };
    case "radial_forearm":
      return { rfffTissueComposition: "fasciocutaneous" };
    case "fibula":
      return { fibulaTissueComposition: "osteocutaneous" };
    case "latissimus_dorsi":
      return { ldTissueComposition: "muscle_only" };
    case "gracilis":
      return { gracilisTissueComposition: "muscle_only" };
    case "tug":
      return { gracilisTissueComposition: "myocutaneous" };
    case "scip":
      return { scipTissueComposition: "cutaneous" };
    case "medial_sural":
      return { msapTissueComposition: "fasciocutaneous" };
    case "tdap":
      return { tdapTissueComposition: "fasciocutaneous" };
    case "serratus_anterior":
      return { serratusTissueComposition: "muscle_only" };
    case "medial_femoral_condyle":
      return {
        mfcTissueComposition: "bone_only",
        mfcBoneSource: "medial_condyle",
      };
    case "omentum":
      return {};
    default:
      return {};
  }
}

export const DIEP_BILATERAL_DEFAULTS: Partial<FlapSpecificDetails> = {
  diepMSTRAM: "ms_3",
  diepPerforatorRow: "medial",
  diepPerfusionZones: "zone_i_iii",
  diepFlapConfiguration: "standard_unilateral",
  diepVenousSupercharge: "none",
};

// ═══════════════════════════════════════════════════════════════════════════
// FLAP DONOR VESSELS
// Default donor vessel names per free flap type — shared by procedure init
// and FreeFlapClinicalFields auto-fill.
// ═══════════════════════════════════════════════════════════════════════════

export const FLAP_DONOR_VESSELS: Record<
  FreeFlap,
  { artery: string; vein: string }
> = {
  alt: {
    artery: "Descending branch of lateral circumflex femoral artery",
    vein: "Venae comitantes of lateral circumflex femoral artery",
  },
  diep: {
    artery: "Deep inferior epigastric artery",
    vein: "Deep inferior epigastric vein",
  },
  radial_forearm: {
    artery: "Radial artery",
    vein: "Venae comitantes of radial artery",
  },
  fibula: {
    artery: "Peroneal artery",
    vein: "Venae comitantes of peroneal artery",
  },
  latissimus_dorsi: {
    artery: "Thoracodorsal artery",
    vein: "Thoracodorsal vein",
  },
  gracilis: {
    artery: "Gracilis branch of medial circumflex femoral artery",
    vein: "Venae comitantes of medial circumflex femoral artery",
  },
  tug: {
    artery: "Gracilis branch of medial circumflex femoral artery",
    vein: "Venae comitantes of medial circumflex femoral artery",
  },
  scip: {
    artery: "Superficial circumflex iliac artery",
    vein: "Superficial circumflex iliac vein",
  },
  siea: {
    artery: "Superficial inferior epigastric artery",
    vein: "Superficial inferior epigastric vein",
  },
  medial_sural: {
    artery: "Medial sural artery",
    vein: "Venae comitantes of medial sural artery",
  },
  sgap: {
    artery: "Superior gluteal artery (perforator branch)",
    vein: "Superior gluteal vein",
  },
  igap: {
    artery: "Inferior gluteal artery (perforator branch)",
    vein: "Inferior gluteal vein",
  },
  pap: {
    artery: "Profunda femoris artery (perforator branch)",
    vein: "Venae comitantes of profunda femoris artery",
  },
  tdap: {
    artery: "Thoracodorsal artery (perforator branch)",
    vein: "Thoracodorsal vein",
  },
  parascapular: {
    artery: "Circumflex scapular artery",
    vein: "Circumflex scapular vein",
  },
  scapular: {
    artery: "Circumflex scapular artery",
    vein: "Circumflex scapular vein",
  },
  serratus_anterior: {
    artery: "Thoracodorsal artery (serratus branch)",
    vein: "Thoracodorsal vein",
  },
  lap: {
    artery: "Lumbar artery (perforator branch)",
    vein: "Lumbar vein",
  },
  medial_femoral_condyle: {
    artery: "Descending genicular artery",
    vein: "Descending genicular vein",
  },
  omentum: {
    artery: "Right gastroepiploic artery",
    vein: "Right gastroepiploic vein",
  },
  other: {
    artery: "",
    vein: "",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT-SPECIFIC OVERRIDES
// Gracilis and Fibula defaults depend on diagnosis/recipient context
// ═══════════════════════════════════════════════════════════════════════════

/** All facial nerve diagnosis IDs — gracilis used as muscle-only for reanimation */
const FACIAL_NERVE_DIAGNOSIS_IDS = new Set([
  "hn_dx_fn_bells_palsy",
  "hn_dx_fn_traumatic_injury",
  "hn_dx_fn_post_parotidectomy",
  "hn_dx_fn_congenital",
  "hn_dx_fn_moebius",
  "hn_dx_fn_ramsay_hunt",
  "hn_dx_fn_unspecified",
  "hn_dx_fn_synkinesis",
  "hn_dx_fn_established_palsy",
]);

export function getGracilisContextDefaults(diagnosisId: string): {
  flapSpecificDetails: Partial<FlapSpecificDetails>;
  skinIsland?: boolean;
} {
  if (FACIAL_NERVE_DIAGNOSIS_IDS.has(diagnosisId)) {
    return {
      flapSpecificDetails: { gracilisTissueComposition: "muscle_only" },
    };
  }
  return {
    flapSpecificDetails: { gracilisTissueComposition: "myocutaneous" },
    skinIsland: true,
  };
}

export function getFibulaContextDefaults(
  recipientSite?: AnatomicalRegion,
): Partial<FlapSpecificDetails> {
  if (recipientSite === "head_neck") {
    return {
      fibulaTissueComposition: "osteocutaneous",
      fibulaReconSite: "mandible",
      fibulaSkinPaddleCount: 1,
    };
  }
  return {
    fibulaTissueComposition: "bone_only",
    fibulaReconSite: "long_bone",
    fibulaSkinPaddleCount: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BREAST RECONSTRUCTION: RECIPIENT VESSELS DEFAULT
// When flap is used for breast reconstruction (recipient = breast_chest)
// ═══════════════════════════════════════════════════════════════════════════

export const BREAST_RECON_DEFAULT_RECIPIENT_VESSELS = {
  artery: "Internal mammary artery (IMA)",
  vein: "Internal mammary vein (IMV)",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ALT ELEVATION PLANE → COMPOSITION CASCADE
// When ALT elevation plane changes, tissue composition should auto-update
// ═══════════════════════════════════════════════════════════════════════════

export const ALT_ELEVATION_TO_COMPOSITION: Record<
  string,
  ALTTissueComposition
> = {
  subfascial: "fasciocutaneous",
  epifascial: "fasciocutaneous",
  thin: "fasciocutaneous",
  superthin: "adipofascial",
  ultrathin: "adipofascial",
  subdermal: "adipofascial",
};

// ═══════════════════════════════════════════════════════════════════════════
// ARTERY → CONCOMITANT VEIN MAPPING
// When a recipient artery is selected, auto-populate the paired vein
// ═══════════════════════════════════════════════════════════════════════════

export const ARTERY_TO_CONCOMITANT_VEIN: Record<string, string> = {
  // Lower leg
  "Anterior tibial artery": "Venae comitantes of anterior tibial artery",
  "Posterior tibial artery": "Venae comitantes of posterior tibial artery",
  "Peroneal artery": "Venae comitantes of peroneal artery",
  "Dorsalis pedis artery": "Venae comitantes of dorsalis pedis artery",

  // Knee
  "Popliteal artery": "Popliteal vein",
  "Descending genicular artery": "Great saphenous vein",
  "Superior medial genicular artery": "Popliteal vein",
  "Superior lateral genicular artery": "Popliteal vein",

  // Foot
  "Medial plantar artery": "Great saphenous vein",
  "Lateral plantar artery": "Great saphenous vein",
  "First dorsal metatarsal artery": "Dorsal venous arch",

  // Thigh
  "Superficial femoral artery": "Femoral vein",
  "Profunda femoris artery": "Profunda femoris vein",
  "Descending branch of lateral circumflex femoral artery":
    "Great saphenous vein",

  // Hand
  "Radial artery at anatomical snuffbox": "Cephalic vein",
  "Ulnar artery": "Basilic vein",
  "Superficial palmar arch": "Superficial venous arch",
  "Deep palmar arch": "Superficial venous arch",
  "Common digital artery": "Dorsal metacarpal veins",
  "Proper digital artery": "Dorsal metacarpal veins",

  // Forearm
  "Radial artery": "Venae comitantes of radial artery",
  "Anterior interosseous artery": "Venae comitantes of radial artery",
  "Posterior interosseous artery": "Venae comitantes of ulnar artery",

  // Upper arm
  "Brachial artery": "Brachial veins",
  "Profunda brachii artery": "Brachial veins",

  // Head & Neck
  "Facial artery": "Facial vein",
  "Lingual artery": "Internal jugular vein",
  "Superficial temporal artery": "External jugular vein",
  "Superior thyroid artery": "Internal jugular vein",
  "Transverse cervical artery": "External jugular vein",
  "External carotid artery": "Internal jugular vein",
  "Occipital artery": "External jugular vein",

  // Perineum / Pelvis
  "Internal pudendal artery": "Internal pudendal vein",
  "Superior gluteal artery": "Superior gluteal vein",
  "Inferior gluteal artery": "Inferior gluteal vein",

  // Breast / Chest
  "Internal mammary artery (IMA)": "Internal mammary vein",
  "Thoracodorsal artery": "Thoracodorsal vein",
  "Lateral thoracic artery": "Lateral thoracic vein",
  "Thoracoacromial artery": "Cephalic vein",
};

export function normalizeVesselName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(left|right|lt|rt)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_ARTERY_TO_CONCOMITANT_VEIN: Record<string, string> =
  Object.fromEntries(
    Object.entries(ARTERY_TO_CONCOMITANT_VEIN).map(([artery, vein]) => [
      normalizeVesselName(artery),
      vein,
    ]),
  );

export function resolveConcomitantVeinName(
  arteryCandidates: string[],
): string | undefined {
  for (const artery of arteryCandidates) {
    if (!artery) continue;
    const normalized = normalizeVesselName(artery);
    const directMatch = NORMALIZED_ARTERY_TO_CONCOMITANT_VEIN[normalized];
    if (directMatch) return directMatch;
  }

  for (const artery of arteryCandidates) {
    if (!artery) continue;
    const normalized = normalizeVesselName(artery);
    for (const [mappedArtery, mappedVein] of Object.entries(
      NORMALIZED_ARTERY_TO_CONCOMITANT_VEIN,
    )) {
      if (
        normalized.includes(mappedArtery) ||
        mappedArtery.includes(normalized)
      ) {
        return mappedVein;
      }
    }
  }

  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGION → DEFAULT ARTERIAL CONFIGURATION
// Extremities: end-to-side (preserve distal flow)
// Head & neck / breast: end-to-end (expendable named vessels)
// ═══════════════════════════════════════════════════════════════════════════

export const REGION_ARTERIAL_CONFIGURATION: Record<
  AnatomicalRegion,
  "end_to_end" | "end_to_side"
> = {
  lower_leg: "end_to_side",
  knee: "end_to_side",
  foot: "end_to_side",
  thigh: "end_to_side",
  hand: "end_to_side",
  forearm: "end_to_side",
  upper_arm: "end_to_side",
  head_neck: "end_to_end",
  breast_chest: "end_to_end",
  perineum: "end_to_end",
};
