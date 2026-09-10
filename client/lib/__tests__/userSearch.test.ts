/**
 * sharingApi.searchUserForContact — email → phone → registration fall-through
 * in the exact query forms the server accepts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../auth", () => ({ getAuthToken: async () => "tok" }));
vi.mock("../query-client", () => ({
  getApiUrl: () => "http://localhost:5001",
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const { searchUserForContact, searchUserByRegistration } = await import(
  "../sharingApi"
);

const HIT = { id: "u1", displayName: "Jane", publicKeys: [] };
const ok = () => ({ ok: true, status: 200, json: async () => HIT });
const notFound = () => ({
  ok: false,
  status: 404,
  json: async () => ({ error: "User not found" }),
});
const urlOf = (n: number) => String(fetchMock.mock.calls[n]?.[0]);

beforeEach(() => fetchMock.mockReset());

describe("searchUserForContact", () => {
  it("email hit short-circuits without trying phone/registration", async () => {
    fetchMock.mockResolvedValueOnce(ok());
    await expect(
      searchUserForContact(
        { email: "jane@x.com", phone: "021 123 4567" },
        "NZ",
      ),
    ).resolves.toEqual(HIT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlOf(0)).toContain("/api/users/search?email=jane%40x.com");
  });

  it("falls through email → phone (E.164) → registration", async () => {
    fetchMock
      .mockResolvedValueOnce(notFound())
      .mockResolvedValueOnce(notFound())
      .mockResolvedValueOnce(ok());
    await expect(
      searchUserForContact(
        {
          email: "jane@x.com",
          phone: "021 123 4567",
          registrationNumber: "12 345-ab",
          registrationJurisdiction: "new_zealand",
        },
        "NZ",
      ),
    ).resolves.toEqual(HIT);
    expect(urlOf(1)).toContain("phone=%2B64211234567");
    expect(urlOf(2)).toContain("registration=12%20345-ab");
    expect(urlOf(2)).toContain("jurisdiction=new_zealand");
  });

  it("skips a phone it can't normalise and a half registration pair", async () => {
    await expect(
      searchUserForContact({
        phone: "021 123 4567", // no region
        registrationNumber: "123", // no jurisdiction
      }),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when every identifier 404s", async () => {
    fetchMock.mockResolvedValue(notFound());
    await expect(
      searchUserForContact({ email: "a@x.com", phone: "+64211234567" }),
    ).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces non-404 failures", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many user lookups" }),
    });
    await expect(
      searchUserByRegistration("new_zealand", "123"),
    ).rejects.toThrow("Too many user lookups");
  });
});
