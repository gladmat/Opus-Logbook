import { describe, it, expect, beforeEach, vi } from "vitest";

// SecureStore in-memory mock so encryption can look up a master key.
vi.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    WHEN_UNLOCKED: "WHEN_UNLOCKED",
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  };
});

vi.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: vi.fn(async (key: string) => store.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
});

// Deterministic random bytes so test outputs are stable.
vi.mock("expo-crypto", () => ({
  getRandomBytesAsync: vi.fn(async (length: number) =>
    Uint8Array.from({ length }, (_, i) => i & 0xff),
  ),
}));

const encryption = await import("../encryption");
const { setActiveUserId } = await import("../activeUser");
const { encryptData, decryptData, clearEncryptionKeyCache } = encryption;

describe("encryption — legacy XOR fallback removed", () => {
  beforeEach(() => {
    clearEncryptionKeyCache();
    setActiveUserId("00000000-0000-0000-0000-000000000001");
  });

  it("round-trips plaintext through the v1 AEAD envelope", async () => {
    const plaintext = JSON.stringify({ hello: "world" });
    const envelope = await encryptData(plaintext);
    expect(envelope.startsWith("enc:v1:")).toBe(true);
    const decrypted = await decryptData(envelope);
    expect(decrypted).toBe(plaintext);
  });

  it("THROWS on a non-envelope input (no silent legacy-XOR fallback)", async () => {
    // Plain JSON that would previously sneak through the `looksLikeJson`
    // bypass as "already decrypted". This is the exact tamper vector the
    // audit flagged — an attacker who can write to AsyncStorage should not
    // be able to inject plaintext that the app treats as authentic.
    await expect(decryptData('{"hello":"world"}')).rejects.toThrow(
      /not an enc:v1 envelope/,
    );
  });

  it("THROWS on a tampered ciphertext (AEAD tag fails)", async () => {
    const envelope = await encryptData("sensitive");
    const parts = envelope.split(":");
    // Flip one hex nibble in the ciphertext so the AEAD tag no longer verifies.
    const cipher = parts[3]!;
    const tampered =
      parts.slice(0, 3).join(":") +
      ":" +
      (cipher[0] === "0" ? "1" : "0") +
      cipher.slice(1);
    await expect(decryptData(tampered)).rejects.toThrow();
  });

  it("THROWS on a malformed envelope shape", async () => {
    await expect(decryptData("enc:v1:short")).rejects.toThrow(/malformed/);
  });
});
