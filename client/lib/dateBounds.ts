// Date-picker bounds policy layer.
//
// `dateValues.ts` owns parsing/normalisation/formatting; this module owns the
// *policy* of which bounds a given field gets. Centralising it here stops every
// call site hand-rolling `maximumDate={new Date()}` and keeps the "past-only" /
// "future-allowed" / "relative" classification consistent across the app.
//
// All helpers return `Date | undefined` so they drop straight into
// `DatePickerField`'s `minimumDate` / `maximumDate` props. `DatePickerField`
// already runs `sanitizeDateBounds` + `clampDateToBounds`, so passing a fresh
// `new Date()` instance per render is fine — no memoisation required.

import { parseDateOnlyValue } from "@/lib/dateValues";

/** Fresh "now" instance — the upper anchor for past-only fields. */
export function today(): Date {
  return new Date();
}

/**
 * Maximum bound for a past-only date-only field (DOB, procedure date, etc.).
 * Alias of {@link today} kept distinct so call sites read intentionally.
 */
export function notFutureMax(): Date {
  return today();
}

/**
 * Lower bound for any date-of-birth field. 1900 safely covers the oldest living
 * patients (previously EditProfile hard-coded 1920, which is unnecessarily
 * tight for a surgical logbook).
 */
export function dobFloor(): Date {
  return new Date(1900, 0, 1);
}

/**
 * "End of today, local time" — the timezone-safe anchor for "not in the future"
 * validation compares. Setting the time to 23:59:59.999 means the entire current
 * calendar day counts as non-future regardless of the user's UTC offset, which
 * matches how `validateField` already treats `procedureDate`.
 */
export function endOfTodayLocal(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Minimum bound derived from another date-only field (e.g. discharge date's
 * minimum is the admission date). Returns `undefined` when the source value is
 * absent or unparseable so the picker simply has no lower bound.
 */
export function relativeMin(value?: string | number | null): Date | undefined {
  return parseDateOnlyValue(value) ?? undefined;
}
