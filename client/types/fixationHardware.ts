/**
 * Fixation Hardware Details
 *
 * Lightweight, optional per-procedure documentation of fracture-fixation
 * hardware (K-wires / screws / plates) for hand trauma fixation, corrective
 * osteotomy, and wrist plating procedures. Deliberately NOT registry-grade
 * (no catalogue numbers, lot/batch, or UDI — no external registry consumes
 * fracture hardware; the joint-implant module owns that pattern).
 *
 * Purpose: metalware-removal planning (the system determines the extraction
 * set) and personal series audit (e.g. scaphoid screw lengths). One row per
 * hardware type — count + dominant size, no repeatable rows. Ex-fix pins are
 * recorded under K-wires.
 */

import { OSTEOTOMY_PROCEDURE_IDS, type OsteotomyFixation } from "./osteotomy";

// ── K-wires ───────────────────────────────────────────────────────────────────

export type KwireGaugeMm =
  | "0.8"
  | "0.9"
  | "1.0"
  | "1.1"
  | "1.2"
  | "1.4"
  | "1.6"
  | "other";

export const KWIRE_GAUGE_OPTIONS: readonly KwireGaugeMm[] = [
  "0.8",
  "0.9",
  "1.0",
  "1.1",
  "1.2",
  "1.4",
  "1.6",
  "other",
];

export const KWIRE_GAUGE_LABELS: Record<KwireGaugeMm, string> = {
  "0.8": "0.8",
  "0.9": "0.9",
  "1.0": "1.0",
  "1.1": "1.1",
  "1.2": "1.2",
  "1.4": "1.4",
  "1.6": "1.6",
  other: "Other",
};

export interface KwireHardware {
  gaugeMm: KwireGaugeMm | null;
  count: number | null;
}

// ── Screws ────────────────────────────────────────────────────────────────────

export type ScrewSystem =
  | "acutrak"
  | "synthes_hcs"
  | "herbert"
  | "medartis"
  | "stryker"
  | "other";

export const SCREW_SYSTEM_OPTIONS: readonly ScrewSystem[] = [
  "acutrak",
  "synthes_hcs",
  "herbert",
  "medartis",
  "stryker",
  "other",
];

export const SCREW_SYSTEM_LABELS: Record<ScrewSystem, string> = {
  acutrak: "Acutrak",
  synthes_hcs: "Synthes HCS",
  herbert: "Herbert",
  medartis: "Medartis",
  stryker: "Stryker",
  other: "Other",
};

export type ScrewDiameterMm = "1.5" | "2.0" | "2.2" | "2.4" | "3.0" | "other";

export const SCREW_DIAMETER_OPTIONS: readonly ScrewDiameterMm[] = [
  "1.5",
  "2.0",
  "2.2",
  "2.4",
  "3.0",
  "other",
];

export const SCREW_DIAMETER_LABELS: Record<ScrewDiameterMm, string> = {
  "1.5": "1.5",
  "2.0": "2.0",
  "2.2": "2.2",
  "2.4": "2.4",
  "3.0": "3.0",
  other: "Other",
};

export interface ScrewHardware {
  system: ScrewSystem | null;
  /** Free-text system name (only meaningful when system === "other") */
  systemOther?: string;
  diameterMm: ScrewDiameterMm | null;
  lengthMm: number | null;
  count: number | null;
}

// ── Plate ─────────────────────────────────────────────────────────────────────

export type PlateSystem =
  | "medartis_aptus"
  | "synthes_compact"
  | "stryker_variax"
  | "other";

export const PLATE_SYSTEM_OPTIONS: readonly PlateSystem[] = [
  "medartis_aptus",
  "synthes_compact",
  "stryker_variax",
  "other",
];

export const PLATE_SYSTEM_LABELS: Record<PlateSystem, string> = {
  medartis_aptus: "Medartis Aptus",
  synthes_compact: "Synthes Compact",
  stryker_variax: "Stryker VariAx",
  other: "Other",
};

export type PlateType =
  | "straight"
  | "t_plate"
  | "l_plate"
  | "y_plate"
  | "condylar"
  | "hook"
  | "volar_dr"
  | "other";

