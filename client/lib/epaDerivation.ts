/**
 * EPA supervision chain derivation.
 *
 * Derives assessment pairs from seniority tiers, NOT operative roles.
 * A consultant (tier 5) holding a retractor as First Assistant still
 * supervises the fellow (tier 4) who is Primary Surgeon.
 *
 * Rules:
 * - Adjacent tiers only: tier 5→4 generates a pair, tier 5→2 does NOT
 * - Equal tiers: no assessment (peers don't assess each other)
 * - Each procedure generates independent pairs
 * - Participants need both linkedUserId AND careerStage
 * - The case logger is always a participant
 */

import { getSeniorityTier, type SeniorityTier } from "./seniorityTier";
import type {
  CaseTeamMember,
  TeamMemberOperativeRole,
} from "@/types/teamContacts";

// ── Types ────────────────────────────────────────────────────────────────────

export interface EpaAssessmentTarget {
  procedureIndex: number;
  procedureSnomedCode: string;
  procedureDisplayName: string;
  supervisorContactId: string;
  supervisorDisplayName: string;
  supervisorLinkedUserId: string;
  supervisorOperativeRole: TeamMemberOperativeRole;
  traineeContactId: string;
  traineeDisplayName: string;
  traineeLinkedUserId: string;
  traineeOperativeRole: TeamMemberOperativeRole;
}

/** Minimal procedure shape needed for EPA derivation. */
export interface EpaProcedureInput {
  procedureName: string;
  snomedCtCode?: string;
}

// ── Internal participant type ────────────────────────────────────────────────

interface TieredParticipant {
  contactId: string;
  displayName: string;
  linkedUserId: string;
  careerStage: string;
  operativeRole: TeamMemberOperativeRole;
  tier: SeniorityTier;
}

// ── Core algorithm ───────────────────────────────────────────────────────────

/**
 * Derive EPA assessment targets from the seniority chain.
 *
 * @param myContactId - Synthetic contact ID for the case logger (e.g. "self")
 * @param myCareerStage - Logger's career stage
 * @param myLinkedUserId - Logger's user ID
 * @param teamMembers - Tagged operative team from the case
 * @param procedures - Procedures from the case's diagnosis groups
 */
export function deriveEpaAssessments(
  myContactId: string,
  myCareerStage: string | null | undefined,
  myLinkedUserId: string,
  teamMembers: CaseTeamMember[],
  procedures: EpaProcedureInput[],
): EpaAssessmentTarget[] {
  const targets: EpaAssessmentTarget[] = [];

  for (let procIdx = 0; procIdx < procedures.length; procIdx++) {
    const proc = procedures[procIdx]!;

    // Collect team members present for this procedure
    const presentMembers = teamMembers
      .filter(
        (tm) =>
          !tm.presentForProcedures || tm.presentForProcedures.includes(procIdx),
      )
      .map((tm) => ({
        contactId: tm.contactId,
        displayName: tm.displayName,
        linkedUserId: tm.linkedUserId,
        careerStage: tm.careerStage,
        operativeRole: tm.procedureRoleOverrides?.[procIdx] ?? tm.operativeRole,
      }));

    // Build tiered participants: must have both linkedUserId AND careerStage
    const tieredParticipants: TieredParticipant[] = [];

    for (const m of presentMembers) {
      if (!m.linkedUserId || !m.careerStage) continue;
      const tier = getSeniorityTier(m.careerStage);
      if (tier === null) continue;
      tieredParticipants.push({
        contactId: m.contactId,
        displayName: m.displayName,
        linkedUserId: m.linkedUserId,
        careerStage: m.careerStage,
        operativeRole: m.operativeRole,
        tier,
      });
    }

    // Add self (the case logger) as a participant
    if (myCareerStage) {
      const selfTier = getSeniorityTier(myCareerStage);
      if (selfTier !== null) {
        tieredParticipants.push({
          contactId: myContactId,
          displayName: "You",
          linkedUserId: myLinkedUserId,
          careerStage: myCareerStage,
          operativeRole: "PS" as TeamMemberOperativeRole,
          tier: selfTier,
        });
      }
    }

    // Group by tier, sort tiers descending
    const tierGroups = new Map<SeniorityTier, TieredParticipant[]>();
    for (const p of tieredParticipants) {
      const group = tierGroups.get(p.tier);
      if (group) {
        group.push(p);
      } else {
        tierGroups.set(p.tier, [p]);
      }
    }
    const sortedTiers = Array.from(tierGroups.keys()).sort((a, b) => b - a);

    // Generate pairs between ADJACENT tiers only
    for (let i = 0; i < sortedTiers.length - 1; i++) {
      const seniorTier = sortedTiers[i]!;
      const juniorTier = sortedTiers[i + 1]!;
      const seniors = tierGroups.get(seniorTier)!;
      const juniors = tierGroups.get(juniorTier)!;

      for (const senior of seniors) {
        for (const junior of juniors) {
          targets.push({
            procedureIndex: procIdx,
            procedureSnomedCode: proc.snomedCtCode ?? "",
            procedureDisplayName: proc.procedureName,
            supervisorContactId: senior.contactId,
            supervisorDisplayName: senior.displayName,
            supervisorLinkedUserId: senior.linkedUserId,
            supervisorOperativeRole: senior.operativeRole,
            traineeContactId: junior.contactId,
            traineeDisplayName: junior.displayName,
            traineeLinkedUserId: junior.linkedUserId,
            traineeOperativeRole: junior.operativeRole,
          });
        }
      }
    }
  }

  return targets;
}
