import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptData, decryptData } from "./encryption";
import { userScopedAsyncKey } from "./activeUser";
import type {
  SupervisorAssessment,
  TraineeAssessment,
  RevealedAssessmentPair,
} from "@/types/sharing";
import type { EpaAssessmentTarget, EpaExposureRecord } from "./epaDerivation";
import { migrateLegacyEpaTargets } from "./epaTargetMigration";
import { inferViewerRoleFromOwnAssessment } from "./revealedPair";
import { mapInBatches } from "./uiYield";
import { registerUserCache } from "./userCacheRegistry";
import { perfSpan } from "./perfTrace";
import {
  splitEpaRecords,
  type EpaExposuresWithCase,
  type EpaTargetsRecordWithCase,
  type EpaTargetsWithCase,
} from "./epaRecords";

// ── In-memory caches (per user, dropped by storage.clearUserCaches) ──────────
//
// Every read below used to be an AsyncStorage round-trip + a pure-JS AEAD
// decrypt. The dashboard, Statistics and the CaseDetail EPA card each read
// the SAME records on every focus, so misses and hits are both cached here
// (null sentinels included — a share with no local assessment is the common
// dashboard case). Writers update the cache in place; the registry clearer
// drops everything on logout / lock / background.

const BATCH_SIZE = 4;

const myAssessmentCache = new Map<
  string,
  SupervisorAssessment | TraineeAssessment | null
>();
const revealedPairCache = new Map<string, RevealedAssessmentPair | null>();
const epaRecordCache = new Map<string, EpaTargetsRecord>();

/**
 * Monotonic token bumped on EVERY write in this module. Focus loaders keep
 * the value they last loaded against and skip work when it is unchanged.
 */
let epaStorageRevision = 0;

export function getEpaStorageRevision(): number {
  return epaStorageRevision;
}

function bumpRevision(): void {
  epaStorageRevision += 1;
}

/** Drop every in-memory cache in this module (tests + purge registry). */
export function clearAssessmentStorageCaches(): void {
  myAssessmentCache.clear();
  revealedPairCache.clear();
  epaRecordCache.clear();
  bumpRevision();
}

registerUserCache(clearAssessmentStorageCaches);

// ── Storage keys (user-scoped at runtime) ────────────────────────────────────

const ASSESSMENT_KEYS = {
  MINE_PREFIX: "@opus_assessment_mine_",
  REVEALED_PREFIX: "@opus_assessment_revealed_",
  REVEALED_INDEX: "@opus_assessment_revealed_index",
  EPA_TARGETS_PREFIX: "@opus_epa_targets_",
  EPA_TARGETS_INDEX: "@opus_epa_targets_index",
  PENDING_COMMIT_PREFIX: "@opus_assessment_pending_",
} as const;

function myAssessmentKey(sharedCaseId: string): string {
  return userScopedAsyncKey(`${ASSESSMENT_KEYS.MINE_PREFIX}${sharedCaseId}`);
}
function revealedPairKey(sharedCaseId: string): string {
  return userScopedAsyncKey(
    `${ASSESSMENT_KEYS.REVEALED_PREFIX}${sharedCaseId}`,
  );
}
function revealedIndexKey(): string {
  return userScopedAsyncKey(ASSESSMENT_KEYS.REVEALED_INDEX);
}

// ── Own assessment (encrypted with K_user) ───────────────────────────────────

export async function saveMyAssessment(
  sharedCaseId: string,
  assessment: SupervisorAssessment | TraineeAssessment,
): Promise<void> {
  const plaintext = JSON.stringify(assessment);
  const encrypted = await encryptData(plaintext);
  await AsyncStorage.setItem(myAssessmentKey(sharedCaseId), encrypted);
  myAssessmentCache.set(sharedCaseId, assessment);
  bumpRevision();
}

