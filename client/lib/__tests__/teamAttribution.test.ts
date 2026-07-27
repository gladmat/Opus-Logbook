import { describe, it, expect } from "vitest";

import {
  isMemberPresentForProcedure,
  resolveMemberRoleForProcedure,
  teamHasPerProcedureData,
  caseHasStepData,
  buildPerProcedureTeamRows,
} from "../teamAttribution";
import type { CaseTeamMember } from "@/types/teamContacts";
import type { DiagnosisGroup, CaseProcedure } from "@/types/case";
import {
  SELF_PARTICIPANT_ID,
  type OperativeStep,
} from "@/types/operativeSteps";

function makeMember(
  overrides: Partial<CaseTeamMember> & { contactId: string },
): CaseTeamMember {
  return {
    displayName: "Dr Charlotte Lozen",
    abbreviatedName: "Charlotte L.",
    operativeRole: "FA",
    ...overrides,
  };
}

function makeProcedure(
  id: string,
  name: string,
  overrides: Partial<CaseProcedure> = {},
): CaseProcedure {
  return {
    id,
    sequenceOrder: 0,
    procedureName: name,
    specialty: "orthoplastic",
    subcategory: "",
    tags: [],
    snomedCtCode: "",
    snomedCtDisplay: "",
    ...overrides,
  } as CaseProcedure;
}

function makeGroup(id: string, procedures: CaseProcedure[]): DiagnosisGroup {
  return {
    id,
    specialty: "orthoplastic",
    procedures,
  } as DiagnosisGroup;
}

describe("isMemberPresentForProcedure", () => {
  it("treats null/undefined presentForProcedures as present everywhere", () => {
    expect(isMemberPresentForProcedure({ presentForProcedures: null }, 3)).toBe(
      true,
    );
    expect(isMemberPresentForProcedure({}, 0)).toBe(true);
  });

  it("treats an empty array as present nowhere", () => {
    expect(isMemberPresentForProcedure({ presentForProcedures: [] }, 0)).toBe(
      false,
    );
  });

  it("whitelists specific flat indices", () => {
    const m = { presentForProcedures: [0, 2] };
    expect(isMemberPresentForProcedure(m, 0)).toBe(true);
    expect(isMemberPresentForProcedure(m, 1)).toBe(false);
    expect(isMemberPresentForProcedure(m, 2)).toBe(true);
  });
});

describe("resolveMemberRoleForProcedure", () => {
  it("falls back to the case-level role without an override", () => {
    const m = makeMember({ contactId: "c1", operativeRole: "FA" });
    expect(resolveMemberRoleForProcedure(m, 0)).toBe("FA");
  });

  it("prefers the per-procedure override", () => {
    const m = makeMember({
      contactId: "c1",
      operativeRole: "FA",
      procedureRoleOverrides: { 1: "PS" },
    });
    expect(resolveMemberRoleForProcedure(m, 0)).toBe("FA");
    expect(resolveMemberRoleForProcedure(m, 1)).toBe("PS");
  });
});

describe("teamHasPerProcedureData", () => {
  it("is false for an empty/undefined team", () => {
    expect(teamHasPerProcedureData(undefined)).toBe(false);
    expect(teamHasPerProcedureData([])).toBe(false);
  });

  it("is false when every member uses case-level defaults", () => {
    expect(teamHasPerProcedureData([makeMember({ contactId: "c1" })])).toBe(
      false,
    );
  });

  it("is true with a role override", () => {
    expect(
      teamHasPerProcedureData([
        makeMember({ contactId: "c1", procedureRoleOverrides: { 0: "PS" } }),
      ]),
    ).toBe(true);
  });

  it("is true with an explicit presence whitelist (including empty)", () => {
    expect(
      teamHasPerProcedureData([
        makeMember({ contactId: "c1", presentForProcedures: [] }),
      ]),
    ).toBe(true);
    expect(
      teamHasPerProcedureData([
        makeMember({ contactId: "c1", presentForProcedures: [1] }),
      ]),
    ).toBe(true);
  });
});

