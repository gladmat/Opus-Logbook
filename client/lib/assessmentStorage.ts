import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptData, decryptData } from "./encryption";
import { userScopedAsyncKey } from "./activeUser";
import type {
  SupervisorAssessment,
  TraineeAssessment,
  RevealedAssessmentPair,
} from "@/types/sharing";
import type { EpaAssessmentTarget } from "./epaDerivation";

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
}

export async function getMyAssessment(
  sharedCaseId: string,
): Promise<SupervisorAssessment | TraineeAssessment | null> {
  const encrypted = await AsyncStorage.getItem(myAssessmentKey(sharedCaseId));
  if (!encrypted) return null;
  try {
    const plaintext = await decryptData(encrypted);
    return JSON.parse(plaintext) as SupervisorAssessment | TraineeAssessment;
  } catch {
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
  const encrypted = await AsyncStorage.getItem(revealedPairKey(sharedCaseId));
  if (!encrypted) return null;
  try {
    const plaintext = await decryptData(encrypted);
    return JSON.parse(plaintext) as RevealedAssessmentPair;
  } catch {
    return null;
  }
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

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const pair = await getRevealedPair(id);
      if (!pair) return null;
      return { ...pair, sharedCaseId: id };
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<RevealedPairWithContext | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((v): v is RevealedPairWithContext => v != null);
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

/**
 * Save derived EPA assessment targets for a case (encrypted with K_user,
 * like every other blob in this module — targets carry display names and
 * linked user IDs). An empty list REMOVES the stored key so stale targets
 * from a previous derivation don't linger after an edit-save that drops
 * the team. Maintains the case-id index for getAllEpaTargets.
 */
export async function saveEpaTargets(
  caseId: string,
  targets: EpaAssessmentTarget[],
): Promise<void> {
  if (targets.length === 0) {
    await AsyncStorage.removeItem(epaTargetsKey(caseId));
    await updateEpaTargetsIndex(caseId, false);
    return;
  }
  const encrypted = await encryptData(JSON.stringify(targets));
  await AsyncStorage.setItem(epaTargetsKey(caseId), encrypted);
  await updateEpaTargetsIndex(caseId, true);
}

/** Remove stored EPA targets for a case. Best-effort. */
export async function clearEpaTargets(caseId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(epaTargetsKey(caseId));
    await updateEpaTargetsIndex(caseId, false);
  } catch {
    // Best-effort.
  }
}

/**
 * Load EPA assessment targets for a case. Only version-2 records are
 * returned: v1 records (pre-rewrite, per-procedure cartesian pairs) and
 * legacy plaintext both drop and regenerate on the next save.
 */
export async function getEpaTargets(
  caseId: string,
): Promise<EpaAssessmentTarget[]> {
  const raw = await AsyncStorage.getItem(epaTargetsKey(caseId));
  if (!raw) return [];
  try {
    const plaintext = await decryptData(raw);
    const parsed = JSON.parse(plaintext) as EpaAssessmentTarget[];
    if (!Array.isArray(parsed) || parsed.some((t) => t.version !== 2)) {
      void clearEpaTargets(caseId);
      return [];
    }
    return parsed;
  } catch {
    void clearEpaTargets(caseId);
    return [];
  }
}

/** Targets for a case, with the caseId attached. */
export interface EpaTargetsWithCase {
  caseId: string;
  targets: EpaAssessmentTarget[];
}

/** Batch-load every stored EPA target set (pending-assessments surfaces). */
export async function getAllEpaTargets(): Promise<EpaTargetsWithCase[]> {
  const ids = await getEpaTargetCaseIds();
  if (ids.length === 0) return [];
  const results = await Promise.allSettled(
    ids.map(async (caseId) => {
      const targets = await getEpaTargets(caseId);
      return targets.length > 0 ? { caseId, targets } : null;
    }),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<EpaTargetsWithCase | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((v): v is EpaTargetsWithCase => v != null);
}
