import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PERF_LOG_THRESHOLD_MS,
  perfMark,
  perfSpan,
  perfSpanSync,
} from "../perfTrace";

describe("perfTrace", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let nowSpy: ReturnType<typeof vi.spyOn>;
  let clock = 0;

  beforeEach(() => {
    clock = 0;
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    nowSpy = vi.spyOn(performance, "now").mockImplementation(() => clock);
  });

  afterEach(() => {
    log.mockRestore();
    nowSpy.mockRestore();
  });

  it("logs nothing for a span under the threshold", async () => {
    await perfSpan("fast", async () => {
      clock += PERF_LOG_THRESHOLD_MS - 1;
      return 1;
    });
    expect(log).not.toHaveBeenCalled();
  });

  it("logs a named span at or above the threshold and returns the value", async () => {
    const value = await perfSpan("slow", async () => {
      clock += PERF_LOG_THRESHOLD_MS;
      return "v";
    });
    expect(value).toBe("v");
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[perf\] slow \d+\.\dms$/),
    );
  });

  it("still logs and rethrows when the operation fails", async () => {
    await expect(
      perfSpan("failing", async () => {
        clock += 100;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(log).toHaveBeenCalledWith(expect.stringContaining("[perf] failing"));
  });

  it("perfSpanSync times synchronous work", () => {
    const out = perfSpanSync("sync", () => {
      clock += 50;
      return 7;
    });
    expect(out).toBe(7);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("[perf] sync"));
  });

  it("perfMark reports once even if ended twice", () => {
    const end = perfMark("mark");
    clock += 40;
    end();
    end();
    expect(log).toHaveBeenCalledTimes(1);
  });
});
