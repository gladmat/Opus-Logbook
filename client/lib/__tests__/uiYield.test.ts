import { describe, expect, it, vi } from "vitest";

import { mapInBatches } from "../uiYield";

vi.mock("react-native", () => ({
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      callback();
      return { cancel: vi.fn() };
    },
  },
}));

describe("mapInBatches", () => {
  it("returns an empty array without invoking the worker", async () => {
    const worker = vi.fn(async (n: number) => n);
    expect(await mapInBatches([], 3, worker)).toEqual([]);
    expect(worker).not.toHaveBeenCalled();
  });

  it("preserves order and passes the global index", async () => {
    const seen: number[] = [];
    const out = await mapInBatches([10, 20, 30, 40, 50], 2, async (n, i) => {
      seen.push(i);
      return n * 2;
    });
    expect(out).toEqual([20, 40, 60, 80, 100]);
    expect(seen).toEqual([0, 1, 2, 3, 4]);
  });

  it("never runs more than batchSize workers concurrently", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapInBatches([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
    });
    expect(peak).toBe(3);
  });

  it("clamps a non-positive batch size to 1", async () => {
    let peak = 0;
    let inFlight = 0;
    await mapInBatches([1, 2, 3], 0, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
    });
    expect(peak).toBe(1);
  });

  it("propagates a worker rejection", async () => {
    await expect(
      mapInBatches([1, 2], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});
