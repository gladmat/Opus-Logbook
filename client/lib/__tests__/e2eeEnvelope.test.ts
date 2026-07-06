import { describe, it, expect, vi } from "vitest";

// SecureStore in-memory mock so device identity can be created if needed.
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

// Deterministic random bytes so test outputs are stable.
vi.mock("expo-crypto", () => ({
  getRandomBytesAsync: vi.fn(async (length: number) =>
    Uint8Array.from({ length }, (_, i) => (i * 7 + 3) & 0xff),
  ),
}));

const {
  generateCaseKeyHex,
  encryptPayloadWithCaseKey,
  decryptPayloadWithCaseKey,
} = await import("../e2ee");

describe("e2ee case envelope — fail-closed decryption", () => {
  it("round-trips a payload through the case:v1 envelope", async () => {
    const caseKey = await generateCaseKeyHex();
    const plaintext = JSON.stringify({ patient: "REDACTED", procedures: [] });
    const envelope = await encryptPayloadWithCaseKey(plaintext, caseKey);
    expect(envelope.startsWith("case:v1:")).toBe(true);
    expect(decryptPayloadWithCaseKey(envelope, caseKey)).toBe(plaintext);
  });

  it("THROWS on plaintext input (no silent passthrough)", async () => {
    // Previously non-`case:v1:` input was returned unchanged, letting a
    // compromised server inject unauthenticated content into the E2EE path.
    const caseKey = await generateCaseKeyHex();
    expect(() =>
      decryptPayloadWithCaseKey('{"injected":"plaintext"}', caseKey),
    ).toThrow(/envelope/i);
  });

  it("THROWS on a malformed envelope shape", async () => {
    const caseKey = await generateCaseKeyHex();
    expect(() =>
      decryptPayloadWithCaseKey("case:v1:onlynonce", caseKey),
    ).toThrow(/malformed/i);
  });

  it("THROWS on tampered ciphertext (AEAD tag failure)", async () => {
    const caseKey = await generateCaseKeyHex();
    const envelope = await encryptPayloadWithCaseKey("sensitive", caseKey);
    const parts = envelope.split(":");
    const cipher = parts[3]!;
    const tampered =
      parts.slice(0, 3).join(":") +
      ":" +
      (cipher[0] === "0" ? "1" : "0") +
      cipher.slice(1);
    expect(() => decryptPayloadWithCaseKey(tampered, caseKey)).toThrow();
  });

  it("THROWS when decrypting with the wrong case key", async () => {
    const envelope = await encryptPayloadWithCaseKey(
      "sensitive",
      "aa".repeat(32),
    );
    expect(() =>
      decryptPayloadWithCaseKey(envelope, "bb".repeat(32)),
    ).toThrow();
  });
});
