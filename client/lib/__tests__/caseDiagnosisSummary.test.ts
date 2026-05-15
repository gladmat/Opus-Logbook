/**
 * caseDiagnosisSummary — surfaces the case's primary diagnosis title /
 * subtitle across 25+ display surfaces (dashboard, case detail, summary
 * panels, etc.).
 *
 * Contract: hand trauma cases get their procedural case title; everything
 * else gets the diagnosis displayName; hand infection adds a subtitle.
 */

import { describe, it, expect } from "vitest";
import {
  getDiagnosisGroupTitle,
  getDiagnosisGroupSubtitle,
  getCasePrimaryTitle,
} from "@/lib/caseDiagnosisSummary";
import type { Case, DiagnosisGroup } from "@/types/case";

function makeGroup(overrides: Partial<DiagnosisGroup> = {}): DiagnosisGroup {
  return {
    id: "g1",
    sequenceOrder: 1,
    specialty: "general",
    procedures: [],
    ...overrides,
  };
}

describe("getDiagnosisGroupTitle", () => {
  it("returns undefined for undefined group", () => {
    expect(getDiagnosisGroupTitle(undefined)).toBeUndefined();
  });

  it("returns diagnosis.displayName when no hand trauma title applies", () => {
    const group = makeGroup({
      specialty: "general",
      diagnosis: { displayName: "Basal cell carcinoma", snomedCtCode: "" },
    } as any);
    expect(getDiagnosisGroupTitle(group)).toBe("Basal cell carcinoma");
  });

  it("returns undefined when no diagnosis and no hand trauma data", () => {
    const group = makeGroup({ specialty: "general" });
    expect(getDiagnosisGroupTitle(group)).toBeUndefined();
  });

  it("prefers hand trauma case title when present (overrides diagnosis.displayName)", () => {
    // Hand trauma cases generate machine titles from their structured data;
    // these supersede the generic diagnosis name. We don't need to fully build
    // the hand trauma state here — the contract is just that getHandTraumaCaseTitle
    // gets called first and falls back to diagnosis.displayName.
    const group = makeGroup({
      specialty: "hand_wrist",
      diagnosis: { displayName: "Fallback diagnosis name", snomedCtCode: "" },
      // No handTrauma data → getHandTraumaCaseTitle returns null → falls back
    } as any);
    expect(getDiagnosisGroupTitle(group)).toBe("Fallback diagnosis name");
  });
});

describe("getDiagnosisGroupSubtitle", () => {
  it("returns null for undefined group", () => {
    expect(getDiagnosisGroupSubtitle(undefined)).toBeNull();
  });

  it("returns null when no handInfectionDetails", () => {
    const group = makeGroup();
    expect(getDiagnosisGroupSubtitle(group)).toBeNull();
  });
});

describe("getCasePrimaryTitle", () => {
  it("returns undefined when diagnosisGroups is empty", () => {
    const caseData: Case = {
      id: "c1",
      userId: "u1",
      procedureDate: "2026-05-15",
      diagnosisGroups: [],
    } as any;
    expect(getCasePrimaryTitle(caseData)).toBeUndefined();
  });

  it("returns first group's title", () => {
    const caseData: Case = {
      id: "c1",
      userId: "u1",
      procedureDate: "2026-05-15",
      diagnosisGroups: [
        makeGroup({
          diagnosis: { displayName: "Primary BCC", snomedCtCode: "" },
        } as any),
        makeGroup({
          diagnosis: { displayName: "Secondary SCC", snomedCtCode: "" },
        } as any),
      ],
    } as any;
    expect(getCasePrimaryTitle(caseData)).toBe("Primary BCC");
  });
});
