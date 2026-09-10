/**
 * caseSummaryFields — the diagnosis / procedure / site / badge derivations
 * shared by `storage.buildCaseSummary` (local cases) and
 * `buildSharedCaseSummary` (decrypted share blobs, 2.25.0). One place, so
 * a shared case on the dashboard reads exactly like an owned one.
 */

import type { DiagnosisGroup } from "@/types/case";
import { getAllProcedures, getPrimarySiteLabel } from "@/types/case";
import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import { getSkinCancerCaseBadge } from "@/lib/skinCancerConfig";

export type SkinCancerBadgeColorKey = "error" | "warning" | "info" | "success";

export interface CaseSummaryFields {
  diagnosisTitle?: string;
  primaryProcedureName?: string;
  procedureNames: string[];
  siteLabel?: string;
  skinCancerBadgeLabel?: string;
  skinCancerBadgeColorKey?: SkinCancerBadgeColorKey;
  hasSevereHandInfection: boolean;
}

const BADGE_PRIORITY: Record<string, number> = {
  error: 0,
  warning: 1,
  info: 2,
  success: 3,
};

export function resolveSkinCancerBadgeFromGroups(
  groups: DiagnosisGroup[] | undefined,
): { label: string; colorKey: SkinCancerBadgeColorKey } | null {
  let best: { label: string; colorKey: SkinCancerBadgeColorKey } | null = null;
  let bestPriority = Infinity;

  for (const group of groups ?? []) {
    if (group.skinCancerAssessment) {
      const badge = getSkinCancerCaseBadge(group.skinCancerAssessment);
      if (badge && (BADGE_PRIORITY[badge.colorKey] ?? 99) < bestPriority) {
        best = badge;
        bestPriority = BADGE_PRIORITY[badge.colorKey] ?? 99;
      }
    }
    for (const lesion of group.lesionInstances ?? []) {
      if (!lesion.skinCancerAssessment) continue;
      const badge = getSkinCancerCaseBadge(lesion.skinCancerAssessment);
      if (badge && (BADGE_PRIORITY[badge.colorKey] ?? 99) < bestPriority) {
        best = badge;
        bestPriority = BADGE_PRIORITY[badge.colorKey] ?? 99;
      }
    }
  }

  return best;
}

export function hasSevereHandInfectionInGroups(
  groups: DiagnosisGroup[] | undefined,
): boolean {
  return (
    groups?.some(
      (group) =>
        group.handInfectionDetails &&
        !group.handInfectionDetails.escalatedToFullModule &&
        (group.handInfectionDetails.severity === "spreading" ||
          group.handInfectionDetails.severity === "systemic"),
    ) ?? false
  );
}

export function deriveCaseSummaryFields(source: {
  diagnosisGroups?: DiagnosisGroup[];
  procedureType?: string;
}): CaseSummaryFields {
  const groups = { diagnosisGroups: source.diagnosisGroups ?? [] };
  const primaryProcedureName =
    getAllProcedures(groups)[0]?.procedureName || source.procedureType;
  const procedureNames = getAllProcedures(groups)
    .map((procedure) => procedure.procedureName)
    .filter((name): name is string => Boolean(name));
  const diagnosisTitle = getCasePrimaryTitle(groups) || source.procedureType;
  const badge = resolveSkinCancerBadgeFromGroups(source.diagnosisGroups);

  return {
    diagnosisTitle,
    primaryProcedureName,
    procedureNames,
    siteLabel: getPrimarySiteLabel(groups) ?? undefined,
    skinCancerBadgeLabel: badge?.label,
    skinCancerBadgeColorKey: badge?.colorKey,
    hasSevereHandInfection: hasSevereHandInfectionInGroups(
      source.diagnosisGroups,
    ),
  };
}

/** Lower-cased search haystack — same recipe for owned and shared cases. */
export function buildSearchableText(
  parts: (string | undefined | null)[],
): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}
