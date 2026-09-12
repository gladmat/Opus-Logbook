import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SharedCaseData } from "@/types/sharing";

const myAssessments = new Map<string, unknown>();
const revealed = new Map<string, unknown>();
const blobs = new Map<string, SharedCaseData>();

vi.mock("../assessmentStorage", () => ({
  getMyAssessment: async (id: string) => myAssessments.get(id) ?? null,
  getRevealedPair: async (id: string) => revealed.get(id) ?? null,
}));
vi.mock("../sharingStorage", () => ({
  getDecryptedSharedCase: async (id: string) => blobs.get(id) ?? null,
}));
vi.mock("../epaFromBlob", () => ({
  deriveEpaFromSharedBlob: () => ({ myTarget: { id: "t" } }),
}));
vi.mock("../epaGate", () => ({ resolveEpaEntryState: () => "assess" }));
vi.mock("react-native", () => ({
  InteractionManager: {
    runAfterInteractions: (cb: () => void) => {
      cb();
      return { cancel: vi.fn() };
    },
  },
}));

const { resolveSharedEpaStates } = await import("../sharedCaseBadges");

function summary(id: string) {
  return {
    id,
    shared: { ownerUserId: "owner" },
  } as unknown as import("@/lib/sharedCaseSummary").SharedCaseSummary;
}

describe("resolveSharedEpaStates", () => {
  beforeEach(() => {
    myAssessments.clear();
    revealed.clear();
    blobs.clear();
  });

  it("returns an empty map for no summaries", async () => {
    expect((await resolveSharedEpaStates([], "me")).size).toBe(0);
  });

  it("resolves every share in one pass: revealed > submitted > due > none", async () => {
    revealed.set("r", {});
    myAssessments.set("s", {});
    blobs.set("d", {} as SharedCaseData);
    const states = await resolveSharedEpaStates(
      [summary("r"), summary("s"), summary("d"), summary("n")],
      "me",
    );
    expect(states.get("r")).toBe("revealed");
    expect(states.get("s")).toBe("submitted");
    expect(states.get("d")).toBe("due");
    expect(states.get("n")).toBeNull();
  });

  it("no viewer id → never 'due'", async () => {
    blobs.set("d", {} as SharedCaseData);
    const states = await resolveSharedEpaStates([summary("d")], undefined);
    expect(states.get("d")).toBeNull();
  });
});
