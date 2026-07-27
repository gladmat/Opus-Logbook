/**
 * Operative steps — an OPTIONAL layer inside a CaseProcedure for big cases
 * whose clinically distinct stages don't carry their own procedure codes
 * (free flap harvest / recipient vessel prep ± debridement / microsurgery
 * + inset), including two teams operating concurrently.
 *
 * Design contract (locked in the per-step team + EPA plan):
 * - Steps live in the encrypted case JSON (no server schema change) and
 *   are ADDITIVE: cases without steps behave exactly as before, and old
 *   clients JSON.parse shared blobs and ignore the field.
 * - Steps are keyed by UUID, never positional index — they ride inside
 *   their procedure object through SET_DIAGNOSIS_GROUPS untouched, so
 *   remapTeamProcedureReferences needs no knowledge of them.
 * - PRECEDENCE: when a procedure has steps, step teams are the source of
 *   truth for that procedure's team attribution. The procedure-level
 *   footer switches to a read-only summary, and (Phase 3) EPA derivation
 *   uses step teams and ignores the flat presence/override maps for that
 *   procedure. Report counts and the owner's formal logbook role
 *   (OperativeRole / SupervisionLevel) stay procedure-level — steps never
 *   change what is claimed to a training body.
 */

import { v4 as uuidv4 } from "uuid";
import type { TeamMemberOperativeRole } from "./teamContacts";
import type { OperativeRole } from "./operativeRole";
import type { MediaTag } from "./media";

/** participantId sentinel for the case owner ("You"). */
export const SELF_PARTICIPANT_ID = "self";

export type OperativeStepKind =
  | "flap_harvest"
  | "recipient_prep"
  | "microsurgery_inset"
  | "custom";

/**
 * One person's assignment on one step. `participantId` is
 * SELF_PARTICIPANT_ID for the case owner, else CaseTeamMember.contactId.
 * Absence from `team` means not present for the step.
 */
export interface StepTeamAssignment {
  participantId: string;
  role: TeamMemberOperativeRole;
}

export interface OperativeStep {
  /** UUID — identity survives reorder/edit; never positional. */
  id: string;
  kind: OperativeStepKind;
  /** Editable display label (pre-filled for seeded kinds). */
  label: string;
  /** Display order within the procedure (0-based, renumbered on edit). */
  sequence: number;
  /** Two-team concurrency: ran simultaneously with the previous step. */
  concurrentWithPrevious?: boolean;
  /** Who was on this step, with their role (owner = "self"). */
  team: StepTeamAssignment[];
  /** Capture-protocol tags this step corresponds to (photo checklist). */
  captureTags?: MediaTag[];
  notes?: string;
}

// ─── Free flap template ──────────────────────────────────────────────────────

/**
 * Three steps, not four: the anastomosis and the inset are one continuous
 * microsurgical sitting by the same operator(s), so person-attribution
 * between them is not training-relevant — but BOTH photo-checklist tags
 * ride on the merged step so the media protocol loses nothing. A user who
 * genuinely wants split micro attribution adds a custom step.
 */
export function buildFreeFlapStepTemplate(
  defaultTeam: StepTeamAssignment[] = [],
): OperativeStep[] {
  return [
    {
      id: uuidv4(),
      kind: "flap_harvest",
      label: "Free flap harvest",
      sequence: 0,
      team: defaultTeam.map((a) => ({ ...a })),
      captureTags: ["flap_harvest"],
    },
    {
      id: uuidv4(),
      kind: "recipient_prep",
      label: "Recipient vessel prep ± debridement",
      sequence: 1,
      concurrentWithPrevious: false,
      team: defaultTeam.map((a) => ({ ...a })),
      captureTags: ["recipient_prep"],
    },
    {
      id: uuidv4(),
      kind: "microsurgery_inset",
      label: "Microsurgery & inset",
      sequence: 2,
      team: defaultTeam.map((a) => ({ ...a })),
      captureTags: ["anastomosis", "flap_inset"],
    },
  ];
}

export function buildCustomStep(
  sequence: number,
  defaultTeam: StepTeamAssignment[] = [],
): OperativeStep {
  return {
    id: uuidv4(),
    kind: "custom",
    label: "",
    sequence,
    team: defaultTeam.map((a) => ({ ...a })),
  };
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

export function procedureHasSteps(proc: {
  operativeSteps?: OperativeStep[];
}): boolean {
  return (proc.operativeSteps?.length ?? 0) > 0;
}

/** Resolve a participant's role on a step; undefined = not present. */
export function resolveStepRole(
  step: OperativeStep,
  participantId: string,
): TeamMemberOperativeRole | undefined {
  return step.team.find((a) => a.participantId === participantId)?.role;
}

/** Re-assign contiguous 0-based sequences preserving array order. */
export function renumberSteps(steps: OperativeStep[]): OperativeStep[] {
  return steps.map((s, idx) =>
    s.sequence === idx ? s : { ...s, sequence: idx },
  );
}

/**
 * Map the case owner's formal logbook role to the team-role vocabulary
 * used on steps. Seeding-direction only — the formal role is never
 * derived back from a step. OBSERVER has no true team-role equivalent;
 * US (unscrubbed) is the nearest fit for someone present but not
 * operating.
 */
export function ownerOperativeRoleToTeamRole(
  role: OperativeRole | undefined | null,
): TeamMemberOperativeRole {
  switch (role) {
    case "FIRST_ASST":
      return "FA";
    case "SECOND_ASST":
      return "SA";
    case "SUPERVISOR":
      return "SS";
    case "OBSERVER":
      return "US";
    case "SURGEON":
    default:
      return "PS";
  }
}

/**
 * Remove participants' step assignments across all diagnosis groups —
 * called when team members are removed from the case. Returns the SAME
 * array reference when nothing changed so reducers can avoid useless
 * re-renders. Never touches the "self" assignment.
 */
export function stripParticipantsFromGroups<
  G extends {
    procedures?: { operativeSteps?: OperativeStep[] }[];
  },
>(groups: G[], contactIds: ReadonlySet<string> | "all-contacts"): G[] {
  const shouldStrip = (participantId: string): boolean => {
    if (participantId === SELF_PARTICIPANT_ID) return false;
    return contactIds === "all-contacts" || contactIds.has(participantId);
  };

  let anyChanged = false;
  const next = groups.map((group) => {
    let groupChanged = false;
    const procedures = (group.procedures ?? []).map((proc) => {
      if (!proc.operativeSteps?.length) return proc;
      let procChanged = false;
      const operativeSteps = proc.operativeSteps.map((step) => {
        if (!step.team.some((a) => shouldStrip(a.participantId))) return step;
        procChanged = true;
        return {
          ...step,
          team: step.team.filter((a) => !shouldStrip(a.participantId)),
        };
      });
      if (!procChanged) return proc;
      groupChanged = true;
      return { ...proc, operativeSteps };
    });
    if (!groupChanged) return group;
    anyChanged = true;
    return { ...group, procedures };
  });
  return anyChanged ? next : groups;
}

/** Compact summary for the Clinical Details hub row; null when no steps. */
export function getStepsSummary(proc: {
  operativeSteps?: OperativeStep[];
}): string | null {
  const steps = proc.operativeSteps;
  if (!steps || steps.length === 0) return null;
  const concurrent = steps.filter((s) => s.concurrentWithPrevious).length;
  const base = `${steps.length} step${steps.length === 1 ? "" : "s"}`;
  return concurrent > 0 ? `${base} · ${concurrent} concurrent` : base;
}
