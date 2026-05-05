/**
 * Corrective Osteotomy Details
 *
 * Data model for the CorrectiveOsteotomyDetails inline assessment card,
 * activated when corrective osteotomy procedures are selected in the
 * Post-traumatic Bone elective hand subcategory.
 */

// ── Bone ──────────────────────────────────────────────────────────────────────

export type OsteotomyBone =
  | "metacarpal"
  | "proximal_phalanx"
  | "middle_phalanx"
  | "distal_radius"
  | "distal_ulna";

export const OSTEOTOMY_BONE_LABELS: Record<OsteotomyBone, string> = {
  metacarpal: "Metacarpal",
  proximal_phalanx: "Prox phalanx",
  middle_phalanx: "Mid phalanx",
  distal_radius: "Distal radius",
  distal_ulna: "Distal ulna",
};

// ── Bone site (conditional on bone selection) ─────────────────────────────────

export type OsteotomyBoneSite =
  // For metacarpal / phalanx:
  | "base"
  | "shaft"
  | "neck"
  | "head"
  // For distal radius:
  | "extra_articular"
  | "intra_articular";

export const MC_PHALANX_SITE_LABELS: Record<
  Extract<OsteotomyBoneSite, "base" | "shaft" | "neck" | "head">,
  string
> = {
  base: "Base",
  shaft: "Shaft",
  neck: "Neck",
  head: "Head",
};

export const DR_SITE_LABELS: Record<
  Extract<OsteotomyBoneSite, "extra_articular" | "intra_articular">,
  string
> = {
  extra_articular: "Extra-articular",
  intra_articular: "Intra-articular",
};

// ── Deformity type (multi-select) ─────────────────────────────────────────────

export type OsteotomyDeformityType =
  | "angular"
  | "rotational"
  | "shortening"
  | "combined";

export const DEFORMITY_TYPE_LABELS: Record<OsteotomyDeformityType, string> = {
  angular: "Angular",
  rotational: "Rotational",
  shortening: "Shortening",
  combined: "Combined",
};

// ── Osteotomy technique ───────────────────────────────────────────────────────

export type OsteotomyTechnique =
  | "opening_wedge"
  | "closing_wedge"
  | "dome"
  | "step_cut"
  | "transverse"
  | "oblique"
  | "intra_articular";

export const TECHNIQUE_LABELS: Record<OsteotomyTechnique, string> = {
  opening_wedge: "Opening wedge",
  closing_wedge: "Closing wedge",
  dome: "Dome",
  step_cut: "Step-cut",
  transverse: "Transverse",
  oblique: "Oblique",
  intra_articular: "Intra-articular",
};

// ── Bone graft ────────────────────────────────────────────────────────────────

export type OsteotomyGraftType =
  | "none"
  | "autograft"
  | "allograft"
  | "synthetic";

export const GRAFT_TYPE_LABELS: Record<OsteotomyGraftType, string> = {
  none: "None",
  autograft: "Autograft",
  allograft: "Allograft",
  synthetic: "Synthetic",
};

export type OsteotomyGraftDonorSite =
  | "iliac_crest"
  | "distal_radius"
  | "olecranon"
  | "local"
  | "other";

export const GRAFT_DONOR_SITE_LABELS: Record<OsteotomyGraftDonorSite, string> =
  {
    iliac_crest: "Iliac crest",
    distal_radius: "Distal radius",
    olecranon: "Olecranon",
    local: "Local",
    other: "Other",
  };

// ── Fixation ──────────────────────────────────────────────────────────────────

export type OsteotomyFixation =
  | "plate_screws"
  | "lag_screws"
  | "kwires"
  | "headless_compression_screw"
  | "external_fixator"
  | "combination";

export const FIXATION_LABELS: Record<OsteotomyFixation, string> = {
  plate_screws: "Plate + screws",
  lag_screws: "Lag screws",
  kwires: "K-wires",
  headless_compression_screw: "Headless screw",
  external_fixator: "Ex-fix",
  combination: "Combination",
};

// ── Main data interface ───────────────────────────────────────────────────────

export interface CorrectiveOsteotomyData {
  /** Which bone is being corrected */
  bone: OsteotomyBone | null;
  /** Specific bone site (conditional on bone selection) */
  boneSite: OsteotomyBoneSite | null;
  /** What type of deformity is being corrected */
  deformityType: OsteotomyDeformityType[];
  /** Osteotomy technique used */
  osteotomyTechnique: OsteotomyTechnique | null;
  /** Whether bone graft was used */
  graftType: OsteotomyGraftType | null;
  /** Graft donor site (conditional on graftType === "autograft") */
  graftDonorSite: OsteotomyGraftDonorSite | null;
  /** Fixation method */
  fixation: OsteotomyFixation | null;
  /** Whether 3D planning / PSI was used */
  threeDPlanning: boolean;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createEmptyOsteotomyData(): CorrectiveOsteotomyData {
  return {
    bone: null,
    boneSite: null,
    deformityType: [],
    osteotomyTechnique: null,
    graftType: null,
    graftDonorSite: null,
    fixation: null,
    threeDPlanning: false,
  };
}

// ── Procedure IDs that trigger the osteotomy details card ─────────────────────

export const OSTEOTOMY_PROCEDURE_IDS = [
  "hand_elective_corrective_osteotomy_hand",
  "hand_elective_corrective_osteotomy_radius",
  "hand_elective_ulna_shortening",
] as const;

// ── Summary string ────────────────────────────────────────────────────────────

const BONE_SHORT: Record<OsteotomyBone, string> = {
  metacarpal: "MC",
  proximal_phalanx: "PP",
  middle_phalanx: "MP",
  distal_radius: "DR",
  distal_ulna: "Ulna",
};

const FIXATION_SHORT: Record<OsteotomyFixation, string> = {
  plate_screws: "plate",
  lag_screws: "lag screws",
  kwires: "K-wires",
  headless_compression_screw: "HCS",
  external_fixator: "ex-fix",
  combination: "combined fixation",
};

export function getOsteotomySummary(data: CorrectiveOsteotomyData): string {
  const parts: string[] = [];

  if (data.bone) {
    parts.push(BONE_SHORT[data.bone]);
  }

  if (data.deformityType.length > 0) {
    parts.push(data.deformityType.join(" + "));
  }

  if (data.osteotomyTechnique) {
    parts.push(TECHNIQUE_LABELS[data.osteotomyTechnique].toLowerCase());
  }

  if (data.fixation) {
    parts.push(FIXATION_SHORT[data.fixation]);
  }

  if (data.graftType && data.graftType !== "none") {
    parts.push(`+ ${data.graftType}`);
  }

  if (data.threeDPlanning) {
    parts.push("(3D planned)");
  }

  return parts.join(", ");
}
