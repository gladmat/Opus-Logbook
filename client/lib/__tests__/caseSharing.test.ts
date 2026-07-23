/**
 * caseSharing — the extracted save-time share pipeline (2A), snapshot
 * rehydration helpers (1B), and the save-time rescue helpers (1C).
 *
 * Key regression: `shared_cases` has UNIQUE(caseId, recipientUserId) and the
 * server does a plain insert, so an edit-save must revoke a still-present
 * recipient's row BEFORE re-POSTing (revoke-then-reshare) — previously the
 * re-POST 500 was swallowed and edited content never reached them.
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
const encryptPayloadWithCaseKey = vi.fn(async () => "enc:blob");
const wrapCaseKeyForRecipient = vi.fn(async (_key: string, pub: string) => ({
  version: 1,
  recipientPublicKey: pub,
}));
vi.mock("../e2ee", () => ({
  generateCaseKeyHex: (...args: unknown[]) => generateCaseKeyHex(...args),
  encryptPayloadWithCaseKey: (...args: unknown[]) =>
    encryptPayloadWithCaseKey(...args),
  wrapCaseKeyForRecipient: (...args: unknown[]) =>
    wrapCaseKeyForRecipient(...args),
}));

const getCase = vi.fn();
const updateCase = vi.fn();
vi.mock("../storage", () => ({
  getCase: (...args: unknown[]) => getCase(...args),
  updateCase: (...args: unknown[]) => updateCase(...args),
}));

const {
  rehydrateTeamSnapshots,
  listUnlinkedTaggedMembers,
  collectShareRecipients,
  shareCaseWithTeam,
  searchUnlinkedMembersOnOpus,
  linkAndShareCaseWithHit,
  markSnapshotLinked,
  RESCUE_SEARCH_CAP,
} = await import("../caseSharing");

function makeMember(overrides: Partial<CaseTeamMember> = {}): CaseTeamMember {
  return {
    contactId: "contact-1",
    linkedUserId: null,
    displayName: "Jane Doe",
    abbreviatedName: "J. Doe",
    careerStage: null,
    operativeRole: "FA",
    ...overrides,
  } as CaseTeamMember;
}

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    id: "case-1",
    procedureDate: "2026-07-01",
    facility: "Waikato Hospital",
    diagnosisGroups: [],
    operativeTeam: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  } as unknown as Case;
}

const DEVICE_KEYS = [
  { deviceId: "dev-1", publicKey: "pk-1" },
  { deviceId: "dev-2", publicKey: "pk-2" },
];

beforeEach(() => {
  vi.clearAllMocks();
  verifyAndPinRecipientKeys.mockImplementation(
    async (_userId: string, keys: unknown[]) => ({
      kind: "ok",
      keys,
      pinnedNew: 0,
    }),
  );
  shareCase.mockResolvedValue({ sharedCases: [] });
  getSharedOutbox.mockResolvedValue([]);
  revokeSharedCase.mockResolvedValue(undefined);
});

describe("rehydrateTeamSnapshots", () => {
  it("links a null snapshot from the live contact and never mutates input", () => {
    const member = makeMember();
    const input = [member];
    const result = rehydrateTeamSnapshots(input, [
      { id: "contact-1", linkedUserId: "user-9", careerStage: null },
    ]);
    expect(result.changed).toBe(true);
    expect(result.team[0]?.linkedUserId).toBe("user-9");
    expect(member.linkedUserId).toBeNull();
    expect(result.team).not.toBe(input);
  });

  it("propagates an explicit unlink back to null", () => {
    const result = rehydrateTeamSnapshots(
      [makeMember({ linkedUserId: "user-9" })],
      [{ id: "contact-1", linkedUserId: null, careerStage: null }],
    );
    expect(result.changed).toBe(true);
    expect(result.team[0]?.linkedUserId).toBeNull();
  });

  it("leaves members whose contact no longer exists untouched", () => {
    const member = makeMember({ linkedUserId: "user-9" });
    const result = rehydrateTeamSnapshots([member], []);
    expect(result.changed).toBe(false);
    expect(result.team[0]).toBe(member);
  });

  it("fills a missing careerStage but never overwrites a historical one", () => {
    const filled = rehydrateTeamSnapshots(
      [makeMember({ linkedUserId: "user-9", careerStage: null })],
      [{ id: "contact-1", linkedUserId: "user-9", careerStage: "nz_sho" }],
    );
    expect(filled.changed).toBe(true);
    expect(filled.team[0]?.careerStage).toBe("nz_sho");

    const preserved = rehydrateTeamSnapshots(
      [makeMember({ linkedUserId: "user-9", careerStage: "nz_reg" })],
      [{ id: "contact-1", linkedUserId: "user-9", careerStage: "nz_cons" }],
    );
    expect(preserved.changed).toBe(false);
    expect(preserved.team[0]?.careerStage).toBe("nz_reg");
  });

  it("returns the original array reference when nothing changed", () => {
    const input = [makeMember({ linkedUserId: "user-9" })];
    const result = rehydrateTeamSnapshots(input, [
      { id: "contact-1", linkedUserId: "user-9", careerStage: null },
    ]);
    expect(result.changed).toBe(false);
    expect(result.team).toBe(input);
  });
});

describe("listUnlinkedTaggedMembers", () => {
  it("joins contact emails and excludes linked members", () => {
    const team = [
      makeMember(),
      makeMember({
        contactId: "contact-2",
        displayName: "Bob",
        linkedUserId: "u2",
      }),
      makeMember({ contactId: "contact-3", displayName: "Cy" }),
    ];
    const result = listUnlinkedTaggedMembers(team, [
      { id: "contact-1", email: "jane@x.com" },
      { id: "contact-3", email: null },
    ]);
    expect(result).toEqual([
      { contactId: "contact-1", displayName: "Jane Doe", email: "jane@x.com" },
      { contactId: "contact-3", displayName: "Cy", email: null },
    ]);
  });

  it("returns null emails when the contact list is unavailable", () => {
    const result = listUnlinkedTaggedMembers([makeMember()], null);
    expect(result[0]?.email).toBeNull();
  });
});

describe("collectShareRecipients", () => {
  it("resolves a linked member through TOFU with the pinned key set", async () => {
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    const result = await collectShareRecipients([
      makeMember({ linkedUserId: "user-9" }),
    ]);
    expect(result.recipients).toEqual([
      {
        userId: "user-9",
        displayName: "Jane Doe",
        role: "FA",
        publicKeys: DEVICE_KEYS,
      },
    ]);
    expect(result.zeroKeyRecipients).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("records zero-key recipients instead of silently dropping them", async () => {
    getUserDeviceKeys.mockResolvedValue([]);
    const result = await collectShareRecipients([
      makeMember({ linkedUserId: "user-9" }),
    ]);
    expect(result.recipients).toHaveLength(0);
    expect(result.zeroKeyRecipients).toEqual([
      { userId: "user-9", displayName: "Jane Doe" },
    ]);
  });

  it("records TOFU mismatches and excludes the recipient", async () => {
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    verifyAndPinRecipientKeys.mockResolvedValue({
      kind: "mismatch",
      mismatches: [
        { deviceId: "dev-1", storedPublicKey: "old", receivedPublicKey: "new" },
      ],
    });
    const result = await collectShareRecipients([
      makeMember({ linkedUserId: "user-9" }),
    ]);
    expect(result.recipients).toHaveLength(0);
    expect(result.tofuMismatches[0]?.userId).toBe("user-9");
  });

  it("records key-fetch failures as collect errors (previously a bare catch)", async () => {
    getUserDeviceKeys.mockRejectedValue(new Error("network down"));
    const result = await collectShareRecipients([
      makeMember({ linkedUserId: "user-9" }),
    ]);
    expect(result.errors).toEqual([
      { stage: "collect", userId: "user-9", message: "network down" },
    ]);
  });

  it("dedupes against pre-resolved legacy members", async () => {
    const result = await collectShareRecipients(
      [makeMember({ linkedUserId: "user-9" })],
      [
        {
          userId: "user-9",
          displayName: "Jane (legacy)",
          role: "SS",
          publicKeys: DEVICE_KEYS,
        },
      ],
    );
    expect(getUserDeviceKeys).not.toHaveBeenCalled();
    expect(result.recipients).toHaveLength(1);
    expect(result.recipients[0]?.role).toBe("SS");
  });
});

describe("shareCaseWithTeam", () => {
  it("shares a new case: one POST with per-device envelopes, no outbox read", async () => {
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    const outcome = await shareCaseWithTeam({
      savedCase: makeCase(),
      operativeTeam: [makeMember({ linkedUserId: "user-9" })],
      isEdit: false,
    });
    expect(getSharedOutbox).not.toHaveBeenCalled();
    expect(shareCase).toHaveBeenCalledTimes(1);
    const payload = shareCase.mock.calls[0]?.[0] as {
      caseId: string;
      recipients: { userId: string; keyEnvelopes: unknown[] }[];
    };
    expect(payload.caseId).toBe("case-1");
    expect(payload.recipients).toHaveLength(1);
    expect(payload.recipients[0]?.keyEnvelopes).toHaveLength(2);
    expect(outcome.shared).toEqual([
      { userId: "user-9", displayName: "Jane Doe" },
    ]);
    expect(outcome.resharedOnEdit).toHaveLength(0);
    expect(outcome.errors).toHaveLength(0);
  });

  it("makes no POST when there are no resolvable recipients", async () => {
    const outcome = await shareCaseWithTeam({
      savedCase: makeCase(),
      operativeTeam: [makeMember()],
      isEdit: false,
    });
    expect(shareCase).not.toHaveBeenCalled();
    expect(outcome.shared).toHaveLength(0);
  });

  it("edit: revokes recipients who are no longer tagged without re-sharing them", async () => {
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    getSharedOutbox.mockResolvedValue([
      { id: "share-old", caseId: "case-1", recipientUserId: "user-gone" },
    ]);
    const outcome = await shareCaseWithTeam({
      savedCase: makeCase(),
      operativeTeam: [makeMember({ linkedUserId: "user-9" })],
      isEdit: true,
    });
    expect(revokeSharedCase).toHaveBeenCalledWith("share-old");
    expect(outcome.revokedShareIds).toEqual(["share-old"]);
    const payload = shareCase.mock.calls[0]?.[0] as {
      recipients: { userId: string }[];
    };
    expect(payload.recipients.map((r) => r.userId)).toEqual(["user-9"]);
    expect(outcome.resharedOnEdit).toHaveLength(0);
  });

  it("edit: revokes a still-present recipient BEFORE re-sharing them (unique-index bug fix)", async () => {
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    getSharedOutbox.mockResolvedValue([
      { id: "share-live", caseId: "case-1", recipientUserId: "user-9" },
      { id: "share-other-case", caseId: "case-2", recipientUserId: "user-9" },
    ]);
    const outcome = await shareCaseWithTeam({
      savedCase: makeCase(),
      operativeTeam: [makeMember({ linkedUserId: "user-9" })],
      isEdit: true,
    });
    expect(revokeSharedCase).toHaveBeenCalledTimes(1);
    expect(revokeSharedCase).toHaveBeenCalledWith("share-live");
    expect(shareCase).toHaveBeenCalledTimes(1);
    const revokeOrder = revokeSharedCase.mock.invocationCallOrder[0]!;
    const shareOrder = shareCase.mock.invocationCallOrder[0]!;
    expect(revokeOrder).toBeLessThan(shareOrder);
    expect(outcome.shared).toEqual([
      { userId: "user-9", displayName: "Jane Doe" },
    ]);
    expect(outcome.resharedOnEdit).toEqual([
      { userId: "user-9", displayName: "Jane Doe" },
    ]);
  });

  it("edit: excludes a still-present recipient from the POST when their revoke fails", async () => {
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    getSharedOutbox.mockResolvedValue([
      { id: "share-live", caseId: "case-1", recipientUserId: "user-9" },
    ]);
    revokeSharedCase.mockRejectedValue(new Error("revoke 500"));
    const outcome = await shareCaseWithTeam({
      savedCase: makeCase(),
      operativeTeam: [makeMember({ linkedUserId: "user-9" })],
      isEdit: true,
    });
    expect(shareCase).not.toHaveBeenCalled();
    expect(outcome.errors).toEqual([
      { stage: "revoke", userId: "user-9", message: "revoke 500" },
    ]);
    expect(outcome.shared).toHaveLength(0);
  });

  it("edit: an outbox failure degrades to a recorded error but the POST still runs", async () => {
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    getSharedOutbox.mockRejectedValue(new Error("outbox down"));
    const outcome = await shareCaseWithTeam({
      savedCase: makeCase(),
      operativeTeam: [makeMember({ linkedUserId: "user-9" })],
      isEdit: true,
    });
    expect(shareCase).toHaveBeenCalledTimes(1);
    expect(outcome.errors).toEqual([
      { stage: "revoke", message: "outbox down" },
    ]);
  });

  it("records a failed POST as a share error and never throws", async () => {
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    shareCase.mockRejectedValue(new Error("share 500"));
    const outcome = await shareCaseWithTeam({
      savedCase: makeCase(),
      operativeTeam: [makeMember({ linkedUserId: "user-9" })],
      isEdit: false,
    });
    expect(outcome.shared).toHaveLength(0);
    expect(outcome.errors).toEqual([{ stage: "share", message: "share 500" }]);
  });
});

describe("searchUnlinkedMembersOnOpus", () => {
  const unlinkedMember = (n: number, email: string | null) => ({
    contactId: `contact-${n}`,
    displayName: `Member ${n}`,
    email,
  });

  it("caps searches, skips email-less members, and buckets misses", async () => {
    searchUserByEmail
      .mockResolvedValueOnce({ id: "u1", displayName: "A", publicKeys: [] })
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("rate limited"));
    const result = await searchUnlinkedMembersOnOpus(
      [
        unlinkedMember(1, "a@x.com"),
        unlinkedMember(2, "b@x.com"),
        unlinkedMember(3, "c@x.com"),
        unlinkedMember(4, "d@x.com"),
        unlinkedMember(5, null),
      ],
      "owner-id",
    );
    expect(searchUserByEmail).toHaveBeenCalledTimes(RESCUE_SEARCH_CAP);
    expect(result.hits.map((h) => h.contactId)).toEqual(["contact-1"]);
    expect(result.misses.map((m) => m.contactId)).toEqual([
      "contact-2",
      "contact-3",
    ]);
    expect(result.skipped.map((s) => s.contactId)).toEqual([
      "contact-4",
      "contact-5",
    ]);
  });

  it("drops hits that resolve to the owner themselves", async () => {
    searchUserByEmail.mockResolvedValue({
      id: "owner-id",
      displayName: "Me",
      publicKeys: [],
    });
    const result = await searchUnlinkedMembersOnOpus(
      [unlinkedMember(1, "me@x.com")],
      "owner-id",
    );
    expect(result.hits).toHaveLength(0);
    expect(result.skipped.map((s) => s.contactId)).toEqual(["contact-1"]);
  });
});

describe("linkAndShareCaseWithHit", () => {
  const hit = {
    contactId: "contact-1",
    displayName: "Jane Doe",
    user: { id: "user-9", displayName: "Jane", publicKeys: [] },
  };

  it("links, shares to the new recipient, and updates the stored snapshot", async () => {
    const savedCase = makeCase({
      operativeTeam: [makeMember()],
    } as Partial<Case>);
    linkContact.mockResolvedValue({});
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    const storedCase = makeCase({
      operativeTeam: [makeMember()],
    } as Partial<Case>);
    getCase.mockResolvedValue(storedCase);

    const result = await linkAndShareCaseWithHit({ savedCase, hit });

    expect(linkContact).toHaveBeenCalledWith("contact-1", "user-9");
    expect(shareCase).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      linked: true,
      shared: true,
      zeroKeys: false,
      tofuBlocked: false,
    });
    expect(updateCase).toHaveBeenCalledTimes(1);
    const updates = updateCase.mock.calls[0]?.[1] as {
      operativeTeam: CaseTeamMember[];
    };
    expect(updates.operativeTeam[0]?.linkedUserId).toBe("user-9");
    // Fresh objects — the cached case must not have been mutated in place.
    expect(storedCase.operativeTeam?.[0]?.linkedUserId).toBeNull();
    expect(updates.operativeTeam).not.toBe(storedCase.operativeTeam);
  });

  it("still links + updates the snapshot when the recipient has zero device keys", async () => {
    linkContact.mockResolvedValue({});
    getUserDeviceKeys.mockResolvedValue([]);
    getCase.mockResolvedValue(
      makeCase({ operativeTeam: [makeMember()] } as Partial<Case>),
    );
    const result = await linkAndShareCaseWithHit({
      savedCase: makeCase({ operativeTeam: [makeMember()] } as Partial<Case>),
      hit,
    });
    expect(shareCase).not.toHaveBeenCalled();
    expect(result.zeroKeys).toBe(true);
    expect(result.linked).toBe(true);
    expect(updateCase).toHaveBeenCalledTimes(1);
  });

  it("leaves the snapshot null when the share POST fails (case re-qualifies for retro-share)", async () => {
    linkContact.mockResolvedValue({});
    getUserDeviceKeys.mockResolvedValue(DEVICE_KEYS);
    shareCase.mockRejectedValue(new Error("share 500"));
    const result = await linkAndShareCaseWithHit({
      savedCase: makeCase({ operativeTeam: [makeMember()] } as Partial<Case>),
      hit,
    });
    expect(result.shared).toBe(false);
    expect(result.linked).toBe(true);
    expect(result.error).toBe("share 500");
    expect(updateCase).not.toHaveBeenCalled();
  });
});

describe("markSnapshotLinked", () => {
  it("no-ops when the member is already linked or the case is missing", async () => {
    getCase.mockResolvedValueOnce(
      makeCase({
        operativeTeam: [makeMember({ linkedUserId: "user-9" })],
      } as Partial<Case>),
    );
    await markSnapshotLinked("case-1", "contact-1", "user-9");
    expect(updateCase).not.toHaveBeenCalled();

    getCase.mockResolvedValueOnce(null);
    await markSnapshotLinked("case-missing", "contact-1", "user-9");
    expect(updateCase).not.toHaveBeenCalled();
  });
});
