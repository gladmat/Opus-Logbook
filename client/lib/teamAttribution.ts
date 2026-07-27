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

export interface ProcedureTeamRowMember {
  contactId: string;
  displayName: string;
  abbreviatedName: string;
  role: TeamMemberOperativeRole;
  /** True when the role deviates from the member's case-level role. */
  hasOverride: boolean;
}

export interface ProcedureTeamRow {
  procedureId: string;
  procedureName: string;
  /** Flat 0-based index across all diagnosis groups (the override key space). */
  flatIndex: number;
  /** Members present for this procedure, in operativeTeam order. */
  members: ProcedureTeamRowMember[];
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

/**
 * Flatten diagnosis groups in order and resolve each procedure's present
 * members with their effective role. Procedures without a name (empty
 * shells) are skipped for display, but still consume a flat index so the
 * override keys stay aligned with the form's numbering.
 */
export function buildPerProcedureTeamRows(
  diagnosisGroups: DiagnosisGroup[] | undefined,
  operativeTeam: CaseTeamMember[] | undefined,
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
