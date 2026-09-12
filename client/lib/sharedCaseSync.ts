/**
 * sharedCaseSync — keeps cases shared WITH the current user usable on the
 * dashboard (2.25.0).
 *
 * `hydrateSharedCase` is the decrypt-and-cache routine that used to live
 * inline in SharedCaseDetailScreen: fetch the row, unwrap the case key
 * with this device's X25519 identity, decrypt the blob, cache it
 * (encrypted under K_user, version-stamped) and keep the case key.
 *
 * `syncSharedCases` runs it for every inbox row that has no cache or a
 * stale `blobVersion`, imports the photo thumbnails eagerly, and drops
 * caches + imported media for rows that disappeared server-side.
 *
 * `getSharedCaseSummaries` is the OFFLINE read the dashboard uses on
 * focus: inbox index + caches, no network.
 */

import type { SharedCaseData, SharedCaseInboxEntry } from "@/types/sharing";
import {
  getOrCreateDeviceIdentity,
  unwrapCaseKeyEnvelope,
  decryptPayloadWithCaseKey,
  type CaseKeyEnvelope,
} from "./e2ee";
import { getSharedCaseDetail, getSharedInbox } from "./sharingApi";
import {
  getDecryptedSharedCaseWithVersion,
  getSharedInboxIndex,
  listDecryptedSharedCaseIds,
  removeDecryptedSharedCase,
  saveCaseKey,
  saveDecryptedSharedCase,
  updateSharedInboxIndex,
} from "./sharingStorage";
import {
  buildSharedCaseSummary,
  type SharedCaseSummary,
} from "./sharedCaseSummary";
import {
  deleteImportedSharedMedia,
  importSharedThumbs,
  listLocalSharedThumbIds,
} from "./sharedMediaImport";
import { mapInBatches } from "./uiYield";
import { perfSpan } from "./perfTrace";
import { registerUserCache } from "./userCacheRegistry";

const INBOX_PAGE_SIZE = 100;
const HYDRATE_CONCURRENCY = 3;
const SUMMARISE_BATCH_SIZE = 4;

/**
 * Minimum gap between two focus-driven syncs. The dashboard, Needs
 * Attention and the shared inbox each sync on focus, so a quick
 * detail → back round-trip used to hit `/api/shared/inbox` (+ a hydrate
 * pass) every few seconds. Pull-to-refresh passes `force: true`.
 */
export const SHARED_SYNC_MIN_INTERVAL_MS = 20_000;

let lastSyncCompletedAt = 0;
let syncInFlight: Promise<SyncSharedCasesResult> | null = null;

/** Forget the throttle window (tests + purge registry). */
export function resetSharedCaseSyncThrottle(): void {
  lastSyncCompletedAt = 0;
}

registerUserCache(resetSharedCaseSyncThrottle);

export class SharedCaseHydrationError extends Error {
  readonly reason: "no-envelope" | "decrypt" | "fetch";
  constructor(reason: SharedCaseHydrationError["reason"], message: string) {
    super(message);
    this.name = "SharedCaseHydrationError";
    this.reason = reason;
  }
}

export interface HydratedSharedCase {
  data: SharedCaseData;
  blobVersion: number;
  recipientRole: string;
  verificationStatus: SharedCaseInboxEntry["verificationStatus"];
}

/**
 * Fetch + decrypt one share row and cache the result. Throws
 * `SharedCaseHydrationError` when the row has no envelope for this device
 * (shared before the device registered) or the blob fails to decrypt.
 */
export async function hydrateSharedCase(
  sharedCaseId: string,
): Promise<HydratedSharedCase> {
  let detail: Awaited<ReturnType<typeof getSharedCaseDetail>>;
  try {
    detail = await getSharedCaseDetail(sharedCaseId);
  } catch (error) {
    throw new SharedCaseHydrationError(
      "fetch",
      error instanceof Error ? error.message : String(error),
    );
  }

  const { deviceId } = await getOrCreateDeviceIdentity();
  const envelope = detail.keyEnvelopes.find(
    (e) => e.recipientDeviceId === deviceId,
  );
  if (!envelope) {
    throw new SharedCaseHydrationError(
      "no-envelope",
      "No decryption key found for this device. The case may have been shared before you registered this device.",
    );
  }

  let decrypted: SharedCaseData;
  try {
    const parsedEnvelope: CaseKeyEnvelope = JSON.parse(envelope.envelopeJson);
    const caseKeyHex = await unwrapCaseKeyEnvelope(parsedEnvelope);
    const plaintext = decryptPayloadWithCaseKey(
      detail.encryptedShareableBlob,
      caseKeyHex,
    );
    decrypted = JSON.parse(plaintext) as SharedCaseData;
    await saveCaseKey(sharedCaseId, caseKeyHex);
  } catch (error) {
    throw new SharedCaseHydrationError(
      "decrypt",
      error instanceof Error ? error.message : String(error),
    );
  }

  await saveDecryptedSharedCase(sharedCaseId, decrypted, detail.blobVersion);

  return {
    data: decrypted,
    blobVersion: detail.blobVersion,
    recipientRole: detail.recipientRole,
    verificationStatus:
      detail.verificationStatus as SharedCaseInboxEntry["verificationStatus"],
  };
}

async function fetchWholeInbox(): Promise<SharedCaseInboxEntry[]> {
  const all: SharedCaseInboxEntry[] = [];
  let offset = 0;
  for (;;) {
    const page = await getSharedInbox({ limit: INBOX_PAGE_SIZE, offset });
    all.push(...page);
    if (page.length < INBOX_PAGE_SIZE) break;
    offset += page.length;
  }
  return all;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next++]!;
        await worker(item);
      }
    }),
  );
}

