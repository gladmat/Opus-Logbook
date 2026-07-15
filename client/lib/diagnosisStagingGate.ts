// Decides whether DiagnosisGroupEditor should ask the server for a staging
// configuration for the current diagnosis. Extracted as a pure helper so the
// gate is unit-testable without the RN runtime.

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

export interface StagingGateArgs {
  /**
   * The curated picklist entry, when one is selected. May be STALE relative
   * to primaryDiagnosis: the free-SNOMED search path overrides
   * primaryDiagnosis without clearing selectedDiagnosis.
   */
  selectedDiagnosis: Pick<
    DiagnosisPicklistEntry,
    "hasStaging" | "snomedCtCode" | "displayName"
  > | null;
  /** The diagnosis actually shown on the group (drives the server lookup). */
  primaryDiagnosis: { conceptId: string; term: string } | null;
  /**
   * True when the group was LOADED with persisted diagnosisStagingSelections.
   * Legacy cases saved before the hasStaging gate existed may carry staging
   * values on an opted-out entry; keep fetching so those stay visible and
   * editable instead of silently persisting invisible data.
   */
  hadStoredSelections: boolean;
}

/**
 * Curated picklist entries own their staging declaration: when an entry
 * explicitly opts out (`hasStaging: false`), skip the server lookup — its
 * keyword fallback would otherwise attach staging by display-name matching
 * (e.g. burns Depth/TBSA% onto every diagnosis containing "burn").
 *
 * Free-text / SNOMED-searched diagnoses (no corresponding entry) keep the
 * server lookup, keywords and all.
 */
export function shouldFetchDiagnosisStaging({
  selectedDiagnosis,
  primaryDiagnosis,
  hadStoredSelections,
}: StagingGateArgs): boolean {
  if (!primaryDiagnosis) return false;
  if (!selectedDiagnosis) return true;

  // Only honour the entry's flag when the entry is what's actually selected —
  // a SNOMED-search override changes primaryDiagnosis but leaves
  // selectedDiagnosis behind.
  const entryIsCurrent =
    selectedDiagnosis.snomedCtCode === primaryDiagnosis.conceptId &&
    selectedDiagnosis.displayName === primaryDiagnosis.term;
  if (!entryIsCurrent) return true;

  if (selectedDiagnosis.hasStaging) return true;
  return hadStoredSelections;
}
