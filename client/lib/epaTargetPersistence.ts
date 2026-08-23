/**
 * epaTargetPersistence — decides what the save pipeline does with derived
 * EPA targets + exposure records. Extracted from useCaseForm.handleSave so
 * the destructive cases are pinned by tests:
 *
 * - saveEpaTargets(caseId, [], []) REMOVES the stored key
 *   (assessmentStorage), which is correct when the team was genuinely
 *   removed or derivation genuinely produced nothing — but it must NEVER
 *   fire because an input (the profile) was momentarily unavailable, or a
 *   transient auth-hydration gap would silently wipe previously derived
 *   targets.
 */

import type {
  EpaAssessmentTarget,
  EpaExposureRecord,
} from "@/lib/epaDerivation";

export interface EpaDerivedRecords {
  targets: EpaAssessmentTarget[];
  exposures: EpaExposureRecord[];
}

export type EpaPersistAction =
  | {
      /** Persist (empty lists are an intentional clear). */
      kind: "save";
      targets: EpaAssessmentTarget[];
      exposures: EpaExposureRecord[];
    }
  | { kind: "skip"; reason: "no-profile" | "not-applicable" };

export function planEpaTargetPersistence(params: {
  /** operativeTeam (post-rehydration) is non-empty. */
  hasTeam: boolean;
  isEdit: boolean;
  /** The profile object was available at save time (careerStage may still be null — team-only pairs derive without it). */
  profileAvailable: boolean;
  /** Derivation output; null when derivation did not run. */
  derived: EpaDerivedRecords | null;
}): EpaPersistAction {
  const { hasTeam, isEdit, profileAvailable, derived } = params;
  if (hasTeam) {
    if (!profileAvailable) {
      // Inputs were unavailable — never destroy existing targets on a
      // transient gap. The next save with a hydrated profile re-derives.
      return { kind: "skip", reason: "no-profile" };
    }
    return {
      kind: "save",
      targets: derived?.targets ?? [],
      exposures: derived?.exposures ?? [],
    };
  }
  if (isEdit) {
    // Team removed on an edit-save — stale targets must clear.
    return { kind: "save", targets: [], exposures: [] };
  }
  return { kind: "skip", reason: "not-applicable" };
}
