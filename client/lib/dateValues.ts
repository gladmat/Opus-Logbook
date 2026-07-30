const ISO_DATE_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T\s].*)$/;
const NUMERIC_TIMESTAMP_PATTERN = /^-?\d+$/;

function coerceTrimmedDateLikeValue(
  value?: string | number | null,
): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }

  return undefined;
}

export function parseIsoDateValue(
  dateStr?: string | number | null,
): Date | null {
  const trimmed = coerceTrimmedDateLikeValue(dateStr);
  if (!trimmed) return null;

  const match = ISO_DATE_VALUE_PATTERN.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function normalizeDateOnlyValue(
  dateStr?: string | number | null,
): string | undefined {
  const trimmed = coerceTrimmedDateLikeValue(dateStr);
  if (!trimmed) return undefined;

  const strictDate = parseIsoDateValue(trimmed);
  if (strictDate) {
    return toIsoDateValue(strictDate);
  }

  const prefixedMatch = ISO_DATE_PREFIX_PATTERN.exec(trimmed);
  if (prefixedMatch) {
    const normalized = parseIsoDateValue(prefixedMatch[1]);
    return normalized ? toIsoDateValue(normalized) : undefined;
  }

  const normalizedTimestamp = normalizeIsoTimestampValue(trimmed);
  if (!normalizedTimestamp) return undefined;

  const timestampMatch = ISO_DATE_PREFIX_PATTERN.exec(normalizedTimestamp);
  if (!timestampMatch) return undefined;

  const normalized = parseIsoDateValue(timestampMatch[1]);
  return normalized ? toIsoDateValue(normalized) : undefined;
}

export function parseDateOnlyValue(
  dateStr?: string | number | null,
): Date | null {
  const normalized = normalizeDateOnlyValue(dateStr);
  return normalized ? parseIsoDateValue(normalized) : null;
}

export function toIsoDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toUtcNoonIsoTimestamp(dateValue: string): string | undefined {
  const parsed = parseIsoDateValue(dateValue);
  if (!parsed) return undefined;

  return new Date(
    Date.UTC(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      12,
      0,
      0,
      0,
    ),
  ).toISOString();
}

export function normalizeIsoTimestampValue(
  timestampValue?: string | number | null,
): string | undefined {
  const trimmed = coerceTrimmedDateLikeValue(timestampValue);
  if (!trimmed) return undefined;

  if (NUMERIC_TIMESTAMP_PATTERN.test(trimmed)) {
    const rawNumeric = Number(trimmed);
    const numericDigits = trimmed.startsWith("-") ? trimmed.slice(1) : trimmed;

    if (Number.isFinite(rawNumeric)) {
      let milliseconds: number | undefined;

      if (numericDigits.length >= 9 && numericDigits.length <= 10) {
        milliseconds = rawNumeric * 1000;
      } else if (numericDigits.length >= 12 && numericDigits.length <= 13) {
        milliseconds = rawNumeric;
      }

      if (milliseconds === undefined) {
        return undefined;
      }

      const numericDate = new Date(milliseconds);
      if (isValidDateInstance(numericDate)) {
        return numericDate.toISOString();
      }
    }
  }

  const parsed = new Date(trimmed);
  return isValidDateInstance(parsed) ? parsed.toISOString() : undefined;
}

export function isValidDateInstance(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/**
 * Resolves the calendar date a stored event value should DISPLAY as.
 *
 * Timestamps at exactly UTC noon are date-only anchors produced by
 * `toUtcNoonIsoTimestamp` — their UTC date is the intended calendar date.
 * Formatting them with local-timezone date logic renders the NEXT day in
 * UTC+12/+13 (UTC noon = local midnight of the following day in NZ), so
 * anchors are remapped to a local-noon Date of their UTC calendar date.
 * Any other timestamp is a real wall-clock instant and keeps local-date
 * semantics; bare date-only strings resolve to local noon directly.
 *
 * Returns a Date safe to pass to `toLocaleDateString`, or null when the
 * value is missing or unparseable.
 */
export function resolveEventDisplayDate(
  value?: string | number | null,
): Date | null {
  const dateOnly = parseIsoDateValue(value);
  if (dateOnly) return dateOnly;

  const normalized = normalizeIsoTimestampValue(value);
  if (!normalized) return null;

  if (normalized.endsWith("T12:00:00.000Z")) {
    return parseIsoDateValue(normalized.slice(0, 10));
  }
  return new Date(normalized);
}

export function sanitizeDateBounds(
  minimumDate?: Date,
  maximumDate?: Date,
): {
  minimumDate?: Date;
  maximumDate?: Date;
} {
  const safeMinimumDate = isValidDateInstance(minimumDate)
    ? minimumDate
    : undefined;
  const safeMaximumDate = isValidDateInstance(maximumDate)
    ? maximumDate
    : undefined;

  if (
    safeMinimumDate &&
    safeMaximumDate &&
    safeMinimumDate.getTime() > safeMaximumDate.getTime()
  ) {
    return {};
  }

  return {
    minimumDate: safeMinimumDate,
    maximumDate: safeMaximumDate,
  };
}

export function clampDateToBounds(
  date: Date,
  minimumDate?: Date,
  maximumDate?: Date,
): Date {
  const boundedDate = isValidDateInstance(date) ? date : new Date();
  const { minimumDate: safeMinimumDate, maximumDate: safeMaximumDate } =
    sanitizeDateBounds(minimumDate, maximumDate);
  const timestamp = boundedDate.getTime();
  const min = safeMinimumDate?.getTime();
  const max = safeMaximumDate?.getTime();

  if (typeof min === "number" && timestamp < min) {
    return safeMinimumDate!;
  }
  if (typeof max === "number" && timestamp > max) {
    return safeMaximumDate!;
  }
  return boundedDate;
}
