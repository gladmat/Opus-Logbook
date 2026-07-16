/**
 * Bone Tumour Details
 *
 * Data model for the BoneTumourDetails inline assessment card, activated
 * when bone tumour curettage/graft procedures are selected in the elective
 * hand flow (e.g. enchondroma curettage + bone graft). Captures which bone
 * the lesion was in (SNOMED has no hand-phalanx-level tumour concepts, so
 * this granularity must live as structured data), which digit, and the
 * graft type / donor site.
 *
 * Graft vocabulary is shared with the corrective-osteotomy card
 * (client/types/osteotomy.ts) — do not duplicate it.
 */

import type { DigitId } from "./case";
import type { OsteotomyGraftType, OsteotomyGraftDonorSite } from "./osteotomy";
import { GRAFT_DONOR_SITE_LABELS } from "./osteotomy";

// ── Bone ──────────────────────────────────────────────────────────────────────

export type BoneTumourBone =
  | "metacarpal"
  | "proximal_phalanx"
  | "middle_phalanx"
  | "distal_phalanx"
  | "carpal"
  | "other";

export const BONE_TUMOUR_BONE_LABELS: Record<BoneTumourBone, string> = {
  metacarpal: "Metacarpal",
  proximal_phalanx: "Prox phalanx",
  middle_phalanx: "Mid phalanx",
  distal_phalanx: "Distal phalanx",
  carpal: "Carpal bone",
  other: "Other",
};

/** Full-length labels used in diagnosis titles ("… — middle phalanx, Dig. V") */
export const BONE_TUMOUR_BONE_TITLE_LABELS: Record<BoneTumourBone, string> = {
  metacarpal: "metacarpal",
  proximal_phalanx: "proximal phalanx",
  middle_phalanx: "middle phalanx",
  distal_phalanx: "distal phalanx",
  carpal: "carpal bone",
  other: "other bone",
};

const DIGIT_BEARING_BONES: readonly BoneTumourBone[] = [
  "metacarpal",
  "proximal_phalanx",
  "middle_phalanx",
  "distal_phalanx",
];

/** Whether the digit row applies (metacarpal / phalanges — not carpal/other). */
export function isDigitBearingBone(bone: BoneTumourBone | null): boolean {
  return bone !== null && DIGIT_BEARING_BONES.includes(bone);
}

// ── Main data interface ───────────────────────────────────────────────────────

export interface BoneTumourData {
  /** Which bone the tumour was in */
  bone: BoneTumourBone | null;
  /** Which digit (only for digit-bearing bones) */
  digit: DigitId | null;
  /** Whether bone graft was used (shared osteotomy vocabulary) */
  graftType: OsteotomyGraftType | null;
  /** Graft donor site (conditional on graftType === "autograft") */
  graftDonorSite: OsteotomyGraftDonorSite | null;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createEmptyBoneTumourData(): BoneTumourData {
  return {
    bone: null,
    digit: null,
    graftType: null,
    graftDonorSite: null,
  };
}

// ── Procedure IDs that trigger the bone tumour details card ──────────────────

export const BONE_TUMOUR_PROCEDURE_IDS = [
  "hand_elective_curettage_bone_graft",
] as const;

// ── Summary strings ───────────────────────────────────────────────────────────

/**
 * Compact one-line summary for detail rows / exports,
 * e.g. "Mid phalanx, Dig. V · autograft (distal radius)".
 */
export function getBoneTumourSummary(data: BoneTumourData): string {
  const parts: string[] = [];

  if (data.bone) {
    let site = BONE_TUMOUR_BONE_LABELS[data.bone];
    if (data.digit && isDigitBearingBone(data.bone)) {
      site += `, Dig. ${data.digit}`;
    }
    parts.push(site);
  }

  if (data.graftType && data.graftType !== "none") {
    let graft: string = data.graftType;
    if (data.graftType === "autograft" && data.graftDonorSite) {
      const donor =
        GRAFT_DONOR_SITE_LABELS[data.graftDonorSite] ?? data.graftDonorSite;
      graft += ` (${donor.toLowerCase()})`;
    }
    parts.push(graft);
  }

  return parts.join(" · ");
}

/**
 * Title suffix appended to the diagnosis headline,
 * e.g. "middle phalanx, Dig. V" → "Enchondroma (hand / finger) — middle phalanx, Dig. V".
 * Returns null when no bone is recorded.
 */
export function getBoneTumourTitleSuffix(data: BoneTumourData): string | null {
  if (!data.bone) return null;
  const bone = BONE_TUMOUR_BONE_TITLE_LABELS[data.bone];
  if (data.digit && isDigitBearingBone(data.bone)) {
    return `${bone}, Dig. ${data.digit}`;
  }
  return bone;
}
