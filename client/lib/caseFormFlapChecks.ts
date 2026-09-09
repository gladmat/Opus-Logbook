// Pure free-flap completeness checks for the case form.
//
// Mirrors `caseFormDateChecks.ts`: lives in `lib/` so it is unit-testable
// without the RN runtime, and `useCaseForm` composes it into the Review
// surface as soft, non-blocking warnings.
//
// Harvest side is deliberately NOT pre-seeded (it used to default to "left",
// which made every untouched flap read as a confirmed Left harvest). The
// Review screen nudges instead of blocking.

import type { DiagnosisGroup, FreeFlapDetails } from "@/types/case";
import { FREE_FLAP_LABELS } from "@/types/case";
import type { ValidationError } from "@/lib/caseFormDateChecks";

export const FLAP_HARVEST_SIDE_FIELD = "flap.harvestSide";

function asFlapDetails(clinicalDetails: unknown): FreeFlapDetails | undefined {
  if (!clinicalDetails || typeof clinicalDetails !== "object") return undefined;
  const d = clinicalDetails as Partial<FreeFlapDetails>;
  return d.flapType ? (d as FreeFlapDetails) : undefined;
}

/** One warning per free-flap procedure whose harvest side is unset. */
export function getFlapWarnings(groups: DiagnosisGroup[]): ValidationError[] {
  const warnings: ValidationError[] = [];
  for (const group of groups) {
    for (const procedure of group.procedures ?? []) {
      const details = asFlapDetails(procedure.clinicalDetails);
      if (!details) continue;
      if (details.harvestSide === "left" || details.harvestSide === "right") {
        continue;
      }
      const flapLabel =
        details.flapDisplayName ||
        FREE_FLAP_LABELS[details.flapType as keyof typeof FREE_FLAP_LABELS] ||
        procedure.procedureName ||
        "free flap";
      warnings.push({
        field: FLAP_HARVEST_SIDE_FIELD,
        sectionId: "case",
        message: `Harvest side not set — ${flapLabel}`,
      });
    }
  }
  return warnings;
}