export const PLATE_TYPE_OPTIONS: readonly PlateType[] = [
  "straight",
  "t_plate",
  "l_plate",
  "y_plate",
  "condylar",
  "hook",
  "volar_dr",
  "other",
];

export const PLATE_TYPE_LABELS: Record<PlateType, string> = {
  straight: "Straight",
  t_plate: "T-plate",
  l_plate: "L-plate",
  y_plate: "Y-plate",
  condylar: "Condylar",
  hook: "Hook",
  volar_dr: "Volar DR",
  other: "Other",
};

/** Lowercase variants used inside compact summary strings */
const PLATE_TYPE_SUMMARY_LABELS: Record<PlateType, string> = {
  straight: "straight plate",
  t_plate: "T-plate",
  l_plate: "L-plate",
  y_plate: "Y-plate",
  condylar: "condylar plate",
  hook: "hook plate",
  volar_dr: "volar DR plate",
  other: "plate",
};

export type PlateProfileMm = "1.2" | "1.5" | "2.0" | "2.3" | "other";

export const PLATE_PROFILE_OPTIONS: readonly PlateProfileMm[] = [
  "1.2",
  "1.5",
  "2.0",
  "2.3",
  "other",
];

export const PLATE_PROFILE_LABELS: Record<PlateProfileMm, string> = {
  "1.2": "1.2",
  "1.5": "1.5",
  "2.0": "2.0",
  "2.3": "2.3",
  other: "Other",
};

export interface PlateHardware {
  system: PlateSystem | null;
  /** Free-text system name (only meaningful when system === "other") */
  systemOther?: string;
  plateType: PlateType | null;
  profileMm: PlateProfileMm | null;
}

// ── Main data interface ───────────────────────────────────────────────────────

export interface FixationHardwareData {
  /** null = section unused (zero-friction default) */
  kwires: KwireHardware | null;
  screws: ScrewHardware | null;
  plate: PlateHardware | null;
}

export type HardwareSectionId = keyof FixationHardwareData;

export const HARDWARE_SECTION_LABELS: Record<HardwareSectionId, string> = {
  kwires: "K-wires",
  screws: "Screws",
  plate: "Plate",
};

// ── Factories ─────────────────────────────────────────────────────────────────

export function createEmptyFixationHardwareData(): FixationHardwareData {
  return { kwires: null, screws: null, plate: null };
}

export function createEmptyKwireHardware(): KwireHardware {
  return { gaugeMm: null, count: null };
}

export function createEmptyScrewHardware(): ScrewHardware {
  return { system: null, diameterMm: null, lengthMm: null, count: null };
}

export function createEmptyPlateHardware(): PlateHardware {
  return { system: null, plateType: null, profileMm: null };
}

// ── Procedure IDs that trigger the fixation hardware card ────────────────────

export const FIXATION_HARDWARE_PROCEDURE_IDS = [
  // Fracture & Joint Fixation
  "hand_fx_distal_radius_orif",
  "hand_fx_distal_radius_crif",
  "hand_fx_distal_radius_exfix",
  "hand_fx_metacarpal_orif",
  "hand_fx_metacarpal_orif_ccs",
  "hand_fx_metacarpal_crif",
  "hand_fx_metacarpal_crif_ccs",
  "hand_fx_metacarpal_exfix",
  "hand_fx_phalanx_orif",
  "hand_fx_phalanx_orif_ccs",
  "hand_fx_phalanx_crif",
  "hand_fx_phalanx_crif_ccs",
  "hand_fx_phalanx_exfix",
  "hand_fx_scaphoid_orif",
  "hand_fx_scaphoid_percutaneous",
  "hand_fx_scaphoid_nonunion_graft",
  "hand_fx_bennett",
  "hand_fx_rolando",
  "hand_fx_carpal_orif",
  "hand_fx_carpal_orif_ccs",
  "hand_fx_carpal_crif",
  "hand_fx_carpal_crif_ccs",
  "hand_fx_carpal_other",
  "hand_fx_mallet_extension_block",
  // Dislocation management (hardware-bearing only)
  "hand_disloc_pip_extension_block_kwire",
  "hand_disloc_pip_hemihamate",
  "hand_disloc_cmc_crif",
  "hand_disloc_perilunate_orif",
  "hand_disloc_druj_reduction_kwire",
  // Elective bone
  ...OSTEOTOMY_PROCEDURE_IDS,
  "hand_elective_nonunion_repair",
] as const;

