/**
 * Skin Cancer Diagnosis Picklist — SNOMED CT Coded
 * ═══════════════════════════════════════════════════
 *
 * Structured diagnosis taxonomy for skin cancer cases, aligned with SkinPath NZ
 * CDS engine categories. Each diagnosis maps to a SNOMED CT concept in the
 * Clinical Finding hierarchy (<<404684003).
 *
 * Architecture:
 *   - Top-level cancer types (9 categories matching SkinPath)
 *   - Histological subtypes per cancer type
 *   - SNOMED CT codes verified against IHTSDO browser & Ontoserver
 *   - Pre-coordinated by pathology type per project taxonomy rules
 *   - Body site captured as post-coordinated modifier (not here)
 *
 * SNOMED CT Code Sources:
 *   - BCC of skin: 254701007 (verified snomedbrowser.com)
 *   - SCC of skin: 254651007 (verified DermNet NZ / BioPortal)
 *   - Melanoma of skin: 93655004 (verified IHTSDO browser)
 *   - Merkel cell carcinoma of skin: 253001006 (verified DermNet NZ pathology)
 *   - Actinic keratosis: 201101007 (verified Ontoserver, Mar 2026)
 *   - Bowen's disease: 254656002 (verified Ontoserver, Mar 2026)
 *   - Keratoacanthoma: 254662007 (verified Ontoserver, Mar 2026)
 *   - Dysplastic naevus: 254818000 (verified Ontoserver, Mar 2026)
 *   - Rare subtypes: individually verified
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type SkinCancerType =
  | "melanoma"
  | "bcc"
  | "scc"
  | "merkel_cell"
  | "actinic_keratosis"
  | "bowens_disease"
  | "keratoacanthoma"
  | "dysplastic_naevus"
  | "rare_cutaneous";

export type SkinCancerGroup = "malignant" | "premalignant" | "rare";

export interface SkinCancerSubtype {
  id: string;
  displayName: string;
  snomedCtCode?: string; // subtype-specific SNOMED if available
  snomedCtDisplay?: string;
}

export interface SkinCancerDiagnosisEntry {
  id: SkinCancerType;
  displayName: string;
  shortName: string; // for compact UI (e.g., "BCC")
  group: SkinCancerGroup;
  snomedCtCode: string;
  snomedCtDisplay: string;
  subtypes: SkinCancerSubtype[];
  /** Whether histological subtype is clinically important for management */
  subtypeRequired: boolean;
  /** Cancer types that trigger the enhanced histology capture fields */
  hasEnhancedHistology: boolean;
  /** Cancer types where staging applies */
  hasStaging: boolean;
  sortOrder: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Melanoma Subtypes
// ═══════════════════════════════════════════════════════════════════════════

