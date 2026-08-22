import type { SharedCaseData } from "@/types/sharing";
import { getSeniorityTier } from "./seniorityTier";

export type AssessorRole = "supervisor" | "trainee";

/**
 * Career-stage tier for a user, looking in BOTH places a stage can live in
 * the blob: `ownerParticipant` (the case owner — NEVER in operativeTeam,
 * which carries tagged contacts only) and the operativeTeam snapshots.
 * Legacy blobs without `ownerParticipant` return null for the owner.
 */
function tierForUser(caseData: SharedCaseData, userId: string): number | null {
  if (caseData.ownerParticipant?.userId === userId) {
    return getSeniorityTier(caseData.ownerParticipant.careerStage);
  }
  const member = caseData.operativeTeam?.find((m) => m.linkedUserId === userId);
  return member ? getSeniorityTier(member.careerStage) : null;
}

/**
 * Determine the likely assessor role for the current user based on case context.
 *
 * Priority:
 * 1. **Seniority tier** (preferred): compare the two parties' career-stage
 *    tiers, sourcing the owner's from `ownerParticipant` (2.22.0+ blobs) and
 *    tagged members' from operativeTeam. Higher tier = supervisor. A
 *    consultant (tier 5) holding a retractor still supervises a fellow
 *    (tier 4) who is Primary Surgeon.
 * 2. **Operative role heuristic** (fallback): Owner with SUP_ supervision →
 *    supervisor; recipient with SURGEON role → trainee.
 * 3. **Default**: owner = supervisor, recipient = trainee.
 *
 * The UI should allow the user to override this — some cases have the
 * consultant as recipient (e.g. trainee logged the case and shared upward).
 */
export function determineAssessorRole(
  myUserId: string,
  ownerUserId: string,
  recipientUserId: string,
  caseData: SharedCaseData | null,
): AssessorRole {
  const isOwner = myUserId === ownerUserId;
  const otherUserId = isOwner ? recipientUserId : ownerUserId;

  // 1. Seniority-tier-based detection (ownerParticipant + operativeTeam)
  if (caseData) {
    const myTier = tierForUser(caseData, myUserId);
    const otherTier = tierForUser(caseData, otherUserId);
    if (myTier !== null && otherTier !== null && myTier !== otherTier) {
      return myTier > otherTier ? "supervisor" : "trainee";
    }
  }

  // 2. Operative role heuristic (fallback)
  if (caseData) {
    const supervision = caseData.supervisionLevel;
    if (
      isOwner &&
      typeof supervision === "string" &&
      supervision.startsWith("SUP_")
    ) {
      return "supervisor";
    }

    const role = caseData.operativeRole;
    if (!isOwner && role === "SURGEON") {
      return "trainee";
    }
  }

  // 3. Default: case owner is supervisor, recipient is trainee
  return isOwner ? "supervisor" : "trainee";
}
