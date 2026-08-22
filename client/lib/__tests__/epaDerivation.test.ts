import { describe, it, expect } from "vitest";

import {
  deriveEpaAssessments,
  classifyTraineeParticipation,
  type EpaUnitInput,
} from "../epaDerivation";
import { migrateLegacyEpaTargets } from "../epaTargetMigration";
import type { CaseTeamMember } from "@/types/teamContacts";
import type { OperativeStep } from "@/types/operativeSteps";

// ── Fixtures ─────────────────────────────────────────────────────────────────
// Stages resolve through the real seniority map; the tests only rely on
// their relative ordering: nz_consultant > nz_fellow > nz_set_trainee.
// Members default to PS (the role the entrustment pair fires for); tests
// that exercise the role gate set FA / SA / SS / US explicitly.

const SELF = {
  linkedUserId: "u-self",
  careerStage: "nz_consultant",
  displayName: "You",
};

function makeMember(
  overrides: Partial<CaseTeamMember> & { contactId: string },
): CaseTeamMember {
  return {
    displayName: "Dr Member",
    abbreviatedName: "Member D.",
    operativeRole: "PS",
    linkedUserId: `u-${overrides.contactId}`,
    careerStage: "nz_fellow",
    ...overrides,
  };
}

function makeUnit(
  overrides: Partial<EpaUnitInput> & { procedureId: string },
): EpaUnitInput {
  return {
    procedureName: "Free ALT flap",
    snomedCtCode: "771225007",
    flatIndex: 0,
    ownerRole: "SS",
    ...overrides,
  };
}

function makeStep(
  id: string,
  label: string,
  team: OperativeStep["team"],
  sequence = 0,
): OperativeStep {
  return { id, kind: "custom", label, sequence, team };
}

// ── The reported case ────────────────────────────────────────────────────────

describe("deriveEpaAssessments — the two-team free flap case", () => {
  it("pairs from who actually shared each step, gated on the junior being PS", () => {
    // Consultant + fellow raised the flap (fellow PS); the logging
    // consultant + trainee prepped recipient vessels (trainee FA → exposure
    // only); trainee + fellow did the micro (trainee PS).
    const consultant = makeMember({
      contactId: "c-cons",
      displayName: "Dr Consultant",
      careerStage: "nz_consultant",
    });
    const fellow = makeMember({
      contactId: "c-fell",
      displayName: "Dr Fellow",
      careerStage: "nz_fellow",
    });
    const trainee = makeMember({
      contactId: "c-trn",
      displayName: "Dr Trainee",
      careerStage: "nz_set_trainee",
    });

    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [consultant, fellow, trainee],
      units: [
        makeUnit({
          procedureId: "p-flap",
          steps: [
            makeStep(
              "s-harvest",
              "Free flap harvest",
              [
                { participantId: "c-cons", role: "SS" },
                { participantId: "c-fell", role: "PS" },
              ],
              0,
            ),
            makeStep(
              "s-prep",
              "Recipient vessel prep",
              [
                { participantId: "self", role: "PS" },
                { participantId: "c-trn", role: "FA" },
              ],
              1,
            ),
            makeStep(
              "s-micro",
              "Microsurgery & inset",
              [
                { participantId: "c-fell", role: "SS" },
                { participantId: "c-trn", role: "PS" },
              ],
              2,
            ),
          ],
        }),
      ],
    });

    const byPair = new Map(
      result.targets.map((t) => [
        `${t.supervisorContactId}>${t.traineeContactId}`,
        t,
      ]),
    );
    // Harvest: consultant supervised the fellow (fellow PS).
    expect(byPair.get("c-cons>c-fell")?.units[0]?.stepId).toBe("s-harvest");
    // Micro: the fellow supervised the trainee (trainee PS).
    expect(byPair.get("c-fell>c-trn")?.units[0]?.stepId).toBe("s-micro");
    // Prep: the trainee only ASSISTED — no entrustment pair, exposure record.
    expect(byPair.has("self>c-trn")).toBe(false);
    expect(result.targets).toHaveLength(2);
    // NOT produced: consultant→trainee (never shared a step),
    // self→fellow (never shared a step).
    expect(byPair.has("c-cons>c-trn")).toBe(false);
    expect(byPair.has("self>c-fell")).toBe(false);
    // Roles held on the unit are recorded; v3 targets are PS-only.
    expect(byPair.get("c-fell>c-trn")?.units[0]?.supervisorRole).toBe("SS");
    expect(byPair.get("c-fell>c-trn")?.units[0]?.traineeRole).toBe("PS");
    expect(result.targets.every((t) => t.version === 3)).toBe(true);

    // Exposure: trainee assisted the logger on prep.
    expect(result.exposures).toHaveLength(1);
    const exposure = result.exposures[0]!;
    expect(exposure.participantContactId).toBe("c-trn");
    expect(exposure.units).toHaveLength(1);
    expect(exposure.units[0]?.stepId).toBe("s-prep");
    expect(exposure.units[0]?.role).toBe("FA");
    expect(exposure.units[0]?.seniorDisplayNames).toEqual(["You"]);
    expect(result.diagnostics.roleGatedUnits).toBe(1);
    expect(result.diagnostics.exposureOnly).toBe(false);
  });
});

