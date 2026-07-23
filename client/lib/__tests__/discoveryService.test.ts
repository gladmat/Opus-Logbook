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
} = await import("../discoveryService");

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

describe("removeDiscoveryMatch", () => {
  it("drops the acted-on match from the cache", async () => {
    await discoverUnlinkedContacts();
    await removeDiscoveryMatch("contact-1");
    expect(await getDiscoveryMatches()).toEqual([]);
  });
});
