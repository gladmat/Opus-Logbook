import { describe, it, expect } from "vitest";
import { planEpaTargetPersistence } from "../epaTargetPersistence";
import type { EpaAssessmentTarget, EpaExposureRecord } from "../epaDerivation";

const TARGET: EpaAssessmentTarget = {
  version: 3,
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
      supervisorRole: "SS",
      traineeRole: "PS",
    },
  ],
};

const EXPOSURE: EpaExposureRecord = {
  version: 3,
  participantContactId: "contact-2",
  participantDisplayName: "Assistant A",
  participantLinkedUserId: "user-assistant",
  participantTier: 2,
  units: [
    {
      procedureId: "proc-1",
      procedureSnomedCode: "123",
      procedureDisplayName: "Debridement",
      role: "FA",
      seniorDisplayNames: ["You"],
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
        derived: null,
      }),
    ).toEqual({ kind: "skip", reason: "no-profile" });
  });

  it("saves derived targets AND exposures when team + profile are present", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: true,
        isEdit: false,
        profileAvailable: true,
        derived: { targets: [TARGET], exposures: [EXPOSURE] },
      }),
    ).toEqual({ kind: "save", targets: [TARGET], exposures: [EXPOSURE] });
  });

  it("exposure-only derivation saves exposures with empty targets", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: true,
        isEdit: false,
        profileAvailable: true,
        derived: { targets: [], exposures: [EXPOSURE] },
      }),
    ).toEqual({ kind: "save", targets: [], exposures: [EXPOSURE] });
  });

  it("a genuine zero derivation still clears (save [], [])", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: true,
        isEdit: true,
        profileAvailable: true,
        derived: { targets: [], exposures: [] },
      }),
    ).toEqual({ kind: "save", targets: [], exposures: [] });
  });

  it("edit-save with the team removed clears stored targets", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: false,
        isEdit: true,
        profileAvailable: true,
        derived: null,
      }),
    ).toEqual({ kind: "save", targets: [], exposures: [] });
  });

  it("new case without a team is a no-op", () => {
    expect(
      planEpaTargetPersistence({
        hasTeam: false,
        isEdit: false,
        profileAvailable: true,
        derived: null,
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
        derived: null,
      }),
    ).toEqual({ kind: "save", targets: [], exposures: [] });
  });
});
