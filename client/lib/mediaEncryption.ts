/**
 * Async AES-256-GCM encryption helpers for the v2 media pipeline.
 *
 * The public API is file-oriented so the provider can later swap to a native
 * file-to-file implementation without changing consumers.
 */

import { gcm } from "@noble/ciphers/aes.js";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

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

export async function encryptFile(
  sourcePath: string,
  destPath: string,
  dek: Uint8Array,
): Promise<{
  nonce: string;
  tag: string;
  sourceSize: number;
  ciphertextSize: number;
}> {
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
