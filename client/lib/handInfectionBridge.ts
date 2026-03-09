/**
 * Bridge between HandInfectionDetails (inline card) and InfectionOverlay (full module).
 * Used when a surgeon escalates from the inline HandInfectionCard to the full InfectionSheet.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  HandInfectionDetails,
  HandInfectionType,
  HandInfectionSeverity,
  HandOrganism,
} from "@/types/handInfection";
import type {
  InfectionOverlay,
  InfectionSyndrome,
  InfectionExtent,
  InfectionSeverity,
  InfectionLaterality,
  MicrobiologyData,
  OrganismEntry,
} from "@/types/infection";
import { HAND_ORGANISM_LABELS } from "@/types/handInfection";

// ═══════════════════════════════════════════════════════════════════════════════
// INFECTION TYPE → SYNDROME MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const INFECTION_TYPE_TO_SYNDROME: Record<HandInfectionType, InfectionSyndrome> =
  {
    superficial: "skin_soft_tissue",
    tendon_sheath: "deep_infection",
    deep_space: "deep_infection",
    joint: "bone_joint",
    bone: "bone_joint",
    necrotising: "necrotising_soft_tissue_infection",
    bite: "bite_related",
    post_operative: "wound_infection_dehiscence",
  };

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

function mapSeverity(
  severity: HandInfectionDetails["severity"],
): InfectionSeverity {
  switch (severity) {
    case "local":
      return "local";
    case "spreading":
      return "systemic_sepsis";
    case "systemic":
      return "shock_icu";
  }
}

function mapExtent(
  severity: HandInfectionDetails["severity"],
): InfectionExtent {
  switch (severity) {
    case "local":
      return "localized";
    case "spreading":
      return "regional";
    case "systemic":
      return "multi_compartment";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRIDGE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps HandInfectionDetails → InfectionOverlay for escalation to the full infection module.
 * Creates a new overlay if none exists, or merges into an existing one.
 */
export function handInfectionToOverlay(
  details: HandInfectionDetails,
  existingOverlay?: InfectionOverlay,
  laterality?: "left" | "right",
): InfectionOverlay {
  const now = new Date().toISOString();

  // Build microbiology data from inline card fields
  const microbiology: MicrobiologyData | undefined = details.culturesTaken
    ? {
        culturesTaken: true,
        cultureStatus: details.organism
          ? details.organism === "pending"
            ? "pending"
            : details.organism === "no_growth"
              ? "negative"
              : "positive"
          : "pending",
        organisms:
          details.organism &&
          details.organism !== "pending" &&
          details.organism !== "no_growth"
            ? [
                {
                  id: uuidv4(),
                  organismName:
                    details.organismOther && details.organism === "other"
                      ? details.organismOther
                      : HAND_ORGANISM_LABELS[details.organism],
                } satisfies OrganismEntry,
              ]
            : undefined,
      }
    : undefined;

  if (existingOverlay) {
    // Merge into existing overlay — update fields that the inline card captured
    return {
      ...existingOverlay,
      syndromePrimary: INFECTION_TYPE_TO_SYNDROME[details.infectionType],
      severity: mapSeverity(details.severity),
      extent: mapExtent(details.severity),
      icu: details.severity === "systemic",
      microbiology: microbiology ?? existingOverlay.microbiology,
      updatedAt: now,
    };
  }

  // Create new overlay from scratch
  return {
    id: uuidv4(),
    syndromePrimary: INFECTION_TYPE_TO_SYNDROME[details.infectionType],
    region: "hand",
    laterality: laterality ?? "na",
    extent: mapExtent(details.severity),
    severity: mapSeverity(details.severity),
    icu: details.severity === "systemic",
    vasopressors: false,
    microbiology,
    episodes: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVERSE BRIDGE: InfectionOverlay → HandInfectionDetails
// ═══════════════════════════════════════════════════════════════════════════════

const SYNDROME_TO_INFECTION_TYPE: Partial<
  Record<InfectionSyndrome, HandInfectionType>
> = {
  skin_soft_tissue: "superficial",
  deep_infection: "deep_space",
  bone_joint: "joint",
  necrotising_soft_tissue_infection: "necrotising",
  bite_related: "bite",
  wound_infection_dehiscence: "post_operative",
};

function reverseSeverity(
  severity: InfectionSeverity,
): HandInfectionSeverity {
  switch (severity) {
    case "local":
      return "local";
    case "systemic_sepsis":
      return "spreading";
    case "shock_icu":
      return "systemic";
  }
}

function reverseOrganism(
  organisms?: OrganismEntry[],
): HandOrganism | undefined {
  if (!organisms || organisms.length === 0) return undefined;
  const name = organisms[0]!.organismName;
  // Reverse lookup from labels
  for (const [key, label] of Object.entries(HAND_ORGANISM_LABELS)) {
    if (label === name) return key as HandOrganism;
  }
  return "other";
}

/**
 * Best-effort reverse mapping from InfectionOverlay → HandInfectionDetails.
 * Used when a case has an overlay but no inline card data (legacy or direct full-module entry).
 * Fields that don't exist on the overlay (digits, space, Kanavel, antibiotics) remain at defaults.
 */
export function overlayToHandInfection(
  overlay: InfectionOverlay,
): HandInfectionDetails {
  const infectionType =
    SYNDROME_TO_INFECTION_TYPE[overlay.syndromePrimary] ?? "superficial";
  const severity = reverseSeverity(overlay.severity);

  const organism = overlay.microbiology?.organisms
    ? reverseOrganism(overlay.microbiology.organisms)
    : overlay.microbiology?.cultureStatus === "negative"
      ? "no_growth" as HandOrganism
      : overlay.microbiology?.cultureStatus === "pending"
        ? "pending" as HandOrganism
        : undefined;

  return {
    infectionType,
    affectedDigits: [],
    severity,
    culturesTaken: overlay.microbiology?.culturesTaken,
    organism,
    organismOther:
      organism === "other" && overlay.microbiology?.organisms?.[0]
        ? overlay.microbiology.organisms[0].organismName
        : undefined,
    escalatedToFullModule: true,
  };
}
