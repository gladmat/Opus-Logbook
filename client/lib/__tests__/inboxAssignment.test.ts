import { describe, expect, it } from "vitest";
import type { InboxItem } from "@/types/inbox";
import {
  inferMediaTagForInboxItem,
  inboxItemToOperativeMediaSmart,
  extractPatientIdHint,
} from "../inboxAssignment";

// ── Helpers ──────────────────────────────────────────────────

function makeInboxItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "test-id",
    localUri: "opus-media:test-uuid",
    mimeType: "image/jpeg",
    capturedAt: "2025-06-15T10:00:00.000Z",
    sourceType: "opus_camera",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// inferMediaTagForInboxItem
// ═══════════════════════════════════════════════════════════

describe("inferMediaTagForInboxItem", () => {
  it("returns protocol step tag when template metadata is present", () => {
    // free_flap protocol, step 0 → tag "preop_clinical"
    const item = makeInboxItem({ templateId: "free_flap", templateStepIndex: 0 });
    expect(inferMediaTagForInboxItem(item)).toBe("preop_clinical");
  });

  it("returns correct tag for non-zero step index", () => {
    // free_flap protocol, step 4 → tag "flap_harvest"
    const item = makeInboxItem({ templateId: "free_flap", templateStepIndex: 4 });
    expect(inferMediaTagForInboxItem(item)).toBe("flap_harvest");
  });

  it("falls back to temporal when protocol ID is unknown", () => {
    const item = makeInboxItem({
      templateId: "nonexistent_protocol",
      templateStepIndex: 0,
      capturedAt: "2025-06-15T10:00:00.000Z",
    });
    // procedureDate same day → "intraop"
    expect(inferMediaTagForInboxItem(item, "2025-06-15")).toBe("intraop");
  });

  it("falls back to temporal when step index is out of bounds", () => {
    const item = makeInboxItem({
      templateId: "free_flap",
      templateStepIndex: 999,
      capturedAt: "2025-06-15T10:00:00.000Z",
    });
    expect(inferMediaTagForInboxItem(item, "2025-06-15")).toBe("intraop");
  });

  it("returns intraop when procedureDate matches capturedAt", () => {
    const item = makeInboxItem({
      capturedAt: "2025-06-15T14:30:00.000Z",
    });
    expect(inferMediaTagForInboxItem(item, "2025-06-15")).toBe("intraop");
  });

  it("returns postop_early when capturedAt is 5 days after procedure", () => {
    const item = makeInboxItem({
      capturedAt: "2025-06-20T10:00:00.000Z",
    });
    expect(inferMediaTagForInboxItem(item, "2025-06-15")).toBe("postop_early");
  });

  it("returns preop_clinical when capturedAt is before procedureDate", () => {
    const item = makeInboxItem({
      capturedAt: "2025-06-10T10:00:00.000Z",
    });
    expect(inferMediaTagForInboxItem(item, "2025-06-15")).toBe("preop_clinical");
  });

  it("returns 'other' when no template and no procedureDate", () => {
    const item = makeInboxItem();
    expect(inferMediaTagForInboxItem(item)).toBe("other");
  });

  it("prefers template tag over temporal inference", () => {
    // Template says step 1 → "flap_planning", but temporal would be "intraop"
    const item = makeInboxItem({
      templateId: "free_flap",
      templateStepIndex: 1,
      capturedAt: "2025-06-15T10:00:00.000Z",
    });
    expect(inferMediaTagForInboxItem(item, "2025-06-15")).toBe("flap_planning");
  });
});

// ═══════════════════════════════════════════════════════════
// inboxItemToOperativeMediaSmart
// ═══════════════════════════════════════════════════════════

describe("inboxItemToOperativeMediaSmart", () => {
  it("sets tag and derives mediaType", () => {
    const item = makeInboxItem();
    const result = inboxItemToOperativeMediaSmart(item, "flap_harvest");
    expect(result.tag).toBe("flap_harvest");
    expect(result.mediaType).toBe("intraoperative_photo");
  });

  it("preserves id, localUri, mimeType, and createdAt from inbox item", () => {
    const item = makeInboxItem({
      id: "specific-id",
      localUri: "opus-media:specific-uuid",
      mimeType: "image/png",
      capturedAt: "2025-01-01T00:00:00.000Z",
    });
    const result = inboxItemToOperativeMediaSmart(item, "preop_clinical");
    expect(result.id).toBe("specific-id");
    expect(result.localUri).toBe("opus-media:specific-uuid");
    expect(result.mimeType).toBe("image/png");
    expect(result.createdAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("defaults mediaType to 'other' for unknown tags", () => {
    const item = makeInboxItem();
    const result = inboxItemToOperativeMediaSmart(item, "other");
    expect(result.mediaType).toBe("other");
  });
});

// ═══════════════════════════════════════════════════════════
// extractPatientIdHint
// ═══════════════════════════════════════════════════════════

describe("extractPatientIdHint", () => {
  it("returns the most common non-empty patientIdentifier", () => {
    const items = [
      makeInboxItem({ patientIdentifier: "NHI-123" }),
      makeInboxItem({ patientIdentifier: "NHI-123" }),
      makeInboxItem({ patientIdentifier: "NHI-456" }),
    ];
    expect(extractPatientIdHint(items)).toBe("NHI-123");
  });

  it("returns undefined when no items have patientIdentifier", () => {
    const items = [makeInboxItem(), makeInboxItem()];
    expect(extractPatientIdHint(items)).toBeUndefined();
  });

  it("returns undefined for empty array", () => {
    expect(extractPatientIdHint([])).toBeUndefined();
  });

  it("ignores whitespace-only identifiers", () => {
    const items = [
      makeInboxItem({ patientIdentifier: "  " }),
      makeInboxItem({ patientIdentifier: "NHI-789" }),
    ];
    expect(extractPatientIdHint(items)).toBe("NHI-789");
  });

  it("returns single identifier when only one is present", () => {
    const items = [
      makeInboxItem(),
      makeInboxItem({ patientIdentifier: "SOLE-ID" }),
      makeInboxItem(),
    ];
    expect(extractPatientIdHint(items)).toBe("SOLE-ID");
  });
});
