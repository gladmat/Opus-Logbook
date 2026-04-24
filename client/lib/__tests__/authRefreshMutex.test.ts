import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Seed a fake token so `refreshToken` proceeds past the early-return guard.
vi.mock("expo-secure-store", () => {
  const store = new Map<string, string>([
    ["surgical_logbook_auth_token", "fake-old-token"],
  ]);
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

// react-native-web's `Platform.OS === "web"` routes the secureStorage wrapper
// through AsyncStorage under Vitest, so we seed the token here too.
vi.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>([
    ["surgical_logbook_auth_token", "fake-old-token"],
  ]);
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

vi.mock("../query-client", () => ({
  getApiUrl: () => "http://localhost:5001",
}));

describe("refreshToken single-flight mutex", () => {
  let fetchCalls: number;

  beforeEach(() => {
    fetchCalls = 0;
    // Each fetch returns a new token after a small delay so we can observe
    // concurrent calls.
    global.fetch = vi.fn(async () => {
      fetchCalls++;
      await new Promise((r) => setTimeout(r, 30));
      return new Response(
        JSON.stringify({ token: `refreshed-token-${fetchCalls}` }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;
  });

  afterEach(async () => {
    const mod = await import("../auth");
    mod.__resetRefreshMutexForTests();
  });

  it("deduplicates parallel refresh calls into a single HTTP request", async () => {
    const { refreshToken } = await import("../auth");
    const [a, b, c, d] = await Promise.all([
      refreshToken(),
      refreshToken(),
      refreshToken(),
      refreshToken(),
    ]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(c).toBe(true);
    expect(d).toBe(true);
    // THE assertion: all four callers awaited the same in-flight promise
    // rather than independently POSTing /api/auth/refresh and racing to
    // overwrite the stored token.
    expect(fetchCalls).toBe(1);
  });

  it("allows a new refresh once the previous one settles", async () => {
    const { refreshToken } = await import("../auth");
    await refreshToken();
    expect(fetchCalls).toBe(1);

    await refreshToken();
    expect(fetchCalls).toBe(2);
  });
});
