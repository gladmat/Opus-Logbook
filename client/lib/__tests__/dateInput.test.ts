import { describe, it, expect } from "vitest";
import {
  formatDateInput,
  parseDateInput,
  describeDateInputError,
  maskedToIso,
  isoToMasked,
} from "@/lib/dateInput";

describe("formatDateInput", () => {
  it("passes through partial day entries", () => {
    expect(formatDateInput("")).toBe("");
    expect(formatDateInput("1")).toBe("1");
    expect(formatDateInput("3")).toBe("3");
    expect(formatDateInput("0")).toBe("0");
  });

  it("inserts the separator after a complete day", () => {
    expect(formatDateInput("15")).toBe("15/");
    expect(formatDateInput("31")).toBe("31/");
    expect(formatDateInput("01")).toBe("01/");
  });

  it("force-pads single-digit days with impossible tens digits", () => {
    expect(formatDateInput("4")).toBe("04/");
    expect(formatDateInput("9")).toBe("09/");
  });

  it("rejects impossible two-digit days by keeping the first digit", () => {
    expect(formatDateInput("32")).toBe("3");
    expect(formatDateInput("39")).toBe("3");
    expect(formatDateInput("00")).toBe("0");
  });

  it("passes through partial month entries", () => {
    expect(formatDateInput("150")).toBe("15/0");
    expect(formatDateInput("151")).toBe("15/1");
  });

  it("inserts the separator after a complete month", () => {
    expect(formatDateInput("1501")).toBe("15/01/");
    expect(formatDateInput("1512")).toBe("15/12/");
  });

  it("force-pads single-digit months with impossible tens digits", () => {
    expect(formatDateInput("152")).toBe("15/02/");
    expect(formatDateInput("159")).toBe("15/09/");
  });

  it("rejects impossible two-digit months by keeping the first digit", () => {
    expect(formatDateInput("1513")).toBe("15/1");
    expect(formatDateInput("1500")).toBe("15/0");
  });

  it("appends year digits progressively", () => {
    expect(formatDateInput("15012")).toBe("15/01/2");
    expect(formatDateInput("150120")).toBe("15/01/20");
    expect(formatDateInput("15012003")).toBe("15/01/2003");
  });

  it("combines force-pads across day and month", () => {
    expect(formatDateInput("4122003")).toBe("04/12/2003");
    expect(formatDateInput("452003")).toBe("04/05/2003");
  });

  it("documents greedy two-digit ambiguity: 1122003 is 11 Feb, not 1 Dec", () => {
    expect(formatDateInput("1122003")).toBe("11/02/2003");
  });

  it("strips punctuation before formatting", () => {
    expect(formatDateInput("15/01/2003")).toBe("15/01/2003");
    expect(formatDateInput("15.01.2003")).toBe("15/01/2003");
    expect(formatDateInput("15-01-2003")).toBe("15/01/2003");
    expect(formatDateInput("15/")).toBe("15/");
  });

  it("caps input at eight effective digits", () => {
    expect(formatDateInput("150120039")).toBe("15/01/2003");
    expect(formatDateInput("15012003999")).toBe("15/01/2003");
  });
});

