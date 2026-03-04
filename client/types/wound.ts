// ============================================================
// Wound Episode Module — Types
// client/types/wound.ts
// ============================================================

// --- TIME Classification ---
export type WoundBedTissue =
  | "necrotic_black"
  | "necrotic_yellow"
  | "granulating"
  | "epithelialising"
  | "mixed";

export type ExudateAmount = "none" | "low" | "moderate" | "heavy";

export type ExudateType =
  | "serous"
  | "serosanguinous"
  | "haemosanguinous"
  | "purulent";

export type WoundEdgeStatus =
  | "attached"
  | "non_attached"
  | "rolled_under"
  | "hyperkeratotic"
  | "macerated";

export type WoundSurroundingSkin =
  | "intact"
  | "macerated"
  | "erythematous"
  | "dry_scaly"
  | "eczematous"
  | "callused";

export type InfectionSign =
  | "increased_exudate"
  | "erythema"
  | "warmth"
  | "oedema"
  | "malodour"
  | "delayed_healing"
  | "pain_or_tenderness"
  | "wound_breakdown";

export type HealingTrend = "improving" | "static" | "deteriorating";

export type DressingCategory =
  | "surgical_procedure"
  | "npwt"
  | "biological"
  | "antimicrobial"
  | "absorbent_foam"
  | "simple"
  | "other";

export interface DressingProduct {
  id: string;
  name: string;
  category: DressingCategory;
  manufacturer?: string;
  notes?: string;
  snomedCtCode?: string;
  snomedCtDisplay?: string;
}

export interface WoundDressingEntry {
  productId: string;
  productName: string;
  category: DressingCategory;
  quantity?: number;
  sizeDescription?: string;
  notes?: string;
}

export interface WoundAssessment {
  lengthCm?: number;
  widthCm?: number;
  depthCm?: number;
  areaCm2?: number;
  tissueType?: WoundBedTissue;
  exudateAmount?: ExudateAmount;
  exudateType?: ExudateType;
  edgeStatus?: WoundEdgeStatus;
  surroundingSkin?: WoundSurroundingSkin;
  infectionSigns?: InfectionSign[];
  dressings: WoundDressingEntry[];
  interventionNotes?: string;
  healingTrend?: HealingTrend;
  clinicianNote?: string;
  nextReviewDate?: string;
}

export const WOUND_BED_TISSUE_LABELS: Record<WoundBedTissue, string> = {
  necrotic_black: "Necrotic (Black eschar)",
  necrotic_yellow: "Sloughy (Yellow necrosis)",
  granulating: "Granulating (Red)",
  epithelialising: "Epithelialising (Pink)",
  mixed: "Mixed",
};

export const EXUDATE_AMOUNT_LABELS: Record<ExudateAmount, string> = {
  none: "None",
  low: "Low",
  moderate: "Moderate",
  heavy: "Heavy",
};

export const EXUDATE_TYPE_LABELS: Record<ExudateType, string> = {
  serous: "Serous (clear)",
  serosanguinous: "Serosanguinous (pink)",
  haemosanguinous: "Haemosanguinous (bloody)",
  purulent: "Purulent (infected)",
};

export const WOUND_EDGE_STATUS_LABELS: Record<WoundEdgeStatus, string> = {
  attached: "Attached",
  non_attached: "Non-attached",
  rolled_under: "Rolled under (epibole)",
  hyperkeratotic: "Hyperkeratotic / callused",
  macerated: "Macerated",
};

export const SURROUNDING_SKIN_LABELS: Record<WoundSurroundingSkin, string> = {
  intact: "Intact",
  macerated: "Macerated",
  erythematous: "Erythematous",
  dry_scaly: "Dry / scaly",
  eczematous: "Eczematous",
  callused: "Callused",
};

export const INFECTION_SIGN_LABELS: Record<InfectionSign, string> = {
  increased_exudate: "Increased exudate",
  erythema: "Erythema",
  warmth: "Warmth",
  oedema: "Oedema",
  malodour: "Malodour",
  delayed_healing: "Delayed healing",
  pain_or_tenderness: "Pain / tenderness",
  wound_breakdown: "Wound breakdown",
};

