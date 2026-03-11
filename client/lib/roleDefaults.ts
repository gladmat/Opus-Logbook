import type { OperativeRole, SupervisionLevel } from "@/types/operativeRole";

/**
 * Career stages considered consultant-level for role defaults.
 * These users get auto-filled as responsible consultant and default to SURGEON + INDEPENDENT.
 */
const CONSULTANT_CAREER_STAGES = new Set([
  "consultant_specialist",
  "fellow",
  "moss",
]);

/**
 * Returns true if the given career stage is consultant-level.
 * Used for auto-filling responsible consultant and suggesting role defaults.
 */
export function isConsultantLevel(
  careerStage: string | null | undefined,
): boolean {
  return careerStage != null && CONSULTANT_CAREER_STAGES.has(careerStage);
}

/**
 * Suggests default role and supervision based on user profile.
 * Called when form initialises (new case) or when responsible consultant changes.
 */
export function suggestRoleDefaults(profile: {
  careerStage?: string | null;
  userId?: string;
} | null): { role: OperativeRole; supervision: SupervisionLevel } {
  if (!profile) {
    return { role: "SURGEON", supervision: "INDEPENDENT" };
  }

  if (isConsultantLevel(profile.careerStage)) {
    return { role: "SURGEON", supervision: "INDEPENDENT" };
  }

  // Trainee → Surgeon with supervisor scrubbed (most common training scenario)
  return { role: "SURGEON", supervision: "SUP_SCRUBBED" };
}
