/**
 * Multi-lesion accept-mapping helpers
 * ═══════════════════════════════════
 * Pure aggregation logic behind `MultiLesionSummaryPanel` — folds each
 * lesion's skin-cancer procedure suggestions into one group-level accept
 * flow. Before this existed, multi-lesion mode unmounted the only accept
 * affordance while the Phase-7 save gate still demanded
 * `procedureSuggestionSource === "skinCancer"`, so multi-lesion cases could
 * never be saved.
 *
 * Kept free of React/native imports so vitest can exercise it directly.
 */

import type { LesionInstance } from "@/types/case";
import type { SkinCancerLesionAssessment } from "@/types/skinCancer";
import {
  CATEGORY_SHORT_LABELS,
  getDefaultSkinCancerSelectedProcedureIds,
  getSkinCancerPrimaryHistology,
  getSkinCancerProcedureSuggestions,
  resolveSkinCancerDiagnosis,
  type ResolvedSkinCancerDiagnosis,
} from "@/lib/skinCancerConfig";
import { findPicklistEntry } from "@/lib/procedurePicklist";

/**
 * Same "touched" predicate as the save-time accept-mapping guard in
 * `validateRequiredFields` — the default-seeded blob doesn't count.
 */
export function hasSubstantiveSkinCancerAssessment(
  assessment: SkinCancerLesionAssessment | null | undefined,
): boolean {
  return (
    assessment != null &&
    (Boolean(assessment.pathwayStage) ||
      Boolean(assessment.site) ||
      Boolean(assessment.currentHistology) ||
      Boolean(assessment.priorHistology) ||
      Boolean(assessment.clinicalSuspicion))
  );
}

/** True when any lesion in the list carries a substantive assessment. */
export function anyLesionHasSubstantiveAssessment(
  lesions: readonly LesionInstance[] | null | undefined,
): boolean {
  return (lesions ?? []).some((l) =>
    hasSubstantiveSkinCancerAssessment(l.skinCancerAssessment),
  );
}

/** Lesion display label — site when recorded, ordinal fallback otherwise. */
export function getLesionShortLabel(
  lesion: LesionInstance,
  index: number,
): string {
  const site = lesion.site?.trim();
  return site || `Lesion ${index + 1}`;
}

export interface MultiLesionSuggestionItem {
  /** Composite row key: `${lesionId}::${procedurePicklistId}` */
  key: string;
  lesionId: string;
  lesionIndex: number;
  lesionLabel: string;
  procedurePicklistId: string;
  /** Picklist display name suffixed with the lesion label */
  displayName: string;
  snomedCtCode?: string;
  /** Preselected by default (same per-lesion default logic as single-lesion) */
  isDefault: boolean;
}

/**
 * One selectable row per (lesion, suggested procedure) pair, in lesion
 * order. Lesions without a substantive assessment contribute nothing;
 * suggestion ids that don't resolve to a picklist entry are skipped.
 */
export function buildMultiLesionSuggestionItems(
  lesions: readonly LesionInstance[],
): MultiLesionSuggestionItem[] {
  const items: MultiLesionSuggestionItem[] = [];
  lesions.forEach((lesion, index) => {
    const assessment = lesion.skinCancerAssessment;
    if (!hasSubstantiveSkinCancerAssessment(assessment)) return;
    const suggestionIds = getSkinCancerProcedureSuggestions(assessment!);
    const defaults = new Set(
      getDefaultSkinCancerSelectedProcedureIds(assessment!, suggestionIds),
    );
    const label = getLesionShortLabel(lesion, index);
    for (const id of suggestionIds) {
      const entry = findPicklistEntry(id);
      if (!entry) continue;
      items.push({
        key: `${lesion.id}::${id}`,
        lesionId: lesion.id,
        lesionIndex: index,
        lesionLabel: label,
        procedurePicklistId: id,
        displayName: `${entry.displayName} — ${label}`,
        snomedCtCode: entry.snomedCtCode,
        isDefault: defaults.has(id),
      });
    }
  });
  return items;
}

/** e.g. "3 lesions in this session" (+ " · 1 awaiting assessment"). */
export function buildMultiLesionHeadline(
  lesions: readonly LesionInstance[],
): string {
  const total = lesions.length;
  const substantive = lesions.filter((l) =>
    hasSubstantiveSkinCancerAssessment(l.skinCancerAssessment),
  ).length;
  const base = `${total} lesion${total === 1 ? "" : "s"} in this session`;
  const pending = total - substantive;
  return pending > 0 ? `${base} · ${pending} awaiting assessment` : base;
}

/** One chip per lesion: "1. Nose — BCC". */
export function buildMultiLesionKeyFacts(
  lesions: readonly LesionInstance[],
): string[] {
  return lesions.map((lesion, index) => {
    const assessment = lesion.skinCancerAssessment;
    const category = assessment
      ? (getSkinCancerPrimaryHistology(assessment)?.pathologyCategory ??
        assessment.clinicalSuspicion)
      : undefined;
    const categoryLabel = category
      ? (CATEGORY_SHORT_LABELS[category] ?? category)
      : "Not assessed";
    return `${index + 1}. ${getLesionShortLabel(lesion, index)} — ${categoryLabel}`;
  });
}

/**
 * Diagnosis resolved from the FIRST lesion with a substantive assessment —
 * the group-level coded diagnosis represents the primary lesion; each
 * lesion's own pathology rides its LesionInstance.
 */
export function resolvePrimaryMultiLesionDiagnosis(
  lesions: readonly LesionInstance[],
): ResolvedSkinCancerDiagnosis | null {
  const primary = lesions.find((l) =>
    hasSubstantiveSkinCancerAssessment(l.skinCancerAssessment),
  );
  if (!primary?.skinCancerAssessment) return null;
  return resolveSkinCancerDiagnosis(primary.skinCancerAssessment);
}
