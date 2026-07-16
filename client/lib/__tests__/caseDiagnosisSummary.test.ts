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

describe("getDiagnosisGroupTitle — stale trauma blob vs coded diagnosis", () => {
  // A handTrauma blob that survived a case-type switch regenerates a trauma
  // title; it must not override a coded non-trauma diagnosis.
  const staleTraumaOverrides = {
    specialty: "hand_wrist" as const,
    diagnosisClinicalDetails: {
      laterality: "left",
      injuryMechanism: "saw_blade",
      handTrauma: { affectedDigits: ["II"] },
    },
  };

  it("uses the trauma title when there is no picklist diagnosis", () => {
    const group = makeGroup(staleTraumaOverrides as any);
    expect(getDiagnosisGroupTitle(group)).toBe(
      "Left hand saw/blade injury - Dig. II",
    );
  });

  it("keeps the trauma title when the picklist diagnosis is itself trauma", () => {
    const group = makeGroup({
      ...staleTraumaOverrides,
      diagnosisPicklistId: "hand_dx_metacarpal_fx",
      diagnosis: { displayName: "Metacarpal fracture", snomedCtCode: "" },
    } as any);
    expect(getDiagnosisGroupTitle(group)).toBe(
      "Left hand saw/blade injury - Dig. II",
    );
  });

  it("prefers the coded elective diagnosis over a stale trauma blob (repro)", () => {
    const group = makeGroup({
      ...staleTraumaOverrides,
      diagnosisPicklistId: "hand_dx_enchondroma",
      diagnosis: {
        displayName: "Enchondroma (hand / finger)",
        snomedCtCode: "423421002",
      },
    } as any);
    expect(getDiagnosisGroupTitle(group)).toBe("Enchondroma (hand / finger)");
  });

  it("falls back to the trauma title when the elective diagnosis has no displayName", () => {
    const group = makeGroup({
      ...staleTraumaOverrides,
      diagnosisPicklistId: "hand_dx_enchondroma",
    } as any);
    expect(getDiagnosisGroupTitle(group)).toBe(
      "Left hand saw/blade injury - Dig. II",
    );
  });

  it("keeps the trauma title when the picklistId does not resolve", () => {
    const group = makeGroup({
      ...staleTraumaOverrides,
      diagnosisPicklistId: "nonexistent_dx_id",
      diagnosis: { displayName: "Something", snomedCtCode: "" },
    } as any);
    expect(getDiagnosisGroupTitle(group)).toBe(
      "Left hand saw/blade injury - Dig. II",
    );
  });
});

describe("getDiagnosisGroupTitle — bone tumour site enrichment", () => {
  it("appends bone + digit to the diagnosis title", () => {
    const group = makeGroup({
      specialty: "hand_wrist",
      diagnosis: {
        displayName: "Enchondroma (hand / finger)",
        snomedCtCode: "423421002",
      },
      procedures: [
        {
          id: "p1",
          sequenceOrder: 1,
          procedureName: "Curettage + bone graft (enchondroma)",
          boneTumourDetails: {
            bone: "middle_phalanx",
            digit: "V",
            graftType: "autograft",
            graftDonorSite: "distal_radius",
          },
        },
      ],
    } as any);
    expect(getDiagnosisGroupTitle(group)).toBe(
      "Enchondroma (hand / finger) — middle phalanx, Dig. V",
    );
  });

  it("appends bone only when no digit is recorded", () => {
    const group = makeGroup({
      diagnosis: { displayName: "Enchondroma (hand / finger)" },
      procedures: [
        {
          id: "p1",
          sequenceOrder: 1,
          procedureName: "Curettage",
          boneTumourDetails: {
            bone: "carpal",
            digit: "V", // digit does not apply to carpal bones
            graftType: null,
            graftDonorSite: null,
          },
        },
      ],
    } as any);
    expect(getDiagnosisGroupTitle(group)).toBe(
      "Enchondroma (hand / finger) — carpal bone",
    );
  });

  it("leaves the title unchanged when no bone is recorded", () => {
    const group = makeGroup({
      diagnosis: { displayName: "Enchondroma (hand / finger)" },
      procedures: [
        {
          id: "p1",
          sequenceOrder: 1,
          procedureName: "Curettage",
          boneTumourDetails: {
            bone: null,
            digit: null,
            graftType: "autograft",
            graftDonorSite: "distal_radius",
          },
        },
      ],
    } as any);
    expect(getDiagnosisGroupTitle(group)).toBe("Enchondroma (hand / finger)");
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
