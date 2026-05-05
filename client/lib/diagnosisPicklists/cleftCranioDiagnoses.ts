/**
 * Cleft & Craniofacial Diagnosis Picklist
 *
 * 38 structured diagnoses covering >95% of cleft/craniofacial cases.
 * Organised in 9 subcategories.
 *
 * SNOMED CT codes are from the Clinical Finding hierarchy (<<404684003).
 * International Edition only — no UK/AU extension codes.
 *
 * Procedure suggestion IDs reference ProcedurePicklistEntry.id values
 * with `cc_` prefix in procedurePicklist.ts.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CLEFT LIP
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_CLEFT_LIP: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_cleft_lip_unilateral_incomplete",
    displayName: "Cleft lip — unilateral incomplete",
    shortName: "UCL incomplete",
    snomedCtCode: "80281008",
    snomedCtDisplay: "Cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "incomplete cleft lip",
      "partial cleft lip",
      "unilateral lip",
      "simonart band",
      "UCL",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lip_repair_unilateral",
        displayName: "Unilateral cleft lip repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_primary_rhinoplasty",
        displayName: "Primary cleft rhinoplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_grommets",
        displayName: "Myringotomy with grommet insertion",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_cleft_lip_unilateral_complete",
    displayName: "Cleft lip — unilateral complete",
    shortName: "UCL complete",
    snomedCtCode: "80281008",
    snomedCtDisplay: "Cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "complete cleft lip",
      "total cleft lip",
      "full cleft lip",
      "unilateral complete",
      "UCL",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lip_repair_unilateral",
        displayName: "Unilateral cleft lip repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_primary_rhinoplasty",
        displayName: "Primary cleft rhinoplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_lip_adhesion",
        displayName: "Lip adhesion",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_grommets",
        displayName: "Myringotomy with grommet insertion",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "cc_dx_cleft_lip_bilateral",
    displayName: "Cleft lip — bilateral",
    shortName: "BCL",
    snomedCtCode: "304068004",
    snomedCtDisplay: "Bilateral cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "bilateral cleft lip",
      "BCL",
      "double cleft lip",
      "bilateral cheiloschisis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lip_repair_bilateral",
        displayName: "Bilateral cleft lip repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_primary_rhinoplasty",
        displayName: "Primary cleft rhinoplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_grommets",
        displayName: "Myringotomy with grommet insertion",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "cc_dx_cleft_lip_microform",
    displayName: "Microform cleft lip",
    shortName: "Microform CL",
    snomedCtCode: "80281008", // Intl parent — no Intl code for microform qualifier
    snomedCtDisplay: "Cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "microform",
      "forme fruste",
      "minor form cleft",
      "mini microform",
      "pseudocleft",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lip_scar_revision",
        displayName: "Cleft lip scar revision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_lip_repair_unilateral",
        displayName: "Unilateral cleft lip repair",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CLEFT PALATE
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_CLEFT_PALATE: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_cleft_soft_palate",
    displayName: "Cleft soft palate",
    shortName: "Soft palate cleft",
    snomedCtCode: "47563007",
    snomedCtDisplay: "Cleft palate, soft (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Palate",
    clinicalGroup: "congenital",
    hasStaging: true, // Veau classification
    searchSynonyms: [
      "soft palate cleft",
      "veau I",
      "veau 1",
      "posterior cleft palate",
      "velar cleft",
      "CP",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_palate_repair_soft",
        displayName: "Repair of cleft soft palate",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_grommets",
        displayName: "Myringotomy with grommet insertion",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_cleft_hard_soft_palate",
    displayName: "Cleft hard and soft palate",
    shortName: "Hard+soft palate cleft",
    snomedCtCode: "63567004",
    snomedCtDisplay: "Cleft hard palate with cleft soft palate (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Palate",
    clinicalGroup: "congenital",
    hasStaging: true, // Veau classification
    searchSynonyms: [
      "complete cleft palate",
      "veau II",
      "veau 2",
      "hard palate cleft",
      "palatoschisis",
      "CP",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_palatoplasty",
        displayName: "Palatoplasty",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_vomer_flap",
        displayName: "Vomer flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_grommets",
        displayName: "Myringotomy with grommet insertion",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "cc_dx_submucous_cleft_palate",
    displayName: "Submucous cleft palate",
    shortName: "SMCP",
    snomedCtCode: "763108005",
    snomedCtDisplay: "Submucous cleft palate (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Palate",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "submucosal cleft",
      "occult cleft",
      "zona pellucida",
      "muscular diastasis",
      "SMCP",
      "Calnan triad",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_palate_repair_soft",
        displayName: "Repair of cleft soft palate",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_sphincter_pharyngoplasty",
        displayName: "Sphincter pharyngoplasty",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "cc_dx_bifid_uvula",
    displayName: "Bifid uvula",
    shortName: "Bifid uvula",
    snomedCtCode: "68570004",
    snomedCtDisplay: "Bifid uvula (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Palate",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: ["split uvula", "cleft uvula", "bifid uvula"],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_palate_repair_soft",
        displayName: "Repair of cleft soft palate",
        isDefault: true,
        sortOrder: 1,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CLEFT LIP & PALATE
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_CLEFT_LIP_PALATE: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_uclp_complete",
    displayName: "Unilateral cleft lip and palate — complete",
    shortName: "UCLP complete",
    snomedCtCode: "87979003",
    snomedCtDisplay: "Cleft palate with cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip & Palate",
    clinicalGroup: "congenital",
    hasStaging: true, // Veau III
    searchSynonyms: [
      "UCLP",
      "unilateral complete CLP",
      "veau III",
      "veau 3",
      "complete unilateral",
      "cheilognathopalatoscisis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lip_repair_unilateral",
        displayName: "Unilateral cleft lip repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_primary_rhinoplasty",
        displayName: "Primary cleft rhinoplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_palatoplasty",
        displayName: "Palatoplasty",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_vomer_flap",
        displayName: "Vomer flap",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "cc_grommets",
        displayName: "Myringotomy with grommet insertion",
        isDefault: false,
        sortOrder: 5,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_uclp_incomplete",
    displayName: "Unilateral cleft lip and palate — incomplete",
    shortName: "UCLP incomplete",
    snomedCtCode: "87979003",
    snomedCtDisplay: "Cleft palate with cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip & Palate",
    clinicalGroup: "congenital",
    hasStaging: true,
    searchSynonyms: ["incomplete UCLP", "partial unilateral CLP", "UCLP"],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lip_repair_unilateral",
        displayName: "Unilateral cleft lip repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_primary_rhinoplasty",
        displayName: "Primary cleft rhinoplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_palatoplasty",
        displayName: "Palatoplasty",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_grommets",
        displayName: "Myringotomy with grommet insertion",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "cc_dx_bclp_complete",
    displayName: "Bilateral cleft lip and palate — complete",
    shortName: "BCLP complete",
    snomedCtCode: "70241007",
    snomedCtDisplay: "Cleft palate with bilateral cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip & Palate",
    clinicalGroup: "congenital",
    hasStaging: true, // Veau IV
    searchSynonyms: [
      "BCLP",
      "bilateral complete CLP",
      "veau IV",
      "veau 4",
      "bilateral complete",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lip_repair_bilateral",
        displayName: "Bilateral cleft lip repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_primary_rhinoplasty",
        displayName: "Primary cleft rhinoplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_palatoplasty",
        displayName: "Palatoplasty",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_vomer_flap",
        displayName: "Vomer flap",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "cc_grommets",
        displayName: "Myringotomy with grommet insertion",
        isDefault: false,
        sortOrder: 5,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "cc_dx_bclp_incomplete",
    displayName: "Bilateral cleft lip and palate — incomplete",
    shortName: "BCLP incomplete",
    snomedCtCode: "70241007",
    snomedCtDisplay: "Cleft palate with bilateral cleft lip (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Cleft Lip & Palate",
    clinicalGroup: "congenital",
    hasStaging: true,
    searchSynonyms: ["incomplete BCLP", "partial bilateral CLP", "BCLP"],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lip_repair_bilateral",
        displayName: "Bilateral cleft lip repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_primary_rhinoplasty",
        displayName: "Primary cleft rhinoplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_palatoplasty",
        displayName: "Palatoplasty",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_grommets",
        displayName: "Myringotomy with grommet insertion",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SECONDARY CLEFT DEFORMITY
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_SECONDARY: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_cleft_nasal_deformity",
    displayName: "Cleft nasal deformity",
    shortName: "Cleft nose",
    snomedCtCode: "249341006",
    snomedCtDisplay: "Cleft lip nasal deformity (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Secondary Cleft Deformity",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "cleft nose",
      "nasal asymmetry",
      "cleft rhinoplasty",
      "nasal deformity",
      "secondary nasal deformity",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_septorhinoplasty_definitive",
        displayName: "Cleft septorhinoplasty — definitive",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_rhinoplasty_intermediate",
        displayName: "Cleft rhinoplasty — intermediate",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_septorhinoplasty_rib_graft",
        displayName: "Septorhinoplasty with rib cartilage graft",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_columellar_lengthening",
        displayName: "Columellar lengthening",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_cleft_lip_scar",
    displayName: "Cleft lip scar / secondary lip deformity",
    shortName: "Cleft lip scar",
    snomedCtCode: "275322007",
    snomedCtDisplay: "Scar of skin (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Secondary Cleft Deformity",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "lip scar",
      "cleft lip revision",
      "lip asymmetry",
      "secondary lip deformity",
      "scar revision",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lip_scar_revision",
        displayName: "Cleft lip scar revision",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_abbe_flap",
        displayName: "Abbe flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_vermilion_advancement",
        displayName: "Vermilion advancement",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "cc_dx_oronasal_fistula",
    displayName: "Oronasal fistula (post-palatoplasty)",
    shortName: "Palatal fistula",
    snomedCtCode: "370485008",
    snomedCtDisplay: "Oronasal fistula (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Secondary Cleft Deformity",
    clinicalGroup: "congenital",
    hasStaging: true, // Pittsburgh fistula classification
    searchSynonyms: [
      "palatal fistula",
      "oronasal fistula",
      "ONF",
      "post-palatoplasty fistula",
      "fistula repair",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fistula_repair_local",
        displayName: "Oronasal fistula repair — local flaps",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_tongue_flap_fistula",
        displayName: "Tongue flap for fistula",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_buccal_fat_pad_flap",
        displayName: "Buccal fat pad flap",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 5. VELOPHARYNGEAL INSUFFICIENCY
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_VPI: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_vpi",
    displayName: "Velopharyngeal insufficiency (VPI)",
    shortName: "VPI",
    snomedCtCode: "232416001",
    snomedCtDisplay: "Velopharyngeal incompetence (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Velopharyngeal Insufficiency",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "VPI",
      "VPD",
      "velopharyngeal incompetence",
      "hypernasality",
      "nasal emission",
      "velopharyngeal dysfunction",
      "speech surgery",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_sphincter_pharyngoplasty",
        displayName: "Sphincter pharyngoplasty",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_pharyngeal_flap",
        displayName: "Pharyngeal flap",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_furlow_redo",
        displayName: "Furlow re-do / palatal lengthening",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_palate_rere_pair_sommerlad",
        displayName: "Palatal re-repair (Sommerlad)",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "cc_fat_injection_pharynx",
        displayName: "Fat injection to pharynx",
        isDefault: false,
        sortOrder: 5,
      },
    ],
    sortOrder: 1,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 6. ALVEOLAR & MAXILLARY
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_ALVEOLAR: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_alveolar_cleft",
    displayName: "Alveolar cleft",
    shortName: "Alveolar cleft",
    snomedCtCode: "445306000",
    snomedCtDisplay: "Cleft of alveolar ridge (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Alveolar & Maxillary",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "alveolar bone graft",
      "ABG",
      "secondary bone graft",
      "alveolar cleft",
      "alveolar ridge cleft",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_alveolar_bone_graft_secondary",
        displayName: "Secondary alveolar bone graft",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_alveolar_bone_graft_tertiary",
        displayName: "Tertiary alveolar bone graft",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_bone_graft_harvest_iliac",
        displayName: "Bone graft harvest — iliac crest",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_cleft_maxillary_hypoplasia",
    displayName: "Cleft maxillary hypoplasia",
    shortName: "Midface hypoplasia",
    snomedCtCode: "27299009",
    snomedCtDisplay: "Congenital maxillary hypoplasia (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Alveolar & Maxillary",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "midface hypoplasia",
      "maxillary retrusion",
      "class III cleft",
      "maxillary deficiency",
      "Le Fort I cleft",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_lefort_i_osteotomy",
        displayName: "Le Fort I osteotomy",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_lefort_i_distraction",
        displayName: "Le Fort I distraction osteogenesis",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_anterior_maxillary_distraction",
        displayName: "Anterior maxillary distraction",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 7. NON-SYNDROMIC CRANIOSYNOSTOSIS
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_CRANIOSYNOSTOSIS: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_sagittal_synostosis",
    displayName: "Craniosynostosis — sagittal (scaphocephaly)",
    shortName: "Sagittal synostosis",
    snomedCtCode: "109418001",
    snomedCtDisplay: "Scaphocephaly (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Non-Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "sagittal synostosis",
      "scaphocephaly",
      "dolichocephaly",
      "craniosynostosis",
      "strip craniectomy",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_pi_plasty",
        displayName: "Pi-plasty",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_endoscopic_strip_craniectomy",
        displayName: "Endoscopic strip craniectomy",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_cranial_vault_remodelling",
        displayName: "Open cranial vault remodelling",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_spring_cranioplasty",
        displayName: "Spring-assisted cranioplasty",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_metopic_synostosis",
    displayName: "Craniosynostosis — metopic (trigonocephaly)",
    shortName: "Metopic synostosis",
    snomedCtCode: "28740008",
    snomedCtDisplay: "Trigonocephaly (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Non-Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "metopic synostosis",
      "trigonocephaly",
      "metopic ridge",
      "frontal synostosis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_endoscopic_strip_craniectomy",
        displayName: "Endoscopic strip craniectomy",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_cranial_vault_remodelling",
        displayName: "Open cranial vault remodelling",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "cc_dx_unicoronal_synostosis",
    displayName: "Craniosynostosis — unicoronal (anterior plagiocephaly)",
    shortName: "Unicoronal synostosis",
    snomedCtCode: "254020001",
    snomedCtDisplay: "Unicoronal craniosynostosis (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Non-Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "anterior plagiocephaly",
      "unilateral coronal",
      "coronal synostosis",
      "harlequin deformity",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_endoscopic_strip_craniectomy",
        displayName: "Endoscopic strip craniectomy",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "cc_dx_bicoronal_synostosis",
    displayName: "Craniosynostosis — bicoronal (brachycephaly)",
    shortName: "Bicoronal synostosis",
    snomedCtCode: "13649004",
    snomedCtDisplay: "Brachycephaly (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Non-Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "brachycephaly",
      "bilateral coronal",
      "turribrachycephaly",
      "bicoronal synostosis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_posterior_vault_distraction",
        displayName: "Posterior cranial vault distraction",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_total_vault_remodelling",
        displayName: "Total cranial vault remodelling",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "cc_dx_lambdoid_synostosis",
    displayName: "Craniosynostosis — lambdoid",
    shortName: "Lambdoid synostosis",
    snomedCtCode: "109417006",
    snomedCtDisplay: "Parieto-occipital craniosynostosis (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Non-Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "lambdoid synostosis",
      "true posterior plagiocephaly",
      "lambdoid craniosynostosis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_posterior_vault_remodelling",
        displayName: "Posterior vault remodelling",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_cranial_vault_remodelling",
        displayName: "Open cranial vault remodelling",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "cc_dx_multisuture_synostosis",
    displayName: "Multi-suture craniosynostosis",
    shortName: "Multi-suture",
    snomedCtCode: "57219006",
    snomedCtDisplay: "Craniosynostosis (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Non-Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "pansynostosis",
      "complex craniosynostosis",
      "multi-sutural",
      "multiple suture",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_total_vault_remodelling",
        displayName: "Total cranial vault remodelling",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_posterior_vault_distraction",
        displayName: "Posterior cranial vault distraction",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "cc_dx_secondary_craniosynostosis",
    displayName: "Secondary / revision craniosynostosis",
    shortName: "Re-synostosis",
    snomedCtCode: "57219006",
    snomedCtDisplay: "Craniosynostosis (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Non-Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: true, // Whitaker classification
    searchSynonyms: [
      "re-synostosis",
      "recurrent craniosynostosis",
      "revision craniosynostosis",
      "secondary craniosynostosis",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_cranial_vault_remodelling",
        displayName: "Open cranial vault remodelling",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_cranioplasty",
        displayName: "Cranioplasty",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 7,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SYNDROMIC CRANIOSYNOSTOSIS
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_SYNDROMIC: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_apert",
    displayName: "Apert syndrome",
    shortName: "Apert",
    snomedCtCode: "205258009",
    snomedCtDisplay: "Apert syndrome (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: ["apert", "acrocephalosyndactyly type I", "FGFR2"],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_posterior_vault_distraction",
        displayName: "Posterior cranial vault distraction",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_monobloc_advancement",
        displayName: "Monobloc advancement",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_monobloc_distraction",
        displayName: "Monobloc distraction osteogenesis",
        isDefault: false,
        sortOrder: 4,
      },
      {
        procedurePicklistId: "cc_lefort_iii_advancement",
        displayName: "Le Fort III advancement",
        isDefault: false,
        sortOrder: 5,
      },
      {
        procedurePicklistId: "cc_facial_bipartition",
        displayName: "Facial bipartition",
        isDefault: false,
        sortOrder: 6,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_crouzon",
    displayName: "Crouzon syndrome",
    shortName: "Crouzon",
    snomedCtCode: "28861008",
    snomedCtDisplay: "Crouzon syndrome (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: ["crouzon", "craniofacial dysostosis", "FGFR2"],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_monobloc_advancement",
        displayName: "Monobloc advancement",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_lefort_iii_advancement",
        displayName: "Le Fort III advancement",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_lefort_iii_distraction",
        displayName: "Le Fort III distraction osteogenesis",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "cc_dx_pfeiffer",
    displayName: "Pfeiffer syndrome",
    shortName: "Pfeiffer",
    snomedCtCode: "205259001",
    snomedCtDisplay: "Pfeiffer syndrome (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "pfeiffer",
      "acrocephalosyndactyly type V",
      "FGFR1",
      "FGFR2",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_monobloc_advancement",
        displayName: "Monobloc advancement",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_posterior_vault_distraction",
        displayName: "Posterior cranial vault distraction",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_tracheostomy",
        displayName: "Tracheostomy",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "cc_dx_muenke",
    displayName: "Muenke syndrome",
    shortName: "Muenke",
    snomedCtCode: "57219006",
    snomedCtDisplay: "Craniosynostosis syndrome (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "muenke",
      "FGFR3",
      "Pro250Arg",
      "coronal synostosis FGFR3",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_cranial_vault_remodelling",
        displayName: "Open cranial vault remodelling",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 4,
  },
  {
    id: "cc_dx_saethre_chotzen",
    displayName: "Saethre-Chotzen syndrome",
    shortName: "Saethre-Chotzen",
    snomedCtCode: "83015004",
    snomedCtDisplay: "Saethre-Chotzen syndrome (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "saethre-chotzen",
      "acrocephalosyndactyly type III",
      "TWIST1",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_posterior_vault_remodelling",
        displayName: "Posterior vault remodelling",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "cc_dx_carpenter",
    displayName: "Carpenter syndrome",
    shortName: "Carpenter",
    snomedCtCode: "403767009",
    snomedCtDisplay: "Acrocephalopolysyndactyly type II (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Syndromic Craniosynostosis",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: ["carpenter", "acrocephalopolysyndactyly type II", "RAB23"],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_fronto_orbital_advancement",
        displayName: "Fronto-orbital advancement",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_total_vault_remodelling",
        displayName: "Total cranial vault remodelling",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 6,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 9. CRANIOFACIAL CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CC_DX_CRANIOFACIAL: DiagnosisPicklistEntry[] = [
  {
    id: "cc_dx_craniofacial_microsomia",
    displayName: "Craniofacial microsomia / hemifacial microsomia",
    shortName: "HFM",
    snomedCtCode: "254025006",
    snomedCtDisplay: "Hemifacial microsomia (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial Conditions",
    clinicalGroup: "congenital",
    hasStaging: false, // OMENS+ handled by CraniofacialAssessment component (multi-component structured input)
    searchSynonyms: [
      "hemifacial microsomia",
      "HFM",
      "OAV spectrum",
      "Goldenhar",
      "craniofacial microsomia",
      "first second branchial arch",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_mandibular_distraction",
        displayName: "Mandibular distraction osteogenesis",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_costochondral_rib_graft",
        displayName: "Costochondral rib graft to mandible",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_fat_grafting_face",
        displayName: "Fat grafting to face",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_ear_reconstruction_rib",
        displayName: "Rib graft ear reconstruction",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 1,
  },
  {
    id: "cc_dx_treacher_collins",
    displayName: "Treacher Collins syndrome",
    shortName: "Treacher Collins",
    snomedCtCode: "82203000",
    snomedCtDisplay: "Treacher Collins syndrome (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "treacher collins",
      "mandibulofacial dysostosis",
      "TCOF1",
      "Franceschetti",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_mandibular_distraction",
        displayName: "Mandibular distraction osteogenesis",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_orbital_box_osteotomy",
        displayName: "Orbital box osteotomy",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_ear_reconstruction_rib",
        displayName: "Rib graft ear reconstruction",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_fat_grafting_face",
        displayName: "Fat grafting to face",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 2,
  },
  {
    id: "cc_dx_pierre_robin",
    displayName: "Pierre Robin sequence",
    shortName: "Pierre Robin",
    snomedCtCode: "4602007",
    snomedCtDisplay: "Robin sequence (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "PRS",
      "Robin sequence",
      "micrognathia glossoptosis",
      "Pierre Robin",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_mandibular_distraction",
        displayName: "Mandibular distraction osteogenesis",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_tongue_lip_adhesion",
        displayName: "Tongue-lip adhesion",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_tracheostomy",
        displayName: "Tracheostomy",
        isDefault: false,
        sortOrder: 3,
      },
      {
        procedurePicklistId: "cc_palatoplasty",
        displayName: "Palatoplasty",
        isDefault: false,
        sortOrder: 4,
      },
    ],
    sortOrder: 3,
  },
  {
    id: "cc_dx_positional_plagiocephaly",
    displayName: "Positional plagiocephaly (non-synostotic)",
    shortName: "Positional plagio",
    snomedCtCode: "254024005",
    snomedCtDisplay: "Postural plagiocephaly (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "deformational plagiocephaly",
      "flat head",
      "non-synostotic plagiocephaly",
      "positional moulding",
    ],
    suggestedProcedures: [], // Consultation only — no surgical procedures
    sortOrder: 4,
  },
  {
    id: "cc_dx_encephalocele",
    displayName: "Encephalocele",
    shortName: "Encephalocele",
    snomedCtCode: "55999004",
    snomedCtDisplay: "Encephalocele (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "meningoencephalocele",
      "frontal encephalocele",
      "occipital encephalocele",
      "sincipital encephalocele",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_encephalocele_repair",
        displayName: "Encephalocele repair",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_cranioplasty",
        displayName: "Cranioplasty",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 5,
  },
  {
    id: "cc_dx_fibrous_dysplasia_craniofacial",
    displayName: "Fibrous dysplasia — craniofacial",
    shortName: "Craniofacial FD",
    snomedCtCode: "10623005",
    snomedCtDisplay: "Fibrous dysplasia of bone (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "craniofacial FD",
      "McCune-Albright",
      "monostotic",
      "polyostotic",
      "fibrous dysplasia",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_orbital_box_osteotomy",
        displayName: "Orbital box osteotomy",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_cranioplasty",
        displayName: "Cranioplasty",
        isDefault: false,
        sortOrder: 2,
      },
      {
        procedurePicklistId: "cc_custom_implant",
        displayName: "Custom craniofacial implant",
        isDefault: false,
        sortOrder: 3,
      },
    ],
    sortOrder: 6,
  },
  {
    id: "cc_dx_orbital_hypertelorism",
    displayName: "Orbital hypertelorism",
    shortName: "Hypertelorism",
    snomedCtCode: "22006008",
    snomedCtDisplay: "Hypertelorism (disorder)",
    specialty: "cleft_cranio",
    subcategory: "Craniofacial Conditions",
    clinicalGroup: "congenital",
    hasStaging: false,
    searchSynonyms: [
      "wide-set eyes",
      "increased interorbital distance",
      "hypertelorism",
      "orbital translocation",
    ],
    suggestedProcedures: [
      {
        procedurePicklistId: "cc_hypertelorism_correction",
        displayName: "Orbital hypertelorism correction",
        isDefault: true,
        sortOrder: 1,
      },
      {
        procedurePicklistId: "cc_facial_bipartition",
        displayName: "Facial bipartition",
        isDefault: false,
        sortOrder: 2,
      },
    ],
    sortOrder: 7,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT — Master array + helper functions
// ═══════════════════════════════════════════════════════════════════════════════

export const CLEFT_CRANIO_DIAGNOSES: DiagnosisPicklistEntry[] = [
  ...CC_DX_CLEFT_LIP,
  ...CC_DX_CLEFT_PALATE,
  ...CC_DX_CLEFT_LIP_PALATE,
  ...CC_DX_SECONDARY,
  ...CC_DX_VPI,
  ...CC_DX_ALVEOLAR,
  ...CC_DX_CRANIOSYNOSTOSIS,
  ...CC_DX_SYNDROMIC,
  ...CC_DX_CRANIOFACIAL,
];

/** Get all subcategories in display order */
export function getCleftCranioSubcategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dx of CLEFT_CRANIO_DIAGNOSES) {
    if (!seen.has(dx.subcategory)) {
      seen.add(dx.subcategory);
      result.push(dx.subcategory);
    }
  }
  return result;
}

/** Get diagnoses for a specific subcategory */
export function getCleftCranioDiagnosesForSubcategory(
  subcategory: string,
): DiagnosisPicklistEntry[] {
  return CLEFT_CRANIO_DIAGNOSES.filter((dx) => dx.subcategory === subcategory);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNOMED CT Audit — March 2026
// Validated against SNOMED CT International Edition via Ontoserver FHIR API
// (r4.ontoserver.csiro.au, CodeSystem/$lookup + ValueSet/$expand)
//
// 38 diagnoses:
//   - 34 International codes (confirmed moduleId 900000000000207008)
//   - 4 UK Clinical Extension codes replaced with International parents:
//       253983005 → 80281008  (microform cleft lip → cleft lip)
//       253986002 → 763108005 (submucous cleft palate — exact Intl match)
//       253982000 → 445306000 (cleft of alveolar ridge — exact Intl match)
//       253985003 → 27299009  (maxillary hypoplasia + cleft → congenital maxillary hypoplasia)
//   - 254020001 kept (unicoronal craniosynostosis — International, display corrected)
//
// 0 broken procedure suggestion cross-references (53 unique procedurePicklistIds)
// ═══════════════════════════════════════════════════════════════════════════════
