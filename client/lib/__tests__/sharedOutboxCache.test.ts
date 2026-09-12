import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../query-client", () => ({ getApiUrl: () => "https://api.test" }));
vi.mock("../auth", () => ({ getAuthToken: async () => "tok" }));
vi.mock("@shared/phone", () => ({ normalizePhoneE164: (v: string) => v }));
vi.mock("@shared/professionalRegistrations", () => ({
  buildRegistrationLookupKey: (a: string, b: string) => `${a}:${b}`,
}));

const originalFetch = global.fetch;

const {
  getSharedOutboxCached,
  clearSharedOutboxCache,
  SHARED_OUTBOX_CACHE_TTL_MS,
} = await import("../sharingApi");

describe("getSharedOutboxCached", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearSharedOutboxCache();
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ id: "s1" }],
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("coalesces concurrent callers into one request and serves the TTL window from memory", async () => {
    const [a, b] = await Promise.all([
      getSharedOutboxCached(),
      getSharedOutboxCached(),
    ]);
    expect(a).toEqual([{ id: "s1" }]);
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await getSharedOutboxCached();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches once the TTL has elapsed", async () => {
    await getSharedOutboxCached();
    await getSharedOutboxCached(
      SHARED_OUTBOX_CACHE_TTL_MS,
      Date.now() + SHARED_OUTBOX_CACHE_TTL_MS + 1,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clearSharedOutboxCache forces a refetch", async () => {
    await getSharedOutboxCached();
    clearSharedOutboxCache();
    await getSharedOutboxCached();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("a failed request is not cached", async () => {
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    await expect(getSharedOutboxCached()).rejects.toThrow();
    await getSharedOutboxCached();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
