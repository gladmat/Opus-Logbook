import { describe, it, expect, beforeEach, vi } from "vitest";

import type { TreatmentEpisode, EpisodeStatus } from "@/types/episode";

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
        for (const k of keys) store.delete(k);
      }),
      __store: store,
    },
  };
});

// Identity passthrough — the AEAD layer has its own dedicated tests.
vi.mock("../encryption", () => ({
  encryptData: vi.fn(async (plain: string) => plain),
  decryptData: vi.fn(async (cipher: string) => cipher),
}));

vi.mock("../storage", () => ({
  hashPatientIdentifier: vi.fn(async (id: string) => `hash:${id}`),
  getCasesByEpisodeId: vi.fn(async () => []),
}));

vi.mock("../activeUser", () => ({
  userScopedAsyncKey: (key: string) => `user-test:${key}`,
}));

const AsyncStorage = (await import("@react-native-async-storage/async-storage"))
  .default as unknown as { __store: Map<string, string> };

const {
  saveEpisode,
  getEpisode,
  updateEpisode,
  allocateEpisodeSequence,
  getVisibleDashboardEpisodes,
} = await import("../episodeStorage");

function makeEpisode(
  overrides: Partial<TreatmentEpisode> & { id: string },
): TreatmentEpisode {
  return {
    patientIdentifier: "ABC1234",
    title: "Test episode",
    primaryDiagnosisCode: "123456",
    primaryDiagnosisDisplay: "Test diagnosis",
    type: "wound_management",
    specialty: "general",
    status: "active",
    onsetDate: "2026-01-01",
    ownerId: "user-test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Local-time YYYY-MM-DD for `n` days ago (date-only fields are canonical local). */
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

beforeEach(() => {
  AsyncStorage.__store.clear();
});

describe("allocateEpisodeSequence", () => {
  it("returns 1 for a missing episode without creating it", async () => {
    const seq = await allocateEpisodeSequence("missing-episode");
    expect(seq).toBe(1);
    expect(await getEpisode("missing-episode")).toBeNull();
  });

  it("increments nextCaseSequence across sequential calls and persists it", async () => {
    await saveEpisode(makeEpisode({ id: "ep-1" }));

    expect(await allocateEpisodeSequence("ep-1")).toBe(1);
    expect(await allocateEpisodeSequence("ep-1")).toBe(2);
    expect(await allocateEpisodeSequence("ep-1")).toBe(3);

    const persisted = await getEpisode("ep-1");
    expect(persisted?.nextCaseSequence).toBe(3);
  });

  it("serialises concurrent un-awaited calls into distinct sequence numbers", async () => {
    await saveEpisode(makeEpisode({ id: "ep-race" }));

    // Fire both before awaiting either — without the mutex both reads would
    // see nextCaseSequence=0 and both would return 1 (the original bug).
    const [a, b] = await Promise.all([
      allocateEpisodeSequence("ep-race"),
      allocateEpisodeSequence("ep-race"),
    ]);

    expect([a, b].sort()).toEqual([1, 2]);
    expect((await getEpisode("ep-race"))?.nextCaseSequence).toBe(2);
  });

  it("locks are per-episode — different episodes do not contend", async () => {
    await saveEpisode(makeEpisode({ id: "ep-a" }));
    await saveEpisode(makeEpisode({ id: "ep-b" }));

    const [a, b] = await Promise.all([
      allocateEpisodeSequence("ep-a"),
      allocateEpisodeSequence("ep-b"),
    ]);

    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});

describe("updateEpisode status-transition guard", () => {
  it("applies a legal transition (active → completed)", async () => {
    await saveEpisode(makeEpisode({ id: "ep-legal", status: "active" }));

    await updateEpisode("ep-legal", { status: "completed" });

    expect((await getEpisode("ep-legal"))?.status).toBe("completed");
  });

  it("rejects an illegal transition (completed → planned) but persists co-submitted fields", async () => {
    await saveEpisode(makeEpisode({ id: "ep-illegal", status: "completed" }));

    await updateEpisode("ep-illegal", {
      status: "planned" as EpisodeStatus,
      notes: "metadata still saved",
    });

    const after = await getEpisode("ep-illegal");
    expect(after?.status).toBe("completed");
    expect(after?.notes).toBe("metadata still saved");
  });

  it("is a no-op for a missing episode", async () => {
    await expect(
      updateEpisode("nope", { notes: "x" }),
    ).resolves.toBeUndefined();
    expect(await getEpisode("nope")).toBeNull();
  });

  it("allows a same-status write through without the guard", async () => {
    await saveEpisode(makeEpisode({ id: "ep-same", status: "completed" }));

    await updateEpisode("ep-same", { status: "completed", notes: "touched" });

    const after = await getEpisode("ep-same");
    expect(after?.status).toBe("completed");
    expect(after?.notes).toBe("touched");
  });
});

describe("getVisibleDashboardEpisodes", () => {
  it("includes active/on_hold/planned and excludes cancelled", async () => {
    await saveEpisode(makeEpisode({ id: "ep-active", status: "active" }));
    await saveEpisode(makeEpisode({ id: "ep-hold", status: "on_hold" }));
    await saveEpisode(makeEpisode({ id: "ep-planned", status: "planned" }));
    await saveEpisode(makeEpisode({ id: "ep-cancelled", status: "cancelled" }));

    const visible = await getVisibleDashboardEpisodes();
    const ids = visible.map((e) => e.id).sort();

    expect(ids).toEqual(["ep-active", "ep-hold", "ep-planned"]);
  });

  it("keeps a completed episode resolved within the last 7 days", async () => {
    await saveEpisode(
      makeEpisode({
        id: "ep-recent",
        status: "completed",
        resolvedDate: isoDaysAgo(3),
      }),
    );

    const visible = await getVisibleDashboardEpisodes();
    expect(visible.map((e) => e.id)).toContain("ep-recent");
  });

  it("drops a completed episode resolved more than 7 days ago", async () => {
    await saveEpisode(
      makeEpisode({
        id: "ep-stale",
        status: "completed",
        resolvedDate: isoDaysAgo(10),
      }),
    );

    const visible = await getVisibleDashboardEpisodes();
    expect(visible.map((e) => e.id)).not.toContain("ep-stale");
  });

  it("drops a completed episode with no resolvedDate", async () => {
    await saveEpisode(
      makeEpisode({ id: "ep-noresolved", status: "completed" }),
    );

    const visible = await getVisibleDashboardEpisodes();
    expect(visible.map((e) => e.id)).not.toContain("ep-noresolved");
  });
});
