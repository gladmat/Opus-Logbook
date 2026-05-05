import { describe, it, expect } from "vitest";
import type { CaseTeamMember } from "@/types/teamContacts";
import type { Case } from "@/types/case";
import { buildShareableBlob } from "@/lib/buildShareableBlob";

// ── Helpers to simulate share-on-save bridge logic ────────────────────────

interface ShareableMember {
  userId: string;
  displayName: string;
  role: string;
  publicKeys: { deviceId: string; publicKey: string }[];
}

/**
 * Simulates the operativeTeam → shareable members bridge logic
 * from useCaseForm.ts share-on-save pipeline.
 */
function buildShareableMembers(
  teamMembers: ShareableMember[],
  operativeTeam: CaseTeamMember[],
  getKeys: (userId: string) => { deviceId: string; publicKey: string }[],
): ShareableMember[] {
  const result = [...teamMembers];

  const linked = operativeTeam.filter((m) => m.linkedUserId);
  for (const member of linked) {
    if (result.some((m) => m.userId === member.linkedUserId)) continue;
    const keys = getKeys(member.linkedUserId!);
    if (keys.length > 0) {
      result.push({
        userId: member.linkedUserId!,
        displayName: member.displayName,
        role: member.operativeRole,
        publicKeys: keys,
      });
    }
  }

  return result;
}

// ── Test data ──────────────────────────────────────────────────────────────

const LINKED_MEMBER: CaseTeamMember = {
  contactId: "contact-1",
  linkedUserId: "user-linked-1",
  displayName: "Charlotte Lozen",
  abbreviatedName: "Charlotte L.",
  careerStage: "nz_fellow",
  operativeRole: "FA",
  presentForProcedures: null,
};

const UNLINKED_MEMBER: CaseTeamMember = {
  contactId: "contact-2",
  displayName: "Michael Webb",
  abbreviatedName: "Michael W.",
  careerStage: "nz_consultant",
  operativeRole: "PS",
  presentForProcedures: null,
};

const LINKED_MEMBER_2: CaseTeamMember = {
  contactId: "contact-3",
  linkedUserId: "user-linked-3",
  displayName: "James Park",
  abbreviatedName: "James P.",
  operativeRole: "SS",
  presentForProcedures: null,
};

const MOCK_KEYS = [{ deviceId: "dev-1", publicKey: "pk-1" }];

const mockGetKeys = (userId: string) => {
  if (userId === "user-linked-1" || userId === "user-linked-3") {
    return MOCK_KEYS;
  }
  return [];
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("operativeTeam → share-on-save bridge", () => {
  it("linked operativeTeam members produce share recipients", () => {
    const result = buildShareableMembers([], [LINKED_MEMBER], mockGetKeys);
    expect(result).toHaveLength(1);
    expect(result[0]!.userId).toBe("user-linked-1");
    expect(result[0]!.displayName).toBe("Charlotte Lozen");
    expect(result[0]!.role).toBe("FA");
    expect(result[0]!.publicKeys).toEqual(MOCK_KEYS);
  });

  it("unlinked operativeTeam members are skipped", () => {
    const result = buildShareableMembers([], [UNLINKED_MEMBER], mockGetKeys);
    expect(result).toHaveLength(0);
  });

  it("deduplicates: member in both teamMembers and operativeTeam → shared once", () => {
    const existing: ShareableMember = {
      userId: "user-linked-1",
      displayName: "Charlotte Lozen",
      role: "FA",
      publicKeys: MOCK_KEYS,
    };
    const result = buildShareableMembers(
      [existing],
      [LINKED_MEMBER],
      mockGetKeys,
    );
    expect(result).toHaveLength(1);
  });

  it("combines teamMembers and linked operative team", () => {
    const emailTagged: ShareableMember = {
      userId: "user-email-tagged",
      displayName: "Email User",
      role: "FIRST_ASST",
      publicKeys: [{ deviceId: "d1", publicKey: "p1" }],
    };
    const result = buildShareableMembers(
      [emailTagged],
      [LINKED_MEMBER, UNLINKED_MEMBER, LINKED_MEMBER_2],
      mockGetKeys,
    );
    // emailTagged + Charlotte (linked) + James (linked) = 3
    // Michael (unlinked) = skipped
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.userId)).toEqual([
      "user-email-tagged",
      "user-linked-1",
      "user-linked-3",
    ]);
  });

  it("skips linked member with no device keys", () => {
    const noKeysGetKeys = () => [] as { deviceId: string; publicKey: string }[];
    const result = buildShareableMembers([], [LINKED_MEMBER], noKeysGetKeys);
    expect(result).toHaveLength(0);
  });

  it("empty operativeTeam + empty teamMembers → no sharing", () => {
    const result = buildShareableMembers([], [], mockGetKeys);
    expect(result).toHaveLength(0);
  });
});

describe("buildShareableBlob includes operativeTeam", () => {
  it("includes operativeTeam in the blob", () => {
    const caseData = {
      operativeTeam: [LINKED_MEMBER, UNLINKED_MEMBER],
      procedureDate: "2026-03-24",
      facility: "Test Hospital",
      diagnosisGroups: [],
      clinicalDetails: {},
    } as unknown as Case;

    const blob = buildShareableBlob(caseData, []);
    expect(blob.operativeTeam).toBeDefined();
    expect(blob.operativeTeam).toHaveLength(2);
    expect(blob.operativeTeam![0]!.displayName).toBe("Charlotte Lozen");
  });

  it("omits operativeTeam when undefined", () => {
    const caseData = {
      procedureDate: "2026-03-24",
      facility: "Test Hospital",
      diagnosisGroups: [],
      clinicalDetails: {},
    } as unknown as Case;

    const blob = buildShareableBlob(caseData, []);
    expect(blob.operativeTeam).toBeUndefined();
  });
});