export const HEALING_TREND_LABELS: Record<HealingTrend, string> = {
  improving: "Improving",
  static: "Static",
  deteriorating: "Deteriorating",
};

export const DRESSING_CATEGORY_LABELS: Record<DressingCategory, string> = {
  surgical_procedure: "Surgical Procedure",
  npwt: "NPWT / VAC",
  biological: "Biological / Advanced",
  antimicrobial: "Antimicrobial",
  absorbent_foam: "Absorbent / Foam",
  simple: "Simple Dressing",
  other: "Other",
};

export const DRESSING_CATALOGUE: DressingProduct[] = [
  // Surgical Procedures
  {
    id: "surgical_debridement",
    name: "Surgical debridement",
    category: "surgical_procedure",
    snomedCtCode: "228401002",
    snomedCtDisplay: "Surgical wound debridement (procedure)",
  },
  {
    id: "vac_application",
    name: "VAC application (new)",
    category: "surgical_procedure",
    snomedCtCode: "229070002",
    snomedCtDisplay: "Application of vacuum dressing (procedure)",
  },
  {
    id: "vac_change",
    name: "VAC change",
    category: "surgical_procedure",
    snomedCtCode: "229070002",
    snomedCtDisplay: "Application of vacuum dressing (procedure)",
  },
  {
    id: "kerecis_application",
    name: "Kerecis application",
    category: "surgical_procedure",
    snomedCtCode: "182531007",
    snomedCtDisplay: "Application of biological dressing (procedure)",
  },
  {
    id: "stsg_application",
    name: "Split-thickness skin graft",
    category: "surgical_procedure",
    snomedCtCode: "15220000",
    snomedCtDisplay: "Split-thickness skin graft (procedure)",
  },
  {
    id: "ftsg_application",
    name: "Full-thickness skin graft",
    category: "surgical_procedure",
    snomedCtCode: "59550006",
    snomedCtDisplay: "Full-thickness skin graft (procedure)",
  },
  // NPWT
  {
    id: "kci_vac_ulta",
    name: "KCI V.A.C. Ulta",
    category: "npwt",
    manufacturer: "3M / KCI",
  },
  {
    id: "kci_vac_veraflo",
    name: "KCI V.A.C. VeraFlo (instillation)",
    category: "npwt",
    manufacturer: "3M / KCI",
  },
  {
    id: "sn_renasys",
    name: "Smith+Nephew RENASYS",
    category: "npwt",
    manufacturer: "Smith+Nephew",
  },
  {
    id: "molnlycke_avance",
    name: "Mölnlycke AVANCE",
    category: "npwt",
    manufacturer: "Mölnlycke",
  },
  {
    id: "pico_portable",
    name: "PICO (portable NPWT)",
    category: "npwt",
    manufacturer: "Smith+Nephew",
  },
  // Biological / Advanced
  {
    id: "kerecis_omega3_wound",
    name: "Kerecis Omega3 Wound",
    category: "biological",
    manufacturer: "Kerecis",
    notes: "Fish skin acellular dermal matrix — intact skin substitute",
    snomedCtCode: "406445005",
    snomedCtDisplay: "Biological wound dressing product (product)",
  },
  {
    id: "kerecis_omega3_burn",
    name: "Kerecis Omega3 Burn",
    category: "biological",
    manufacturer: "Kerecis",
    notes: "Fish skin matrix optimised for burn wounds",
  },
  {
    id: "kerecis_marigen_scaffold",
    name: "Kerecis Marigen Scaffold",
    category: "biological",
    manufacturer: "Kerecis",
    notes: "Dermal replacement / scaffold layer",
  },
  {
    id: "integra_drt",
    name: "Integra Dermal Regeneration Template",
    category: "biological",
    manufacturer: "Integra LifeSciences",
    notes: "Bilayer matrix — requires second-stage STSG",
  },
  {
    id: "integra_flowable",
    name: "Integra Flowable Wound Matrix",
    category: "biological",
    manufacturer: "Integra LifeSciences",
  },
  {
    id: "matriderm_1mm",
    name: "Matriderm 1mm",
    category: "biological",
    manufacturer: "MedSkin Solutions Dr. Suwelack",
    notes: "Single-stage with STSG",
  },
  {
    id: "matriderm_2mm",
    name: "Matriderm 2mm",
    category: "biological",
    manufacturer: "MedSkin Solutions Dr. Suwelack",
  },
  {
    id: "btm_polynovo",
    name: "BTM (PolyNovo)",
    category: "biological",
    manufacturer: "PolyNovo",
    notes: "Biodegradable temporising matrix",
  },
  {
    id: "pelnac",
    name: "Pelnac",
    category: "biological",
    manufacturer: "Gunze",
    notes: "Porcine collagen scaffold",
  },
  {
    id: "oasis_wound",
    name: "Oasis Wound Matrix",
    category: "biological",
    manufacturer: "Smith+Nephew",
    notes: "Porcine small intestinal submucosa",
  },
  {
    id: "amniofix",
    name: "AmnioFix",
    category: "biological",
    manufacturer: "MiMedx",
    notes: "Amniotic membrane allograft",
  },
  // Antimicrobial
  {
    id: "aquacel_ag_plus",
    name: "Aquacel Ag+",
    category: "antimicrobial",
    manufacturer: "ConvaTec",
    notes: "Silver + HMEC hydrofibre",
  },
  {
    id: "mepilex_ag",
    name: "Mepilex Ag",
    category: "antimicrobial",
    manufacturer: "Mölnlycke",
    notes: "Silver foam",
  },
  {
    id: "acticoat_7",
    name: "Acticoat 7",
    category: "antimicrobial",
    manufacturer: "Smith+Nephew",
    notes: "Nanocrystalline silver — 7 day wear",
  },
  {
    id: "kerlix_amd",
    name: "Kerlix AMD (PHMB)",
    category: "antimicrobial",
    manufacturer: "Cardinal Health",
    notes: "PHMB antimicrobial gauze",
  },
  {
    id: "iodosorb",
    name: "Iodosorb / Cadexomer Iodine",
    category: "antimicrobial",
    manufacturer: "Smith+Nephew",
  },
  {
    id: "betadine_gauze",
    name: "Betadine-soaked gauze",
    category: "antimicrobial",
  },
  // Absorbent / Foam
  {
    id: "mepilex_border",
    name: "Mepilex Border",
    category: "absorbent_foam",
    manufacturer: "Mölnlycke",
  },
  {
    id: "aquacel_extra",
    name: "Aquacel Extra",
    category: "absorbent_foam",
    manufacturer: "ConvaTec",
    notes: "High-absorbency hydrofibre",
  },
  {
    id: "biatain_adhesive",
    name: "Biatain Adhesive",
    category: "absorbent_foam",
    manufacturer: "Coloplast",
  },
  {
    id: "allevyn_adhesive",
    name: "Allevyn Adhesive",
    category: "absorbent_foam",
    manufacturer: "Smith+Nephew",
  },
  // Simple
  {
    id: "mepore",
    name: "Mepore",
    category: "simple",
    manufacturer: "Mölnlycke",
  },
  {
    id: "primapore",
    name: "Primapore",
    category: "simple",
    manufacturer: "Smith+Nephew",
  },
  {
    id: "jelonet",
    name: "Jelonet (paraffin tulle)",
    category: "simple",
    manufacturer: "Smith+Nephew",
  },
  {
    id: "bactigras",
    name: "Bactigras (chlorhexidine tulle)",
    category: "simple",
    manufacturer: "Smith+Nephew",
  },
  {
    id: "melolin",
    name: "Melolin (non-adherent)",
    category: "simple",
    manufacturer: "Smith+Nephew",
  },
  {
    id: "duoderm_cgf",
    name: "DuoDerm CGF (hydrocolloid)",
    category: "simple",
    manufacturer: "ConvaTec",
  },
  {
    id: "solosite_gel",
    name: "Solosite gel (hydrogel)",
    category: "simple",
    manufacturer: "Smith+Nephew",
  },
  // Other
  { id: "custom", name: "Other / custom", category: "other" },
];

export function getDressingsByCategory(
  category: DressingCategory,
): DressingProduct[] {
  return DRESSING_CATALOGUE.filter((p) => p.category === category);
}

export function getDressingCategories(): DressingCategory[] {
  const cats = new Set(DRESSING_CATALOGUE.map((p) => p.category));
  return Array.from(cats);
}
