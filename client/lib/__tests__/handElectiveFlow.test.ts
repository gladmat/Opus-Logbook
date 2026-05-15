/**
 * Hand elective flow helpers — predicate gating for the elective hand
 * branch of the hand surgery 3-way case-type selector, plus the SNOMED
 * fallback state builder used when a surgeon manually picks a rare
 * elective diagnosis outside the curated chips.
 *
 * If these predicates drift, the elective hand picker can collide with
 * the generic SNOMED diagnosis picker (showing both at once) or hide the
 * elective picker entirely.
 */

import { describe, it, expect } from "vitest";
import {
  isElectiveHandFlow,
  shouldRenderGenericDiagnosisSnomedPicker,
  buildElectiveSnomedFallbackState,
} from "@/lib/handElectiveFlow";
import type { CaseProcedure } from "@/types/case";

describe("isElectiveHandFlow", () => {
  it("returns true only when specialty is hand_wrist AND caseType is elective", () => {
    expect(isElectiveHandFlow("hand_wrist", "elective")).toBe(true);
  });

  it("returns false for hand_wrist + trauma/acute", () => {
    expect(isElectiveHandFlow("hand_wrist", "trauma")).toBe(false);
    expect(isElectiveHandFlow("hand_wrist", "acute")).toBe(false);
  });

  it("returns false for non-hand specialties even if elective", () => {
    expect(isElectiveHandFlow("orthoplastic", "elective")).toBe(false);
    expect(isElectiveHandFlow("breast", "elective")).toBe(false);
  });

  it("returns false for nullish caseType", () => {
    expect(isElectiveHandFlow("hand_wrist", null)).toBe(false);
    expect(isElectiveHandFlow("hand_wrist", undefined)).toBe(false);
  });
});

describe("shouldRenderGenericDiagnosisSnomedPicker", () => {
  const baseParams = {
    hasDiagnosisPicklist: true,
    isDiagnosisPickerCollapsed: false,
    groupSpecialty: "general" as const,
    handCaseType: null,
  };

  it("renders when picklist available + uncollapsed + not elective hand", () => {
    expect(shouldRenderGenericDiagnosisSnomedPicker(baseParams)).toBe(true);
  });

  it("hides when picklist is unavailable", () => {
    expect(
      shouldRenderGenericDiagnosisSnomedPicker({
        ...baseParams,
        hasDiagnosisPicklist: false,
      }),
    ).toBe(false);
  });

  it("hides when the picker is collapsed", () => {
    expect(
      shouldRenderGenericDiagnosisSnomedPicker({
        ...baseParams,
        isDiagnosisPickerCollapsed: true,
      }),
    ).toBe(false);
  });

  it("hides for elective hand surgery (so HandElectivePicker shows instead)", () => {
    expect(
      shouldRenderGenericDiagnosisSnomedPicker({
        ...baseParams,
        groupSpecialty: "hand_wrist",
        handCaseType: "elective",
      }),
    ).toBe(false);
  });

  it("shows for hand_wrist + trauma (elective gate doesn't fire)", () => {
    expect(
      shouldRenderGenericDiagnosisSnomedPicker({
        ...baseParams,
        groupSpecialty: "hand_wrist",
        handCaseType: "trauma",
      }),
    ).toBe(true);
  });
});

describe("buildElectiveSnomedFallbackState", () => {
  it("propagates the SNOMED selection and term, collapses the picker, and forces elective caseType", () => {
    const sel = { conceptId: "123456789", term: "Rare elective lesion" };
    const procedures: CaseProcedure[] = [];
    const state = buildElectiveSnomedFallbackState(sel, procedures);

    expect(state.selectedDiagnosis).toBeNull();
    expect(state.primaryDiagnosis).toEqual(sel);
    expect(state.diagnosis).toBe("Rare elective lesion");
    expect(state.diagnosisStaging).toBeNull();
    expect(state.stagingValues).toEqual({});
    expect(state.selectedSuggestionIds).toBeInstanceOf(Set);
    expect(state.selectedSuggestionIds.size).toBe(0);
    expect(state.isDiagnosisPickerCollapsed).toBe(true);
    expect(state.showAllProcedures).toBe(false);
    expect(state.handCaseType).toBe("elective");
    expect(state.handInfectionDetails).toBeUndefined();
    expect(state.acuteProceduresAccepted).toBe(false);
    expect(state.showAcuteFullProcedurePicker).toBe(false);
    expect(state.procedures).toBe(procedures);
  });

  it("passes the procedures array by reference (no defensive clone)", () => {
    const procedures: CaseProcedure[] = [
      {
        id: "proc-1",
        procedureName: "Trigger finger release",
        specialty: "hand_wrist",
        surgeonRole: "PS",
        sequenceOrder: 1,
      } as CaseProcedure,
    ];
    const state = buildElectiveSnomedFallbackState(
      { conceptId: "1", term: "X" },
      procedures,
    );
    // Caller-owned ref intentionally preserved — saves a copy in the hot path.
    expect(state.procedures).toBe(procedures);
  });

  it("isolates Sets per call (no shared mutable state)", () => {
    const a = buildElectiveSnomedFallbackState(
      { conceptId: "1", term: "A" },
      [],
    );
    const b = buildElectiveSnomedFallbackState(
      { conceptId: "2", term: "B" },
      [],
    );
    a.selectedSuggestionIds.add("X");
    expect(b.selectedSuggestionIds.has("X")).toBe(false);
  });
});
