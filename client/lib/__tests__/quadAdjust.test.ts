import { describe, it, expect } from "vitest";
import {
  computeContainRect,
  clamp01,
  normalizedToLayout,
  layoutToNormalized,
  defaultQuad,
  QUAD_CORNER_KEYS,
} from "../quadAdjust";

describe("computeContainRect", () => {
  it("letterboxes a wide image in a tall container (centered vertically)", () => {
    const rect = computeContainRect(
      { width: 400, height: 800 },
      { width: 1600, height: 1200 },
    );
    expect(rect).toEqual({ x: 0, y: 250, width: 400, height: 300 });
  });

  it("pillarboxes a tall image in a wide container (centered horizontally)", () => {
    const rect = computeContainRect(
      { width: 800, height: 400 },
      { width: 1200, height: 1600 },
    );
    expect(rect).toEqual({ x: 250, y: 0, width: 300, height: 400 });
  });

  it("fills exactly when aspect ratios match", () => {
    const rect = computeContainRect(
      { width: 400, height: 300 },
      { width: 1600, height: 1200 },
    );
    expect(rect).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });

  it("returns a zero rect for degenerate inputs", () => {
    expect(
      computeContainRect({ width: 0, height: 100 }, { width: 10, height: 10 }),
    ).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(
      computeContainRect({ width: 100, height: 100 }, { width: 0, height: 10 }),
    ).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe("normalized ↔ layout mapping", () => {
  const rect = { x: 50, y: 100, width: 300, height: 200 };

  it("maps corners of normalized space to the rect corners", () => {
    expect(normalizedToLayout({ x: 0, y: 0 }, rect)).toEqual({ x: 50, y: 100 });
    expect(normalizedToLayout({ x: 1, y: 1 }, rect)).toEqual({
      x: 350,
      y: 300,
    });
  });

  it("round-trips interior points", () => {
    const p = { x: 0.25, y: 0.75 };
    const layout = normalizedToLayout(p, rect);
    const back = layoutToNormalized(layout, rect);
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });

  it("clamps layout points outside the image into 0..1", () => {
    expect(layoutToNormalized({ x: 0, y: 0 }, rect)).toEqual({ x: 0, y: 0 });
    expect(layoutToNormalized({ x: 1000, y: 1000 }, rect)).toEqual({
      x: 1,
      y: 1,
    });
  });

  it("degenerate rect maps to origin instead of NaN", () => {
    expect(
      layoutToNormalized({ x: 10, y: 10 }, { x: 0, y: 0, width: 0, height: 0 }),
    ).toEqual({ x: 0, y: 0 });
  });
});

describe("clamp01", () => {
  it("clamps below, above, and passes through", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.42)).toBe(0.42);
  });
});

describe("defaultQuad", () => {
  it("insets all four corners symmetrically", () => {
    const q = defaultQuad(0.1);
    expect(q.topLeft).toEqual({ x: 0.1, y: 0.1 });
    expect(q.topRight).toEqual({ x: 0.9, y: 0.1 });
    expect(q.bottomRight).toEqual({ x: 0.9, y: 0.9 });
    expect(q.bottomLeft).toEqual({ x: 0.1, y: 0.9 });
  });

  it("corner key order matches the native module contract", () => {
    expect(QUAD_CORNER_KEYS).toEqual([
      "topLeft",
      "topRight",
      "bottomRight",
      "bottomLeft",
    ]);
  });
});
