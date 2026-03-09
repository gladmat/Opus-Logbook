/**
 * Registry-grade joint implant tracking for hand arthroplasty.
 * Covers CMC1, PIP, and MCP joint replacements.
 * Aligned with LROI, Norwegian Arthroplasty Registry, and HAKIR data models.
 */

import type { DigitId, Laterality } from "./case";

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface JointImplantDetails {
  // ── Auto-derived (Layer 0) ────────────────────────────────────────────
  jointType: ImplantJointType;
  indication: ImplantIndication;
  procedureType: "primary" | "revision";
  laterality?: Laterality;
  digit?: DigitId;

  // ── Implant identity (Layer 1) ────────────────────────────────────────
  implantSystemId: string; // Key into IMPLANT_CATALOGUE
  implantSystemOther?: string; // Free text only when implantSystemId === "other"

  // ── Sizing — varies by implant type ───────────────────────────────────
  /** For silicone spacers: single size (e.g., "1", "2", "00") */
  sizeUnified?: string;
  /** For total joints: per-component sizing */
  cupSize?: string;
  stemSize?: string;
  neckVariant?: string; // e.g., "standard_straight", "offset_short"
  linerType?: string; // e.g., "standard", "semi_retentive", "dual_mobility"

  // ── Surgical approach (Layer 1) ───────────────────────────────────────
  approach?: ImplantApproach;

  // ── Technical details (Layer 2) ───────────────────────────────────────
  fixation?: ImplantFixation;
  bearingSurface?: ImplantBearing; // Auto-populated from implant selection
  catalogueNumber?: string; // From implant sticker
  lotBatchNumber?: string; // From implant sticker
  udi?: string; // UDI barcode value
  grommetsUsed?: boolean; // Swanson MCP only
  cementBrand?: string; // Only when fixation includes cement

  // ── Revision-specific ─────────────────────────────────────────────────
  revisionReason?: RevisionReason;
  componentsRevised?: ("cup" | "stem" | "liner" | "all")[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type ImplantJointType = "cmc1" | "pip" | "mcp";

export type ImplantIndication =
  | "oa" // Primary osteoarthritis
  | "ra" // Rheumatoid / inflammatory arthritis
  | "post_traumatic" // Post-traumatic arthritis
  | "avascular_necrosis"
  | "tumour" // After tumour resection
  | "other";

export type ImplantApproach =
  // CMC1
  | "dorsal"
  | "wagner_lateral" // Lateropalmar / Wagner / modified Gedda-Moberg
  | "dorsoradial"
  // PIP
  | "dorsal_chamay" // Central slip reflecting
  | "dorsal_splitting" // Central slip splitting
  | "volar_simmen" // Simmen volar approach
  | "lateral_midaxial"
  // MCP
  | "dorsal_longitudinal"
  | "dorsal_transverse" // Multi-digit RA cases
  // Generic
  | "other";

export type ImplantFixation =
  | "cemented"
  | "uncemented" // Press-fit, HA-coated, porous-coated
  | "hybrid" // One component cemented, one press-fit
  | "not_applicable"; // Silicone spacers (encapsulation, not fixation)

export type ImplantBearing =
  | "silicone" // One-piece hinge
  | "metal_on_pe" // CoCr on UHMWPE (includes dual-mobility)
  | "metal_on_pe_dual_mobility" // Explicitly dual-mobility
  | "pyrocarbon_on_pyrocarbon"
  | "ceramic_on_ceramic"
  | "pyrocarbon_interposition" // Free spacer (Pi2, Pyrodisk)
  | "other";

export type RevisionReason =
  | "loosening"
  | "dislocation"
  | "fracture_implant" // Implant fracture (esp. silicone)
  | "fracture_periprosthetic"
  | "infection"
  | "wear"
  | "pain"
  | "stiffness"
  | "metallosis"
  | "subsidence"
  | "malalignment"
  | "other";

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL MAPS
// ═══════════════════════════════════════════════════════════════════════════════

export const JOINT_TYPE_LABELS: Record<ImplantJointType, string> = {
  cmc1: "CMC1 (thumb base)",
  pip: "PIP joint",
  mcp: "MCP joint",
};

export const INDICATION_LABELS: Record<ImplantIndication, string> = {
  oa: "Osteoarthritis",
  ra: "Rheumatoid / inflammatory",
  post_traumatic: "Post-traumatic",
  avascular_necrosis: "AVN",
  tumour: "Post-tumour resection",
  other: "Other",
};

export const APPROACH_LABELS: Record<ImplantApproach, string> = {
  dorsal: "Dorsal",
  wagner_lateral: "Wagner / lateral",
  dorsoradial: "Dorsoradial",
  dorsal_chamay: "Dorsal (Chamay)",
  dorsal_splitting: "Dorsal (central slip splitting)",
  volar_simmen: "Volar (Simmen)",
  lateral_midaxial: "Lateral (midaxial)",
  dorsal_longitudinal: "Dorsal (longitudinal)",
  dorsal_transverse: "Dorsal (transverse / multi-digit)",
  other: "Other",
};

export const FIXATION_LABELS: Record<ImplantFixation, string> = {
  cemented: "Cemented",
  uncemented: "Uncemented (press-fit)",
  hybrid: "Hybrid",
  not_applicable: "N/A (silicone spacer)",
};

export const BEARING_LABELS: Record<ImplantBearing, string> = {
  silicone: "Silicone (one-piece hinge)",
  metal_on_pe: "Metal (CoCr) on PE",
  metal_on_pe_dual_mobility: "Metal on PE (dual mobility)",
  pyrocarbon_on_pyrocarbon: "PyroCarbon on PyroCarbon",
  ceramic_on_ceramic: "Ceramic on ceramic",
  pyrocarbon_interposition: "PyroCarbon interposition",
  other: "Other",
};

export const REVISION_REASON_LABELS: Record<RevisionReason, string> = {
  loosening: "Aseptic loosening",
  dislocation: "Dislocation / instability",
  fracture_implant: "Implant fracture",
  fracture_periprosthetic: "Periprosthetic fracture",
  infection: "Infection",
  wear: "Wear / osteolysis",
  pain: "Unexplained pain",
  stiffness: "Stiffness / ankylosis",
  metallosis: "Metallosis / adverse reaction",
  subsidence: "Subsidence",
  malalignment: "Malalignment",
  other: "Other",
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Returns valid approaches for a given joint type */
export function getApproachesForJoint(
  joint: ImplantJointType,
): ImplantApproach[] {
  switch (joint) {
    case "cmc1":
      return ["dorsal", "wagner_lateral", "dorsoradial", "other"];
    case "pip":
      return [
        "dorsal_chamay",
        "dorsal_splitting",
        "volar_simmen",
        "lateral_midaxial",
        "other",
      ];
    case "mcp":
      return ["dorsal_longitudinal", "dorsal_transverse", "other"];
  }
}
