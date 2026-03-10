import type { Case, DiagnosisGroup, Specialty } from "@/types/case";

export interface MediaContext {
  specialty?: Specialty;
  procedureTags?: string[];
  procedurePicklistIds?: string[];
  diagnosisPicklistIds?: string[];
  hasSkinCancerAssessment?: boolean;
  procedureDate?: string;
}

function uniqueStrings(
  values: (string | null | undefined)[],
): string[] | undefined {
  const filtered = values.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  if (filtered.length === 0) return undefined;
  return Array.from(new Set(filtered));
}

export function buildMediaContext(args: {
  specialty?: Specialty;
  procedureDate?: string;
  diagnosisGroups?: DiagnosisGroup[];
}): MediaContext {
  const groups = args.diagnosisGroups ?? [];

  return {
    specialty: args.specialty,
    procedureDate: args.procedureDate,
    procedureTags: uniqueStrings(
      groups.flatMap((group) =>
        group.procedures.flatMap((procedure) => procedure.tags ?? []),
      ),
    ),
    procedurePicklistIds: uniqueStrings([
      ...groups.flatMap((group) =>
        group.procedures.map((procedure) => procedure.picklistEntryId),
      ),
      ...groups.flatMap((group) =>
        (group.lesionInstances ?? []).map(
          (lesion) => lesion.procedurePicklistId,
        ),
      ),
    ]),
    diagnosisPicklistIds: uniqueStrings(
      groups.map((group) => group.diagnosisPicklistId),
    ),
    hasSkinCancerAssessment: groups.some(
      (group) =>
        !!group.skinCancerAssessment ||
        (group.lesionInstances ?? []).some(
          (lesion) => !!lesion.skinCancerAssessment,
        ),
    ),
  };
}

export function buildMediaContextFromCase(caseData: Case): MediaContext {
  return buildMediaContext({
    specialty: caseData.specialty,
    procedureDate: caseData.procedureDate,
    diagnosisGroups: caseData.diagnosisGroups,
  });
}
