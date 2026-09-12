/**
 * Pure helpers behind AssessmentScreen's reveal polling.
 *
 * The screen polls the server while the viewer has committed an assessment
 * and is waiting for the counterpart. Every poll returns a FRESH status
 * object, so an effect that depends on the object identity re-runs after its
 * own `setStatus` — an unbounded network + decrypt + re-render loop that
 * saturates the JS thread (the 2026-09-12 "back button dead on the EPA
 * screen" report). These helpers reduce a status to primitives so the effect
 * can depend on VALUES, and so an unchanged server state can be dropped
 * before it reaches React state at all.
 */

export interface PollableAssessmentSide {
  id: string;
  revealedAt: string | null;
  committedAt?: string | null;
  hasContent?: boolean;
}

export interface PollableStatus {
  myAssessment: PollableAssessmentSide | null;
  otherAssessment: PollableAssessmentSide | null;
}

/** Poll only while the viewer has committed and their side is not yet revealed. */
export function shouldPollForReveal(status: PollableStatus | null): boolean {
  if (!status?.myAssessment) return false;
  return status.myAssessment.revealedAt == null;
}

function sideKey(side: PollableAssessmentSide | null): string {
  if (!side) return "";
  return [
    side.id,
    side.revealedAt ?? "",
    side.committedAt ?? "",
    side.hasContent ? "1" : "0",
  ].join(",");
}

/**
 * Primitive fingerprint of the poll-relevant fields. Two fetches of the same
 * server state produce the SAME string, so it is safe as a hook dependency
 * and as a "did anything change?" check before `setStatus`.
 */
export function assessmentPollKey(status: PollableStatus | null): string {
  if (!status) return "";
  return `${sideKey(status.myAssessment)}|${sideKey(status.otherAssessment)}`;
}

/** Both parties revealed → the reveal screen can take over. */
export function isBothRevealed(status: PollableStatus | null): boolean {
  return (
    status?.myAssessment?.revealedAt != null &&
    status.otherAssessment?.revealedAt != null
  );
}
