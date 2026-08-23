/**
 * assessmentProcedure — which procedure an assessment is ABOUT.
 *
 * The derived target's units are restricted (v3) to units where the trainee
 * operated as Primary Surgeon, so the first unit is the procedure the
 * entrustment rating attributes to. Legacy / heuristic flows (no target)
 * fall back to the first procedure in the blob, then to a neutral label.
 */

import type { EpaAssessmentTarget } from "./epaDerivation";
import type { AssessmentProcedureRef, SharedCaseData } from "@/types/sharing";

export const UNKNOWN_PROCEDURE_REF: AssessmentProcedureRef = {
  procedureSnomedCode: "",
  procedureDisplayName: "Procedure",
};

export function resolveAssessmentProcedure(
  target: EpaAssessmentTarget | null | undefined,
  blob: SharedCaseData | null | undefined,
): AssessmentProcedureRef {
  const unit = target?.units[0];
  if (unit) {
    return {
      procedureSnomedCode: unit.procedureSnomedCode,
      procedureDisplayName: unit.procedureDisplayName,
      procedureId: unit.procedureId,
    };
  }
  const first = blob?.diagnosisGroups?.[0]?.procedures?.[0];
  if (first) {
    return {
      procedureSnomedCode: first.snomedCtCode ?? "",
      procedureDisplayName:
        first.procedureName ||
        blob?.diagnosisGroups?.[0]?.diagnosis?.displayName ||
        UNKNOWN_PROCEDURE_REF.procedureDisplayName,
      procedureId: first.id,
    };
  }
  const dx = blob?.diagnosisGroups?.[0]?.diagnosis?.displayName;
  return dx
    ? { procedureSnomedCode: "", procedureDisplayName: dx }
    : UNKNOWN_PROCEDURE_REF;
}
