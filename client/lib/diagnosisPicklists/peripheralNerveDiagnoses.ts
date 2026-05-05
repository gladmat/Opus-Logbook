/**
 * Facial & Peripheral Nerve Diagnosis Picklist — Full Module
 *
 * 30 diagnoses across 6 subcategories:
 *   4A: Upper Extremity Nerve Injury (5)
 *   4B: Brachial Plexus (4 — collapsed from 8, pattern inferred from diagram)
 *   4C: Compression Neuropathies (10 — moved from Upper/Lower Extremity + new CPN)
 *   4D: Lower Extremity Nerve Injury (5 — trimmed, compressions moved out)
 *   4E: Neuroma (6 — Morton neuroma moved here from Lower Extremity)
 *   4F: Nerve Tumours (4 — with nerveTumourModule flag)
 *
 * Facial Nerve cross-reference from Head & Neck added via PN_DX_FACIAL_NERVE_XREF.
 *
 * SNOMED CT codes from Clinical Finding hierarchy (<<404684003).
 * All codes validated against Ontoserver (March 2026 audit).
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import { HN_DX_FACIAL_NERVE } from "./headNeckDiagnoses";

// ═══════════════════════════════════════════════════════════════════════════════
// 4A: UPPER EXTREMITY NERVE INJURY — 5 entries (compressions moved to 4C)
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_UPPER_EXTREMITY: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_median_nerve_injury",
    displayName: "Median nerve injury",
    shortName: "Median nerve",
    snomedCtCode: "67279004",
    snomedCtDisplay: "Injury of median nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "median nerve",
      "median nerve laceration",
      "wrist nerve injury",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_repair_epineurial",
        displayName: "Nerve repair — epineurial",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "pn_dx_ulnar_nerve_injury",
    displayName: "Ulnar nerve injury",
    shortName: "Ulnar nerve",
    snomedCtCode: "62745008",
    snomedCtDisplay: "Injury of ulnar nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "ulnar nerve",
      "ulnar nerve laceration",
      "ulnar nerve injury",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_repair_epineurial",
        displayName: "Nerve repair — epineurial",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "pn_dx_radial_nerve_injury",
    displayName: "Radial nerve injury",
    shortName: "Radial nerve",
    snomedCtCode: "87450004",
    snomedCtDisplay: "Injury of radial nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "radial nerve",
      "wrist drop",
      "radial nerve palsy",
      "Saturday night palsy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_repair_epineurial",
        displayName: "Nerve repair — epineurial",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_tt_radial_nerve_set",
        displayName: "Tendon transfer set — radial nerve palsy",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "pn_dx_long_thoracic_palsy",
    displayName: "Long thoracic nerve palsy (winged scapula)",
    shortName: "Long thoracic palsy",
    snomedCtCode: "212291002",
    snomedCtDisplay: "Long thoracic nerve injury (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "winged scapula",
      "long thoracic",
      "serratus anterior palsy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_transfer_long_thoracic",
        displayName: "Nerve transfer for long thoracic palsy",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "pn_dx_spinal_accessory_injury",
    displayName: "Spinal accessory nerve injury",
    shortName: "SAN injury",
    snomedCtCode: "90630009",
    snomedCtDisplay: "Injury of accessory nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "spinal accessory",
      "XI nerve",
      "trapezius palsy",
      "shoulder droop",
      "post-LND nerve injury",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_repair_epineurial",
        displayName: "Nerve repair — epineurial",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_nerve_graft_autograft",
        displayName: "Nerve graft — autograft",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4B: BRACHIAL PLEXUS — 4 entries
// Collapsed from 8: traction-pattern entries (Erb, extended upper, complete,
// Klumpke) and penetrating merged into pn_dx_bp_traumatic. Injury pattern is
// now INFERRED from the BrachialPlexusAssessment interactive diagram.
// Legacy IDs mapped in diagnosisPicklists/index.ts → LEGACY_DIAGNOSIS_IDS.
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_BRACHIAL_PLEXUS: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_bp_obstetric",
    displayName: "Obstetric brachial plexus palsy (OBPP)",
    shortName: "OBPP",
    snomedCtCode: "46894009",
    snomedCtDisplay: "Obstetric brachial plexus palsy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "congenital",
    hasStaging: false,
    peripheralNerveModule: true,
    brachialPlexusModule: true,
    searchSynonyms: [
      "OBPP",
      "birth palsy",
      "obstetric brachial plexus",
      "neonatal plexus",
      "Erb",
      "Erb's",
      "Klumpke",
      "birth injury",
      "shoulder dystocia",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_bp_exploration",
        displayName: "Brachial plexus exploration",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_nerve_graft_autograft",
        displayName: "Nerve graft — autograft",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "pn_transfer_oberlin",
        displayName: "Oberlin transfer",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "pn_dx_bp_traumatic",
    displayName: "Post-traumatic brachial plexus injury",
    shortName: "Traumatic BPI",
    snomedCtCode: "6836001",
    snomedCtDisplay: "Injury of brachial plexus (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    brachialPlexusModule: true,
    searchSynonyms: [
      "traumatic",
      "motorcycle",
      "brachial plexus injury",
      "BPI",
      "traction",
      "avulsion",
      "penetrating",
      "stab",
      "GSW",
      "gunshot",
      "flail arm",
      "pan-plexus",
      "upper trunk",
      "lower trunk",
      "C5 C6",
      "C8 T1",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_bp_exploration",
        displayName: "Brachial plexus exploration",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_nerve_graft_autograft",
        displayName: "Nerve graft — autograft",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "pn_transfer_oberlin",
        displayName: "Oberlin transfer",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "pn_ffmt_gracilis_elbow_flexion",
        displayName: "Free functioning muscle transfer",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "pn_dx_bp_radiation",
    displayName: "Radiation-induced brachial plexopathy",
    shortName: "Radiation plexopathy",
    snomedCtCode: "1230019002",
    snomedCtDisplay: "Radiation-induced plexopathy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    brachialPlexusModule: true,
    searchSynonyms: [
      "radiation plexopathy",
      "post-radiation",
      "radiation brachial plexus",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "pn_dx_bp_tumour",
    displayName: "Brachial plexus tumour (schwannoma/neurofibroma)",
    shortName: "Plexus tumour",
    snomedCtCode: "189948006",
    snomedCtDisplay: "Schwannoma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "oncological",
    hasStaging: false,
    peripheralNerveModule: true,
    brachialPlexusModule: true,
    searchSynonyms: [
      "plexus tumour",
      "plexus schwannoma",
      "plexus neurofibroma",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_tumour_enucleation",
        displayName: "Nerve tumour enucleation",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4C: COMPRESSION NEUROPATHIES — 10 entries
// Moved from Upper Extremity (7) and Lower Extremity (2) + new CPN compression.
// These are elective compressions, not trauma injuries. Keep peripheralNerveModule
// true for lightweight assessment (ENG/EMG + ultrasound).
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_COMPRESSION: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_ain_syndrome",
    displayName: "Anterior interosseous syndrome (AIN)",
    shortName: "AIN syndrome",
    snomedCtCode: "43612004",
    snomedCtDisplay: "Anterior interosseous nerve syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "AIN",
      "anterior interosseous",
      "Kiloh-Nevin",
      "FPL weakness",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "pn_dx_pin_syndrome",
    displayName: "Posterior interosseous syndrome (PIN)",
    shortName: "PIN syndrome",
    snomedCtCode: "57893007",
    snomedCtDisplay: "Posterior interosseous nerve syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "PIN",
      "posterior interosseous",
      "finger drop",
      "radial tunnel",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "pn_dx_radial_tunnel_syndrome",
    displayName: "Radial tunnel syndrome",
    shortName: "Radial tunnel",
    snomedCtCode: "35563004",
    snomedCtDisplay: "Radial tunnel syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "radial tunnel",
      "resistant tennis elbow",
      "lateral elbow pain",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_radial_tunnel_release",
        displayName: "Radial tunnel release",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "pn_dx_pronator_syndrome",
    displayName: "Pronator syndrome",
    shortName: "Pronator syndrome",
    snomedCtCode: "33653009",
    snomedCtDisplay: "Pronator syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "pronator syndrome",
      "proximal median nerve",
      "lacertus fibrosus",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "pn_dx_guyon_canal_syndrome",
    displayName: "Guyon canal syndrome",
    shortName: "Guyon canal",
    snomedCtCode: "63017006",
    snomedCtDisplay: "Ulnar nerve entrapment at wrist (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "Guyon canal",
      "ulnar tunnel",
      "ulnar nerve wrist",
      "handlebar palsy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_guyon_canal_release",
        displayName: "Guyon canal release",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "pn_dx_thoracic_outlet_syndrome",
    displayName: "Neurogenic thoracic outlet syndrome",
    shortName: "TOS",
    snomedCtCode: "47890001",
    snomedCtDisplay: "Thoracic outlet syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "TOS",
      "thoracic outlet",
      "first rib",
      "scalene",
      "cervical rib",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_tos_decompression",
        displayName: "TOS decompression (scalenectomy ± rib resection)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "pn_dx_suprascapular_neuropathy",
    displayName: "Suprascapular neuropathy",
    shortName: "Suprascapular",
    snomedCtCode: "431800006",
    snomedCtDisplay: "Suprascapular neuropathy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "suprascapular",
      "spinoglenoid notch",
      "shoulder weakness",
      "infraspinatus wasting",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_suprascapular_release",
        displayName: "Suprascapular nerve release",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 7,
  },
  {
    id: "pn_dx_common_peroneal_compression",
    displayName: "Common peroneal nerve compression at fibular head",
    shortName: "CPN compression",
    snomedCtCode: "60389000",
    snomedCtDisplay: "Common peroneal nerve lesion (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "peroneal nerve compression",
      "fibular head compression",
      "foot drop compression",
      "CPN entrapment",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis — CPN at fibular head",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 8,
  },
  {
    id: "pn_dx_tarsal_tunnel",
    displayName: "Tarsal tunnel syndrome",
    shortName: "Tarsal tunnel",
    snomedCtCode: "47374004",
    snomedCtDisplay: "Tarsal tunnel syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "tarsal tunnel",
      "tibial nerve ankle",
      "posterior tibial nerve",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_tarsal_tunnel_release",
        displayName: "Tarsal tunnel release",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 9,
  },
  {
    id: "pn_dx_meralgia_paresthetica",
    displayName: "Meralgia paresthetica (LFCN)",
    shortName: "Meralgia",
    snomedCtCode: "85007004",
    snomedCtDisplay: "Meralgia paraesthetica (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathies",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "meralgia paresthetica",
      "LFCN",
      "lateral femoral cutaneous",
      "thigh numbness",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_lfcn_release",
        displayName: "LFCN decompression",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_lfcn_neurectomy",
        displayName: "LFCN neurectomy",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 10,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4D: LOWER EXTREMITY NERVE INJURY — 5 entries
// Trimmed from 8: tarsal tunnel + meralgia moved to Compression Neuropathies,
// Morton neuroma moved to Neuroma subcategory.
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_LOWER_EXTREMITY: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_common_peroneal_injury",
    displayName: "Common peroneal nerve injury (foot drop)",
    shortName: "CPN palsy",
    snomedCtCode: "25604001",
    snomedCtDisplay: "Traumatic injury of common peroneal nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "peroneal nerve",
      "foot drop",
      "common peroneal",
      "fibular nerve",
      "CPN",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: false,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_transfer_deep_peroneal",
        displayName: "Tibial branch \u2192 deep peroneal transfer",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "pn_dx_sciatic_injury",
    displayName: "Sciatic nerve injury",
    shortName: "Sciatic nerve",
    snomedCtCode: "35986008",
    snomedCtDisplay: "Sciatic nerve injury (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: ["sciatic nerve", "sciatic injury", "hip nerve injury"],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: false,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_nerve_graft_autograft",
        displayName: "Nerve graft — autograft",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "pn_dx_femoral_nerve_injury",
    displayName: "Femoral nerve injury",
    shortName: "Femoral nerve",
    snomedCtCode: "7449006",
    snomedCtDisplay: "Injury of femoral nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: ["femoral nerve", "quad weakness", "femoral nerve palsy"],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_repair_epineurial",
        displayName: "Nerve repair — epineurial",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "pn_dx_obturator_neuropathy",
    displayName: "Obturator neuropathy",
    shortName: "Obturator",
    snomedCtCode: "298130005",
    snomedCtDisplay: "Obturator neuropathy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: ["obturator nerve", "obturator neuropathy", "groin nerve"],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "pn_dx_pudendal_neuropathy",
    displayName: "Pudendal neuropathy",
    shortName: "Pudendal",
    snomedCtCode: "315056009",
    snomedCtDisplay: "Pudendal nerve neuropathy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: ["pudendal nerve", "pudendal neuralgia", "Alcock canal"],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 5,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4E: NEUROMA — 6 entries (Morton neuroma moved here from Lower Extremity)
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_NEUROMA: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_morton_neuroma",
    displayName: "Morton neuroma (interdigital)",
    shortName: "Morton neuroma",
    snomedCtCode: "30085007",
    snomedCtDisplay: "Morton's neuroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Neuroma",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    neuromaModule: true,
    searchSynonyms: [
      "Morton neuroma",
      "Morton's neuroma",
      "interdigital neuroma",
      "metatarsalgia",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_morton_neurectomy",
        displayName: "Morton neurectomy",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "pn_dx_neuroma_post_amputation",
    displayName: "Symptomatic neuroma — post-amputation",
    shortName: "Stump neuroma",
    snomedCtCode: "443892003",
    snomedCtDisplay: "Neuroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Neuroma",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    neuromaModule: true,
    searchSynonyms: [
      "stump neuroma",
      "amputation neuroma",
      "post-amputation pain",
      "phantom pain",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neuroma_tmr",
        displayName: "Targeted Muscle Reinnervation (TMR)",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_neuroma_rpni",
        displayName: "RPNI",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "pn_dx_neuroma_traumatic",
    displayName: "Symptomatic neuroma — post-traumatic",
    shortName: "Traumatic neuroma",
    snomedCtCode: "443892003",
    snomedCtDisplay: "Neuroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Neuroma",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    neuromaModule: true,
    searchSynonyms: [
      "traumatic neuroma",
      "post-traumatic neuroma",
      "painful nerve",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neuroma_excision_burial",
        displayName: "Neuroma excision + burial",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_neuroma_rpni",
        displayName: "RPNI",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "pn_dx_neuroma_iatrogenic",
    displayName: "Symptomatic neuroma — iatrogenic",
    shortName: "Iatrogenic neuroma",
    snomedCtCode: "443892003",
    snomedCtDisplay: "Neuroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Neuroma",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    neuromaModule: true,
    searchSynonyms: [
      "iatrogenic neuroma",
      "surgical neuroma",
      "post-surgical pain",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neuroma_excision_burial",
        displayName: "Neuroma excision + burial",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_neuroma_tmr",
        displayName: "TMR",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "pn_dx_neuroma_in_continuity",
    displayName: "Neuroma-in-continuity",
    shortName: "NIC",
    snomedCtCode: "443892003",
    snomedCtDisplay: "Neuroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Neuroma",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    neuromaModule: true,
    searchSynonyms: [
      "neuroma in continuity",
      "NIC",
      "nerve scar",
      "nerve thickening",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_internal",
        displayName: "Internal neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_nerve_graft_autograft",
        displayName: "Nerve graft — autograft",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "pn_dx_painful_nerve_scar",
    displayName: "Painful nerve scar (without neuroma)",
    shortName: "Nerve scar",
    snomedCtCode: "239178001",
    snomedCtDisplay: "Scar neuroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Neuroma",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: ["nerve scar", "painful scar", "perineural fibrosis"],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4F: NERVE TUMOURS — 4 entries
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_TUMOUR: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_schwannoma",
    displayName: "Schwannoma (neurilemmoma)",
    shortName: "Schwannoma",
    snomedCtCode: "189948006",
    snomedCtDisplay: "Schwannoma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    nerveTumourModule: true,
    searchSynonyms: [
      "schwannoma",
      "neurilemmoma",
      "nerve sheath tumour",
      "benign nerve tumour",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_tumour_enucleation",
        displayName: "Nerve tumour enucleation (schwannoma)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "pn_dx_neurofibroma_solitary",
    displayName: "Neurofibroma — solitary",
    shortName: "Neurofibroma",
    snomedCtCode: "404029005",
    snomedCtDisplay: "Neurofibroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    nerveTumourModule: true,
    searchSynonyms: ["neurofibroma", "solitary neurofibroma", "nerve tumour"],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_tumour_excision",
        displayName: "Nerve tumour excision with graft",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "pn_dx_neurofibroma_plexiform",
    displayName: "Plexiform neurofibroma",
    shortName: "Plexiform NF",
    snomedCtCode: "254242006",
    snomedCtDisplay: "Diffuse neurofibroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "oncological",
    hasStaging: false,
    peripheralNerveModule: true,
    nerveTumourModule: true,
    searchSynonyms: ["plexiform neurofibroma", "plexiform NF", "NF1 plexiform"],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_tumour_excision",
        displayName: "Nerve tumour excision with graft",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "pn_dx_mpnst",
    displayName: "Malignant peripheral nerve sheath tumour (MPNST)",
    shortName: "MPNST",
    snomedCtCode: "404037002",
    snomedCtDisplay: "Malignant peripheral nerve sheath tumour (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "oncological",
    hasStaging: false,
    peripheralNerveModule: true,
    nerveTumourModule: true,
    searchSynonyms: [
      "MPNST",
      "malignant nerve sheath",
      "neurofibrosarcoma",
      "NF1 tumour",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_tumour_radical_excision",
        displayName: "Nerve tumour radical excision (MPNST)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4G: FACIAL NERVE — Cross-reference from Head & Neck
// These diagnoses are OWNED by head_neck; they appear here for discoverability
// in the peripheral nerve picker. The `crossReferenceFrom` field marks them.
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_FACIAL_NERVE_XREF: DiagnosisPicklistEntry[] =
  HN_DX_FACIAL_NERVE.map((dx) => ({
    ...dx,
    crossReferenceFrom: "head_neck" as const,
  }));

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const PERIPHERAL_NERVE_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...PN_DX_UPPER_EXTREMITY,
  ...PN_DX_BRACHIAL_PLEXUS,
  ...PN_DX_COMPRESSION,
  ...PN_DX_LOWER_EXTREMITY,
  ...PN_DX_FACIAL_NERVE_XREF,
  ...PN_DX_NEUROMA,
  ...PN_DX_TUMOUR,
];
