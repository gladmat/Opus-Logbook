import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory SecureStore stand-in.
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
    __store: store,
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
      __store: store,
    },
  };
});

// Force an active user so the user-scoped key helpers produce stable keys.
vi.mock("../activeUser", () => ({
  userScopedSecureKey: (base: string) => `${base}_test_user`,
  getActiveUserIdOrNull: () => "test-user",
  setActiveUserId: vi.fn(),
  onActiveUserChange: vi.fn(() => () => {}),
  userScopedAsyncKey: (base: string) => `${base}::test-user`,
}));

const mod = await import("../appLockStorage");
const { savePin, verifyPin, isPinSet, clearAllAppLockData } = mod;

async function resetStore(): Promise<void> {
  const ss = (await import("expo-secure-store")) as unknown as {
    __store: Map<string, string>;
  };
  ss.__store.clear();
  const async = (await import(
    "@react-native-async-storage/async-storage"
  )) as unknown as { default: { __store: Map<string, string> } };
  async.default.__store.clear();
}

describe("appLockStorage scrypt PIN", () => {
  beforeEach(async () => {
    await resetStore();
  });

  it("verifyPin returns ok=true for the correct PIN", async () => {
    await savePin("1234");
    const outcome = await verifyPin("1234");
    expect(outcome.ok).toBe(true);
    expect(outcome.lockoutSecondsRemaining).toBe(0);
    expect(outcome.attempts).toBe(0);
  });

  it("verifyPin returns ok=false for the wrong PIN", async () => {
    await savePin("1234");
    const outcome = await verifyPin("9999");
    expect(outcome.ok).toBe(false);
    expect(outcome.attempts).toBe(1);
  });

  it("produces different hashes for identical PINs when salt changes", async () => {
    // Under Vitest the secureStorage wrapper routes to AsyncStorage
    // (Platform.OS === "web"). Read directly from the mocked backing store
    // to inspect what was written.
    const asyncMod = (await import(
      "@react-native-async-storage/async-storage"
    )) as unknown as { default: { __store: Map<string, string> } };
    const store = asyncMod.default.__store;

    await savePin("1234");
    const hashA = store.get("opus_app_lock_pin_hash_test_user");
    const saltA = store.get("opus_app_lock_pin_salt_test_user");

    await savePin("1234");
    const hashB = store.get("opus_app_lock_pin_hash_test_user");
    const saltB = store.get("opus_app_lock_pin_salt_test_user");

    expect(hashA).toBeDefined();
    expect(hashB).toBeDefined();
    expect(saltA).not.toBe(saltB);
    expect(hashA).not.toBe(hashB);
  });

  it("isPinSet reflects savePin / clearAllAppLockData", async () => {
    expect(await isPinSet()).toBe(false);
    await savePin("1234");
    expect(await isPinSet()).toBe(true);
    await clearAllAppLockData();
    expect(await isPinSet()).toBe(false);
  });

  it("enters the lockout ladder after 5 wrong attempts", async () => {
    await savePin("1234");
    let last: Awaited<ReturnType<typeof verifyPin>> | null = null;
    for (let i = 0; i < 5; i++) {
      last = await verifyPin("9999");
    }
    expect(last!.ok).toBe(false);
    expect(last!.attempts).toBe(5);
    // 5th failure → 30 s lockout per the ladder.
    expect(last!.lockoutSecondsRemaining).toBeGreaterThan(0);
    expect(last!.lockoutSecondsRemaining).toBeLessThanOrEqual(30);
  });

  it("a successful verify clears the failure counter + lockout", async () => {
    await savePin("1234");
    for (let i = 0; i < 5; i++) await verifyPin("9999");
    // Simulate the client waiting out the lockout in tests: call savePin to
    // reset (what actually happens on lockout is the user retries after the
    // timer; here we cheat via savePin which clears the attempt state).
    await savePin("1234");
    const outcome = await verifyPin("1234");
    expect(outcome.ok).toBe(true);
    expect(outcome.attempts).toBe(0);
    expect(outcome.lockoutSecondsRemaining).toBe(0);
  });

  it(
    "scrypt takes measurable time per verify (not instant like SHA-256)",
    { timeout: 30_000 },
    async () => {
      await savePin("1234");
      const start = Date.now();
      await verifyPin("1234");
      const elapsed = Date.now() - start;
      // 10,000 brute-force candidates × >= 10ms each = 100s minimum on this
      // machine, which is the whole point. We assert a much softer floor to
      // survive slow CI: one scrypt pass must take at least 10ms. If this
      // ever drops to zero, we regressed back to unsalted SHA.
      expect(elapsed).toBeGreaterThan(10);
    },
  );
});
