/**
 * sharedCaseBadges — per-share EPA state for list surfaces (2.25.0).
 *
 * Extracted from SharedInboxScreen so the dashboard's attention items and
 * the "See all" list derive the same badge from the same inputs.
 */

import type { SharedCaseData, SharedCaseInboxEntry } from "@/types/sharing";
import { getMyAssessment, getRevealedPair } from "./assessmentStorage";
import { deriveEpaFromSharedBlob } from "./epaFromBlob";
import { resolveEpaEntryState } from "./epaGate";

export type SharedCaseEpaState = "due" | "submitted" | "revealed" | null;

/**
 * Pure: given a decrypted blob and the viewer, is an assessment DUE for
 * the viewer on this share (PS-gated pair, nothing committed yet)?
 */
export function isEpaDueFromBlob(
  blob: SharedCaseData,
  viewerUserId: string,
  ownerUserId: string,
): boolean {
  const view = deriveEpaFromSharedBlob({
    blob,
    viewerUserId,
    ownerUserId,
    counterpartUserId: ownerUserId,
  });
  return (
    resolveEpaEntryState({
      view,
      counterpartCommitted: false,
      myCommitted: false,
    }) === "assess" && view.myTarget != null
  );
}

/**
 * Local-only (no network): revealed → "revealed"; own assessment stored →
 * "submitted"; otherwise derive from the CACHED blob. Never-opened cases
 * with no cache get no badge — the push + verification chip cover first
 * touch.
 */
export async function resolveSharedCaseEpaState(
  entry: Pick<SharedCaseInboxEntry, "id" | "ownerUserId">,
  blob: SharedCaseData | null,
  viewerUserId: string | undefined,
): Promise<SharedCaseEpaState> {
  if (await getRevealedPair(entry.id)) return "revealed";
  if (await getMyAssessment(entry.id)) return "submitted";
  if (!blob || !viewerUserId) return null;
  try {
    return isEpaDueFromBlob(blob, viewerUserId, entry.ownerUserId)
      ? "due"
      : null;
  } catch {
    return null;
  }
}
