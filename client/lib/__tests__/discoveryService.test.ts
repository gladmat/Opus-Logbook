/**
 * discoveryService (3B) — throttle hygiene. The 24h throttle must be
 * resettable when a contact gains an identifier (markDiscoveryStale), and a
 * zero-unlinked no-op round must not consume the window (it used to stamp
 * lastRun right before the user added an email to a contact).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: vi.fn(async (key: string) => store.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      multiRemove: vi.fn(async (keys: string[]) => {
        for (const key of keys) store.delete(key);
      }),
      __reset: () => store.clear(),
    },
  };
});

const getTeamContacts = vi.fn();
const discoverContacts = vi.fn();
const discoverContactsPsi = vi.fn();
vi.mock("../teamContactsApi", () => ({
  getTeamContacts: (...args: unknown[]) => getTeamContacts(...args),
  discoverContacts: (...args: unknown[]) => discoverContacts(...args),
  discoverContactsPsi: (...args: unknown[]) => discoverContactsPsi(...args),
}));

const AsyncStorageMock = (
  await import("@react-native-async-storage/async-storage")
).default as unknown as { __reset: () => void };
const { setActiveUserId } = await import("../activeUser");
const {
  discoverUnlinkedContacts,
  getDiscoveryMatches,
  markDiscoveryStale,
  removeDiscoveryMatch,
  buildContactIdentifiers,
} = await import("../discoveryService");
const { blindIdentifiers, finalizeAndIntersect } = await import(
  "../psiDiscovery"
);
const { generateEphemeralOprfKey, evaluateBlindedPoint, evaluateIdentifier } =
  await import("../../../server/psi");

const UNLINKED_CONTACT = {
  id: "contact-1",
  linkedUserId: null,
  email: "jane@x.com",
  phone: null,
  registrationNumber: null,
};
const LINKED_CONTACT = {
  id: "contact-2",
  linkedUserId: "user-2",
  email: "bob@x.com",
};
const MATCH = {
  contactId: "contact-1",
  userId: "user-9",
  displayName: "Jane",
  publicKeys: [],
};

beforeEach(async () => {
  vi.clearAllMocks();
  AsyncStorageMock.__reset();
  await setActiveUserId("00000000-0000-0000-0000-000000000001");
  // PSI unsupported → legacy fallback path (PSI crypto itself is covered
  // by psiDiscovery.test.ts).
  discoverContactsPsi.mockResolvedValue(null);
  discoverContacts.mockResolvedValue([MATCH]);
  getTeamContacts.mockResolvedValue([UNLINKED_CONTACT]);
});

describe("discoverUnlinkedContacts", () => {
  it("a real run stamps the throttle and caches matches", async () => {
    expect(await discoverUnlinkedContacts()).toBe(1);
    expect(await getDiscoveryMatches()).toEqual([MATCH]);
    // Second call inside 24h is throttled before any API work.
    expect(await discoverUnlinkedContacts()).toBe(0);
    expect(getTeamContacts).toHaveBeenCalledTimes(1);
  });

  it("markDiscoveryStale defeats the 24h throttle", async () => {
    expect(await discoverUnlinkedContacts()).toBe(1);
    expect(await discoverUnlinkedContacts()).toBe(0);
    await markDiscoveryStale();
    expect(await discoverUnlinkedContacts()).toBe(1);
    expect(getTeamContacts).toHaveBeenCalledTimes(2);
  });

  it("a zero-unlinked no-op round does not consume the 24h window (regression)", async () => {
    getTeamContacts.mockResolvedValue([LINKED_CONTACT]);
    expect(await discoverUnlinkedContacts()).toBe(0);
    expect(await discoverUnlinkedContacts()).toBe(0);
    // Not throttled — both rounds reached the contacts fetch.
    expect(getTeamContacts).toHaveBeenCalledTimes(2);
    // The moment a contact gains an email, discovery runs without waiting.
    getTeamContacts.mockResolvedValue([UNLINKED_CONTACT]);
    expect(await discoverUnlinkedContacts()).toBe(1);
  });

  it("throttle stamps are user-scoped", async () => {
    expect(await discoverUnlinkedContacts()).toBe(1);
    await setActiveUserId("00000000-0000-0000-0000-000000000002");
    expect(await discoverUnlinkedContacts()).toBe(1);
  });
});

describe("identifier handling (2.26.0)", () => {
  const REG_CONTACT = {
    id: "contact-reg",
    linkedUserId: null,
    email: null,
    phone: null,
    registrationNumber: "12 345-ab",
    registrationJurisdiction: "new_zealand",
  };
  const PHONE_CONTACT = {
    id: "contact-phone",
    linkedUserId: null,
    email: null,
    phone: "021 123 4567",
    registrationNumber: null,
    registrationJurisdiction: null,
  };

  it("buildContactIdentifiers emits the exact server-side forms", () => {
    expect(
      buildContactIdentifiers(
        {
          email: " Jane@X.com ",
          phone: "021 123 4567",
          registrationNumber: "12 345-ab",
          registrationJurisdiction: "new_zealand",
        },
        "NZ",
      ),
    ).toEqual({
      email: "jane@x.com",
      phone: "+64211234567",
      registrationKey: "reg:new_zealand:12345AB",
      registrationNumber: "12 345-ab",
      registrationJurisdiction: "new_zealand",
    });
    // Unresolvable phone (no region) and half a registration pair → nothing.
    expect(
      buildContactIdentifiers({
        email: null,
        phone: "021 123 4567",
        registrationNumber: "123",
        registrationJurisdiction: null,
      }),
    ).toEqual({});
  });

  it("sends E.164 phones to /discover using the owner's region (legacy path)", async () => {
    getTeamContacts.mockResolvedValue([PHONE_CONTACT]);
    expect(await discoverUnlinkedContacts({ phoneRegion: "NZ" })).toBe(1);
    expect(discoverContacts).toHaveBeenCalledWith([
      { contactId: "contact-phone", phone: "+64211234567" },
    ]);
  });

  it("a contact with no resolvable identifier neither hits the API nor burns the throttle", async () => {
    getTeamContacts.mockResolvedValue([PHONE_CONTACT]); // no region → no E.164
    expect(await discoverUnlinkedContacts()).toBe(0);
    expect(discoverContacts).not.toHaveBeenCalled();
    expect(discoverContactsPsi).not.toHaveBeenCalled();
    // Not throttled — the next round still runs.
    getTeamContacts.mockResolvedValue([UNLINKED_CONTACT]);
    expect(await discoverUnlinkedContacts()).toBe(1);
  });

  it("registration-only contacts match through a real PSI round and reach /discover", async () => {
    // Simulate the server: evaluate the blinded points and publish the PRF
    // of a member set that contains ONLY the registration key.
    discoverContactsPsi.mockImplementation(
      async (blinded: { ref: string; point: string }[]) => {
        const key = generateEphemeralOprfKey();
        return {
          evaluated: blinded.map((b) => ({
            ref: b.ref,
            point: evaluateBlindedPoint(key, b.point),
          })),
          members: [evaluateIdentifier(key, "reg:new_zealand:12345AB")].sort(),
        };
      },
    );
    getTeamContacts.mockResolvedValue([REG_CONTACT, UNLINKED_CONTACT]);
    expect(await discoverUnlinkedContacts()).toBe(1);
    // Only the PSI-matched contact is disclosed to the plaintext endpoint.
    expect(discoverContacts).toHaveBeenCalledWith([
      {
        contactId: "contact-reg",
        registrationNumber: "12 345-ab",
        registrationJurisdiction: "new_zealand",
      },
    ]);
    // Sanity: the client-side PSI primitives agree with the server ones.
    const { payload, contexts } = blindIdentifiers([
      { ref: "x|reg", value: "reg:new_zealand:12345AB" },
    ]);
    const key = generateEphemeralOprfKey();
    const evaluated = payload.map((b) => ({
      ref: b.ref,
      point: evaluateBlindedPoint(key, b.point),
    }));
    expect(
      finalizeAndIntersect(contexts, evaluated, [
        evaluateIdentifier(key, "reg:new_zealand:12345AB"),
      ]),
    ).toEqual(new Set(["x|reg"]));
  });
});

describe("removeDiscoveryMatch", () => {
  it("drops the acted-on match from the cache", async () => {
    await discoverUnlinkedContacts();
    await removeDiscoveryMatch("contact-1");
    expect(await getDiscoveryMatches()).toEqual([]);
  });
});
