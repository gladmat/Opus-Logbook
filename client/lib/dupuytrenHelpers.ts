import type {
  DupuytrenFingerId,
  DupuytrenRayAssessment,
  DupuytrenAssessment,
  DupuytrenDiathesis,
  TubianaStage,
} from "@/types/dupuytren";

// ── Constants ────────────────────────────────────────────────────────────────

/** Finger display order (clinical convention: radial → ulnar) */
export const FINGER_ORDER: DupuytrenFingerId[] = [
  "thumb",
  "index",
  "middle",
  "ring",
  "little",
];

/** Most commonly affected fingers (visual hint in picker) */
export const COMMON_DUPUYTREN_FINGERS: DupuytrenFingerId[] = [
  "ring",
  "little",
  "middle",
];

const FINGER_LABELS: Record<DupuytrenFingerId, string> = {
  thumb: "Thumb",
  index: "Index",
  middle: "Middle",
  ring: "Ring",
  little: "Little",
};

const TUBIANA_NUMERIC: Record<TubianaStage, number> = {
  N: 0,
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
};

// ── Tubiana Calculation ──────────────────────────────────────────────────────

/**
 * Calculate Tubiana stage from total passive extension deficit.
 * Stage N = no contracture (0°).
 */
export function calculateTubianaStage(totalDeficit: number): TubianaStage {
  if (totalDeficit <= 0) return "N";
  if (totalDeficit <= 45) return "I";
  if (totalDeficit <= 90) return "II";
  if (totalDeficit <= 135) return "III";
  return "IV";
}

// ── Ray Assessment ───────────────────────────────────────────────────────────

/**
 * Build a complete ray assessment from joint deficit inputs.
 */
export function buildRayAssessment(
  fingerId: DupuytrenFingerId,
  mcpDeficit: number,
  pipDeficit: number,
  dipDeficit?: number,
): DupuytrenRayAssessment {
  const total = mcpDeficit + pipDeficit + (dipDeficit ?? 0);
  return {
    fingerId,
    mcpExtensionDeficit: mcpDeficit,
    pipExtensionDeficit: pipDeficit,
    dipExtensionDeficit: dipDeficit,
    totalExtensionDeficit: total,
    tubianaStage: calculateTubianaStage(total),
  };
}

/**
 * Update a single joint deficit on a ray assessment, recalculating derived fields.
 */
export function updateRayJointDeficit(
  ray: DupuytrenRayAssessment,
  joint: "mcp" | "pip" | "dip",
  value: number,
): DupuytrenRayAssessment {
  const mcp = joint === "mcp" ? value : ray.mcpExtensionDeficit;
  const pip = joint === "pip" ? value : ray.pipExtensionDeficit;
  const dip =
    joint === "dip" ? value : (ray.dipExtensionDeficit ?? undefined);
  return buildRayAssessment(ray.fingerId, mcp, pip, dip);
}

// ── Summary Calculations ─────────────────────────────────────────────────────

/**
 * Calculate summary fields for the complete assessment.
 */
export function calculateDupuytrenSummary(
  assessment: DupuytrenAssessment,
): Pick<DupuytrenAssessment, "totalHandScore" | "dominantPattern"> {
  const totalHandScore = assessment.rays.reduce(
    (sum, ray) => sum + TUBIANA_NUMERIC[ray.tubianaStage],
    0,
  );

  const totalMcp = assessment.rays.reduce(
    (s, r) => s + r.mcpExtensionDeficit,
    0,
  );
  const totalPip = assessment.rays.reduce(
    (s, r) => s + r.pipExtensionDeficit,
    0,
  );

  let dominantPattern: DupuytrenAssessment["dominantPattern"] = "mixed";
  if (totalMcp > 0 && totalPip === 0) dominantPattern = "mcp_predominant";
  else if (totalPip > 0 && totalMcp === 0) dominantPattern = "pip_predominant";
  else if (totalMcp > totalPip * 2) dominantPattern = "mcp_predominant";
  else if (totalPip > totalMcp * 2) dominantPattern = "pip_predominant";

  return { totalHandScore, dominantPattern };
}

/**
 * Calculate diathesis score (count of positive features, 0–4).
 */
export function calculateDiathesisScore(
  diathesis: DupuytrenDiathesis,
): number {
  let score = 0;
  if (diathesis.familyHistory) score++;
  if (diathesis.bilateralDisease) score++;
  if (diathesis.ectopicLesions) score++;
  if (diathesis.onsetBeforeAge50) score++;
  return score;
}

// ── Display Text ─────────────────────────────────────────────────────────────

/**
 * Generate summary text for display in hub row / collapsed section.
 * e.g., "Ring (II) + Little (III), PIP-predominant"
 */
export function generateDupuytrenSummaryText(
  assessment: DupuytrenAssessment,
): string {
  if (assessment.rays.length === 0) return "No rays assessed";

  const rayTexts = assessment.rays.map(
    (r) => `${FINGER_LABELS[r.fingerId]} (${r.tubianaStage})`,
  );

  const parts = [rayTexts.join(" + ")];

  if (assessment.firstWebSpace?.isAffected) {
    parts.push("1st web");
  }

  if (assessment.palmInvolvement?.hasNodule || assessment.palmInvolvement?.hasCord) {
    const palmParts: string[] = [];
    if (assessment.palmInvolvement.hasNodule) palmParts.push("nodule");
    if (assessment.palmInvolvement.hasCord) palmParts.push("cord");
    parts.push(`palm (${palmParts.join(" + ")})`);
  }

  if (assessment.isRevision) {
    parts.push("recurrent");
  }

  return parts.join(", ");
}

/**
 * Get display label for a finger ID.
 */
export function getFingerLabel(fingerId: DupuytrenFingerId): string {
  return FINGER_LABELS[fingerId];
}

// ── Export Helpers ───────────────────────────────────────────────────────────

const DOMINANT_PATTERN_LABELS: Record<
  NonNullable<DupuytrenAssessment["dominantPattern"]>,
  string
> = {
  mcp_predominant: "MCP-predominant",
  pip_predominant: "PIP-predominant",
  mixed: "Mixed",
};

/**
 * Structured per-ray detail for CSV export.
 * e.g., "Ring: MCP 30° PIP 45° total 75° Tubiana II; Little: MCP 20° PIP 60° total 80° Tubiana II"
 */
export function generateDupuytrenCsvRayDetail(
  assessment: DupuytrenAssessment,
): string {
  if (assessment.rays.length === 0) return "";
  return assessment.rays
    .map(
      (r) =>
        `${FINGER_LABELS[r.fingerId]}: MCP ${r.mcpExtensionDeficit}° PIP ${r.pipExtensionDeficit}°${r.dipExtensionDeficit ? ` DIP ${r.dipExtensionDeficit}°` : ""} total ${r.totalExtensionDeficit}° Tubiana ${r.tubianaStage}`,
    )
    .join("; ");
}

/**
 * Dominant pattern label for CSV export.
 */
export function getDominantPatternLabel(
  pattern: DupuytrenAssessment["dominantPattern"],
): string {
  return pattern ? DOMINANT_PATTERN_LABELS[pattern] : "";
}
