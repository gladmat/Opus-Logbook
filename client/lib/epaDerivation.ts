/**
 * EPA assessment-pair derivation — v3: pairs come from who actually worked
 * together on a UNIT (an operative step when the procedure has steps, else
 * the whole procedure), not from a case-wide seniority ladder — and the
 * entrustment instrument fires ONLY when the trainee operated as Primary
 * Surgeon on that unit.
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
 * - ROLE GATE (v3): the entrustment anchors ("I had to do it" → "I did not
 *   need to be there") are only valid when the trainee PERFORMED. A junior
 *   whose role on the unit is PS yields an entrustment TARGET; a junior who
 *   was First Assistant / Surgical Assistant / (un)scrubbed supervisor on
 *   the unit yields an EXPOSURE record instead — logged participation with
 *   no entrustment instrument (no validated entrustment scale exists for
 *   the assisting role). The SUPERVISOR's own role is never gated:
 *   seniority, not scrub role, defines the teaching axis — a consultant
 *   holding a retractor as First Assistant still supervises the fellow who
 *   is Primary Surgeon.
 * - Eligibility: linkedUserId + a known seniority tier. The logger is
 *   identified by linkedUserId and the "self" contactId sentinel.
 * - Aggregation: one target per supervisor–trainee USER pair per case
 *   (keyed by linkedUserId so two roster contacts linked to one account
 *   collapse), listing every contributing unit with the roles held on it.
 *   Exposures aggregate per participant USER.
 *
 * Exposure records are derived + local: they never enter the commit-reveal
 * channel and never count as "pending" assessments.
 */

import { getSeniorityTier, type SeniorityTier } from "./seniorityTier";
import type {
  CaseTeamMember,
  TeamMemberOperativeRole,
} from "@/types/teamContacts";
import {
  SELF_PARTICIPANT_ID,
  ownerOperativeRoleToTeamRole,
  type OperativeStep,
} from "@/types/operativeSteps";
import {
  resolveOperativeRole,
  type OperativeRole,
} from "@/types/operativeRole";
import type { DiagnosisGroup } from "@/types/case";

// ── Role gate ────────────────────────────────────────────────────────────────

export type TraineeParticipationKind = "entrustment" | "assist" | "exposure";

/**
 * Classify a junior participant's unit role for the instrument trigger.
 * PS → the full entrustment pair fires. FA → assist participation (logged,
 * no entrustment). SA / SS / US → exposure only. The owner's SECOND_ASST /
 * OBSERVER already collapse to SA / US via ownerOperativeRoleToTeamRole, so
 * both land in "exposure" as intended.
 */
export function classifyTraineeParticipation(
  role: TeamMemberOperativeRole,
): TraineeParticipationKind {
  switch (role) {
    case "PS":
      return "entrustment";
    case "FA":
      return "assist";
    default:
      return "exposure";
  }
}

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
  /** Always "PS" on v3 targets (role gate). */
  traineeRole: TeamMemberOperativeRole;
}

/** v3 target — aggregated per supervisor–trainee pair per case. Units are
 *  restricted to those where the trainee operated as Primary Surgeon. */
export interface EpaAssessmentTarget {
  version: 3;
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
  /** Every step/procedure this pair shared with the trainee as PS. */
  units: EpaUnitRef[];
}

/** A unit a junior took part in under a senior WITHOUT operating as PS. */
export interface EpaExposureUnitRef {
  procedureId: string;
  procedureSnomedCode: string;
  procedureDisplayName: string;
  stepId?: string;
  stepLabel?: string;
  /** The role held on the unit — never "PS". */
  role: Exclude<TeamMemberOperativeRole, "PS">;
  /** The most-senior other participant(s) on the unit (display only). */
  seniorDisplayNames: string[];
}

/** Exposure record — aggregated per participant USER per case. Local and
 *  informational: never enters commit-reveal, never counts as pending. */
export interface EpaExposureRecord {
  version: 3;
  /** "self" when the logger is the participant. */
  participantContactId: string;
  participantDisplayName: string;
  participantLinkedUserId: string;
  participantTier: SeniorityTier;
  units: EpaExposureUnitRef[];
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
  /** Junior-with-senior unit instances dropped by the PS role gate
   *  (recorded as exposure instead of an entrustment pair). */
  roleGatedUnits: number;
  /** ≥1 unit was gated and zero targets derived — every junior on this
   *  case assisted rather than operated; the alert should say so. */
  exposureOnly: boolean;
}

export interface EpaDerivationResult {
  targets: EpaAssessmentTarget[];
  exposures: EpaExposureRecord[];
  diagnostics: EpaDerivationDiagnostics;
}

// ── Unit builder ─────────────────────────────────────────────────────────────

/**
 * Flatten a case's diagnosis groups into EpaUnitInput[]. The SINGLE source
 * of the flat-index space and owner-role resolution, shared by the owner
 * side (useCaseForm at save time) and the recipient side (epaFromBlob over
 * the decrypted SharedCaseData) — both sides must derive identical targets
 * from the same snapshot, so the unit construction must never diverge.
 */
export function buildEpaUnitsFromDiagnosisGroups(
  groups: DiagnosisGroup[],
  defaultOperativeRole: OperativeRole | undefined,
): EpaUnitInput[] {
  let flatIndex = 0;
  return groups.flatMap((g) =>
    (g.procedures ?? []).map((p) => ({
      procedureId: p.id,
      procedureName: p.procedureName,
      snomedCtCode: p.snomedCtCode,
      flatIndex: flatIndex++,
      steps: p.operativeSteps,
      ownerRole: ownerOperativeRoleToTeamRole(
        resolveOperativeRole(p.operativeRoleOverride, defaultOperativeRole),
      ),
    })),
  );
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
  // Exposure accumulation keyed by participant USER
  const exposuresByUser = new Map<string, EpaExposureRecord>();
  let roleGatedUnits = 0;

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
        version: 3,
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

  const recordExposure = (
    junior: UnitParticipant,
    seniors: UnitParticipant[],
    unit: EpaUnitInput,
    step?: OperativeStep,
  ) => {
    if (junior.role === "PS") return; // defensive — gate decides upstream
    let record = exposuresByUser.get(junior.linkedUserId);
    if (!record) {
      record = {
        version: 3,
        participantContactId: junior.contactId,
        participantDisplayName: junior.displayName,
        participantLinkedUserId: junior.linkedUserId,
        participantTier: junior.tier,
        units: [],
      };
      exposuresByUser.set(junior.linkedUserId, record);
    }
    record.units.push({
      procedureId: unit.procedureId,
      procedureSnomedCode: unit.snomedCtCode ?? "",
      procedureDisplayName: unit.procedureName,
      stepId: step?.id,
      stepLabel: step?.label,
      role: junior.role,
      seniorDisplayNames: seniors.map((s) => s.displayName),
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
      const topSeniors = seniors.filter((p) => p.tier === maxTier);
      // ROLE GATE: entrustment only when the junior operated as PS.
      if (classifyTraineeParticipation(junior.role) === "entrustment") {
        for (const senior of topSeniors) {
          recordPair(senior, junior, unit, step);
        }
      } else {
        roleGatedUnits += 1;
        recordExposure(junior, topSeniors, unit, step);
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
    exposures: Array.from(exposuresByUser.values()),
    diagnostics: {
      participantsConsidered: teamMembers.length + 1,
      unlinkedSkipped,
      missingStageSkipped,
      allSameTier,
      roleGatedUnits,
      exposureOnly: targetsByPair.size === 0 && roleGatedUnits > 0,
    },
  };
}
