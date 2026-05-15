import { describe, expect, it, vi } from "vitest";
import type { InboxItem } from "@/types/inbox";
import type { OperativeMediaItem, Case } from "@/types/case";
import type { CaptureStep } from "@/data/mediaCaptureProtocols";

import {
  autoAssign,
  findMatchingCasesByPatientId,
  inboxItemToOperativeMediaSmart,
} from "../inboxAssignment";

// Mock HMAC module — return a deterministic hash (uppercased + prefixed) so
// tests can verify matching logic without Keychain access.
vi.mock("@/lib/patientIdentifierHmac", () => ({
  hashPatientIdentifierHmac: async (id: string) =>
    `hmac:${id.toUpperCase().trim()}`,
}));

// ── Helpers ──────────────────────────────────────────────────

function makeMedia(
  overrides: Partial<OperativeMediaItem> = {},
): OperativeMediaItem {
  return {
    id: `media-${Math.random().toString(36).slice(2, 8)}`,
    localUri: "opus-media:test-uuid",
    mimeType: "image/jpeg",
    createdAt: "2025-06-15T10:00:00.000Z",
    mediaType: "other",
    ...overrides,
  };
}

function makeStep(overrides: Partial<CaptureStep> = {}): CaptureStep {
  return {
    tag: "preop_clinical",
    label: "Test Step",
    required: false,
    phase: "preop",
    ...overrides,
  };
}

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    id: `case-${Math.random().toString(36).slice(2, 8)}`,
    patientIdentifier: "NHI-001",
    procedureDate: "2025-06-15",
    facility: "Test Hospital",
    specialty: "general",
    createdAt: "2025-06-15T00:00:00.000Z",
    updatedAt: "2025-06-15T00:00:00.000Z",
    diagnosisGroups: [],
    operativeMedia: [],
    timeline: [],
    ...overrides,
  } as Case;
}

function makeInboxItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: `inbox-${Math.random().toString(36).slice(2, 8)}`,
    localUri: "opus-media:test-uuid",
    mimeType: "image/jpeg",
    capturedAt: "2025-06-15T10:00:00.000Z",
    sourceType: "opus_camera",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// autoAssign
// ═══════════════════════════════════════════════════════════

describe("autoAssign", () => {
  it("assigns template-step items to correct slots", () => {
    const media = [
      makeMedia({
        id: "m1",
        templateId: "free_flap",
        templateStepIndex: 0,
        tag: "other",
      }),
    ];
    const steps = [
      makeStep({ tag: "preop_clinical" }),
      makeStep({ tag: "flap_planning" }),
    ];

    const result = autoAssign(media, steps);
    expect(result[0]!.tag).toBe("preop_clinical");
  });

  it("fills empty slots sequentially with untagged photos", () => {
    const media = [
      makeMedia({
        id: "m1",
        tag: "other",
        createdAt: "2025-06-15T09:00:00.000Z",
      }),
      makeMedia({
        id: "m2",
        tag: "other",
        createdAt: "2025-06-15T10:00:00.000Z",
      }),
    ];
    const steps = [
      makeStep({ tag: "preop_clinical" }),
      makeStep({ tag: "flap_planning" }),
      makeStep({ tag: "flap_harvest" }),
    ];

    const result = autoAssign(media, steps);
    expect(result[0]!.tag).toBe("preop_clinical");
    expect(result[1]!.tag).toBe("flap_planning");
  });

  it("does not double-assign a slot", () => {
    const media = [
      makeMedia({
        id: "m1",
        templateId: "free_flap",
        templateStepIndex: 0,
        tag: "other",
      }),
      makeMedia({ id: "m2", tag: "other" }),
    ];
    const steps = [
      makeStep({ tag: "preop_clinical" }),
      makeStep({ tag: "flap_planning" }),
    ];

    const result = autoAssign(media, steps);
    // m1 takes preop_clinical via template, m2 takes next slot
    expect(result[0]!.tag).toBe("preop_clinical");
    expect(result[1]!.tag).toBe("flap_planning");
  });

  it("preserves already-tagged media", () => {
    const media = [
      makeMedia({ id: "m1", tag: "flap_harvest" }),
      makeMedia({ id: "m2", tag: "other" }),
    ];
    const steps = [
      makeStep({ tag: "preop_clinical" }),
      makeStep({ tag: "flap_harvest" }),
    ];

    const result = autoAssign(media, steps);
    // m1 keeps flap_harvest (already tagged — slot 1 is filled)
    expect(result[0]!.tag).toBe("flap_harvest");
    // m2 fills next empty slot (slot 0, preop_clinical)
    expect(result[1]!.tag).toBe("preop_clinical");
  });

  it("leaves unmatched photos untagged when all slots filled", () => {
    const media = [
      makeMedia({ id: "m1", tag: "other" }),
      makeMedia({ id: "m2", tag: "other" }),
      makeMedia({ id: "m3", tag: "other" }),
    ];
    const steps = [makeStep({ tag: "preop_clinical" })];

    const result = autoAssign(media, steps);
    expect(result[0]!.tag).toBe("preop_clinical");
    // Extra photos remain untagged
    expect(result[1]!.tag).toBe("other");
    expect(result[2]!.tag).toBe("other");
  });

  it("does not mutate input array", () => {
    const original = makeMedia({ id: "m1", tag: "other" });
    const media = [original];
    const steps = [makeStep({ tag: "preop_clinical" })];

    const result = autoAssign(media, steps);
    expect(result[0]!.tag).toBe("preop_clinical");
    expect(original.tag).toBe("other"); // Original unchanged
  });

  it("handles empty media array", () => {
    const result = autoAssign([], [makeStep()]);
    expect(result).toEqual([]);
  });

  it("handles empty protocol steps", () => {
    const media = [makeMedia({ tag: "other" })];
    const result = autoAssign(media, []);
    expect(result[0]!.tag).toBe("other");
  });
});

