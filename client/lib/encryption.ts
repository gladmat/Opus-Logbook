import * as Crypto from "expo-crypto";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { userScopedSecureKey } from "./activeUser";
import {
  getSecureItem,
  setSecureItem,
  deleteSecureItem,
} from "./secureStorage";

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export const ENCRYPTION_KEY_ALIAS = "surgical_logbook_encryption_key";
const ENVELOPE_PREFIX = "enc:v1";
const KEY_BYTES = 32;
const NONCE_BYTES = 24;

function isHex(value: string): boolean {
  return /^[0-9a-f]+$/i.test(value) && value.length % 2 === 0;
}

let _cachedKeyHex: string | null = null;
let _cachedKeyBytes: Uint8Array | null = null;

async function getKeyHex(): Promise<string> {
  if (_cachedKeyHex) return _cachedKeyHex;

  const scopedAlias = userScopedSecureKey(ENCRYPTION_KEY_ALIAS);
  const stored = await getSecureItem(scopedAlias);
  if (stored && isHex(stored)) {
    _cachedKeyHex = stored;
    return stored;
  }

  const newKey = bytesToHex(await Crypto.getRandomBytesAsync(KEY_BYTES));
  await setSecureItem(scopedAlias, newKey);
  _cachedKeyHex = newKey;
  return newKey;
}

async function getKeyBytes(): Promise<Uint8Array> {
  if (_cachedKeyBytes) return _cachedKeyBytes;
  const keyHex = await getKeyHex();
  _cachedKeyBytes = hexToBytes(keyHex);
  return _cachedKeyBytes;
}

export async function generateKeyHex(): Promise<string> {
  return bytesToHex(await Crypto.getRandomBytesAsync(KEY_BYTES));
}

export async function encryptWithKey(
  plaintext: string,
  keyHex: string,
): Promise<string> {
  const key = hexToBytes(keyHex);
  const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext));

  return `${ENVELOPE_PREFIX}:${bytesToHex(nonce)}:${bytesToHex(ciphertext)}`;
}

export async function decryptWithKey(
  envelope: string,
  keyHex: string,
): Promise<string> {
  if (!envelope.startsWith(`${ENVELOPE_PREFIX}:`)) {
    throw new Error("decryptWithKey: expected an enc:v1 envelope");
  }

  const parts = envelope.split(":");
  if (parts.length !== 4) {
    throw new Error("decryptWithKey: malformed envelope");
  }

  const nonceHex = parts[2];
  const cipherHex = parts[3];
  if (!nonceHex || !cipherHex) {
    throw new Error("decryptWithKey: malformed envelope");
  }

  const key = hexToBytes(keyHex);
  const nonce = hexToBytes(nonceHex);
  const ciphertext = hexToBytes(cipherHex);

  const cipher = xchacha20poly1305(key, nonce);
  const plaintextBytes = cipher.decrypt(ciphertext);
  return bytesToUtf8(plaintextBytes);
}

export async function encryptData(data: string): Promise<string> {
  try {
    const key = await getKeyBytes();
    const nonce = await Crypto.getRandomBytesAsync(NONCE_BYTES);
    const cipher = xchacha20poly1305(key, nonce);
    const ciphertext = cipher.encrypt(utf8ToBytes(data));

    return `${ENVELOPE_PREFIX}:${bytesToHex(nonce)}:${bytesToHex(ciphertext)}`;
  } catch {
    throw new Error(
      "Encryption failed. Data was not saved to protect your privacy.",
    );
  }
}

/**
 * Decrypt a v1 AEAD envelope. Throws on:
 *   - Input that is NOT an `enc:v1:` envelope (including anything that happens
 *     to parse as JSON — the old "legacyXorDecrypt / looksLikeJson" fallback
 *     was a silent bypass that allowed tampered AsyncStorage records to flow
 *     through as cleartext).
 *   - AEAD authentication failure (wrong key, tampered ciphertext).
 *   - Malformed envelope shape.
 *
 * Every call site in the app wraps this in try/catch and treats failure as
 * "return empty / null" — see storage.ts, sharingStorage.ts, episodeStorage.ts,
 * AuthContext.tsx, assessmentStorage.ts.
 */
export async function decryptData(encryptedData: string): Promise<string> {
  if (!encryptedData.startsWith(`${ENVELOPE_PREFIX}:`)) {
    // NEVER pass unencrypted data through as "plaintext". A tampered or
    // legacy AsyncStorage record MUST fail loudly so the caller treats it
    // as corrupt rather than silently deserialising attacker-controlled JSON.
    throw new Error("decryptData: record is not an enc:v1 envelope");
  }

  const parts = encryptedData.split(":");
  if (parts.length !== 4) {
    throw new Error("decryptData: malformed envelope (wrong part count)");
  }

  const nonceHex = parts[2];
  const cipherHex = parts[3];
  if (!nonceHex || !cipherHex) {
    throw new Error("decryptData: malformed envelope (missing nonce/cipher)");
  }

  const key = await getKeyBytes();
  const nonce = hexToBytes(nonceHex);
  const ciphertext = hexToBytes(cipherHex);

  const cipher = xchacha20poly1305(key, nonce);
  // AEAD.decrypt throws if the tag doesn't verify — propagate that up.
  const plaintextBytes = cipher.decrypt(ciphertext);
  return bytesToUtf8(plaintextBytes);
}

export async function isEncrypted(data: string): Promise<boolean> {
  return data.startsWith(`${ENVELOPE_PREFIX}:`);
}

/** Expose the cached master key bytes for media DEK wrapping */
export async function getMasterKeyBytes(): Promise<Uint8Array> {
  return getKeyBytes();
}

/**
 * Clear cached encryption keys from memory.
 * Call on app background / lock to reduce key exposure window.
 */
export function clearEncryptionKeyCache(): void {
  if (_cachedKeyBytes) {
    _cachedKeyBytes.fill(0);
    _cachedKeyBytes = null;
  }
  _cachedKeyHex = null;
}

/**
 * Delete the user-scoped master encryption key from SecureStore and clear the
 * in-memory cache. Called during account deletion so a seized device cannot
 * be used to recover the previous account's encrypted data.
 */
export async function deleteUserEncryptionKey(): Promise<void> {
  clearEncryptionKeyCache();
  const scopedAlias = userScopedSecureKey(ENCRYPTION_KEY_ALIAS);
  await deleteSecureItem(scopedAlias);
}
