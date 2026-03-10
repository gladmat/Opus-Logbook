/**
 * Skin Cancer Types — Enhanced Histology & Pathology
 * ═══════════════════════════════════════════════════════
 *
 * Extends the existing SkinLesionExcisionDetails interface with structured
 * histological subtype, pathological features, and staging data.
 *
 * INTEGRATION NOTES:
 *   - The original SkinLesionExcisionDetails in client/types/case.ts should
 *     be replaced with EnhancedSkinLesionDetails (which is a superset).
 *   - The ClinicalDetails union type should include EnhancedSkinLesionDetails.
 *   - Existing data with the old SkinLesionExcisionDetails shape will continue
 *     to work because all new fields are optional.
 */

import type { SkinCancerType } from "../lib/skinCancerDiagnoses";

// ═══════════════════════════════════════════════════════════════════════════
// Excision Completeness (unchanged from case.ts — re-exported for convenience)
// ═══════════════════════════════════════════════════════════════════════════

export type ExcisionCompleteness = "complete" | "incomplete" | "uncertain";

export const EXCISION_COMPLETENESS_LABELS: Record<
  ExcisionCompleteness,
  string
> = {
  complete: "Complete",
  incomplete: "Incomplete",
  uncertain: "Uncertain",
};

// ═══════════════════════════════════════════════════════════════════════════
// BCC-Specific Histology
// ═══════════════════════════════════════════════════════════════════════════

export type BCCHistologicalSubtype =
  | "nodular"
  | "superficial"
  | "morphoeic"
  | "infiltrative"
  | "micronodular"
  | "basosquamous"
  | "pigmented"
  | "mixed"
  | "other";

export const BCC_SUBTYPE_LABELS: Record<BCCHistologicalSubtype, string> = {
  nodular: "Nodular",
  superficial: "Superficial",
  morphoeic: "Morphoeic (sclerosing)",
  infiltrative: "Infiltrative",
  micronodular: "Micronodular",
  basosquamous: "Basosquamous (metatypical)",
  pigmented: "Pigmented",
  mixed: "Mixed subtype",
  other: "Other",
};

/** BCC subtypes considered high-risk (matching SkinPath CDS engine) */
export const BCC_HIGH_RISK_SUBTYPES: BCCHistologicalSubtype[] = [
  "infiltrative",
  "morphoeic",
  "micronodular",
  "basosquamous",
];

// ═══════════════════════════════════════════════════════════════════════════
// SCC-Specific Histology
// ═══════════════════════════════════════════════════════════════════════════

export type SCCDifferentiation =
  | "well"
  | "moderate"
  | "poor"
  | "undifferentiated";

export const SCC_DIFFERENTIATION_LABELS: Record<SCCDifferentiation, string> = {
  well: "Well differentiated",
  moderate: "Moderately differentiated",
  poor: "Poorly differentiated",
  undifferentiated: "Undifferentiated",
};

export type SCCHistologicalSubtype =
  | "conventional"
  | "spindle_cell"
  | "desmoplastic"
  | "verrucous"
  | "keratoacanthoma_type"
  | "other";

export const SCC_SUBTYPE_LABELS: Record<SCCHistologicalSubtype, string> = {
  conventional: "Conventional",
  spindle_cell: "Spindle cell",
  desmoplastic: "Desmoplastic",
  verrucous: "Verrucous",
  keratoacanthoma_type: "Keratoacanthoma-type",
  other: "Other",
};

// ═══════════════════════════════════════════════════════════════════════════
// Melanoma-Specific Histology
// ═══════════════════════════════════════════════════════════════════════════

export type MelanomaHistologicalSubtype =
  | "ssm"
  | "nm"
  | "lmm"
  | "alm"
  | "desmoplastic"
  | "amelanotic"
  | "spitzoid"
  | "mis"
  | "lentigo_maligna"
  | "other";

export const MELANOMA_SUBTYPE_LABELS: Record<
  MelanomaHistologicalSubtype,
  string
