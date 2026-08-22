/**
 * epaTargetPersistence — decides what the save pipeline does with derived
 * EPA targets. Extracted from useCaseForm.handleSave so the destructive
 * cases are pinned by tests:
 *
 * - saveEpaTargets(caseId, []) REMOVES the stored key (assessmentStorage),
 *   which is correct when the team was genuinely removed or derivation
 *   genuinely produced nothing — but it must NEVER fire because an input
 *   (the profile) was momentarily unavailable, or a transient auth-hydration
 *   gap would silently wipe previously derived targets.
 */

import type { EpaAssessmentTarget } from "@/lib/epaDerivation";

export type EpaPersistAction =
  | {
      /** Persist (an empty list is an intentional clear). */
      kind: "save";
      targets: EpaAssessmentTarget[];
    }
  | { kind: "skip"; reason: "no-profile" | "not-applicable" };

export function planEpaTargetPersistence(params: {
  /** operativeTeam (post-rehydration) is non-empty. */
  hasTeam: boolean;
  isEdit: boolean;
  /** The profile object was available at save time (careerStage may still be null — team-only pairs derive without it). */
  profileAvailable: boolean;
  /** Derivation output; null when derivation did not run. */
  derivedTargets: EpaAssessmentTarget[] | null;
}): EpaPersistAction {
  const { hasTeam, isEdit, profileAvailable, derivedTargets } = params;
  if (hasTeam) {
    if (!profileAvailable) {
      // Inputs were unavailable — never destroy existing targets on a
      // transient gap. The next save with a hydrated profile re-derives.
      return { kind: "skip", reason: "no-profile" };
    }
    return { kind: "save", targets: derivedTargets ?? [] };
  }
  if (isEdit) {
    // Team removed on an edit-save — stale targets must clear.
    return { kind: "save", targets: [] };
  }
  return { kind: "skip", reason: "not-applicable" };
}
