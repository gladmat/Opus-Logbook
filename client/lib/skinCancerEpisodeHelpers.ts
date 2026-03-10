/**
 * skinCancerEpisodeHelpers.ts
 * ═══════════════════════════════════════
 * Pure logic helpers for skin cancer episode auto-creation and
 * auto-resolution. Kept in lib/ (not hooks/) so Vitest can import
 * them without pulling in React Native.
 */

import { resolveSkinCancerDiagnosis } from "@/lib/skinCancerConfig";
import type { TreatmentEpisode } from "@/types/episode";
import type { Case, DiagnosisGroup } from "@/types/case";
import type { SkinCancerLesionAssessment } from "@/types/skinCancer";

/**
 * Collect all pending skin cancer lesions that need histology follow-up.
 * Used by episode auto-creation logic.
 */
export function collectPendingSkinCancerLesions(
  savedCase: Case,
): { site: string; suspicion: string }[] {
  const pending: { site: string; suspicion: string }[] = [];

  for (const group of savedCase.diagnosisGroups ?? []) {
    // Single-lesion
    if (group.skinCancerAssessment?.pathwayStage === "excision_biopsy") {
      const a = group.skinCancerAssessment;
      if (!a.currentHistology?.pathologyCategory) {
        pending.push({
          site: a.site ?? "unknown site",
          suspicion: a.clinicalSuspicion ?? "skin lesion",
        });
      }
    }
    // Multi-lesion
    for (const lesion of group.lesionInstances ?? []) {
      if (lesion.skinCancerAssessment?.pathwayStage === "excision_biopsy") {
        const a = lesion.skinCancerAssessment;
        if (!a.currentHistology?.pathologyCategory) {
          pending.push({
            site: a.site ?? lesion.site ?? "unknown site",
            suspicion: a.clinicalSuspicion ?? "skin lesion",
          });
        }
      }
    }
  }

  return pending;
}

/**
 * Determine the episode action to take based on all skin cancer
 * assessments in a case.
 *
 * Returns:
 * - "resolve"     – all assessments have clear margins
 * - "reexcision"  – any assessment has incomplete/close margins
 * - "none"        – no assessments, or some still pending
 */
export function determineSkinCancerEpisodeAction(
  caseData: Case,
): "resolve" | "reexcision" | "none" {
  let allClear = true;
  let anyIncomplete = false;
  let hasAssessments = false;

  const check = (a: SkinCancerLesionAssessment | undefined) => {
    if (!a) return;
    hasAssessments = true;
    const histo = a.currentHistology;
    if (
      !histo?.pathologyCategory ||
      histo.marginStatus === "pending" ||
      histo.marginStatus === "unknown"
    ) {
      allClear = false;
    } else if (
      histo.marginStatus === "incomplete" ||
      histo.marginStatus === "close"
    ) {
      allClear = false;
      anyIncomplete = true;
    }
  };

  for (const group of caseData.diagnosisGroups ?? []) {
    check(group.skinCancerAssessment);
    for (const lesion of group.lesionInstances ?? []) {
      check(lesion.skinCancerAssessment);
    }
  }

  if (!hasAssessments) return "none";
  if (allClear) return "resolve";
  if (anyIncomplete) return "reexcision";
  return "none";
}

export function buildSkinCancerEpisodeLinkPlan(
  savedCase: Case,
  existingEpisodes: TreatmentEpisode[],
  now: string,
  episodeId: string,
): {
  linkedEpisodeId: string;
  episodeToCreate?: TreatmentEpisode;
} | null {
  const pendingLesions = collectPendingSkinCancerLesions(savedCase);
  if (pendingLesions.length === 0) return null;
  if (savedCase.episodeId) {
    return { linkedEpisodeId: savedCase.episodeId };
  }

  const reusableEpisode = existingEpisodes.find(
    (episode) =>
      episode.type === "cancer_pathway" &&
      (episode.status === "active" || episode.status === "planned"),
  );
  if (reusableEpisode) {
    return { linkedEpisodeId: reusableEpisode.id };
  }

  const first = pendingLesions[0];
  if (!first) return null;

  const title =
    pendingLesions.length === 1
      ? `${first.site} ?${first.suspicion.toUpperCase()} — awaiting histology`
      : `${pendingLesions.length} skin lesions — awaiting histology`;

  const firstGroup = savedCase.diagnosisGroups?.[0];
  return {
    linkedEpisodeId: episodeId,
    episodeToCreate: {
      id: episodeId,
      patientIdentifier: savedCase.patientIdentifier,
      title,
      primaryDiagnosisCode: firstGroup?.diagnosis?.snomedCtCode ?? "",
      primaryDiagnosisDisplay:
        firstGroup?.diagnosis?.displayName ?? "Skin cancer",
      type: "cancer_pathway",
      specialty: savedCase.specialty,
      status: "active",
      pendingAction: "awaiting_histology",
      onsetDate: savedCase.procedureDate,
      notes: `${pendingLesions.length} lesion(s) awaiting histology results`,
      ownerId: savedCase.ownerId ?? "",
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function buildSkinCancerEpisodeUpdatePlan(
  updatedCase: Case,
  episode: TreatmentEpisode,
  now: string,
): Partial<TreatmentEpisode> | null {
  const action = determineSkinCancerEpisodeAction(updatedCase);

  if (action === "resolve") {
    return {
      status: "completed",
      resolvedDate: now,
      pendingAction: undefined,
    };
  }

  if (action === "reexcision") {
    return {
      status: episode.status === "planned" ? "active" : episode.status,
      resolvedDate: undefined,
      pendingAction: "awaiting_reexcision",
    };
  }

  if (collectPendingSkinCancerLesions(updatedCase).length > 0) {
    return {
      status: episode.status === "planned" ? "active" : episode.status,
      resolvedDate: undefined,
      pendingAction: "awaiting_histology",
    };
  }

  return null;
}

export function buildSkinCancerFollowUpAssessment(
  assessment: SkinCancerLesionAssessment | undefined,
): SkinCancerLesionAssessment | undefined {
  if (!assessment) return undefined;

  const priorHistology = assessment.currentHistology?.pathologyCategory
    ? {
        ...assessment.currentHistology,
        source:
          assessment.currentHistology.source === "current_procedure"
            ? "own_biopsy"
            : assessment.currentHistology.source,
      }
    : assessment.priorHistology
      ? { ...assessment.priorHistology }
      : undefined;

  return {
    ...assessment,
    pathwayStage: "histology_known",
    clinicalSuspicion:
      priorHistology?.pathologyCategory ?? assessment.clinicalSuspicion,
    biopsyType: undefined,
    biopsyPeripheralMarginMm: undefined,
    punchSizeMm: undefined,
    marginTakenMm: undefined,
    marginRecommendation: undefined,
    priorHistology,
    currentHistology: undefined,
  };
}

export function buildSkinCancerFollowUpDiagnosisGroup(
  group: DiagnosisGroup,
): DiagnosisGroup {
  const skinCancerAssessment = buildSkinCancerFollowUpAssessment(
    group.skinCancerAssessment,
  );
  const resolved = skinCancerAssessment
    ? resolveSkinCancerDiagnosis(skinCancerAssessment)
    : null;

  return {
    ...group,
    diagnosis: resolved
      ? {
          snomedCtCode: resolved.snomedCtCode || undefined,
          displayName: resolved.displayName,
        }
      : group.diagnosis,
    diagnosisPicklistId: resolved?.diagnosisPicklistId,
    procedureSuggestionSource: undefined,
    procedures: [],
    isMultiLesion: false,
    lesionInstances: undefined,
    skinCancerAssessment,
  };
}
