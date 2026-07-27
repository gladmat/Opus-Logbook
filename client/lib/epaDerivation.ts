/**
 * EPA assessment-pair derivation — v2: pairs come from who actually worked
 * together on a UNIT (an operative step when the procedure has steps, else
 * the whole procedure), not from a case-wide seniority ladder.
 *
 * Rules:
 * - Unit expansion: a procedure with operativeSteps yields one unit per
 *   step and the step's team is AUTHORITATIVE (the flat presence/override
 *   maps are ignored for it). A procedure without steps is one unit whose
 *   participants come from the legacy flat maps, with the case owner
 *   included at their resolved procedure role.
 * - Pairing per unit: each eligible participant is paired with the most
 *   senior OTHER participant(s) on that unit — their de-facto
 *   supervisor(s). Ties at the top tier produce one pair per senior
 *   (two consultants scrubbed together both legitimately supervised).
 *   Same-tier-only units produce nothing (peers don't assess peers).
 * - Eligibility: linkedUserId + a known seniority tier. The logger is
 *   identified by linkedUserId and the "self" contactId sentinel.
 * - Aggregation: one target per supervisor–trainee USER pair per case
 *   (keyed by linkedUserId so two roster contacts linked to one account
 *   collapse), listing every contributing unit with the roles held on it.
 */

import { getSeniorityTier, type SeniorityTier } from "./seniorityTier";
import type {
  CaseTeamMember,
  TeamMemberOperativeRole,
} from "@/types/teamContacts";
import {
  SELF_PARTICIPANT_ID,
  type OperativeStep,
} from "@/types/operativeSteps";

// ── Types ────────────────────────────────────────────────────────────────────

/** One procedure from the saved case, in flat (global) order. */
export interface EpaUnitInput {
  procedureId: string;
  procedureName: string;
  snomedCtCode?: string;
  /** Flat 0-based index across all diagnosis groups — the key space of
   *  the legacy presentForProcedures / procedureRoleOverrides maps. */
  flatIndex: number;
  /** Operative steps, when the procedure carries them (authoritative). */
  steps?: OperativeStep[];
  /** The case owner's RESOLVED team-role for this procedure (mapped from
   *  operativeRoleOverride ?? defaultOperativeRole) — used only for the
   *  procedure-level fallback unit; step units carry their own roles. */
  ownerRole: TeamMemberOperativeRole;
}

/** A unit (step or whole procedure) a pair shared, with the roles held. */
export interface EpaUnitRef {
  procedureId: string;
  procedureSnomedCode: string;
  procedureDisplayName: string;
  stepId?: string;
  stepLabel?: string;
  supervisorRole: TeamMemberOperativeRole;
  traineeRole: TeamMemberOperativeRole;
}

/** v2 target — aggregated per supervisor–trainee pair per case. */
export interface EpaAssessmentTarget {
  version: 2;
  /** "self" when the logger is the supervisor. */
  supervisorContactId: string;
  supervisorDisplayName: string;
  supervisorLinkedUserId: string;
  supervisorTier: SeniorityTier;
  /** "self" when the logger is the trainee. */
  traineeContactId: string;
  traineeDisplayName: string;
  traineeLinkedUserId: string;
  traineeTier: SeniorityTier;
  /** Every step/procedure this pair shared. */
  units: EpaUnitRef[];
}

export interface EpaDerivationDiagnostics {
  /** Self + every tagged team member. */
  participantsConsidered: number;
  /** Members dropped for having no linked Opus account. */
  unlinkedSkipped: number;
  /** Linked members dropped for a missing/unknown career stage. */
  missingStageSkipped: number;
  /** ≥2 eligible participants, all one tier, zero targets — the silent
   *  "peers don't assess peers" case the alert should explain. */
  allSameTier: boolean;
}

export interface EpaDerivationResult {
  targets: EpaAssessmentTarget[];
  diagnostics: EpaDerivationDiagnostics;
}

// ── Internal participant type ────────────────────────────────────────────────

interface EligibleParticipant {
  contactId: string;
  displayName: string;
  linkedUserId: string;
  tier: SeniorityTier;
}

interface UnitParticipant extends EligibleParticipant {
  role: TeamMemberOperativeRole;
}

// ── Core algorithm ───────────────────────────────────────────────────────────

