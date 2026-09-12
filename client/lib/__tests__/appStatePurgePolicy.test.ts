import { describe, expect, it } from "vitest";

import { resolvePurgeAction } from "../appStatePurgePolicy";

describe("resolvePurgeAction", () => {
  it("purges only on real backgrounding", () => {
    expect(resolvePurgeAction("background")).toBe("purge");
  });

  it("keeps caches through transient inactive blips and on return", () => {
    expect(resolvePurgeAction("inactive")).toBe("none");
    expect(resolvePurgeAction("active")).toBe("none");
    expect(resolvePurgeAction("unknown")).toBe("none");
    expect(resolvePurgeAction("extension")).toBe("none");
  });
});
