/**
 * Lazy v1 → v2 media migration.
 *
 * When a v1 `encrypted-media:{uuid}` is accessed, transparently re-encrypts
 * to the v2 file-based AES-256-GCM format. V1 AsyncStorage blob is NOT
 * deleted immediately — deferred to explicit cleanup.
 *
 * Migration is tracked via a Set persisted in AsyncStorage.
 * Concurrent migrations of the same ID are coalesced via an in-flight map.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { decryptData, getMasterKeyBytes } from "./encryption";
import { saveMediaV2, OPUS_MEDIA_PREFIX } from "./mediaFileStorage";
import { base64ToBytes } from "./binaryUtils";

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const MEDIA_KEY_PREFIX = "@surgical_logbook_media_";
const THUMB_KEY_PREFIX = "@surgical_logbook_thumb_";
const MIGRATED_SET_KEY = "@opus_media_migrated";

// ═══════════════════════════════════════════════════════════
// Migration tracking
// ═══════════════════════════════════════════════════════════

let migratedSet: Set<string> | null = null;

async function loadMigratedSet(): Promise<Set<string>> {
  if (migratedSet) return migratedSet;
  try {
    const raw = await AsyncStorage.getItem(MIGRATED_SET_KEY);
    migratedSet = raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    migratedSet = new Set();
  }
  return migratedSet;
}

async function markMigrated(v1Id: string): Promise<void> {
  const set = await loadMigratedSet();
  set.add(v1Id);
  await AsyncStorage.setItem(MIGRATED_SET_KEY, JSON.stringify([...set]));
}

// ═══════════════════════════════════════════════════════════
// Concurrency guard — coalesce concurrent migrations of same ID
// ═══════════════════════════════════════════════════════════

const inFlight = new Map<string, Promise<string | null>>();

// ═══════════════════════════════════════════════════════════
// Single-item migration
// ═══════════════════════════════════════════════════════════

/**
 * Attempt to migrate a v1 media item to v2.
 *
 * Returns the v2 `opus-media:{uuid}` URI on success, or null on failure.
 * If already migrated, returns the v2 URI immediately.
 * Concurrent calls for the same ID are coalesced into a single migration.
 */
export function migrateV1ToV2(v1Id: string): Promise<string | null> {
  // Coalesce concurrent migrations of the same ID
  const existing = inFlight.get(v1Id);
  if (existing) return existing;

  const promise = doMigrate(v1Id).finally(() => {
    inFlight.delete(v1Id);
  });
  inFlight.set(v1Id, promise);
  return promise;
}

async function doMigrate(v1Id: string): Promise<string | null> {
  // Already migrated?
  const set = await loadMigratedSet();
  if (set.has(v1Id)) {
    return `${OPUS_MEDIA_PREFIX}${v1Id}`;
  }

  try {
    // 1. Load and decrypt v1 blob
    const encrypted = await AsyncStorage.getItem(`${MEDIA_KEY_PREFIX}${v1Id}`);
    if (!encrypted) return null;

    const decrypted = await decryptData(encrypted);
    let mimeType = "image/jpeg";
    let base64Data: string;

    try {
      const parsed = JSON.parse(decrypted);
      mimeType = parsed.m || "image/jpeg";
      base64Data = parsed.d;
    } catch {
      base64Data = decrypted;
    }

    // 2. Decode base64 → bytes
    const imageBytes = base64ToBytes(base64Data);

    // 3. Load v1 thumbnail if available
    let thumbBytes: Uint8Array | null = null;
    const thumbBase64 = await AsyncStorage.getItem(
      `${THUMB_KEY_PREFIX}${v1Id}`,
    );
    if (thumbBase64) {
      thumbBytes = base64ToBytes(thumbBase64);
    }

    // 4. Re-encrypt via v2 pipeline (reuse same UUID)
    const masterKey = await getMasterKeyBytes();
    // Width/height unknown from v1 — store 0 (metadata-only, won't affect display)
    saveMediaV2(imageBytes, thumbBytes, mimeType, masterKey, 0, 0, v1Id);

    // 5. Mark migrated
    await markMigrated(v1Id);

    return `${OPUS_MEDIA_PREFIX}${v1Id}`;
  } catch (e) {
    console.error("v1→v2 migration failed for", v1Id, e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════

/**
 * Remove AsyncStorage blobs for all successfully migrated v1 items.
 * Returns the number of items cleaned up.
 */
export async function cleanupMigratedV1Data(): Promise<number> {
  const set = await loadMigratedSet();
  if (set.size === 0) return 0;

  const ids = [...set];
  const keys = ids.flatMap((id) => [
    `${MEDIA_KEY_PREFIX}${id}`,
    `${THUMB_KEY_PREFIX}${id}`,
  ]);

  await AsyncStorage.multiRemove(keys);

  // Reset the in-memory cache so it's reloaded fresh on next access
  migratedSet = null;

  return ids.length;
}
