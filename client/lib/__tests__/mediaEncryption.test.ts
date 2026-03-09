import { describe, expect, it, vi, beforeAll } from "vitest";

// Mock expo-crypto before importing the module under test
vi.mock("expo-crypto", () => ({
  getRandomBytes: (length: number) => {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  },
}));

import {
  generateDEK,
  encryptMediaBytes,
  decryptMediaBytes,
  wrapDEK,
  unwrapDEK,
  MediaEncryptionError,
} from "@/lib/mediaEncryption";

// Generate a stable test key
function makeKey(): Uint8Array {
  const key = new Uint8Array(32);
  globalThis.crypto.getRandomValues(key);
  return key;
}

describe("mediaEncryption", () => {
  describe("generateDEK", () => {
    it("returns 32 bytes", () => {
      const dek = generateDEK();
      expect(dek).toBeInstanceOf(Uint8Array);
      expect(dek.length).toBe(32);
    });

    it("produces distinct keys on consecutive calls", () => {
      const a = generateDEK();
      const b = generateDEK();
      expect(a).not.toEqual(b);
    });
  });

  describe("encryptMediaBytes / decryptMediaBytes", () => {
    it("roundtrip preserves content", () => {
      const dek = generateDEK();
      const plain = new Uint8Array([1, 2, 3, 4, 5, 72, 101, 108, 108, 111]);

      const encrypted = encryptMediaBytes(plain, dek);
      const decrypted = decryptMediaBytes(encrypted, dek);

      expect(decrypted).toEqual(plain);
    });

    it("produces output longer than input (nonce + tag overhead)", () => {
      const dek = generateDEK();
      const plain = new Uint8Array(100);
      const encrypted = encryptMediaBytes(plain, dek);

      // nonce(12) + ciphertext(100) + tag(16) = 128
      expect(encrypted.length).toBe(128);
    });

    it("consecutive encryptions produce different nonces", () => {
      const dek = generateDEK();
      const plain = new Uint8Array([42]);

      const enc1 = encryptMediaBytes(plain, dek);
      const enc2 = encryptMediaBytes(plain, dek);

      // First 12 bytes are the nonce — should differ
      const nonce1 = enc1.slice(0, 12);
      const nonce2 = enc2.slice(0, 12);
      expect(nonce1).not.toEqual(nonce2);
    });

    it("wrong key throws MediaEncryptionError", () => {
      const dek1 = generateDEK();
      const dek2 = generateDEK();
      const plain = new Uint8Array([1, 2, 3]);

      const encrypted = encryptMediaBytes(plain, dek1);

      expect(() => decryptMediaBytes(encrypted, dek2)).toThrow(
        MediaEncryptionError,
      );
    });

    it("tampered ciphertext throws", () => {
      const dek = generateDEK();
      const plain = new Uint8Array([10, 20, 30]);

      const encrypted = encryptMediaBytes(plain, dek);
      // Flip a byte in the ciphertext region
      encrypted[15] = encrypted[15]! ^ 0xff;

      expect(() => decryptMediaBytes(encrypted, dek)).toThrow(
        MediaEncryptionError,
      );
    });

    it("too-short input throws", () => {
      const dek = generateDEK();
      const tooShort = new Uint8Array(20); // less than nonce(12) + tag(16)

      expect(() => decryptMediaBytes(tooShort, dek)).toThrow(
        MediaEncryptionError,
      );
    });

    it("handles empty plaintext", () => {
      const dek = generateDEK();
      const plain = new Uint8Array(0);

      const encrypted = encryptMediaBytes(plain, dek);
      const decrypted = decryptMediaBytes(encrypted, dek);

      expect(decrypted).toEqual(plain);
      // nonce(12) + tag(16) = 28 for empty plaintext
      expect(encrypted.length).toBe(28);
    });

    it("handles large payloads (1MB)", () => {
      const dek = generateDEK();
      const plain = new Uint8Array(1024 * 1024);
      // Fill with a repeating pattern (getRandomValues has a 65KB limit)
      for (let i = 0; i < plain.length; i++) {
        plain[i] = i % 256;
      }

      const encrypted = encryptMediaBytes(plain, dek);
      const decrypted = decryptMediaBytes(encrypted, dek);

      expect(decrypted).toEqual(plain);
    });
  });

  describe("wrapDEK / unwrapDEK", () => {
    it("roundtrip preserves DEK", () => {
      const masterKey = makeKey();
      const dek = generateDEK();

      const wrapped = wrapDEK(dek, masterKey);
      const unwrapped = unwrapDEK(wrapped, masterKey);

      expect(unwrapped).toEqual(dek);
    });

    it("wrapped DEK is compact (< 100 bytes)", () => {
      const masterKey = makeKey();
      const dek = generateDEK();

      const wrapped = wrapDEK(dek, masterKey);
      // nonce(12) + dek(32) + tag(16) = 60
      expect(wrapped.length).toBe(60);
    });

    it("wrong master key throws MediaEncryptionError", () => {
      const masterKey1 = makeKey();
      const masterKey2 = makeKey();
      const dek = generateDEK();

      const wrapped = wrapDEK(dek, masterKey1);

      expect(() => unwrapDEK(wrapped, masterKey2)).toThrow(
        MediaEncryptionError,
      );
    });

    it("too-short wrapped DEK throws", () => {
      const masterKey = makeKey();
      const tooShort = new Uint8Array(20);

      expect(() => unwrapDEK(tooShort, masterKey)).toThrow(
        MediaEncryptionError,
      );
    });
  });

  describe("error codes", () => {
    it("decrypt failure has DECRYPT_FAILED code", () => {
      const dek1 = generateDEK();
      const dek2 = generateDEK();
      const encrypted = encryptMediaBytes(new Uint8Array([1]), dek1);

      try {
        decryptMediaBytes(encrypted, dek2);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(MediaEncryptionError);
        expect((e as MediaEncryptionError).code).toBe("DECRYPT_FAILED");
      }
    });

    it("unwrap failure has KEY_UNWRAP_FAILED code", () => {
      const mk1 = makeKey();
      const mk2 = makeKey();
      const wrapped = wrapDEK(generateDEK(), mk1);

      try {
        unwrapDEK(wrapped, mk2);
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(MediaEncryptionError);
        expect((e as MediaEncryptionError).code).toBe("KEY_UNWRAP_FAILED");
      }
    });
  });
});
