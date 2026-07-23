/**
 * linkingPrompts — the Alert glue shared by all three link paths (contact
 * save, save-time rescue, Team Contacts). Alert is spy-able because
 * react-native resolves to react-native-web under vitest.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Alert } from "react-native";
import type { TeamContact } from "@/types/teamContacts";

const searchUserByEmail = vi.fn();
vi.mock("../sharingApi", () => ({
  searchUserByEmail: (...args: unknown[]) => searchUserByEmail(...args),
}));

const linkContact = vi.fn();
const sendInvitation = vi.fn();
vi.mock("../teamContactsApi", () => ({
  linkContact: (...args: unknown[]) => linkContact(...args),
  sendInvitation: (...args: unknown[]) => sendInvitation(...args),
}));

const removeDiscoveryMatch = vi.fn();
vi.mock("../discoveryService", () => ({
  removeDiscoveryMatch: (...args: unknown[]) => removeDiscoveryMatch(...args),
}));

const searchUnlinkedMembersOnOpus = vi.fn();
const linkAndShareCaseWithHit = vi.fn();
vi.mock("../caseSharing", () => ({
  searchUnlinkedMembersOnOpus: (...args: unknown[]) =>
    searchUnlinkedMembersOnOpus(...args),
  linkAndShareCaseWithHit: (...args: unknown[]) =>
    linkAndShareCaseWithHit(...args),
}));

const findRetroShareCandidates = vi.fn();
const retroShareCasesForContact = vi.fn();
vi.mock("../retroShare", () => ({
  findRetroShareCandidates: (...args: unknown[]) =>
    findRetroShareCandidates(...args),
  retroShareCasesForContact: (...args: unknown[]) =>
    retroShareCasesForContact(...args),
  RETRO_SHARE_CAP: 20,
}));

const {
  alertAsync,
  promptLinkContactByEmail,
  offerRetroShareForContact,
  runPostSaveTeamPrompt,
} = await import("../linkingPrompts");

const alertSpy = vi.spyOn(Alert, "alert");

type AlertButton = { text?: string; onPress?: () => void };

function pressButton(text: string) {
  const call = alertSpy.mock.calls.at(-1);
  const buttons = (call?.[2] ?? []) as AlertButton[];
  const button = buttons.find((b) => b.text === text);
  if (!button?.onPress) {
    throw new Error(
      `Button "${text}" not found in [${buttons.map((b) => b.text).join(", ")}]`,
    );
  }
  button.onPress();
}

function makeContact(overrides: Partial<TeamContact> = {}): TeamContact {
  return {
    id: "contact-1",
    displayName: "Jane Doe",
    email: "jane@x.com",
    linkedUserId: null,
    ...overrides,
  } as TeamContact;
}

const OPUS_USER = { id: "user-9", displayName: "Jane", publicKeys: [] };

const CLEAN_RUN = {
  candidates: 2,
  shared: 2,
  alreadyShared: 0,
  failed: [],
  zeroKeys: false,
  tofuBlocked: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  findRetroShareCandidates.mockResolvedValue([]);
  retroShareCasesForContact.mockResolvedValue(CLEAN_RUN);
  linkContact.mockResolvedValue({});
  removeDiscoveryMatch.mockResolvedValue(undefined);
  sendInvitation.mockResolvedValue({ success: true });
  searchUnlinkedMembersOnOpus.mockResolvedValue({
    hits: [],
    misses: [],
    skipped: [],
  });
  linkAndShareCaseWithHit.mockResolvedValue({
    linked: true,
    shared: true,
    zeroKeys: false,
    tofuBlocked: false,
  });
});

describe("alertAsync", () => {
  it("resolves with the tapped button's value", async () => {
    const promise = alertAsync("Title", "Message", [
      { text: "Not Now", style: "cancel", value: "no" },
      { text: "Do It", value: "yes" },
    ]);
    pressButton("Do It");
    await expect(promise).resolves.toBe("yes");
  });
});

describe("promptLinkContactByEmail", () => {
  it("links on accept, clears the cached match, and chains the retro-share offer", async () => {
    searchUserByEmail.mockResolvedValue(OPUS_USER);
    const promise = promptLinkContactByEmail(makeContact(), "owner-id");

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy.mock.calls[0]?.[0]).toBe("Jane Doe is on Opus");
    pressButton("Link Contact");

    // No retro candidates → the chained offer shows the success alert.
    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(2));
    expect(alertSpy.mock.calls[1]?.[0]).toBe("Contact Linked");

    await expect(promise).resolves.toBe("linked");
    expect(linkContact).toHaveBeenCalledWith("contact-1", "user-9");
    expect(removeDiscoveryMatch).toHaveBeenCalledWith("contact-1");
  });

  it("declining leaves the contact unlinked", async () => {
    searchUserByEmail.mockResolvedValue(OPUS_USER);
    const promise = promptLinkContactByEmail(makeContact(), "owner-id");

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    pressButton("Not Now");

    await expect(promise).resolves.toBe("declined");
    expect(linkContact).not.toHaveBeenCalled();
  });

  it("stays silent on a 404 (not on Opus / not discoverable)", async () => {
    searchUserByEmail.mockResolvedValue(null);
    await expect(
      promptLinkContactByEmail(makeContact(), "owner-id"),
    ).resolves.toBe("not-found");
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("stays silent when the email resolves to the owner themselves", async () => {
    searchUserByEmail.mockResolvedValue({ ...OPUS_USER, id: "owner-id" });
    await expect(
      promptLinkContactByEmail(makeContact(), "owner-id"),
    ).resolves.toBe("not-found");
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("skips already-linked contacts without searching", async () => {
    await expect(
      promptLinkContactByEmail(
        makeContact({ linkedUserId: "user-9" }),
        "owner-id",
      ),
    ).resolves.toBe("not-found");
    expect(searchUserByEmail).not.toHaveBeenCalled();
  });
});

describe("offerRetroShareForContact", () => {
  const CONTACT = {
    contactId: "contact-1",
    linkedUserId: "user-9",
    displayName: "Jane Doe",
  };

  it("shows only the success alert when there are no candidates", async () => {
    await offerRetroShareForContact(CONTACT);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0]?.[0]).toBe("Contact Linked");
    expect(retroShareCasesForContact).not.toHaveBeenCalled();
  });

  it("offers, runs, and summarises a clean share", async () => {
    findRetroShareCandidates.mockResolvedValue([{}, {}]);
    const promise = offerRetroShareForContact(CONTACT);

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy.mock.calls[0]?.[1]).toContain("Share 2 earlier cases");
    pressButton("Share 2 Cases");

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(2));
    expect(alertSpy.mock.calls[1]?.[0]).toBe("Cases shared");
    await promise;
    expect(retroShareCasesForContact).toHaveBeenCalledWith(CONTACT);
  });

  it("declining the offer runs nothing", async () => {
    findRetroShareCandidates.mockResolvedValue([{}]);
    const promise = offerRetroShareForContact(CONTACT);

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    pressButton("Not Now");
    await promise;
    expect(retroShareCasesForContact).not.toHaveBeenCalled();
  });

  it("summarises a zero-keys recipient with the sign-in wording", async () => {
    findRetroShareCandidates.mockResolvedValue([{}]);
    retroShareCasesForContact.mockResolvedValue({
      ...CLEAN_RUN,
      candidates: 1,
      shared: 0,
      zeroKeys: true,
    });
    const promise = offerRetroShareForContact(CONTACT);

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    pressButton("Share 1 Case");

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(2));
    expect(alertSpy.mock.calls[1]?.[0]).toBe("Can't share yet");
    await promise;
  });

  it("summarises partial failures with the re-save retry wording", async () => {
    findRetroShareCandidates.mockResolvedValue([{}, {}]);
    retroShareCasesForContact.mockResolvedValue({
      ...CLEAN_RUN,
      shared: 1,
      failed: [{ caseId: "case-a", message: "share 500" }],
    });
    const promise = offerRetroShareForContact(CONTACT);

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    pressButton("Share 2 Cases");

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(2));
    expect(alertSpy.mock.calls[1]?.[0]).toBe("Partially shared");
    expect(alertSpy.mock.calls[1]?.[1]).toContain("Shared 1 of 2 cases");
    await promise;
  });
});

describe("runPostSaveTeamPrompt", () => {
  const SAVED_CASE = { id: "case-1", operativeTeam: [] } as never;
  const UNLINKED = [
    { contactId: "contact-1", displayName: "Jane Doe", email: "jane@x.com" },
  ];
  const LIVE_CONTACTS = [
    { id: "contact-1", displayName: "Jane Doe", email: "jane@x.com" },
  ] as never[];

  it("shows the plain informational alert when offline (no search runs)", async () => {
    await runPostSaveTeamPrompt({
      savedCase: SAVED_CASE,
      issues: ["• 1 tagged member isn't linked"],
      unlinked: UNLINKED,
      liveContacts: null,
      ownUserId: "owner-id",
    });
    expect(searchUnlinkedMembersOnOpus).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0]?.[0]).toBe(
      "Case saved — team features limited",
    );
    // Plain informational alert — no buttons array.
    expect(alertSpy.mock.calls[0]?.[2]).toBeUndefined();
  });

  it("stays silent when there is nothing to report", async () => {
    await runPostSaveTeamPrompt({
      savedCase: SAVED_CASE,
      issues: [],
      unlinked: [],
      liveContacts: LIVE_CONTACTS,
      ownUserId: "owner-id",
    });
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("links and shares hits, then chains the retro-share offer", async () => {
    searchUnlinkedMembersOnOpus.mockResolvedValue({
      hits: [
        {
          contactId: "contact-1",
          displayName: "Jane Doe",
          email: "jane@x.com",
          user: OPUS_USER,
        },
      ],
      misses: [],
      skipped: [],
    });
    const promise = runPostSaveTeamPrompt({
      savedCase: SAVED_CASE,
      issues: ["• 1 tagged member isn't linked"],
      unlinked: UNLINKED,
      liveContacts: LIVE_CONTACTS,
      ownUserId: "owner-id",
    });

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy.mock.calls[0]?.[0]).toBe(
      "Case saved — colleagues found on Opus",
    );
    expect(alertSpy.mock.calls[0]?.[1]).toContain("Jane Doe is on Opus");
    pressButton("Link & Share");

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(2));
    expect(alertSpy.mock.calls[1]?.[0]).toBe("Case shared");
    expect(alertSpy.mock.calls[1]?.[1]).toContain(
      "Linked and shared with Jane Doe",
    );
    await promise;

    expect(linkAndShareCaseWithHit).toHaveBeenCalledTimes(1);
    // Retro-share checked for the newly linked contact; zero candidates +
    // silent flag → no third alert.
    expect(findRetroShareCandidates).toHaveBeenCalledWith("contact-1", 21);
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });

  it("offers Invite by Email for misses and sends the invitations", async () => {
    searchUnlinkedMembersOnOpus.mockResolvedValue({
      hits: [],
      misses: UNLINKED,
      skipped: [],
    });
    const promise = runPostSaveTeamPrompt({
      savedCase: SAVED_CASE,
      issues: ["• 1 tagged member isn't linked"],
      unlinked: UNLINKED,
      liveContacts: LIVE_CONTACTS,
      ownUserId: "owner-id",
    });

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    pressButton("Invite by Email");

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(2));
    expect(alertSpy.mock.calls[1]?.[0]).toBe("Invitations Sent");
    await promise;
    expect(sendInvitation).toHaveBeenCalledWith("contact-1", "jane@x.com");
  });

  it("suppresses the Invite button during the 24h cooldown", async () => {
    searchUnlinkedMembersOnOpus.mockResolvedValue({
      hits: [],
      misses: UNLINKED,
      skipped: [],
    });
    await runPostSaveTeamPrompt({
      savedCase: SAVED_CASE,
      issues: ["• 1 tagged member isn't linked"],
      unlinked: UNLINKED,
      liveContacts: [
        {
          id: "contact-1",
          displayName: "Jane Doe",
          email: "jane@x.com",
          invitationSentAt: new Date().toISOString(),
        },
      ] as never[],
      ownUserId: "owner-id",
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0]?.[2]).toBeUndefined();
    expect(sendInvitation).not.toHaveBeenCalled();
  });

  it("reports zero-key hits with the sign-in wording after Link & Share", async () => {
    searchUnlinkedMembersOnOpus.mockResolvedValue({
      hits: [
        {
          contactId: "contact-1",
          displayName: "Jane Doe",
          email: "jane@x.com",
          user: OPUS_USER,
        },
      ],
      misses: [],
      skipped: [],
    });
    linkAndShareCaseWithHit.mockResolvedValue({
      linked: true,
      shared: false,
      zeroKeys: true,
      tofuBlocked: false,
    });
    const promise = runPostSaveTeamPrompt({
      savedCase: SAVED_CASE,
      issues: [],
      unlinked: UNLINKED,
      liveContacts: LIVE_CONTACTS,
      ownUserId: "owner-id",
    });

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    pressButton("Link & Share");

    await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(2));
    expect(alertSpy.mock.calls[1]?.[0]).toBe("Linking finished");
    expect(alertSpy.mock.calls[1]?.[1]).toContain(
      "hasn't signed in to Opus on a device yet",
    );
    await promise;
  });
});
