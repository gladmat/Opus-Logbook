// Pure helpers for HH:MM time entry. Extracted from the TimeField component
// so masking/finalisation logic is unit-testable without the RN runtime.

/**
 * Progressive mask for numeric time entry. Accepts whatever the user has
 * typed so far, strips non-digits, and returns the best-effort partial or
 * complete `HH:MM` representation. Never throws; empty input returns "".
 */
export function formatTimeInput(input: string): string {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 0) return "";

  if (digits.length <= 2) {
    const hours = parseInt(digits, 10);
    if (hours >= 0 && hours <= 23) {
      return digits;
    }
    return digits.slice(0, 1);
  }

  if (digits.length === 3) {
    const firstDigit = parseInt(digits[0] ?? "0", 10);
    if (firstDigit <= 2) {
      const hours = digits.slice(0, 2);
      const mins = digits.slice(2);
      const hoursNum = parseInt(hours, 10);
      if (hoursNum <= 23) {
        return `${hours}:${mins}`;
      }
    }
    const hours = digits.slice(0, 1);
    const mins = digits.slice(1, 3);
    const minsNum = parseInt(mins, 10);
    if (minsNum <= 59) {
      return `0${hours}:${mins}`;
    }
    return `0${hours}:${mins.slice(0, 1)}`;
  }

  let hours: string;
  let mins: string;

  const firstTwo = parseInt(digits.slice(0, 2), 10);
  if (firstTwo <= 23) {
    hours = digits.slice(0, 2);
    mins = digits.slice(2, 4);
  } else {
    hours = `0${digits[0]}`;
    mins = digits.slice(1, 3);
  }

  const minsNum = parseInt(mins, 10);
  if (minsNum > 59) {
    mins = "59";
  }

  return `${hours}:${mins}`;
}

/**
 * Blur-time finalisation: pad a partial entry out to a full `HH:MM` value.
 * Works on the digit content only, so stray punctuation ("8:", "14.")
 * can't corrupt the padding arithmetic. Empty input stays empty.
 */
export function finalizeTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";
  return formatTimeInput(digits.padEnd(4, "0"));
}

/**
 * `HH:MM` → Date (today's date, local time) for feeding a native time
 * picker. Falls back to 12:00 for absent/partial values so the picker
 * opens somewhere neutral instead of 00:00.
 */
export function timeStringToDate(hhmm: string): Date {
  const date = new Date();
  date.setSeconds(0, 0);
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (match) {
    const hours = Number(match[1]);
    const mins = Number(match[2]);
    if (hours >= 0 && hours <= 23 && mins >= 0 && mins <= 59) {
      date.setHours(hours, mins);
      return date;
    }
  }
  date.setHours(12, 0);
  return date;
}

/** Date → canonical zero-padded `HH:MM` string. */
export function dateToTimeString(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