// ── Role gate ────────────────────────────────────────────────────────────────

describe("deriveEpaAssessments — PS role gate", () => {
  it("classifies trainee participation: PS entrustment, FA assist, rest exposure", () => {
    expect(classifyTraineeParticipation("PS")).toBe("entrustment");
    expect(classifyTraineeParticipation("FA")).toBe("assist");
    expect(classifyTraineeParticipation("SA")).toBe("exposure");
    expect(classifyTraineeParticipation("SS")).toBe("exposure");
    expect(classifyTraineeParticipation("US")).toBe("exposure");
  });

  it.each(["FA", "SA", "SS", "US"] as const)(
    "junior as %s under a senior → exposure record, no target",
    (role) => {
      const junior = makeMember({ contactId: "c-j", operativeRole: role });
      const result = deriveEpaAssessments({
        self: SELF,
        teamMembers: [junior],
        units: [makeUnit({ procedureId: "p0", ownerRole: "PS" })],
      });
      expect(result.targets).toHaveLength(0);
      expect(result.exposures).toHaveLength(1);
      expect(result.exposures[0]?.participantContactId).toBe("c-j");
      expect(result.exposures[0]?.participantLinkedUserId).toBe("u-c-j");
      expect(result.exposures[0]?.units[0]?.role).toBe(role);
      expect(result.exposures[0]?.version).toBe(3);
      expect(result.diagnostics.roleGatedUnits).toBe(1);
      expect(result.diagnostics.exposureOnly).toBe(true);
    },
  );

  it("junior as PS under a senior → entrustment target, no exposure", () => {
    const junior = makeMember({ contactId: "c-j", operativeRole: "PS" });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [junior],
      units: [makeUnit({ procedureId: "p0", ownerRole: "FA" })],
    });
    expect(result.targets).toHaveLength(1);
    expect(result.exposures).toHaveLength(0);
    expect(result.diagnostics.roleGatedUnits).toBe(0);
    expect(result.diagnostics.exposureOnly).toBe(false);
  });

  it("the SUPERVISOR's own role is never gated — a consultant holding a retractor still supervises a PS fellow", () => {
    const fellow = makeMember({ contactId: "c-f", operativeRole: "PS" });
    for (const ownerRole of ["FA", "SA", "SS", "US", "PS"] as const) {
      const result = deriveEpaAssessments({
        self: SELF,
        teamMembers: [fellow],
        units: [makeUnit({ procedureId: "p0", ownerRole })],
      });
      expect(result.targets).toHaveLength(1);
      expect(result.targets[0]?.units[0]?.supervisorRole).toBe(ownerRole);
    }
  });

  it("junior PS with no senior present → nothing (neither target nor exposure)", () => {
    const peer = makeMember({
      contactId: "c-p",
      careerStage: "nz_consultant",
      operativeRole: "FA",
    });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [peer],
      units: [makeUnit({ procedureId: "p0", ownerRole: "PS" })],
    });
    expect(result.targets).toHaveLength(0);
    expect(result.exposures).toHaveLength(0);
    expect(result.diagnostics.roleGatedUnits).toBe(0);
    expect(result.diagnostics.allSameTier).toBe(true);
  });

  it("the LOGGER as a junior FA under a tagged senior → exposure with participant 'self'", () => {
    const consultant = makeMember({
      contactId: "c-cons",
      displayName: "Dr Consultant",
      careerStage: "nz_consultant",
      operativeRole: "PS",
    });
    const result = deriveEpaAssessments({
      self: { linkedUserId: "u-self", careerStage: "nz_set_trainee" },
      teamMembers: [consultant],
      units: [makeUnit({ procedureId: "p0", ownerRole: "FA" })],
    });
    expect(result.targets).toHaveLength(0);
    expect(result.exposures).toHaveLength(1);
    expect(result.exposures[0]?.participantContactId).toBe("self");
    expect(result.exposures[0]?.participantLinkedUserId).toBe("u-self");
    expect(result.exposures[0]?.units[0]?.seniorDisplayNames).toEqual([
      "Dr Consultant",
    ]);
  });

  it("mixed units: PS on one procedure, FA on another → target units [PS] + exposure [FA]", () => {
    const fellow = makeMember({
      contactId: "c-f",
      operativeRole: "FA",
      procedureRoleOverrides: { 1: "PS" },
    });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [fellow],
      units: [
        makeUnit({ procedureId: "p0", flatIndex: 0, ownerRole: "PS" }),
        makeUnit({ procedureId: "p1", flatIndex: 1, ownerRole: "SS" }),
      ],
    });
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.units.map((u) => u.procedureId)).toEqual(["p1"]);
    expect(result.exposures).toHaveLength(1);
    expect(result.exposures[0]?.units.map((u) => u.procedureId)).toEqual([
      "p0",
    ]);
    expect(result.diagnostics.exposureOnly).toBe(false);
  });

  it("exposure records aggregate per participant USER across units and collapse shared accounts", () => {
    const c1 = makeMember({
      contactId: "c-f1",
      linkedUserId: "u-shared",
      operativeRole: "FA",
    });
    const c2 = makeMember({
      contactId: "c-f2",
      linkedUserId: "u-shared",
      operativeRole: "SA",
    });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [c1, c2],
      units: [
        makeUnit({ procedureId: "p0", flatIndex: 0, ownerRole: "PS" }),
        makeUnit({ procedureId: "p1", flatIndex: 1, ownerRole: "PS" }),
      ],
    });
    expect(result.exposures).toHaveLength(1);
    expect(result.exposures[0]?.participantLinkedUserId).toBe("u-shared");
    // Both contacts × both units, all recorded on the one user record.
    expect(result.exposures[0]?.units).toHaveLength(4);
  });

  it("exposure seniors are the TOP-tier others on the unit (ties → both)", () => {
    const fellowA = makeMember({ contactId: "c-a", displayName: "Dr A" });
    const fellowB = makeMember({ contactId: "c-b", displayName: "Dr B" });
    const trainee = makeMember({
      contactId: "c-t",
      careerStage: "nz_set_trainee",
      operativeRole: "FA",
    });
    const result = deriveEpaAssessments({
      self: { linkedUserId: "u-self", careerStage: null },
      teamMembers: [fellowA, fellowB, trainee],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(result.exposures[0]?.units[0]?.seniorDisplayNames.sort()).toEqual([
      "Dr A",
      "Dr B",
    ]);
  });
});