export async function getMyAssessment(
  sharedCaseId: string,
): Promise<SupervisorAssessment | TraineeAssessment | null> {
  const cached = myAssessmentCache.get(sharedCaseId);
  if (cached !== undefined) return cached;
  const encrypted = await AsyncStorage.getItem(myAssessmentKey(sharedCaseId));
  if (!encrypted) {
    myAssessmentCache.set(sharedCaseId, null);
    return null;
  }
  try {
    const plaintext = await decryptData(encrypted);
    const parsed = JSON.parse(plaintext) as
      | SupervisorAssessment
      | TraineeAssessment;
    myAssessmentCache.set(sharedCaseId, parsed);
    return parsed;
  } catch {
    myAssessmentCache.set(sharedCaseId, null);
    return null;
  }
}

// ── Pending commit-reveal state (encrypted with K_user) ─────────────────────

/**
 * Everything needed to perform the reveal upload later: the EXACT JSON
 * string the commitment was computed over, the nonce, and the server-side
 * assessment row id. Persisted at commit time so the reveal survives app
 * restarts and can fire from any surface (screen focus, push tap).
 */
export interface PendingCommit {
  sharedCaseId: string;
  assessmentId: string;
  assessorRole: "supervisor" | "trainee";
  shareableJson: string;
  nonceHex: string;
  commitment: string;
}

function pendingCommitKey(sharedCaseId: string): string {
  return userScopedAsyncKey(
    `${ASSESSMENT_KEYS.PENDING_COMMIT_PREFIX}${sharedCaseId}`,
  );
}

export async function savePendingCommit(pending: PendingCommit): Promise<void> {
  const encrypted = await encryptData(JSON.stringify(pending));
  await AsyncStorage.setItem(pendingCommitKey(pending.sharedCaseId), encrypted);
  bumpRevision();
}

export async function getPendingCommit(
  sharedCaseId: string,
): Promise<PendingCommit | null> {
  const encrypted = await AsyncStorage.getItem(pendingCommitKey(sharedCaseId));
  if (!encrypted) return null;
  try {
    return JSON.parse(await decryptData(encrypted)) as PendingCommit;
  } catch {
    return null;
  }
}

export async function clearPendingCommit(sharedCaseId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(pendingCommitKey(sharedCaseId));
    bumpRevision();
  } catch {
    // Best-effort.
  }
}

// ── Revealed pair (encrypted with K_user) ────────────────────────────────────

export async function saveRevealedPair(
  sharedCaseId: string,
  pair: RevealedAssessmentPair,
): Promise<void> {
  const plaintext = JSON.stringify(pair);
  const encrypted = await encryptData(plaintext);
  await AsyncStorage.setItem(revealedPairKey(sharedCaseId), encrypted);
  revealedPairCache.set(sharedCaseId, pair);
  bumpRevision();

  // Update revealed index
  const index = await getAllRevealedPairIds();
  if (!index.includes(sharedCaseId)) {
    index.push(sharedCaseId);
    await AsyncStorage.setItem(revealedIndexKey(), JSON.stringify(index));
  }
}

export async function getRevealedPair(
  sharedCaseId: string,
): Promise<RevealedAssessmentPair | null> {
  const cached = revealedPairCache.get(sharedCaseId);
  if (cached !== undefined) return cached;
  const encrypted = await AsyncStorage.getItem(revealedPairKey(sharedCaseId));
  if (!encrypted) {
    revealedPairCache.set(sharedCaseId, null);
    return null;
  }
  try {
    const plaintext = await decryptData(encrypted);
    const parsed = JSON.parse(plaintext) as RevealedAssessmentPair;
    revealedPairCache.set(sharedCaseId, parsed);
    return parsed;
  } catch {
    revealedPairCache.set(sharedCaseId, null);
    return null;
  }
}

/**
 * 2.25.0: pairs written before `viewerRole` existed are upgraded on read
 * from the locally stored own assessment (see
 * `inferViewerRoleFromOwnAssessment`) and written back once. Pairs with no
 * local own record stay role-less — the analytics layer keeps them out of
 * both role-specific views rather than guessing.
 */
export async function backfillViewerRole(
  sharedCaseId: string,
  pair: RevealedAssessmentPair,
): Promise<RevealedAssessmentPair> {
  if (pair.viewerRole) return pair;
  const own = await getMyAssessment(sharedCaseId);
  const inferred = inferViewerRoleFromOwnAssessment(own);
  if (!inferred) return pair;
  const upgraded: RevealedAssessmentPair = { ...pair, viewerRole: inferred };
  try {
    await saveRevealedPair(sharedCaseId, upgraded);
  } catch {
    // Best-effort persistence — the in-memory upgrade still applies.
  }
  return upgraded;
}

