/**
 * epaFromBlob — recipient-side EPA derivation from the decrypted shared
 * blob. The core contract is the IDENTITY PROPERTY: the recipient must
 * derive exactly the targets the owner derived at save time, because both
 * run the same engine over the same snapshot. If these drift, the owner's
 * Assessments card and the recipient's prompts disagree about who assesses
 * whom.
 */

import { describe, it, expect } from "vitest";

import { deriveEpaFromSharedBlob } from "../epaFromBlob";
import {
  deriveEpaAssessments,
  buildEpaUnitsFromDiagnosisGroups,
} from "../epaDerivation";
import type { SharedCaseData } from "@/types/sharing";
import type { CaseTeamMember } from "@/types/teamContacts";
import type { Case } from "@/types/case";

// ── Fixtures ─────────────────────────────────────────────────────────────────
// Relative ordering through the real seniority map:
// nz_consultant > nz_fellow > nz_set_trainee.

const OWNER_USER_ID = "u-owner";

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

function makeGroups(
  procedures: Record<string, unknown>[],
): Case["diagnosisGroups"] {
  return [
    { id: "g1", specialty: "hand_wrist", procedures },
  ] as unknown as Case["diagnosisGroups"];
}

function makeBlob(overrides: Partial<SharedCaseData> = {}): SharedCaseData {
  return {
    procedureDate: "2026-08-01",
    facility: "Test Hospital",
    diagnosisGroups: makeGroups([
      { id: "p1", procedureName: "Carpal tunnel release", snomedCtCode: "1" },
    ]),
    outcomes: {},
    teamRoles: [],
    operativeRole: "SURGEON",
    operativeTeam: [
      makeMember({ contactId: "c-trainee", careerStage: "nz_set_trainee" }),
    ],
    ownerParticipant: {
      userId: OWNER_USER_ID,
      displayName: "Dr Owner",
      careerStage: "nz_consultant",
    },
    ...overrides,
  };
}

// ── Identity property ────────────────────────────────────────────────────────

describe("deriveEpaFromSharedBlob — identity with owner-side derivation", () => {
  it("derives exactly the targets the owner derived, flat and stepped", () => {
    const groups = makeGroups([
      {
        id: "p-flap",
        procedureName: "Free ALT flap",
        snomedCtCode: "771225007",
        operativeSteps: [
          {
            id: "s-harvest",
            kind: "flap_harvest",
            label: "Free flap harvest",
            sequence: 0,
            team: [
              { participantId: "self", role: "SS" },
              { participantId: "c-fellow", role: "PS" },
            ],
          },
          {
            id: "s-micro",
            kind: "microsurgery_inset",
            label: "Microsurgery & inset",
            sequence: 1,
            team: [
              { participantId: "c-fellow", role: "SS" },
              { participantId: "c-trainee", role: "PS" },
            ],
          },
        ],
      },
      {
        id: "p-debride",
        procedureName: "Debridement",
        snomedCtCode: "36777000",
        operativeRoleOverride: "FIRST_ASST",
      },
    ]);
    const team = [
      makeMember({ contactId: "c-fellow", careerStage: "nz_fellow" }),
      makeMember({ contactId: "c-trainee", careerStage: "nz_set_trainee" }),
    ];

    const ownerSide = deriveEpaAssessments({
      self: {
        linkedUserId: OWNER_USER_ID,
        careerStage: "nz_consultant",
        displayName: "Dr Owner",
      },
      teamMembers: team,
      units: buildEpaUnitsFromDiagnosisGroups(groups, "SURGEON"),
    });

    const recipientSide = deriveEpaFromSharedBlob({
      blob: makeBlob({
        diagnosisGroups: groups,
        operativeTeam: team,
        operativeRole: "SURGEON",
      }),
      viewerUserId: "u-c-fellow",
      ownerUserId: OWNER_USER_ID,
    });

    expect(recipientSide.targets).toEqual(ownerSide.targets);
    expect(recipientSide.exposures).toEqual(ownerSide.exposures);
    expect(ownerSide.targets.length).toBeGreaterThan(0);
  });

  it("derives exactly the exposures the owner derived (FA junior)", () => {
    const team = [
      makeMember({
        contactId: "c-trainee",
        careerStage: "nz_set_trainee",
        operativeRole: "FA",
      }),
    ];
    const groups = makeGroups([
      { id: "p1", procedureName: "Carpal tunnel release", snomedCtCode: "1" },
    ]);
    const ownerSide = deriveEpaAssessments({
      self: {
        linkedUserId: OWNER_USER_ID,
        careerStage: "nz_consultant",
        displayName: "Dr Owner",
      },
      teamMembers: team,
      units: buildEpaUnitsFromDiagnosisGroups(groups, "SURGEON"),
    });
    const recipientSide = deriveEpaFromSharedBlob({
      blob: makeBlob({ diagnosisGroups: groups, operativeTeam: team }),
      viewerUserId: "u-c-trainee",
      ownerUserId: OWNER_USER_ID,
    });
    expect(ownerSide.targets).toEqual([]);
    expect(ownerSide.exposures).toHaveLength(1);
    expect(recipientSide.exposures).toEqual(ownerSide.exposures);
    expect(recipientSide.myTarget).toBeNull();
    expect(recipientSide.myExposure?.participantLinkedUserId).toBe(
      "u-c-trainee",
    );
    expect(recipientSide.reason).toBe("viewer-exposure-only");
  });
});

// ── Viewer pairing + roles ───────────────────────────────────────────────────

