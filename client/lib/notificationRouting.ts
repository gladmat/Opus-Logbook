/**
 * notificationRouting — pure mapping from a push notification's data
 * payload to the navigation target. Extracted from App.tsx so the routing
 * table is testable, and so `assessment_pending` can route by PARTY:
 * the commit-time push also fires at the case OWNER, for whom
 * SharedCaseDetail's inbox endpoint 403s — owners go straight to the
 * Assessment screen instead (its status endpoint authorizes both parties
 * and its focus effect performs any pending reveal upload).
 *
 * Legacy pushes without `party` keep the historical SharedCaseDetail
 * routing — that screen now detects owner mode itself and hides the
 * Verify/Dispute buttons, so the landing is no longer broken.
 */

export interface NotificationTarget {
  screen:
    | "SharedCaseDetail"
    | "SharedInbox"
    | "Assessment"
    | "AssessmentReveal";
  params?: { sharedCaseId: string };
}

export function resolveNotificationTarget(
  data: Record<string, unknown>,
): NotificationTarget | null {
  const type = data.type as string | undefined;
  const sharedCaseId = data.sharedCaseId as string | undefined;
  if (!sharedCaseId) return null;

  switch (type) {
    case "case_shared":
    case "shared_case_update":
      return { screen: "SharedCaseDetail", params: { sharedCaseId } };
    case "verification":
      return { screen: "SharedInbox" };
    case "assessments_revealed":
      return { screen: "AssessmentReveal", params: { sharedCaseId } };
    case "assessment_pending":
      return data.party === "owner"
        ? { screen: "Assessment", params: { sharedCaseId } }
        : { screen: "SharedCaseDetail", params: { sharedCaseId } };
    case "assessment_ready_to_reveal":
      // Opening the Assessment screen triggers the pending reveal upload.
      return { screen: "Assessment", params: { sharedCaseId } };
    default:
      return null;
  }
}
