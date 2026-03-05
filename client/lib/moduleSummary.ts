/**
 * Summary generation for hub-and-spoke detail module rows.
 * Each function returns a one-line summary string or null if incomplete.
 */

import type {
  FreeFlapDetails,
  FractureEntry,
  HandTraumaDetails,
  FreeFlap,
} from "@/types/case";
import { FREE_FLAP_LABELS } from "@/types/case";
import type { InfectionOverlay } from "@/types/infection";
import {
  INFECTION_SYNDROME_LABELS,
  INFECTION_REGION_LABELS,
  INFECTION_LATERALITY_LABELS,
} from "@/types/infection";
import type { WoundAssessment } from "@/types/wound";
import { WOUND_BED_TISSUE_LABELS, HEALING_TREND_LABELS } from "@/types/wound";

/**
 * Flap Details summary — e.g. "DIEP, Left, ischaemia 42 min"
 */
export function generateFlapSummary(
  details: FreeFlapDetails | undefined,
): string | null {
  if (!details?.flapType) return null;

  const parts: string[] = [];
  parts.push(
    FREE_FLAP_LABELS[details.flapType as FreeFlap] || details.flapType,
  );

  if (details.harvestSide) {
    parts.push(details.harvestSide === "left" ? "Left" : "Right");
  }

  if (details.ischemiaTimeMinutes != null && details.ischemiaTimeMinutes > 0) {
    parts.push(`ischaemia ${details.ischemiaTimeMinutes} min`);
  }

  return parts.join(", ");
}

/**
 * Fracture Classification summary — e.g. "23-A2.1 Distal radius"
 */
export function generateFractureSummary(
  fractures: FractureEntry[] | undefined,
): string | null {
  if (!fractures || fractures.length === 0) return null;

  const first = fractures[0]!;
  let summary = `${first.aoCode} ${first.boneName}`;

  if (fractures.length > 1) {
    summary += ` + ${fractures.length - 1} more`;
  }

  return summary;
}

/**
 * Hand Structures summary — e.g. "FDP Zone II, ring + 3 more"
 */
export function generateHandTraumaSummary(
  details: HandTraumaDetails | undefined,
): string | null {
  if (!details?.injuredStructures || details.injuredStructures.length === 0) {
    return null;
  }

  const structures = details.injuredStructures;
  const first = structures[0]!;
  let summary = first.displayName;

  if (first.digit) {
    summary += `, ${first.digit}`;
  }

  if (structures.length > 1) {
    summary += ` + ${structures.length - 1} more`;
  }

  return summary;
}

/**
 * Unified Hand Trauma Assessment summary — combines fractures, structures, and dislocations.
 * e.g. "23-A2.1 Distal radius + FDP Zone II + 3 more"
 */
