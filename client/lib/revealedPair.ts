/**
 * revealedPair — the ONE place a RevealedAssessmentPair is assembled from
 * the two committed payloads (EPA-ARCHITECTURE Phase C).
 *
 * - `partial` is set explicitly when only one side responded (72h timeout)
 *   — the missing side is still zero-filled so the existing `> 0` display
 *   checks keep working, but analytics can now exclude the pair instead of
 *   ingesting a fake 0 rating.
 * - Procedure attribution comes from the committed content (first PS unit
 *   of the derived target, carried inside BOTH payloads), falling back to
 *   the caller's guess only for legacy payloads.
 * - The trainee's `teachingNarrative` is finally carried through so the
 *   supervisor sees it (it was collected but dropped at reveal before).
 */

import type {
  AssessmentProcedureRef,
  AssessorRole,
  EntrustmentLevel,
  RevealedAssessmentPair,
  SupervisorAssessment,
  TeachingQualityLevel,
  TraineeAssessment,
} from "@/types/sharing";
import { isTraineeAssessmentV2 } from "@/types/sharing";

export function buildRevealedPair(params: {
  supervisor: SupervisorAssessment | null;
  trainee: TraineeAssessment | null;
  revealedAt: string;
  /** Used only when neither payload carries attribution (legacy). */
  fallbackProcedure: AssessmentProcedureRef;
  /** Which side the LOCAL user is on — persisted so the reveal screen and
   *  analytics can address the viewer without a network round-trip. */
  viewerRole: AssessorRole;
}): RevealedAssessmentPair {
  const { supervisor, trainee, revealedAt, fallbackProcedure, viewerRole } =
    params;
  const partial = !supervisor || !trainee;
  const procedure =
    supervisor?.procedure ??
    (trainee && isTraineeAssessmentV2(trainee)
      ? trainee.procedure
      : undefined) ??
    fallbackProcedure;

  const pair: RevealedAssessmentPair = {
    supervisorEntrustment:
      supervisor?.entrustmentRating ?? (0 as EntrustmentLevel),
    traineeSelfEntrustment:
      trainee?.selfEntrustmentRating ?? (0 as EntrustmentLevel),
    teachingQuality:
      trainee?.teachingQualityRating ?? (0 as TeachingQualityLevel),
    revealedAt,
    procedureCode: procedure.procedureSnomedCode,
    procedureDisplayName: procedure.procedureDisplayName,
    partial,
    instrumentVersion: trainee ? (isTraineeAssessmentV2(trainee) ? 2 : 1) : 1,
    viewerRole,
  };
  if (supervisor?.narrativeFeedback) {
    pair.supervisorNarrative = supervisor.narrativeFeedback;
  }
  if (supervisor?.caseComplexity) {
    pair.caseComplexity = supervisor.caseComplexity;
  }
  if (trainee?.teachingNarrative) {
    pair.teachingNarrative = trainee.teachingNarrative;
  }
  if (trainee && isTraineeAssessmentV2(trainee)) {
    pair.autonomyMatch = trainee.autonomyMatch;
    pair.bid = trainee.bid;
  }
  const traineeRole =
    supervisor?.traineeOperativeRole ??
    (trainee && isTraineeAssessmentV2(trainee)
      ? trainee.traineeOperativeRole
      : undefined);
  if (traineeRole) pair.traineeOperativeRole = traineeRole;
  return pair;
}

/**
 * True when both sides responded. Legacy records (no `partial` flag) are
 * full unless a side was zero-filled by the old partial-reveal path.
 */
export function isFullRevealedPair(pair: RevealedAssessmentPair): boolean {
  if (pair.partial === true) return false;
  if (pair.partial === false) return true;
  return pair.supervisorEntrustment > 0 && pair.traineeSelfEntrustment > 0;
}

/**
 * Backfill for pairs written before `viewerRole` existed: the locally
 * stored OWN assessment tells us which form the viewer filled in. A
 * supervisor payload carries `entrustmentRating`; a trainee payload carries
 * `selfEntrustmentRating`. Null when there is no local record (e.g. the
 * pair was cached on a device that never authored the assessment).
 */
export function inferViewerRoleFromOwnAssessment(
  own: SupervisorAssessment | TraineeAssessment | null | undefined,
): AssessorRole | null {
  if (!own || typeof own !== "object") return null;
  if ("entrustmentRating" in own) return "supervisor";
  if ("selfEntrustmentRating" in own) return "trainee";
  return null;
}