// ═══════════════════════════════════════════════════════════
// findMatchingCasesByPatientId
// ═══════════════════════════════════════════════════════════

describe("findMatchingCasesByPatientId", () => {
  it("matches inbox items to cases by patient ID", async () => {
    const inboxItems = [
      makeInboxItem({ patientIdentifier: "NHI-123" }),
      makeInboxItem({ patientIdentifier: "NHI-123" }),
    ];
    const cases = [
      makeCase({ id: "c1", patientIdentifier: "NHI-123" }),
      makeCase({ id: "c2", patientIdentifier: "NHI-456" }),
    ];

    const result = await findMatchingCasesByPatientId(inboxItems, cases);
    expect(result).toHaveLength(1);
    expect(result[0]!.caseData.id).toBe("c1");
    expect(result[0]!.matchCount).toBe(2);
  });

  it("returns empty array when no patient IDs in inbox items", async () => {
    const inboxItems = [makeInboxItem(), makeInboxItem()];
    const cases = [makeCase({ patientIdentifier: "NHI-123" })];
    expect(await findMatchingCasesByPatientId(inboxItems, cases)).toEqual([]);
  });

  it("performs case-insensitive matching", async () => {
    const inboxItems = [makeInboxItem({ patientIdentifier: "nhi-123" })];
    const cases = [makeCase({ id: "c1", patientIdentifier: "NHI-123" })];

    const result = await findMatchingCasesByPatientId(inboxItems, cases);
    expect(result).toHaveLength(1);
    expect(result[0]!.caseData.id).toBe("c1");
  });

  it("returns empty array when no cases match", async () => {
    const inboxItems = [makeInboxItem({ patientIdentifier: "NHI-999" })];
    const cases = [makeCase({ patientIdentifier: "NHI-123" })];
    expect(await findMatchingCasesByPatientId(inboxItems, cases)).toEqual([]);
  });

  it("sorts results by match count descending", async () => {
    const inboxItems = [
      makeInboxItem({ patientIdentifier: "NHI-A" }),
      makeInboxItem({ patientIdentifier: "NHI-B" }),
      makeInboxItem({ patientIdentifier: "NHI-B" }),
      makeInboxItem({ patientIdentifier: "NHI-B" }),
    ];
    const cases = [
      makeCase({ id: "cA", patientIdentifier: "NHI-A" }),
      makeCase({ id: "cB", patientIdentifier: "NHI-B" }),
    ];

    const result = await findMatchingCasesByPatientId(inboxItems, cases);
    expect(result).toHaveLength(2);
    expect(result[0]!.caseData.id).toBe("cB");
    expect(result[0]!.matchCount).toBe(3);
    expect(result[1]!.caseData.id).toBe("cA");
    expect(result[1]!.matchCount).toBe(1);
  });

  it("handles empty inputs", async () => {
    expect(await findMatchingCasesByPatientId([], [])).toEqual([]);
    expect(await findMatchingCasesByPatientId([], [makeCase()])).toEqual([]);
    expect(
      await findMatchingCasesByPatientId(
        [makeInboxItem({ patientIdentifier: "X" })],
        [],
      ),
    ).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════
// templateId/templateStepIndex preserved through OperativeMediaItem
// ═══════════════════════════════════════════════════════════

describe("OperativeMediaItem template metadata", () => {
  it("preserves templateId and templateStepIndex through conversion", () => {
    const item = makeInboxItem({
      templateId: "skin_cancer_excision",
      templateStepIndex: 2,
    });
    const result = inboxItemToOperativeMediaSmart(item, "preop_clinical");
    expect(result.templateId).toBe("skin_cancer_excision");
    expect(result.templateStepIndex).toBe(2);
  });
});
