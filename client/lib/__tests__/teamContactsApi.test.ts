/**
 * teamContactsApi — typed 4xx errors. The linking UI branches on
 * `TeamContactApiError.code`, so the parsing contract is pinned here.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ getAuthToken: async () => "tok" }));
vi.mock("@/lib/query-client", () => ({
  getApiUrl: () => "http://localhost:5001",
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const { linkContact, updateTeamContact, sendInvitation } = await import(
  "../teamContactsApi"
);
const { TeamContactApiError } = await import("../teamContactErrors");

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => fetchMock.mockReset());

describe("TeamContactApiError parsing", () => {
  it("linkContact 409 DUPLICATE_LINK carries the conflict", async () => {
    respond(409, {
      error: "J. Doe is already linked to this Opus account.",
      code: "DUPLICATE_LINK",
      conflictingContactId: "c-old",
      conflictingDisplayName: "J. Doe",
    });
    const err = await linkContact("c1", "u1").catch((e) => e);
    expect(err).toBeInstanceOf(TeamContactApiError);
    expect(err).toMatchObject({
      status: 409,
      code: "DUPLICATE_LINK",
      conflictingContactId: "c-old",
      conflictingDisplayName: "J. Doe",
      message: "J. Doe is already linked to this Opus account.",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:5001/api/team-contacts/c1/link",
    );
  });

  it("updateTeamContact 409 LINKED_IDENTIFIERS_LOCKED carries lockedFields", async () => {
    respond(409, {
      error: "Unlink first",
      code: "LINKED_IDENTIFIERS_LOCKED",
      lockedFields: ["email"],
    });
    const err = await updateTeamContact("c1", { email: "x@y.com" }).catch(
      (e) => e,
    );
    expect(err).toMatchObject({
      code: "LINKED_IDENTIFIERS_LOCKED",
      lockedFields: ["email"],
    });
  });

  it("sendInvitation 429 INVITE_COOLDOWN", async () => {
    respond(429, { error: "wait", code: "INVITE_COOLDOWN" });
    const err = await sendInvitation("c1", "a@x.com").catch((e) => e);
    expect(err).toMatchObject({ status: 429, code: "INVITE_COOLDOWN" });
  });

  it("falls back to the default message and no code on an empty body", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    });
    const err = await linkContact("c1", "u1").catch((e) => e);
    expect(err).toBeInstanceOf(TeamContactApiError);
    expect(err.message).toBe("Failed to link contact");
    expect(err.code).toBeUndefined();
  });

  it("passes successful responses through", async () => {
    respond(200, { id: "c1", linkedUserId: "u1", linkedDisplayName: "J" });
    await expect(linkContact("c1", "u1")).resolves.toMatchObject({
      linkedDisplayName: "J",
    });
  });
});
