import { describe, expect, it } from "vitest";
import {
  COUPLER_SIZES,
  collectCouplerSizes,
  describeCoupling,
  formatCouplerSize,
  parseCouplerSize,
} from "@/lib/anastomosisHelpers";
import type { AnastomosisEntry } from "@/types/case";

function vein(partial: Partial<AnastomosisEntry>): AnastomosisEntry {
  return {
    id: "v",
    vesselType: "vein",
    recipientVesselName: "IMV",
    ...partial,
  };
}

describe("coupler size round-trip", () => {
  it("every picker option survives parse → format unchanged (regression: 2.0/3.0/4.0 rendered as Select...)", () => {
    for (const option of COUPLER_SIZES) {
      expect(formatCouplerSize(parseCouplerSize(option))).toBe(option);
    }
  });

  it("formats whole numbers with one decimal", () => {
    expect(formatCouplerSize(2)).toBe("2.0");
    expect(formatCouplerSize(3)).toBe("3.0");
    expect(formatCouplerSize(2.5)).toBe("2.5");
  });

  it("returns empty for absent / non-finite values", () => {
    expect(formatCouplerSize(undefined)).toBe("");
    expect(formatCouplerSize(null)).toBe("");
    expect(formatCouplerSize(Number.NaN)).toBe("");
  });
});

describe("describeCoupling", () => {
  it("renders coupler with size", () => {
    expect(
      describeCoupling(vein({ couplingMethod: "coupler", couplerSizeMm: 2 })),
    ).toBe("Coupler 2.0 mm");
  });

  it("renders coupler without size when unset", () => {
    expect(describeCoupling(vein({ couplingMethod: "coupler" }))).toBe(
      "Coupler",
    );
  });

  it("renders hand-sewn / hybrid labels without a size", () => {
    expect(
      describeCoupling(vein({ couplingMethod: "hand_sewn", couplerSizeMm: 2 })),
    ).toBe("Hand-sewn");
    expect(describeCoupling(vein({ couplingMethod: "hybrid" }))).toBe("Hybrid");
  });

  it("returns empty when no coupling method recorded", () => {
    expect(describeCoupling(vein({}))).toBe("");
  });
});

describe("collectCouplerSizes (audit report column)", () => {
  it("joins coupler sizes across entries, skipping non-coupler entries", () => {
    expect(
      collectCouplerSizes([
        vein({ id: "a", couplingMethod: "hand_sewn", couplerSizeMm: 9 }),
        vein({ id: "b", couplingMethod: "coupler", couplerSizeMm: 2.5 }),
        vein({ id: "c", couplingMethod: "coupler", couplerSizeMm: 3 }),
      ]),
    ).toBe("2.5; 3.0");
  });

  it("falls back to the legacy case-level size when no entry carries one", () => {
    expect(
      collectCouplerSizes([vein({ couplingMethod: "coupler" })], 2.5),
    ).toBe("2.5");
    expect(collectCouplerSizes(undefined, 2)).toBe("2.0");
    expect(collectCouplerSizes([], undefined)).toBe("");
  });
});
