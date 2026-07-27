import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptData, decryptData } from "./encryption";
import type { SharedCaseInboxEntry, SharedCaseData } from "@/types/sharing";
import { userScopedAsyncKey, userScopedSecureKey } from "./activeUser";
import { getSecureItem, setSecureItem } from "./secureStorage";

// ── Storage keys (user-scoped at runtime) ────────────────────────────────────

export const SHARING_BASE_KEYS = {
  INBOX_INDEX: "@opus_shared_inbox_index",
  CASE_PREFIX: "@opus_shared_case_",
  CASE_KEY_PREFIX: "opus_case_key_",
} as const;

function sharedInboxIndexKey(): string {
  return userScopedAsyncKey(SHARING_BASE_KEYS.INBOX_INDEX);
}
function sharedCaseDataKey(id: string): string {
  return userScopedAsyncKey(`${SHARING_BASE_KEYS.CASE_PREFIX}${id}`);
}
function sharedCaseKeyName(id: string): string {
  return userScopedSecureKey(`${SHARING_BASE_KEYS.CASE_KEY_PREFIX}${id}`);
}

// ── Inbox index (metadata only, no PHI) ──────────────────────────────────────

export async function getSharedInboxIndex(): Promise<SharedCaseInboxEntry[]> {
  const raw = await AsyncStorage.getItem(sharedInboxIndexKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SharedCaseInboxEntry[];
  } catch {
    return [];
  }
}

export async function updateSharedInboxIndex(
  entries: SharedCaseInboxEntry[],
): Promise<void> {
  await AsyncStorage.setItem(sharedInboxIndexKey(), JSON.stringify(entries));
}

// ── Shared case data (encrypted with K_user) ────────────────────────────────

// Cache records are stored as { __blobVersion, data } so a share row updated
// in place (same id, bumped blobVersion) invalidates the cached decrypt.
// Legacy records are the bare SharedCaseData object — read as version null
// (treated as stale whenever the server reports a version, forcing one
// refetch that upgrades the record).
interface VersionedSharedCaseRecord {
  __blobVersion: number;
  data: SharedCaseData;
}

function isVersionedRecord(
  parsed: unknown,
): parsed is VersionedSharedCaseRecord {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    "__blobVersion" in parsed &&
    "data" in parsed
  );
}

export async function saveDecryptedSharedCase(
  id: string,
  data: SharedCaseData,
  blobVersion?: number,
): Promise<void> {
  const record: VersionedSharedCaseRecord | SharedCaseData =
    blobVersion != null ? { __blobVersion: blobVersion, data } : data;
  const plaintext = JSON.stringify(record);
  const encrypted = await encryptData(plaintext);
  await AsyncStorage.setItem(sharedCaseDataKey(id), encrypted);
}

export async function getDecryptedSharedCaseWithVersion(id: string): Promise<{
  data: SharedCaseData;
  blobVersion: number | null;
} | null> {
  const encrypted = await AsyncStorage.getItem(sharedCaseDataKey(id));
  if (!encrypted) return null;
  try {
    const plaintext = await decryptData(encrypted);
    const parsed = JSON.parse(plaintext) as unknown;
    if (isVersionedRecord(parsed)) {
      return { data: parsed.data, blobVersion: parsed.__blobVersion };
    }
    return { data: parsed as SharedCaseData, blobVersion: null };
  } catch {
    return null;
  }
}

export async function getDecryptedSharedCase(
  id: string,
): Promise<SharedCaseData | null> {
  const record = await getDecryptedSharedCaseWithVersion(id);
  return record?.data ?? null;
}

/** Drop a cached decrypted blob (revoked/stale share rows). Best-effort. */
export async function removeDecryptedSharedCase(id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(sharedCaseDataKey(id));
  } catch {
    // Best-effort.
  }
}

// ── Case keys (SecureStore) ──────────────────────────────────────────────────

export async function saveCaseKey(
  id: string,
  caseKeyHex: string,
): Promise<void> {
  await setSecureItem(sharedCaseKeyName(id), caseKeyHex);
}

export async function getCaseKey(id: string): Promise<string | null> {
  return getSecureItem(sharedCaseKeyName(id));
}
