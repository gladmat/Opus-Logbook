import { describe, it, expect } from "vitest";
import {
  formatTimeInput,
  finalizeTimeInput,
  timeStringToDate,
  dateToTimeString,
} from "@/lib/timeInput";

describe("formatTimeInput", () => {
  it("passes through partial hour entries", () => {
    expect(formatTimeInput("")).toBe("");
    expect(formatTimeInput("8")).toBe("8");
    expect(formatTimeInput("14")).toBe("14");
  });

  it("rejects impossible two-digit hours by keeping the first digit", () => {
    expect(formatTimeInput("29")).toBe("2");
    expect(formatTimeInput("77")).toBe("7");
  });

  it("inserts the colon at three digits", () => {
    expect(formatTimeInput("083")).toBe("08:3");
    expect(formatTimeInput("143")).toBe("14:3");
    // 8:30 typed as single-digit hour
    expect(formatTimeInput("830")).toBe("08:30");
  });

  it("formats four digits with 24h validation", () => {
    expect(formatTimeInput("0830")).toBe("08:30");
    expect(formatTimeInput("1415")).toBe("14:15");
    expect(formatTimeInput("2359")).toBe("23:59");
    // hours > 23 → single-digit hour interpretation
    expect(formatTimeInput("8300")).toBe("08:30");
  });

  it("clamps minutes above 59", () => {
    expect(formatTimeInput("1499")).toBe("14:59");
  });

  it("strips punctuation before formatting", () => {
    expect(formatTimeInput("14:15")).toBe("14:15");
    expect(formatTimeInput("14.15")).toBe("14:15");
    expect(formatTimeInput("8:")).toBe("8");
  });
});

describe("finalizeTimeInput", () => {
  it("pads partial entries to full HH:MM on blur", () => {
    expect(finalizeTimeInput("8")).toBe("08:00");
    expect(finalizeTimeInput("14")).toBe("14:00");
    expect(finalizeTimeInput("14:3")).toBe("14:30");
  });

  it("is robust to stray punctuation", () => {
    expect(finalizeTimeInput("8:")).toBe("08:00");
    expect(finalizeTimeInput("14.")).toBe("14:00");
    expect(finalizeTimeInput(":")).toBe("");
  });

  it("keeps complete values unchanged", () => {
    expect(finalizeTimeInput("08:30")).toBe("08:30");
    expect(finalizeTimeInput("23:59")).toBe("23:59");
  });

  it("returns empty for empty input", () => {
    expect(finalizeTimeInput("")).toBe("");
  });
});

describe("timeStringToDate / dateToTimeString", () => {
  it("round-trips a valid HH:MM through a Date", () => {
    expect(dateToTimeString(timeStringToDate("08:30"))).toBe("08:30");
    expect(dateToTimeString(timeStringToDate("23:59"))).toBe("23:59");
    expect(dateToTimeString(timeStringToDate("00:00"))).toBe("00:00");
  });

  it("falls back to neutral midday for absent or partial values", () => {
    expect(dateToTimeString(timeStringToDate(""))).toBe("12:00");
    expect(dateToTimeString(timeStringToDate("8"))).toBe("12:00");
    expect(dateToTimeString(timeStringToDate("25:00"))).toBe("12:00");
  });
});