describe("parseDateInput", () => {
  it("returns empty for blank input", () => {
    expect(parseDateInput("").status).toBe("empty");
    expect(parseDateInput("//").status).toBe("empty");
  });

  it("returns incomplete for partial entries without padding them", () => {
    expect(parseDateInput("15/01/2").status).toBe("incomplete");
    expect(parseDateInput("15").status).toBe("incomplete");
    expect(parseDateInput("1501200").status).toBe("incomplete");
  });

  it("rejects impossible calendar dates", () => {
    expect(parseDateInput("31/02/2003").status).toBe("invalid");
    expect(parseDateInput("29/02/2003").status).toBe("invalid"); // non-leap
    expect(parseDateInput("00/01/2003").status).toBe("invalid");
  });

  it("accepts leap-day dates in leap years", () => {
    const result = parseDateInput("29/02/2004");
    expect(result.status).toBe("valid");
    expect(result.iso).toBe("2004-02-29");
  });

  it("parses a complete valid date to canonical ISO", () => {
    const result = parseDateInput("15/01/2003");
    expect(result.status).toBe("valid");
    expect(result.iso).toBe("2003-01-15");
    expect(result.date?.getFullYear()).toBe(2003);
    expect(result.date?.getMonth()).toBe(0);
    expect(result.date?.getDate()).toBe(15);
  });

  it("accepts raw digit input as well as masked input", () => {
    expect(parseDateInput("15012003").iso).toBe("2003-01-15");
  });

  it("flags dates before the minimum bound", () => {
    const result = parseDateInput("15/01/1899", {
      minimumDate: new Date(1900, 0, 1),
    });
    expect(result.status).toBe("before_min");
    expect(result.iso).toBe("1899-01-15");
  });

  it("flags dates after the maximum bound", () => {
    const result = parseDateInput("16/07/2026", {
      maximumDate: new Date(2026, 6, 15, 9, 30),
    });
    expect(result.status).toBe("after_max");
    expect(result.iso).toBe("2026-07-16");
  });

  it("accepts a date equal to the maximum bound's calendar day even when the bound has a morning time", () => {
    // Regression: typed dates parse to local noon; a getTime() comparison
    // against a morning `new Date()` maximum would wrongly reject "today".
    const result = parseDateInput("15/07/2026", {
      maximumDate: new Date(2026, 6, 15, 9, 30),
    });
    expect(result.status).toBe("valid");
    expect(result.iso).toBe("2026-07-15");
  });

  it("accepts a date equal to the minimum bound's calendar day", () => {
    const result = parseDateInput("01/01/1900", {
      minimumDate: new Date(1900, 0, 1),
    });
    expect(result.status).toBe("valid");
  });

  it("ignores invalid bound instances", () => {
    const result = parseDateInput("15/01/2003", {
      maximumDate: new Date(NaN),
    });
    expect(result.status).toBe("valid");
  });
});

describe("describeDateInputError", () => {
  it("returns null for empty and valid results", () => {
    expect(describeDateInputError(parseDateInput(""))).toBeNull();
    expect(describeDateInputError(parseDateInput("15/01/2003"))).toBeNull();
  });

  it("describes incomplete entries", () => {
    expect(describeDateInputError(parseDateInput("15/01"))).toBe(
      "Enter date as DD/MM/YYYY",
    );
  });

  it("describes impossible dates", () => {
    expect(describeDateInputError(parseDateInput("31/02/2003"))).toBe(
      "Invalid date — check day and month",
    );
  });

  it("describes below-minimum dates with the bound", () => {
    const bounds = { minimumDate: new Date(1900, 0, 1) };
    expect(
      describeDateInputError(parseDateInput("15/01/1899", bounds), bounds),
    ).toBe("Date must be 01/01/1900 or later");
  });

  it("uses the future-specific message when the maximum is today", () => {
    const bounds = { maximumDate: new Date() };
    expect(
      describeDateInputError(parseDateInput("01/01/2099", bounds), bounds),
    ).toBe("Date cannot be in the future");
  });

  it("names the bound when the maximum is not today", () => {
    const bounds = { maximumDate: new Date(2020, 5, 30) };
    expect(
      describeDateInputError(parseDateInput("01/07/2020", bounds), bounds),
    ).toBe("Date must be 30/06/2020 or earlier");
  });
});

describe("maskedToIso / isoToMasked", () => {
  it("round-trips a canonical value through the mask", () => {
    expect(isoToMasked("2003-01-15")).toBe("15/01/2003");
    expect(maskedToIso("15/01/2003")).toBe("2003-01-15");
    expect(maskedToIso(isoToMasked("2004-02-29"))).toBe("2004-02-29");
  });

  it("maskedToIso returns null for anything but a real complete date", () => {
    expect(maskedToIso("")).toBeNull();
    expect(maskedToIso("15/01/2")).toBeNull();
    expect(maskedToIso("31/02/2003")).toBeNull();
  });

  it("isoToMasked tolerates legacy ISO timestamps", () => {
    expect(isoToMasked("2003-01-15T00:00:00.000Z")).toBe("15/01/2003");
  });

  it("isoToMasked renders garbage as an empty field", () => {
    expect(isoToMasked("not-a-date")).toBe("");
    expect(isoToMasked(undefined)).toBe("");
    expect(isoToMasked(null)).toBe("");
  });
});
