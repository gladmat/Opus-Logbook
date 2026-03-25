/**
 * Module visibility logic for hub-and-spoke form architecture.
 * Determines which clinical detail module rows are visible for a given DiagnosisGroup.
 */

import type { DiagnosisGroup, Specialty } from "@/types/case";
import type { InfectionOverlay } from "@/types/infection";
import type { EpisodeType } from "@/types/episode";
import { procedureHasImplant } from "@/lib/jointImplant";
import { PICKLIST_TO_FLAP_TYPE } from "@/lib/procedurePicklist";
import { shouldActivateSkinCancerModuleForSnomed } from "@/lib/skinCancerConfig";
import { isBreastSpecialty } from "@/lib/breastConfig";
import { isAestheticProcedure } from "@/lib/aestheticsConfig";

const HEAD_NECK_JOINT_CASE_PROCEDURE_IDS = new Set([
  "hn_neck_dissection_radical",
  "hn_neck_dissection_modified_radical",
  "hn_neck_dissection_selective",
]);

export interface ModuleVisibility {
  flapDetails: boolean;
  flapOutcome: boolean;
  /** Unified hand trauma assessment */
  handTraumaAssessment: boolean;
  infection: boolean;
  woundAssessment: boolean;
  /** Skin cancer assessment module — diagnosis-metadata driven */
  skinCancerAssessment: boolean;
  /** Joint implant tracking for arthroplasty procedures */
  implant: boolean;
  /** Breast surgery assessment module — specialty-gated */
  breast: boolean;
  /** Craniofacial assessment module — specialty-gated */
  craniofacialAssessment: boolean;
  /** Aesthetic assessment module — procedure-driven + specialty-gated */
  aestheticAssessment: boolean;
  /** Burns assessment module — acute burn only (burns_dx_acute) */
  burnsAssessment: boolean;
  /** Peripheral nerve assessment module — diagnosis-metadata driven */
  peripheralNerveAssessment: boolean;
  /** Lymphoedema assessment module — diagnosis-metadata driven */
  lymphoedemaAssessment: boolean;
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
 * Case-level predicate: show Joint Case Context section when H&N specialty + free/pedicled flap.
 */
export function caseNeedsJointContext(
  specialty: Specialty | undefined,
  diagnosisGroups: DiagnosisGroup[],
): boolean {
  if (specialty !== "head_neck") {
    return false;
  }

  return diagnosisGroups.some((group) =>
    group.procedures.some(
      (procedure) =>
        procedureHasFreeFlap(procedure) ||
        procedureHasPedicledFlap(procedure) ||
        (procedure.picklistEntryId != null &&
          HEAD_NECK_JOINT_CASE_PROCEDURE_IDS.has(procedure.picklistEntryId)),
    ),
  );
}

/**
 * Compute which detail module hub rows should be visible for a diagnosis group.
 *
 * @param group - The diagnosis group to evaluate
 * @param handCaseType - The hand surgery case type ("trauma" | "acute" | "elective") when specialty is hand_surgery
 * @param infectionOverlay - The case-level infection overlay (shared across groups)
 * @param isFirstInfectionGroup - Whether this is the first group that triggers infection visibility
 * @param episodeType - The linked episode's type, if any (triggers wound module for wound/burns episodes)
 */
export function getModuleVisibility(
  group: DiagnosisGroup,
  handCaseType?: "trauma" | "acute" | "elective",
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
  // For acute hand cases, the inline HandInfectionCard handles infection data —
  // only show the full module if the user has explicitly escalated.
  const hasInfectionDiagnosis = group.procedures.some(
    (p) => p.subcategory === "Chronic Wounds / Infection",
  );
  const hasEscalatedHandInfection =
    group.handInfectionDetails?.escalatedToFullModule === true;
  const infection =
    isFirstInfectionGroup !== false &&
    (hasInfectionDiagnosis || !!infectionOverlay || hasEscalatedHandInfection);

  // Wound Assessment: procedure has complex_wound tag, or episode is wound/burns type,
  // or wound data already exists on the group (re-editing)
  const woundAssessment =
    procedures.some((p) => p.tags?.includes("complex_wound")) ||
    episodeType === "wound_management" ||
    episodeType === "burns_management" ||
    !!group.woundAssessment;

  // Skin Cancer Assessment: activated by specialty, diagnosis SNOMED code, or existing data.
  // The full picklist-entry check (hasEnhancedHistology) is done in DiagnosisGroupEditor
  // using local selectedDiagnosis state, since getModuleVisibility doesn't receive
  // the resolved picklist entry.
  const skinCancerAssessment =
    group.specialty === "skin_cancer" ||
    shouldActivateSkinCancerModuleForSnomed(
      group.diagnosis?.snomedCtCode,
      group.diagnosis?.displayName,
    ) ||
    !!group.skinCancerAssessment;

  // Joint Implant: any procedure with hasImplant flag (arthroplasty procedures)
  const implant = procedures.some(procedureHasImplant);

  // Breast: specialty-gated (soft clinical context, not diagnosis-driven)
  const breast = isBreastSpecialty(group.specialty);

  // Craniofacial: specialty-gated
  const craniofacialAssessment = group.specialty === "cleft_cranio";

  // Aesthetic: specialty-gated + procedure-driven (aes_/bc_ prefix) + existing data
  const aestheticAssessment =
    group.specialty === "aesthetics" ||
    procedures.some(
      (p) =>
        p.picklistEntryId != null && isAestheticProcedure(p.picklistEntryId),
    ) ||
    !!group.aestheticAssessment;

  // Burns: acute-only — only activates for the single "Acute burn" entry
  const burnsAssessment =
    (group.specialty === "burns" &&
      group.diagnosisPicklistId === "burns_dx_acute") ||
    !!group.burnsAssessment;

  // Peripheral nerve: diagnosis-metadata driven + existing data
  const peripheralNerveAssessment =
    group.specialty === "peripheral_nerve" ||
    !!group.peripheralNerveAssessment;

  // Lymphoedema: diagnosis-metadata driven + specialty + existing data
  const lymphoedemaAssessment =
    group.specialty === "lymphoedema" || !!group.lymphoedemaAssessment;

  return {
    flapDetails,
    flapOutcome,
    handTraumaAssessment,
    infection,
    woundAssessment,
    skinCancerAssessment,
    implant,
    breast,
    craniofacialAssessment,
    aestheticAssessment,
    burnsAssessment,
    peripheralNerveAssessment,
    lymphoedemaAssessment,
  };
}
