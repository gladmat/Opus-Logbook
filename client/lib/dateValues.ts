const ISO_DATE_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T\s].*)$/;

export function parseIsoDateValue(dateStr?: string): Date | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();
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

export function normalizeDateOnlyValue(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;

  const trimmed = dateStr.trim();
  if (!trimmed) return undefined;

  const strictDate = parseIsoDateValue(trimmed);
  if (strictDate) {
    return toIsoDateValue(strictDate);
  }

  const prefixedMatch = ISO_DATE_PREFIX_PATTERN.exec(trimmed);
  if (!prefixedMatch) return undefined;

  const normalized = parseIsoDateValue(prefixedMatch[1]);
  return normalized ? toIsoDateValue(normalized) : undefined;
}

export function parseDateOnlyValue(dateStr?: string): Date | null {
  const normalized = normalizeDateOnlyValue(dateStr);
  return normalized ? parseIsoDateValue(normalized) : null;
}

export function toIsoDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidDateInstance(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
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
