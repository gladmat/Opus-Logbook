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
  return userScopedAsyncKey(
    `${ASSESSMENT_KEYS.EPA_TARGETS_PREFIX}${caseId}`,
  );
}

/** Save derived EPA assessment targets for a case. */
export async function saveEpaTargets(
  caseId: string,
  targets: EpaAssessmentTarget[],
): Promise<void> {
  await AsyncStorage.setItem(epaTargetsKey(caseId), JSON.stringify(targets));
}

/** Load EPA assessment targets for a case. */
export async function getEpaTargets(
  caseId: string,
): Promise<EpaAssessmentTarget[]> {
  const raw = await AsyncStorage.getItem(epaTargetsKey(caseId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as EpaAssessmentTarget[];
  } catch {
    return [];
  }
}