const FIXATION_HARDWARE_PROCEDURE_ID_SET: ReadonlySet<string> = new Set(
  FIXATION_HARDWARE_PROCEDURE_IDS,
);

export function isFixationHardwareProcedure(
  picklistEntryId?: string | null,
): boolean {
  return (
    !!picklistEntryId && FIXATION_HARDWARE_PROCEDURE_ID_SET.has(picklistEntryId)
  );
}

// ── Suggested sections ────────────────────────────────────────────────────────

/**
 * Which hardware sections to pre-highlight per procedure. Hints only —
 * every section stays available regardless.
 */
const SECTION_HINTS_BY_PROCEDURE: Record<string, readonly HardwareSectionId[]> =
  {
    hand_fx_distal_radius_orif: ["plate"],
    hand_fx_distal_radius_crif: ["kwires"],
    hand_fx_distal_radius_exfix: ["kwires"],
    hand_fx_metacarpal_orif: ["plate", "screws"],
    hand_fx_metacarpal_orif_ccs: ["screws"],
    hand_fx_metacarpal_crif: ["kwires"],
    hand_fx_metacarpal_crif_ccs: ["screws"],
    hand_fx_metacarpal_exfix: ["kwires"],
    hand_fx_phalanx_orif: ["plate", "screws"],
    hand_fx_phalanx_orif_ccs: ["screws"],
    hand_fx_phalanx_crif: ["kwires"],
    hand_fx_phalanx_crif_ccs: ["screws"],
    hand_fx_phalanx_exfix: ["kwires"],
    hand_fx_scaphoid_orif: ["screws"],
    hand_fx_scaphoid_percutaneous: ["screws"],
    hand_fx_scaphoid_nonunion_graft: ["screws"],
    hand_fx_bennett: ["screws", "kwires"],
    hand_fx_rolando: ["screws", "kwires"],
    hand_fx_carpal_orif: ["screws"],
    hand_fx_carpal_orif_ccs: ["screws"],
    hand_fx_carpal_crif: ["kwires"],
    hand_fx_carpal_crif_ccs: ["screws"],
    hand_fx_mallet_extension_block: ["kwires"],
    hand_disloc_pip_extension_block_kwire: ["kwires"],
    hand_disloc_pip_hemihamate: ["screws"],
    hand_disloc_cmc_crif: ["kwires"],
    hand_disloc_perilunate_orif: ["kwires", "screws"],
    hand_disloc_druj_reduction_kwire: ["kwires"],
    hand_elective_corrective_osteotomy_hand: ["plate"],
    hand_elective_corrective_osteotomy_radius: ["plate"],
    hand_elective_ulna_shortening: ["plate"],
    hand_elective_nonunion_repair: ["plate", "screws"],
  };

const OSTEOTOMY_FIXATION_SECTION_HINTS: Record<
  OsteotomyFixation,
  readonly HardwareSectionId[]
> = {
  plate_screws: ["plate"],
  lag_screws: ["screws"],
  kwires: ["kwires"],
  headless_compression_screw: ["screws"],
  external_fixator: ["kwires"],
  combination: ["plate", "screws", "kwires"],
};

/**
 * Sections to pre-highlight for a given procedure. When the sibling osteotomy
 * card already recorded a fixation method, that hint wins over the ID default.
 */
export function getSuggestedHardwareSections(
  picklistEntryId?: string | null,
  osteotomyFixation?: OsteotomyFixation | null,
): HardwareSectionId[] {
  if (osteotomyFixation) {
    return [...OSTEOTOMY_FIXATION_SECTION_HINTS[osteotomyFixation]];
  }
  if (!picklistEntryId) return [];
  const hints = SECTION_HINTS_BY_PROCEDURE[picklistEntryId];
  return hints ? [...hints] : [];
}

