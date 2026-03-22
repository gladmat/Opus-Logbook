import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { encryptData, decryptData } from "./encryption";
import type { SharedCaseInboxEntry, SharedCaseData } from "@/types/sharing";

// ── Storage keys ─────────────────────────────────────────────────────────────

const INBOX_INDEX_KEY = "@opus_shared_inbox_index";
const sharedCaseKey = (id: string) => `@opus_shared_case_${id}`;
const caseKeyName = (id: string) => `opus_case_key_${id}`;

// ── SecureStore helpers (matching e2ee.ts pattern) ───────────────────────────

async function getSecret(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

// ── Inbox index (metadata only, no PHI) ──────────────────────────────────────

export async function getSharedInboxIndex(): Promise<SharedCaseInboxEntry[]> {
  const raw = await AsyncStorage.getItem(INBOX_INDEX_KEY);
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
  await AsyncStorage.setItem(INBOX_INDEX_KEY, JSON.stringify(entries));
}

// ── Shared case data (encrypted with K_user) ────────────────────────────────

export async function saveDecryptedSharedCase(
  id: string,
  data: SharedCaseData,
): Promise<void> {
  const plaintext = JSON.stringify(data);
  const encrypted = await encryptData(plaintext);
  await AsyncStorage.setItem(sharedCaseKey(id), encrypted);
}

export async function getDecryptedSharedCase(
  id: string,
): Promise<SharedCaseData | null> {
  const encrypted = await AsyncStorage.getItem(sharedCaseKey(id));
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
  await setSecret(caseKeyName(id), caseKeyHex);
}

export async function getCaseKey(id: string): Promise<string | null> {
  return getSecret(caseKeyName(id));
}