export function generateHandTraumaAssessmentSummary(
  details: HandTraumaDetails | undefined,
  fractures: FractureEntry[] | undefined,
): string | null {
  const parts: string[] = [];

  // Fractures
  if (fractures && fractures.length > 0) {
    const first = fractures[0]!;
    parts.push(`${first.aoCode} ${first.boneName}`);
    if (fractures.length > 1) {
      parts.push(`+${fractures.length - 1} fracture${fractures.length > 2 ? "s" : ""}`);
    }
  }

  // Dislocations
  if (details?.dislocations && details.dislocations.length > 0) {
    const jointLabels: Record<string, string> = {
      pip: "PIP", mcp: "MCP", cmc: "CMC", thumb_cmc: "Thumb CMC",
      druj: "DRUJ", perilunate: "Perilunate", lunate: "Lunate",
    };
    const first = details.dislocations[0]!;
    parts.push(`${jointLabels[first.joint] ?? first.joint} dislocation`);
    if (details.dislocations.length > 1) {
      parts.push(`+${details.dislocations.length - 1} more`);
    }
  }

  // Special injuries
  if (details?.isHighPressureInjection) parts.push("HPI");
  if (details?.isFightBite) parts.push("Fight bite");
  if (details?.isCompartmentSyndrome) parts.push("Compartment syndrome");
  if (details?.isRingAvulsion) parts.push("Ring avulsion");

  // Amputation
  if (details?.amputationLevel) {
    const levelLabels: Record<string, string> = {
      fingertip: "Fingertip", distal_phalanx: "Distal phalanx",
      middle_phalanx: "Middle phalanx", proximal_phalanx: "Proximal phalanx",
      mcp: "MCP level", ray: "Ray", hand_wrist: "Hand/wrist",
    };
    const label = levelLabels[details.amputationLevel] ?? details.amputationLevel;
    parts.push(`${label} amputation${details.isReplantable ? " (replantable)" : ""}`);
  }

  // Structures
  if (details?.injuredStructures && details.injuredStructures.length > 0) {
    const structures = details.injuredStructures;
    const first = structures[0]!;
    let structSummary = first.displayName;
    if (first.digit) structSummary += ` ${first.digit}`;
    parts.push(structSummary);
    if (structures.length > 1) {
      parts.push(`+${structures.length - 1} structure${structures.length > 2 ? "s" : ""}`);
    }
  }

  // Digits
  if (parts.length === 0 && details?.affectedDigits && details.affectedDigits.length > 0) {
    parts.push(`Digits: ${details.affectedDigits.join(", ")}`);
  }

  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Infection Details summary — e.g. "Skin/Soft Tissue, left hand, 2 episodes"
 */
export function generateInfectionSummary(
  overlay: InfectionOverlay | undefined,
): string | null {
  if (!overlay?.syndromePrimary) return null;

  const parts: string[] = [];
  parts.push(INFECTION_SYNDROME_LABELS[overlay.syndromePrimary]);

  if (overlay.laterality && overlay.laterality !== "na") {
    const lateralityLabel = INFECTION_LATERALITY_LABELS[overlay.laterality];
    const regionLabel = overlay.region
      ? INFECTION_REGION_LABELS[overlay.region]
      : undefined;
    if (regionLabel) {
      parts.push(
        `${lateralityLabel.toLowerCase()} ${regionLabel.toLowerCase()}`,
      );
    } else {
      parts.push(lateralityLabel);
    }
  } else if (overlay.region) {
    parts.push(INFECTION_REGION_LABELS[overlay.region]);
  }

  if (overlay.episodes && overlay.episodes.length > 0) {
    parts.push(
      `${overlay.episodes.length} episode${overlay.episodes.length !== 1 ? "s" : ""}`,
    );
  }

  return parts.join(", ");
}

/**
 * Wound Assessment summary — e.g. "3.2 x 2.1 cm, granulating, improving"
 */
export function generateWoundSummary(
  assessment: WoundAssessment | undefined,
): string | null {
  if (!assessment) return null;

  const hasDimensions =
    assessment.lengthCm != null || assessment.widthCm != null;
  if (!hasDimensions && !assessment.tissueType && !assessment.healingTrend) {
    return null;
  }

  const parts: string[] = [];

  if (assessment.lengthCm != null && assessment.widthCm != null) {
    let dim = `${assessment.lengthCm} \u00d7 ${assessment.widthCm}`;
    if (assessment.depthCm != null) {
      dim += ` \u00d7 ${assessment.depthCm}`;
    }
    dim += " cm";
    parts.push(dim);
  } else if (assessment.areaCm2 != null) {
    parts.push(`Area: ${assessment.areaCm2} cm\u00B2`);
  }

  if (assessment.tissueType) {
    parts.push(WOUND_BED_TISSUE_LABELS[assessment.tissueType]);
  }

  if (assessment.healingTrend) {
    parts.push(HEALING_TREND_LABELS[assessment.healingTrend]);
  }

  if (assessment.dressings.length > 0) {
    parts.push(
      `${assessment.dressings.length} dressing${assessment.dressings.length !== 1 ? "s" : ""}`,
    );
  }

  return parts.length > 0 ? parts.join(", ") : null;
}
