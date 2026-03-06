/**
 * Cleft & Craniofacial Diagnosis Picklist
 *
 * Re-maps 4 cleft entries from headNeckDiagnoses.ts (hn_dx_cleft_*)
 * and adds new entries for craniosynostosis, craniofacial microsomia,
 * Treacher Collins, Pierre Robin, VPI, and cleft nasal deformity.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// CLEFT LIP & PALATE — Re-mapped from head_neck with specialty: "cleft_cranio"
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_CLEFT: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_cleft_lip_unilateral",
    displayName: "Cleft lip — unilateral",
    shortName: "Unilateral cleft lip",
    snomedCtCode: "80281008",
    snomedCtDisplay: "Unilateral cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip & Palate",
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
    id: "cc_dx_cleft_lip_bilateral",
    displayName: "Cleft lip — bilateral",
    shortName: "Bilateral cleft lip",
    snomedCtCode: "87979003",
    snomedCtDisplay: "Bilateral cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip & Palate",
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
    id: "cc_dx_cleft_palate",
    displayName: "Cleft palate",
    shortName: "Cleft palate",
    snomedCtCode: "87979003",
    snomedCtDisplay: "Cleft palate (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip & Palate",
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
    id: "cc_dx_alveolar_cleft",
    displayName: "Alveolar cleft",
    shortName: "Alveolar cleft",
    snomedCtCode: "87979003",
    snomedCtDisplay: "Alveolar cleft (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip & Palate",
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
// SECONDARY / REVISION
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_SECONDARY: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_cleft_rhinoplasty",
    displayName: "Cleft nasal deformity (rhinoplasty)",
    shortName: "Cleft rhinoplasty",
    snomedCtCode: "253986002",
    snomedCtDisplay: "Nasal deformity associated with cleft (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Secondary / Revision",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "cleft nose",
      "cleft rhinoplasty",
      "secondary rhinoplasty",
      "nasal deformity cleft",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_cleft_rhinoplasty",
        displayName: "Cleft rhinoplasty",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_oronasal_fistula",
    displayName: "Oronasal fistula (post-palatoplasty)",
    shortName: "Palatal fistula",
    snomedCtCode: "31990004",
    snomedCtDisplay: "Oronasal fistula (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Secondary / Revision",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "palatal fistula",
      "oronasal fistula",
      "post-palatoplasty fistula",
      "fistula repair",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fistula_repair",
        displayName: "Oronasal fistula repair",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "cc_dx_vpi",
    displayName: "Velopharyngeal insufficiency (VPI)",
    shortName: "VPI",
    snomedCtCode: "42402006",
    snomedCtDisplay: "Velopharyngeal insufficiency (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Secondary / Revision",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "VPI",
      "velopharyngeal",
      "hypernasality",
      "pharyngoplasty",
      "speech surgery",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_pharyngoplasty",
        displayName: "Pharyngoplasty (VPI surgery)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CRANIOFACIAL — Syndromic & craniosynostosis
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_CRANIOFACIAL: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_craniosynostosis_sagittal",
    displayName: "Craniosynostosis — sagittal (scaphocephaly)",
    shortName: "Sagittal synostosis",
    snomedCtCode: "57219006",
    snomedCtDisplay: "Sagittal craniosynostosis (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "sagittal synostosis",
      "scaphocephaly",
      "craniosynostosis",
      "strip craniectomy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_vault_remodel",
        displayName: "Cranial vault remodelling",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_craniosynostosis_metopic",
    displayName: "Craniosynostosis — metopic (trigonocephaly)",
    shortName: "Metopic synostosis",
    snomedCtCode: "57219006",
    snomedCtDisplay: "Metopic craniosynostosis (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "metopic synostosis",
      "trigonocephaly",
      "frontal synostosis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_foa",
        displayName: "Fronto-orbital advancement (FOA)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "cc_dx_craniosynostosis_coronal",
    displayName: "Craniosynostosis — coronal (plagiocephaly / brachycephaly)",
    shortName: "Coronal synostosis",
    snomedCtCode: "57219006",
    snomedCtDisplay: "Coronal craniosynostosis (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "coronal synostosis",
      "plagiocephaly",
      "brachycephaly",
      "unicoronal",
      "bicoronal",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_foa",
        displayName: "Fronto-orbital advancement (FOA)",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "cc_dx_crouzon",
    displayName: "Crouzon / Apert syndrome (syndromic craniosynostosis)",
    shortName: "Syndromic synostosis",
    snomedCtCode: "85946009",
    snomedCtDisplay: "Crouzon syndrome (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "Crouzon",
      "Apert",
      "Pfeiffer",
      "Muenke",
      "syndromic craniosynostosis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_foa",
        displayName: "Fronto-orbital advancement (FOA)",
        isDefault: false,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_monobloc",
        displayName: "Monobloc / Le Fort III advancement",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_midface_advancement",
        displayName: "Midface advancement / distraction",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "cc_dx_craniofacial_microsomia",
    displayName: "Craniofacial microsomia (hemifacial microsomia)",
    shortName: "CFM",
    snomedCtCode: "32779007",
    snomedCtDisplay: "Hemifacial microsomia (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "hemifacial microsomia",
      "Goldenhar",
      "OAV spectrum",
      "CFM",
      "mandibular hypoplasia",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_mandibular_distraction",
        displayName: "Mandibular distraction osteogenesis",
        isDefault: false,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_microsomia_reconstruction",
        displayName: "Craniofacial microsomia reconstruction",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "cc_dx_treacher_collins",
    displayName: "Treacher Collins syndrome",
    shortName: "TCS",
    snomedCtCode: "64520003",
    snomedCtDisplay: "Treacher Collins syndrome (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "Treacher Collins",
      "TCS",
      "mandibulofacial dysostosis",
      "Franceschetti",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_mandibular_distraction",
        displayName: "Mandibular distraction osteogenesis",
        isDefault: false,
        sortOrder: 1,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "cc_dx_pierre_robin",
    displayName: "Pierre Robin sequence",
    shortName: "PRS",
    snomedCtCode: "81987001",
    snomedCtDisplay: "Robin sequence (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "Pierre Robin",
      "PRS",
      "Robin sequence",
      "micrognathia",
      "airway obstruction neonatal",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_mandibular_distraction",
        displayName: "Mandibular distraction osteogenesis",
        isDefault: false,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "hn_cleft_palate",
        displayName: "Cleft palate repair",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 7,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const CLEFT_CRANIO_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...CC_DX_CLEFT,
  ...CC_DX_SECONDARY,
  ...CC_DX_CRANIOFACIAL,
];
