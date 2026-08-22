import { describe, it, expect } from "vitest";
import { planEpaTargetPersistence } from "../epaTargetPersistence";
import type { EpaAssessmentTarget } from "../epaDerivation";

const TARGET: EpaAssessmentTarget = {
  version: 2,
  supervisorContactId: "self",
  supervisorDisplayName: "You",
  supervisorLinkedUserId: "user-owner",
  supervisorTier: 6,
  traineeContactId: "contact-1",
  traineeDisplayName: "Trainee T",
  traineeLinkedUserId: "user-trainee",
  traineeTier: 2,
  units: [
    {
      procedureId: "proc-1",
      procedureSnomedCode: "123",
      procedureDisplayName: "Debridement",
      supervisorRole: "PS",
      traineeRole: "FA",
    },
  ],
};

describe("planEpaTargetPersistence", () => {
  it("skips (never destroys) when the team is present but profile was unavailable", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: true,
        isEdit: true,
        profileAvailable: false,
        derivedTargets: null,
      }),
    ).toEqual({ kind: "skip", reason: "no-profile" });
  });

  it("saves derived targets when team + profile are present", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: true,
        isEdit: false,
        profileAvailable: true,
        derivedTargets: [TARGET],
      }),
    ).toEqual({ kind: "save", targets: [TARGET] });
  });

  it("a genuine zero-target derivation still clears (save [])", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: true,
        isEdit: true,
        profileAvailable: true,
        derivedTargets: [],
      }),
    ).toEqual({ kind: "save", targets: [] });
  });

  it("edit-save with the team removed clears stored targets", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: false,
        isEdit: true,
        profileAvailable: true,
        derivedTargets: null,
      }),
    ).toEqual({ kind: "save", targets: [] });
  });

  it("new case without a team is a no-op", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: false,
        isEdit: false,
        profileAvailable: true,
        derivedTargets: null,
      }),
    ).toEqual({ kind: "skip", reason: "not-applicable" });
  });

  it("edit-save with no team skips profile availability entirely (clear is safe)", () => {
    // The clear path doesn't depend on the profile — removing the team is an
    // explicit user action, not a transient hydration gap.
    expect(
      planEpaTargetPersistence({
        hasTeam: false,
        isEdit: true,
        profileAvailable: false,
        derivedTargets: null,
      }),
    ).toEqual({ kind: "save", targets: [] });
  });
});
