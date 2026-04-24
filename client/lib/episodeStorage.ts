import AsyncStorage from "@react-native-async-storage/async-storage";
import { TreatmentEpisode, EPISODE_STATUS_TRANSITIONS } from "@/types/episode";
import type { Case } from "@/types/case";
import { encryptData, decryptData } from "./encryption";
import { getCasesByEpisodeId, hashPatientIdentifier } from "./storage";
import { normalizeEpisodeDateOnlyFields } from "./dateFieldNormalization";
import { userScopedAsyncKey } from "./activeUser";
import { parseIsoDateValue } from "./dateValues";

export const EPISODE_BASE_KEYS = {
  INDEX: "@opus_episode_index",
  PREFIX: "@opus_episode_",
} as const;

function episodeIndexKey(): string {
  return userScopedAsyncKey(EPISODE_BASE_KEYS.INDEX);
}
function episodeKey(id: string): string {
  return userScopedAsyncKey(`${EPISODE_BASE_KEYS.PREFIX}${id}`);
}

export interface EpisodeIndexEntry {
  id: string;
  patientIdentifierHash?: string;
  status: string;
  updatedAt: string;
}

// ── Index Operations ────────────────────────────────────────────────────────

async function getEpisodeIndex(): Promise<EpisodeIndexEntry[]> {
  try {
    const encrypted = await AsyncStorage.getItem(episodeIndexKey());
    if (!encrypted) return [];
    const decrypted = await decryptData(encrypted);
    return JSON.parse(decrypted) as EpisodeIndexEntry[];
  } catch (error) {
    console.error("Error reading episode index:", error);
    return [];
  }
}

async function saveEpisodeIndex(index: EpisodeIndexEntry[]): Promise<void> {
  const encrypted = await encryptData(JSON.stringify(index));
  await AsyncStorage.setItem(episodeIndexKey(), encrypted);
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function getEpisode(id: string): Promise<TreatmentEpisode | null> {
  try {
    const encrypted = await AsyncStorage.getItem(episodeKey(id));
    if (!encrypted) return null;
    const decrypted = await decryptData(encrypted);
    return normalizeEpisodeDateOnlyFields(
      JSON.parse(decrypted) as TreatmentEpisode,
    );
  } catch (error) {
    console.error("Error reading episode:", error);
    return null;
  }
}

export async function saveEpisode(episode: TreatmentEpisode): Promise<void> {
  try {
    const now = new Date().toISOString();
    const updatedEpisode = normalizeEpisodeDateOnlyFields({
      ...episode,
      updatedAt: now,
    });

    const encrypted = await encryptData(JSON.stringify(updatedEpisode));
    await AsyncStorage.setItem(episodeKey(episode.id), encrypted);

    const patientIdentifierHash = await hashPatientIdentifier(
      episode.patientIdentifier,
    );

    const index = await getEpisodeIndex();
    const existingIdx = index.findIndex((e) => e.id === episode.id);

    const indexEntry: EpisodeIndexEntry = {
      id: episode.id,
      patientIdentifierHash,
      status: episode.status,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = indexEntry;
    } else {
      index.unshift(indexEntry);
    }

    index.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    await saveEpisodeIndex(index);
  } catch (error) {
    console.error("Error saving episode:", error);
    throw error;
  }
}

/**
 * Atomically allocate the next `episodeSequence` for a case being added to
 * this episode. Returns the sequence number to stamp on the case, updates
 * the episode's `nextCaseSequence` counter, and persists.
 *
 * Uses a tiny module-level mutex so two save flows that call this within
 * the same JS turn serialise: the second await blocks on the first's
 * round-trip to AsyncStorage. Not foolproof against multiple concurrent
 * app processes (which React Native doesn't have) but eliminates the
 * real-world "double save creates duplicate sequence numbers" bug.
 */
const _episodeSequenceLocks = new Map<string, Promise<void>>();

export async function allocateEpisodeSequence(
  episodeId: string,
): Promise<number> {
  const prior = _episodeSequenceLocks.get(episodeId) ?? Promise.resolve();
  let release!: () => void;
  const thisLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  _episodeSequenceLocks.set(
    episodeId,
    prior.then(() => thisLock),
  );

  try {
    await prior;
    const existing = await getEpisode(episodeId);
    if (!existing) {
      return 1;
    }
    const current = existing.nextCaseSequence ?? 0;
    const next = current + 1;
    const updated: TreatmentEpisode = {
      ...existing,
      nextCaseSequence: next,
      updatedAt: new Date().toISOString(),
    };
    await saveEpisode(updated);
    return next;
  } finally {
    release();
    // Clean up map entry when this is the last waiter.
    queueMicrotask(() => {
      if (_episodeSequenceLocks.get(episodeId) === prior.then(() => thisLock)) {
        // No-op — GC handles the resolved chain; the map entry will be
        // replaced by the next allocator call.
      }
    });
  }
}

export async function updateEpisode(
  id: string,
  updates: Partial<TreatmentEpisode>,
): Promise<void> {
  const existing = await getEpisode(id);
  if (!existing) return;

  // Enforce the documented state machine on any status transition. Previously
  // every caller could flip `status` to any value, including illegal
  // transitions like completed → planned. Reject those (no-op) so a miswired
  // caller doesn't silently corrupt the episode lifecycle.
  if (updates.status && updates.status !== existing.status) {
    const allowed = EPISODE_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(updates.status)) {
      console.warn(
        `[episodeStorage] Illegal status transition ${existing.status} → ${updates.status} rejected for episode ${id}`,
      );
      // Drop only the offending field; allow other updates to proceed so
      // unrelated metadata writes aren't blocked by the bad status attempt.
      const { status: _dropped, ...rest } = updates;
      const updated = { ...existing, ...rest };
      await saveEpisode(updated);
      return;
    }
  }

  const updated = { ...existing, ...updates };
  await saveEpisode(updated);
}

