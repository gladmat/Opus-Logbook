/**
 * Tenolysis Details
 *
 * Data model for the TenolysisDetails inline card, activated when a tenolysis
 * procedure is selected in the hand flow. Captures which tendons were released
 * (per digit, per side) and at which zone level(s). SNOMED has no per-tendon /
 * per-zone tenolysis concepts, so this granularity lives as structured data;
 * the flexor/extensor axis itself is carried by the side-specific procedure
 * codes (AU extension) with the generic hand_tend_tenolysis as the umbrella.
 *
 * Tendon vocabulary (which tendons exist per digit) is owned by
 * client/components/hand-trauma/structureConfig.ts — the card imports it from
 * there. The zone order tables below repeat the zone tokens ONLY as a sorting/
 * rendering order; tenolysis.test.ts guards them against drift from
 * structureConfig's zone arrays.
 */

import type { DigitId } from "./case";

// ── Sides ─────────────────────────────────────────────────────────────────────

export type TenolysisSide = "flexor" | "extensor";

export const TENOLYSIS_SIDE_LABELS: Record<TenolysisSide, string> = {
  flexor: "Flexor",
  extensor: "Extensor",
};

// ── Zone order tables (sorting + chip rendering order) ───────────────────────

/** Finger zones first, then thumb zones — mirrors structureConfig FLEXOR_ZONES_*. */
export const FLEXOR_TENOLYSIS_ZONES = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "T1",
  "T2",
  "T3",
] as const;

/** Finger zones first, then thumb zones — mirrors structureConfig EXTENSOR_ZONES_*. */
export const EXTENSOR_TENOLYSIS_ZONES = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "TI",
  "TII",
  "TIII",
  "TIV",
  "TV",
] as const;

const ZONE_ORDER_BY_SIDE: Record<TenolysisSide, readonly string[]> = {
  flexor: FLEXOR_TENOLYSIS_ZONES,
  extensor: EXTENSOR_TENOLYSIS_ZONES,
};

/** Canonical tendon render order (flexors, then thumb extensors, then finger extensors). */
const TENDON_ORDER = [
  "FPL",
  "FDP",
  "FDS",
  "EPL",
  "EPB",
  "APL",
  "EDC",
  "EIP",
  "EDM",
] as const;

const DIGIT_ORDER: readonly DigitId[] = ["I", "II", "III", "IV", "V"];

// ── Main data interfaces ──────────────────────────────────────────────────────

export interface TenolysisTendonSelection {
  digit: DigitId;
  /** Tendon id from structureConfig DIGIT_FLEXOR_MAP / DIGIT_EXTENSOR_MAP (e.g. "FDP") */
  tendon: string;
}

export interface TenolysisSideData {
  selections: TenolysisTendonSelection[];
  /** Zone level(s) released — multi-select; tenolysis often spans zones */
  zones: string[];
}

export interface TenolysisData {
  /** null = side not involved (zero-friction default) */
  flexor: TenolysisSideData | null;
  extensor: TenolysisSideData | null;
}

// ── Factories ─────────────────────────────────────────────────────────────────

export function createEmptyTenolysisData(): TenolysisData {
  return { flexor: null, extensor: null };
}

export function createEmptyTenolysisSideData(): TenolysisSideData {
  return { selections: [], zones: [] };
}

// ── Procedure IDs that trigger the tenolysis details card ────────────────────

export const TENOLYSIS_PROCEDURE_IDS = [
  "hand_tend_tenolysis",
  "hand_tend_tenolysis_flexor",
  "hand_tend_tenolysis_extensor",
] as const;

const TENOLYSIS_PROCEDURE_ID_SET: ReadonlySet<string> = new Set(
  TENOLYSIS_PROCEDURE_IDS,
);

export function isTenolysisProcedure(picklistEntryId?: string | null): boolean {
  return !!picklistEntryId && TENOLYSIS_PROCEDURE_ID_SET.has(picklistEntryId);
}

/**
 * Side forced by the side-specific procedure entries; the generic
 * hand_tend_tenolysis shows both sides.
 */
const TENOLYSIS_FORCED_SIDE: Record<string, TenolysisSide> = {
  hand_tend_tenolysis_flexor: "flexor",
  hand_tend_tenolysis_extensor: "extensor",
};

export function getForcedTenolysisSide(
  picklistEntryId?: string | null,
): TenolysisSide | null {
  if (!picklistEntryId) return null;
  return TENOLYSIS_FORCED_SIDE[picklistEntryId] ?? null;
}

// ── Normalization ─────────────────────────────────────────────────────────────

function sortIndex(order: readonly string[], value: string): number {
  const idx = order.indexOf(value);
  return idx === -1 ? order.length : idx;
}

