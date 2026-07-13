import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createExpoFileSystemMock,
  readMockFileBytes,
  resetMockExpoFileSystem,
  writeMockFile,
} from "@/lib/__tests__/helpers/mockExpoFileSystem";

// Mutable holder so individual tests can flip between "native module absent"
// (Expo Go, vitest, Android) and "native module present" without separate
// test files. `mediaEncryption` captures the module at import time, so each
// test re-imports after vi.resetModules().
const holder: { native: unknown } = { native: null };

vi.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: vi.fn(() => holder.native),
}));
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

async function importFresh() {
  vi.resetModules();
  return import("@/lib/mediaEncryption");
}

function makePlain(length = 1024): Uint8Array {
  const plain = new Uint8Array(length);
  for (let i = 0; i < plain.length; i += 1) {
    plain[i] = i % 251;
  }
  return plain;
}

describe("mediaEncryption provider selection", () => {
  beforeEach(() => {
    resetMockExpoFileSystem();
    holder.native = null;
  });

  it("exposes null nativeMediaCrypto when the native module is absent", async () => {
    const mod = await import("../../../modules/opus-media-crypto");
    expect(mod.nativeMediaCrypto).toBeNull();
  });

  it("round-trips via the JS fallback when native is absent", async () => {
    const { encryptFile, decryptFile, generateDek } = await importFresh();
    const dek = await generateDek();
    const plain = makePlain();
    writeMockFile("file:///document/source.jpg", plain);

    const { nonce, tag } = await encryptFile(
      "file:///document/source.jpg",
      "file:///document/source.enc",
      dek,
    );
    await decryptFile(
      "file:///document/source.enc",
      "file:///cache/out.jpg",
      dek,
      nonce,
      tag,
    );

    expect(readMockFileBytes("file:///cache/out.jpg")).toEqual(plain);
  });

  it("routes encryptFile through the native module and maps the result shape", async () => {
    const nativeEncrypt = vi.fn(async () => ({
      nonceHex: "ab".repeat(12),
      tagHex: "cd".repeat(16),
      sourceSize: 1024,
      ciphertextSize: 1024,
    }));
    holder.native = { encryptFile: nativeEncrypt, decryptFile: vi.fn() };
    const { encryptFile } = await importFresh();
    const dek = new Uint8Array(32);

    const result = await encryptFile("file:///src", "file:///dst", dek);

    expect(nativeEncrypt).toHaveBeenCalledWith(
      "file:///src",
      "file:///dst",
      dek,
    );
    expect(result).toEqual({
      nonce: "ab".repeat(12),
      tag: "cd".repeat(16),
      sourceSize: 1024,
      ciphertextSize: 1024,
    });
  });

  it("routes decryptFile through the native module", async () => {
    const nativeDecrypt = vi.fn(async () => undefined);
    holder.native = { encryptFile: vi.fn(), decryptFile: nativeDecrypt };
    const { decryptFile } = await importFresh();
    const dek = new Uint8Array(32);

    await decryptFile("file:///src", "file:///dst", dek, "aa", "bb");

    expect(nativeDecrypt).toHaveBeenCalledWith(
      "file:///src",
      "file:///dst",
      dek,
      "aa",
      "bb",
    );
  });

  it("wraps native errors into MediaEncryptionError codes without JS fallback", async () => {
    const nativeEncrypt = vi.fn(async () => {
      throw new Error("boom");
    });
    const nativeDecrypt = vi.fn(async () => {
      throw new Error("Decryption failed — wrong key or tampered data");
    });
    holder.native = { encryptFile: nativeEncrypt, decryptFile: nativeDecrypt };
    const { encryptFile, decryptFile } = await importFresh();
    const dek = new Uint8Array(32);

    await expect(
      encryptFile("file:///src", "file:///dst", dek),
    ).rejects.toMatchObject({ code: "ENCRYPT_FAILED" });
    await expect(
      decryptFile("file:///src", "file:///dst", dek, "aa", "bb"),
    ).rejects.toMatchObject({ code: "DECRYPT_FAILED" });
    // A native failure must never silently fall back to the JS path —
    // tamper detection has to fail identically on both implementations.
    expect(nativeEncrypt).toHaveBeenCalledTimes(1);
    expect(nativeDecrypt).toHaveBeenCalledTimes(1);
  });
});