// ── Revealed index (for Phase 5 analytics) ───────────────────────────────────

export async function getAllRevealedPairIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(revealedIndexKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

// ── Batch load all revealed pairs (Phase 5 analytics entrypoint) ────────────

/** A revealed pair with its storage key attached for analytics grouping. */
export interface RevealedPairWithContext extends RevealedAssessmentPair {
  sharedCaseId: string;
}

/**
 * Decrypt and return all revealed assessment pairs.
 * Filters out any pairs that fail decryption.
 */
export async function getAllRevealedPairs(): Promise<
  RevealedPairWithContext[]
> {
  const ids = await getAllRevealedPairIds();
  if (ids.length === 0) return [];

  return perfSpan("epa.getAllRevealedPairs", async () => {
    const results = await mapInBatches(
      ids,
      BATCH_SIZE,
      async (id): Promise<RevealedPairWithContext | null> => {
        try {
          const pair = await getRevealedPair(id);
          if (!pair) return null;
          const upgraded = await backfillViewerRole(id, pair);
          return { ...upgraded, sharedCaseId: id };
        } catch {
          return null;
        }
      },
    );
    return results.filter((v): v is RevealedPairWithContext => v != null);
  });
}

// ── EPA targets (derived per-case after save) ─────────────────────────────────

function epaTargetsKey(caseId: string): string {
  return userScopedAsyncKey(`${ASSESSMENT_KEYS.EPA_TARGETS_PREFIX}${caseId}`);
}
function epaTargetsIndexKey(): string {
  return userScopedAsyncKey(ASSESSMENT_KEYS.EPA_TARGETS_INDEX);
}

/** CaseIds with stored EPA targets (no PHI — mirrors REVEALED_INDEX). */
export async function getEpaTargetCaseIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(epaTargetsIndexKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function updateEpaTargetsIndex(
  caseId: string,
  present: boolean,
): Promise<void> {
  const ids = await getEpaTargetCaseIds();
  const has = ids.includes(caseId);
  if (present && !has) {
    ids.push(caseId);
    await AsyncStorage.setItem(epaTargetsIndexKey(), JSON.stringify(ids));
  } else if (!present && has) {
    await AsyncStorage.setItem(
      epaTargetsIndexKey(),
      JSON.stringify(ids.filter((id) => id !== caseId)),
    );
  }
}

/** v3 on-disk envelope: targets + exposures under ONE key. */
interface EpaTargetsEnvelopeV3 {
  v: 3;
  targets: EpaAssessmentTarget[];
  exposures: EpaExposureRecord[];
}

/** What a stored record resolves to after migrate-on-read. */
export interface EpaTargetsRecord {
  targets: EpaAssessmentTarget[];
  exposures: EpaExposureRecord[];
}

/**
 * Save derived EPA assessment targets + exposure records for a case
 * (encrypted with K_user, like every other blob in this module — both
 * carry display names and linked user IDs). Empty targets AND exposures
 * REMOVE the stored key so stale records from a previous derivation don't
 * linger after an edit-save that drops the team. Maintains the case-id
 * index for getAllEpaTargets / getAllEpaExposures.
 */
export async function saveEpaTargets(
  caseId: string,
  targets: EpaAssessmentTarget[],
  exposures: EpaExposureRecord[] = [],
): Promise<void> {
  if (targets.length === 0 && exposures.length === 0) {
    await AsyncStorage.removeItem(epaTargetsKey(caseId));
    await updateEpaTargetsIndex(caseId, false);
    epaRecordCache.delete(caseId);
    bumpRevision();
    return;
  }
  const envelope: EpaTargetsEnvelopeV3 = { v: 3, targets, exposures };
  const encrypted = await encryptData(JSON.stringify(envelope));
  await AsyncStorage.setItem(epaTargetsKey(caseId), encrypted);
  await updateEpaTargetsIndex(caseId, true);
  epaRecordCache.set(caseId, { targets, exposures });
  bumpRevision();
}

/** Remove stored EPA targets + exposures for a case. Best-effort. */
export async function clearEpaTargets(caseId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(epaTargetsKey(caseId));
    await updateEpaTargetsIndex(caseId, false);
    epaRecordCache.delete(caseId);
    bumpRevision();
  } catch {
    // Best-effort.
  }
}

/**
 * Load the stored EPA record for a case.
 * - v3 envelope → returned as-is.
 * - Legacy bare array (v2 targets, pre role-gate) → migrated on read:
 *   units filtered to PS-trainee units, empty targets dropped, stamped
 *   v3, and written back so the next read is cheap. A record that
 *   collapses to nothing is cleared. (Migrate-on-read keeps old cases'
 *   CaseDetail cards populated without a re-save.)
 * - v1 / plaintext / undecryptable → cleared; regenerates on next save.
 */
export async function getEpaTargetsRecord(
  caseId: string,
): Promise<EpaTargetsRecord> {
  const cached = epaRecordCache.get(caseId);
  if (cached) return cached;
  const record = await readEpaTargetsRecord(caseId);
  epaRecordCache.set(caseId, record);
  return record;
}

async function readEpaTargetsRecord(caseId: string): Promise<EpaTargetsRecord> {
  const raw = await AsyncStorage.getItem(epaTargetsKey(caseId));
  if (!raw) return { targets: [], exposures: [] };
  try {
    const plaintext = await decryptData(raw);
    const parsed: unknown = JSON.parse(plaintext);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      (parsed as { v?: unknown }).v === 3
    ) {
      const env = parsed as EpaTargetsEnvelopeV3;
      return {
        targets: Array.isArray(env.targets) ? env.targets : [],
        exposures: Array.isArray(env.exposures) ? env.exposures : [],
      };
    }
    const migrated = migrateLegacyEpaTargets(parsed);
    if (migrated.changed) {
      // Best-effort write-back; a concurrent save overwrites with a fresh
      // derivation anyway.
      void saveEpaTargets(caseId, migrated.targets, []).catch(() => {});
    }
    return { targets: migrated.targets, exposures: [] };
  } catch {
    void clearEpaTargets(caseId);
    return { targets: [], exposures: [] };
  }
}

