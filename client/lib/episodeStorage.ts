import AsyncStorage from "@react-native-async-storage/async-storage";
import { TreatmentEpisode } from "@/types/episode";
import type { Case } from "@/types/case";
import { encryptData, decryptData } from "./encryption";
import { getCasesByEpisodeId } from "./storage";
import * as Crypto from "expo-crypto";
import { normalizeEpisodeDateOnlyFields } from "./dateFieldNormalization";

const EPISODE_INDEX_KEY = "@opus_episode_index";
const EPISODE_PREFIX = "@opus_episode_";

export interface EpisodeIndexEntry {
  id: string;
  patientIdentifierHash?: string;
  status: string;
  updatedAt: string;
}

async function hashPatientIdentifier(
  patientIdentifier?: string,
): Promise<string | undefined> {
  if (!patientIdentifier) return undefined;
  const normalized = patientIdentifier.toUpperCase().replace(/\s/g, "");
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalized,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

// ── Index Operations ────────────────────────────────────────────────────────

async function getEpisodeIndex(): Promise<EpisodeIndexEntry[]> {
  try {
    const encrypted = await AsyncStorage.getItem(EPISODE_INDEX_KEY);
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
  await AsyncStorage.setItem(EPISODE_INDEX_KEY, encrypted);
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function getEpisode(id: string): Promise<TreatmentEpisode | null> {
  try {
    const encrypted = await AsyncStorage.getItem(`${EPISODE_PREFIX}${id}`);
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
    await AsyncStorage.setItem(`${EPISODE_PREFIX}${episode.id}`, encrypted);

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

export async function updateEpisode(
  id: string,
  updates: Partial<TreatmentEpisode>,
): Promise<void> {
  const existing = await getEpisode(id);
  if (!existing) return;

  const updated = { ...existing, ...updates };
  await saveEpisode(updated);
}

export async function deleteEpisode(id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${EPISODE_PREFIX}${id}`);

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
        const resolvedTime = new Date(e.resolvedDate).getTime();
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
    const keys = index.map((entry) => `${EPISODE_PREFIX}${entry.id}`);
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
    await AsyncStorage.removeItem(EPISODE_INDEX_KEY);
  } catch (error) {
    console.error("Error clearing episodes:", error);
    throw error;
  }
}