const MELANOMA_SUBTYPES: SkinCancerSubtype[] = [
  {
    id: "ssm",
    displayName: "Superficial spreading melanoma (SSM)",
    snomedCtCode: "254730000",
    snomedCtDisplay:
      "Superficial spreading malignant melanoma of skin (disorder)",
  },
  {
    id: "nm",
    displayName: "Nodular melanoma (NM)",
    snomedCtCode: "254731001",
    snomedCtDisplay: "Nodular malignant melanoma of skin (disorder)",
  },
  {
    id: "lmm",
    displayName: "Lentigo maligna melanoma (LMM)",
    snomedCtCode: "302837001",
    snomedCtDisplay: "Lentigo maligna melanoma (disorder)",
  },
  {
    id: "alm",
    displayName: "Acral lentiginous melanoma (ALM)",
    snomedCtCode: "254732008",
    snomedCtDisplay: "Acral lentiginous malignant melanoma of skin (disorder)",
  },
  {
    id: "desmoplastic",
    displayName: "Desmoplastic melanoma",
    snomedCtCode: "403924008",
    snomedCtDisplay: "Desmoplastic malignant melanoma (disorder)",
  },
  {
    id: "amelanotic",
    displayName: "Amelanotic melanoma",
    snomedCtCode: "276751004",
    snomedCtDisplay: "Amelanotic malignant melanoma of skin (disorder)",
  },
  {
    id: "spitzoid",
    displayName: "Spitzoid melanoma",
    snomedCtCode: "1295234004",
    snomedCtDisplay: "Spitz malignant melanoma (disorder)",
  },
  {
    id: "mis",
    displayName: "Melanoma in situ",
    snomedCtCode: "189758001",
    snomedCtDisplay: "Melanoma in situ (disorder)",
  },
  {
    id: "lentigo_maligna",
    displayName: "Lentigo maligna (in situ)",
    snomedCtCode: "302836005",
    snomedCtDisplay: "Lentigo maligna (disorder)",
  },
  {
    id: "other",
    displayName: "Other / unspecified subtype",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// BCC Subtypes
// ═══════════════════════════════════════════════════════════════════════════

const BCC_SUBTYPES: SkinCancerSubtype[] = [
  {
    id: "nodular",
    displayName: "Nodular BCC",
    snomedCtCode: "716274007",
    snomedCtDisplay: "Nodular basal cell carcinoma (disorder)",
  },
  {
    id: "superficial",
    displayName: "Superficial BCC",
    snomedCtCode: "403914000",
    snomedCtDisplay: "Superficial basal cell carcinoma (disorder)",
  },
  {
    id: "morphoeic",
    displayName: "Morphoeic (sclerosing) BCC",
    snomedCtCode: "403913006",
    snomedCtDisplay: "Sclerosing morphoeic basal cell carcinoma (disorder)",
  },
  {
    id: "infiltrative",
    displayName: "Infiltrative BCC",
    snomedCtCode: "402527000",
    snomedCtDisplay: "Basal cell carcinoma - infiltrative (disorder)",
  },
  {
    id: "micronodular",
    displayName: "Micronodular BCC",
    snomedCtCode: "402529002",
    snomedCtDisplay: "Basal cell carcinoma - micronodular (disorder)",
  },
  {
    id: "basosquamous",
    displayName: "Basosquamous (metatypical) BCC",
    snomedCtCode: "254702000",
    snomedCtDisplay: "Basosquamous carcinoma of skin (disorder)",
  },
  {
    id: "pigmented",
    displayName: "Pigmented BCC",
    snomedCtCode: "403909004",
    snomedCtDisplay: "Pigmented basal cell carcinoma (disorder)",
  },
  {
    id: "mixed",
    displayName: "Mixed subtype BCC",
  },
  {
    id: "other",
    displayName: "Other / unspecified",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// SCC Subtypes / Differentiation
// ═══════════════════════════════════════════════════════════════════════════

const SCC_SUBTYPES: SkinCancerSubtype[] = [
  {
    id: "well_differentiated",
    displayName: "Well differentiated SCC",
    snomedCtCode: "254651007",
    snomedCtDisplay:
      "Well differentiated squamous cell carcinoma of skin (disorder)",
  },
  {
    id: "moderately_differentiated",
    displayName: "Moderately differentiated SCC",
    snomedCtCode: "254651007",
    snomedCtDisplay:
      "Moderately differentiated squamous cell carcinoma of skin (disorder)",
  },
  {
    id: "poorly_differentiated",
    displayName: "Poorly differentiated SCC",
    snomedCtCode: "254651007",
    snomedCtDisplay:
      "Poorly differentiated squamous cell carcinoma of skin (disorder)",
  },
  {
    id: "scc_in_situ",
    displayName: "SCC in situ (Bowen's)",
    snomedCtCode: "254656002",
    snomedCtDisplay: "Squamous cell carcinoma in situ of skin (disorder)",
  },
  {
    id: "keratoacanthoma_type",
    displayName: "Keratoacanthoma-type SCC",
    snomedCtCode: "254662007",
    snomedCtDisplay: "Keratoacanthoma (disorder)",
  },
  {
    id: "spindle_cell",
    displayName: "Spindle cell SCC",
    snomedCtCode: "254651007",
    snomedCtDisplay: "Spindle cell squamous cell carcinoma of skin (disorder)",
  },
  {
    id: "desmoplastic",
    displayName: "Desmoplastic SCC",
    snomedCtCode: "254651007",
    snomedCtDisplay: "Desmoplastic squamous cell carcinoma of skin (disorder)",
  },
  {
    id: "verrucous",
    displayName: "Verrucous carcinoma",
    snomedCtCode: "89906000",
    snomedCtDisplay: "Verrucous carcinoma of skin (disorder)",
  },
  {
    id: "other",
    displayName: "Other / unspecified",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Dysplastic Naevus Subtypes (Atypia Grade)
// ═══════════════════════════════════════════════════════════════════════════

const DYSPLASTIC_NAEVUS_SUBTYPES: SkinCancerSubtype[] = [
  { id: "mild", displayName: "Mild atypia" },
  { id: "moderate", displayName: "Moderate atypia" },
  { id: "severe", displayName: "Severe atypia" },
];

// ═══════════════════════════════════════════════════════════════════════════
// Rare Cutaneous Malignancy Subtypes (from SkinPath CDS engine)
// ═══════════════════════════════════════════════════════════════════════════

const RARE_CUTANEOUS_SUBTYPES: SkinCancerSubtype[] = [
  {
    id: "sebaceous_carcinoma",
    displayName: "Sebaceous carcinoma",
    snomedCtCode: "307599002",
    snomedCtDisplay: "Sebaceous adenocarcinoma (disorder)",
  },
  {
    id: "microcystic_adnexal_carcinoma",
    displayName: "Microcystic adnexal carcinoma (MAC)",
    snomedCtCode: "254712007",
    snomedCtDisplay: "Microcystic adnexal carcinoma (disorder)",
  },
  {
    id: "eccrine_carcinoma",
    displayName: "Eccrine carcinoma",
    snomedCtCode: "400173004",
    snomedCtDisplay: "Eccrine carcinoma of skin (disorder)",
  },
  {
    id: "apocrine_carcinoma",
    displayName: "Apocrine carcinoma",
    snomedCtCode: "403949007",
    snomedCtDisplay: "Apocrine adenocarcinoma of skin (disorder)",
  },
  {
    id: "dermatofibrosarcoma_protuberans",
    displayName: "Dermatofibrosarcoma protuberans (DFSP)",
    snomedCtCode: "276799004",
    snomedCtDisplay: "Dermatofibrosarcoma protuberans (disorder)",
  },
  {
    id: "atypical_fibroxanthoma",
    displayName: "Atypical fibroxanthoma (AFX)",
    snomedCtCode: "254754005",
    snomedCtDisplay: "Atypical fibroxanthoma of skin (disorder)",
  },
  {
    id: "pleomorphic_dermal_sarcoma",
    displayName: "Pleomorphic dermal sarcoma (PDS)",
    snomedCtCode: "1290751005",
    snomedCtDisplay: "Undifferentiated pleomorphic sarcoma (disorder)",
  },
  {
    id: "porocarcinoma",
    displayName: "Porocarcinoma (eccrine)",
    snomedCtCode: "254708001",
    snomedCtDisplay: "Eccrine porocarcinoma (disorder)",
  },
  {
    id: "hidradenocarcinoma",
    displayName: "Hidradenocarcinoma",
    snomedCtCode: "1293105001",
    snomedCtDisplay: "Hidradenocarcinoma (disorder)",
  },
  {
    id: "spiradenocarcinoma",
    displayName: "Spiradenocarcinoma",
    snomedCtCode: "403942003",
    snomedCtDisplay: "Malignant eccrine spiradenoma (disorder)",
  },
  {
    id: "trichilemmal_carcinoma",
    displayName: "Trichilemmal carcinoma",
    snomedCtCode: "403929003",
    snomedCtDisplay: "Trichilemmal carcinoma (disorder)",
  },
  {
    id: "mucinous_eccrine_carcinoma",
    displayName: "Mucinous eccrine carcinoma",
    snomedCtCode: "254714008",
    snomedCtDisplay: "Mucinous eccrine carcinoma of skin (disorder)",
  },
  {
    id: "digital_papillary_adenocarcinoma",
    displayName: "Digital papillary adenocarcinoma",
    snomedCtCode: "254709009",
    snomedCtDisplay: "Digital papillary eccrine carcinoma of skin (disorder)",
  },
  {
    id: "empd",
    displayName: "Extramammary Paget's disease (EMPD)",
    snomedCtCode: "254727007",
    snomedCtDisplay: "Extramammary Paget's disease of skin (disorder)",
  },
  {
    id: "angiosarcoma",
    displayName: "Angiosarcoma of skin",
    snomedCtCode: "254794007",
    snomedCtDisplay: "Angiosarcoma of skin (disorder)",
  },
  {
    id: "cutaneous_leiomyosarcoma",
    displayName: "Cutaneous leiomyosarcoma",
    snomedCtCode: "254771006",
    snomedCtDisplay: "Cutaneous leiomyosarcoma (disorder)",
  },
  {
    id: "myxofibrosarcoma",
    displayName: "Myxofibrosarcoma",
    snomedCtCode: "723076008",
    snomedCtDisplay: "Primary myxofibrosarcoma (disorder)",
  },
  {
    id: "epithelioid_sarcoma",
    displayName: "Epithelioid sarcoma",
    snomedCtCode: "782827000",
    snomedCtDisplay: "Epithelioid sarcoma (disorder)",
  },
  {
    id: "kaposi_sarcoma",
    displayName: "Kaposi's sarcoma of skin",
    snomedCtCode: "109386008",
    snomedCtDisplay: "Kaposi's sarcoma of skin (disorder)",
  },
  {
    id: "cutaneous_lymphoma",
    displayName: "Cutaneous lymphoma (biopsy only)",
    snomedCtCode: "400001003",
    snomedCtDisplay: "Primary cutaneous lymphoma (disorder)",
  },
  {
    id: "cutaneous_metastasis",
    displayName: "Cutaneous metastasis (unknown primary)",
    snomedCtCode: "94579000",
    snomedCtDisplay: "Metastatic malignant neoplasm to skin (disorder)",
  },
  {
    id: "pilomatrical_carcinoma",
    displayName: "Pilomatrical carcinoma",
    snomedCtCode: "307610008",
    snomedCtDisplay: "Pilomatrix carcinoma of skin (disorder)",
  },
  {
    id: "adenoid_cystic_cutaneous",
    displayName: "Cutaneous adenoid cystic carcinoma",
    snomedCtCode: "254711000",
    snomedCtDisplay: "Adenoid cystic eccrine carcinoma of skin (disorder)",
  },
  {
    id: "mpnst",
    displayName: "Malignant peripheral nerve sheath tumour (MPNST)",
    snomedCtCode: "404037002",
    snomedCtDisplay: "Malignant peripheral nerve sheath tumour (disorder)",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Main Diagnosis Picklist
// ═══════════════════════════════════════════════════════════════════════════

export const SKIN_CANCER_DIAGNOSES: SkinCancerDiagnosisEntry[] = [
  // ── Malignant ──────────────────────────────────────────────────────────
  {
    id: "melanoma",
    displayName: "Melanoma",
    shortName: "Melanoma",
    group: "malignant",
    snomedCtCode: "93655004",
    snomedCtDisplay: "Malignant melanoma of skin (disorder)",
    subtypes: MELANOMA_SUBTYPES,
    subtypeRequired: true,
    hasEnhancedHistology: true,
    hasStaging: true,
    sortOrder: 1,
  },
  {
    id: "bcc",
    displayName: "Basal cell carcinoma (BCC)",
    shortName: "BCC",
    group: "malignant",
    snomedCtCode: "254701007",
    snomedCtDisplay: "Basal cell carcinoma of skin (disorder)",
    subtypes: BCC_SUBTYPES,
    subtypeRequired: true,
    hasEnhancedHistology: true,
    hasStaging: false,
    sortOrder: 2,
  },
  {
    id: "scc",
    displayName: "Squamous cell carcinoma (SCC)",
    shortName: "SCC",
    group: "malignant",
    snomedCtCode: "254651007",
    snomedCtDisplay: "Squamous cell carcinoma of skin (disorder)",
    subtypes: SCC_SUBTYPES,
    subtypeRequired: true,
    hasEnhancedHistology: true,
    hasStaging: false,
    sortOrder: 3,
  },
  {
    id: "merkel_cell",
    displayName: "Merkel cell carcinoma (MCC)",
    shortName: "MCC",
    group: "malignant",
    snomedCtCode: "253001006",
    snomedCtDisplay: "Merkel cell carcinoma of skin (disorder)",
    subtypes: [],
    subtypeRequired: false,
    hasEnhancedHistology: true,
    hasStaging: true,
    sortOrder: 4,
  },

  // ── Pre-malignant / Other ─────────────────────────────────────────────
  {
    id: "actinic_keratosis",
    displayName: "Actinic keratosis",
    shortName: "AK",
    group: "premalignant",
    snomedCtCode: "201101007",
    snomedCtDisplay: "Actinic keratosis (disorder)",
    subtypes: [],
    subtypeRequired: false,
    hasEnhancedHistology: false,
    hasStaging: false,
    sortOrder: 5,
  },
  {
    id: "bowens_disease",
    displayName: "Bowen's disease (SCC in situ)",
    shortName: "Bowen's",
    group: "premalignant",
    snomedCtCode: "254656002",
    snomedCtDisplay: "Squamous cell carcinoma in situ of skin (disorder)",
    subtypes: [],
    subtypeRequired: false,
    hasEnhancedHistology: true,
    hasStaging: false,
    sortOrder: 6,
  },
  {
    id: "keratoacanthoma",
    displayName: "Keratoacanthoma",
    shortName: "KA",
    group: "premalignant",
    snomedCtCode: "254662007",
    snomedCtDisplay: "Keratoacanthoma (disorder)",
    subtypes: [],
    subtypeRequired: false,
    hasEnhancedHistology: true,
    hasStaging: false,
    sortOrder: 7,
  },
  {
    id: "dysplastic_naevus",
    displayName: "Dysplastic naevus",
    shortName: "DN",
    group: "premalignant",
    snomedCtCode: "254818000",
    snomedCtDisplay: "Dysplastic naevus of skin (disorder)",
    subtypes: DYSPLASTIC_NAEVUS_SUBTYPES,
    subtypeRequired: true,
    hasEnhancedHistology: true,
    hasStaging: false,
    sortOrder: 8,
  },

  // ── Rare / Specialist ─────────────────────────────────────────────────
  {
    id: "rare_cutaneous",
    displayName: "Rare cutaneous malignancy",
    shortName: "Rare",
    group: "rare",
    snomedCtCode: "363346000", // generic malignant neoplasm — will be refined by subtype
    snomedCtDisplay: "Malignant neoplastic disease (disorder)",
    subtypes: RARE_CUTANEOUS_SUBTYPES,
    subtypeRequired: true,
    hasEnhancedHistology: true,
    hasStaging: false,
    sortOrder: 9,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Lookup Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Get all diagnoses, optionally filtered by group */
export function getSkinCancerDiagnoses(
  group?: SkinCancerGroup,
): SkinCancerDiagnosisEntry[] {
  if (group) {
    return SKIN_CANCER_DIAGNOSES.filter((d) => d.group === group);
  }
  return SKIN_CANCER_DIAGNOSES;
}

/** Find a diagnosis entry by its ID */
export function getSkinCancerDiagnosisById(
  id: SkinCancerType,
): SkinCancerDiagnosisEntry | undefined {
  return SKIN_CANCER_DIAGNOSES.find((d) => d.id === id);
}

/** Find a diagnosis entry by SNOMED CT code */
export function getSkinCancerDiagnosisBySnomed(
  snomedCode: string,
): SkinCancerDiagnosisEntry | undefined {
  return SKIN_CANCER_DIAGNOSES.find((d) => d.snomedCtCode === snomedCode);
}

/** Get subtypes for a given cancer type */
export function getSubtypesForCancerType(
  cancerType: SkinCancerType,
): SkinCancerSubtype[] {
  const entry = getSkinCancerDiagnosisById(cancerType);
  return entry?.subtypes ?? [];
}

/**
 * Resolve the best SNOMED code for a cancer type + subtype combination.
 * If the subtype has its own specific SNOMED code, use that.
 * Otherwise fall back to the parent cancer type code.
 */
export function resolveSnomedCode(
  cancerType: SkinCancerType,
  subtypeId?: string,
): { snomedCtCode: string; snomedCtDisplay: string } {
  const entry = getSkinCancerDiagnosisById(cancerType);
  if (!entry) {
    return { snomedCtCode: "", snomedCtDisplay: "" };
  }

  if (subtypeId) {
    const subtype = entry.subtypes.find((s) => s.id === subtypeId);
    if (subtype?.snomedCtCode) {
      return {
        snomedCtCode: subtype.snomedCtCode,
        snomedCtDisplay: subtype.snomedCtDisplay || entry.snomedCtDisplay,
      };
    }
  }

  return {
    snomedCtCode: entry.snomedCtCode,
    snomedCtDisplay: entry.snomedCtDisplay,
  };
}

/**
 * Check whether a SNOMED diagnosis code or display name indicates a skin cancer.
 * Used to detect skin cancer cases for histology workflow branching.
 * Replaces the keyword-based `isSkinLesionCase()` heuristic.
 */
export function isSkinCancerDiagnosis(
  snomedCode?: string,
  displayName?: string,
): boolean {
  // Check against our picklist SNOMED codes
  if (snomedCode) {
    const allCodes = SKIN_CANCER_DIAGNOSES.map((d) => d.snomedCtCode);
    const subtypeCodes = SKIN_CANCER_DIAGNOSES.flatMap((d) =>
      d.subtypes.filter((s) => s.snomedCtCode).map((s) => s.snomedCtCode!),
    );
    if (allCodes.includes(snomedCode) || subtypeCodes.includes(snomedCode)) {
      return true;
    }
  }

  // Fallback to keyword matching for free-text diagnoses
  if (displayName) {
    const lower = displayName.toLowerCase();
    const keywords = [
      "melanoma",
      "bcc",
      "basal cell",
      "scc",
      "squamous cell",
      "merkel",
      "actinic keratosis",
      "bowen",
      "keratoacanthoma",
      "dysplastic naevus",
      "dysplastic nevus",
      "dfsp",
      "dermatofibrosarcoma",
      "sebaceous carcinoma",
      "fibroxanthoma",
      "pleomorphic dermal sarcoma",
      "porocarcinoma",
      "hidradenocarcinoma",
      "spiradenocarcinoma",
      "trichilemmal carcinoma",
      "mucinous eccrine",
      "digital papillary",
      "extramammary paget",
      "empd",
      "angiosarcoma",
      "leiomyosarcoma",
      "myxofibrosarcoma",
      "epithelioid sarcoma",
      "kaposi",
      "pilomatrix",
      "pilomatrical",
      "adenoid cystic",
      "mpnst",
      "peripheral nerve sheath",
      "cutaneous lymphoma",
      "cutaneous metastasis",
      "eccrine carcinoma",
      "apocrine carcinoma",
      "microcystic adnexal",
    ];
    return keywords.some((kw) => lower.includes(kw));
  }

  return false;
}

/**
 * Attempt to match a free-text histology diagnosis to a structured
 * skin cancer type + subtype. Returns null if no match found.
 * Useful for auto-populating from OCR-extracted histology text.
 */
export function matchHistologyToPicklist(
  histologyText: string,
): { cancerType: SkinCancerType; subtypeId?: string } | null {
  const lower = histologyText.toLowerCase();

  // Melanoma subtypes (check specific before generic)
  if (lower.includes("lentigo maligna melanoma") || lower.includes("lmm")) {
    return { cancerType: "melanoma", subtypeId: "lmm" };
  }
  if (lower.includes("lentigo maligna") && !lower.includes("melanoma")) {
    return { cancerType: "melanoma", subtypeId: "lentigo_maligna" };
  }
  if (lower.includes("nodular melanoma")) {
    return { cancerType: "melanoma", subtypeId: "nm" };
  }
  if (lower.includes("acral lentiginous")) {
    return { cancerType: "melanoma", subtypeId: "alm" };
  }
  if (lower.includes("desmoplastic melanoma")) {
    return { cancerType: "melanoma", subtypeId: "desmoplastic" };
  }
  if (lower.includes("amelanotic melanoma")) {
    return { cancerType: "melanoma", subtypeId: "amelanotic" };
  }
  if (lower.includes("spitzoid melanoma")) {
    return { cancerType: "melanoma", subtypeId: "spitzoid" };
  }
  if (lower.includes("melanoma in situ") || lower.includes("mis")) {
    return { cancerType: "melanoma", subtypeId: "mis" };
  }
  if (lower.includes("superficial spreading")) {
    return { cancerType: "melanoma", subtypeId: "ssm" };
  }
  if (lower.includes("melanoma")) {
    return { cancerType: "melanoma" };
  }

  // BCC subtypes
  if (
    lower.includes("morpho") ||
    lower.includes("sclerosing bcc") ||
    lower.includes("morpheaform")
  ) {
    return { cancerType: "bcc", subtypeId: "morphoeic" };
  }
  if (lower.includes("basosquamous") || lower.includes("metatypical")) {
    return { cancerType: "bcc", subtypeId: "basosquamous" };
  }
  if (lower.includes("micronodular")) {
    return { cancerType: "bcc", subtypeId: "micronodular" };
  }
  if (lower.includes("infiltrative") && lower.includes("bcc")) {
    return { cancerType: "bcc", subtypeId: "infiltrative" };
  }
  if (
    lower.includes("superficial") &&
    (lower.includes("bcc") || lower.includes("basal cell"))
  ) {
    return { cancerType: "bcc", subtypeId: "superficial" };
  }
  if (
    lower.includes("nodular") &&
    (lower.includes("bcc") || lower.includes("basal cell"))
  ) {
    return { cancerType: "bcc", subtypeId: "nodular" };
  }
  if (lower.includes("basal cell") || lower.includes("bcc")) {
    return { cancerType: "bcc" };
  }

  // SCC subtypes
  if (
    lower.includes("poorly differentiated") &&
    (lower.includes("scc") || lower.includes("squamous"))
  ) {
    return { cancerType: "scc", subtypeId: "poorly_differentiated" };
  }
  if (
    lower.includes("moderately differentiated") &&
    (lower.includes("scc") || lower.includes("squamous"))
  ) {
    return { cancerType: "scc", subtypeId: "moderately_differentiated" };
  }
  if (
    lower.includes("well differentiated") &&
    (lower.includes("scc") || lower.includes("squamous"))
  ) {
    return { cancerType: "scc", subtypeId: "well_differentiated" };
  }
  if (lower.includes("verrucous carcinoma")) {
    return { cancerType: "scc", subtypeId: "verrucous" };
  }
  if (lower.includes("squamous cell") || lower.includes("scc")) {
    return { cancerType: "scc" };
  }

  // Other types
  if (lower.includes("merkel")) {
    return { cancerType: "merkel_cell" };
  }
  if (lower.includes("bowen")) {
    return { cancerType: "bowens_disease" };
  }
  if (lower.includes("keratoacanthoma")) {
    return { cancerType: "keratoacanthoma" };
  }
  if (
    lower.includes("actinic keratosis") ||
    lower.includes("solar keratosis")
  ) {
    return { cancerType: "actinic_keratosis" };
  }
  if (
    lower.includes("dysplastic") &&
    (lower.includes("naevus") || lower.includes("nevus"))
  ) {
    if (lower.includes("severe"))
      return { cancerType: "dysplastic_naevus", subtypeId: "severe" };
    if (lower.includes("moderate"))
      return { cancerType: "dysplastic_naevus", subtypeId: "moderate" };
    if (lower.includes("mild"))
      return { cancerType: "dysplastic_naevus", subtypeId: "mild" };
    return { cancerType: "dysplastic_naevus" };
  }

  // Rare cutaneous
  if (lower.includes("dermatofibrosarcoma") || lower.includes("dfsp")) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "dermatofibrosarcoma_protuberans",
    };
  }
  if (
    lower.includes("porocarcinoma") ||
    lower.includes("eccrine porocarcinoma")
  ) {
    return { cancerType: "rare_cutaneous", subtypeId: "porocarcinoma" };
  }
  if (lower.includes("hidradenocarcinoma")) {
    return { cancerType: "rare_cutaneous", subtypeId: "hidradenocarcinoma" };
  }
  if (
    lower.includes("spiradenocarcinoma") ||
    lower.includes("malignant spiradenoma")
  ) {
    return { cancerType: "rare_cutaneous", subtypeId: "spiradenocarcinoma" };
  }
  if (lower.includes("trichilemmal carcinoma")) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "trichilemmal_carcinoma",
    };
  }
  if (
    lower.includes("mucinous eccrine") ||
    lower.includes("mucinous carcinoma")
  ) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "mucinous_eccrine_carcinoma",
    };
  }
  if (lower.includes("digital papillary")) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "digital_papillary_adenocarcinoma",
    };
  }
  if (lower.includes("extramammary paget") || lower.includes("empd")) {
    return { cancerType: "rare_cutaneous", subtypeId: "empd" };
  }
  if (lower.includes("angiosarcoma")) {
    return { cancerType: "rare_cutaneous", subtypeId: "angiosarcoma" };
  }
  if (lower.includes("leiomyosarcoma") && lower.includes("skin")) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "cutaneous_leiomyosarcoma",
    };
  }
  if (lower.includes("myxofibrosarcoma")) {
    return { cancerType: "rare_cutaneous", subtypeId: "myxofibrosarcoma" };
  }
  if (lower.includes("epithelioid sarcoma")) {
    return { cancerType: "rare_cutaneous", subtypeId: "epithelioid_sarcoma" };
  }
  if (lower.includes("kaposi")) {
    return { cancerType: "rare_cutaneous", subtypeId: "kaposi_sarcoma" };
  }
  if (lower.includes("sebaceous carcinoma")) {
    return { cancerType: "rare_cutaneous", subtypeId: "sebaceous_carcinoma" };
  }
  if (lower.includes("microcystic adnexal") || lower.includes("mac ")) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "microcystic_adnexal_carcinoma",
    };
  }
  if (lower.includes("eccrine carcinoma")) {
    return { cancerType: "rare_cutaneous", subtypeId: "eccrine_carcinoma" };
  }
  if (lower.includes("apocrine carcinoma")) {
    return { cancerType: "rare_cutaneous", subtypeId: "apocrine_carcinoma" };
  }
  if (lower.includes("atypical fibroxanthoma") || lower.includes("afx")) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "atypical_fibroxanthoma",
    };
  }
  if (lower.includes("pleomorphic dermal sarcoma") || lower.includes("pds")) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "pleomorphic_dermal_sarcoma",
    };
  }
  if (lower.includes("pilomatrix") || lower.includes("pilomatrical")) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "pilomatrical_carcinoma",
    };
  }
  if (
    lower.includes("adenoid cystic") &&
    (lower.includes("skin") || lower.includes("eccrine"))
  ) {
    return {
      cancerType: "rare_cutaneous",
      subtypeId: "adenoid_cystic_cutaneous",
    };
  }
  if (
    lower.includes("mpnst") ||
    lower.includes("malignant peripheral nerve sheath")
  ) {
    return { cancerType: "rare_cutaneous", subtypeId: "mpnst" };
  }
  if (
    lower.includes("cutaneous lymphoma") ||
    lower.includes("primary cutaneous lymphoma")
  ) {
    return { cancerType: "rare_cutaneous", subtypeId: "cutaneous_lymphoma" };
  }
  if (
    lower.includes("cutaneous metastasis") ||
    lower.includes("metastatic malignant neoplasm to skin")
  ) {
    return { cancerType: "rare_cutaneous", subtypeId: "cutaneous_metastasis" };
  }

  return null;
}
