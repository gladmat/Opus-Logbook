/**
 * Refetch policy for the CaseDetail EPA assessments card.
 *
 * The card used to hit the network (outbox + one status call per target)
 * on EVERY CaseDetail focus. A return from the Assessment / Reveal screens
 * always writes to assessmentStorage first (revision bump), so "did the
 * revision move?" is the reliable signal that the card's rows are stale;
 * everything else within the TTL is served from the last fetch.
 */

export const EPA_CARD_REFRESH_TTL_MS = 15_000;

export interface EpaCardRefreshInput {
  lastFetchedAt: number | null;
  now: number;
  lastRevision: number | null;
  revision: number;
  ttlMs?: number;
}

export function shouldRefetchEpaCard({
  lastFetchedAt,
  now,
  lastRevision,
  revision,
  ttlMs = EPA_CARD_REFRESH_TTL_MS,
}: EpaCardRefreshInput): boolean {
  if (lastFetchedAt === null || lastRevision === null) return true;
  if (revision !== lastRevision) return true;
  return now - lastFetchedAt >= ttlMs;
}