function normalizeSide(
  side: TenolysisSide,
  data: TenolysisSideData | null | undefined,
): TenolysisSideData | null {
  if (!data) return null;

  const seen = new Set<string>();
  const selections = data.selections
    .filter((s) => {
      const key = `${s.digit}|${s.tendon}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        sortIndex(DIGIT_ORDER, a.digit) - sortIndex(DIGIT_ORDER, b.digit) ||
        sortIndex(TENDON_ORDER, a.tendon) - sortIndex(TENDON_ORDER, b.tendon),
    );

  const zoneOrder = ZONE_ORDER_BY_SIDE[side];
  const zones = Array.from(new Set(data.zones)).sort(
    (a, b) => sortIndex(zoneOrder, a) - sortIndex(zoneOrder, b),
  );

  if (selections.length === 0 && zones.length === 0) return null;
  return { selections, zones };
}

/**
 * Drops empty sides (no tendons AND no zones) to null; returns undefined when
 * nothing substantive remains, so toggling sections open/closed never persists
 * junk. Also dedupes and canonically sorts selections/zones for stable
 * signatures.
 */
export function normalizeTenolysisDetails(
  data: TenolysisData | null | undefined,
): TenolysisData | undefined {
  if (!data) return undefined;
  const flexor = normalizeSide("flexor", data.flexor);
  const extensor = normalizeSide("extensor", data.extensor);
  if (!flexor && !extensor) return undefined;
  return { flexor, extensor };
}

// ── Derived values ────────────────────────────────────────────────────────────

/** Distinct digits across both sides, in anatomic order. */
export function getTenolysisDigits(
  data: TenolysisData | null | undefined,
): DigitId[] {
  if (!data) return [];
  const digits = new Set<DigitId>();
  for (const side of [data.flexor, data.extensor]) {
    for (const s of side?.selections ?? []) digits.add(s.digit);
  }
  return DIGIT_ORDER.filter((d) => digits.has(d));
}

/** The single involved digit, when exactly one — drives per-digit FHIR bodySite. */
export function getTenolysisSingleDigit(
  data: TenolysisData | null | undefined,
): DigitId | undefined {
  const digits = getTenolysisDigits(data);
  return digits.length === 1 ? digits[0] : undefined;
}

// ── Summary strings ───────────────────────────────────────────────────────────

function formatDigitList(digits: readonly DigitId[]): string {
  return `Dig. ${digits.join("+")}`;
}

/** Groups digits sharing an identical tendon set, e.g. "FDP+FDS — Dig. III+IV". */
function formatSideSelections(selections: TenolysisTendonSelection[]): string {
  const byDigit = new Map<DigitId, string[]>();
  for (const s of selections) {
    const list = byDigit.get(s.digit) ?? [];
    list.push(s.tendon);
    byDigit.set(s.digit, list);
  }
  const bySignature = new Map<string, DigitId[]>();
  for (const digit of DIGIT_ORDER) {
    const tendons = byDigit.get(digit);
    if (!tendons) continue;
    const signature = tendons.join("+");
    const digits = bySignature.get(signature) ?? [];
    digits.push(digit);
    bySignature.set(signature, digits);
  }
  return Array.from(bySignature.entries())
    .map(([signature, digits]) => `${signature} — ${formatDigitList(digits)}`)
    .join(", ");
}

function formatZones(zones: string[]): string {
  if (zones.length === 0) return "";
  return zones.length === 1 ? `Zone ${zones[0]}` : `Zones ${zones.join(", ")}`;
}

function formatSide(side: TenolysisSide, data: TenolysisSideData): string {
  const parts: string[] = [];
  if (data.selections.length > 0) {
    parts.push(formatSideSelections(data.selections));
  }
  const zones = formatZones(data.zones);
  if (zones) parts.push(zones);
  return `${TENOLYSIS_SIDE_LABELS[side]}: ${parts.join(" · ")}`;
}

/**
 * Compact one-line summary for detail rows / exports, e.g.
 * "Flexor: FDP+FDS — Dig. III · Zones II, III".
 */
export function getTenolysisSummary(
  data: TenolysisData | null | undefined,
): string {
  const normalized = normalizeTenolysisDetails(data);
  if (!normalized) return "";
  const parts: string[] = [];
  if (normalized.flexor) parts.push(formatSide("flexor", normalized.flexor));
  if (normalized.extensor)
    parts.push(formatSide("extensor", normalized.extensor));
  return parts.join("; ");
}

/**
 * Short suffix appended to the diagnosis headline, e.g. "Dig. III, zone II" →
 * "Flexor tendon adhesion / stiffness — Dig. III, zone II". Zones are included
 * only when a single side is involved (mixed-side zone lists would be
 * ambiguous in a title). Returns null when nothing is recorded.
 */
export function getTenolysisTitleSuffix(
  data: TenolysisData | null | undefined,
): string | null {
  const normalized = normalizeTenolysisDetails(data);
  if (!normalized) return null;

  const parts: string[] = [];
  const digits = getTenolysisDigits(normalized);
  if (digits.length > 0) parts.push(formatDigitList(digits));

  const sides = [normalized.flexor, normalized.extensor].filter(
    (s): s is TenolysisSideData => s !== null,
  );
  if (sides.length === 1 && sides[0] && sides[0].zones.length > 0) {
    const zones = sides[0].zones;
    parts.push(
      zones.length === 1 ? `zone ${zones[0]}` : `zones ${zones.join(", ")}`,
    );
  }

  return parts.length > 0 ? parts.join(", ") : null;
}