describe("deriveEpaFromSharedBlob — viewer role", () => {
  it("a recipient consultant supervising a trainee-owner is the supervisor", () => {
    const blob = makeBlob({
      ownerParticipant: {
        userId: OWNER_USER_ID,
        displayName: "Dr Trainee-Owner",
        careerStage: "nz_set_trainee",
      },
      operativeTeam: [
        makeMember({ contactId: "c-boss", careerStage: "nz_consultant" }),
      ],
    });
    const view = deriveEpaFromSharedBlob({
      blob,
      viewerUserId: "u-c-boss",
      ownerUserId: OWNER_USER_ID,
    });
    expect(view.myRole).toBe("supervisor");
    expect(view.myTarget?.traineeLinkedUserId).toBe(OWNER_USER_ID);
  });

  it("a recipient trainee under a consultant-owner is the trainee", () => {
    const view = deriveEpaFromSharedBlob({
      blob: makeBlob(),
      viewerUserId: "u-c-trainee",
      ownerUserId: OWNER_USER_ID,
    });
    expect(view.myRole).toBe("trainee");
    expect(view.myTarget?.supervisorLinkedUserId).toBe(OWNER_USER_ID);
  });

  it("prefers the pair with the given counterpart when several involve the viewer", () => {
    // Fellow-owner operated as PS under a consultant (SS) while a trainee
    // operated as PS under the fellow on another procedure: two pairs
    // involve the owner. Each share row's counterpart decides which one
    // the viewer is looking at.
    const groups = makeGroups([
      { id: "p1", procedureName: "Flap", snomedCtCode: "1" },
      {
        id: "p2",
        procedureName: "Debridement",
        snomedCtCode: "2",
        operativeRoleOverride: "SUPERVISOR",
      },
    ]);
    const blob = makeBlob({
      diagnosisGroups: groups,
      ownerParticipant: {
        userId: OWNER_USER_ID,
        displayName: "Dr Fellow-Owner",
        careerStage: "nz_fellow",
      },
      operativeTeam: [
        makeMember({
          contactId: "c-boss",
          careerStage: "nz_consultant",
          operativeRole: "SS",
          presentForProcedures: [0],
        }),
        makeMember({
          contactId: "c-trainee",
          careerStage: "nz_set_trainee",
          operativeRole: "PS",
          presentForProcedures: [1],
        }),
      ],
    });
    const asTrainee = deriveEpaFromSharedBlob({
      blob,
      viewerUserId: OWNER_USER_ID,
      ownerUserId: OWNER_USER_ID,
      counterpartUserId: "u-c-boss",
    });
    expect(asTrainee.myRole).toBe("trainee");
    expect(asTrainee.myTarget?.supervisorLinkedUserId).toBe("u-c-boss");

    const asSupervisor = deriveEpaFromSharedBlob({
      blob,
      viewerUserId: OWNER_USER_ID,
      ownerUserId: OWNER_USER_ID,
      counterpartUserId: "u-c-trainee",
    });
    expect(asSupervisor.myRole).toBe("supervisor");
    expect(asSupervisor.myTarget?.traineeLinkedUserId).toBe("u-c-trainee");

    // An unknown counterpart falls back to the first viewer pair.
    const fallback = deriveEpaFromSharedBlob({
      blob,
      viewerUserId: OWNER_USER_ID,
      ownerUserId: OWNER_USER_ID,
      counterpartUserId: "u-nobody",
    });
    expect(fallback.myTarget).not.toBeNull();
  });

  it("same-tier participants derive no target for the viewer", () => {
    const view = deriveEpaFromSharedBlob({
      blob: makeBlob({
        operativeTeam: [
          makeMember({ contactId: "c-peer", careerStage: "nz_consultant" }),
        ],
      }),
      viewerUserId: "u-c-peer",
      ownerUserId: OWNER_USER_ID,
    });
    expect(view.myTarget).toBeNull();
    expect(view.myRole).toBeNull();
    expect(view.reason).toBe("viewer-not-paired");
  });
});

// ── Legacy blob fallback ─────────────────────────────────────────────────────

describe("deriveEpaFromSharedBlob — legacy blobs (no ownerParticipant)", () => {
  it("owner-involving pairs cannot derive; reason names the missing field", () => {
    const view = deriveEpaFromSharedBlob({
      blob: makeBlob({ ownerParticipant: undefined }),
      viewerUserId: "u-c-trainee",
      ownerUserId: OWNER_USER_ID,
    });
    expect(view.myTarget).toBeNull();
    expect(view.reason).toBe("no-owner-participant");
  });

  it("team↔team pairs still derive without the owner", () => {
    const view = deriveEpaFromSharedBlob({
      blob: makeBlob({
        ownerParticipant: undefined,
        operativeTeam: [
          makeMember({ contactId: "c-fellow", careerStage: "nz_fellow" }),
          makeMember({ contactId: "c-trainee", careerStage: "nz_set_trainee" }),
        ],
      }),
      viewerUserId: "u-c-fellow",
      ownerUserId: OWNER_USER_ID,
    });
    expect(view.myTarget).not.toBeNull();
    expect(view.myRole).toBe("supervisor");
    expect(view.myTarget?.traineeLinkedUserId).toBe("u-c-trainee");
  });
});

// ── Empty cases ──────────────────────────────────────────────────────────────

describe("deriveEpaFromSharedBlob — empty cases", () => {
  it("no procedures yields no targets with reason", () => {
    const view = deriveEpaFromSharedBlob({
      blob: makeBlob({ diagnosisGroups: makeGroups([]) }),
      viewerUserId: "u-c-trainee",
      ownerUserId: OWNER_USER_ID,
    });
    expect(view.targets).toEqual([]);
    expect(view.reason).toBe("no-procedures");
  });
});
