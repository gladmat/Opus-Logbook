/**
 * Dupuytren's Disease Assessment
 * ════════════════════════════════
 * Registry-grade per-ray joint-level data capture.
 * Follows HAKIR/ICHOM model: capture MCP + PIP per finger, auto-derive Tubiana.
 */

/** Finger identifier — matches DigitKey from handInfection.ts */
export type DupuytrenFingerId =
  | "thumb"
  | "index"
  | "middle"
  | "ring"
  | "little";

export type TubianaStage = "N" | "I" | "II" | "III" | "IV";

/**
 * Per-ray (per-finger) joint-level contracture data.
 * MCP and PIP extension deficits in degrees.
 * DIP is rare and captured only when abnormal.
 */
export interface DupuytrenRayAssessment {
  fingerId: DupuytrenFingerId;
  mcpExtensionDeficit: number; // degrees, 0–180, step 5
  pipExtensionDeficit: number; // degrees, 0–180, step 5
  dipExtensionDeficit?: number; // degrees, optional (rare)
  /** Auto-calculated: sum of MCP + PIP + (DIP ?? 0) */
  totalExtensionDeficit: number;
  /** Auto-calculated from totalExtensionDeficit */
  tubianaStage: TubianaStage;
}

/**
 * First web space contracture (thumb-index web).
 * Uses a separate assessment from finger contractures.
 */
export interface FirstWebSpaceAssessment {
  isAffected: boolean;
  /** Optional: thumb anteposition angle for web space staging */
  thumbAntepositionAngle?: number; // degrees
}

/**
 * Palm involvement — palmar nodules and cords.
 * Clinically important for documenting palm-only disease or
 * palm involvement accompanying finger contractures.
 */
export interface PalmInvolvement {
  hasNodule: boolean;
  hasCord: boolean;
}

/**
 * Dupuytren's diathesis features — prognostic indicators.
 * Optional Tier 3 depth fields.
 */
export interface DupuytrenDiathesis {
  familyHistory?: boolean;
  bilateralDisease?: boolean;
  ectopicLesions?: boolean; // Garrod's pads, Peyronie's, Ledderhose
  onsetBeforeAge50?: boolean;
}

/**
 * Previous treatment on this hand (for recurrence context).
 */
export interface DupuytrenPreviousTreatment {
  procedureType?:
    | "limited_fasciectomy"
    | "radical_fasciectomy"
    | "dermofasciectomy"
    | "needle_fasciotomy"
    | "collagenase"
    | "other";
  approximateDate?: string; // YYYY or YYYY-MM
  notes?: string;
}

export const PREVIOUS_TREATMENT_LABELS: Record<
  NonNullable<DupuytrenPreviousTreatment["procedureType"]>,
  string
> = {
  limited_fasciectomy: "Limited fasciectomy",
  radical_fasciectomy: "Radical fasciectomy",
  dermofasciectomy: "Dermofasciectomy",
  needle_fasciotomy: "Needle aponeurotomy / fasciotomy",
  collagenase: "Collagenase injection",
  other: "Other",
};

/**
 * Complete Dupuytren's assessment for a single hand.
 */
export interface DupuytrenAssessment {
  /** Affected rays — only populated rays are present */
  rays: DupuytrenRayAssessment[];

  /** First web space (separate from finger contractures) */
  firstWebSpace?: FirstWebSpaceAssessment;

  /** Palm involvement — palmar nodules and/or cords */
  palmInvolvement?: PalmInvolvement;

  /** Is this a revision case? (derived from diagnosis selection) */
  isRevision: boolean;

  /** Previous treatment on this hand (for recurrence context) */
  previousTreatment?: DupuytrenPreviousTreatment;

  /** Diathesis features (optional, Tier 3) */
  diathesis?: DupuytrenDiathesis;

  /** Auto-calculated: sum of all ray Tubiana numeric scores (0–20) */
  totalHandScore?: number;

  /** Auto-calculated: dominant contracture pattern */
  dominantPattern?: "mcp_predominant" | "pip_predominant" | "mixed";
}
