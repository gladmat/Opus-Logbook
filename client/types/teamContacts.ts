/**
 * Team contacts types for operative team management.
 * TeamMemberOperativeRole is PARALLEL to the existing OperativeRole + SupervisionLevel
 * system — it describes other people's roles, not the case logger's own role.
 */

// ---------------------------------------------------------------------------
// Operative role for team members (separate from logger's OperativeRole)
// ---------------------------------------------------------------------------

export type TeamMemberOperativeRole = "PS" | "FA" | "SS" | "US" | "SA";

export const TEAM_MEMBER_ROLE_LABELS: Record<TeamMemberOperativeRole, string> =
  {
    PS: "Primary Surgeon",
    FA: "First Assistant",
    SS: "Scrubbed Supervisor",
    US: "Unscrubbed Supervisor",
    SA: "Surgical Assistant",
  };

export const TEAM_MEMBER_ROLE_SHORT: Record<TeamMemberOperativeRole, string> = {
  PS: "PS",
  FA: "FA",
  SS: "SS",
  US: "US",
  SA: "SA",
};

// ---------------------------------------------------------------------------
// TeamContact — roster entry from server (per-user, not shared)
// ---------------------------------------------------------------------------

export interface TeamContact {
  id: string;
  ownerUserId: string;
  linkedUserId?: string | null;
  displayName: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  registrationNumber?: string | null;
  registrationJurisdiction?: string | null;
  careerStage?: string | null;
  defaultRole?: TeamMemberOperativeRole | null;
  notes?: string | null;
  facilityIds: string[];
  invitationSentAt?: string | null;
  invitationAcceptedAt?: string | null;
  linkConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// CaseTeamMember — snapshot captured at case save time
// ---------------------------------------------------------------------------

export interface CaseTeamMember {
  /** team_contacts.id */
  contactId: string;
  /** Snapshot of linked_user_id at save time */
  linkedUserId?: string | null;
  /** Snapshot — e.g. "Dr Charlotte Lozen" */
  displayName: string;
  /** Shortened — e.g. "Charlotte L." */
  abbreviatedName: string;
  /** Snapshot for EPA derivation */
  careerStage?: string | null;
  /** Their role in THIS case (case-level default) */
  operativeRole: TeamMemberOperativeRole;
  /** Procedure index → override role (only when different from case default) */
  procedureRoleOverrides?: Record<number, TeamMemberOperativeRole>;
  /** null = present for all procedures; number[] = specific procedure indices */
  presentForProcedures?: number[] | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates an abbreviated name: "Charlotte L."
 */
export function abbreviateName(firstName: string, lastName: string): string {
  if (!lastName) return firstName;
  return `${firstName} ${lastName.charAt(0)}.`;
}
