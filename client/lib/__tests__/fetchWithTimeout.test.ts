import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithTimeout } from "../fetchWithTimeout";

const originalFetch = global.fetch;

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it("aborts a request that never settles once the deadline passes", async () => {
    global.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;

    const pending = fetchWithTimeout("https://example.test/x", {}, 1_000);
    const assertion = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
  });

  it("resolves normally and clears its timer when the request completes", async () => {
    const response = { ok: true } as Response;
    global.fetch = vi.fn(async () => response) as unknown as typeof fetch;

    const result = await fetchWithTimeout("https://example.test/x", {}, 1_000);
    expect(result).toBe(response);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("honours a caller signal that is already aborted", async () => {
    let seenSignal: AbortSignal | undefined;
    global.fetch = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        seenSignal = init?.signal ?? undefined;
        return { ok: true } as Response;
      },
    ) as unknown as typeof fetch;

    const external = new AbortController();
    external.abort();
    await fetchWithTimeout("https://example.test/x", {
      signal: external.signal,
    });
    expect(seenSignal?.aborted).toBe(true);
  });

  it("forwards a later caller abort to the request signal", async () => {
    let seenSignal: AbortSignal | undefined;
    global.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          seenSignal = init?.signal ?? undefined;
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;

    const external = new AbortController();
    const pending = fetchWithTimeout("https://example.test/x", {
      signal: external.signal,
    });
    const assertion = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    external.abort();
    await assertion;
    expect(seenSignal?.aborted).toBe(true);
  });
});
