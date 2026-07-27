import { describe, it, expect, beforeEach, vi } from "vitest";

import type { EpaAssessmentTarget } from "../epaDerivation";

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
      __store: store,
    },
  };
});

// Envelope-faithful mock: decryptData THROWS on anything that wasn't
// produced by encryptData — mirrors the real AEAD layer so the
// legacy-plaintext-rejection path is actually exercised.
vi.mock("../encryption", () => ({
  encryptData: vi.fn(async (plain: string) => `enc:test:${plain}`),
  decryptData: vi.fn(async (cipher: string) => {
    if (!cipher.startsWith("enc:test:")) {
      throw new Error("Invalid envelope");
    }
    return cipher.slice("enc:test:".length);
  }),
}));

vi.mock("../activeUser", () => ({
  userScopedAsyncKey: (key: string) => `user-test:${key}`,
}));

const AsyncStorage = (await import("@react-native-async-storage/async-storage"))
  .default as unknown as { __store: Map<string, string> };

const {
  saveEpaTargets,
  getEpaTargets,
  clearEpaTargets,
  getEpaTargetCaseIds,
  getAllEpaTargets,
} = await import("../assessmentStorage");

const CASE_ID = "case-1";
const KEY = "user-test:@opus_epa_targets_case-1";
const INDEX_KEY = "user-test:@opus_epa_targets_index";

function makeTarget(
  overrides: Partial<EpaAssessmentTarget> = {},
): EpaAssessmentTarget {
  return {
    version: 2,
    supervisorContactId: "self",
    supervisorDisplayName: "You",
    supervisorLinkedUserId: "u-self",
    supervisorTier: 5 as EpaAssessmentTarget["supervisorTier"],
    traineeContactId: "c-tr",
    traineeDisplayName: "Dr Junior",
    traineeLinkedUserId: "u-tr",
    traineeTier: 2 as EpaAssessmentTarget["traineeTier"],
    units: [
      {
        procedureId: "p1",
        procedureSnomedCode: "771225007",
        procedureDisplayName: "Free flap reconstruction",
        stepId: "s-prep",
        stepLabel: "Recipient vessel prep",
        supervisorRole: "PS",
        traineeRole: "FA",
      },
    ],
    ...overrides,
  };
}

describe("EPA targets storage", () => {
  beforeEach(() => {
    AsyncStorage.__store.clear();
  });

  it("round-trips v2 targets through encryption and maintains the index", async () => {
    const targets = [makeTarget()];
    await saveEpaTargets(CASE_ID, targets);

    const stored = AsyncStorage.__store.get(KEY);
    expect(stored).toBeDefined();
    expect(stored!.startsWith("enc:test:")).toBe(true);

    expect(await getEpaTargets(CASE_ID)).toEqual(targets);
    expect(await getEpaTargetCaseIds()).toEqual([CASE_ID]);
  });

  it("saving an empty list removes the key and the index entry", async () => {
    await saveEpaTargets(CASE_ID, [makeTarget()]);
    expect(AsyncStorage.__store.has(KEY)).toBe(true);

    await saveEpaTargets(CASE_ID, []);
    expect(AsyncStorage.__store.has(KEY)).toBe(false);
    expect(await getEpaTargetCaseIds()).toEqual([]);
  });

  it("drops legacy plaintext records and clears the key", async () => {
    AsyncStorage.__store.set(KEY, JSON.stringify([makeTarget()]));

    const loaded = await getEpaTargets(CASE_ID);
    expect(loaded).toEqual([]);
    await new Promise((r) => setTimeout(r, 0));
    expect(AsyncStorage.__store.has(KEY)).toBe(false);
  });

  it("drops encrypted v1 records (no version field)", async () => {
    const v1 = { procedureIndex: 0, supervisorContactId: "a" };
    AsyncStorage.__store.set(KEY, `enc:test:${JSON.stringify([v1])}`);
    AsyncStorage.__store.set(INDEX_KEY, JSON.stringify([CASE_ID]));

    expect(await getEpaTargets(CASE_ID)).toEqual([]);
    await new Promise((r) => setTimeout(r, 0));
    expect(AsyncStorage.__store.has(KEY)).toBe(false);
    expect(await getEpaTargetCaseIds()).toEqual([]);
  });

  it("returns [] for a missing key", async () => {
    expect(await getEpaTargets("nonexistent")).toEqual([]);
  });

  it("clearEpaTargets removes key + index entry", async () => {
    await saveEpaTargets(CASE_ID, [makeTarget()]);
    await clearEpaTargets(CASE_ID);
    expect(AsyncStorage.__store.has(KEY)).toBe(false);
    expect(await getEpaTargetCaseIds()).toEqual([]);
  });

  it("getAllEpaTargets batch-loads every indexed case", async () => {
    await saveEpaTargets("case-1", [makeTarget()]);
    await saveEpaTargets("case-2", [
      makeTarget({ traineeContactId: "c-other" }),
    ]);
    const all = await getAllEpaTargets();
    expect(all.map((e) => e.caseId).sort()).toEqual(["case-1", "case-2"]);
    expect(all.every((e) => e.targets.length === 1)).toBe(true);
  });
});
