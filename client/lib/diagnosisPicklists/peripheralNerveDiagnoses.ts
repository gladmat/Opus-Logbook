/**
 * Peripheral Nerve Diagnosis Picklist
 *
 * New entries covering brachial plexus injury types, Erb's/Klumpke's,
 * nerve tumours, neuromas, TOS, and spinal accessory injury.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// BRACHIAL PLEXUS
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_BRACHIAL_PLEXUS: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_bpi_upper",
    displayName: "Brachial plexus injury — upper trunk (Erb's palsy)",
    shortName: "Erb's palsy",
    snomedCtCode: "50560007",
    snomedCtDisplay: "Erb-Duchenne paralysis (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "trauma",
    hasStaging: false,
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
        procedurePicklistId: "pn_bp_nerve_graft",
        displayName: "Brachial plexus nerve grafting",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "pn_bp_nerve_transfer",
        displayName: "Nerve transfer (brachial plexus)",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "pn_dx_bpi_lower",
    displayName: "Brachial plexus injury — lower trunk (Klumpke's palsy)",
    shortName: "Klumpke's palsy",
    snomedCtCode: "72688004",
    snomedCtDisplay: "Klumpke-Dejerine palsy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "trauma",
    hasStaging: false,
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
        procedurePicklistId: "pn_bp_nerve_graft",
        displayName: "Brachial plexus nerve grafting",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "pn_dx_bpi_total",
    displayName: "Brachial plexus injury — total (flail arm)",
    shortName: "Total BPI",
    snomedCtCode: "71553001",
    snomedCtDisplay: "Injury of brachial plexus (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "trauma",
    hasStaging: false,
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
        procedurePicklistId: "pn_bp_nerve_graft",
        displayName: "Brachial plexus nerve grafting",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "pn_bp_nerve_transfer",
        displayName: "Nerve transfer (brachial plexus)",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "pn_bp_free_functioning_muscle",
        displayName: "Free functioning muscle transfer",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "pn_dx_obstetric_bpi",
    displayName: "Obstetric brachial plexus palsy (OBPP)",
    shortName: "OBPP",
    snomedCtCode: "17781004",
    snomedCtDisplay: "Obstetric brachial plexus palsy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Brachial Plexus",
    clinicalGroup: "congenital",
    hasStaging: false,
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
        procedurePicklistId: "pn_bp_nerve_graft",
        displayName: "Brachial plexus nerve grafting",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "pn_bp_nerve_transfer",
        displayName: "Nerve transfer",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NERVE TRAUMA — non-brachial plexus
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_TRAUMA: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_spinal_accessory",
    displayName: "Spinal accessory nerve injury",
    shortName: "SAN injury",
    snomedCtCode: "14755002",
    snomedCtDisplay: "Injury of spinal accessory nerve (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "spinal accessory",
      "XI nerve",
      "trapezius palsy",
      "shoulder droop",
      "post-LND nerve injury",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_repair",
        displayName: "Nerve repair — primary",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hand_nerve_graft",
        displayName: "Nerve graft (cable / interposition)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hand_nerve_transfer",
        displayName: "Nerve transfer",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "pn_dx_common_peroneal",
    displayName: "Common peroneal nerve palsy",
    shortName: "CPN palsy",
    snomedCtCode: "46968001",
    snomedCtDisplay: "Common peroneal nerve palsy (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Trauma",
    clinicalGroup: "trauma",
    hasStaging: false,
    searchSynonyms: [
      "peroneal nerve",
      "foot drop",
      "common peroneal",
      "fibular nerve",
      "CPN",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_repair",
        displayName: "Nerve repair — primary",
        isDefault: false,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hand_nerve_graft",
        displayName: "Nerve graft (cable / interposition)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "hand_nerve_transfer",
        displayName: "Nerve transfer",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "pn_nerve_decompression",
        displayName: "Nerve decompression",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPRESSION NEUROPATHIES — non-hand
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_COMPRESSION: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_tos",
    displayName: "Thoracic outlet syndrome (TOS)",
    shortName: "TOS",
    snomedCtCode: "57891003",
    snomedCtDisplay: "Thoracic outlet syndrome (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Compression Neuropathy",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "TOS",
      "thoracic outlet",
      "neurogenic TOS",
      "cervical rib",
      "scalene",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_tos_decompression",
        displayName: "TOS decompression (first rib resection / scalenectomy)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NEUROMAS
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_NEUROMA: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_symptomatic_neuroma",
    displayName: "Symptomatic neuroma (painful stump / post-traumatic)",
    shortName: "Neuroma",
    snomedCtCode: "2099006",
    snomedCtDisplay: "Traumatic neuroma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Neuroma",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "neuroma",
      "painful neuroma",
      "stump neuroma",
      "neuroma-in-continuity",
      "post-amputation pain",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "hand_nerve_neuroma_excision",
        displayName: "Neuroma excision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_tmr",
        displayName: "Targeted muscle reinnervation (TMR)",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "pn_rpni",
        displayName: "Regenerative peripheral nerve interface (RPNI)",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// NERVE TUMOURS
// ═══════════════════════════════════════════════════════════════════════════════

const PN_DX_TUMOUR: DiagnosisPicklistEntry[] = [
  {
    id: "pn_dx_schwannoma",
    displayName: "Schwannoma (benign nerve sheath tumour)",
    shortName: "Schwannoma",
    snomedCtCode: "2099006",
    snomedCtDisplay: "Schwannoma (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "elective",
    hasStaging: false,
    searchSynonyms: [
      "schwannoma",
      "neurilemmoma",
      "nerve sheath tumour",
      "benign nerve tumour",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_schwannoma_excision",
        displayName: "Schwannoma excision (intrafascicular dissection)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "pn_dx_mpnst",
    displayName: "Malignant peripheral nerve sheath tumour (MPNST)",
    shortName: "MPNST",
    snomedCtCode: "302858007",
    snomedCtDisplay: "Malignant peripheral nerve sheath tumor (disorder)",
    specialty: "peripheral_nerve",
    subcategory: "Nerve Tumours",
    clinicalGroup: "oncological",
    hasStaging: false,
    searchSynonyms: [
      "MPNST",
      "malignant nerve sheath",
      "neurofibrosarcoma",
      "NF1 tumour",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "pn_nerve_sheath_tumour",
        displayName: "Nerve sheath tumour excision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "pn_nerve_biopsy",
        displayName: "Nerve biopsy",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const PERIPHERAL_NERVE_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...PN_DX_BRACHIAL_PLEXUS,
  ...PN_DX_TRAUMA,
  ...PN_DX_COMPRESSION,
  ...PN_DX_NEUROMA,
  ...PN_DX_TUMOUR,
];
