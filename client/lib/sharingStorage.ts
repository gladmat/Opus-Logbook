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

export async function saveDecryptedSharedCase(
  id: string,
  data: SharedCaseData,
): Promise<void> {
  const plaintext = JSON.stringify(data);
  const encrypted = await encryptData(plaintext);
  await AsyncStorage.setItem(sharedCaseDataKey(id), encrypted);
}

export async function getDecryptedSharedCase(
  id: string,
): Promise<SharedCaseData | null> {
  const encrypted = await AsyncStorage.getItem(sharedCaseDataKey(id));
  if (!encrypted) return null;
  try {
    const plaintext = await decryptData(encrypted);
    return JSON.parse(plaintext) as SharedCaseData;
  } catch {
    return null;
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
