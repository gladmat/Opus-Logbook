// Pure helpers for DD/MM/YYYY date entry. Companion to timeInput.ts so the
// masking/validation logic is unit-testable without the RN runtime.

import {
  normalizeDateOnlyValue,
  parseIsoDateValue,
  sanitizeDateBounds,
  toIsoDateValue,
} from "./dateValues";

/**
 * Progressive mask for numeric date entry. Accepts whatever the user has
 * typed so far, strips non-digits, and returns the best-effort partial or
 * complete `DD/MM/YYYY` representation. Never throws; empty input returns "".
 *
 * Contract is strict zero-padded DDMMYYYY; force-padding only happens where
 * the strict reading is impossible (day tens digit 4–9, month tens digit
 * 2–9). With two ambiguous digits the greedy two-digit reading wins:
 * "1122003" reads day 11 / month 02, not 1 December 2003.
 */
export function formatDateInput(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) return "";

  // ── Day ──
  let day: string;
  let rest: string;
  const dayTens = digits[0] ?? "";
  if (dayTens >= "4") {
    // No valid day has a tens digit of 4–9 — treat as a single-digit day.
    day = `0${dayTens}`;
    rest = digits.slice(1);
  } else if (digits.length === 1) {
    // Partial day (0–3): could still become 0X..3X.
    return dayTens;
  } else {
    const dayNum = parseInt(digits.slice(0, 2), 10);
    if (dayNum >= 1 && dayNum <= 31) {
      day = digits.slice(0, 2);
      rest = digits.slice(2);
    } else {
      // "00" or > 31: reject the second digit.
      return dayTens;
    }
  }

  if (rest.length === 0) return `${day}/`;

  // ── Month ──
  let month: string;
  let yearDigits: string;
  const monthTens = rest[0] ?? "";
  if (monthTens >= "2") {
    // Months 20–99 impossible — single-digit month, force pad.
    month = `0${monthTens}`;
    yearDigits = rest.slice(1);
  } else if (rest.length === 1) {
    // Partial month (0 or 1).
    return `${day}/${monthTens}`;
  } else {
    const monthNum = parseInt(rest.slice(0, 2), 10);
    if (monthNum >= 1 && monthNum <= 12) {
      month = rest.slice(0, 2);
      yearDigits = rest.slice(2);
    } else {
      // "00" or > 12: reject the second digit.
      return `${day}/${monthTens}`;
    }
  }

  if (yearDigits.length === 0) return `${day}/${month}/`;

  // ── Year ── free digits, capped at 4.
  return `${day}/${month}/${yearDigits.slice(0, 4)}`;
}

export type DateInputStatus =
  | "empty"
  | "incomplete"
  | "invalid"
  | "before_min"
  | "after_max"
  | "valid";

export interface DateInputParseResult {
  status: DateInputStatus;
  /** Present whenever a real calendar date parsed (valid / before_min / after_max). */
  iso?: string;
  date?: Date;
}

export interface DateInputBounds {
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * Parse a masked (or raw-digit) entry into a canonical ISO date, validating
 * against optional bounds. Partial entries are never padded — unlike times,
 * autocompleting a partial date would fabricate a value the user didn't type.
 *
 * Bounds compare date-only via lexical ISO comparison: typed dates parse to
 * local noon while callers often pass `new Date()` as the maximum, so a
 * timestamp comparison would wrongly reject "today" typed before noon.
 */
export function parseDateInput(
  raw: string,
  bounds?: DateInputBounds,
): DateInputParseResult {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return { status: "empty" };
  if (digits.length < 8) return { status: "incomplete" };

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const iso = `${year}-${month}-${day}`;
  const date = parseIsoDateValue(iso);
  if (!date) return { status: "invalid" };

  const { minimumDate, maximumDate } = sanitizeDateBounds(
    bounds?.minimumDate,
    bounds?.maximumDate,
  );
  if (minimumDate && iso < toIsoDateValue(minimumDate)) {
    return { status: "before_min", iso, date };
  }
  if (maximumDate && iso > toIsoDateValue(maximumDate)) {
    return { status: "after_max", iso, date };
  }
  return { status: "valid", iso, date };
}

/**
 * Human-readable message for a parse result, or null when there is nothing
 * to complain about (empty / valid). "Cannot be in the future" is used when
 * the maximum bound is today, which is the common case (DOB, procedure date).
 */
export function describeDateInputError(
  result: DateInputParseResult,
  bounds?: DateInputBounds,
): string | null {
  switch (result.status) {
    case "empty":
    case "valid":
      return null;
    case "incomplete":
      return "Enter date as DD/MM/YYYY";
    case "invalid":
      return "Invalid date — check day and month";
    case "before_min": {
      const min = bounds?.minimumDate;
      return min
        ? `Date must be ${isoToMasked(toIsoDateValue(min))} or later`
        : "Date is too early";
    }
    case "after_max": {
      const max = bounds?.maximumDate;
      if (!max) return "Date is too late";
      if (toIsoDateValue(max) === toIsoDateValue(new Date())) {
        return "Date cannot be in the future";
      }
      return `Date must be ${isoToMasked(toIsoDateValue(max))} or earlier`;
    }
  }
}

/** Masked `DD/MM/YYYY` → canonical `YYYY-MM-DD`, or null unless a real date. */
export function maskedToIso(masked: string): string | null {
  const result = parseDateInput(masked);
  return result.status === "valid" ? (result.iso ?? null) : null;
}

/**
 * Canonical (or legacy ISO/timestamp) value → masked `DD/MM/YYYY` for the
 * entry field. Unparseable values render as an empty field.
 */
export function isoToMasked(value?: string | number | null): string {
  const normalized = normalizeDateOnlyValue(value);
  if (!normalized) return "";
  const [year, month, day] = normalized.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}
