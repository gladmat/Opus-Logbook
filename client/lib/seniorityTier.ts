/**
 * Seniority tier resolution for career stages.
 * Tier is derived at runtime, never stored in the database.
 *
 * The stage → tier map lives in shared/careerStages.ts (single source of
 * truth for client + server); this module delegates and keeps the legacy
 * stage aliases covered via LEGACY_CAREER_STAGE_TIERS as a superset over
 * CAREER_STAGE_OPTIONS.
 *
 * The 6-tier model:
 *   Tier 1 = Pre-training / Intern
 *   Tier 2 = Junior Trainee
 *   Tier 3 = Senior Trainee
 *   Tier 4 = Independent Specialist
 *   Tier 5 = Senior Specialist
 *   Tier 6 = Department Lead
 */

import {
  getCareerStageTierMap,
  getSeniorityTierForStage,
  type SeniorityTier,
} from "@shared/careerStages";

export type { SeniorityTier };

/**
 * Maps every career stage value (including legacy) to its seniority tier.
 */
export const CAREER_STAGE_TIERS: Record<string, SeniorityTier> = {
  ...getCareerStageTierMap(),
};

/**
 * Returns the seniority tier for a career stage value.
 * Returns null for unknown, null, or undefined values.
 */
export function getSeniorityTier(
  careerStage: string | null | undefined,
): SeniorityTier | null {
  return getSeniorityTierForStage(careerStage);
}

/**
 * Returns true if the senior's tier is strictly higher than the junior's tier.
 * Returns false if either value is unknown/null.
 */
export function isSeniorTo(
  seniorStage: string | null | undefined,
  juniorStage: string | null | undefined,
): boolean {
  const seniorTier = getSeniorityTier(seniorStage);
  const juniorTier = getSeniorityTier(juniorStage);
  if (seniorTier === null || juniorTier === null) return false;
  return seniorTier > juniorTier;
}