// ── Procedure-level fallback ─────────────────────────────────────────────────

describe("deriveEpaAssessments — procedure fallback (no steps)", () => {
  it("uses flat presence/override maps and the owner's resolved role", () => {
    const fellow = makeMember({
      contactId: "c-f",
      procedureRoleOverrides: { 1: "PS" },
    });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [fellow],
      units: [
        makeUnit({ procedureId: "p0", flatIndex: 0, ownerRole: "PS" }),
        makeUnit({ procedureId: "p1", flatIndex: 1, ownerRole: "SS" }),
      ],
    });
    expect(result.targets).toHaveLength(1);
    const t = result.targets[0]!;
    expect(t.supervisorContactId).toBe("self");
    expect(t.traineeContactId).toBe("c-f");
    expect(t.units).toHaveLength(2);
    expect(t.units[0]?.supervisorRole).toBe("PS");
    expect(t.units[0]?.traineeRole).toBe("PS");
    expect(t.units[1]?.supervisorRole).toBe("SS");
    expect(t.units[1]?.traineeRole).toBe("PS");
  });

  it("presentForProcedures [] excludes a member from every fallback unit", () => {
    const fellow = makeMember({
      contactId: "c-f",
      presentForProcedures: [],
    });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [fellow],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(result.targets).toHaveLength(0);
    expect(result.exposures).toHaveLength(0);
  });

  it("steps are authoritative: flat maps ignored for stepped procedures", () => {
    // Flat data says the fellow is present everywhere — but the step team
    // omits them, so no pair derives.
    const fellow = makeMember({ contactId: "c-f" });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [fellow],
      units: [
        makeUnit({
          procedureId: "p0",
          steps: [
            makeStep("s1", "Solo step", [
              { participantId: "self", role: "PS" },
            ]),
          ],
        }),
      ],
    });
    expect(result.targets).toHaveLength(0);
  });
});