> = {
  ssm: "Superficial spreading (SSM)",
  nm: "Nodular (NM)",
  lmm: "Lentigo maligna melanoma (LMM)",
  alm: "Acral lentiginous (ALM)",
  desmoplastic: "Desmoplastic",
  amelanotic: "Amelanotic",
  spitzoid: "Spitzoid",
  mis: "Melanoma in situ",
  lentigo_maligna: "Lentigo maligna (in situ)",
  other: "Other / unspecified",
};

export type ClarkLevel = "I" | "II" | "III" | "IV" | "V";

export const CLARK_LEVEL_LABELS: Record<ClarkLevel, string> = {
  I: "Level I — Epidermis only (in situ)",
  II: "Level II — Papillary dermis",
  III: "Level III — Filling papillary dermis",
  IV: "Level IV — Reticular dermis",
  V: "Level V — Subcutis",
};

// ═══════════════════════════════════════════════════════════════════════════
// Dysplastic Naevus
// ═══════════════════════════════════════════════════════════════════════════

export type DysplasticAtypiaGrade = "mild" | "moderate" | "severe";

export const ATYPIA_GRADE_LABELS: Record<DysplasticAtypiaGrade, string> = {
  mild: "Mild atypia",
  moderate: "Moderate atypia",
  severe: "Severe atypia",
};

// ═══════════════════════════════════════════════════════════════════════════
// Enhanced Skin Lesion Details (extends original SkinLesionExcisionDetails)
// ═══════════════════════════════════════════════════════════════════════════

export interface EnhancedSkinLesionDetails {
  // ── Original fields (backward compatible) ─────────────────────────────
  /** Free-text histology diagnosis (kept for backward compat + OCR fallback) */
  histologyDiagnosis?: string;
  peripheralMarginMm?: number;
  deepMarginMm?: number;
  excisionCompleteness?: ExcisionCompleteness;
  histologyReportCapturedAt?: string;

  // ── Structured Diagnosis (NEW) ────────────────────────────────────────
  /** Structured cancer type from picklist */
  skinCancerType?: SkinCancerType;
  /** Structured histological subtype ID */
  histologicalSubtypeId?: string;
  /** SNOMED CT code for the pathological diagnosis */
  pathologicalSnomedCtCode?: string;
  pathologicalSnomedCtDisplay?: string;

  // ── BCC-Specific (NEW) ────────────────────────────────────────────────
  bccSubtype?: BCCHistologicalSubtype;

  // ── SCC-Specific (NEW) ────────────────────────────────────────────────
  sccDifferentiation?: SCCDifferentiation;
  sccSubtype?: SCCHistologicalSubtype;
  /** Tumour depth in mm (SCC risk factor) */
  tumourDepthMm?: number;

  // ── Melanoma-Specific (NEW) ───────────────────────────────────────────
  melanomaSubtype?: MelanomaHistologicalSubtype;
  /** Breslow thickness in mm (0 = in situ). Stored as precise number. */
  breslowThicknessMm?: number;
  /** Ulceration on histology */
  ulceration?: boolean;
  /** Clark level (optional, less used in AJCC 8th) */
  clarkLevel?: ClarkLevel;
  /** Mitotic rate per mm² */
  mitoticRatePerMm2?: number;
  /** Regression present */
  regression?: boolean;
  /** Microsatellites present */
  microsatellites?: boolean;

  // ── Melanoma Staging (auto-calculated, NEW) ───────────────────────────
  /** Auto-calculated T substage (e.g., "T2b") */
  tStage?: string;
  /** Auto-calculated overall AJCC stage (e.g., "IIA") */
  ajccStage?: string;
  /** Human-readable staging summary */
  stagingSummary?: string;
  /** SLNB recommendation text */
  slnbRecommendation?: string;

  // ── Common Pathological Features (NEW) ────────────────────────────────
  /** Perineural invasion (BCC, SCC risk factor) */
  perineuralInvasion?: boolean;
  /** Lymphovascular invasion (SCC risk factor) */
  lymphovascularInvasion?: boolean;

  // ── Dysplastic Naevus (NEW) ───────────────────────────────────────────
  atypiaGrade?: DysplasticAtypiaGrade;

