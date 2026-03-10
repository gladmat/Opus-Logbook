import type { Case, DiagnosisGroup, Specialty } from "@/types/case";

interface ResolveCaseFormSpecialtyParams {
  isEditMode: boolean;
  routeSpecialty?: Specialty;
  duplicateSpecialty?: Specialty;
  existingCaseSpecialty?: Specialty;
}

function sortDiagnosisGroups(groups: DiagnosisGroup[]): DiagnosisGroup[] {
  return [...groups].sort((left, right) => {
    const leftOrder = left.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sequenceOrder ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
}

export function resolveCaseFormSpecialty({
  isEditMode,
  routeSpecialty,
  duplicateSpecialty,
  existingCaseSpecialty,
}: ResolveCaseFormSpecialtyParams): Specialty {
  if (isEditMode && existingCaseSpecialty) {
    return existingCaseSpecialty;
  }

  return routeSpecialty ?? duplicateSpecialty ?? "general";
}

export function inferRepairedCaseSpecialty(
  caseData: Pick<Case, "specialty" | "diagnosisGroups">,
): Specialty | null {
  if (caseData.specialty !== "general") {
    return null;
  }

  const diagnosisGroups = sortDiagnosisGroups(caseData.diagnosisGroups ?? []);
  const primarySpecialty = diagnosisGroups[0]?.specialty;

  if (!primarySpecialty || primarySpecialty === "general") {
    return null;
  }

  const nonGeneralSpecialties = new Set<Specialty>();
  for (const group of diagnosisGroups) {
    if (group.specialty !== "general") {
      nonGeneralSpecialties.add(group.specialty);
    }
  }

  if (
    nonGeneralSpecialties.size !== 1 ||
    !nonGeneralSpecialties.has(primarySpecialty)
  ) {
    return null;
  }

  return primarySpecialty;
}

export function repairCaseSpecialty(caseData: Case): Case {
  const repairedSpecialty = inferRepairedCaseSpecialty(caseData);
  if (!repairedSpecialty) {
    return caseData;
  }

  return {
    ...caseData,
    specialty: repairedSpecialty,
  };
}
