/**
 * Module visibility logic for hub-and-spoke form architecture.
 * Determines which clinical detail module rows are visible for a given DiagnosisGroup.
 */

import type { DiagnosisGroup } from "@/types/case";
import type { InfectionOverlay } from "@/types/infection";
import type { EpisodeType } from "@/types/episode";
import { findPicklistEntry } from "@/lib/procedurePicklist";

export interface ModuleVisibility {
  flapDetails: boolean;
  fractureClassification: boolean;
  handStructures: boolean;
  infection: boolean;
  woundAssessment: boolean;
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

  // Flap Details: any procedure has hasFreeFlap on picklist entry OR tags include free_flap/pedicled_flap
  const flapDetails = procedures.some((p) => {
    const entry = p.picklistEntryId
      ? findPicklistEntry(p.picklistEntryId)
      : undefined;
    return (
      entry?.hasFreeFlap ||
      p.tags?.includes("free_flap") ||
      p.tags?.includes("pedicled_flap")
    );
  });

  // Fracture Classification: hand_surgery specialty + trauma case type
  const fractureClassification =
    group.specialty === "hand_surgery" && handCaseType === "trauma";

  // Hand Structures: hand_surgery specialty + trauma case type (keeps existing trigger)
  const handStructures =
    group.specialty === "hand_surgery" && handCaseType === "trauma";

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
    fractureClassification,
    handStructures,
    infection,
    woundAssessment,
  };
}
