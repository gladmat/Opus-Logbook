import type { SharedCaseData } from "@/types/sharing";
import { getSeniorityTier } from "./seniorityTier";

export type AssessorRole = "supervisor" | "trainee";

/**
 * Determine the likely assessor role for the current user based on case context.
 *
 * Priority:
 * 1. **Seniority tier** (preferred): If the shared case operativeTeam contains
 *    a member linked to the other party with a career stage, compare tiers.
 *    Higher tier = supervisor. A consultant (tier 5) holding a retractor still
 *    supervises a fellow (tier 4) who is Primary Surgeon.
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

  // 1. Try seniority-tier-based detection from operativeTeam
  if (caseData?.operativeTeam) {
    const otherMember = caseData.operativeTeam.find(
      (m) => m.linkedUserId === otherUserId,
    );
    if (otherMember?.careerStage) {
      const otherTier = getSeniorityTier(otherMember.careerStage);
      // We need the logger's career stage too — it's not directly in the blob,
      // but if myUserId is in operativeTeam, use that.
      const selfMember = caseData.operativeTeam.find(
        (m) => m.linkedUserId === myUserId,
      );
      if (selfMember?.careerStage) {
        const myTier = getSeniorityTier(selfMember.careerStage);
        if (myTier !== null && otherTier !== null && myTier !== otherTier) {
          return myTier > otherTier ? "supervisor" : "trainee";
        }
      }
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
