/**
 * pendingEpa — pure helpers for the owner-side "pending assessments" surfaces
 * (AssessmentHistoryScreen's Pending section, the dashboard pending row, and
 * the Statistics → Training entry link).
 *
 * Pending = derived EPA targets whose counterpart's share row has no revealed
 * pair yet. Revealed pairs are keyed by sharedCaseId, targets by local caseId
 * — the share outbox joins the two id spaces per counterpart. A target whose
 * counterpart has NO share row at all stays pending (the case hasn't reached
 * them yet; the repair action is re-saving the case). Offline callers pass an
 * empty outbox, so nothing drains that round — the next online load
 * reconciles.
 */

import type { EpaTargetsWithCase } from "@/lib/assessmentStorage";

/** Minimal structural slice of a share-outbox row this module needs. */
export interface PendingEpaOutboxRow {
  id: string;
  caseId: string;
  recipientUserId?: string;
}

/** The counterpart's linkedUserId for a target, seen from the owner side. */
export function epaTargetCounterpartUserId(target: {
  supervisorContactId: string;
  supervisorLinkedUserId: string;
  traineeLinkedUserId: string;
}): string {
  return target.supervisorContactId === "self"
    ? target.traineeLinkedUserId
    : target.supervisorLinkedUserId;
}

export function filterPendingEpaTargets(params: {
  targetsByCase: EpaTargetsWithCase[];
  outbox: PendingEpaOutboxRow[];
  revealedSharedCaseIds: Set<string>;
}): EpaTargetsWithCase[] {
  const { targetsByCase, outbox, revealedSharedCaseIds } = params;
  return targetsByCase
    .map((entry) => ({
      ...entry,
      targets: entry.targets.filter((t) => {
        const counterpartUserId = epaTargetCounterpartUserId(t);
        return !outbox.some(
          (s) =>
            s.caseId === entry.caseId &&
            s.recipientUserId === counterpartUserId &&
            revealedSharedCaseIds.has(s.id),
        );
      }),
    }))
    .filter((entry) => entry.targets.length > 0);
}

export function countPendingEpaTargets(entries: EpaTargetsWithCase[]): number {
  return entries.reduce((sum, entry) => sum + entry.targets.length, 0);
}
