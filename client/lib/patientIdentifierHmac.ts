/**
 * Per-user HMAC-SHA256 hashing for patient identifiers.
 *
 * Replaces bare SHA-256 which is vulnerable to rainbow table attacks
 * on the NHI keyspace (~175M values). Per-user HMAC key stored in
 * iOS Keychain via expo-secure-store — never transmitted anywhere.
 */

import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  bytesToHex,
  hexToBytes,
  randomBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";
import { userScopedSecureKey, onActiveUserChange } from "./activeUser";
import { getSecureItem, setSecureItem } from "./secureStorage";

export const HMAC_KEY_STORE_KEY = "opus_patient_hmac_key";
const HMAC_HASH_PREFIX = "hmac:";

let _cachedHmacKey: Uint8Array | null = null;

// Clear cached key on user switch
onActiveUserChange(() => {
  if (_cachedHmacKey) {
    _cachedHmacKey.fill(0);
    _cachedHmacKey = null;
  }
});

/**
 * Get or create the per-user HMAC key.
 * Stored in iOS Keychain via expo-secure-store, scoped by user ID.
 * Generated once per user, never transmitted.
 */
export async function getPatientHmacKey(): Promise<Uint8Array> {
  if (_cachedHmacKey) return _cachedHmacKey;

  const scopedKey = userScopedSecureKey(HMAC_KEY_STORE_KEY);
  const existing = await getSecureItem(scopedKey);
  if (existing) {
    _cachedHmacKey = hexToBytes(existing);
    return _cachedHmacKey;
  }

  const newKey = randomBytes(32); // 256-bit random key
  await setSecureItem(scopedKey, bytesToHex(newKey));
  _cachedHmacKey = newKey;
  return newKey;
}

/**
 * Compute HMAC-SHA256 of a patient identifier using the per-user key.
 * Returns `hmac:` + hex string for storage in case index.
 */
export async function hashPatientIdentifierHmac(
  identifier: string,
): Promise<string> {
  const key = await getPatientHmacKey();
  const normalized = identifier.toUpperCase().trim();
  const hash = hmac(sha256, key, utf8ToBytes(normalized));
  return HMAC_HASH_PREFIX + bytesToHex(hash);
}