/**
 * @param knownBlob  pass the blob when the caller already holds it
 *                   (`undefined` = look it up; `null` = known to be absent)
 *                   so a sync never decrypts the same share twice.
 */
async function summariseEntry(
  entry: SharedCaseInboxEntry,
  knownBlob?: SharedCaseData | null,
): Promise<SharedCaseSummary> {
  const blob =
    knownBlob !== undefined
      ? knownBlob
      : ((await getDecryptedSharedCaseWithVersion(entry.id))?.data ?? null);
  const localThumbs = await listLocalSharedThumbIds(blob?.media);
  return buildSharedCaseSummary(entry, blob, localThumbs);
}

/** Offline read: what the dashboard shows on focus. */
export async function getSharedCaseSummaries(): Promise<SharedCaseSummary[]> {
  const index = await getSharedInboxIndex();
  if (index.length === 0) return [];
  return perfSpan("shared.getSharedCaseSummaries", () =>
    mapInBatches(index, SUMMARISE_BATCH_SIZE, (entry) => summariseEntry(entry)),
  );
}

export interface SyncSharedCasesResult {
  summaries: SharedCaseSummary[];
  hydrated: number;
  thumbsImported: number;
  removed: number;
  errors: { sharedCaseId: string; message: string }[];
  /** True when the throttle served the offline summaries instead of syncing. */
  skipped?: boolean;
}

export interface SyncSharedCasesOptions {
  /** Bypass the focus throttle (pull-to-refresh). */
  force?: boolean;
  /** Injectable clock (tests). */
  now?: number;
}

/**
 * Online reconcile: refresh the inbox index, hydrate missing / stale
 * caches, import thumbnails, drop what is gone. Never throws for a single
 * row — per-row problems land in `errors`. Throws only when the inbox
 * itself cannot be fetched (offline) so callers can fall back to
 * `getSharedCaseSummaries`.
 */
export function syncSharedCases(
  options: SyncSharedCasesOptions = {},
): Promise<SyncSharedCasesResult> {
  const now = options.now ?? Date.now();
  if (syncInFlight) return syncInFlight;
  if (
    !options.force &&
    lastSyncCompletedAt > 0 &&
    now - lastSyncCompletedAt < SHARED_SYNC_MIN_INTERVAL_MS
  ) {
    return getSharedCaseSummaries().then((summaries) => ({
      summaries,
      hydrated: 0,
      thumbsImported: 0,
      removed: 0,
      errors: [],
      skipped: true,
    }));
  }
  const request = perfSpan("shared.syncSharedCases", runSyncSharedCases)
    .then((result) => {
      lastSyncCompletedAt = options.now ?? Date.now();
      return result;
    })
    .finally(() => {
      if (syncInFlight === request) syncInFlight = null;
    });
  syncInFlight = request;
  return request;
}

async function runSyncSharedCases(): Promise<SyncSharedCasesResult> {
  const result: SyncSharedCasesResult = {
    summaries: [],
    hydrated: 0,
    thumbsImported: 0,
    removed: 0,
    errors: [],
  };

  // Snapshot what the inbox held BEFORE this sync so revoked rows can be
  // told apart from owner-seeded caches (cases the viewer shared OUT are
  // cached too, but never appear in the inbox).
  const previousInbox = new Set((await getSharedInboxIndex()).map((e) => e.id));

  const entries = await fetchWholeInbox();
  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  await updateSharedInboxIndex(entries);

  // Rows that vanished server-side (revoked) — drop cache + imported media.
  const liveIds = new Set(entries.map((e) => e.id));
  const previouslyKnown = await listDecryptedSharedCaseIds();
  for (const id of previouslyKnown) {
    if (liveIds.has(id) || !previousInbox.has(id)) continue;
    const cached = await getDecryptedSharedCaseWithVersion(id);
    await deleteImportedSharedMedia(cached?.data.media).catch(() => {});
    await removeDecryptedSharedCase(id);
    result.removed += 1;
  }

  // Blobs decrypted (or read from cache) during hydration, reused by the
  // summarise pass below so nothing is decrypted twice per sync.
  const blobsById = new Map<string, SharedCaseData | null>();

  await runWithConcurrency(entries, HYDRATE_CONCURRENCY, async (entry) => {
    try {
      const cached = await getDecryptedSharedCaseWithVersion(entry.id);
      const stale =
        !cached ||
        cached.blobVersion == null ||
        cached.blobVersion < entry.blobVersion;
      let blob = cached?.data ?? null;
      if (stale) {
        const hydrated = await hydrateSharedCase(entry.id);
        blob = hydrated.data;
        result.hydrated += 1;
      }
      blobsById.set(entry.id, blob);
      if (blob?.media?.length) {
        const thumbs = await importSharedThumbs(entry.id, blob.media);
        result.thumbsImported += thumbs.imported;
        for (const f of thumbs.failed) {
          result.errors.push({
            sharedCaseId: entry.id,
            message: `thumb ${f.mediaId}: ${f.message}`,
          });
        }
      }
    } catch (error) {
      result.errors.push({
        sharedCaseId: entry.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  result.summaries = await mapInBatches(
    entries,
    SUMMARISE_BATCH_SIZE,
    (entry) => summariseEntry(entry, blobsById.get(entry.id)),
  );
  return result;
}
