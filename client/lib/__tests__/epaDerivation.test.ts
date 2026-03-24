import { describe, it, expect } from "vitest";
import {
  deriveEpaAssessments,
  type EpaProcedureInput,
} from "../epaDerivation";
import type { CaseTeamMember } from "@/types/teamContacts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMember(
  overrides: Partial<CaseTeamMember> & { contactId: string },
): CaseTeamMember {
  return {
    displayName: `Member ${overrides.contactId}`,
    abbreviatedName: `M ${overrides.contactId.charAt(0)}.`,
    operativeRole: "FA",
    ...overrides,
  };
}

const proc: EpaProcedureInput = {
  procedureName: "Free flap - ALT",
  snomedCtCode: "234001",
};

const proc2: EpaProcedureInput = {
  procedureName: "Nerve repair",
  snomedCtCode: "567002",
};

// Logger defaults
const selfId = "self";
const selfUserId = "user-self";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("deriveEpaAssessments", () => {
  it("consultant (FA) + fellow (PS) → 1 pair: consultant supervises fellow", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "charlotte",
        linkedUserId: "user-charlotte",
        careerStage: "nz_fellow",
        operativeRole: "PS",
        displayName: "Charlotte L.",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant", // tier 5
      selfUserId,
      members,
      [proc],
    );

    expect(targets).toHaveLength(1);
    expect(targets[0]!.supervisorContactId).toBe(selfId);
    expect(targets[0]!.supervisorDisplayName).toBe("You");
    expect(targets[0]!.traineeContactId).toBe("charlotte");
    expect(targets[0]!.traineeDisplayName).toBe("Charlotte L.");
    expect(targets[0]!.procedureIndex).toBe(0);
    expect(targets[0]!.procedureSnomedCode).toBe("234001");
  });

  it("consultant (US) + fellow (PS) + registrar (FA) → 2 pairs", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "charlotte",
        linkedUserId: "user-charlotte",
        careerStage: "nz_fellow", // tier 4
        operativeRole: "PS",
        displayName: "Charlotte L.",
      }),
      makeMember({
        contactId: "michael",
        linkedUserId: "user-michael",
        careerStage: "nz_registrar_non_training", // tier 2
        operativeRole: "FA",
        displayName: "Michael W.",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant", // tier 5
      selfUserId,
      members,
      [proc],
    );

    expect(targets).toHaveLength(2);

    // Pair 1: consultant (tier 5) → fellow (tier 4)
    const pair1 = targets.find((t) => t.traineeContactId === "charlotte");
    expect(pair1).toBeDefined();
    expect(pair1!.supervisorContactId).toBe(selfId);

    // Pair 2: fellow (tier 4) → registrar (tier 2)
    const pair2 = targets.find((t) => t.traineeContactId === "michael");
    expect(pair2).toBeDefined();
    expect(pair2!.supervisorContactId).toBe("charlotte");
  });

  it("consultant (PS) + consultant (FA) → 0 pairs (equal tier)", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "other-consultant",
        linkedUserId: "user-other",
        careerStage: "nz_consultant", // tier 5, same as self
        operativeRole: "FA",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant", // tier 5
      selfUserId,
      members,
      [proc],
    );

    expect(targets).toHaveLength(0);
  });

  it("fellow (PS) + registrar (FA), self not consultant → 1 pair: fellow supervises registrar", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "registrar",
        linkedUserId: "user-registrar",
        careerStage: "nz_registrar_non_training", // tier 2
        operativeRole: "FA",
        displayName: "Registrar R.",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_fellow", // tier 4 (self is fellow)
      selfUserId,
      members,
      [proc],
    );

    expect(targets).toHaveLength(1);
    expect(targets[0]!.supervisorContactId).toBe(selfId);
    expect(targets[0]!.traineeContactId).toBe("registrar");
  });

  it("missing careerStage on team member → excluded from EPA", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "no-stage",
        linkedUserId: "user-no-stage",
        careerStage: null, // missing
        operativeRole: "FA",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant",
      selfUserId,
      members,
      [proc],
    );

    expect(targets).toHaveLength(0);
  });

  it("missing linkedUserId on team member → excluded from EPA", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "no-link",
        linkedUserId: null, // not linked to Opus user
        careerStage: "nz_fellow",
        operativeRole: "PS",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant",
      selfUserId,
      members,
      [proc],
    );

    expect(targets).toHaveLength(0);
  });

  it("missing logger careerStage → logger excluded, team-only pairs still derived", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "consultant",
        linkedUserId: "user-consultant",
        careerStage: "nz_consultant", // tier 5
        operativeRole: "US",
      }),
      makeMember({
        contactId: "fellow",
        linkedUserId: "user-fellow",
        careerStage: "nz_fellow", // tier 4
        operativeRole: "PS",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      null, // logger has no career stage
      selfUserId,
      members,
      [proc],
    );

    // Still generates pair between consultant and fellow
    expect(targets).toHaveLength(1);
    expect(targets[0]!.supervisorContactId).toBe("consultant");
    expect(targets[0]!.traineeContactId).toBe("fellow");
  });

  it("multi-procedure with different role overrides → correct per-procedure pairs", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "charlotte",
        linkedUserId: "user-charlotte",
        careerStage: "nz_fellow", // tier 4
        operativeRole: "PS",
        displayName: "Charlotte L.",
        // Override: FA on procedure 1
        procedureRoleOverrides: { 1: "FA" },
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant", // tier 5
      selfUserId,
      members,
      [proc, proc2],
    );

    // Both procedures generate 1 pair each (consultant → fellow)
    expect(targets).toHaveLength(2);

    const p0 = targets.find((t) => t.procedureIndex === 0);
    expect(p0!.traineeOperativeRole).toBe("PS"); // case default

    const p1 = targets.find((t) => t.procedureIndex === 1);
    expect(p1!.traineeOperativeRole).toBe("FA"); // overridden
  });

  it("presentForProcedures filters members per procedure", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "charlotte",
        linkedUserId: "user-charlotte",
        careerStage: "nz_fellow", // tier 4
        operativeRole: "PS",
        presentForProcedures: [0], // only present for procedure 0
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant", // tier 5
      selfUserId,
      members,
      [proc, proc2],
    );

    // Only procedure 0 generates a pair (charlotte not present for proc 1)
    expect(targets).toHaveLength(1);
    expect(targets[0]!.procedureIndex).toBe(0);
  });

  it("non-adjacent tiers: tier 5 + tier 2 (no tier 3/4) → 1 pair (they are adjacent in the sorted chain)", () => {
    // When only two tiers exist in the group, they ARE adjacent in the sorted
    // list even if the tier numbers aren't consecutive. The algorithm generates
    // pairs between consecutive entries in the sorted tier list.
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "registrar",
        linkedUserId: "user-registrar",
        careerStage: "nz_registrar_non_training", // tier 2
        operativeRole: "FA",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant", // tier 5
      selfUserId,
      members,
      [proc],
    );

    // These are the only two tiers present → they are adjacent in the chain
    expect(targets).toHaveLength(1);
    expect(targets[0]!.supervisorContactId).toBe(selfId);
    expect(targets[0]!.traineeContactId).toBe("registrar");
  });

  it("3-person chain: tier 5 + tier 4 + tier 2 → 2 pairs (5→4, 4→2)", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "fellow",
        linkedUserId: "user-fellow",
        careerStage: "nz_fellow", // tier 4
        operativeRole: "PS",
      }),
      makeMember({
        contactId: "registrar",
        linkedUserId: "user-registrar",
        careerStage: "nz_registrar_non_training", // tier 2
        operativeRole: "FA",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant", // tier 5
      selfUserId,
      members,
      [proc],
    );

    expect(targets).toHaveLength(2);

    // 5→4
    expect(targets.find((t) => t.traineeContactId === "fellow")).toBeDefined();
    // 4→2
    expect(
      targets.find(
        (t) =>
          t.supervisorContactId === "fellow" &&
          t.traineeContactId === "registrar",
      ),
    ).toBeDefined();
  });

  it("empty team members → 0 pairs", () => {
    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant",
      selfUserId,
      [],
      [proc],
    );
    expect(targets).toHaveLength(0);
  });

  it("empty procedures → 0 pairs", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "charlotte",
        linkedUserId: "user-charlotte",
        careerStage: "nz_fellow",
        operativeRole: "PS",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant",
      selfUserId,
      members,
      [],
    );
    expect(targets).toHaveLength(0);
  });

  it("multiple people at same tier → no pairs among them", () => {
    const members: CaseTeamMember[] = [
      makeMember({
        contactId: "fellow1",
        linkedUserId: "user-fellow1",
        careerStage: "nz_fellow", // tier 4
        operativeRole: "PS",
      }),
      makeMember({
        contactId: "fellow2",
        linkedUserId: "user-fellow2",
        careerStage: "uk_post_cct_fellow", // also tier 4
        operativeRole: "FA",
      }),
    ];

    const targets = deriveEpaAssessments(
      selfId,
      "nz_consultant", // tier 5
      selfUserId,
      members,
      [proc],
    );

    // consultant (5) → each fellow (4) = 2 pairs. No fellow→fellow pair.
    expect(targets).toHaveLength(2);
    expect(targets.every((t) => t.supervisorContactId === selfId)).toBe(true);
  });
});
