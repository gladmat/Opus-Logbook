/**
 * Async AES-256-GCM encryption helpers for the v2 media pipeline.
 *
 * The public API is file-oriented so `encryptFile`/`decryptFile` can route to
 * the native `OpusMediaCrypto` module (CryptoKit, hardware AES, background
 * dispatch queue) when it is present. On the native path plaintext never
 * enters the JS heap at all — strictly better than the `fill(0)` discipline
 * the pure-JS fallback keeps. Native implementations: CryptoKit on iOS,
 * javax.crypto on Android. The fallback (@noble/ciphers on the JS thread)
 * covers Expo Go and vitest. Both
 * implementations share one envelope: RAW ciphertext in the `.enc` file (tag
 * NOT appended), 12-byte nonce + 16-byte tag as lowercase hex in meta.json.
 *
 * A native *error* never falls back to JS — an auth failure must fail
 * identically on both paths (tamper detection), and silent path-switching
 * would mask native bugs. Fallback happens only on module absence.
 */

import { gcm } from "@noble/ciphers/aes.js";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

import { nativeMediaCrypto } from "../../modules/opus-media-crypto";

const GCM_NONCE_LENGTH = 12;
const GCM_TAG_LENGTH = 16;
const DEK_LENGTH = 32;

interface AesGcmPayload {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}

function encryptBytesInternal(
  plain: Uint8Array,
  dek: Uint8Array,
): AesGcmPayload {
  const nonce = Crypto.getRandomBytes(GCM_NONCE_LENGTH);
  const cipher = gcm(dek, nonce);
  const ciphertextWithTag = cipher.encrypt(plain);
  const tagOffset = ciphertextWithTag.length - GCM_TAG_LENGTH;

  return {
    ciphertext: ciphertextWithTag.slice(0, tagOffset),
    nonce,
    tag: ciphertextWithTag.slice(tagOffset),
  };
}

function decryptBytesInternal(
  ciphertext: Uint8Array,
  dek: Uint8Array,
  nonceHex: string,
  tagHex: string,
): Uint8Array {
  const nonce = hexToBytes(nonceHex);
  const tag = hexToBytes(tagHex);

  if (nonce.length !== GCM_NONCE_LENGTH || tag.length !== GCM_TAG_LENGTH) {
    throw new MediaEncryptionError(
      "DECRYPT_FAILED",
      "Invalid AES-GCM nonce or tag.",
    );
  }

  const cipher = gcm(dek, nonce);
  const ciphertextWithTag = new Uint8Array(ciphertext.length + tag.length);
  ciphertextWithTag.set(ciphertext, 0);
  ciphertextWithTag.set(tag, ciphertext.length);

  try {
    return cipher.decrypt(ciphertextWithTag);
  } catch {
    throw new MediaEncryptionError(
      "DECRYPT_FAILED",
      "Decryption failed — wrong key or tampered data",
    );
  }
}

function ensureParentDirectory(file: File): void {
  const parent = file.parentDirectory;
  if (!parent.exists) {
    parent.create({ idempotent: true, intermediates: true });
  }
}

function writeBytes(file: File, bytes: Uint8Array): void {
  ensureParentDirectory(file);
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  file.write(bytes);
}

export async function generateDek(): Promise<Uint8Array> {
  return Crypto.getRandomBytesAsync(DEK_LENGTH);
}

export async function wrapDek(
  dek: Uint8Array,
  masterKey: Uint8Array,
): Promise<Uint8Array> {
  const { ciphertext, nonce, tag } = encryptBytesInternal(dek, masterKey);
  const out = new Uint8Array(nonce.length + ciphertext.length + tag.length);
  out.set(nonce, 0);
  out.set(ciphertext, nonce.length);
  out.set(tag, nonce.length + ciphertext.length);
  return out;
}

export async function unwrapDek(
  wrapped: Uint8Array,
  masterKey: Uint8Array,
): Promise<Uint8Array> {
  if (wrapped.length < GCM_NONCE_LENGTH + GCM_TAG_LENGTH) {
    throw new MediaEncryptionError(
      "KEY_UNWRAP_FAILED",
      "Wrapped DEK too short",
    );
  }

  const nonceHex = bytesToHex(wrapped.slice(0, GCM_NONCE_LENGTH));
  const ciphertext = wrapped.slice(GCM_NONCE_LENGTH, -GCM_TAG_LENGTH);
  const tagHex = bytesToHex(wrapped.slice(-GCM_TAG_LENGTH));

  try {
    return decryptBytesInternal(ciphertext, masterKey, nonceHex, tagHex);
  } catch {
    throw new MediaEncryptionError(
      "KEY_UNWRAP_FAILED",
      "DEK unwrapping failed — wrong master key",
    );
  }
}

export interface EncryptFileResult {
  nonce: string;
  tag: string;
  sourceSize: number;
  ciphertextSize: number;
}

export async function encryptFile(
  sourcePath: string,
  destPath: string,
  dek: Uint8Array,
): Promise<EncryptFileResult> {
  if (nativeMediaCrypto) {
    try {
      const result = await nativeMediaCrypto.encryptFile(
        sourcePath,
        destPath,
        dek,
      );
      return {
        nonce: result.nonceHex,
        tag: result.tagHex,
        sourceSize: result.sourceSize,
        ciphertextSize: result.ciphertextSize,
      };
    } catch (error) {
      throw new MediaEncryptionError(
        "ENCRYPT_FAILED",
        error instanceof Error
          ? error.message
          : "File encryption failed for secure media storage.",
      );
    }
  }
  return encryptFileJs(sourcePath, destPath, dek);
}

