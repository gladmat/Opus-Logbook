import { describe, it, expect, beforeEach, vi } from "vitest";

import type { EpaAssessmentTarget, EpaExposureRecord } from "../epaDerivation";

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
  getEpaExposures,
  getEpaTargetsRecord,
  clearEpaTargets,
  getEpaTargetCaseIds,
  getAllEpaTargets,
  getAllEpaExposures,
} = await import("../assessmentStorage");

const CASE_ID = "case-1";
const KEY = "user-test:@opus_epa_targets_case-1";
const INDEX_KEY = "user-test:@opus_epa_targets_index";

function makeTarget(
  overrides: Partial<EpaAssessmentTarget> = {},
): EpaAssessmentTarget {
  return {
    version: 3,
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
        stepId: "s-micro",
        stepLabel: "Microsurgery & inset",
        supervisorRole: "SS",
        traineeRole: "PS",
      },
    ],
    ...overrides,
  };
}

function makeExposure(
  overrides: Partial<EpaExposureRecord> = {},
): EpaExposureRecord {
  return {
    version: 3,
    participantContactId: "c-fa",
    participantDisplayName: "Dr Assistant",
    participantLinkedUserId: "u-fa",
    participantTier: 2 as EpaExposureRecord["participantTier"],
    units: [
      {
        procedureId: "p1",
        procedureSnomedCode: "771225007",
        procedureDisplayName: "Free flap reconstruction",
        role: "FA",
        seniorDisplayNames: ["You"],
      },
    ],
    ...overrides,
  };
}

/** A pre-2.23.0 stored record: bare array of v2 targets (any trainee role). */
function legacyV2Array(traineeRoles: string[]): string {
  const targets = traineeRoles.map((role, i) => ({
    ...makeTarget({
      traineeContactId: `c-${i}`,
      traineeLinkedUserId: `u-${i}`,
    }),
    version: 2,
    units: [{ ...makeTarget().units[0]!, traineeRole: role }],
  }));
  return `enc:test:${JSON.stringify(targets)}`;
}

describe("EPA targets storage", () => {
  beforeEach(() => {
    AsyncStorage.__store.clear();
  });

  it("round-trips v3 targets + exposures as ONE encrypted envelope and maintains the index", async () => {
    const targets = [makeTarget()];
    const exposures = [makeExposure()];
    await saveEpaTargets(CASE_ID, targets, exposures);

    const stored = AsyncStorage.__store.get(KEY);
    expect(stored).toBeDefined();
    expect(stored!.startsWith("enc:test:")).toBe(true);
    expect(JSON.parse(stored!.slice("enc:test:".length)).v).toBe(3);

    expect(await getEpaTargets(CASE_ID)).toEqual(targets);
    expect(await getEpaExposures(CASE_ID)).toEqual(exposures);
    expect(await getEpaTargetsRecord(CASE_ID)).toEqual({ targets, exposures });
    expect(await getEpaTargetCaseIds()).toEqual([CASE_ID]);
  });

  it("exposures-only record is stored and indexed (targets [])", async () => {
    await saveEpaTargets(CASE_ID, [], [makeExposure()]);
    expect(AsyncStorage.__store.has(KEY)).toBe(true);
    expect(await getEpaTargets(CASE_ID)).toEqual([]);
    expect(await getEpaExposures(CASE_ID)).toHaveLength(1);
    expect(await getEpaTargetCaseIds()).toEqual([CASE_ID]);
  });

  it("saving empty targets AND exposures removes the key and the index entry", async () => {
    await saveEpaTargets(CASE_ID, [makeTarget()], [makeExposure()]);
    expect(AsyncStorage.__store.has(KEY)).toBe(true);

    await saveEpaTargets(CASE_ID, [], []);
    expect(AsyncStorage.__store.has(KEY)).toBe(false);
    expect(await getEpaTargetCaseIds()).toEqual([]);
  });

  it("migrates a legacy v2 array on read: PS units kept, FA-only targets dropped, written back as v3", async () => {
    AsyncStorage.__store.set(KEY, legacyV2Array(["PS", "FA"]));
    AsyncStorage.__store.set(INDEX_KEY, JSON.stringify([CASE_ID]));

    const loaded = await getEpaTargets(CASE_ID);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.version).toBe(3);
    expect(loaded[0]?.traineeContactId).toBe("c-0");
    expect(loaded[0]?.units[0]?.traineeRole).toBe("PS");

    // Write-back happened (best-effort, async).
    await new Promise((r) => setTimeout(r, 0));
    const stored = AsyncStorage.__store.get(KEY)!;
    expect(JSON.parse(stored.slice("enc:test:".length)).v).toBe(3);
    expect(await getEpaExposures(CASE_ID)).toEqual([]);
  });

  it("a legacy v2 array that collapses to nothing is cleared (key + index)", async () => {
    AsyncStorage.__store.set(KEY, legacyV2Array(["FA", "SA"]));
    AsyncStorage.__store.set(INDEX_KEY, JSON.stringify([CASE_ID]));

    expect(await getEpaTargets(CASE_ID)).toEqual([]);
    await new Promise((r) => setTimeout(r, 0));
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
    expect(await getEpaExposures("nonexistent")).toEqual([]);
  });

  it("clearEpaTargets removes key + index entry", async () => {
    await saveEpaTargets(CASE_ID, [makeTarget()]);
    await clearEpaTargets(CASE_ID);
    expect(AsyncStorage.__store.has(KEY)).toBe(false);
    expect(await getEpaTargetCaseIds()).toEqual([]);
  });

  it("getAllEpaTargets / getAllEpaExposures batch-load every indexed case", async () => {
    await saveEpaTargets("case-1", [makeTarget()], [makeExposure()]);
    await saveEpaTargets("case-2", [
      makeTarget({ traineeContactId: "c-other" }),
    ]);
    await saveEpaTargets("case-3", [], [makeExposure()]);

    const all = await getAllEpaTargets();
    expect(all.map((e) => e.caseId).sort()).toEqual(["case-1", "case-2"]);
    expect(all.every((e) => e.targets.length === 1)).toBe(true);

    const exposures = await getAllEpaExposures();
    expect(exposures.map((e) => e.caseId).sort()).toEqual(["case-1", "case-3"]);
  });
});
