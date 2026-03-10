/**
 * Lazy v1 -> v2 media migration.
 *
 * Migration never trusts only the persisted migrated-set. The actual source of
 * truth is whether the v2 filesystem payload exists and has valid metadata.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Directory, Paths } from "expo-file-system";

import { decryptData, getMasterKeyBytes } from "./encryption";
import { saveMediaV2, hasMediaV2, OPUS_MEDIA_PREFIX } from "./mediaFileStorage";
import { base64ToBytes } from "./binaryUtils";

const MEDIA_KEY_PREFIX = "@surgical_logbook_media_";
const THUMB_KEY_PREFIX = "@surgical_logbook_thumb_";
const MIGRATED_SET_KEY = "@opus_media_migrated";
const MIGRATION_TMP_DIR = "opus-media-migration";

let migratedSet: Set<string> | null = null;
const inFlight = new Map<string, Promise<string | null>>();

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

async function persistMigratedSet(set: Set<string>): Promise<void> {
  if (set.size === 0) {
    await AsyncStorage.removeItem(MIGRATED_SET_KEY);
    return;
  }

  await AsyncStorage.setItem(MIGRATED_SET_KEY, JSON.stringify([...set]));
}

async function markMigrated(v1Id: string): Promise<void> {
  const set = await loadMigratedSet();
  set.add(v1Id);
  await persistMigratedSet(set);
}

export async function forgetMigratedMedia(v1Id: string): Promise<void> {
  const set = await loadMigratedSet();
  if (!set.delete(v1Id)) return;
  await persistMigratedSet(set);
}

function getMigrationTmpDir(): Directory {
  return new Directory(Paths.cache, MIGRATION_TMP_DIR);
}

function writeTempBytes(
  mediaId: string,
  variant: "image" | "thumb",
  bytes: Uint8Array,
): File {
  const dir = getMigrationTmpDir();
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true });
  }

  const file = new File(dir, `${variant}_${mediaId}.tmp`);
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  file.write(bytes);
  return file;
}

export async function hasLegacyMedia(v1Id: string): Promise<boolean> {
  const encrypted = await AsyncStorage.getItem(`${MEDIA_KEY_PREFIX}${v1Id}`);
  return typeof encrypted === "string" && encrypted.length > 0;
}

export function migrateV1ToV2(v1Id: string): Promise<string | null> {
  const existing = inFlight.get(v1Id);
  if (existing) return existing;

  const promise = doMigrate(v1Id).finally(() => {
    inFlight.delete(v1Id);
  });
  inFlight.set(v1Id, promise);
  return promise;
}

async function doMigrate(v1Id: string): Promise<string | null> {
  if (await hasMediaV2(v1Id)) {
    await markMigrated(v1Id);
    return `${OPUS_MEDIA_PREFIX}${v1Id}`;
  }

  const set = await loadMigratedSet();
  if (set.has(v1Id)) {
    await forgetMigratedMedia(v1Id);
  }

  try {
    const encrypted = await AsyncStorage.getItem(`${MEDIA_KEY_PREFIX}${v1Id}`);
    if (!encrypted) return null;

    const decrypted = await decryptData(encrypted);
    let mimeType = "image/jpeg";
    let imageBytes: Uint8Array;

    try {
      const parsed = JSON.parse(decrypted);
      mimeType = parsed.m || "image/jpeg";
      imageBytes = base64ToBytes(parsed.d);
    } catch {
      imageBytes = base64ToBytes(decrypted);
    }

    const imageFile = writeTempBytes(v1Id, "image", imageBytes);

    let thumbFile: File | null = null;
    const thumbBase64 = await AsyncStorage.getItem(
      `${THUMB_KEY_PREFIX}${v1Id}`,
    );
    if (thumbBase64) {
      thumbFile = writeTempBytes(v1Id, "thumb", base64ToBytes(thumbBase64));
    }

    try {
      const masterKey = await getMasterKeyBytes();
      await saveMediaV2(
        imageFile.uri,
        thumbFile?.uri ?? null,
        mimeType,
        masterKey,
        0,
        0,
        v1Id,
      );
    } finally {
      if (imageFile.exists) imageFile.delete();
      if (thumbFile?.exists) thumbFile.delete();
    }

    await markMigrated(v1Id);
    return `${OPUS_MEDIA_PREFIX}${v1Id}`;
  } catch (error) {
    console.error("v1->v2 migration failed for", v1Id, error);
    return null;
  }
}

export async function cleanupMigratedV1Data(): Promise<number> {
  const set = await loadMigratedSet();
  if (set.size === 0) return 0;

  const ids = [...set];
  const removableIds: string[] = [];
  for (const id of ids) {
    if (await hasMediaV2(id)) {
      removableIds.push(id);
    }
  }

  if (removableIds.length === 0) return 0;

  const keys = removableIds.flatMap((id) => [
    `${MEDIA_KEY_PREFIX}${id}`,
    `${THUMB_KEY_PREFIX}${id}`,
  ]);

  await AsyncStorage.multiRemove(keys);
  for (const id of removableIds) {
    set.delete(id);
  }
  await persistMigratedSet(set);
  migratedSet = set;

  return removableIds.length;
}
