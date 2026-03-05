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

  // Head & Neck
  hn_dx_oral_cavity_scc: "head_neck",
  hn_dx_facial_nerve_chronic: "head_neck",
  hn_dx_facial_nerve_acute: "head_neck",
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
    default:
      return {};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT-SPECIFIC OVERRIDES
// Gracilis and Fibula defaults depend on diagnosis/recipient context
// ═══════════════════════════════════════════════════════════════════════════

export function getGracilisContextDefaults(
  diagnosisId: string,
): { flapSpecificDetails: Partial<FlapSpecificDetails>; skinIsland?: boolean } {
  if (
    diagnosisId === "hn_dx_facial_nerve_chronic" ||
    diagnosisId === "hn_dx_facial_nerve_acute"
  ) {
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
  "Descending branch of lateral circumflex femoral artery": "Great saphenous vein",

  // Hand
  "Radial artery at anatomical snuffbox": "Cephalic vein",
  "Ulnar artery": "Basilic vein",
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

  // Breast / Chest
  "Internal mammary artery (IMA)": "Internal mammary vein",
  "Thoracodorsal artery": "Thoracodorsal vein",
  "Lateral thoracic artery": "Lateral thoracic vein",
  "Thoracoacromial artery": "Cephalic vein",
};

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
};
