/**
 * Peripheral Nerve Diagnosis Picklist — Full Module
 *
 * 37 diagnoses across 5 subcategories:
 *   4A: Upper Extremity Nerve Injury (12)
 *   4B: Brachial Plexus Injury (8)
 *   4C: Lower Extremity Nerve Injury (8)
 *   4D: Neuroma (5)
 *   4E: Nerve Tumours (4)
 *
 * SNOMED CT codes from Clinical Finding hierarchy (<<404684003).
 * Codes marked // VERIFY need validation against Ontoserver in Phase 7.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// 4A: UPPER EXTREMITY NERVE INJURY — 12 entries
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_UPPER_EXTREMITY: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_median_nerve_injury",
    displayName: "Median nerve injury",
    shortName: "Median nerve",
    snomedCtCode: "735061002", // VERIFY
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
    snomedCtCode: "735063004", // VERIFY
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
    snomedCtCode: "735062009", // VERIFY
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
    id: "pn_dx_ain_syndrome",
    displayName: "Anterior interosseous nerve syndrome",
    shortName: "AIN syndrome",
    snomedCtCode: "128196005", // VERIFY
    snomedCtDisplay: "Disorder of anterior interosseous nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: ["AIN", "anterior interosseous", "Kiloh-Nevin"],
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
    id: "pn_dx_pin_syndrome",
    displayName: "Posterior interosseous nerve syndrome",
    shortName: "PIN syndrome",
    snomedCtCode: "281377008", // VERIFY
    snomedCtDisplay: "Disorder of posterior interosseous nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: ["PIN", "posterior interosseous", "finger drop"],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_radial_tunnel_release",
        displayName: "Radial tunnel decompression",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "pn_dx_radial_tunnel_syndrome",
    displayName: "Radial tunnel syndrome",
    shortName: "Radial tunnel",
    snomedCtCode: "54521005", // VERIFY
    snomedCtDisplay: "Radial tunnel syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
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
        displayName: "Radial tunnel decompression",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "pn_dx_pronator_syndrome",
    displayName: "Pronator syndrome",
    shortName: "Pronator",
    snomedCtCode: "30753003", // VERIFY
    snomedCtDisplay: "Pronator syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "pronator syndrome",
      "proximal median compression",
      "forearm median nerve",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_pronator_release",
        displayName: "Pronator syndrome decompression",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 7,
  },
  {
    id: "pn_dx_guyon_canal_syndrome",
    displayName: "Guyon's canal syndrome",
    shortName: "Guyon's canal",
    snomedCtCode: "60057000", // VERIFY
    snomedCtDisplay: "Guyon's canal syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "Guyon's canal",
      "ulnar tunnel",
      "ulnar nerve wrist",
      "handlebar palsy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_guyon_canal_release",
        displayName: "Guyon's canal decompression",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 8,
  },
  {
    id: "pn_dx_thoracic_outlet_syndrome",
    displayName: "Thoracic outlet syndrome (neurogenic)",
    shortName: "TOS",
    snomedCtCode: "57891003", // VERIFY — updated from blueprint 128196005
    snomedCtDisplay: "Thoracic outlet syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "TOS",
      "thoracic outlet",
      "neurogenic TOS",
      "cervical rib",
      "scalene",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_tos_first_rib_resection",
        displayName: "TOS — first rib resection",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 9,
  },
  {
    id: "pn_dx_suprascapular_neuropathy",
    displayName: "Suprascapular neuropathy",
    shortName: "Suprascapular",
    snomedCtCode: "281377008", // VERIFY
    snomedCtDisplay: "Suprascapular neuropathy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Upper Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "suprascapular",
      "shoulder denervation",
      "spinoglenoid notch",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_suprascapular_release",
        displayName: "Suprascapular nerve release",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 10,
  },
  {
    id: "pn_dx_long_thoracic_palsy",
    displayName: "Long thoracic nerve palsy (winged scapula)",
    shortName: "Long thoracic palsy",
    snomedCtCode: "39291006", // VERIFY
    snomedCtDisplay: "Long thoracic nerve palsy (disorder)",
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
    sortOrder: 11,
  },
  {
    id: "pn_dx_spinal_accessory_injury",
    displayName: "Spinal accessory nerve injury",
    shortName: "SAN injury",
    snomedCtCode: "14755002", // Existing verified code
    snomedCtDisplay: "Injury of spinal accessory nerve (disorder)",
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
    sortOrder: 12,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4B: BRACHIAL PLEXUS INJURY — 8 entries
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_BRACHIAL_PLEXUS: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_bp_traction_upper",
    displayName: "Brachial plexus injury — upper (C5\u2013C6, Erb)",
    shortName: "Erb's palsy",
    snomedCtCode: "50560007", // Existing verified code
    snomedCtDisplay: "Erb-Duchenne paralysis (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    brachialPlexusModule: true,
    searchSynonyms: [
      "Erb",
      "Erb's",
      "upper trunk",
      "C5 C6",
      "brachial plexus injury",
      "BPI",
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
    id: "pn_dx_bp_traction_extended",
    displayName: "Brachial plexus injury — extended upper (C5\u2013C7)",
    shortName: "Extended upper BPI",
    snomedCtCode: "71553001", // VERIFY
    snomedCtDisplay: "Injury of brachial plexus (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    brachialPlexusModule: true,
    searchSynonyms: [
      "extended upper",
      "C5 C6 C7",
      "upper + middle trunk",
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
    sortOrder: 2,
  },
  {
    id: "pn_dx_bp_traction_complete",
    displayName: "Brachial plexus injury — complete (C5\u2013T1)",
    shortName: "Total BPI",
    snomedCtCode: "71553001",
    snomedCtDisplay: "Injury of brachial plexus (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    brachialPlexusModule: true,
    searchSynonyms: [
      "total BPI",
      "flail arm",
      "pan-plexus",
      "complete brachial plexus",
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
    sortOrder: 3,
  },
  {
    id: "pn_dx_bp_traction_lower",
    displayName: "Brachial plexus injury — lower (C8\u2013T1, Klumpke)",
    shortName: "Klumpke's palsy",
    snomedCtCode: "72688004",
    snomedCtDisplay: "Klumpke-Dejerine palsy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    brachialPlexusModule: true,
    searchSynonyms: [
      "Klumpke",
      "lower trunk",
      "C8 T1",
      "lower plexus injury",
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
    ],
    sortOrder: 4,
  },
  {
    id: "pn_dx_bp_obstetric",
    displayName: "Obstetric brachial plexus palsy (OBPP)",
    shortName: "OBPP",
    snomedCtCode: "17781004", // VERIFY
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
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_bp_exploration",
        displayName: "Brachial plexus exploration",
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
    sortOrder: 5,
  },
  {
    id: "pn_dx_bp_penetrating",
    displayName: "Brachial plexus injury — penetrating/GSW",
    shortName: "Penetrating BPI",
    snomedCtCode: "71553001", // VERIFY
    snomedCtDisplay: "Injury of brachial plexus (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    brachialPlexusModule: true,
    searchSynonyms: [
      "penetrating plexus",
      "stab plexus",
      "GSW plexus",
      "gunshot plexus",
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
    ],
    sortOrder: 6,
  },
  {
    id: "pn_dx_bp_radiation",
    displayName: "Radiation-induced brachial plexopathy",
    shortName: "Radiation plexopathy",
    snomedCtCode: "363232006", // VERIFY
    snomedCtDisplay: "Radiation-induced brachial plexopathy (disorder)",
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
    sortOrder: 7,
  },
  {
    id: "pn_dx_bp_tumour",
    displayName: "Brachial plexus tumour (schwannoma/neurofibroma)",
    shortName: "Plexus tumour",
    snomedCtCode: "126948001", // VERIFY
    snomedCtDisplay: "Neoplasm of brachial plexus (disorder)",
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
    sortOrder: 8,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4C: LOWER EXTREMITY NERVE INJURY — 8 entries
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_LOWER_EXTREMITY: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_common_peroneal_injury",
    displayName: "Common peroneal nerve injury (foot drop)",
    shortName: "CPN palsy",
    snomedCtCode: "46968001", // Existing verified code
    snomedCtDisplay: "Common peroneal nerve palsy (disorder)",
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
    id: "pn_dx_tarsal_tunnel",
    displayName: "Tarsal tunnel syndrome",
    shortName: "Tarsal tunnel",
    snomedCtCode: "75799005", // VERIFY
    snomedCtDisplay: "Tarsal tunnel syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
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
    sortOrder: 2,
  },
  {
    id: "pn_dx_sciatic_injury",
    displayName: "Sciatic nerve injury",
    shortName: "Sciatic nerve",
    snomedCtCode: "35986008", // VERIFY
    snomedCtDisplay: "Sciatic nerve injury (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "sciatic nerve",
      "sciatic injury",
      "hip nerve injury",
    ],
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
    sortOrder: 3,
  },
  {
    id: "pn_dx_femoral_nerve_injury",
    displayName: "Femoral nerve injury",
    shortName: "Femoral nerve",
    snomedCtCode: "282765009", // VERIFY
    snomedCtDisplay: "Femoral nerve injury (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
    clinicalGroup: "trauma",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "femoral nerve",
      "quad weakness",
      "femoral nerve palsy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_repair_epineurial",
        displayName: "Nerve repair — epineurial",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "pn_dx_meralgia_paresthetica",
    displayName: "Meralgia paresthetica (LFCN)",
    shortName: "Meralgia",
    snomedCtCode: "76670007", // VERIFY
    snomedCtDisplay: "Meralgia paresthetica (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
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
    sortOrder: 5,
  },
  {
    id: "pn_dx_morton_neuroma",
    displayName: "Morton neuroma (interdigital)",
    shortName: "Morton neuroma",
    snomedCtCode: "42701004", // VERIFY
    snomedCtDisplay: "Morton neuroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
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
    sortOrder: 6,
  },
  {
    id: "pn_dx_obturator_neuropathy",
    displayName: "Obturator neuropathy",
    shortName: "Obturator",
    snomedCtCode: "281377008", // VERIFY
    snomedCtDisplay: "Obturator neuropathy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "obturator nerve",
      "obturator neuropathy",
      "groin nerve",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 7,
  },
  {
    id: "pn_dx_pudendal_neuropathy",
    displayName: "Pudendal neuropathy",
    shortName: "Pudendal",
    snomedCtCode: "128196005", // VERIFY
    snomedCtDisplay: "Pudendal neuropathy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Lower Extremity Nerve Injury",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "pudendal nerve",
      "pudendal neuralgia",
      "Alcock canal",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_neurolysis_external",
        displayName: "External neurolysis",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 8,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4D: NEUROMA — 5 entries
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_NEUROMA: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_neuroma_post_amputation",
    displayName: "Symptomatic neuroma — post-amputation",
    shortName: "Stump neuroma",
    snomedCtCode: "277879009", // VERIFY
    snomedCtDisplay: "Traumatic neuroma (disorder)",
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
    sortOrder: 1,
  },
  {
    id: "pn_dx_neuroma_traumatic",
    displayName: "Symptomatic neuroma — post-traumatic",
    shortName: "Traumatic neuroma",
    snomedCtCode: "277879009", // VERIFY
    snomedCtDisplay: "Traumatic neuroma (disorder)",
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
    sortOrder: 2,
  },
  {
    id: "pn_dx_neuroma_iatrogenic",
    displayName: "Symptomatic neuroma — iatrogenic",
    shortName: "Iatrogenic neuroma",
    snomedCtCode: "277879009", // VERIFY
    snomedCtDisplay: "Traumatic neuroma (disorder)",
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
    sortOrder: 3,
  },
  {
    id: "pn_dx_neuroma_in_continuity",
    displayName: "Neuroma-in-continuity",
    shortName: "NIC",
    snomedCtCode: "277879009", // VERIFY
    snomedCtDisplay: "Traumatic neuroma (disorder)",
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
    sortOrder: 4,
  },
  {
    id: "pn_dx_painful_nerve_scar",
    displayName: "Painful nerve scar (without neuroma)",
    shortName: "Nerve scar",
    snomedCtCode: "128196005", // VERIFY
    snomedCtDisplay: "Disorder of peripheral nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Neuroma",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "nerve scar",
      "painful scar",
      "perineural fibrosis",
    ],
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
// 4E: NERVE TUMOURS — 4 entries
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_TUMOUR: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_schwannoma",
    displayName: "Schwannoma (neurilemmoma)",
    shortName: "Schwannoma",
    snomedCtCode: "302858007", // Existing verified code
    snomedCtDisplay:
      "Malignant peripheral nerve sheath tumor (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
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
    snomedCtCode: "92564007", // VERIFY
    snomedCtDisplay: "Neurofibroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "elective",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "neurofibroma",
      "solitary neurofibroma",
      "nerve tumour",
    ],
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
    snomedCtCode: "92564007", // VERIFY
    snomedCtDisplay: "Neurofibroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "oncological",
    hasStaging: false,
    peripheralNerveModule: true,
    searchSynonyms: [
      "plexiform neurofibroma",
      "plexiform NF",
      "NF1 plexiform",
    ],
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
    snomedCtCode: "127037002", // VERIFY
    snomedCtDisplay:
      "Malignant peripheral nerve sheath tumor (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "oncological",
    hasStaging: false,
    peripheralNerveModule: true,
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
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const PERIPHERAL_NERVE_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...PN_DX_UPPER_EXTREMITY,
  ...PN_DX_BRACHIAL_PLEXUS,
  ...PN_DX_LOWER_EXTREMITY,
  ...PN_DX_NEUROMA,
  ...PN_DX_TUMOUR,
];
