import { describe, expect, it } from "vitest";

import {
  clampDateToBounds,
  isValidDateInstance,
  normalizeDateOnlyValue,
  normalizeIsoTimestampValue,
  parseIsoDateValue,
  resolveEventDisplayDate,
  sanitizeDateBounds,
  toIsoDateValue,
  toUtcNoonIsoTimestamp,
} from "@/lib/dateValues";

describe("dateValues", () => {
  it("parses valid ISO dates before the year 2000", () => {
    const parsed = parseIsoDateValue("1987-04-12");

    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(1987);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(12);
  });

  it("rejects structurally invalid dates", () => {
    expect(parseIsoDateValue("1987-02-31")).toBeNull();
    expect(parseIsoDateValue("not-a-date")).toBeNull();
  });

  it("normalizes legacy ISO timestamps to date-only values", () => {
    expect(normalizeDateOnlyValue("1987-04-12T06:30:00.000Z")).toBe(
      "1987-04-12",
    );
    expect(normalizeDateOnlyValue("1987-04-12 06:30:00")).toBe("1987-04-12");
  });

  it("normalizes legacy numeric timestamps for date-only picker inputs", () => {
    expect(normalizeDateOnlyValue("545207400")).toBe("1987-04-12");
    expect(normalizeDateOnlyValue("1773144000000")).toBe("2026-03-10");
  });

  it("rejects ambiguous short numeric strings instead of treating them as epoch dates", () => {
    expect(normalizeDateOnlyValue("20260310")).toBeUndefined();
    expect(normalizeIsoTimestampValue("20260310")).toBeUndefined();
  });

  it("returns undefined for invalid date-only strings", () => {
    expect(normalizeDateOnlyValue("not-a-date")).toBeUndefined();
    expect(normalizeDateOnlyValue("1987-02-31T06:30:00.000Z")).toBeUndefined();
  });

  it("round-trips dates back to ISO strings", () => {
    const parsed = parseIsoDateValue("1976-11-08");

    expect(parsed).not.toBeNull();
    expect(toIsoDateValue(parsed!)).toBe("1976-11-08");
  });

  it("builds stable UTC-noon timestamps for date-only values", () => {
    expect(toUtcNoonIsoTimestamp("1976-11-08")).toBe(
      "1976-11-08T12:00:00.000Z",
    );
  });

  it("normalizes valid numeric epoch timestamps to ISO timestamps", () => {
    expect(normalizeIsoTimestampValue("545207400")).toBe(
      "1987-04-12T06:30:00.000Z",
    );
    expect(normalizeIsoTimestampValue("1773144000000")).toBe(
      "2026-03-10T12:00:00.000Z",
    );
  });

  it("rejects invalid Date instances", () => {
    expect(isValidDateInstance(new Date("invalid"))).toBe(false);
    expect(isValidDateInstance(new Date("1987-04-12T00:00:00.000Z"))).toBe(
      true,
    );
  });

  it("drops invalid or inverted picker bounds", () => {
    const invalidDate = new Date("invalid");
    expect(
      sanitizeDateBounds(invalidDate, new Date("1987-04-12T00:00:00.000Z")),
    ).toEqual({
      maximumDate: new Date("1987-04-12T00:00:00.000Z"),
      minimumDate: undefined,
    });

    expect(
      sanitizeDateBounds(
        new Date("1987-04-13T00:00:00.000Z"),
        new Date("1987-04-12T00:00:00.000Z"),
      ),
    ).toEqual({});
  });

  it("clamps picker dates to safe bounds", () => {
    const clamped = clampDateToBounds(
      new Date("1987-04-10T00:00:00.000Z"),
      new Date("1987-04-12T00:00:00.000Z"),
      new Date("1987-04-20T00:00:00.000Z"),
    );

    expect(toIsoDateValue(clamped)).toBe("1987-04-12");
  });

  describe("resolveEventDisplayDate", () => {
    it("maps UTC-noon date anchors to their UTC calendar date in every timezone", () => {
      // toUtcNoonIsoTimestamp("2026-07-20") stores 2026-07-20T12:00:00.000Z.
      // In UTC+12/+13 (NZ) that instant is local midnight of 21 July, so
      // formatting the raw Date shows the NEXT day. The resolver must return
      // a local-noon Date whose calendar components read 20 July regardless
      // of the host timezone (these assertions are TZ-invariant; on a
      // Pacific/Auckland host they exercise the exact reported regression).
      const anchor = toUtcNoonIsoTimestamp("2026-07-20");
      expect(anchor).toBe("2026-07-20T12:00:00.000Z");

      const resolved = resolveEventDisplayDate(anchor);
      expect(resolved).not.toBeNull();
      expect(resolved?.getFullYear()).toBe(2026);
      expect(resolved?.getMonth()).toBe(6);
      expect(resolved?.getDate()).toBe(20);
      // Local noon — never within DST/offset reach of a date boundary.
      expect(resolved?.getHours()).toBe(12);
    });

    it("normalizes offset-form UTC-noon anchors too", () => {
      const resolved = resolveEventDisplayDate("2026-07-21T00:00:00+12:00");
      expect(resolved?.getDate()).toBe(20);
      expect(resolved?.getMonth()).toBe(6);
      expect(resolved?.getHours()).toBe(12);
    });

    it("preserves real wall-clock timestamps exactly", () => {
      const instant = "2026-03-15T09:30:00.000Z";
      const resolved = resolveEventDisplayDate(instant);
      expect(resolved?.getTime()).toBe(Date.parse(instant));
    });

    it("resolves bare date-only values to local noon", () => {
      const resolved = resolveEventDisplayDate("2026-07-20");
      expect(resolved?.getDate()).toBe(20);
      expect(resolved?.getMonth()).toBe(6);
      expect(resolved?.getHours()).toBe(12);
    });

    it("returns null for missing or unparseable input", () => {
      expect(resolveEventDisplayDate(undefined)).toBeNull();
      expect(resolveEventDisplayDate(null)).toBeNull();
      expect(resolveEventDisplayDate("")).toBeNull();
      expect(resolveEventDisplayDate("not-a-date")).toBeNull();
    });
  });
});
