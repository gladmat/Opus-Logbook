import { describe, expect, it } from "vitest";
import type { Case } from "@/types/case";
import { resolvedCaseStatus, isPlannedCase } from "@/types/case";
import { filterOutPlannedCases } from "../dashboardSelectors";
import { inboxItemToOperativeMediaSmart } from "../inboxAssignment";
import type { InboxItem } from "@/types/inbox";

// ── Helpers ──────────────────────────────────────────────────

function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    id: "case-1",
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
    id: "inbox-1",
    localUri: "opus-media:test-uuid",
    mimeType: "image/jpeg",
    capturedAt: "2025-06-15T10:00:00.000Z",
    sourceType: "opus_camera",
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// resolvedCaseStatus
// ═══════════════════════════════════════════════════════════

describe("resolvedCaseStatus", () => {
  it("returns explicit caseStatus when set to 'planned'", () => {
    const c = makeCase({ caseStatus: "planned" });
    expect(resolvedCaseStatus(c)).toBe("planned");
  });

  it("returns explicit caseStatus when set to 'active'", () => {
    const c = makeCase({ caseStatus: "active" });
    expect(resolvedCaseStatus(c)).toBe("active");
  });

  it("returns explicit caseStatus when set to 'discharged'", () => {
    const c = makeCase({ caseStatus: "discharged" });
    expect(resolvedCaseStatus(c)).toBe("discharged");
  });

  it("returns 'discharged' when no caseStatus but dischargeDate exists", () => {
    const c = makeCase({ dischargeDate: "2025-06-20" });
    expect(resolvedCaseStatus(c)).toBe("discharged");
  });

  it("returns 'active' when no caseStatus and no dischargeDate", () => {
    const c = makeCase();
    expect(resolvedCaseStatus(c)).toBe("active");
  });
});

// ═══════════════════════════════════════════════════════════
// isPlannedCase
// ═══════════════════════════════════════════════════════════

describe("isPlannedCase", () => {
  it("returns true when caseStatus is 'planned'", () => {
    const c = makeCase({ caseStatus: "planned" });
    expect(isPlannedCase(c)).toBe(true);
  });

  it("returns false for active cases", () => {
    const c = makeCase({ caseStatus: "active" });
    expect(isPlannedCase(c)).toBe(false);
  });

  it("returns false when caseStatus is undefined", () => {
    const c = makeCase();
    expect(isPlannedCase(c)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// filterOutPlannedCases
// ═══════════════════════════════════════════════════════════

describe("filterOutPlannedCases", () => {
  it("excludes planned cases", () => {
    const cases = [
      makeCase({ id: "c1", caseStatus: "active" }),
      makeCase({ id: "c2", caseStatus: "planned" }),
      makeCase({ id: "c3", caseStatus: "discharged" }),
    ];
    const result = filterOutPlannedCases(cases);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("returns all cases when none are planned", () => {
    const cases = [makeCase({ id: "c1" }), makeCase({ id: "c2" })];
    expect(filterOutPlannedCases(cases)).toHaveLength(2);
  });

  it("returns empty array for all-planned input", () => {
    const cases = [
      makeCase({ id: "c1", caseStatus: "planned" }),
      makeCase({ id: "c2", caseStatus: "planned" }),
    ];
    expect(filterOutPlannedCases(cases)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
// templateId/templateStepIndex carry-through
// ═══════════════════════════════════════════════════════════

describe("template metadata carry-through in assignment", () => {
  it("carries templateId from InboxItem to OperativeMediaItem", () => {
    const item = makeInboxItem({
      templateId: "free_flap",
      templateStepIndex: 3,
    });
    const result = inboxItemToOperativeMediaSmart(item, "other");
    expect(result.templateId).toBe("free_flap");
    expect(result.templateStepIndex).toBe(3);
  });

  it("leaves templateId undefined when not present on InboxItem", () => {
    const item = makeInboxItem();
    const result = inboxItemToOperativeMediaSmart(item, "other");
    expect(result.templateId).toBeUndefined();
    expect(result.templateStepIndex).toBeUndefined();
  });
});
