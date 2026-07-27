/**
 * Pure helpers for resolving per-procedure operative-team attribution.
 *
 * The persisted representation lives on CaseTeamMember keyed by the 0-based
 * FLAT procedure index across all diagnosis groups (see teamContacts.ts and
 * remapTeamProcedureReferences in useCaseForm). These helpers centralise the
 * flatten + resolution so read-only surfaces (CaseDetailScreen,
 * SharedCaseDetailScreen) and tests share one implementation.
 *
 * No React Native imports — must stay importable from vitest.
 */

import type { DiagnosisGroup } from "@/types/case";
import type {
  CaseTeamMember,
  TeamMemberOperativeRole,
} from "@/types/teamContacts";
import {
  SELF_PARTICIPANT_ID,
  type OperativeStep,
} from "@/types/operativeSteps";

export interface ProcedureTeamRowMember {
  contactId: string;
  displayName: string;
  abbreviatedName: string;
  role: TeamMemberOperativeRole;
  /** True when the role deviates from the member's case-level role. */
  hasOverride: boolean;
}

export interface StepTeamRowMember {
  participantId: string;
  /** "You" (or the owner's name on the recipient side) for "self". */
  label: string;
  role: TeamMemberOperativeRole;
}

export interface StepTeamRow {
  stepId: string;
  label: string;
  concurrentWithPrevious: boolean;
  members: StepTeamRowMember[];
}

export interface ProcedureTeamRow {
  procedureId: string;
  procedureName: string;
  /** Flat 0-based index across all diagnosis groups (the override key space). */
  flatIndex: number;
  /** Members present for this procedure, in operativeTeam order.
   *  Empty when `steps` is set — step teams are authoritative. */
  members: ProcedureTeamRowMember[];
  /** Per-step attribution when the procedure carries operative steps. */
  steps?: StepTeamRow[];
}

/** null/undefined presentForProcedures = present for every procedure;
 *  an explicit array (including []) whitelists specific flat indices. */
export function isMemberPresentForProcedure(
  member: Pick<CaseTeamMember, "presentForProcedures">,
  flatIndex: number,
): boolean {
  return (
    member.presentForProcedures == null ||
    member.presentForProcedures.includes(flatIndex)
  );
}

export function resolveMemberRoleForProcedure(
  member: Pick<CaseTeamMember, "procedureRoleOverrides" | "operativeRole">,
  flatIndex: number,
): TeamMemberOperativeRole {
  return member.procedureRoleOverrides?.[flatIndex] ?? member.operativeRole;
}

/** True when any member carries per-procedure data (role overrides or an
 *  explicit presence whitelist) — the gate for the "By procedure" display. */
export function teamHasPerProcedureData(
  operativeTeam: CaseTeamMember[] | undefined,
): boolean {
  if (!operativeTeam || operativeTeam.length === 0) return false;
  return operativeTeam.some(
    (m) =>
      (m.procedureRoleOverrides &&
        Object.keys(m.procedureRoleOverrides).length > 0) ||
      m.presentForProcedures != null,
  );
}

/** True when any procedure carries operative steps — the second gate for
 *  the "By procedure" display (steps render even with a default-role team). */
export function caseHasStepData(
  diagnosisGroups: DiagnosisGroup[] | undefined,
): boolean {
  if (!diagnosisGroups) return false;
  return diagnosisGroups.some((g) =>
    (g.procedures ?? []).some((p) => (p.operativeSteps?.length ?? 0) > 0),
  );
}

export function buildStepTeamRows(
  steps: OperativeStep[],
  operativeTeam: CaseTeamMember[],
  ownerLabel: string,
): StepTeamRow[] {
  const memberById = new Map(operativeTeam.map((m) => [m.contactId, m]));
  return [...steps]
    .sort((a, b) => a.sequence - b.sequence)
    .map((step) => ({
      stepId: step.id,
      label: step.label || "Step",
      concurrentWithPrevious: step.concurrentWithPrevious === true,
      members: step.team
        .map((a): StepTeamRowMember | null => {
          if (a.participantId === SELF_PARTICIPANT_ID) {
            return {
              participantId: a.participantId,
              label: ownerLabel,
              role: a.role,
            };
          }
          const member = memberById.get(a.participantId);
          // Defensive: assignments for members no longer on the case are
          // stripped by the reducer, but shared blobs from other builds
          // could carry them — drop rather than render an orphan.
          if (!member) return null;
          return {
            participantId: a.participantId,
            label: member.abbreviatedName || member.displayName,
            role: a.role,
          };
        })
        .filter((m): m is StepTeamRowMember => m != null),
    }));
}

/**
 * Flatten diagnosis groups in order and resolve each procedure's present
 * members with their effective role. Procedures without a name (empty
 * shells) are skipped for display, but still consume a flat index so the
 * override keys stay aligned with the form's numbering.
 *
 * Procedures carrying operative steps get `steps` rows instead of flat
 * `members` — step teams are authoritative for those procedures.
 * `ownerLabel` names the case owner in step rows ("You" locally, the
 * owner's display name on the recipient side).
 */
export function buildPerProcedureTeamRows(
  diagnosisGroups: DiagnosisGroup[] | undefined,
  operativeTeam: CaseTeamMember[] | undefined,
  ownerLabel = "You",
): ProcedureTeamRow[] {
  if (!diagnosisGroups || !operativeTeam || operativeTeam.length === 0) {
    return [];
  }
  const rows: ProcedureTeamRow[] = [];
  let flatIndex = 0;
  for (const group of diagnosisGroups) {
    for (const proc of group.procedures ?? []) {
      const currentIndex = flatIndex;
      flatIndex += 1;
      if (!proc.procedureName?.trim()) continue;
      if (proc.operativeSteps?.length) {
        rows.push({
          procedureId: proc.id,
          procedureName: proc.procedureName,
          flatIndex: currentIndex,
          members: [],
          steps: buildStepTeamRows(
            proc.operativeSteps,
            operativeTeam,
            ownerLabel,
          ),
        });
        continue;
      }
      const members = operativeTeam
        .filter((m) => isMemberPresentForProcedure(m, currentIndex))
        .map((m) => ({
          contactId: m.contactId,
          displayName: m.displayName,
          abbreviatedName: m.abbreviatedName,
          role: resolveMemberRoleForProcedure(m, currentIndex),
          hasOverride:
            m.procedureRoleOverrides?.[currentIndex] != null &&
            m.procedureRoleOverrides[currentIndex] !== m.operativeRole,
        }));
      rows.push({
        procedureId: proc.id,
        procedureName: proc.procedureName,
        flatIndex: currentIndex,
        members,
      });
    }
  }
  return rows;
}
