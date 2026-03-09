import type { Case, DiagnosisGroup } from "@/types/case";
import { getHandTraumaCaseTitle } from "@/lib/handTraumaDiagnosis";
import { generateHandInfectionSummary } from "@/types/handInfection";

export function getDiagnosisGroupTitle(
  group: DiagnosisGroup | undefined,
): string | undefined {
  if (!group) return undefined;
  return getHandTraumaCaseTitle(group) ?? group.diagnosis?.displayName;
}

/**
 * Returns a subtitle for the diagnosis group when hand infection data exists.
 * e.g. "Superficial · Thumb · S. aureus (MSSA)"
 */
export function getDiagnosisGroupSubtitle(
  group: DiagnosisGroup | undefined,
): string | null {
  if (!group) return null;
  return generateHandInfectionSummary(group.handInfectionDetails);
}

export function getCasePrimaryTitle(caseData: Case): string | undefined {
  return getDiagnosisGroupTitle(caseData.diagnosisGroups?.[0]);
}
