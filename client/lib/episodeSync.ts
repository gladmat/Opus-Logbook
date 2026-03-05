/**
 * Episode sync — pushes/pulls encrypted TreatmentEpisode records
 * between AsyncStorage and the server.
 *
 * Episodes are encrypted client-side before being sent to the server.
 * The server stores only encrypted blobs + a plaintext status + patient hash
 * for filtering.
 */

import { getApiUrl } from "./query-client";
import { getAuthToken } from "./auth";
import { TreatmentEpisode } from "@/types/episode";
import {
  getEpisodes,
  saveEpisode,
  getEpisode as getLocalEpisode,
} from "./episodeStorage";
import { encryptData, decryptData } from "./encryption";
import * as Crypto from "expo-crypto";

// ── Auth-aware fetch ───────────────────────────────────────────────────────

async function authedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = getApiUrl();
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  return fetch(new URL(path, baseUrl).href, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
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

// ── Push ────────────────────────────────────────────────────────────────────

/** Push a single episode to the server (upsert). */
export async function pushEpisodeToServer(
  episode: TreatmentEpisode,
): Promise<void> {
  const encryptedData = await encryptData(JSON.stringify(episode));
  const patientIdentifierHash = await hashPatientIdentifier(
    episode.patientIdentifier,
  );

  const body = {
    id: episode.id,
    encryptedData,
    patientIdentifierHash,
    status: episode.status,
  };

  // Try PUT first (update); if 404, create with POST
  const putRes = await authedFetch(`/api/episodes/${episode.id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (putRes.status === 404) {
    const postRes = await authedFetch("/api/episodes", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!postRes.ok) {
      const text = await postRes.text();
      throw new Error(`Failed to create episode on server: ${postRes.status} ${text}`);
    }
  } else if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`Failed to update episode on server: ${putRes.status} ${text}`);
  }
}

/** Push all local episodes to the server. */
export async function pushAllEpisodesToServer(): Promise<void> {
  const episodes = await getEpisodes();
  for (const episode of episodes) {
    await pushEpisodeToServer(episode);
  }
}

// ── Pull ────────────────────────────────────────────────────────────────────

interface ServerEpisodeRow {
  id: string;
  userId: string;
  encryptedData: string;
  patientIdentifierHash: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Pull all episodes from the server and merge into local storage. */
export async function pullEpisodesFromServer(): Promise<TreatmentEpisode[]> {
  const res = await authedFetch("/api/episodes");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch episodes from server: ${res.status} ${text}`);
  }

  const rows: ServerEpisodeRow[] = await res.json();
  const pulled: TreatmentEpisode[] = [];

  for (const row of rows) {
    try {
      const decrypted = await decryptData(row.encryptedData);
      const episode = JSON.parse(decrypted) as TreatmentEpisode;
      pulled.push(episode);
    } catch (error) {
      console.error(`Failed to decrypt episode ${row.id}:`, error);
    }
  }

  return pulled;
}

// ── Full Sync ───────────────────────────────────────────────────────────────

/**
 * Two-way sync: push local episodes to server, then pull server episodes
 * and merge into local storage. Server wins on conflict (by updatedAt).
 */
export async function syncEpisodes(): Promise<void> {
  // 1. Push all local episodes
  await pushAllEpisodesToServer();

  // 2. Pull remote episodes
  const remoteEpisodes = await pullEpisodesFromServer();

  // 3. Merge — server wins on conflict (newer updatedAt)
  for (const remote of remoteEpisodes) {
    const local = await getLocalEpisode(remote.id);
    if (!local || remote.updatedAt > local.updatedAt) {
      await saveEpisode(remote);
    }
  }
}
