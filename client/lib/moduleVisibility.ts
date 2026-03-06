/**
 * Module visibility logic for hub-and-spoke form architecture.
 * Determines which clinical detail module rows are visible for a given DiagnosisGroup.
 */

import type { DiagnosisGroup } from "@/types/case";
import type { InfectionOverlay } from "@/types/infection";
import type { EpisodeType } from "@/types/episode";
import { PICKLIST_TO_FLAP_TYPE } from "@/lib/procedurePicklist";

export interface ModuleVisibility {
  flapDetails: boolean;
  flapOutcome: boolean;
  /** Unified hand trauma assessment */
  handTraumaAssessment: boolean;
  infection: boolean;
  woundAssessment: boolean;
}

/**
 * Check if a single procedure is a free flap procedure.
 * Extracted for reuse across module visibility and case-level checks.
 */
export function procedureHasFreeFlap(proc: {
  picklistEntryId?: string;
  tags?: string[];
}): boolean {
  if (proc.picklistEntryId && PICKLIST_TO_FLAP_TYPE[proc.picklistEntryId]) {
    return true;
  }
  return proc.tags?.includes("free_flap") ?? false;
}

/**
 * Check if a single procedure is a pedicled flap procedure.
 */
export function procedureHasPedicledFlap(proc: { tags?: string[] }): boolean {
  return proc.tags?.includes("pedicled_flap") ?? false;
}

/**
 * Case-level predicate for Treatment Context visibility.
 * Registry treatment context applies to any reconstructive flap case, not only free flaps.
 */
export function caseHasFlapProcedure(groups: DiagnosisGroup[]): boolean {
  return groups.some((g) =>
    g.procedures.some(
      (procedure) =>
        procedureHasFreeFlap(procedure) || procedureHasPedicledFlap(procedure),
    ),
  );
}

/**
 * Case-level predicate: does ANY diagnosis group contain a free flap procedure?
 */
export function caseHasFreeFlap(groups: DiagnosisGroup[]): boolean {
  return groups.some((g) => g.procedures.some(procedureHasFreeFlap));
}

/**
 * Compute which detail module hub rows should be visible for a diagnosis group.
 *
 * @param group - The diagnosis group to evaluate
 * @param handCaseType - The hand surgery case type ("trauma" | "elective") when specialty is hand_surgery
 * @param infectionOverlay - The case-level infection overlay (shared across groups)
 * @param isFirstInfectionGroup - Whether this is the first group that triggers infection visibility
 * @param episodeType - The linked episode's type, if any (triggers wound module for wound/burns episodes)
 */
export function getModuleVisibility(
  group: DiagnosisGroup,
  handCaseType?: "trauma" | "elective",
  infectionOverlay?: InfectionOverlay,
  isFirstInfectionGroup?: boolean,
  episodeType?: EpisodeType,
): ModuleVisibility {
  const procedures = group.procedures;

  // Flap Details: any procedure maps to a free flap or has explicit free_flap tag
  const flapDetails = procedures.some(procedureHasFreeFlap);

  // Flap Outcome: same predicate as flapDetails (Part 8D alignment)
  const flapOutcome = flapDetails;

  // Hand Trauma Assessment: unified module replacing separate fracture + structure modules
  const handTraumaAssessment =
    group.specialty === "hand_wrist" && handCaseType === "trauma";

  // Infection: diagnosis from infection subcategory OR infectionOverlay exists
  // Only shown on the first matching group (infection data is case-level)
  const hasInfectionDiagnosis = group.procedures.some(
    (p) => p.subcategory === "Chronic Wounds / Infection",
  );
  const infection =
    isFirstInfectionGroup !== false &&
    (hasInfectionDiagnosis || !!infectionOverlay);

  // Wound Assessment: procedure has complex_wound tag, or episode is wound/burns type,
  // or wound data already exists on the group (re-editing)
  const woundAssessment =
    procedures.some((p) => p.tags?.includes("complex_wound")) ||
    episodeType === "wound_management" ||
    episodeType === "burns_management" ||
    !!group.woundAssessment;

  return {
    flapDetails,
    flapOutcome,
    handTraumaAssessment,
    infection,
    woundAssessment,
  };
}