// ── Pairing rules ────────────────────────────────────────────────────────────

describe("deriveEpaAssessments — pairing rules", () => {
  it("pairs with the MOST SENIOR other participant, not adjacent tiers", () => {
    // Consultant + trainee share a unit with no fellow between them —
    // the old adjacency chain missed this pair entirely.
    const trainee = makeMember({
      contactId: "c-t",
      careerStage: "nz_set_trainee",
    });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [trainee],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.supervisorContactId).toBe("self");
    expect(result.targets[0]?.traineeContactId).toBe("c-t");
  });

  it("skips a senior with a missing stage and uses the next senior present", () => {
    const consultantNoStage = makeMember({
      contactId: "c-cons",
      careerStage: null,
    });
    const fellow = makeMember({ contactId: "c-f" });
    const trainee = makeMember({
      contactId: "c-t",
      careerStage: "nz_set_trainee",
    });
    const result = deriveEpaAssessments({
      self: { linkedUserId: "u-self", careerStage: null },
      teamMembers: [consultantNoStage, fellow, trainee],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.supervisorContactId).toBe("c-f");
    expect(result.targets[0]?.traineeContactId).toBe("c-t");
    expect(result.diagnostics.missingStageSkipped).toBe(1);
  });

  it("a tie at the top tier produces one pair per senior", () => {
    const fellowA = makeMember({ contactId: "c-a", displayName: "Dr A" });
    const fellowB = makeMember({ contactId: "c-b", displayName: "Dr B" });
    const trainee = makeMember({
      contactId: "c-t",
      careerStage: "nz_set_trainee",
    });
    const result = deriveEpaAssessments({
      self: { linkedUserId: "u-self", careerStage: null },
      teamMembers: [fellowA, fellowB, trainee],
      units: [makeUnit({ procedureId: "p0" })],
    });
    const supervisors = result.targets.map((t) => t.supervisorContactId);
    expect(supervisors.sort()).toEqual(["c-a", "c-b"]);
  });

  it("aggregates the same pair across units into one target", () => {
    const fellow = makeMember({ contactId: "c-f" });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [fellow],
      units: [
        makeUnit({ procedureId: "p0", flatIndex: 0 }),
        makeUnit({
          procedureId: "p1",
          flatIndex: 1,
          procedureName: "Washout",
        }),
      ],
    });
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.units.map((u) => u.procedureId)).toEqual([
      "p0",
      "p1",
    ]);
  });

  it("dedups two roster contacts linked to the same user", () => {
    const fellowContact1 = makeMember({
      contactId: "c-f1",
      linkedUserId: "u-shared",
    });
    const fellowContact2 = makeMember({
      contactId: "c-f2",
      linkedUserId: "u-shared",
    });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [fellowContact1, fellowContact2],
      units: [makeUnit({ procedureId: "p0" })],
    });
    // One USER pair, not two contact pairs.
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.traineeLinkedUserId).toBe("u-shared");
  });

  it("never pairs a participant with themselves (self tagged as contact)", () => {
    const selfAsContact = makeMember({
      contactId: "c-me",
      linkedUserId: "u-self",
      careerStage: "nz_consultant",
    });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [selfAsContact],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(result.targets).toHaveLength(0);
  });
});

// ── Eligibility & diagnostics ────────────────────────────────────────────────

