import { describe, it, expect, beforeEach, vi } from "vitest";

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
      multiRemove: vi.fn(async (keys: string[]) => {
        for (const k of keys) store.delete(k);
      }),
      __store: store,
    },
  };
});

vi.mock("expo-crypto", () => ({
  getRandomBytesAsync: vi.fn(async (length: number) =>
    Uint8Array.from({ length }, (_, i) => (i * 31) & 0xff),
  ),
}));

const { setActiveUserId } = await import("../activeUser");
const { clearEncryptionKeyCache } = await import("../encryption");
const {
  verifyAndPinRecipientKeys,
  acceptKeyRotation,
  getAllPins,
  clearAllPins,
  forgetPin,
} = await import("../keyPinningStore");

describe("keyPinningStore TOFU pinning", () => {
  beforeEach(async () => {
    setActiveUserId("00000000-0000-0000-0000-000000000001");
    clearEncryptionKeyCache();
    await clearAllPins();
  });

  it("pins on first observation and approves matching keys on re-check", async () => {
    const first = await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk1" },
    ]);
    expect(first.kind).toBe("ok");
    if (first.kind === "ok") {
      expect(first.pinnedNew).toBe(1);
      expect(first.keys).toHaveLength(1);
    }

    const second = await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk1" },
    ]);
    expect(second.kind).toBe("ok");
    if (second.kind === "ok") {
      expect(second.pinnedNew).toBe(0); // already pinned
    }
  });

  it("returns mismatch when a previously-pinned device's key changes", async () => {
    await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk1" },
    ]);
    const result = await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk2-ATTACKER" },
    ]);
    expect(result.kind).toBe("mismatch");
    if (result.kind === "mismatch") {
      expect(result.mismatches).toEqual([
        {
          deviceId: "dev-1",
          storedPublicKey: "pk1",
          receivedPublicKey: "pk2-ATTACKER",
        },
      ]);
    }
  });

  it("rejects the entire set when any key mismatches (fail-closed)", async () => {
    await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk1" },
      { deviceId: "dev-2", publicKey: "pk2" },
    ]);
    // Second fetch: dev-1 matches but dev-2 is rotated. Returns mismatch,
    // not partial approval. We don't want to pin wrap-to-dev-1 only when
    // the caller expected "share to every device" — they should surface
    // the mismatch and let the user decide.
    const result = await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk1" },
      { deviceId: "dev-2", publicKey: "pk2-ROTATED" },
    ]);
    expect(result.kind).toBe("mismatch");
  });

  it("acceptKeyRotation overwrites a pin so subsequent verifies pass", async () => {
    await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk1" },
    ]);
    await acceptKeyRotation("user-a", "dev-1", "pk-NEW");
    const result = await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk-NEW" },
    ]);
    expect(result.kind).toBe("ok");
  });

  it("pins are per-(userId, deviceId) — rotating dev-1 for user-a does not affect user-b", async () => {
    await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk1" },
    ]);
    await verifyAndPinRecipientKeys("user-b", [
      { deviceId: "dev-1", publicKey: "pk1-other" },
    ]);
    const all = await getAllPins();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.userId).sort()).toEqual(["user-a", "user-b"]);
  });

  it("forgetPin removes a single pin without affecting others", async () => {
    await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk1" },
      { deviceId: "dev-2", publicKey: "pk2" },
    ]);
    await forgetPin("user-a", "dev-1");
    const all = await getAllPins();
    expect(all).toHaveLength(1);
    expect(all[0]!.deviceId).toBe("dev-2");
  });

  it("clearAllPins wipes everything", async () => {
    await verifyAndPinRecipientKeys("user-a", [
      { deviceId: "dev-1", publicKey: "pk1" },
    ]);
    await clearAllPins();
    const all = await getAllPins();
    expect(all).toEqual([]);
  });
});
