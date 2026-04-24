import { describe, expect, it } from "vitest";

import {
  clampIndex,
  formatCounter,
  formatMediaDate,
} from "@/components/media/mediaGalleryHelpers";

describe("MediaGalleryViewer helpers", () => {
  describe("clampIndex", () => {
    it("returns 0 for negative input", () => {
      expect(clampIndex(-1, 5)).toBe(0);
      expect(clampIndex(-100, 5)).toBe(0);
    });

    it("returns last index when input exceeds total", () => {
      expect(clampIndex(10, 5)).toBe(4);
      expect(clampIndex(5, 5)).toBe(4);
    });

    it("passes through a valid index", () => {
      expect(clampIndex(0, 5)).toBe(0);
      expect(clampIndex(3, 5)).toBe(3);
      expect(clampIndex(4, 5)).toBe(4);
    });

    it("returns 0 for empty collection or non-finite input", () => {
      expect(clampIndex(2, 0)).toBe(0);
      expect(clampIndex(Number.NaN, 5)).toBe(0);
      expect(clampIndex(Number.POSITIVE_INFINITY, 5)).toBe(0);
    });

    it("floors fractional input", () => {
      expect(clampIndex(2.7, 5)).toBe(2);
    });
  });

  describe("formatCounter", () => {
    it("formats index and total as 1-based counter", () => {
      expect(formatCounter(0, 12)).toBe("1 / 12");
      expect(formatCounter(2, 12)).toBe("3 / 12");
      expect(formatCounter(11, 12)).toBe("12 / 12");
    });

    it("returns empty string for empty collection", () => {
      expect(formatCounter(0, 0)).toBe("");
    });

    it("clamps out-of-range index before formatting", () => {
      expect(formatCounter(99, 3)).toBe("3 / 3");
      expect(formatCounter(-5, 3)).toBe("1 / 3");
    });
  });

  describe("formatMediaDate", () => {
    it("returns null for missing or invalid input", () => {
      expect(formatMediaDate()).toBeNull();
      expect(formatMediaDate("")).toBeNull();
      expect(formatMediaDate("not-a-date")).toBeNull();
    });

    it("formats a valid ISO timestamp", () => {
      const result = formatMediaDate("2026-03-15T09:30:00Z");
      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
    });
  });
});
