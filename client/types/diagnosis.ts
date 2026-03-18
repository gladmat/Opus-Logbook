/**
 * Diagnosis Picklist & Procedure Suggestion Types
 *
 * Structured diagnosis entries with SNOMED CT coding and
 * intelligent procedure suggestions (including staging-conditional logic).
 *
 * These types power the diagnosis-first case entry flow:
 *   Specialty → Diagnosis (picklist) → Suggested Procedures (auto-populate)
 */

import type { Specialty } from "./case";

// ─── Procedure Suggestion ────────────────────────────────────────────────────

export interface ProcedureSuggestion {
  /** References ProcedurePicklistEntry.id in procedurePicklist.ts */
  procedurePicklistId: string;

  /** Display name for quick rendering without lookup */
  displayName: string;

  /**
   * Auto-selected when this diagnosis is chosen.
   * Multiple procedures can be default (e.g., excision + SLNB for melanoma).
   */
  isDefault: boolean;

  /**
   * Only suggested when a staging/grading criterion is met.
   * Appears greyed-out until the condition is satisfied.
   */
  isConditional?: boolean;

  /** Human-readable condition label, e.g., "For Gustilo IIIb/IIIc" */
  conditionDescription?: string;

  /**
   * Machine-readable condition linking to diagnosisStagingConfig.
   * When the user selects a staging value that matches, the suggestion activates.
   */
  conditionStagingMatch?: {
    /** Name of the staging system (must match StagingSystem.name) */
    stagingSystemName: string;
    /** Values that activate this suggestion (OR logic — any match activates) */
    matchValues: string[];
  };

  /**
   * Display order within the suggestion list.
   * Lower = higher in the list. Defaults come first regardless.
   */
  sortOrder?: number;
}

// ─── Diagnosis Picklist Entry ────────────────────────────────────────────────

export interface DiagnosisPicklistEntry {
  /** Unique identifier, e.g., "hand_dx_distal_radius_fx" */
  id: string;

  /** What the surgeon sees, e.g., "Distal radius fracture" */
  displayName: string;

  /** Optional short form for chips/tags, e.g., "Distal radius #" */
  shortName?: string;

  /** SNOMED CT concept ID from Clinical Finding hierarchy (<<404684003) */
  snomedCtCode: string;

  /** SNOMED CT preferred term */
  snomedCtDisplay: string;

  /** Primary specialty this diagnosis belongs to */
  specialty: Specialty;

  /** Grouping within the specialty (rendered as section headers) */
  subcategory: string;

  /**
   * Clinical context grouping:
   * - "trauma": acute injury
   * - "elective": planned/degenerative
   * - "oncological": cancer-related
   * - "congenital": birth defects
   * - "reconstructive": secondary/delayed reconstruction
   */
  clinicalGroup?:
    | "trauma"
    | "acute"
    | "elective"
    | "oncological"
    | "congenital"
    | "reconstructive"
    | "aesthetic"
    | "gender_affirming";

  /** Aesthetic intent modifier — cosmetic by default, overridable per-diagnosis */
  intent?:
    | "cosmetic"
    | "post_bariatric_mwl"
    | "functional_reconstructive"
    | "combined";

  /** Whether this diagnosis has staging/grading in diagnosisStagingConfig */
  hasStaging: boolean;

  /** Whether this diagnosis has enhanced histology capture (skin cancer) */
  hasEnhancedHistology?: boolean;

  /** Whether this diagnosis activates the Dupuytren inline assessment */
  hasDupuytrenAssessment?: boolean;

  /** Whether this diagnosis activates the digit multi-select (e.g., trigger finger/thumb) */
  hasDigitMultiSelect?: boolean;

  /** Whether this diagnosis activates the peripheral nerve assessment module */
  peripheralNerveModule?: boolean;

  /** Whether this diagnosis activates the brachial plexus sub-module */
  brachialPlexusModule?: boolean;

  /** Whether this diagnosis activates the neuroma sub-module */
  neuromaModule?: boolean;

  /** Whether this diagnosis represents a revision/recurrent case */
  isRevision?: boolean;

  /** If true, this diagnosis appears in all non-gender-affirming clinical contexts */
  crossContextVisible?: boolean;

  /** Procedure suggestions — the core feature */
  suggestedProcedures: ProcedureSuggestion[];

  /** Display order within subcategory */
  sortOrder: number;

  /**
   * Search synonyms — alternative terms that match during type-ahead.
   * e.g., ["CTS", "median nerve compression"] for carpal tunnel syndrome.
   */
  searchSynonyms?: string[];
}

// ─── Lookup / Helper Types ───────────────────────────────────────────────────

/**
 * Result of activating staging-conditional suggestions.
 * Returned by evaluateStagingConditions().
 */
export interface EvaluatedSuggestion extends ProcedureSuggestion {
  /** Whether this suggestion is currently active (default or condition met) */
  isActive: boolean;
}

/**
 * Staging value map — what the user has selected so far.
 * Keys are staging system names, values are the selected option values.
 */
export type StagingSelections = Record<string, string>;
