import { describe, it, expect } from "vitest";
import {
  today,
  notFutureMax,
  dobFloor,
  endOfTodayLocal,
  relativeMin,
} from "@/lib/dateBounds";
import { isValidDateInstance, toIsoDateValue } from "@/lib/dateValues";

describe("dateBounds", () => {
  it("today() returns a fresh valid Date each call", () => {
    const a = today();
    const b = today();
    expect(isValidDateInstance(a)).toBe(true);
    expect(isValidDateInstance(b)).toBe(true);
    expect(a).not.toBe(b); // distinct instances
  });

  it("notFutureMax() is a valid Date at (or before) now", () => {
    const max = notFutureMax();
    expect(isValidDateInstance(max)).toBe(true);
    expect(max.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("dobFloor() is 1 Jan 1900 local", () => {
    const floor = dobFloor();
    expect(floor.getFullYear()).toBe(1900);
    expect(floor.getMonth()).toBe(0);
    expect(floor.getDate()).toBe(1);
  });

  it("endOfTodayLocal() is 23:59:59.999 local today", () => {
    const end = endOfTodayLocal();
    const now = new Date();
    expect(end.getFullYear()).toBe(now.getFullYear());
    expect(end.getMonth()).toBe(now.getMonth());
    expect(end.getDate()).toBe(now.getDate());
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it("a same-day procedure (local-noon) is not after endOfTodayLocal()", () => {
    // Mirrors the procedureDate non-future check: today's date parsed at local
    // noon must compare as <= end-of-today regardless of timezone.
    const todayIso = toIsoDateValue(new Date());
    const localNoon = new Date(
      Number(todayIso.slice(0, 4)),
      Number(todayIso.slice(5, 7)) - 1,
      Number(todayIso.slice(8, 10)),
      12,
      0,
      0,
      0,
    );
    expect(localNoon.getTime()).toBeLessThanOrEqual(
      endOfTodayLocal().getTime(),
    );
  });

  it("relativeMin returns undefined for empty/invalid and a Date for valid", () => {
    expect(relativeMin(undefined)).toBeUndefined();
    expect(relativeMin("")).toBeUndefined();
    expect(relativeMin("not-a-date")).toBeUndefined();
    const min = relativeMin("2026-01-10");
    expect(min).toBeInstanceOf(Date);
    expect(toIsoDateValue(min as Date)).toBe("2026-01-10");
  });
});
