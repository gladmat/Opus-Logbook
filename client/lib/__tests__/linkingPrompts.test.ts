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
vi.mock("../teamContactsApi", () => ({
  linkContact: (...args: unknown[]) => linkContact(...args),
}));

const removeDiscoveryMatch = vi.fn();
vi.mock("../discoveryService", () => ({
  removeDiscoveryMatch: (...args: unknown[]) => removeDiscoveryMatch(...args),
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

const { alertAsync, promptLinkContactByEmail, offerRetroShareForContact } =
  await import("../linkingPrompts");

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