export function deriveEpaAssessments(params: {
  self: {
    linkedUserId: string;
    careerStage: string | null | undefined;
    displayName?: string;
  };
  teamMembers: CaseTeamMember[];
  units: EpaUnitInput[];
}): EpaDerivationResult {
  const { self, teamMembers, units } = params;

  // Eligibility roster
  const selfTier = getSeniorityTier(self.careerStage);
  const selfParticipant: EligibleParticipant | null =
    selfTier !== null
      ? {
          contactId: SELF_PARTICIPANT_ID,
          displayName: self.displayName ?? "You",
          linkedUserId: self.linkedUserId,
          tier: selfTier,
        }
      : null;

  const eligibleByContactId = new Map<string, EligibleParticipant>();
  let unlinkedSkipped = 0;
  let missingStageSkipped = 0;
  for (const m of teamMembers) {
    if (!m.linkedUserId) {
      unlinkedSkipped += 1;
      continue;
    }
    const tier = getSeniorityTier(m.careerStage);
    if (tier === null) {
      missingStageSkipped += 1;
      continue;
    }
    eligibleByContactId.set(m.contactId, {
      contactId: m.contactId,
      displayName: m.displayName,
      linkedUserId: m.linkedUserId,
      tier,
    });
  }

  // Pair accumulation keyed by USER pair (not contact pair)
  const targetsByPair = new Map<string, EpaAssessmentTarget>();

  const recordPair = (
    supervisor: UnitParticipant,
    trainee: UnitParticipant,
    unit: EpaUnitInput,
    step?: OperativeStep,
  ) => {
    const key = `${supervisor.linkedUserId}|${trainee.linkedUserId}`;
    let target = targetsByPair.get(key);
    if (!target) {
      target = {
        version: 2,
        supervisorContactId: supervisor.contactId,
        supervisorDisplayName: supervisor.displayName,
        supervisorLinkedUserId: supervisor.linkedUserId,
        supervisorTier: supervisor.tier,
        traineeContactId: trainee.contactId,
        traineeDisplayName: trainee.displayName,
        traineeLinkedUserId: trainee.linkedUserId,
        traineeTier: trainee.tier,
        units: [],
      };
      targetsByPair.set(key, target);
    }
    target.units.push({
      procedureId: unit.procedureId,
      procedureSnomedCode: unit.snomedCtCode ?? "",
      procedureDisplayName: unit.procedureName,
      stepId: step?.id,
      stepLabel: step?.label,
      supervisorRole: supervisor.role,
      traineeRole: trainee.role,
    });
  };

  const pairUnit = (
    participants: UnitParticipant[],
    unit: EpaUnitInput,
    step?: OperativeStep,
  ) => {
    for (const junior of participants) {
      // Candidates strictly senior to this participant, excluding anyone
      // who is the same user (self tagged as a roster contact).
      const seniors = participants.filter(
        (p) => p.tier > junior.tier && p.linkedUserId !== junior.linkedUserId,
      );
      if (seniors.length === 0) continue;
      const maxTier = Math.max(...seniors.map((p) => p.tier)) as SeniorityTier;
      for (const senior of seniors) {
        if (senior.tier === maxTier) {
          recordPair(senior, junior, unit, step);
        }
      }
    }
  };

  for (const unit of units) {
    if (unit.steps && unit.steps.length > 0) {
      // Step units — the step team is authoritative.
      const orderedSteps = [...unit.steps].sort(
        (a, b) => a.sequence - b.sequence,
      );
      for (const step of orderedSteps) {
        const participants: UnitParticipant[] = [];
        for (const assignment of step.team) {
          if (assignment.participantId === SELF_PARTICIPANT_ID) {
            if (selfParticipant) {
              participants.push({ ...selfParticipant, role: assignment.role });
            }
            continue;
          }
          const member = eligibleByContactId.get(assignment.participantId);
          if (member) {
            participants.push({ ...member, role: assignment.role });
          }
        }
        pairUnit(participants, unit, step);
      }
      continue;
    }

    // Procedure-level fallback unit — legacy flat maps + the owner.
    const participants: UnitParticipant[] = [];
    for (const m of teamMembers) {
      const eligible = eligibleByContactId.get(m.contactId);
      if (!eligible) continue;
      const present =
        m.presentForProcedures == null ||
        m.presentForProcedures.includes(unit.flatIndex);
      if (!present) continue;
      participants.push({
        ...eligible,
        role: m.procedureRoleOverrides?.[unit.flatIndex] ?? m.operativeRole,
      });
    }
    if (selfParticipant) {
      participants.push({ ...selfParticipant, role: unit.ownerRole });
    }
    pairUnit(participants, unit);
  }

  // Same-tier silence detection (case-wide, over the eligible roster)
  const eligibleAll = [
    ...(selfParticipant ? [selfParticipant] : []),
    ...eligibleByContactId.values(),
  ];
  const distinctTiers = new Set(eligibleAll.map((p) => p.tier));
  const allSameTier =
    eligibleAll.length >= 2 &&
    distinctTiers.size === 1 &&
    targetsByPair.size === 0;

  return {
    targets: Array.from(targetsByPair.values()),
    diagnostics: {
      participantsConsidered: teamMembers.length + 1,
      unlinkedSkipped,
      missingStageSkipped,
      allSameTier,
    },
  };
}