/** Load EPA assessment targets for a case (see getEpaTargetsRecord). */
export async function getEpaTargets(
  caseId: string,
): Promise<EpaAssessmentTarget[]> {
  return (await getEpaTargetsRecord(caseId)).targets;
}

/** Load EPA exposure records for a case (see getEpaTargetsRecord). */
export async function getEpaExposures(
  caseId: string,
): Promise<EpaExposureRecord[]> {
  return (await getEpaTargetsRecord(caseId)).exposures;
}

export type { EpaExposuresWithCase, EpaTargetsWithCase };

/**
 * Batch-load every stored EPA record — ONE decrypt per case (cached after
 * the first focus). `getAllEpaTargets` / `getAllEpaExposures` are pure
 * projections over this; call it directly when you need both.
 */
export async function getAllEpaTargetRecords(): Promise<
  EpaTargetsRecordWithCase[]
> {
  const ids = await getEpaTargetCaseIds();
  if (ids.length === 0) return [];
  return perfSpan("epa.getAllEpaTargetRecords", async () => {
    const records = await mapInBatches(
      ids,
      BATCH_SIZE,
      async (caseId): Promise<EpaTargetsRecordWithCase | null> => {
        try {
          const record = await getEpaTargetsRecord(caseId);
          if (record.targets.length === 0 && record.exposures.length === 0) {
            return null;
          }
          return { caseId, ...record };
        } catch {
          return null;
        }
      },
    );
    return records.filter((r): r is EpaTargetsRecordWithCase => r != null);
  });
}

/** Batch-load every stored EPA target set (pending-assessments surfaces). */
export async function getAllEpaTargets(): Promise<EpaTargetsWithCase[]> {
  return splitEpaRecords(await getAllEpaTargetRecords()).targetsByCase;
}

/** Batch-load every stored EPA exposure set (Training-tab exposure count). */
export async function getAllEpaExposures(): Promise<EpaExposuresWithCase[]> {
  return splitEpaRecords(await getAllEpaTargetRecords()).exposuresByCase;
}
