/**
 * AES-256-GCM encryption primitives for the v2 media pipeline.
 *
 * Uses @noble/ciphers (pure JS, already installed) for AES-GCM.
 * The cipher provider is isolated here — swap in react-native-aes-gcm-crypto
 * for hardware-accelerated CryptoKit if profiling shows cipher speed is a bottleneck.
 *
 * Wire format for encrypted payloads: nonce(12) || ciphertext || tag(16)
 * This is a raw binary format — no base64 wrapping at the file level.
 */

import { gcm } from "@noble/ciphers/aes.js";
import * as Crypto from "expo-crypto";

const GCM_NONCE_LENGTH = 12;
const DEK_LENGTH = 32;

// ═══════════════════════════════════════════════════════════
// DEK generation
// ═══════════════════════════════════════════════════════════

/** Generate a random 256-bit Data Encryption Key */
export function generateDEK(): Uint8Array {
  return Crypto.getRandomBytes(DEK_LENGTH);
}

// ═══════════════════════════════════════════════════════════
// Bulk media encryption (AES-256-GCM)
// ═══════════════════════════════════════════════════════════

/**
 * Encrypt plaintext bytes using AES-256-GCM.
 * Returns: nonce(12) || ciphertext || tag(16)
 */
export function encryptMediaBytes(
  plain: Uint8Array,
  dek: Uint8Array,
): Uint8Array {
  const nonce = Crypto.getRandomBytes(GCM_NONCE_LENGTH);
  const cipher = gcm(dek, nonce);
  const ct = cipher.encrypt(plain);
  // Prepend nonce to ciphertext+tag
  const out = new Uint8Array(GCM_NONCE_LENGTH + ct.length);
  out.set(nonce, 0);
  out.set(ct, GCM_NONCE_LENGTH);
  return out;
}

/**
 * Decrypt AES-256-GCM encrypted bytes.
 * Input format: nonce(12) || ciphertext || tag(16)
 * Throws on authentication failure (tampered data or wrong key).
 */
export function decryptMediaBytes(
  enc: Uint8Array,
  dek: Uint8Array,
): Uint8Array {
  if (enc.length < GCM_NONCE_LENGTH + 16) {
    throw new MediaEncryptionError(
      "DECRYPT_FAILED",
      "Encrypted data too short",
    );
  }
  const nonce = enc.slice(0, GCM_NONCE_LENGTH);
  const ct = enc.slice(GCM_NONCE_LENGTH);
  try {
    const cipher = gcm(dek, nonce);
    return cipher.decrypt(ct);
  } catch {
    throw new MediaEncryptionError(
      "DECRYPT_FAILED",
      "Decryption failed — wrong key or tampered data",
    );
  }
}

// ═══════════════════════════════════════════════════════════
// DEK wrapping (AES-256-GCM with master key)
// ═══════════════════════════════════════════════════════════

/**
 * Wrap a DEK using AES-256-GCM with the master key.
 * Returns: nonce(12) || wrappedDEK || tag(16)
 * The wrapped output is small (~60 bytes) — fast even in pure JS.
 */
export function wrapDEK(dek: Uint8Array, masterKey: Uint8Array): Uint8Array {
  const nonce = Crypto.getRandomBytes(GCM_NONCE_LENGTH);
  const cipher = gcm(masterKey, nonce);
  const ct = cipher.encrypt(dek);
  const out = new Uint8Array(GCM_NONCE_LENGTH + ct.length);
  out.set(nonce, 0);
  out.set(ct, GCM_NONCE_LENGTH);
  return out;
}

/**
 * Unwrap a DEK using AES-256-GCM with the master key.
 * Input format: nonce(12) || wrappedDEK || tag(16)
 * Throws on authentication failure.
 */
export function unwrapDEK(
  wrapped: Uint8Array,
  masterKey: Uint8Array,
): Uint8Array {
  if (wrapped.length < GCM_NONCE_LENGTH + 16) {
    throw new MediaEncryptionError(
      "KEY_UNWRAP_FAILED",
      "Wrapped DEK too short",
    );
  }
  const nonce = wrapped.slice(0, GCM_NONCE_LENGTH);
  const ct = wrapped.slice(GCM_NONCE_LENGTH);
  try {
    const cipher = gcm(masterKey, nonce);
    return cipher.decrypt(ct);
  } catch {
    throw new MediaEncryptionError(
      "KEY_UNWRAP_FAILED",
      "DEK unwrapping failed — wrong master key",
    );
  }
}

// ═══════════════════════════════════════════════════════════
// Error type
// ═══════════════════════════════════════════════════════════

export type MediaEncryptionErrorCode =
  | "ENCRYPT_FAILED"
  | "DECRYPT_FAILED"
  | "KEY_UNWRAP_FAILED";

export class MediaEncryptionError extends Error {
  readonly code: MediaEncryptionErrorCode;

  constructor(code: MediaEncryptionErrorCode, message: string) {
    super(message);
    this.name = "MediaEncryptionError";
    this.code = code;
  }
}
