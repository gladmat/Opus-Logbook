/**
 * Per-digit SNOMED resolution for diagnoses with `hasDigitMultiSelect: true`.
 *
 * When multiple digits are selected, the diagnosis and procedure SNOMED codes
 * are resolved per digit from this map rather than from the picklist entry defaults.
 *
 * Currently handles: trigger finger/thumb (hand_dx_trigger_digit)
 *   - Thumb (I) → SNOMED 202855006 (Stenosing tenosynovitis of thumb) + hand_comp_trigger_thumb
 *   - Fingers (II-V) → SNOMED 1539003 (Trigger finger) + hand_comp_trigger_finger
 */

import type { DigitId } from "@/types/case";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MultiDigitResolution {
  /** SNOMED CT code for the DIAGNOSIS when this digit is affected */
  diagnosisSnomedCode: string;
  diagnosisSnomedDisplay: string;
  /** Procedure picklist ID to use for this digit */
  procedurePicklistId: string;
  /** Display name for the procedure (digit label appended at runtime) */
  procedureDisplayName: string;
}

// ─── Resolution maps ────────────────────────────────────────────────────────

/**
 * Resolution maps keyed by diagnosis picklist ID.
 * Only diagnoses with `hasDigitMultiSelect: true` should have an entry here.
 */
export const MULTI_DIGIT_RESOLUTIONS: Record<
  string,
  {
    /** Default resolution for digits not explicitly listed */
    default: MultiDigitResolution;
    /** Per-digit overrides (merged over default) */
    overrides: Partial<Record<DigitId, Partial<MultiDigitResolution>>>;
  }
> = {
  hand_dx_trigger_digit: {
    default: {
      diagnosisSnomedCode: "1539003",
      diagnosisSnomedDisplay: "Trigger finger (disorder)",
      procedurePicklistId: "hand_comp_trigger_finger",
      procedureDisplayName: "Trigger finger release",
    },
    overrides: {
      I: {
        diagnosisSnomedCode: "202855006",
        diagnosisSnomedDisplay: "Stenosing tenosynovitis of thumb (disorder)",
        procedurePicklistId: "hand_comp_trigger_thumb",
        procedureDisplayName: "Trigger thumb release",
      },
    },
  },
};

/** Resolve the full per-digit config, merging overrides over defaults. */
export function resolveDigitConfig(
  diagnosisId: string,
  digit: DigitId,
): MultiDigitResolution | null {
  const config = MULTI_DIGIT_RESOLUTIONS[diagnosisId];
  if (!config) return null;

  const override = config.overrides[digit];
  if (!override) return config.default;

  return { ...config.default, ...override };
}

// ─── Labels & body structure codes ──────────────────────────────────────────

/** Human-readable labels for display */
export const DIGIT_LABELS: Record<DigitId, string> = {
  I: "Thumb",
  II: "Index finger",
  III: "Middle finger",
  IV: "Ring finger",
  V: "Little finger",
};

/** SNOMED CT body structure codes per digit (for FHIR bodySite) */
export const DIGIT_BODY_STRUCTURE_SNOMED: Record<
  DigitId,
  { code: string; display: string }
> = {
  I: { code: "76505004", display: "Thumb structure (body structure)" },
  II: { code: "83738005", display: "Index finger structure (body structure)" },
  III: {
    code: "43825001",
    display: "Middle finger structure (body structure)",
  },
  IV: { code: "82002001", display: "Ring finger structure (body structure)" },
  V: { code: "56459004", display: "Little finger structure (body structure)" },
};

/** Format affected digits as human-readable string for export */
export function formatAffectedDigits(digits: DigitId[]): string {
  return digits.map((d) => DIGIT_LABELS[d]).join("; ");
}