describe("buildPerProcedureTeamRows", () => {
  it("returns empty for missing groups or team", () => {
    expect(buildPerProcedureTeamRows(undefined, undefined)).toEqual([]);
    expect(buildPerProcedureTeamRows([makeGroup("g1", [])], [])).toEqual([]);
  });

  it("uses flat indices across multiple diagnosis groups", () => {
    const groups = [
      makeGroup("g1", [
        makeProcedure("p0", "Debridement"),
        makeProcedure("p1", "Free ALT flap"),
      ]),
      makeGroup("g2", [makeProcedure("p2", "K-wire fixation")]),
    ];
    const team = [
      makeMember({
        contactId: "c1",
        operativeRole: "FA",
        // Override keyed on flat index 2 = first procedure of group 2
        procedureRoleOverrides: { 2: "PS" },
      }),
    ];
    const rows = buildPerProcedureTeamRows(groups, team);
    expect(rows.map((r) => r.flatIndex)).toEqual([0, 1, 2]);
    expect(rows[2]?.members[0]?.role).toBe("PS");
    expect(rows[2]?.members[0]?.hasOverride).toBe(true);
    expect(rows[0]?.members[0]?.role).toBe("FA");
    expect(rows[0]?.members[0]?.hasOverride).toBe(false);
  });

  it("excludes absent members but keeps the row", () => {
    const groups = [
      makeGroup("g1", [
        makeProcedure("p0", "Debridement"),
        makeProcedure("p1", "Free ALT flap"),
      ]),
    ];
    const team = [
      makeMember({ contactId: "c1", presentForProcedures: [1] }),
      makeMember({ contactId: "c2", presentForProcedures: [] }),
    ];
    const rows = buildPerProcedureTeamRows(groups, team);
    expect(rows[0]?.members).toHaveLength(0);
    expect(rows[1]?.members.map((m) => m.contactId)).toEqual(["c1"]);
  });

  it("skips unnamed procedure shells without shifting flat indices", () => {
    const groups = [
      makeGroup("g1", [
        makeProcedure("p0", "  "),
        makeProcedure("p1", "Free ALT flap"),
      ]),
    ];
    const team = [
      makeMember({
        contactId: "c1",
        // Keyed on flat index 1 — must still resolve after the empty
        // shell at index 0 is skipped for display.
        procedureRoleOverrides: { 1: "PS" },
      }),
    ];
    const rows = buildPerProcedureTeamRows(groups, team);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.flatIndex).toBe(1);
    expect(rows[0]?.members[0]?.role).toBe("PS");
  });

  it("does not report an override that matches the case-level role", () => {
    const groups = [makeGroup("g1", [makeProcedure("p0", "Debridement")])];
    const team = [
      makeMember({
        contactId: "c1",
        operativeRole: "FA",
        procedureRoleOverrides: { 0: "FA" },
      }),
    ];
    const rows = buildPerProcedureTeamRows(groups, team);
    expect(rows[0]?.members[0]?.hasOverride).toBe(false);
  });
});

describe("steps-authoritative attribution", () => {
  function makeOpStep(
    id: string,
    label: string,
    team: { participantId: string; role: CaseTeamMember["operativeRole"] }[],
    overrides: Partial<OperativeStep> = {},
  ): OperativeStep {
    return { id, kind: "custom", label, sequence: 0, team, ...overrides };
  }

  it("caseHasStepData gates on any procedure carrying steps", () => {
    expect(caseHasStepData(undefined)).toBe(false);
    expect(
      caseHasStepData([makeGroup("g1", [makeProcedure("p0", "Flap")])]),
    ).toBe(false);
    expect(
      caseHasStepData([
        makeGroup("g1", [
          makeProcedure("p0", "Flap", {
            operativeSteps: [makeOpStep("s1", "Harvest", [])],
          }),
        ]),
      ]),
    ).toBe(true);
  });

  it("a procedure with steps yields step rows and IGNORES flat overrides", () => {
    const groups = [
      makeGroup("g1", [
        makeProcedure("p0", "Free ALT flap", {
          operativeSteps: [
            makeOpStep(
              "s-harvest",
              "Harvest",
              [{ participantId: "c1", role: "PS" }],
              { sequence: 1 },
            ),
            makeOpStep(
              "s-prep",
              "Recipient prep",
              [
                { participantId: SELF_PARTICIPANT_ID, role: "PS" },
                { participantId: "c2", role: "FA" },
              ],
              { sequence: 0, concurrentWithPrevious: true },
            ),
          ],
        }),
      ]),
    ];
    const team = [
      // Flat data says c1 absent everywhere — steps must win.
      makeMember({
        contactId: "c1",
        presentForProcedures: [],
        procedureRoleOverrides: { 0: "SA" },
      }),
      makeMember({ contactId: "c2", displayName: "Dr Two" }),
    ];
    const rows = buildPerProcedureTeamRows(groups, team, "You");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.members).toHaveLength(0);
    const steps = rows[0]?.steps;
    expect(steps).toBeDefined();
    // Ordered by sequence, not array order.
    expect(steps?.map((s) => s.stepId)).toEqual(["s-prep", "s-harvest"]);
    expect(steps?.[0]?.concurrentWithPrevious).toBe(true);
    // Owner renders with the supplied label; c1's step role is PS despite
    // the flat SA override.
    expect(steps?.[0]?.members.map((m) => m.label)).toEqual([
      "You",
      "Charlotte L.",
    ]);
    expect(steps?.[1]?.members[0]?.role).toBe("PS");
  });

  it("drops step assignments for participants no longer on the team", () => {
    const groups = [
      makeGroup("g1", [
        makeProcedure("p0", "Flap", {
          operativeSteps: [
            makeOpStep("s1", "Harvest", [
              { participantId: "ghost", role: "FA" },
              { participantId: SELF_PARTICIPANT_ID, role: "PS" },
            ]),
          ],
        }),
      ]),
    ];
    const rows = buildPerProcedureTeamRows(
      groups,
      [makeMember({ contactId: "c1" })],
      "Dr Owner",
    );
    expect(rows[0]?.steps?.[0]?.members).toEqual([
      {
        participantId: SELF_PARTICIPANT_ID,
        label: "Dr Owner",
        role: "PS",
      },
    ]);
  });
});