// ── Normalization ─────────────────────────────────────────────────────────────

function isEmptyKwires(k: KwireHardware): boolean {
  return k.gaugeMm === null && k.count === null;
}

function isEmptyScrews(s: ScrewHardware): boolean {
  return (
    s.system === null &&
    s.diameterMm === null &&
    s.lengthMm === null &&
    s.count === null &&
    !s.systemOther?.trim()
  );
}

function isEmptyPlate(p: PlateHardware): boolean {
  return (
    p.system === null &&
    p.plateType === null &&
    p.profileMm === null &&
    !p.systemOther?.trim()
  );
}

/**
 * Drops all-null sub-entries, strips systemOther when system !== "other",
 * and returns undefined when nothing substantive remains — so toggling
 * sections open and closed never persists junk on the procedure.
 */
export function normalizeFixationHardware(
  data: FixationHardwareData,
): FixationHardwareData | undefined {
  const kwires =
    data.kwires && !isEmptyKwires(data.kwires) ? data.kwires : null;

  let screws: ScrewHardware | null = null;
  if (data.screws && !isEmptyScrews(data.screws)) {
    screws =
      data.screws.system !== "other" && data.screws.systemOther !== undefined
        ? { ...data.screws, systemOther: undefined }
        : data.screws;
  }

  let plate: PlateHardware | null = null;
  if (data.plate && !isEmptyPlate(data.plate)) {
    plate =
      data.plate.system !== "other" && data.plate.systemOther !== undefined
        ? { ...data.plate, systemOther: undefined }
        : data.plate;
  }

  if (!kwires && !screws && !plate) return undefined;
  return { kwires, screws, plate };
}

// ── Summary string ────────────────────────────────────────────────────────────

function screwSystemDisplay(s: ScrewHardware): string | null {
  if (s.system === "other") return s.systemOther?.trim() || "Screw";
  if (s.system) return SCREW_SYSTEM_LABELS[s.system];
  return null;
}

function plateSystemDisplay(p: PlateHardware): string | null {
  if (p.system === "other") return p.systemOther?.trim() || null;
  if (p.system) return PLATE_SYSTEM_LABELS[p.system];
  return null;
}

/**
 * Compact one-line summary for detail rows / exports, e.g.
 * "2× K-wire 1.2 mm · Acutrak ⌀2.4 × 22 mm · Medartis Aptus T-plate 1.5".
 * Empty string when nothing is recorded.
 */
export function getFixationHardwareSummary(
  data: FixationHardwareData | undefined | null,
): string {
  if (!data) return "";
  const parts: string[] = [];

  if (data.kwires && !isEmptyKwires(data.kwires)) {
    const { gaugeMm, count } = data.kwires;
    let s = count && count > 1 ? `${count}× K-wire` : "K-wire";
    if (gaugeMm && gaugeMm !== "other") s += ` ${gaugeMm} mm`;
    parts.push(s);
  }

  if (data.screws && !isEmptyScrews(data.screws)) {
    const { diameterMm, lengthMm, count } = data.screws;
    const system = screwSystemDisplay(data.screws) ?? "Screw";
    let s = count && count > 1 ? `${count}× ${system}` : system;
    if (diameterMm && diameterMm !== "other") s += ` ⌀${diameterMm}`;
    if (lengthMm) s += ` × ${lengthMm} mm`;
    parts.push(s);
  }

  if (data.plate && !isEmptyPlate(data.plate)) {
    const { plateType, profileMm } = data.plate;
    const bits: string[] = [];
    const system = plateSystemDisplay(data.plate);
    if (system) bits.push(system);
    bits.push(plateType ? PLATE_TYPE_SUMMARY_LABELS[plateType] : "plate");
    if (profileMm && profileMm !== "other") bits.push(profileMm);
    parts.push(bits.join(" "));
  }

  return parts.join(" · ");
}
