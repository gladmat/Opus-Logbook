import type { FreeFlap, ElevationPlane } from "@/types/case";

export type FlapFieldType =
  | "select"
  | "boolean"
  | "number"
  | "text"
  | "multi_select";

export interface FlapFieldOption {
  value: string;
  label: string;
}

export interface FlapFieldDefinition {
  key: string;
  label: string;
  type: FlapFieldType;
  options?: FlapFieldOption[];
  required?: boolean;
  hint?: string;
  unit?: string;
  placeholder?: string;
  showWhen?: { key: string; values: string[] };
}

export const FLAP_FIELD_CONFIG: Partial<
  Record<FreeFlap, FlapFieldDefinition[]>
> = {
  alt: [
    {
      key: "altTissueComposition",
      label: "Tissue Composition",
      type: "select",
      required: true,
      options: [
        { value: "fasciocutaneous", label: "Fasciocutaneous" },
        { value: "myocutaneous", label: "Myocutaneous (VL cuff)" },
        { value: "chimeric", label: "Chimeric (separate paddles)" },
        { value: "adipofascial", label: "Adipofascial (no skin)" },
        { value: "fascial_only", label: "Fascial only" },
        { value: "de_epithelialized", label: "De-epithelialized" },
      ],
    },
    {
      key: "altPerforatorType",
      label: "Perforator Type",
      type: "select",
      required: true,
      options: [
        { value: "musculocutaneous", label: "Musculocutaneous (~87%)" },
        { value: "septocutaneous", label: "Septocutaneous (~13%)" },
        { value: "oblique_branch", label: "Oblique branch (~4%)" },
      ],
    },
    {
      key: "altPedicleSource",
      label: "Pedicle Source Vessel (Shieh)",
      type: "select",
      options: [
        {
          value: "type_i_descending",
          label: "Type I \u2014 Descending branch LCFA (~90%)",
        },
        {
          value: "type_ii_transverse",
          label: "Type II \u2014 Transverse branch (~4\u20139%)",
        },
        {
          value: "type_iii_profunda",
          label: "Type III \u2014 Direct from profunda (~4\u20136%)",
        },
      ],
    },
    {
      key: "altPerforatorLocation",
      label: "Perforator Location (Yu ABC)",
      type: "select",
      options: [
        {
          value: "a_proximal",
          label: "A \u2014 Proximal (~5 cm above midpoint)",
        },
        { value: "b_midpoint", label: "B \u2014 Midpoint (most consistent)" },
        { value: "c_distal", label: "C \u2014 Distal (~5 cm below)" },
      ],
    },
    {
      key: "altNumberOfSkinPaddles",
      label: "Number of Skin Paddles",
      type: "select",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2 (bipaddle)" },
        { value: "3", label: "3+" },
      ],
    },
    {
      key: "altFlowThrough",
      label: "Flow-through Design",
      type: "boolean",
    },
    {
      key: "altSensate",
      label: "Sensate (LFCN included)",
      type: "boolean",
    },
    {
      key: "altPrimaryThinning",
      label: "Primary Thinning Performed",
      type: "boolean",
    },
    {
      key: "altExtendedVariant",
      label: "Extended Variant",
      type: "select",
      options: [
        { value: "standard", label: "Standard" },
        { value: "extended", label: "Extended" },
        { value: "bipedicled", label: "Bipedicled" },
        { value: "conjoined_alt_tfl", label: "Conjoined ALT+TFL" },
      ],
    },
  ],

  diep: [
    {
      key: "diepPerforatorRow",
      label: "Perforator Row",
      type: "select",
      required: true,
      options: [
        { value: "medial", label: "Medial row (longer pedicle)" },
        { value: "lateral", label: "Lateral row (shorter pedicle)" },
        { value: "both", label: "Both rows" },
      ],
    },
    {
      key: "diepMSTRAM",
      label: "MS-TRAM Classification (Nahabedian)",
      type: "select",
      required: true,
      options: [
        { value: "ms_0", label: "MS-0 \u2014 Full rectus harvested" },
        { value: "ms_1", label: "MS-1 \u2014 Lateral muscle preserved" },
        { value: "ms_2", label: "MS-2 \u2014 Medial + lateral preserved" },
        {
          value: "ms_3",
          label: "MS-3 \u2014 Entire rectus preserved (true DIEP)",
        },
      ],
    },
    {
      key: "diepPerfusionZones",
      label: "Perfusion Zones Included",
      type: "select",
      options: [
        { value: "zone_i_only", label: "Zone I only" },
        { value: "zone_i_iii", label: "Zones I + III" },
        { value: "zone_i_ii_iii", label: "Zones I + II + III" },
        { value: "zone_i_ii_iii_iv", label: "Zones I + II + III + IV" },
      ],
    },
    {
      key: "diepGillSubtype",
      label: "Gill DIEP Sub-classification",
      type: "select",
      options: [
        { value: "diep_1", label: "DIEP-1 \u2014 No muscle/nerve sacrifice" },
        { value: "diep_2", label: "DIEP-2 \u2014 Segmental nerve sacrifice" },
        { value: "diep_3", label: "DIEP-3 \u2014 Both rows, central muscle" },
      ],
    },
    {
      key: "diepFlapConfiguration",
      label: "Flap Configuration",
      type: "select",
      options: [
        { value: "standard_unilateral", label: "Standard unilateral" },
        { value: "hemi_diep", label: "Hemi-DIEP (ipsilateral only)" },
        {
          value: "stacked",
          label: "Stacked (bilateral \u2192 unilateral breast)",
        },
        {
          value: "conjoined_double_pedicle",
          label: "Conjoined double-pedicle",
        },
        { value: "bipedicled", label: "Bipedicled (both DIEAs)" },
      ],
    },
    {
      key: "diepVenousSupercharge",
      label: "Venous Supercharging",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "siev_ipsilateral", label: "SIEV ipsilateral" },
        { value: "siev_contralateral", label: "SIEV contralateral" },
        { value: "bipedicled", label: "Bipedicled" },
        { value: "turbocharged", label: "Turbocharged (DIEA-to-DIEA loop)" },
      ],
    },
    {
      key: "diepFlapExtent",
      label: "Flap Extent",
      type: "select",
      options: [
        { value: "hemi_diep", label: "Hemi-DIEP" },
        { value: "full_diep", label: "Full DIEP" },
      ],
    },
    {
      key: "diepMotorNervePreservation",
      label: "Motor Nerve Preservation",
      type: "select",
      options: [
        { value: "all_preserved", label: "All preserved" },
        { value: "type_1_sacrificed", label: "Type 1 sacrificed" },
        { value: "type_2_preserved", label: "Type 2 preserved" },
        { value: "sacrificed", label: "Sacrificed" },
      ],
    },
    {
      key: "diepSensoryNeurotization",
      label: "Sensory Neurotization",
      type: "boolean",
    },
  ],

  siea: [
    {
      key: "sieaVesselStatus",
      label: "SIEA Vessel Status",
      type: "select",
      required: true,
      options: [
        {
          value: "present_adequate",
          label: "Present + adequate (\u22651.5 mm)",
        },
        { value: "present_inadequate", label: "Present + inadequate" },
        { value: "absent", label: "Absent" },
      ],
    },
    {
      key: "sieaArterialDiameterMm",
      label: "SIEA Arterial Diameter",
      type: "number",
      unit: "mm",
      placeholder: "1.5",
    },
    {
      key: "sieaOriginPattern",
      label: "SIEA Origin Pattern",
      type: "select",
      options: [
        { value: "independent", label: "Independent" },
        { value: "common_trunk_scia", label: "Common trunk with SCIA" },
        { value: "absent", label: "Absent" },
      ],
    },
    {
      key: "sieaConvertedToDiep",
      label: "Converted to DIEP",
      type: "boolean",
    },
    {
      key: "sieaFlapExtent",
      label: "Flap Extent",
      type: "select",
      options: [
        { value: "hemi_abdominal", label: "Hemi-abdominal" },
        { value: "full_abdominal", label: "Full abdominal" },
      ],
    },
    {
      key: "sieaConjoinedWithDiep",
      label: "Conjoined SIEA+DIEP",
      type: "boolean",
    },
  ],

  gracilis: [
    {
      key: "gracilisTissueComposition",
      label: "Tissue Composition",
      type: "select",
      required: true,
      options: [
        { value: "muscle_only", label: "Muscle only" },
        { value: "myocutaneous", label: "Myocutaneous" },
        { value: "myofasciocutaneous", label: "Myofasciocutaneous" },
        {
          value: "perforator_only",
          label: "Perforator only (MCFG perforator)",
        },
      ],
    },
    {
      key: "gracilisSkinPaddle",
      label: "Skin Paddle Orientation",
      type: "select",
      required: true,
      options: [
        { value: "none", label: "None (muscle only)" },
        { value: "transverse_tug", label: "Transverse (TUG/TMG)" },
        { value: "vertical", label: "Vertical (traditional)" },
        { value: "oblique_dug", label: "Oblique/Diagonal (DUG)" },
        { value: "l_shaped", label: "L-shaped" },
      ],
    },
    {
      key: "gracilisFunctionalTransfer",
      label: "Functional Transfer (innervated)",
      type: "boolean",
    },
    {
      key: "gracilisNerveTarget",
      label: "Nerve Coaptation Target",
      type: "select",
      showWhen: { key: "gracilisFunctionalTransfer", values: ["true"] },
      options: [
        { value: "cfng", label: "Cross-face nerve graft (CFNG)" },
        { value: "masseteric", label: "Masseteric nerve" },
        { value: "dual", label: "Dual (masseteric + CFNG)" },
        { value: "hypoglossal", label: "Hypoglossal" },
        { value: "spinal_accessory", label: "Spinal accessory" },
      ],
    },
    {
      key: "gracilisCoaptation",
      label: "Coaptation Configuration",
      type: "select",
      showWhen: { key: "gracilisFunctionalTransfer", values: ["true"] },
      options: [
        { value: "end_to_end", label: "End-to-end" },
        { value: "end_to_side", label: "End-to-side" },
        { value: "dual", label: "Dual" },
      ],
    },
    {
      key: "gracilisCFNGStaging",
      label: "CFNG Staging",
      type: "select",
      showWhen: { key: "gracilisNerveTarget", values: ["cfng", "dual"] },
      options: [
        { value: "single_stage", label: "Single-stage" },
        { value: "two_stage", label: "Two-stage" },
      ],
    },
    {
      key: "gracilisHarvestExtent",
      label: "Muscle Harvest Extent",
      type: "select",
      options: [
        { value: "complete", label: "Complete" },
        { value: "partial_proximal", label: "Partial-proximal" },
        { value: "segmental", label: "Segmental" },
      ],
    },
  ],

  pap: [
    {
      key: "papSkinPaddle",
      label: "Skin Paddle Design",
      type: "select",
      required: true,
      options: [
        { value: "transverse_tpap", label: "Transverse (tPAP)" },
        { value: "vertical_vpap", label: "Vertical (vPAP)" },
        { value: "diagonal_dpap", label: "Diagonal (dPAP)" },
        { value: "fleur_de_lis", label: "Fleur-de-lis" },
        { value: "s_shaped", label: "S-shaped" },
      ],
    },
    {
      key: "papPerforatorType",
      label: "Perforator Type",
      type: "select",
      options: [
        {
          value: "musculocutaneous",
          label: "Musculocutaneous (through adductor magnus)",
        },
        { value: "septocutaneous", label: "Septocutaneous" },
      ],
    },
    {
      key: "papSensate",
      label: "Sensate PAP",
      type: "boolean",
    },
    {
      key: "papSensateNerve",
      label: "Sensory Nerve",
      type: "select",
      showWhen: { key: "papSensate", values: ["true"] },
      options: [
        { value: "pfcn", label: "Posterior femoral cutaneous nerve (PFCN)" },
        {
          value: "anterior_obturator",
          label: "Anterior obturator nerve branch",
        },
      ],
    },
    {
      key: "papStacking",
      label: "Stacking Configuration",
      type: "select",
      options: [
        { value: "single", label: "Single PAP" },
        { value: "stacked_bilateral", label: "Stacked bilateral PAP" },
        { value: "stacked_diep_pap", label: "Stacked DIEP + PAP" },
        { value: "tug_pap", label: "TUGPAP (combined TUG + PAP)" },
      ],
    },
  ],

  scip: [
    {
      key: "scipPedicleBranch",
      label: "Pedicle Branch",
      type: "select",
      required: true,
      hint: "Most important SCIP field \u2014 determines pedicle length and angiosome size",
      options: [
        {
          value: "superficial_scias",
          label: "Superficial (SCIAs) \u2014 shorter pedicle ~6.6 cm",
        },
        {
          value: "deep_sciad",
          label: "Deep (SCIAd) \u2014 longer pedicle ~9.1 cm",
        },
        { value: "both", label: "Both branches" },
      ],
    },
    {
      key: "scipTissueComposition",
      label: "Tissue Composition",
      type: "select",
      options: [
        { value: "cutaneous", label: "Cutaneous" },
        { value: "adipofascial", label: "Adipofascial" },
        { value: "fasciocutaneous", label: "Fasciocutaneous" },
      ],
    },
    {
      key: "scipThickness",
      label: "Thickness Variant",
      type: "select",
      options: [
        { value: "standard", label: "Standard" },
        { value: "thin", label: "Thin" },
        { value: "superthin", label: "Superthin (<5 mm)" },
        { value: "subdermal", label: "Subdermal (pure skin perforator)" },
      ],
    },
    {
      key: "scipLymphatic",
      label: "Lymphatic Component",
      type: "select",
      hint: "Unique to SCIP \u2014 critical for lymphoedema reconstruction",
      options: [
        { value: "none", label: "None" },
        { value: "vlnt", label: "VLNT (vascularised lymph node transfer)" },
        { value: "vlvt", label: "VLVT (lymph vessel transfer, no nodes)" },
        { value: "lyst", label: "LYST (lymphatic system transfer)" },
      ],
    },
    {
      key: "scipBoneIncluded",
      label: "Bone Included (iliac crest via deep branch)",
      type: "boolean",
    },
    {
      key: "scipSensate",
      label: "Sensate (T12/L1 cutaneous branches)",
      type: "boolean",
    },
    {
      key: "scipChimericComponents",
      label: "Chimeric Components",
      type: "multi_select",
      options: [
        { value: "external_oblique_fascia", label: "External oblique fascia" },
        { value: "sartorius", label: "Sartorius muscle" },
        { value: "iliac_bone", label: "Iliac bone (deep branch)" },
        { value: "lymph_nodes", label: "Inguinal lymph nodes" },
      ],
    },
  ],

  latissimus_dorsi: [
    {
      key: "ldHarvestExtent",
      label: "Harvest Extent (Hamdi Classification)",
      type: "select",
      required: true,
      options: [
        { value: "tdap", label: "TDAP (no muscle)" },
        {
          value: "msld_i",
          label: "MSLD Type I (small cuff, both nerves preserved)",
        },
        {
          value: "msld_ii",
          label: "MSLD Type II (larger strip, nerve preserved)",
        },
        {
          value: "msld_iii",
          label: "MSLD Type III (descending branch sacrificed)",
        },
        { value: "complete_ld", label: "Complete LD (total muscle harvest)" },
        { value: "extended_ld", label: "Extended LD" },
      ],
    },
    {
      key: "ldTissueComposition",
      label: "Tissue Composition",
      type: "select",
      options: [
        { value: "muscle_only", label: "Muscle only" },
        { value: "myocutaneous", label: "Myocutaneous (with skin paddle)" },
        { value: "fasciocutaneous_tdap", label: "Fasciocutaneous (TDAP)" },
        { value: "osteomyocutaneous_rib", label: "Osteomyocutaneous with rib" },
        {
          value: "osteomyocutaneous_scapular_tip",
          label: "Osteomyocutaneous with scapular tip",
        },
      ],
    },
    {
      key: "ldNerveStatus",
      label: "Thoracodorsal Nerve Status",
      type: "select",
      options: [
        { value: "divided", label: "Divided (denervated)" },
        { value: "preserved", label: "Preserved (functional)" },
      ],
    },
    {
      key: "ldSkinPaddle",
      label: "Skin Paddle Orientation",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "transverse", label: "Transverse (bra line)" },
        { value: "vertical", label: "Vertical" },
        { value: "oblique", label: "Oblique" },
        { value: "fleur_de_lis", label: "Fleur-de-lis" },
      ],
    },
    {
      key: "ldMuscleBranch",
      label: "Muscle Branch Used",
      type: "select",
      options: [
        { value: "whole_muscle", label: "Whole muscle" },
        { value: "descending", label: "Descending branch" },
        { value: "transverse", label: "Transverse branch" },
        { value: "bilobed", label: "Bilobed (both branches, split)" },
      ],
    },
    {
      key: "ldExtensionArea",
      label: "Extended LD \u2014 Extension Areas",
      type: "select",
      showWhen: { key: "ldHarvestExtent", values: ["extended_ld"] },
      options: [
        { value: "scapular_fat", label: "Scapular fat pad" },
        { value: "parascapular_fat", label: "Parascapular fat pad" },
        { value: "lumbar_fat", label: "Lumbar fat" },
        { value: "combined", label: "Combined" },
      ],
    },
    {
      key: "ldNerveTarget",
      label: "Nerve Coaptation Target (if functional)",
      type: "select",
      showWhen: { key: "ldNerveStatus", values: ["preserved"] },
      options: [
        { value: "cfng", label: "Cross-face nerve graft" },
        { value: "masseteric", label: "Masseteric nerve" },
        { value: "dual", label: "Dual (masseteric + CFNG)" },
        { value: "hypoglossal", label: "Hypoglossal" },
      ],
    },
    {
      key: "ldChimericComponents",
      label: "Chimeric Components",
      type: "multi_select",
      options: [
        { value: "serratus_anterior", label: "Serratus anterior" },
        { value: "scapular_tip_bone", label: "Scapular tip bone" },
        { value: "parascapular_skin", label: "Parascapular skin" },
        { value: "rib", label: "Rib" },
      ],
    },
  ],

  tdap: [
    {
      key: "tdapTissueComposition",
      label: "Tissue Composition",
      type: "select",
      options: [
        { value: "fasciocutaneous", label: "Fasciocutaneous" },
        { value: "adipofascial", label: "Adipofascial" },
        { value: "chimeric_ld_cuff", label: "Chimeric with LD muscle cuff" },
        {
          value: "chimeric_serratus",
          label: "Chimeric with serratus anterior",
        },
      ],
    },
    {
      key: "tdapPerforatorSource",
      label: "Perforator Source Branch",
      type: "select",
      required: true,
      options: [
        {
          value: "descending_branch",
          label: "Descending branch (Angrigiani landmark)",
        },
        { value: "transverse_branch", label: "Transverse branch" },
        { value: "main_tda_trunk", label: "Main TDA trunk" },
      ],
    },
    {
      key: "tdapThinning",
      label: "Thinning",
      type: "select",
      options: [
        { value: "standard", label: "Standard" },
        { value: "primary_thinned", label: "Primary thinned" },
        { value: "superthin", label: "Superthin" },
      ],
    },
    {
      key: "tdapConversion",
      label: "Intraoperative Conversion",
      type: "select",
      required: true,
      hint: "Document if TDAP was converted due to inadequate perforator",
      options: [
        { value: "completed_tdap", label: "Completed as TDAP" },
        { value: "converted_msld", label: "Converted to MSLD" },
        { value: "converted_full_ld", label: "Converted to full LD" },
      ],
    },
    {
      key: "tdapSkinPaddle",
      label: "Skin Paddle Orientation",
      type: "select",
      options: [
        { value: "transverse", label: "Transverse" },
        { value: "vertical", label: "Vertical" },
        { value: "oblique", label: "Oblique" },
        { value: "propeller", label: "Propeller" },
      ],
    },
    {
      key: "tdapChimericComponents",
      label: "Chimeric Components",
      type: "multi_select",
      options: [
        { value: "ld_cuff", label: "LD muscle cuff" },
        { value: "serratus_anterior", label: "Serratus anterior" },
        { value: "scapular_bone", label: "Scapular bone" },
      ],
    },
  ],

  fibula: [
    {
      key: "fibulaTissueComposition",
      label: "Tissue Composition",
      type: "select",
      options: [
        { value: "bone_only", label: "Bone only" },
        { value: "osteocutaneous", label: "Osteocutaneous (with skin paddle)" },
        {
          value: "osteomyocutaneous",
          label: "Osteomyocutaneous (with FHL/soleus)",
        },
      ],
    },
    {
      key: "fibulaOsteotomyCount",
      label: "Number of Osteotomies",
      type: "select",
      required: true,
      options: [
        { value: "0", label: "0" },
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
        { value: "5", label: "5+" },
      ],
    },
    {
      key: "fibulaBarrel",
      label: "Barrel Configuration",
      type: "select",
      required: true,
      options: [
        { value: "single", label: "Single-barrel" },
        { value: "double", label: "Double-barrel" },
        { value: "hybrid_1_2_1", label: "Hybrid 1-2-1" },
        {
          value: "biaxial_double",
          label: "Biaxial double-barrel (for maxilla)",
        },
      ],
    },
    {
      key: "fibulaSkinPaddleType",
      label: "Skin Paddle Perforator Type (Yadav)",
      type: "select",
      options: [
        {
          value: "type_a_septocutaneous",
          label: "Type A \u2014 Septocutaneous (most common)",
        },
        {
          value: "type_b_septo_musculo",
          label: "Type B \u2014 Septo + musculocutaneous",
        },
        {
          value: "type_c_musculocutaneous",
          label: "Type C \u2014 Musculocutaneous only",
        },
        {
          value: "type_d_popliteal",
          label: "Type D \u2014 Popliteal artery supply (rare)",
        },
      ],
    },
    {
      key: "fibulaPlanningMethod",
      label: "Surgical Planning Method",
      type: "select",
      options: [
        { value: "freehand", label: "Freehand" },
        { value: "vsp_models", label: "VSP with stereolithographic models" },
        { value: "vsp_cutting_guides", label: "VSP with cutting guides" },
        { value: "vsp_psi", label: "VSP with patient-specific plates (PSI)" },
        { value: "in_house_vsp", label: "In-house VSP" },
      ],
    },
    {
      key: "fibulaBoneLengthCm",
      label: "Bone Length Harvested",
      type: "number",
      unit: "cm",
      placeholder: "12",
    },
    {
      key: "fibulaSkinPaddleCount",
      label: "Number of Skin Paddles",
      type: "select",
      options: [
        { value: "0", label: "0" },
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
      ],
    },
    {
      key: "fibulaFixation",
      label: "Fixation Method",
      type: "select",
      options: [
        { value: "reconstruction_plate", label: "Reconstruction plate" },
        { value: "miniplates", label: "Miniplates" },
        { value: "patient_specific_plate", label: "Patient-specific plate" },
        { value: "combination", label: "Combination" },
      ],
    },
    {
      key: "fibulaDentalImplant",
      label: "Dental Implant Timing",
      type: "select",
      options: [
        { value: "immediate", label: "Immediate ('Jaw in a Day')" },
        { value: "delayed", label: "Delayed" },
        { value: "not_planned", label: "Not planned" },
      ],
    },
    {
      key: "fibulaReconSite",
      label: "Reconstruction Site",
      type: "select",
      options: [
        { value: "mandible", label: "Mandible" },
        { value: "maxilla", label: "Maxilla" },
        { value: "long_bone", label: "Long bone" },
      ],
    },
    {
      key: "fibulaBrownClass",
      label: "Brown Classification",
      type: "select",
      hint: "Mandible defect classification (Brown et al.)",
      showWhen: { key: "fibulaReconSite", values: ["mandible"] },
      options: [
        { value: "I", label: "Class I — Lateral defect, condyle preserved" },
        {
          value: "IIa",
          label: "Class IIa — Hemimandible, condyle preserved",
        },
        { value: "IIb", label: "Class IIb — Hemimandible with condyle" },
        {
          value: "IIc",
          label: "Class IIc — Anterior + lateral, condyle preserved",
        },
        {
          value: "IId",
          label: "Class IId — Anterior + lateral with condyle",
        },
        { value: "III", label: "Class III — Central/anterior defect" },
        { value: "IV", label: "Class IV — Extensive bilateral defect" },
      ],
    },
    {
      key: "fibulaMandibleSegments",
      label: "Mandible Segments Involved",
      type: "multi_select",
      showWhen: { key: "fibulaReconSite", values: ["mandible"] },
      options: [
        { value: "symphysis", label: "Symphysis" },
        { value: "parasymphysis", label: "Parasymphysis" },
        { value: "body", label: "Body" },
        { value: "angle", label: "Angle" },
        { value: "ramus", label: "Ramus" },
        { value: "condyle", label: "Condyle" },
      ],
    },
  ],

  scapular: [
    {
      key: "scapularSkinPaddle",
      label: "Skin Paddle Type",
      type: "select",
      required: true,
      options: [
        {
          value: "scapular",
          label: "Scapular (transverse, CSA transverse branch)",
        },
        {
          value: "parascapular",
          label: "Parascapular (vertical, CSA descending branch)",
        },
        { value: "both_boomerang", label: "Both \u2014 boomerang" },
        { value: "none", label: "None" },
      ],
    },
    {
      key: "scapularBoneComponent",
      label: "Bone Component",
      type: "select",
      options: [
        { value: "none", label: "None" },
        {
          value: "lateral_border",
          label: "Lateral scapular border (CSA periosteal)",
        },
        {
          value: "scapular_tip",
          label: "Scapular tip/angle (angular branch from TDA)",
        },
        { value: "both", label: "Both (bipedicled bone)" },
      ],
    },
    {
      key: "scapularVascularPedicle",
      label: "Vascular Pedicle",
      type: "select",
      options: [
        { value: "csa_only", label: "CSA only" },
        {
          value: "subscapular_extended",
          label: "Subscapular artery (extended)",
        },
        { value: "tda_for_tip", label: "TDA (for scapular tip)" },
      ],
    },
    {
      key: "scapularChimericCount",
      label: "Number of Chimeric Components",
      type: "select",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
        { value: "5", label: "5+ (mega-flap)" },
      ],
    },
    {
      key: "scapularMusclesIncluded",
      label: "Muscles Included",
      type: "multi_select",
      options: [
        { value: "teres_major", label: "Teres major" },
        { value: "serratus_anterior", label: "Serratus anterior" },
        { value: "latissimus_dorsi", label: "Latissimus dorsi" },
      ],
    },
  ],

  parascapular: [
    {
      key: "scapularSkinPaddle",
      label: "Skin Paddle Type",
      type: "select",
      required: true,
      options: [
        {
          value: "scapular",
          label: "Scapular (transverse, CSA transverse branch)",
        },
        {
          value: "parascapular",
          label: "Parascapular (vertical, CSA descending branch)",
        },
        { value: "both_boomerang", label: "Both \u2014 boomerang" },
        { value: "none", label: "None" },
      ],
    },
    {
      key: "scapularBoneComponent",
      label: "Bone Component",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "lateral_border", label: "Lateral scapular border" },
        { value: "scapular_tip", label: "Scapular tip/angle" },
        { value: "both", label: "Both" },
      ],
    },
    {
      key: "scapularVascularPedicle",
      label: "Vascular Pedicle",
      type: "select",
      options: [
        { value: "csa_only", label: "CSA only" },
        {
          value: "subscapular_extended",
          label: "Subscapular artery (extended)",
        },
        { value: "tda_for_tip", label: "TDA (for scapular tip)" },
      ],
    },
    {
      key: "scapularChimericCount",
      label: "Number of Chimeric Components",
      type: "select",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
        { value: "5", label: "5+ (mega-flap)" },
      ],
    },
    {
      key: "scapularMusclesIncluded",
      label: "Muscles Included",
      type: "multi_select",
      options: [
        { value: "teres_major", label: "Teres major" },
        { value: "serratus_anterior", label: "Serratus anterior" },
        { value: "latissimus_dorsi", label: "Latissimus dorsi" },
      ],
    },
  ],

  sgap: [
    {
      key: "gapSubtype",
      label: "GAP Variant",
      type: "select",
      options: [
        { value: "sgap", label: "SGAP (standard)" },
        {
          value: "sc_gap",
          label: "sc-GAP (septocutaneous, between glut max + medius)",
        },
      ],
    },
    {
      key: "sgapSkinPaddle",
      label: "Skin Paddle Design",
      type: "select",
      required: true,
      options: [
        { value: "oblique", label: "Oblique (standard, PSIS-to-GT)" },
        { value: "transverse", label: "Transverse" },
        { value: "modified_lateral", label: "Modified lateral (for sc-GAP)" },
      ],
    },
    {
      key: "gapPerforatorType",
      label: "Perforator Type",
      type: "select",
      options: [
        { value: "musculocutaneous", label: "Musculocutaneous" },
        { value: "septocutaneous", label: "Septocutaneous" },
      ],
    },
    {
      key: "gapSensate",
      label: "Sensate (superior cluneal nerves)",
      type: "boolean",
    },
    {
      key: "gapStacked",
      label: "Stacked Configuration",
      type: "boolean",
    },
    {
      key: "gapPositionChange",
      label: "Position Change Required",
      type: "boolean",
    },
  ],

  igap: [
    {
      key: "igapSkinPaddle",
      label: "Skin Paddle Design",
      type: "select",
      required: true,
      options: [
        {
          value: "in_the_crease",
          label: "In-the-crease (scar in gluteal fold)",
        },
        { value: "oblique", label: "Oblique" },
        { value: "transverse", label: "Transverse" },
      ],
    },
    {
      key: "gapPerforatorType",
      label: "Perforator Type",
      type: "select",
      options: [
        { value: "musculocutaneous", label: "Musculocutaneous" },
        { value: "septocutaneous", label: "Septocutaneous" },
      ],
    },
    {
      key: "gapSensate",
      label: "Sensate",
      type: "boolean",
    },
    {
      key: "gapStacked",
      label: "Stacked Configuration",
      type: "boolean",
    },
    {
      key: "gapPositionChange",
      label: "Position Change Required",
      type: "boolean",
    },
  ],

  radial_forearm: [
    {
      key: "rfffTissueComposition",
      label: "Tissue Composition",
      type: "select",
      required: true,
      options: [
        { value: "fasciocutaneous", label: "Fasciocutaneous" },
        { value: "osteocutaneous", label: "Osteocutaneous (with radius)" },
        { value: "adipofascial", label: "Adipofascial (no skin)" },
        {
          value: "composite_palmaris",
          label: "Composite with palmaris longus",
        },
        {
          value: "composite_neuroteno",
          label: "Composite neuro-teno-cutaneous",
        },
      ],
    },
    {
      key: "rfffSensateNerve",
      label: "Sensate Innervation",
      type: "select",
      options: [
        { value: "non_sensate", label: "Non-sensate" },
        { value: "labcn", label: "LABCN (lateral antebrachial cutaneous)" },
        { value: "mabcn", label: "MABCN (medial antebrachial cutaneous)" },
        { value: "both", label: "Both" },
      ],
    },
    {
      key: "rfffDissectionPlane",
      label: "Dissection Plane",
      type: "select",
      options: [
        { value: "subfascial", label: "Subfascial (standard)" },
        {
          value: "suprafascial",
          label: "Suprafascial (preserves fascia over tendons)",
        },
      ],
    },
    {
      key: "rfffVariant",
      label: "Forearm Variant",
      type: "select",
      options: [
        { value: "radial", label: "Radial (RFFF)" },
        { value: "ulnar", label: "Ulnar (UFFF)" },
      ],
    },
    {
      key: "rfffConfiguration",
      label: "Flap Configuration",
      type: "select",
      options: [
        { value: "standard", label: "Standard" },
        { value: "folded", label: "Folded" },
        { value: "tubed", label: "Tubed (pharyngoesophageal)" },
      ],
    },
    {
      key: "rfffPalmarisIncluded",
      label: "Palmaris Longus Included",
      type: "select",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "absent", label: "Absent" },
      ],
    },
    {
      key: "rfffVenousDrainage",
      label: "Venous Drainage",
      type: "select",
      options: [
        { value: "venae_comitantes", label: "Venae comitantes" },
        { value: "cephalic_vein", label: "Cephalic vein" },
        { value: "both", label: "Both" },
      ],
    },
    {
      key: "rfffBoneSegmentCm",
      label: "Bone Segment Length (if osteocutaneous)",
      type: "number",
      unit: "cm",
      placeholder: "10",
      showWhen: { key: "rfffTissueComposition", values: ["osteocutaneous"] },
    },
    {
      key: "rfffProphylacticPlating",
      label: "Prophylactic Plating",
      type: "boolean",
      showWhen: { key: "rfffTissueComposition", values: ["osteocutaneous"] },
    },
    {
      key: "rfffSkinPaddleCount",
      label: "Number of Skin Paddles",
      type: "select",
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2 (bipaddle)" },
      ],
    },
    {
      key: "rfffBrachioradialisIncluded",
      label: "Brachioradialis Included",
      type: "boolean",
    },
    {
      key: "rfffFcrIncluded",
      label: "FCR Tendon Included",
      type: "boolean",
    },
  ],

  medial_sural: [
    {
      key: "msapTissueComposition",
      label: "Tissue Composition",
      type: "select",
      options: [
        { value: "fasciocutaneous", label: "Fasciocutaneous" },
        { value: "adipofascial", label: "Adipofascial" },
        {
          value: "chimeric_gastrocnemius",
          label: "Chimeric with medial gastrocnemius",
        },
      ],
    },
    {
      key: "msapBranchingPattern",
      label: "MSA Branching Pattern (Dusseldorp)",
      type: "select",
      required: true,
      options: [
        { value: "type_i_single", label: "Type I \u2014 Single branch (31%)" },
        {
          value: "type_iia_dual_superior",
          label: "Type IIa \u2014 Dual, takeoff superior (35%, best)",
        },
        {
          value: "type_iib_dual_inferior",
          label: "Type IIb \u2014 Dual, takeoff inferior (24%)",
        },
        {
          value: "type_iii_triple",
          label: "Type III \u2014 3+ branches (10%)",
        },
      ],
    },
    {
      key: "msapPerforatorCourse",
      label: "Subcutaneous Perforator Course",
      type: "select",
      options: [
        {
          value: "type_1_direct",
          label: "Type 1 \u2014 Direct vertical (31%)",
        },
        {
          value: "type_2_oblique",
          label: "Type 2 \u2014 Oblique (57%, most common)",
        },
        { value: "type_3_tortuous", label: "Type 3 \u2014 Tortuous (12%)" },
      ],
    },
    {
      key: "msapSensate",
      label: "Sensate",
      type: "select",
      options: [
        { value: "non_sensate", label: "Non-sensate" },
        {
          value: "medial_sural_cutaneous",
          label: "Medial sural cutaneous nerve",
        },
        { value: "sural_nerve", label: "Sural nerve (nerve-through-flap)" },
      ],
    },
    {
      key: "msapDominantBranch",
      label: "Dominant Branch",
      type: "select",
      options: [
        { value: "lateral", label: "Lateral" },
        { value: "medial", label: "Medial" },
      ],
    },
    {
      key: "msapChimericMuscle",
      label: "Chimeric Muscle Component",
      type: "select",
      options: [
        { value: "none", label: "None" },
        {
          value: "medial_gastrocnemius",
          label: "Medial gastrocnemius segment",
        },
      ],
    },
    {
      key: "msapThinning",
      label: "Flap Thinning",
      type: "select",
      options: [
        { value: "standard", label: "Standard" },
        { value: "thinned", label: "Thinned" },
      ],
    },
  ],

  serratus_anterior: [
    {
      key: "serratusSlipCount",
      label: "Number of Muscle Slips Harvested",
      type: "select",
      required: true,
      options: [
        { value: "1", label: "1" },
        { value: "2", label: "2" },
        { value: "3", label: "3 (standard lower 3)" },
        { value: "4", label: "4" },
        { value: "5", label: "5 (maximum on single pedicle)" },
      ],
    },
    {
      key: "serratusSpecificSlips",
      label: "Specific Slips Taken",
      type: "text",
      placeholder: "e.g., 7th, 8th, 9th",
    },
    {
      key: "serratusTissueComposition",
      label: "Tissue Composition",
      type: "select",
      options: [
        { value: "muscle_only", label: "Muscle only" },
        { value: "myocutaneous", label: "Myocutaneous (+ skin paddle)" },
        { value: "fascia_only", label: "Fascia only (carpaccio technique)" },
        { value: "osteomuscular", label: "Osteomuscular (+ rib)" },
        {
          value: "osteomyocutaneous",
          label: "Osteomyocutaneous (+ rib + skin)",
        },
      ],
    },
    {
      key: "serratusRibIncluded",
      label: "Rib Included",
      type: "boolean",
    },
    {
      key: "serratusRibNumbers",
      label: "Rib Numbers",
      type: "text",
      showWhen: { key: "serratusRibIncluded", values: ["true"] },
      placeholder: "e.g., 6th, 7th",
    },
    {
      key: "serratusNerveStatus",
      label: "Long Thoracic Nerve Status",
      type: "select",
      options: [
        { value: "preserved", label: "Preserved (functional)" },
        { value: "divided", label: "Divided (denervated)" },
      ],
    },
    {
      key: "serratusNerveTarget",
      label: "Nerve Coaptation Target (if functional)",
      type: "select",
      showWhen: { key: "serratusNerveStatus", values: ["preserved"] },
      options: [
        { value: "masseteric", label: "Masseteric" },
        { value: "facial_nerve", label: "Facial nerve branches" },
        { value: "cfng", label: "Cross-face nerve graft" },
      ],
    },
    {
      key: "serratusChimeric",
      label: "Chimeric Configuration",
      type: "select",
      options: [
        { value: "serratus_alone", label: "Serratus alone" },
        { value: "plus_ld", label: "+ Latissimus dorsi" },
        { value: "plus_ld_rib", label: "+ LD + Rib" },
        { value: "plus_ld_scapular_bone", label: "+ LD + Scapular bone" },
        { value: "mega_flap", label: "Subscapular mega-flap (3+ components)" },
      ],
    },
  ],

  tug: [
    {
      key: "gracilisTissueComposition",
      label: "Tissue Composition",
      type: "select",
      required: true,
      options: [
        { value: "muscle_only", label: "Muscle only" },
        { value: "myocutaneous", label: "Myocutaneous" },
        { value: "myofasciocutaneous", label: "Myofasciocutaneous" },
        { value: "perforator_only", label: "Perforator only" },
      ],
    },
    {
      key: "gracilisSkinPaddle",
      label: "Skin Paddle Orientation",
      type: "select",
      required: true,
      options: [
        { value: "transverse_tug", label: "Transverse (TUG/TMG)" },
        { value: "oblique_dug", label: "Oblique/Diagonal (DUG)" },
        { value: "l_shaped", label: "L-shaped" },
      ],
    },
    {
      key: "gracilisHarvestExtent",
      label: "Muscle Harvest Extent",
      type: "select",
      options: [
        { value: "complete", label: "Complete" },
        { value: "partial_proximal", label: "Partial-proximal" },
        { value: "segmental", label: "Segmental" },
      ],
    },
  ],

  medial_femoral_condyle: [
    {
      key: "mfcBoneSource",
      label: "Bone Harvest Site",
      type: "select",
      required: true,
      options: [
        { value: "medial_condyle", label: "Medial condyle" },
        { value: "supracondylar", label: "Supracondylar" },
        { value: "medial_epicondyle", label: "Medial epicondyle" },
      ],
    },
    {
      key: "mfcTissueComposition",
      label: "Tissue Composition",
      type: "select",
      options: [
        { value: "bone_only", label: "Bone only (corticoperiosteal)" },
        { value: "osteocutaneous", label: "Osteocutaneous" },
        { value: "osteoperiosteal", label: "Osteoperiosteal" },
      ],
    },
    {
      key: "mfcFixation",
      label: "Fixation Method",
      type: "select",
      options: [
        { value: "screws", label: "Screws" },
        { value: "plate_and_screws", label: "Plate and screws" },
        { value: "wires", label: "Wires" },
      ],
    },
    {
      key: "mfcBoneLength",
      label: "Bone Length",
      type: "number",
      unit: "cm",
      placeholder: "3",
    },
  ],
};

// Only show elevation plane for flaps where it's a genuine surgical decision.
// Flaps not listed are always raised in one plane (no choice to make).
export const FLAP_ELEVATION_PLANES: Partial<
  Record<FreeFlap, ElevationPlane[]>
> = {
  // ALT: full spectrum (the only flap with 6 distinct planes)
  alt: [
    "subfascial",
    "epifascial",
    "thin",
    "superthin",
    "ultrathin",
    "subdermal",
  ],
  // These have a meaningful subfascial vs suprafascial choice:
  radial_forearm: ["subfascial", "suprafascial"],
  scip: ["subfascial", "suprafascial"],
  medial_sural: ["subfascial", "suprafascial"],
  pap: ["subfascial", "suprafascial"],
  tdap: ["subfascial", "suprafascial"],
};
