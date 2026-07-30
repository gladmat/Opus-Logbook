import { resolveEventDisplayDate } from "@/lib/dateValues";

export function clampIndex(i: number, total: number): number {
  if (!Number.isFinite(i) || total <= 0) return 0;
  if (i < 0) return 0;
  if (i >= total) return total - 1;
  return Math.floor(i);
}

export function formatCounter(index: number, total: number): string {
  if (total <= 0) return "";
  return `${clampIndex(index, total) + 1} / ${total}`;
}

export function formatMediaDate(value?: string): string | null {
  if (!value) return null;
  // Backdated media timestamps are UTC-noon date anchors — resolve through
  // the shared helper so they don't render as the next day in UTC+12/+13.
  const d = resolveEventDisplayDate(value);
  if (!d) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
