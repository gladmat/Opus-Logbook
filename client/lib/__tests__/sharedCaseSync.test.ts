/**
 * sharedCaseSync — the dashboard's shared-case data layer: hydrate what is
 * new/stale, import thumbs, drop revoked rows, page past the inbox limit,
 * and serve summaries offline.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SharedCaseData, SharedCaseInboxEntry } from "@/types/sharing";

// ── In-memory sharingStorage ────────────────────────────────────────────────
let inboxIndex: SharedCaseInboxEntry[] = [];
const caches = new Map<
  string,
  { data: SharedCaseData; blobVersion: number | null }
>();
const cacheIndex = new Set<string>();
const savedKeys = new Map<string, string>();
vi.mock("../sharingStorage", () => ({
  getSharedInboxIndex: async () => inboxIndex,
  updateSharedInboxIndex: async (entries: SharedCaseInboxEntry[]) => {
    inboxIndex = entries;
  },
  getDecryptedSharedCaseWithVersion: async (id: string) =>
    caches.get(id) ?? null,
  saveDecryptedSharedCase: async (
    id: string,
    data: SharedCaseData,
    v?: number,
  ) => {
    caches.set(id, { data, blobVersion: v ?? null });
    cacheIndex.add(id);
  },
  removeDecryptedSharedCase: async (id: string) => {
    caches.delete(id);
    cacheIndex.delete(id);
  },
  listDecryptedSharedCaseIds: async () => [...cacheIndex],
  saveCaseKey: async (id: string, key: string) => {
    savedKeys.set(id, key);
  },
}));

// ── Server ──────────────────────────────────────────────────────────────────
let serverRows: SharedCaseInboxEntry[] = [];
const getSharedInbox = vi.fn(
  async (p?: { limit?: number; offset?: number }) => {
    const limit = p?.limit ?? 50;
    const offset = p?.offset ?? 0;
    return serverRows.slice(offset, offset + limit);
  },
);
const blobs = new Map<string, SharedCaseData>();
const getSharedCaseDetail = vi.fn(async (id: string) => {
  const row = serverRows.find((r) => r.id === id);
  if (!row) throw new Error("Shared case fetch failed (404)");
  return {
    encryptedShareableBlob: `blob:${id}`,
    keyEnvelopes: [
      { recipientDeviceId: "dev-1", envelopeJson: JSON.stringify({ id }) },
    ],
    blobVersion: row.blobVersion,
    recipientRole: row.recipientRole,
    verificationStatus: row.verificationStatus,
  };
});
vi.mock("../sharingApi", () => ({
  getSharedInbox: (...a: unknown[]) => getSharedInbox(...(a as [])),
  getSharedCaseDetail: (...a: unknown[]) =>
    getSharedCaseDetail(...(a as [string])),
}));

vi.mock("../e2ee", () => ({
  getOrCreateDeviceIdentity: async () => ({
    deviceId: "dev-1",
    publicKey: "pk",
  }),
  unwrapCaseKeyEnvelope: async (env: { id: string }) => `key-${env.id}`,
  decryptPayloadWithCaseKey: (envelope: string) => {
    const id = envelope.slice("blob:".length);
    return JSON.stringify(blobs.get(id));
  },
}));

const importSharedThumbs = vi.fn(async (_id: string, media: unknown[]) => ({
  imported: media.length,
  failed: [],
}));
const deleteImportedSharedMedia = vi.fn(async () => undefined);
vi.mock("../sharedMediaImport", () => ({
  importSharedThumbs: (...a: unknown[]) =>
    importSharedThumbs(...(a as [string, unknown[]])),
  deleteImportedSharedMedia: (...a: unknown[]) =>
    deleteImportedSharedMedia(...(a as [])),
  listLocalSharedThumbIds: async () => new Set<string>(),
}));

const {
  syncSharedCases,
  getSharedCaseSummaries,
  hydrateSharedCase,
  resetSharedCaseSyncThrottle,
  SHARED_SYNC_MIN_INTERVAL_MS,
} = await import("../sharedCaseSync");

function row(
  id: string,
  over: Partial<SharedCaseInboxEntry> = {},
): SharedCaseInboxEntry {
  return {
    id,
    caseId: `case-${id}`,
    ownerUserId: "owner",
    ownerDisplayName: "Dr Owner",
    recipientRole: "PS",
    verificationStatus: "pending",
    blobVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}
function blob(id: string, mediaCount = 0): SharedCaseData {
  return {
    procedureDate: "2026-09-01",
    facility: "F",
    diagnosisGroups: [],
    outcomes: {},
    teamRoles: [],
    media: Array.from({ length: mediaCount }, (_, i) => ({
      mediaId: `${id}-m${i}`,
      dekHex: "ab".repeat(32),
      mimeType: "image/jpeg",
      width: 1,
      height: 1,
      image: { nonce: "n", tag: "t", size: 1, ciphertextSize: 1 },
      thumb: { nonce: "n", tag: "t", size: 1, ciphertextSize: 1 },
      createdAt: "2026-09-01T00:00:00.000Z",
    })),
  } as SharedCaseData;
}

beforeEach(() => {
  inboxIndex = [];
  caches.clear();
  cacheIndex.clear();
  savedKeys.clear();
  serverRows = [];
  blobs.clear();
  getSharedInbox.mockClear();
  getSharedCaseDetail.mockClear();
  importSharedThumbs.mockClear();
  deleteImportedSharedMedia.mockClear();
  resetSharedCaseSyncThrottle();
});

describe("hydrateSharedCase", () => {
  it("fetches, unwraps for this device, decrypts, caches with version and keeps the case key", async () => {
    serverRows = [row("s1", { blobVersion: 3 })];
    blobs.set("s1", blob("s1"));
    const h = await hydrateSharedCase("s1");
    expect(h.blobVersion).toBe(3);
    expect(h.data.facility).toBe("F");
    expect(caches.get("s1")).toEqual({ data: blob("s1"), blobVersion: 3 });
    expect(savedKeys.get("s1")).toBe("key-s1");
  });

  it("no envelope for this device → named error, nothing cached", async () => {
    serverRows = [row("s1")];
    getSharedCaseDetail.mockResolvedValueOnce({
      encryptedShareableBlob: "blob:s1",
      keyEnvelopes: [{ recipientDeviceId: "other", envelopeJson: "{}" }],
      blobVersion: 1,
      recipientRole: "PS",
      verificationStatus: "pending",
    });
    await expect(hydrateSharedCase("s1")).rejects.toMatchObject({
      name: "SharedCaseHydrationError",
      reason: "no-envelope",
    });
    expect(caches.has("s1")).toBe(false);
  });
});

describe("syncSharedCases", () => {
  it("hydrates missing + stale rows, leaves current caches alone, imports thumbs, pages the inbox", async () => {
    serverRows = Array.from({ length: 120 }, (_, i) =>
      row(`s${i}`, { blobVersion: i === 0 ? 2 : 1 }),
    );
    for (const r of serverRows)
      blobs.set(r.id, blob(r.id, r.id === "s1" ? 2 : 0));
    // s0 cached at v1 (stale — server has v2); s2 cached current.
    caches.set("s0", { data: blob("s0"), blobVersion: 1 });
    cacheIndex.add("s0");
    caches.set("s2", { data: blob("s2"), blobVersion: 1 });
    cacheIndex.add("s2");
    inboxIndex = [row("s0"), row("s2")];

    const result = await syncSharedCases();
    expect(getSharedInbox).toHaveBeenCalledTimes(2); // 100 + 20
    expect(result.summaries).toHaveLength(120);
    expect(result.hydrated).toBe(119); // everything except current s2
    expect(getSharedCaseDetail).not.toHaveBeenCalledWith("s2");
    expect(caches.get("s0")!.blobVersion).toBe(2);
    expect(result.thumbsImported).toBe(2);
    expect(importSharedThumbs).toHaveBeenCalledWith("s1", expect.any(Array));
    expect(result.errors).toEqual([]);
    expect(inboxIndex).toHaveLength(120);
  });

  it("rows revoked server-side are dropped from cache + media; owner-seeded caches survive", async () => {
    inboxIndex = [row("gone")];
    caches.set("gone", { data: blob("gone", 1), blobVersion: 1 });
    cacheIndex.add("gone");
    // Owner-seeded: cached but never in the inbox.
    caches.set("mine-out", { data: blob("mine-out"), blobVersion: 1 });
    cacheIndex.add("mine-out");
    serverRows = [];

    const result = await syncSharedCases();
    expect(result.removed).toBe(1);
    expect(caches.has("gone")).toBe(false);
    expect(deleteImportedSharedMedia).toHaveBeenCalledTimes(1);
    expect(caches.has("mine-out")).toBe(true);
    expect(result.summaries).toEqual([]);
  });

  it("a per-row hydration failure lands in errors and does not abort the sync", async () => {
    serverRows = [row("ok"), row("bad")];
    blobs.set("ok", blob("ok"));
    getSharedCaseDetail.mockImplementation(async (id: string) => {
      if (id === "bad") throw new Error("boom");
      return {
        encryptedShareableBlob: `blob:${id}`,
        keyEnvelopes: [
          { recipientDeviceId: "dev-1", envelopeJson: JSON.stringify({ id }) },
        ],
        blobVersion: 1,
        recipientRole: "PS",
        verificationStatus: "pending",
      };
    });
    const result = await syncSharedCases();
    expect(result.hydrated).toBe(1);
    expect(result.errors).toEqual([{ sharedCaseId: "bad", message: "boom" }]);
    // Both still summarised — the failed one un-hydrated.
    expect(result.summaries.map((s) => s.shared.hydrated)).toEqual([
      true,
      false,
    ]);
  });

  it("offline: getSharedCaseSummaries reads index + caches only", async () => {
    inboxIndex = [row("s1"), row("s2")];
    caches.set("s1", { data: blob("s1"), blobVersion: 1 });
    const summaries = await getSharedCaseSummaries();
    expect(getSharedInbox).not.toHaveBeenCalled();
    expect(summaries.map((s) => s.shared.hydrated)).toEqual([true, false]);
    expect(summaries[0]!.facility).toBe("F");
  });
});

describe("syncSharedCases focus throttle", () => {
  it("a second focus sync inside the window is served offline (no inbox fetch)", async () => {
    serverRows = [row("a")];
    blobs.set("a", blob("a"));
    const first = await syncSharedCases({ now: 1_000 });
    expect(first.skipped).toBeUndefined();
    expect(getSharedInbox).toHaveBeenCalledTimes(1);

    const second = await syncSharedCases({
      now: 1_000 + SHARED_SYNC_MIN_INTERVAL_MS - 1,
    });
    expect(second.skipped).toBe(true);
    expect(second.summaries.map((s) => s.id)).toEqual(["a"]);
    expect(getSharedInbox).toHaveBeenCalledTimes(1);
  });

  it("force (pull-to-refresh) and an elapsed window both sync again", async () => {
    serverRows = [row("a")];
    blobs.set("a", blob("a"));
    await syncSharedCases({ now: 1_000 });
    await syncSharedCases({ now: 1_001, force: true });
    expect(getSharedInbox).toHaveBeenCalledTimes(2);
    await syncSharedCases({ now: 1_001 + SHARED_SYNC_MIN_INTERVAL_MS });
    expect(getSharedInbox).toHaveBeenCalledTimes(3);
  });

  it("concurrent callers share one in-flight sync", async () => {
    serverRows = [row("a")];
    blobs.set("a", blob("a"));
    const [x, y] = await Promise.all([
      syncSharedCases({ force: true }),
      syncSharedCases({ force: true }),
    ]);
    expect(x).toBe(y);
    expect(getSharedInbox).toHaveBeenCalledTimes(1);
  });
});
