/**
 * sharedMediaApi — transport for encrypted shared-case media (2.25.0).
 *
 * Bytes go through the NATIVE file-transfer APIs, never `fetch`: React
 * Native's fetch base64-encodes any binary body/response across the
 * bridge, so a 10 MB ciphertext would become a 13 MB JS string on each
 * side. `expo-file-system/legacy` `uploadAsync` (BINARY_CONTENT) streams a
 * file straight from disk; `File.downloadFileAsync` streams straight to
 * disk. Neither runs through `authFetch`, so each call refreshes the JWT
 * once on 401/403 and retries.
 */

import { File } from "expo-file-system";
import * as LegacyFS from "expo-file-system/legacy";
import { getApiUrl } from "./query-client";
import { getAuthToken, refreshToken } from "./auth";

export type SharedMediaVariant = "thumb" | "image";

export interface UploadedSharedMediaEntry {
  mediaId: string;
  variant: SharedMediaVariant;
  byteSize: number;
  authTag: string | null;
}

function apiUrl(path: string): string {
  return new URL(path, getApiUrl()).href;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function errorFromBody(body: string, status: number, fallback: string): Error {
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed.error) return new Error(parsed.error);
  } catch {
    // Non-JSON body.
  }
  return new Error(`${fallback} (${status})`);
}

function isAuthStatus(status: number): boolean {
  return status === 401 || status === 403;
}

// ── JSON helpers (small payloads — fetch is fine) ────────────────────────────

async function jsonRequest(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<Response> {
  const attempt = async () =>
    fetch(apiUrl(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(await authHeaders()),
        ...(init.headers ?? {}),
      },
    });
  let res = await attempt();
  if (isAuthStatus(res.status) && (await refreshToken())) {
    res = await attempt();
  }
  if (!res.ok) {
    throw errorFromBody(await res.text().catch(() => ""), res.status, fallback);
  }
  return res;
}

/** What the server currently holds for one of the caller's own cases. */
export async function listUploadedSharedMedia(
  caseId: string,
): Promise<UploadedSharedMediaEntry[]> {
  const res = await jsonRequest(
    `/api/share-media/${encodeURIComponent(caseId)}`,
    { method: "GET" },
    "Photo list failed",
  );
  const body = (await res.json()) as { media?: UploadedSharedMediaEntry[] };
  return body.media ?? [];
}

/** Owner removed a photo — drop both variants server-side. */
export async function deleteSharedMedia(
  caseId: string,
  mediaId: string,
): Promise<void> {
  await jsonRequest(
    `/api/share-media/${encodeURIComponent(caseId)}/${encodeURIComponent(mediaId)}`,
    { method: "DELETE" },
    "Photo delete failed",
  );
}

// ── Native upload / download ─────────────────────────────────────────────────

/**
 * Stream one ciphertext variant from the owner's `opus-media` store to the
 * server. Idempotent — the server overwrites in place.
 */
export async function uploadSharedMediaVariant(
  caseId: string,
  mediaId: string,
  variant: SharedMediaVariant,
  fileUri: string,
  authTag?: string,
): Promise<{ byteSize: number }> {
  const url = apiUrl(
    `/api/share-media/${encodeURIComponent(caseId)}/${encodeURIComponent(mediaId)}/${variant}`,
  );
  const attempt = async () =>
    LegacyFS.uploadAsync(url, fileUri, {
      httpMethod: "PUT",
      uploadType: LegacyFS.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        ...(await authHeaders()),
        "Content-Type": "application/octet-stream",
        ...(authTag ? { "X-Opus-Auth-Tag": authTag } : {}),
      },
    });

  let res = await attempt();
  if (isAuthStatus(res.status) && (await refreshToken())) {
    res = await attempt();
  }
  if (res.status < 200 || res.status >= 300) {
    throw errorFromBody(res.body ?? "", res.status, "Photo upload failed");
  }
  try {
    const parsed = JSON.parse(res.body) as { byteSize?: number };
    return { byteSize: parsed.byteSize ?? 0 };
  } catch {
    return { byteSize: 0 };
  }
}

/**
 * Stream one ciphertext variant of a case shared WITH the caller straight
 * to `destination` (a temp file under `Paths.cache`). Keyed by the share
 * row: that is what grants access.
 */
export async function downloadSharedMediaVariant(
  sharedCaseId: string,
  mediaId: string,
  variant: SharedMediaVariant,
  destination: File,
): Promise<File> {
  const url = apiUrl(
    `/api/shared/${encodeURIComponent(sharedCaseId)}/media/${encodeURIComponent(mediaId)}/${variant}`,
  );
  const attempt = async () => {
    await File.downloadFileAsync(url, destination, {
      headers: await authHeaders(),
      idempotent: true,
    });
    return destination;
  };

  try {
    return await attempt();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The native error carries the HTTP status in its message; refresh the
    // token once on an auth failure and retry.
    if (/\b40[13]\b/.test(message) && (await refreshToken())) {
      return attempt();
    }
    throw error;
  }
}
