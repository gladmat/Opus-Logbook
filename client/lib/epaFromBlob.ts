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
 * both sides yields identical targets with zero new transport.
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
} from "./epaDerivation";
import type { SharedCaseData } from "@/types/sharing";

export interface RecipientEpaView {
  /** Every target derivable from the blob (any pair, viewer or not). */
  targets: EpaAssessmentTarget[];
  /** The pair involving the viewer, if any. */
  myTarget: EpaAssessmentTarget | null;
  /** The viewer's side of that pair. */
  myRole: "supervisor" | "trainee" | null;
  reason?: "no-owner-participant" | "viewer-not-paired" | "no-procedures";
}

export function deriveEpaFromSharedBlob(params: {
  blob: SharedCaseData;
  viewerUserId: string;
  /** From the share row / assessment status — NOT inside legacy blobs. */
  ownerUserId: string;
}): RecipientEpaView {
  const { blob, viewerUserId, ownerUserId } = params;

  const units = buildEpaUnitsFromDiagnosisGroups(
    blob.diagnosisGroups ?? [],
    blob.operativeRole,
  );
  if (units.length === 0) {
    return {
      targets: [],
      myTarget: null,
      myRole: null,
      reason: "no-procedures",
    };
  }

  const { targets } = deriveEpaAssessments({
    self: {
      linkedUserId: blob.ownerParticipant?.userId ?? ownerUserId,
      careerStage: blob.ownerParticipant?.careerStage,
      displayName: blob.ownerParticipant?.displayName,
    },
    teamMembers: blob.operativeTeam ?? [],
    units,
  });

  const myTarget =
    targets.find(
      (t) =>
        t.supervisorLinkedUserId === viewerUserId ||
        t.traineeLinkedUserId === viewerUserId,
    ) ?? null;
  const myRole = myTarget
    ? myTarget.supervisorLinkedUserId === viewerUserId
      ? "supervisor"
      : "trainee"
    : null;

  let reason: RecipientEpaView["reason"];
  if (!myTarget) {
    reason = blob.ownerParticipant
      ? "viewer-not-paired"
      : "no-owner-participant";
  }

  return { targets, myTarget, myRole, reason };
}
