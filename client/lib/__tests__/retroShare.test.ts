/**
 * retroShare (2B) — retroactive sharing of previously saved cases when a
 * team contact becomes linked. Exercises the REAL caseSharing pipeline
 * (collect / encrypt / snapshot update) over mocked leaf modules.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Case } from "@/types/case";
import type { CaseTeamMember } from "@/types/teamContacts";

const getUserDeviceKeys = vi.fn();
const linkContact = vi.fn();
vi.mock("../teamContactsApi", () => ({
  getUserDeviceKeys: (...args: unknown[]) => getUserDeviceKeys(...args),
  linkContact: (...args: unknown[]) => linkContact(...args),
}));

const shareCase = vi.fn();
const getSharedOutbox = vi.fn();
const revokeSharedCase = vi.fn();
const searchUserByEmail = vi.fn();
vi.mock("../sharingApi", () => ({
  shareCase: (...args: unknown[]) => shareCase(...args),
  getSharedOutbox: (...args: unknown[]) => getSharedOutbox(...args),
  revokeSharedCase: (...args: unknown[]) => revokeSharedCase(...args),
  searchUserByEmail: (...args: unknown[]) => searchUserByEmail(...args),
}));

const verifyAndPinRecipientKeys = vi.fn();
vi.mock("../keyPinningStore", () => ({
  verifyAndPinRecipientKeys: (...args: unknown[]) =>
    verifyAndPinRecipientKeys(...args),
}));

const generateCaseKeyHex = vi.fn(async () => "ab".repeat(32));
vi.mock("../e2ee", () => ({
  generateCaseKeyHex: (...args: unknown[]) => generateCaseKeyHex(...args),
  encryptPayloadWithCaseKey: async () => "enc:blob",
  wrapCaseKeyForRecipient: async () => ({ version: 1 }),
}));

const getCases = vi.fn();
const getCase = vi.fn();
const updateCase = vi.fn();
vi.mock("../storage", () => ({
  getCases: (...args: unknown[]) => getCases(...args),
  getCase: (...args: unknown[]) => getCase(...args),
  updateCase: (...args: unknown[]) => updateCase(...args),
}));

const { findRetroShareCandidates, retroShareCasesForContact, RETRO_SHARE_CAP } =
  await import("../retroShare");

const CONTACT = {
  contactId: "contact-1",
  linkedUserId: "user-9",
  displayName: "Jane Doe",
};

const DEVICE_KEYS = [{ deviceId: "dev-1", publicKey: "pk-1" }];

function makeMember(overrides: Partial<CaseTeamMember> = {}): CaseTeamMember {
  return {
    contactId: "contact-1",
    linkedUserId: null,
    displayName: "Jane Doe",
    abbreviatedName: "J. Doe",
    operativeRole: "FA",
    ...overrides,
  } as CaseTeamMember;
}

function makeCase(
  id: string,
  createdAt: string,
  team: CaseTeamMember[] | undefined,
): Case {
  return {
    id,
    procedureDate: "2026-07-01",
    facility: "Waikato Hospital",
    diagnosisGroups: [],
    operativeTeam: team,
    createdAt,
    updatedAt: createdAt,
  } as unknown as Case;
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyAndPinRecipientKeys.mockImplementation(
    async (_userId: string, keys: unknown[]) => ({
      kind: "ok",
      keys,
      pinnedNew: 0,
    }),
  );
  getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
  shareCase.mockResolvedValue({ sharedCases: [] });
  getSharedOutbox.mockResolvedValue([]);
  getCase.mockImplementation(async (id: string) => {
    const all = (await getCases()) as Case[];
    return all.find((c) => c.id === id) ?? null;
  });
});

describe("findRetroShareCandidates", () => {
  it("keeps only null-snapshot tags, sorts newest first, and caps", async () => {
    getCases.mockResolvedValue([
      makeCase("old-null", "2026-01-01T00:00:00.000Z", [makeMember()]),
      makeCase("linked", "2026-05-01T00:00:00.000Z", [
        makeMember({ linkedUserId: "user-9" }),
      ]),
      makeCase("untagged", "2026-06-01T00:00:00.000Z", [
        makeMember({ contactId: "someone-else" }),
      ]),
      makeCase("new-null", "2026-07-01T00:00:00.000Z", [makeMember()]),
    ]);
    const result = await findRetroShareCandidates("contact-1");
    expect(result.map((c) => c.id)).toEqual(["new-null", "old-null"]);
  });

  it("caps at RETRO_SHARE_CAP most recent", async () => {
    getCases.mockResolvedValue(
      Array.from({ length: 25 }, (_, i) =>
        makeCase(
          `case-${i}`,
          `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
          [makeMember()],
        ),
      ),
    );
    const result = await findRetroShareCandidates("contact-1");
    expect(result).toHaveLength(RETRO_SHARE_CAP);
    expect(result[0]?.id).toBe("case-24");
  });
});

describe("retroShareCasesForContact", () => {
  it("shares each candidate under a fresh case key with the per-case role", async () => {
    getCases.mockResolvedValue([
      makeCase("case-a", "2026-07-02T00:00:00.000Z", [
        makeMember({ operativeRole: "SS" }),
      ]),
      makeCase("case-b", "2026-07-01T00:00:00.000Z", [makeMember()]),
    ]);
    const result = await retroShareCasesForContact(CONTACT);

    expect(result).toMatchObject({
      candidates: 2,
      shared: 2,
      alreadyShared: 0,
      zeroKeys: false,
      tofuBlocked: false,
    });
    expect(result.failed).toHaveLength(0);
    expect(shareCase).toHaveBeenCalledTimes(2);
    expect(generateCaseKeyHex).toHaveBeenCalledTimes(2);
    const firstPayload = shareCase.mock.calls[0]?.[0] as {
      caseId: string;
      recipients: { userId: string; role: string }[];
    };
    expect(firstPayload.caseId).toBe("case-a");
    expect(firstPayload.recipients[0]).toMatchObject({
      userId: "user-9",
      role: "SS",
    });
    expect(updateCase).toHaveBeenCalledTimes(2);
  });

  it("skips pre-existing (case, recipient) pairs but still updates the snapshot", async () => {
    getCases.mockResolvedValue([
      makeCase("case-a", "2026-07-02T00:00:00.000Z", [makeMember()]),
      makeCase("case-b", "2026-07-01T00:00:00.000Z", [makeMember()]),
    ]);
    getSharedOutbox.mockResolvedValue([
      { id: "share-1", caseId: "case-a", recipientUserId: "user-9" },
      { id: "share-2", caseId: "case-x", recipientUserId: "other-user" },
    ]);
    const result = await retroShareCasesForContact(CONTACT);

    expect(result.alreadyShared).toBe(1);
    expect(result.shared).toBe(1);
    expect(shareCase).toHaveBeenCalledTimes(1);
    expect((shareCase.mock.calls[0]?.[0] as { caseId: string }).caseId).toBe(
      "case-b",
    );
    // Both snapshots updated — the already-shared case must stop re-qualifying.
    expect(updateCase).toHaveBeenCalledTimes(2);
  });

  it("records a per-case failure and leaves that snapshot null", async () => {
    getCases.mockResolvedValue([
      makeCase("case-a", "2026-07-02T00:00:00.000Z", [makeMember()]),
      makeCase("case-b", "2026-07-01T00:00:00.000Z", [makeMember()]),
    ]);
    shareCase
      .mockRejectedValueOnce(new Error("share 500"))
      .mockResolvedValueOnce({ sharedCases: [] });
    const result = await retroShareCasesForContact(CONTACT);

    expect(result.shared).toBe(1);
    expect(result.failed).toEqual([{ caseId: "case-a", message: "share 500" }]);
    // Snapshot updated only for the successful case-b.
    expect(updateCase).toHaveBeenCalledTimes(1);
    expect(updateCase.mock.calls[0]?.[0]).toBe("case-b");
  });

  it("short-circuits with zeroKeys when the recipient has no device keys", async () => {
    getCases.mockResolvedValue([
      makeCase("case-a", "2026-07-02T00:00:00.000Z", [makeMember()]),
    ]);
    getUserDeviceKeys.mockResolvedValue([]);
    const result = await retroShareCasesForContact(CONTACT);

    expect(result.zeroKeys).toBe(true);
    expect(shareCase).not.toHaveBeenCalled();
    expect(updateCase).not.toHaveBeenCalled();
  });

  it("short-circuits with tofuBlocked on a key mismatch", async () => {
    getCases.mockResolvedValue([
      makeCase("case-a", "2026-07-02T00:00:00.000Z", [makeMember()]),
    ]);
    verifyAndPinRecipientKeys.mockResolvedValue({
      kind: "mismatch",
      mismatches: [
        { deviceId: "dev-1", storedPublicKey: "old", receivedPublicKey: "new" },
      ],
    });
    const result = await retroShareCasesForContact(CONTACT);

    expect(result.tofuBlocked).toBe(true);
    expect(shareCase).not.toHaveBeenCalled();
  });
});
