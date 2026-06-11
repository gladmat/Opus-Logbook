/**
 * Reveal-upload driver for commit-reveal assessments.
 *
 * After both parties have committed, each side must upload its E2EE
 * ciphertext (phase 2). This helper is idempotent and safe to fire from any
 * surface — AssessmentScreen focus, SharedCaseDetail status polls, push-tap
 * routing — it no-ops unless a pending commit exists and the server gate is
 * open.
 */

import { getAssessmentStatus, revealAssessment } from "./assessmentApi";
import { getPendingCommit, clearPendingCommit } from "./assessmentStorage";
import { buildRevealPayload } from "./assessmentCommitment";
import {
  generateCaseKeyHex,
  encryptPayloadWithCaseKey,
  wrapCaseKeyForRecipient,
} from "./e2ee";
import { verifyAndPinRecipientKeys } from "./keyPinningStore";

export type RevealUploadOutcome =
  | "none" // no pending commit for this case
  | "waiting" // uploaded earlier or gate not open yet — counterpart pending
  | "revealed" // both sides uploaded; assessments are mutually revealed
  | "key-mismatch"; // TOFU pin mismatch on counterpart keys — upload refused

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

export async function uploadPendingReveal(
  sharedCaseId: string,
  myUserId: string,
): Promise<RevealUploadOutcome> {
  const pending = await getPendingCommit(sharedCaseId);
  if (!pending) return "none";

  const status = await getAssessmentStatus(sharedCaseId);
  if (!status.myAssessment) return "none";

  // Already uploaded (e.g. from another surface) — just report state.
  if (status.myAssessment.hasContent) {
    await clearPendingCommit(sharedCaseId);
    return status.myAssessment.revealedAt ? "revealed" : "waiting";
  }

  // Gate mirror of the server: counterpart committed, or own commit >72h old.
  const otherEngaged = !!status.otherAssessment;
  const committedAtMs = status.myAssessment.committedAt
    ? new Date(status.myAssessment.committedAt).getTime()
    : Date.now();
  if (!otherEngaged && Date.now() - committedAtMs < SEVENTY_TWO_HOURS_MS) {
    return "waiting";
  }

  const otherUserId =
    myUserId === status.ownerUserId
      ? status.recipientUserId
      : status.ownerUserId;

  // TOFU-verify the counterpart's device keys before wrapping the
  // assessment key to them — same pinning rule as case sharing. (The
  // legacy instant-submit path predates pinning; this path closes that.)
  const verification = await verifyAndPinRecipientKeys(
    otherUserId,
    status.otherPartyPublicKeys,
  );
  if (verification.kind === "mismatch") {
    return "key-mismatch";
  }

  const assessmentKeyHex = await generateCaseKeyHex();
  const encryptedAssessment = await encryptPayloadWithCaseKey(
    buildRevealPayload(pending.shareableJson, pending.nonceHex),
    assessmentKeyHex,
  );
  const keyEnvelopes = await Promise.all(
    verification.keys.map(async (pk) => {
      const envelope = await wrapCaseKeyForRecipient(
        assessmentKeyHex,
        pk.publicKey,
      );
      return {
        recipientUserId: otherUserId,
        recipientDeviceId: pk.deviceId,
        envelopeJson: JSON.stringify(envelope),
      };
    }),
  );

  const result = await revealAssessment(pending.assessmentId, {
    encryptedAssessment,
    keyEnvelopes,
  });
  await clearPendingCommit(sharedCaseId);
  return result.revealed ? "revealed" : "waiting";
}
