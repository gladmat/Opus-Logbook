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

const { saveEpaTargets, getEpaTargets, clearEpaTargets } = await import(
  "../assessmentStorage"
);

const CASE_ID = "case-1";
const KEY = "user-test:@opus_epa_targets_case-1";

function makeTarget(
  overrides: Partial<EpaAssessmentTarget> = {},
): EpaAssessmentTarget {
  return {
    procedureIndex: 0,
    procedureSnomedCode: "771225007",
    procedureDisplayName: "Free flap reconstruction",
    supervisorContactId: "c-sup",
    supervisorDisplayName: "Dr Senior",
    supervisorLinkedUserId: "u-sup",
    supervisorOperativeRole: "SS",
    traineeContactId: "c-tr",
    traineeDisplayName: "Dr Junior",
    traineeLinkedUserId: "u-tr",
    traineeOperativeRole: "PS",
    ...overrides,
  };
}

describe("EPA targets storage", () => {
  beforeEach(() => {
    AsyncStorage.__store.clear();
  });

  it("round-trips targets through encryption", async () => {
    const targets = [makeTarget()];
    await saveEpaTargets(CASE_ID, targets);

    const stored = AsyncStorage.__store.get(KEY);
    expect(stored).toBeDefined();
    expect(stored!.startsWith("enc:test:")).toBe(true);

    const loaded = await getEpaTargets(CASE_ID);
    expect(loaded).toEqual(targets);
  });

  it("saving an empty list removes the stored key", async () => {
    await saveEpaTargets(CASE_ID, [makeTarget()]);
    expect(AsyncStorage.__store.has(KEY)).toBe(true);

    await saveEpaTargets(CASE_ID, []);
    expect(AsyncStorage.__store.has(KEY)).toBe(false);
  });

  it("drops legacy plaintext records and clears the key", async () => {
    // Pre-encryption format: plain JSON straight into AsyncStorage.
    AsyncStorage.__store.set(KEY, JSON.stringify([makeTarget()]));

    const loaded = await getEpaTargets(CASE_ID);
    expect(loaded).toEqual([]);
    // Best-effort removal is async fire-and-forget; flush microtasks.
    await new Promise((r) => setTimeout(r, 0));
    expect(AsyncStorage.__store.has(KEY)).toBe(false);
  });

  it("returns [] for a missing key", async () => {
    expect(await getEpaTargets("nonexistent")).toEqual([]);
  });

  it("clearEpaTargets removes the key", async () => {
    await saveEpaTargets(CASE_ID, [makeTarget()]);
    await clearEpaTargets(CASE_ID);
    expect(AsyncStorage.__store.has(KEY)).toBe(false);
    expect(await getEpaTargets(CASE_ID)).toEqual([]);
  });
});
