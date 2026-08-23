/**
 * epaFromBlob — recipient-side EPA target derivation from a decrypted
 * SharedCaseData blob (EPA-ARCHITECTURE Phase B, recipient half).
 *
 * EPA targets are derived and stored locally on the case OWNER's device
 * only; a recipient (typically the supervisor on a trainee-logged case)
 * has no access to that store. But derivation is a pure function of data
 * that already travels inside the encrypted blob — operativeTeam,
 * diagnosisGroups (with per-procedure overrides + operative steps), the
 * owner's roles, and (2.22.0+) the owner's identity/careerStage snapshot
 * (`ownerParticipant`). Running the SAME engine over the SAME snapshot on
 * both sides yields identical targets AND exposures with zero new
 * transport.
 *
 * Legacy blobs lack `ownerParticipant`: the owner then has no tier and
 * drops from eligibility — team↔team pairs still derive, and the caller
 * gets `reason: "no-owner-participant"` when nothing else pairs with the
 * viewer.
 */

import {
  deriveEpaAssessments,
  buildEpaUnitsFromDiagnosisGroups,
  type EpaAssessmentTarget,
  type EpaExposureRecord,
} from "./epaDerivation";
import type { SharedCaseData } from "@/types/sharing";

export interface RecipientEpaView {
  /** Every target derivable from the blob (any pair, viewer or not). */
  targets: EpaAssessmentTarget[];
  /** Every exposure record derivable from the blob. */
  exposures: EpaExposureRecord[];
  /** The pair involving the viewer, if any. */
  myTarget: EpaAssessmentTarget | null;
  /** The viewer's side of that pair. */
  myRole: "supervisor" | "trainee" | null;
  /** The viewer's exposure record (assisted under a senior without
   *  operating as PS on ≥1 unit), if any. */
  myExposure: EpaExposureRecord | null;
  reason?:
    | "no-owner-participant"
    | "viewer-not-paired"
    | "viewer-exposure-only"
    | "no-procedures";
}

export function deriveEpaFromSharedBlob(params: {
  blob: SharedCaseData;
  viewerUserId: string;
  /** From the share row / assessment status — NOT inside legacy blobs. */
  ownerUserId: string;
  /** The other party on THIS share row. When given, the viewer's target
   *  is the pair with that user (a case with 2+ counterparts can derive
   *  several pairs involving the viewer). */
  counterpartUserId?: string;
}): RecipientEpaView {
  const { blob, viewerUserId, ownerUserId, counterpartUserId } = params;

  const units = buildEpaUnitsFromDiagnosisGroups(
    blob.diagnosisGroups ?? [],
    blob.operativeRole,
  );
  if (units.length === 0) {
    return {
      targets: [],
      exposures: [],
      myTarget: null,
      myRole: null,
      myExposure: null,
      reason: "no-procedures",
    };
  }

  const { targets, exposures } = deriveEpaAssessments({
    self: {
      linkedUserId: blob.ownerParticipant?.userId ?? ownerUserId,
      careerStage: blob.ownerParticipant?.careerStage,
      displayName: blob.ownerParticipant?.displayName,
    },
    teamMembers: blob.operativeTeam ?? [],
    units,
  });

  const involvesViewer = (t: EpaAssessmentTarget) =>
    t.supervisorLinkedUserId === viewerUserId ||
    t.traineeLinkedUserId === viewerUserId;
  const involvesCounterpart = (t: EpaAssessmentTarget) =>
    counterpartUserId != null &&
    (t.supervisorLinkedUserId === counterpartUserId ||
      t.traineeLinkedUserId === counterpartUserId);

  const myTarget =
    (counterpartUserId
      ? targets.find((t) => involvesViewer(t) && involvesCounterpart(t))
      : undefined) ??
    targets.find(involvesViewer) ??
    null;
  const myRole = myTarget
    ? myTarget.supervisorLinkedUserId === viewerUserId
      ? "supervisor"
      : "trainee"
    : null;

  const myExposure =
    exposures.find((e) => e.participantLinkedUserId === viewerUserId) ?? null;

  let reason: RecipientEpaView["reason"];
  if (!myTarget) {
    if (myExposure) {
      reason = "viewer-exposure-only";
    } else {
      reason = blob.ownerParticipant
        ? "viewer-not-paired"
        : "no-owner-participant";
    }
  }

  return { targets, exposures, myTarget, myRole, myExposure, reason };
}
