/**
 * Accept-Mapping save guard (Phase 7 / case-form-ux-audit B1.1)
 * ═════════════════════════════════════════════════════════════
 * A populated skin-cancer or acute-hand assessment must have its group's
 * `procedureSuggestionSource` set to the matching module before save.
 * Otherwise the surgeon did the assessment but never tapped "Accept
 * mapping" — and procedures default to whatever was seeded at specialty
 * change (clinically wrong).
 *
 * Extracted from `validateRequiredFields` (useCaseForm) as a pure function
 * so vitest can exercise it without the hook module's native import graph.
 */

import type { DiagnosisGroup } from "@/types/case";
import type { ValidationError } from "@/lib/caseFormDateChecks";
import {
  anyLesionHasSubstantiveAssessment,
  hasSubstantiveSkinCancerAssessment,
} from "@/lib/multiLesionMapping";

export function getAcceptMappingErrors(
  groups: readonly DiagnosisGroup[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  groups.forEach((g, idx) => {
    const groupLabel = groups.length > 1 ? `Group ${idx + 1}` : "Diagnosis";

    // Skin cancer: treat the assessment as "touched" once the surgeon has
    // committed to a pathway, recorded site/histology, or captured lesion
    // photos. The default-shape blob isn't touched. Multi-lesion groups
    // carry per-lesion assessments (the group-level blob is stripped at
    // emit), so the signal comes from the lesion instances there.
    const hasSkinCancerWork = g.isMultiLesion
      ? anyLesionHasSubstantiveAssessment(g.lesionInstances)
      : hasSubstantiveSkinCancerAssessment(g.skinCancerAssessment);
    // The guard explicitly rejects `procedureSuggestionSource === "manual"`
    // because "manual" IS the corruption mode: `handleSpecialtyChange`
    // seeds a placeholder procedure with the wrong name when no Accept
    // Mapping has fired. The only legitimate exit from a substantive
    // skin-cancer assessment is Accept Mapping, which sets source to
    // "skinCancer". Same for acute hand.
    if (hasSkinCancerWork && g.procedureSuggestionSource !== "skinCancer") {
      errors.push({
        field: "diagnosisGroups",
        sectionId: "case",
        message: g.isMultiLesion
          ? `${groupLabel}: tap "Accept mapping" below the lesion list before saving.`
          : `${groupLabel}: tap "Accept mapping" in the skin cancer assessment before saving.`,
      });
    }

    // Acute hand: persisted signal is `handInfectionDetails` (only set
    // when the form is in acute hand mode).
    const hasAcuteHandWork = g.handInfectionDetails != null;
    if (hasAcuteHandWork && g.procedureSuggestionSource !== "acuteHand") {
      errors.push({
        field: "diagnosisGroups",
        sectionId: "case",
        message: `${groupLabel}: tap "Accept mapping" in the acute hand assessment before saving.`,
      });
    }
  });

  return errors;
}
