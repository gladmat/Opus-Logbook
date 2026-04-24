/**
 * One-time migration of unscoped (pre-user-scoping) storage keys
 * to user-scoped keys. Idempotent — safe to call on every login.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSecureItem, setSecureItem } from "./secureStorage";
import { STORAGE_BASE_KEYS } from "./storage";
import { EPISODE_BASE_KEYS } from "./episodeStorage";
import { SHARING_BASE_KEYS } from "./sharingStorage";
import { ENCRYPTION_KEY_ALIAS } from "./encryption";
import { HMAC_KEY_STORE_KEY } from "./patientIdentifierHmac";
import { APP_LOCK_KEY_NAMES } from "./appLockStorage";
import { INBOX_MMKV_KEY_ALIAS } from "./inboxStorage";

const MIGRATION_FLAG_PREFIX = "@opus_storage_scoped_";

function scopedAsync(base: string, userId: string): string {
  return `${base}::${userId}`;
}

function scopedSecure(base: string, userId: string): string {
  return `${base}_${userId.replace(/-/g, "")}`;
}

async function migrateAsyncKey(oldKey: string, userId: string): Promise<void> {
  const newKey = scopedAsync(oldKey, userId);
  const existing = await AsyncStorage.getItem(newKey);
  if (existing !== null) return; // already migrated

  const old = await AsyncStorage.getItem(oldKey);
  if (old !== null) {
    await AsyncStorage.setItem(newKey, old);
  }
}

async function migrateSecureKey(oldKey: string, userId: string): Promise<void> {
  const newKey = scopedSecure(oldKey, userId);
  const existing = await getSecureItem(newKey);
  if (existing !== null) return;

  const old = await getSecureItem(oldKey);
  if (old !== null) {
    await setSecureItem(newKey, old);
  }
}

/**
 * Migrate unscoped storage to user-scoped keys.
 *
 * Called on every login — returns immediately if already done
 * for this userId (checked via a flag in AsyncStorage).
 */
export async function migrateUnscopedStorage(userId: string): Promise<void> {
  const flagKey = `${MIGRATION_FLAG_PREFIX}${userId}`;
  const alreadyDone = await AsyncStorage.getItem(flagKey);
  if (alreadyDone === "1") return;

  try {
    // ── AsyncStorage keys ──────────────────────────────────────────────────

    // Case data
    await migrateAsyncKey(STORAGE_BASE_KEYS.CASE_INDEX, userId);
    await migrateAsyncKey(STORAGE_BASE_KEYS.TIMELINE, userId);
    await migrateAsyncKey(STORAGE_BASE_KEYS.USER, userId);
    await migrateAsyncKey(STORAGE_BASE_KEYS.SETTINGS, userId);
    await migrateAsyncKey(STORAGE_BASE_KEYS.CASE_SUMMARIES, userId);

    // Migrate individual case blobs (enumerate from old index)
    const oldIndexRaw = await AsyncStorage.getItem(
      STORAGE_BASE_KEYS.CASE_INDEX,
    );
    if (oldIndexRaw) {
      try {
        const oldIndex = JSON.parse(oldIndexRaw) as { id: string }[];
        for (const entry of oldIndex) {
          const oldCaseKey = `${STORAGE_BASE_KEYS.CASE_PREFIX}${entry.id}`;
          await migrateAsyncKey(oldCaseKey, userId);
        }
      } catch {
        // Index parse failure — skip case blob migration
      }
    }

    // Drafts — scan by prefix
    const allKeys = await AsyncStorage.getAllKeys();
    const draftKeys = allKeys.filter(
      (key) =>
        key.startsWith(STORAGE_BASE_KEYS.CASE_DRAFT_PREFIX) &&
        !key.includes("::"),
    );
    for (const key of draftKeys) {
      await migrateAsyncKey(key, userId);
    }

    // Episode data
    await migrateAsyncKey(EPISODE_BASE_KEYS.INDEX, userId);
    const oldEpisodeIndexRaw = await AsyncStorage.getItem(
      EPISODE_BASE_KEYS.INDEX,
    );
    if (oldEpisodeIndexRaw) {
      try {
        const oldEpisodeIndex = JSON.parse(oldEpisodeIndexRaw) as {
          id: string;
        }[];
        for (const entry of oldEpisodeIndex) {
          const oldEpisodeKey = `${EPISODE_BASE_KEYS.PREFIX}${entry.id}`;
          await migrateAsyncKey(oldEpisodeKey, userId);
        }
      } catch {
        // skip
      }
    }

    // Sharing data
    await migrateAsyncKey(SHARING_BASE_KEYS.INBOX_INDEX, userId);
    // Shared case blobs
    const sharedKeys = allKeys.filter(
      (key) =>
        key.startsWith(SHARING_BASE_KEYS.CASE_PREFIX) && !key.includes("::"),
    );
    for (const key of sharedKeys) {
      await migrateAsyncKey(key, userId);
    }

    // Profile cache
    await migrateAsyncKey("@auth_profile_cache_v1", userId);

    // Favourites & recents
    await migrateAsyncKey("@surgical_logbook_favourites", userId);
    await migrateAsyncKey("@surgical_logbook_recents", userId);
    await migrateAsyncKey("@opus_recent_products", userId);
    await migrateAsyncKey("@opus_smart_import_always_delete", userId);

    // ── SecureStore keys ───────────────────────────────────────────────────

    await migrateSecureKey(ENCRYPTION_KEY_ALIAS, userId);
    await migrateSecureKey(HMAC_KEY_STORE_KEY, userId);

    // App lock keys
    for (const keyName of Object.values(APP_LOCK_KEY_NAMES)) {
      await migrateSecureKey(keyName, userId);
    }

    // Inbox MMKV encryption key
    await migrateSecureKey(INBOX_MMKV_KEY_ALIAS, userId);

    // ── Set flag ───────────────────────────────────────────────────────────

    await AsyncStorage.setItem(flagKey, "1");
  } catch (error) {
    console.warn("[storageMigration] Migration failed (will retry):", error);
    // Don't set flag — migration will be retried on next login
  }
}
