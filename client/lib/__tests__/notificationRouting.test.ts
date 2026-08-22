import { describe, it, expect } from "vitest";
import { resolveNotificationTarget } from "../notificationRouting";

describe("resolveNotificationTarget", () => {
  const id = "share-1";

  it("routes case_shared and shared_case_update to SharedCaseDetail", () => {
    for (const type of ["case_shared", "shared_case_update"]) {
      expect(resolveNotificationTarget({ type, sharedCaseId: id })).toEqual({
        screen: "SharedCaseDetail",
        params: { sharedCaseId: id },
      });
    }
  });

  it("routes verification to SharedInbox", () => {
    expect(
      resolveNotificationTarget({ type: "verification", sharedCaseId: id }),
    ).toEqual({ screen: "SharedInbox" });
  });

  it("routes assessments_revealed to AssessmentReveal", () => {
    expect(
      resolveNotificationTarget({
        type: "assessments_revealed",
        sharedCaseId: id,
      }),
    ).toEqual({ screen: "AssessmentReveal", params: { sharedCaseId: id } });
  });

  it("routes assessment_pending for the OWNER to the Assessment screen", () => {
    // SharedCaseDetail's inbox endpoint 403s for owners — the old routing
    // stranded them on Verify/Dispute buttons that always failed.
    expect(
      resolveNotificationTarget({
        type: "assessment_pending",
        sharedCaseId: id,
        party: "owner",
      }),
    ).toEqual({ screen: "Assessment", params: { sharedCaseId: id } });
  });

  it("routes assessment_pending for recipients (and legacy payloads without party) to SharedCaseDetail", () => {
    for (const data of [
      { type: "assessment_pending", sharedCaseId: id, party: "recipient" },
      { type: "assessment_pending", sharedCaseId: id },
    ]) {
      expect(resolveNotificationTarget(data)).toEqual({
        screen: "SharedCaseDetail",
        params: { sharedCaseId: id },
      });
    }
  });

  it("routes assessment_ready_to_reveal to Assessment (reveal upload on focus)", () => {
    expect(
      resolveNotificationTarget({
        type: "assessment_ready_to_reveal",
        sharedCaseId: id,
      }),
    ).toEqual({ screen: "Assessment", params: { sharedCaseId: id } });
  });

  it("returns null without a sharedCaseId or for unknown types", () => {
    expect(resolveNotificationTarget({ type: "case_shared" })).toBeNull();
    expect(
      resolveNotificationTarget({ type: "mystery", sharedCaseId: id }),
    ).toBeNull();
    expect(resolveNotificationTarget({})).toBeNull();
  });
});
