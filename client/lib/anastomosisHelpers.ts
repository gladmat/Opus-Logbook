// Pure helpers for anastomosis entries (coupler size + coupling labels).
//
// Lives in `lib/` so the coupler-size round-trip can be unit-tested without
// the RN runtime. The picker options are strings ("2.0"); the stored value is
// a number (2). `parseFloat("2.0").toString()` yields "2", which never matches
// the option value — so the picker rendered "Select..." for every whole-mm
// size. `formatCouplerSize` is the single formatter both the picker value and
// every display surface go through.

import { type AnastomosisEntry, COUPLING_METHOD_LABELS } from "@/types/case";

/** Venous coupler sizes (mm) offered by the picker, as option values. */
export const COUPLER_SIZES = [
  "1.5",
  "2.0",
  "2.5",
  "3.0",
  "3.5",
  "4.0",
] as const;

/** Stored mm → picker/display string with one decimal ("2" → "2.0"). */
export function formatCouplerSize(mm: number | null | undefined): string {
  if (mm == null || typeof mm !== "number" || !Number.isFinite(mm)) return "";
  return mm.toFixed(1);
}

/** Picker option value → stored mm. */
export function parseCouplerSize(value: string): number {
  return parseFloat(value);
}

/**
 * Human-readable coupling description for an entry — "Coupler 2.5 mm",
 * "Hand-sewn", "Hybrid" — or "" when no coupling method is recorded.
 */
export function describeCoupling(
  entry: Pick<AnastomosisEntry, "couplingMethod" | "couplerSizeMm">,
): string {
  if (!entry.couplingMethod) return "";
  const label =
    COUPLING_METHOD_LABELS[entry.couplingMethod] ?? entry.couplingMethod;
  if (entry.couplingMethod !== "coupler") return label;
  const size = formatCouplerSize(entry.couplerSizeMm);
  return size ? `${label} ${size} mm` : label;
}

/**
 * Coupler sizes used across a flap's anastomoses, "; "-joined — the value the
 * free-flap audit report exports. Falls back to the legacy case-level
 * `couplerSizeMm` (pre-per-anastomosis era) when no entry carries one.
 */
export function collectCouplerSizes(
  anastomoses: AnastomosisEntry[] | undefined,
  legacyCouplerSizeMm?: number,
): string {
  const sizes = (anastomoses ?? [])
    .filter((a) => a.couplingMethod === "coupler")
    .map((a) => formatCouplerSize(a.couplerSizeMm))
    .filter((s) => s !== "");
  if (sizes.length > 0) return sizes.join("; ");
  return formatCouplerSize(legacyCouplerSizeMm);
}
