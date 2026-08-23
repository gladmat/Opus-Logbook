/**
 * epaGate — decides which EPA entry surface a shared case shows the viewer.
 * Shared by SharedCaseDetailScreen (CTA vs exposure note), SharedInboxScreen
 * ("Assessment due" badge) and AssessmentScreen (form vs exposure notice),
 * so the three surfaces can never disagree.
 *
 * Precedence:
 * 1. The viewer already committed → "assess" (never hide committed work).
 * 2. The derived view pairs the viewer → "assess".
 * 3. The counterpart already committed → "assess". Version-skew rescue: an
 *    older app on the other side may still derive a pre-role-gate pair
 *    (e.g. trainee as FA) and commit under it — stranding that commit would
 *    leave them blind until the 72h partial path.
 * 4. The viewer appears only in exposures → "exposure-only".
 * 5. No view at all / legacy blob without ownerParticipant → the old
 *    heuristic CTA ("legacy-fallback").
 * 6. Otherwise nothing ("none").
 */

import type { RecipientEpaView } from "./epaFromBlob";

export type EpaEntryState =
  | "assess"
  | "exposure-only"
  | "legacy-fallback"
  | "none";

export function resolveEpaEntryState(params: {
  view: RecipientEpaView | null;
  counterpartCommitted: boolean;
  myCommitted: boolean;
}): EpaEntryState {
  const { view, counterpartCommitted, myCommitted } = params;
  if (myCommitted) return "assess";
  if (view?.myTarget) return "assess";
  if (counterpartCommitted) return "assess";
  if (view?.myExposure) return "exposure-only";
  if (view == null || view.reason === "no-owner-participant") {
    return "legacy-fallback";
  }
  return "none";
}
