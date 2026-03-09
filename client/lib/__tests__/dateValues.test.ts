import { describe, expect, it } from "vitest";

import {
  clampDateToBounds,
  isValidDateInstance,
  normalizeDateOnlyValue,
  parseIsoDateValue,
  sanitizeDateBounds,
  toIsoDateValue,
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

  it("returns undefined for invalid date-only strings", () => {
    expect(normalizeDateOnlyValue("not-a-date")).toBeUndefined();
    expect(normalizeDateOnlyValue("1987-02-31T06:30:00.000Z")).toBeUndefined();
  });

  it("round-trips dates back to ISO strings", () => {
    const parsed = parseIsoDateValue("1976-11-08");

    expect(parsed).not.toBeNull();
    expect(toIsoDateValue(parsed!)).toBe("1976-11-08");
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
});
