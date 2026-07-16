import type { Case, DiagnosisGroup } from "@/types/case";
import { getHandTraumaCaseTitle } from "@/lib/handTraumaDiagnosis";
import { generateHandInfectionSummary } from "@/types/handInfection";
import { findDiagnosisById } from "@/lib/diagnosisPicklists";
import { getBoneTumourTitleSuffix } from "@/types/boneTumour";

/**
 * A stale `diagnosisClinicalDetails.handTrauma` blob can survive a hand
 * case-type switch on legacy-saved groups (fixed at source in
 * DiagnosisGroupEditor, but stored cases may still carry it). The trauma
 * title is regenerated from that blob, so it must not win over a coded
 * non-trauma diagnosis. Legitimate trauma groups can also carry a
 * `diagnosisPicklistId` (the mapping's representative diagnosis), but those
 * entries have `clinicalGroup: "trauma"` — so the rule keys off the resolved
 * entry's clinical group, treating unknown/unresolvable as trauma-wins.
 */
function hasNonTraumaPicklistDiagnosis(group: DiagnosisGroup): boolean {
  if (!group.diagnosisPicklistId) return false;
  const entry = findDiagnosisById(group.diagnosisPicklistId);
  return !!entry?.clinicalGroup && entry.clinicalGroup !== "trauma";
}

/**
 * Append the bone tumour site to a diagnosis title when recorded,
 * e.g. "Enchondroma (hand / finger) — middle phalanx, Dig. V".
 */
function withBoneTumourSite(
  group: DiagnosisGroup,
  title: string | undefined,
): string | undefined {
  if (!title) return title;
  for (const proc of group.procedures ?? []) {
    if (proc.boneTumourDetails) {
      const suffix = getBoneTumourTitleSuffix(proc.boneTumourDetails);
      if (suffix) return `${title} — ${suffix}`;
    }
  }
  return title;
}

export function getDiagnosisGroupTitle(
  group: DiagnosisGroup | undefined,
): string | undefined {
  if (!group) return undefined;
  const traumaTitle = getHandTraumaCaseTitle(group);
  if (traumaTitle && hasNonTraumaPicklistDiagnosis(group)) {
    return (
      withBoneTumourSite(group, group.diagnosis?.displayName) ?? traumaTitle
    );
  }
  return traumaTitle ?? withBoneTumourSite(group, group.diagnosis?.displayName);
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
