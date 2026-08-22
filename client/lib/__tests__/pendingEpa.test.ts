import { describe, it, expect } from "vitest";
import {
  filterPendingEpaTargets,
  countPendingEpaTargets,
  epaTargetCounterpartUserId,
} from "../pendingEpa";
import type { EpaAssessmentTarget } from "../epaDerivation";
import type { EpaTargetsWithCase } from "../assessmentStorage";

function makeTarget(
  overrides: Partial<EpaAssessmentTarget> = {},
): EpaAssessmentTarget {
  return {
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
    ...overrides,
  };
}

describe("epaTargetCounterpartUserId", () => {
  it("returns the trainee when the logger supervises", () => {
    expect(epaTargetCounterpartUserId(makeTarget())).toBe("user-trainee");
  });

  it("returns the supervisor when the logger is the trainee", () => {
    const t = makeTarget({
      supervisorContactId: "contact-2",
      supervisorLinkedUserId: "user-boss",
      traineeContactId: "self",
      traineeLinkedUserId: "user-owner",
    });
    expect(epaTargetCounterpartUserId(t)).toBe("user-boss");
  });
});

describe("filterPendingEpaTargets", () => {
  const entry: EpaTargetsWithCase = {
    caseId: "case-1",
    targets: [makeTarget()],
  };

  it("keeps a target whose counterpart share exists but is not revealed", () => {
    const result = filterPendingEpaTargets({
      targetsByCase: [entry],
      outbox: [
        { id: "share-1", caseId: "case-1", recipientUserId: "user-trainee" },
      ],
      revealedSharedCaseIds: new Set(),
    });
    expect(countPendingEpaTargets(result)).toBe(1);
  });

  it("drains a target once its counterpart share row is revealed", () => {
    const result = filterPendingEpaTargets({
      targetsByCase: [entry],
      outbox: [
        { id: "share-1", caseId: "case-1", recipientUserId: "user-trainee" },
      ],
      revealedSharedCaseIds: new Set(["share-1"]),
    });
    expect(result).toEqual([]);
  });

  it("keeps a target with no share row at all (case never reached them)", () => {
    const result = filterPendingEpaTargets({
      targetsByCase: [entry],
      outbox: [],
      revealedSharedCaseIds: new Set(["share-1"]),
    });
    expect(countPendingEpaTargets(result)).toBe(1);
  });

  it("does not drain on a revealed share for a DIFFERENT counterpart", () => {
    const result = filterPendingEpaTargets({
      targetsByCase: [entry],
      outbox: [
        { id: "share-2", caseId: "case-1", recipientUserId: "user-other" },
      ],
      revealedSharedCaseIds: new Set(["share-2"]),
    });
    expect(countPendingEpaTargets(result)).toBe(1);
  });

  it("drains per-target within a case, keeping the rest", () => {
    const two: EpaTargetsWithCase = {
      caseId: "case-1",
      targets: [
        makeTarget(),
        makeTarget({
          traineeContactId: "contact-2",
          traineeDisplayName: "Second T",
          traineeLinkedUserId: "user-second",
        }),
      ],
    };
    const result = filterPendingEpaTargets({
      targetsByCase: [two],
      outbox: [
        { id: "share-1", caseId: "case-1", recipientUserId: "user-trainee" },
        { id: "share-2", caseId: "case-1", recipientUserId: "user-second" },
      ],
      revealedSharedCaseIds: new Set(["share-1"]),
    });
    expect(countPendingEpaTargets(result)).toBe(1);
    expect(result[0]?.targets[0]?.traineeLinkedUserId).toBe("user-second");
  });

  it("offline (empty outbox) keeps everything pending", () => {
    const result = filterPendingEpaTargets({
      targetsByCase: [entry],
      outbox: [],
      revealedSharedCaseIds: new Set(["share-1"]),
    });
    expect(countPendingEpaTargets(result)).toBe(1);
  });

  it("matches the counterpart from the trainee direction too", () => {
    const traineeSide: EpaTargetsWithCase = {
      caseId: "case-1",
      targets: [
        makeTarget({
          supervisorContactId: "contact-9",
          supervisorLinkedUserId: "user-boss",
          traineeContactId: "self",
          traineeLinkedUserId: "user-owner",
        }),
      ],
    };
    const result = filterPendingEpaTargets({
      targetsByCase: [traineeSide],
      outbox: [
        { id: "share-9", caseId: "case-1", recipientUserId: "user-boss" },
      ],
      revealedSharedCaseIds: new Set(["share-9"]),
    });
    expect(result).toEqual([]);
  });
});
