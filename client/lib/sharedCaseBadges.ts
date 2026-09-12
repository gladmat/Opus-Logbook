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
import { getDecryptedSharedCase } from "./sharingStorage";
import type { SharedCaseSummary } from "./sharedCaseSummary";
import { mapInBatches } from "./uiYield";

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

const RESOLVE_BATCH_SIZE = 4;

/**
 * Resolve the EPA badge state for a whole list of shared summaries. One
 * place for the dashboard and the Needs Attention list (both used to
 * carry an identical inline fan-out). Blob + assessment lookups hit the
 * in-memory caches after the first focus; never throws per share.
 */
export async function resolveSharedEpaStates(
  summaries: readonly SharedCaseSummary[],
  viewerUserId: string | undefined,
): Promise<Map<string, SharedCaseEpaState>> {
  const states = new Map<string, SharedCaseEpaState>();
  if (summaries.length === 0) return states;
  const resolved = await mapInBatches(
    summaries,
    RESOLVE_BATCH_SIZE,
    async (summary): Promise<[string, SharedCaseEpaState]> => {
      try {
        const blob = await getDecryptedSharedCase(summary.id);
        const state = await resolveSharedCaseEpaState(
          { id: summary.id, ownerUserId: summary.shared.ownerUserId },
          blob,
          viewerUserId,
        );
        return [summary.id, state];
      } catch {
        return [summary.id, null];
      }
    },
  );
  for (const [id, state] of resolved) states.set(id, state);
  return states;
}