  // ── Histology Pending Tracking (NEW) ──────────────────────────────────
  /** Whether histology results have been entered */
  histologyConfirmed?: boolean;
  /** Date the histology reminder was sent */
  histologyReminderSentAt?: string;
  /** Date pathological diagnosis was confirmed (distinct from report capture) */
  pathologicalDiagnosisConfirmedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: Determine which fields to show based on cancer type
// ═══════════════════════════════════════════════════════════════════════════

export type HistologyFieldGroup =
  | "margins" // All skin cancers
  | "completeness" // All skin cancers
  | "pni_lvi" // BCC, SCC, rare
  | "bcc_subtype" // BCC only
  | "scc_fields" // SCC only (differentiation, subtype, depth)
  | "melanoma_fields" // Melanoma only (breslow, ulceration, clark, mitotic, staging)
  | "atypia_grade" // Dysplastic naevus only
  | "staging"; // Melanoma, Merkel cell

/**
 * Returns which field groups should be visible for a given cancer type.
 * Drives conditional rendering in the histology capture form.
 */
export function getVisibleFieldGroups(
  cancerType?: SkinCancerType,
): HistologyFieldGroup[] {
  if (!cancerType) return ["margins", "completeness"];

  const groups: HistologyFieldGroup[] = ["margins", "completeness"];

  switch (cancerType) {
    case "melanoma":
      groups.push("melanoma_fields", "staging");
      break;
    case "bcc":
      groups.push("bcc_subtype", "pni_lvi");
      break;
    case "scc":
      groups.push("scc_fields", "pni_lvi");
      break;
    case "merkel_cell":
      groups.push("pni_lvi", "staging");
      break;
    case "bowens_disease":
    case "keratoacanthoma":
      // margins + completeness only
      break;
    case "dysplastic_naevus":
      groups.push("atypia_grade");
      break;
    case "actinic_keratosis":
      // minimal — margins + completeness
      break;
    case "rare_cutaneous":
      groups.push("pni_lvi");
      break;
  }

  return groups;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: Check if a case needs histology follow-up
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determines whether a case should have a "histology pending" reminder.
 * Returns true if the case involves a skin cancer excision but histology
 * has not yet been confirmed.
 */
export function needsHistologyReminder(
  details?: EnhancedSkinLesionDetails,
): boolean {
  if (!details) return false;
  // If histology has been confirmed, no reminder needed
  if (details.histologyConfirmed) return false;
  // If pathological diagnosis confirmed, no reminder needed
  if (details.pathologicalDiagnosisConfirmedAt) return false;
  // If histology report was captured, no reminder needed
  if (details.histologyReportCapturedAt) return false;
  // Otherwise, if there's a cancer type or free-text diagnosis suggesting
  // skin cancer, a reminder is appropriate
  return true;
}

/**
 * Calculate the reminder date for histology follow-up.
 * Default: 30 days after the procedure date.
 */
export function getHistologyReminderDate(
  procedureDate: string,
  daysAfter: number = 30,
): string {
  const date = new Date(procedureDate);
  date.setDate(date.getDate() + daysAfter);
  return date.toISOString();
}

// ═══════════════════════════════════════════════════════════════════════════
// SKIN CANCER ASSESSMENT WORKFLOW TYPES (Phase 1)
// ═══════════════════════════════════════════════════════════════════════════
//
// These types power the clinical pathway assessment module, distinct from the
// histology reporting types above. They capture the treatment journey context
// (pathway stage, clinical suspicion, SLNB, margin recommendations) while the
// types above capture pathological findings.

// --- Pathway Stage (entry point gate) ---

export type SkinCancerPathwayStage = "excision_biopsy" | "histology_known";

// --- Biopsy Method (excision_biopsy pathway only) ---

export type SkinCancerBiopsyType =
  | "excision_biopsy"
  | "incisional_biopsy"
  | "shave_biopsy"
  | "punch_biopsy";

export type HistologySource =
  | "own_biopsy"
  | "external_biopsy"
  | "current_procedure";

// --- Pathology Types: Two-Tier System ---

/** Tier 1: Primary category — always visible as chip selector */
export type SkinCancerPathologyCategory =
  | "bcc"
  | "scc"
  | "melanoma"
  | "merkel_cell"
  | "rare_malignant"
  | "benign"
  | "uncertain";

/** Tier 2: Rare malignant subtypes — shown when rare_malignant is selected */
export type RareMalignantSubtype =
  // Adnexal carcinomas
  | "sebaceous_carcinoma"
  | "porocarcinoma"
  | "mac" // Microcystic adnexal carcinoma
  | "hidradenocarcinoma"
  | "spiradenocarcinoma"
  | "trichilemmal_carcinoma"
  | "mucinous_eccrine_carcinoma"
  | "apocrine_carcinoma"
  | "digital_papillary_adenocarcinoma"
  | "empd" // Extramammary Paget's disease
  | "adenoid_cystic_cutaneous"
  | "pilomatrical_carcinoma"
  | "other_adnexal"
  // Cutaneous sarcomas
  | "dfsp"
  | "afx" // Atypical fibroxanthoma
  | "pleomorphic_dermal_sarcoma"
  | "angiosarcoma"
  | "kaposi_sarcoma"
  | "cutaneous_leiomyosarcoma"
  | "myxofibrosarcoma"
  | "epithelioid_sarcoma"
  | "mpnst"
  | "other_sarcoma"
  // Other
  | "cutaneous_lymphoma"
  | "cutaneous_metastasis"
  | "other_nos";

// --- BCC Assessment Subtypes (simplified for workflow, distinct from histological) ---
export type BCCSubtype =
  | "nodular"
  | "superficial"
  | "infiltrative"
  | "morphoeic"
  | "micronodular"
  | "mixed";

// --- SCC Assessment Detail Types ---
export type SCCAssessmentDifferentiation = "well" | "moderate" | "poor";
export type SCCRiskLevel = "low" | "high";

// --- Melanoma Assessment Detail Types ---
export type MelanomaAssessmentSubtype =
  | "ssm"
  | "nm"
  | "lmm"
  | "alm"
  | "desmoplastic"
  | "other";
export type TILsGrade = "absent" | "non_brisk" | "brisk";

// --- Merkel Cell Detail Types ---
export type MCPyVStatus = "positive" | "negative" | "unknown";

// --- Margin Status (detailed, histology-level) ---
export type DetailedMarginStatus =
  | "complete"
  | "incomplete"
  | "close"
  | "pending"
  | "unknown";

// --- SLNB Types ---
export type SLNBSite =
  | "axilla"
  | "groin"
  | "cervical"
  | "popliteal"
  | "epitrochlear"
  | "other";

export type SLNBResult =
  | "pending"
  | "negative"
  | "positive_itc"
  | "positive_micro"
  | "positive_macro";

export interface SLNBDetails {
  offered: boolean;
  performed: boolean;
  declinedReason?: string;
  sites: SLNBSite[];
  nodesRetrieved?: number;
  result: SLNBResult;
  resultDate?: string;
}

// --- Margin Recommendation (read-only CDS) ---
export type GuidelineSource = "NCCN" | "ESMO" | "BAD" | "ANZ" | "EXPERT";

export interface MarginRecommendation {
  recommendedText: string;
  guidelineSource: GuidelineSource;
  guidelineNote: string;
  minimumMm?: number;
  maximumMm?: number;
}

// --- Histology Data (assessment workflow) ---
export interface SkinCancerHistology {
  source: HistologySource;
  pathologyCategory: SkinCancerPathologyCategory;
  rareSubtype?: RareMalignantSubtype;

  // BCC-specific
  bccSubtype?: BCCSubtype;

  // SCC-specific
  sccDifferentiation?: SCCAssessmentDifferentiation;
  sccDepthMm?: number;
  sccPerineuralInvasion?: boolean;
  sccLymphovascularInvasion?: boolean;
  sccRiskLevel?: SCCRiskLevel;

  // Melanoma-specific
  melanomaBreslowMm?: number;
  melanomaUlceration?: boolean;
  melanomaMitoticRate?: number;
  melanomaSubtype?: MelanomaAssessmentSubtype;
  melanomaMicrosatellites?: boolean;
  melanomaLVI?: boolean;
  melanomaNeurotropism?: boolean;
  melanomaRegression?: boolean;
  melanomaTILs?: TILsGrade;
  melanomaClarkLevel?: 1 | 2 | 3 | 4 | 5;

  // Merkel cell-specific
  merkelTumourSizeMm?: number;
  merkelMCPyVStatus?: MCPyVStatus;
  merkelDepthMm?: number;
  merkelLVI?: boolean;

  // Surgical excision margins (recorded at time of surgery)
  excisionDeepMarginMm?: number;
  excisionPeripheralMarginMm?: number;

  // Histological margins (reported by pathology lab, 2–3 weeks later)
  deepMarginMm?: number;
  peripheralMarginMm?: number;
  marginStatus?: DetailedMarginStatus;

  // Excision method
  excisionMethod?: "wle" | "mohs" | "staged_excision" | "other";

  // Meta
  reportDate?: string;
  labReference?: string;
}

// --- Lesion Photo ---
/** A clinical photo of a lesion, auto-tagged with assessment context */
export interface LesionPhoto {
  id: string;
  uri: string; // encrypted-media:<uuid>
  caption?: string; // Auto-generated: "BCC — Nose, L"
  photoType: "clinical" | "dermoscopy";
  createdAt: string; // ISO timestamp
}

// --- Per-Lesion Assessment (the main composite type) ---
export interface SkinCancerLesionAssessment {
  pathwayStage: SkinCancerPathwayStage;
  clinicalSuspicion?: SkinCancerPathologyCategory;

  // Anatomical site
  site?: string;
  siteDetail?: string;
  laterality?: "left" | "right" | "midline";

  // Pre-operative clinical dimensions
  clinicalLengthMm?: number;
  clinicalWidthMm?: number;

  // Biopsy method (excision_biopsy pathway only)
  biopsyType?: SkinCancerBiopsyType;
  biopsyPeripheralMarginMm?: number; // Excision biopsy: peripheral margin taken (mm)
  punchSizeMm?: number; // Punch biopsy: punch diameter (2, 3, 4, 5, 6, 8 mm)

  // Excision details
  marginTakenMm?: number;
  marginRecommendation?: MarginRecommendation;

  // Histology
  priorHistology?: SkinCancerHistology;
  currentHistology?: SkinCancerHistology;

  // SLNB
  slnb?: SLNBDetails;

  // Discussed at MDT (simple toggle)
  discussedAtMdt?: boolean;

  // Clinical photos
  lesionPhotos?: LesionPhoto[];
}

// --- Section Completion ---
export type SectionStatus =
  | "complete"
  | "pending"
  | "not_started"
  | "not_applicable";

export interface SkinCancerCompletionState {
  lesionDetails: SectionStatus;
  procedure: SectionStatus;
  histology: SectionStatus;
  slnb: SectionStatus;
  finalMargins: SectionStatus;
}

// --- Clinical Pathway Assignment ---
export type ClinicalPathwayTemplate =
  | "melanoma_like"
  | "bcc_scc_like"
  | "complex_mdt";

// --- Site Groups for Grouped Picker ---
export interface SkinCancerSiteGroup {
  label: string;
  sites: string[];
}

export const SKIN_CANCER_SITE_GROUPS: SkinCancerSiteGroup[] = [
  {
    label: "HEAD & NECK",
    sites: [
      "Scalp",
      "Forehead",
      "Temple",
      "Nose",
      "Cheek",
      "Ear",
      "Eyelid",
      "Upper lip",
      "Lower lip",
      "Chin / Jaw",
      "Neck",
    ],
  },
  {
    label: "TRUNK",
    sites: ["Chest", "Back", "Abdomen", "Shoulder", "Flank"],
  },
  {
    label: "UPPER LIMB",
    sites: ["Upper arm", "Forearm", "Hand", "Finger"],
  },
  {
    label: "LOWER LIMB",
    sites: ["Thigh", "Leg", "Foot", "Toe"],
  },
];

/** Midline sites where laterality defaults to "midline" */
export const MIDLINE_SITES = new Set([
  "Scalp",
  "Forehead",
  "Nose",
  "Chin / Jaw",
  "Chest",
  "Back",
  "Abdomen",
]);
