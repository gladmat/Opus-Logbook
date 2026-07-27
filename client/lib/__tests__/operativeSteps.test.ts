import { describe, it, expect } from "vitest";

import {
  SELF_PARTICIPANT_ID,
  buildFreeFlapStepTemplate,
  buildCustomStep,
  procedureHasSteps,
  resolveStepRole,
  renumberSteps,
  ownerOperativeRoleToTeamRole,
  stripParticipantsFromGroups,
  getStepsSummary,
  type OperativeStep,
  type StepTeamAssignment,
} from "@/types/operativeSteps";

const DEFAULT_TEAM: StepTeamAssignment[] = [
  { participantId: SELF_PARTICIPANT_ID, role: "PS" },
  { participantId: "c1", role: "FA" },
  { participantId: "c2", role: "SA" },
];

function makeStep(overrides: Partial<OperativeStep> = {}): OperativeStep {
  return {
    id: "s1",
    kind: "custom",
    label: "Test step",
    sequence: 0,
    team: DEFAULT_TEAM.map((a) => ({ ...a })),
    ...overrides,
  };
}

describe("buildFreeFlapStepTemplate", () => {
  it("produces the 3-step free flap template in order", () => {
    const steps = buildFreeFlapStepTemplate(DEFAULT_TEAM);
    expect(steps.map((s) => s.kind)).toEqual([
      "flap_harvest",
      "recipient_prep",
      "microsurgery_inset",
    ]);
    expect(steps.map((s) => s.sequence)).toEqual([0, 1, 2]);
    expect(new Set(steps.map((s) => s.id)).size).toBe(3);
  });

  it("covers all four capture-protocol operative tags across 3 steps", () => {
    const steps = buildFreeFlapStepTemplate();
    const tagUnion = new Set(steps.flatMap((s) => s.captureTags ?? []));
    expect(tagUnion).toEqual(
      new Set(["flap_harvest", "recipient_prep", "anastomosis", "flap_inset"]),
    );
  });

  it("seeds every step with an independent copy of the default team", () => {
    const steps = buildFreeFlapStepTemplate(DEFAULT_TEAM);
    for (const step of steps) {
      expect(step.team).toEqual(DEFAULT_TEAM);
    }
    // Mutating one step's team must not affect the others or the input.
    steps[0]!.team[0]!.role = "US";
    expect(steps[1]!.team[0]!.role).toBe("PS");
    expect(DEFAULT_TEAM[0]!.role).toBe("PS");
  });

  it("buildCustomStep produces an empty-label custom step", () => {
    const step = buildCustomStep(3, DEFAULT_TEAM);
    expect(step.kind).toBe("custom");
    expect(step.label).toBe("");
    expect(step.sequence).toBe(3);
    expect(step.team).toEqual(DEFAULT_TEAM);
  });
});

describe("step helpers", () => {
  it("procedureHasSteps", () => {
    expect(procedureHasSteps({})).toBe(false);
    expect(procedureHasSteps({ operativeSteps: [] })).toBe(false);
    expect(procedureHasSteps({ operativeSteps: [makeStep()] })).toBe(true);
  });

  it("resolveStepRole finds the participant's role or undefined", () => {
    const step = makeStep();
    expect(resolveStepRole(step, SELF_PARTICIPANT_ID)).toBe("PS");
    expect(resolveStepRole(step, "c1")).toBe("FA");
    expect(resolveStepRole(step, "missing")).toBeUndefined();
  });

  it("renumberSteps reassigns contiguous sequences preserving order", () => {
    const steps = [
      makeStep({ id: "a", sequence: 5 }),
      makeStep({ id: "b", sequence: 0 }),
      makeStep({ id: "c", sequence: 2 }),
    ];
    const renumbered = renumberSteps(steps);
    expect(renumbered.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(renumbered.map((s) => s.sequence)).toEqual([0, 1, 2]);
    // Steps already at the right sequence keep their object identity.
    const stable = renumberSteps(renumbered);
    expect(stable[0]).toBe(renumbered[0]);
  });

  it("ownerOperativeRoleToTeamRole maps the full matrix", () => {
    expect(ownerOperativeRoleToTeamRole("SURGEON")).toBe("PS");
    expect(ownerOperativeRoleToTeamRole("FIRST_ASST")).toBe("FA");
    expect(ownerOperativeRoleToTeamRole("SECOND_ASST")).toBe("SA");
    expect(ownerOperativeRoleToTeamRole("SUPERVISOR")).toBe("SS");
    expect(ownerOperativeRoleToTeamRole("OBSERVER")).toBe("US");
    expect(ownerOperativeRoleToTeamRole(undefined)).toBe("PS");
    expect(ownerOperativeRoleToTeamRole(null)).toBe("PS");
  });

  it("getStepsSummary counts steps and concurrency", () => {
    expect(getStepsSummary({})).toBeNull();
    expect(getStepsSummary({ operativeSteps: [] })).toBeNull();
    expect(getStepsSummary({ operativeSteps: [makeStep()] })).toBe("1 step");
    expect(
      getStepsSummary({
        operativeSteps: [
          makeStep({ id: "a" }),
          makeStep({ id: "b", concurrentWithPrevious: true }),
          makeStep({ id: "c" }),
        ],
      }),
    ).toBe("3 steps · 1 concurrent");
  });
});

describe("stripParticipantsFromGroups", () => {
  const makeGroups = () => [
    {
      procedures: [
        { operativeSteps: [makeStep({ id: "s1" })] },
        { operativeSteps: undefined },
      ],
    },
    {
      procedures: [{ operativeSteps: [makeStep({ id: "s2" })] }],
    },
  ];

  it("removes a single contact across all groups, keeping self", () => {
    const groups = makeGroups();
    const next = stripParticipantsFromGroups(groups, new Set(["c1"]));
    const ids = (steps: OperativeStep[] | undefined) =>
      steps?.[0]?.team.map((a) => a.participantId);
    expect(ids(next[0]!.procedures![0]!.operativeSteps)).toEqual([
      SELF_PARTICIPANT_ID,
      "c2",
    ]);
    expect(ids(next[1]!.procedures![0]!.operativeSteps)).toEqual([
      SELF_PARTICIPANT_ID,
      "c2",
    ]);
  });

  it('"all-contacts" strips every contact but never self', () => {
    const groups = makeGroups();
    const next = stripParticipantsFromGroups(groups, "all-contacts");
    expect(
      next[0]!.procedures![0]!.operativeSteps![0]!.team.map(
        (a) => a.participantId,
      ),
    ).toEqual([SELF_PARTICIPANT_ID]);
  });

  it("returns the SAME reference when nothing changes", () => {
    const groups = makeGroups();
    expect(stripParticipantsFromGroups(groups, new Set(["unknown"]))).toBe(
      groups,
    );
    const noSteps = [{ procedures: [{ operativeSteps: undefined }] }];
    expect(stripParticipantsFromGroups(noSteps, "all-contacts")).toBe(noSteps);
  });

  it("does not mutate the input", () => {
    const groups = makeGroups();
    stripParticipantsFromGroups(groups, "all-contacts");
    expect(groups[0]!.procedures![0]!.operativeSteps![0]!.team).toHaveLength(3);
  });
});