export async function deleteEpisode(id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(episodeKey(id));

    const index = await getEpisodeIndex();
    const filtered = index.filter((e) => e.id !== id);
    await saveEpisodeIndex(filtered);
  } catch (error) {
    console.error("Error deleting episode:", error);
    throw error;
  }
}

export async function getEpisodes(): Promise<TreatmentEpisode[]> {
  try {
    const index = await getEpisodeIndex();
    if (index.length === 0) return [];

    const results = await Promise.all(
      index.map((entry) => getEpisode(entry.id)),
    );
    return results.filter((e): e is TreatmentEpisode => e !== null);
  } catch (error) {
    console.error("Error reading episodes:", error);
    return [];
  }
}

export async function getActiveEpisodes(): Promise<TreatmentEpisode[]> {
  try {
    const index = await getEpisodeIndex();
    const activeEntries = index.filter(
      (e) =>
        e.status === "active" ||
        e.status === "on_hold" ||
        e.status === "planned",
    );

    const results = await Promise.all(
      activeEntries.map((entry) => getEpisode(entry.id)),
    );
    return results.filter((e): e is TreatmentEpisode => e !== null);
  } catch (error) {
    console.error("Error reading active episodes:", error);
    return [];
  }
}

export async function findEpisodesByPatientIdentifier(
  patientIdentifier: string,
): Promise<TreatmentEpisode[]> {
  try {
    const index = await getEpisodeIndex();
    const hash = await hashPatientIdentifier(patientIdentifier);
    if (!hash) return [];

    const matching = index.filter((e) => e.patientIdentifierHash === hash);
    const results = await Promise.all(
      matching.map((entry) => getEpisode(entry.id)),
    );
    return results.filter((e): e is TreatmentEpisode => e !== null);
  } catch (error) {
    console.error("Error finding episodes by patient:", error);
    return [];
  }
}

export async function getVisibleDashboardEpisodes(): Promise<
  TreatmentEpisode[]
> {
  try {
    const index = await getEpisodeIndex();
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const visibleEntries = index.filter((e) => {
      if (
        e.status === "active" ||
        e.status === "on_hold" ||
        e.status === "planned"
      )
        return true;
      if (e.status === "cancelled") return false;
      // completed: check 7-day linger (we need full episode for resolvedDate)
      if (e.status === "completed") return true; // filter after decrypt
      return false;
    });

    const results = await Promise.all(
      visibleEntries.map((entry) => getEpisode(entry.id)),
    );

    return results.filter((e): e is TreatmentEpisode => {
      if (!e) return false;
      if (e.status === "completed") {
        if (!e.resolvedDate) return false;
        // `resolvedDate` is a `YYYY-MM-DD` string — parseIsoDateValue gives
        // local noon so a completed-today episode isn't filtered out due to
        // UTC-midnight drifting into the "future".
        const resolvedTime = parseIsoDateValue(e.resolvedDate)?.getTime();
        if (!resolvedTime) return false;
        return now - resolvedTime <= SEVEN_DAYS_MS;
      }
      return true;
    });
  } catch (error) {
    console.error("Error reading visible dashboard episodes:", error);
    return [];
  }
}

export async function getEpisodeWithCases(
  id: string,
): Promise<{ episode: TreatmentEpisode; cases: Case[] } | null> {
  const episode = await getEpisode(id);
  if (!episode) return null;
  const cases = await getCasesByEpisodeId(id);
  return { episode, cases };
}

export async function clearAllEpisodes(): Promise<void> {
  try {
    const index = await getEpisodeIndex();
    const keys = index.map((entry) => episodeKey(entry.id));
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
    await AsyncStorage.removeItem(episodeIndexKey());
  } catch (error) {
    console.error("Error clearing episodes:", error);
    throw error;
  }
}
