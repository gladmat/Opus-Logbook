import type { Specialty } from "@/types/case";
import type { EpisodeType, EpisodeLaterality } from "@/types/episode";

// ── Episode Type Suggestion ─────────────────────────────────────────────────

const SUBCATEGORY_TYPE_MAP: Record<string, EpisodeType> = {
  wound_management: "wound_management",
  skin_graft: "wound_management",
  chronic_wounds: "wound_management",
  burns: "burns_management",
  burns_acute: "burns_management",
  burns_reconstruction: "burns_management",
  skin_cancer: "cancer_pathway",
  melanoma: "cancer_pathway",
  breast_cancer: "cancer_pathway",
  cancer: "cancer_pathway",
  head_neck_cancer: "cancer_pathway",
  reconstruction: "staged_reconstruction",
  breast_reconstruction: "staged_reconstruction",
  flap_reconstruction: "staged_reconstruction",
  microsurgery: "multi_stage_microsurgery",
  free_flap: "multi_stage_microsurgery",
  infection: "infection_management",
  abscess: "infection_management",
};

const SPECIALTY_FALLBACK: Partial<Record<Specialty, EpisodeType>> = {
  burns: "burns_management",
  breast: "staged_reconstruction",
  orthoplastic: "staged_reconstruction",
};

export function suggestEpisodeType(
  specialty: Specialty,
  subcategory?: string,
): EpisodeType {
  if (subcategory) {
    const normalized = subcategory.toLowerCase().replace(/[\s-]/g, "_");
    const match = SUBCATEGORY_TYPE_MAP[normalized];
    if (match) return match;

    // Partial match
    for (const [key, type] of Object.entries(SUBCATEGORY_TYPE_MAP)) {
      if (normalized.includes(key) || key.includes(normalized)) return type;
    }
  }

  return SPECIALTY_FALLBACK[specialty] ?? "other";
}

// ── Episode Title Suggestion ────────────────────────────────────────────────

const LATERALITY_PREFIX: Record<EpisodeLaterality, string> = {
  left: "L",
  right: "R",
  bilateral: "Bilat",
  midline: "",
};

export function suggestEpisodeTitle(
  diagnosisName?: string,
  laterality?: EpisodeLaterality,
): string {
  if (!diagnosisName) return "";

  const prefix =
    laterality && laterality !== "midline"
      ? LATERALITY_PREFIX[laterality] + " "
      : "";

  // Shorten common patterns
  const shortened = diagnosisName
    .replace(/\s*\(.*?\)\s*/g, " ") // remove parentheticals
    .replace(/,.*$/, "") // remove after comma
    .trim();

  // Append "management" if not already implied
  const lower = shortened.toLowerCase();
  const hasSuffix =
    lower.includes("management") ||
    lower.includes("pathway") ||
    lower.includes("reconstruction") ||
    lower.includes("repair");

  return `${prefix}${shortened}${hasSuffix ? "" : " management"}`.trim();
}
