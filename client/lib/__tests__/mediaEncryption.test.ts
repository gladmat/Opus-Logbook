/* eslint-disable import/first */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createExpoFileSystemMock,
  readMockFileBytes,
  resetMockExpoFileSystem,
  writeMockFile,
} from "@/lib/__tests__/helpers/mockExpoFileSystem";

vi.mock("expo-file-system", () => createExpoFileSystemMock());
vi.mock("expo-crypto", () => ({
  getRandomBytes: (length: number) => {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  },
  getRandomBytesAsync: async (length: number) => {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  },
}));

import {
  decryptFile,
  decryptFileToBytes,
  encryptFile,
  generateDek,
  MediaEncryptionError,
  wrapDek,
  unwrapDek,
} from "@/lib/mediaEncryption";

function makeKey(): Uint8Array {
  const key = new Uint8Array(32);
  globalThis.crypto.getRandomValues(key);
  return key;
}

describe("mediaEncryption", () => {
  beforeEach(() => {
    resetMockExpoFileSystem();
  });

  it("generates 32-byte DEKs", async () => {
    const dek = await generateDek();
    expect(dek).toBeInstanceOf(Uint8Array);
    expect(dek).toHaveLength(32);
  });

  it("wraps and unwraps DEKs", async () => {
    const masterKey = makeKey();
    const dek = await generateDek();

    const wrapped = await wrapDek(dek, masterKey);
    const unwrapped = await unwrapDek(wrapped, masterKey);

    expect(unwrapped).toEqual(dek);
  });

  it("throws KEY_UNWRAP_FAILED for the wrong wrapping key", async () => {
    const dek = await generateDek();
    const wrapped = await wrapDek(dek, makeKey());

    await expect(unwrapDek(wrapped, makeKey())).rejects.toMatchObject({
      code: "KEY_UNWRAP_FAILED",
    });
  });

  it("round-trips file encryption and decryption", async () => {
    const dek = await generateDek();
    const sourcePath = "file:///document/source.jpg";
    const encryptedPath = "file:///document/source.enc";
    const decryptedPath = "file:///cache/source.jpg";
    const plain = new Uint8Array(1024);
    for (let i = 0; i < plain.length; i += 1) {
      plain[i] = i % 251;
    }

    writeMockFile(sourcePath, plain);

    const encrypted = await encryptFile(sourcePath, encryptedPath, dek);
    expect(encrypted.nonce).not.toHaveLength(0);
    expect(encrypted.tag).not.toHaveLength(0);
    expect(encrypted.sourceSize).toBe(plain.length);
    expect(encrypted.ciphertextSize).toBe(
      readMockFileBytes(encryptedPath).length,
    );

    await decryptFile(
      encryptedPath,
      decryptedPath,
      dek,
      encrypted.nonce,
      encrypted.tag,
    );

    expect(readMockFileBytes(decryptedPath)).toEqual(plain);
  });

  it("decrypts encrypted files back to bytes", async () => {
    const dek = await generateDek();
    const sourcePath = "file:///document/bytes.png";
    const encryptedPath = "file:///document/bytes.enc";
    const plain = new Uint8Array([1, 2, 3, 4, 5]);

    writeMockFile(sourcePath, plain);
    const encrypted = await encryptFile(sourcePath, encryptedPath, dek);
    const decrypted = await decryptFileToBytes(
      encryptedPath,
      dek,
      encrypted.nonce,
      encrypted.tag,
    );

    expect(decrypted).toEqual(plain);
  });

  it("throws DECRYPT_FAILED when the DEK is wrong", async () => {
    const dek1 = await generateDek();
    const dek2 = await generateDek();
    const sourcePath = "file:///document/wrong-key.jpg";
    const encryptedPath = "file:///document/wrong-key.enc";

    writeMockFile(sourcePath, new Uint8Array([10, 20, 30]));
    const encrypted = await encryptFile(sourcePath, encryptedPath, dek1);

    await expect(
      decryptFileToBytes(encryptedPath, dek2, encrypted.nonce, encrypted.tag),
    ).rejects.toBeInstanceOf(MediaEncryptionError);
  });

  it("throws DECRYPT_FAILED when ciphertext is tampered", async () => {
    const dek = await generateDek();
    const sourcePath = "file:///document/tamper.jpg";
    const encryptedPath = "file:///document/tamper.enc";

    writeMockFile(sourcePath, new Uint8Array([4, 5, 6, 7]));
    const encrypted = await encryptFile(sourcePath, encryptedPath, dek);

    const ciphertext = readMockFileBytes(encryptedPath);
    ciphertext[0] = ciphertext[0]! ^ 0xff;
    writeMockFile(encryptedPath, ciphertext);

    await expect(
      decryptFileToBytes(encryptedPath, dek, encrypted.nonce, encrypted.tag),
    ).rejects.toMatchObject({
      code: "DECRYPT_FAILED",
    });
  });
});
