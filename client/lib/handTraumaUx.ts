import type { AdmissionUrgency, CaseProcedure } from "@/types/case";

export type HandTraumaCaseType = "trauma" | "acute" | "elective";

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.some((entry) => hasMeaningfulValue(entry));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      hasMeaningfulValue(entry),
    );
  }
  return false;
}

export function isDisposableTraumaPlaceholderProcedure(
  procedure: CaseProcedure,
): boolean {
  return (
    !procedure.picklistEntryId &&
    !procedure.procedureName.trim() &&
    !procedure.snomedCtCode &&
    !procedure.snomedCtDisplay &&
    !procedure.localCode &&
    !procedure.localCodeSystem &&
    !procedure.notes?.trim() &&
    !hasMeaningfulValue(procedure.clinicalDetails)
  );
}

export function pruneDisposableTraumaPlaceholderProcedures(
  procedures: CaseProcedure[],
): CaseProcedure[] {
  return procedures.filter(
    (procedure) => !isDisposableTraumaPlaceholderProcedure(procedure),
  );
}

export function getDefaultAdmissionUrgencyForHandCaseType(
  caseType: HandTraumaCaseType,
): AdmissionUrgency {
  switch (caseType) {
    case "trauma":
    case "acute":
      return "acute";
    case "elective":
      return "elective";
  }
}
