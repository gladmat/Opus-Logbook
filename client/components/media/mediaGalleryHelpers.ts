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
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
