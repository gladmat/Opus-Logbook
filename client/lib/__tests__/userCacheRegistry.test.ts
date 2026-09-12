import { describe, expect, it, vi } from "vitest";

import {
  clearRegisteredUserCaches,
  registerUserCache,
  registeredUserCacheCount,
} from "../userCacheRegistry";

describe("userCacheRegistry", () => {
  it("runs every registered clearer and supports unregistering", () => {
    const a = vi.fn();
    const b = vi.fn();
    const before = registeredUserCacheCount();
    const unregisterA = registerUserCache(a);
    registerUserCache(b);
    expect(registeredUserCacheCount()).toBe(before + 2);

    clearRegisteredUserCaches();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    unregisterA();
    clearRegisteredUserCaches();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it("keeps clearing when one clearer throws", () => {
    const bad = vi.fn(() => {
      throw new Error("nope");
    });
    const good = vi.fn();
    const unBad = registerUserCache(bad);
    const unGood = registerUserCache(good);
    expect(() => clearRegisteredUserCaches()).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    unBad();
    unGood();
  });
});