describe("deriveEpaAssessments — eligibility & diagnostics", () => {
  it("derives team-only pairs when the logger has no stage", () => {
    const fellow = makeMember({ contactId: "c-f" });
    const trainee = makeMember({
      contactId: "c-t",
      careerStage: "nz_set_trainee",
    });
    const result = deriveEpaAssessments({
      self: { linkedUserId: "u-self", careerStage: null },
      teamMembers: [fellow, trainee],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]?.supervisorContactId).toBe("c-f");
  });

  it("unlinked members are skipped and counted", () => {
    const unlinked = makeMember({ contactId: "c-u", linkedUserId: null });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [unlinked],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(result.targets).toHaveLength(0);
    expect(result.diagnostics.unlinkedSkipped).toBe(1);
    expect(result.diagnostics.participantsConsidered).toBe(2);
  });

  it("flags allSameTier when peers-only yields zero targets", () => {
    const peer = makeMember({
      contactId: "c-p",
      careerStage: "nz_consultant",
    });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [peer],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(result.targets).toHaveLength(0);
    expect(result.diagnostics.allSameTier).toBe(true);
    expect(result.diagnostics.exposureOnly).toBe(false);
  });

  it("does not flag allSameTier when pairs exist or tiers differ", () => {
    const fellow = makeMember({ contactId: "c-f" });
    const withPairs = deriveEpaAssessments({
      self: SELF,
      teamMembers: [fellow],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(withPairs.diagnostics.allSameTier).toBe(false);
  });

  it("empty team and no self-tier yields empty output", () => {
    const result = deriveEpaAssessments({
      self: { linkedUserId: "u-self", careerStage: null },
      teamMembers: [],
      units: [makeUnit({ procedureId: "p0" })],
    });
    expect(result.targets).toHaveLength(0);
    expect(result.exposures).toHaveLength(0);
    expect(result.diagnostics.allSameTier).toBe(false);
  });

  it("no units yields empty output even with a full team", () => {
    const fellow = makeMember({ contactId: "c-f" });
    const result = deriveEpaAssessments({
      self: SELF,
      teamMembers: [fellow],
      units: [],
    });
    expect(result.targets).toHaveLength(0);
  });
});

// ── Migrate-on-read (v2 → v3) ────────────────────────────────────────────────

describe("migrateLegacyEpaTargets", () => {
  const v2Target = (units: { procedureId: string; traineeRole: string }[]) => ({
    version: 2,
    supervisorContactId: "self",
    supervisorDisplayName: "You",
    supervisorLinkedUserId: "u-self",
    supervisorTier: 5,
    traineeContactId: "c-t",
    traineeDisplayName: "Dr T",
    traineeLinkedUserId: "u-t",
    traineeTier: 3,
    units: units.map((u) => ({
      procedureId: u.procedureId,
      procedureSnomedCode: "1",
      procedureDisplayName: "Proc",
      supervisorRole: "SS",
      traineeRole: u.traineeRole,
    })),
  });

  it("filters v2 units to PS-trainee units and stamps version 3", () => {
    const r = migrateLegacyEpaTargets([
      v2Target([
        { procedureId: "p0", traineeRole: "FA" },
        { procedureId: "p1", traineeRole: "PS" },
      ]),
    ]);
    expect(r.changed).toBe(true);
    expect(r.targets).toHaveLength(1);
    expect(r.targets[0]?.version).toBe(3);
    expect(r.targets[0]?.units.map((u) => u.procedureId)).toEqual(["p1"]);
  });

  it("drops a v2 target left with no PS units", () => {
    const r = migrateLegacyEpaTargets([
      v2Target([{ procedureId: "p0", traineeRole: "FA" }]),
    ]);
    expect(r.changed).toBe(true);
    expect(r.targets).toHaveLength(0);
  });

  it("passes v3 targets through unchanged", () => {
    const v3 = { ...v2Target([{ procedureId: "p0", traineeRole: "PS" }]) };
    v3.version = 3;
    const r = migrateLegacyEpaTargets([v3]);
    expect(r.changed).toBe(false);
    expect(r.targets).toEqual([v3]);
  });

  it("discards v1 / garbage input", () => {
    expect(migrateLegacyEpaTargets([{ version: 1 }]).targets).toEqual([]);
    expect(migrateLegacyEpaTargets("nope").targets).toEqual([]);
    expect(migrateLegacyEpaTargets(null).changed).toBe(true);
  });
});