async function encryptFileJs(
  sourcePath: string,
  destPath: string,
  dek: Uint8Array,
): Promise<EncryptFileResult> {
  try {
    const sourceFile = new File(sourcePath);
    const plain = await sourceFile.bytes();
    const { ciphertext, nonce, tag } = encryptBytesInternal(plain, dek);
    const destFile = new File(destPath);

    writeBytes(destFile, ciphertext);

    const sourceSize = plain.length;
    const ciphertextSize = ciphertext.length;

    plain.fill(0);
    ciphertext.fill(0);

    return {
      nonce: bytesToHex(nonce),
      tag: bytesToHex(tag),
      sourceSize,
      ciphertextSize,
    };
  } catch (error) {
    throw new MediaEncryptionError(
      "ENCRYPT_FAILED",
      error instanceof Error
        ? error.message
        : "File encryption failed for secure media storage.",
    );
  }
}

export async function decryptFile(
  sourcePath: string,
  destPath: string,
  dek: Uint8Array,
  nonce: string,
  tag: string,
): Promise<void> {
  if (nativeMediaCrypto) {
    try {
      await nativeMediaCrypto.decryptFile(
        sourcePath,
        destPath,
        dek,
        nonce,
        tag,
      );
      return;
    } catch (error) {
      throw new MediaEncryptionError(
        "DECRYPT_FAILED",
        error instanceof Error
          ? error.message
          : "Decryption failed — wrong key or tampered data",
      );
    }
  }
  return decryptFileJs(sourcePath, destPath, dek, nonce, tag);
}

async function decryptFileJs(
  sourcePath: string,
  destPath: string,
  dek: Uint8Array,
  nonce: string,
  tag: string,
): Promise<void> {
  const sourceFile = new File(sourcePath);
  const ciphertext = await sourceFile.bytes();
  const destFile = new File(destPath);

  const plain = decryptBytesInternal(ciphertext, dek, nonce, tag);
  try {
    writeBytes(destFile, plain);
  } finally {
    ciphertext.fill(0);
    plain.fill(0);
  }
}

export async function decryptFileToBytes(
  sourcePath: string,
  dek: Uint8Array,
  nonce: string,
  tag: string,
): Promise<Uint8Array> {
  const sourceFile = new File(sourcePath);
  const ciphertext = await sourceFile.bytes();
  try {
    return decryptBytesInternal(ciphertext, dek, nonce, tag);
  } finally {
    ciphertext.fill(0);
  }
}

/**
 * Dev-only cross-implementation parity check: native-encrypt → JS-decrypt and
 * JS-encrypt → native-decrypt over random bytes, byte-compared. Cheap
 * insurance that the CryptoKit envelope stays byte-compatible with @noble.
 * No-op in production builds and wherever the native module is absent.
 */
export async function runMediaCryptoParityCheck(): Promise<void> {
  if (!__DEV__ || !nativeMediaCrypto) return;

  const dir = new Directory(Paths.cache, "opus-crypto-parity");
  try {
    const dek = await generateDek();
    // expo-crypto caps getRandomBytes at 1024 bytes per call — assemble a
    // 64KB payload from chunks (crypto-quality randomness is irrelevant
    // here; the payload just needs to be non-trivial).
    const original = new Uint8Array(64 * 1024);
    for (let offset = 0; offset < original.length; offset += 1024) {
      original.set(Crypto.getRandomBytes(1024), offset);
    }

    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
    const plainFile = new File(dir, "plain.bin");
    writeBytes(plainFile, original);

    const roundTrips: [
      label: string,
      encrypt: typeof encryptFile,
      decrypt: typeof decryptFile,
    ][] = [
      ["native-encrypt → JS-decrypt", nativeEncryptForParity, decryptFileJs],
      ["JS-encrypt → native-decrypt", encryptFileJs, nativeDecryptForParity],
    ];

    for (const [label, encrypt, decrypt] of roundTrips) {
      const encFile = new File(dir, "parity.enc");
      const outFile = new File(dir, "parity.out");
      const { nonce, tag } = await encrypt(plainFile.uri, encFile.uri, dek);
      await decrypt(encFile.uri, outFile.uri, dek, nonce, tag);
      const decrypted = await outFile.bytes();
      const ok =
        decrypted.length === original.length &&
        decrypted.every((b, i) => b === original[i]);
      if (!ok) {
        console.error(`[opus:media-crypto] parity FAILED: ${label}`);
        return;
      }
    }
    console.log("[opus:media-crypto] native/JS parity OK (both directions)");
  } catch (error) {
    console.error("[opus:media-crypto] parity check errored:", error);
  } finally {
    try {
      if (dir.exists) dir.delete();
    } catch {
      // Best-effort cleanup of the parity scratch directory.
    }
  }
}

async function nativeEncryptForParity(
  sourcePath: string,
  destPath: string,
  dek: Uint8Array,
): Promise<EncryptFileResult> {
  const r = await nativeMediaCrypto!.encryptFile(sourcePath, destPath, dek);
  return {
    nonce: r.nonceHex,
    tag: r.tagHex,
    sourceSize: r.sourceSize,
    ciphertextSize: r.ciphertextSize,
  };
}

async function nativeDecryptForParity(
  sourcePath: string,
  destPath: string,
  dek: Uint8Array,
  nonce: string,
  tag: string,
): Promise<void> {
  await nativeMediaCrypto!.decryptFile(sourcePath, destPath, dek, nonce, tag);
}

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
