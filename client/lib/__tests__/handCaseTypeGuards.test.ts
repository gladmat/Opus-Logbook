/**
 * handCaseTypeGuards — strip stale trauma assessment data when a hand
 * group's case type is explicitly non-trauma. Companion to the orphan-blob
 * prevention in buildCurrentDiagnosisGroup.
 */

import { describe, it, expect } from "vitest";
import { stripStaleHandTraumaData } from "@/lib/handCaseTypeGuards";
import type { DiagnosisClinicalDetails, FractureEntry } from "@/types/case";

const traumaDetails: DiagnosisClinicalDetails = {
  laterality: "left",
  injuryMechanism: "saw_blade",
  handTrauma: { affectedDigits: ["II"] },
};

const fractures: FractureEntry[] = [
  {
    id: "fx1",
    boneId: "mc2",
    boneName: "2nd metacarpal",
    aoCode: "77.2.2A",
    details: { familyCode: "77" },
  },
];

describe("stripStaleHandTraumaData", () => {
  it("strips handTrauma and fractures for elective hand groups, keeping laterality", () => {
    const result = stripStaleHandTraumaData({
      specialty: "hand_wrist",
      handCaseType: "elective",
      diagnosisClinicalDetails: traumaDetails,
      fractures,
    });
    expect(result.diagnosisClinicalDetails).toEqual({
      laterality: "left",
      injuryMechanism: "saw_blade",
    });
    expect(result.fractures).toBeUndefined();
  });

  it("strips for acute hand groups too", () => {
    const result = stripStaleHandTraumaData({
      specialty: "hand_wrist",
      handCaseType: "acute",
      diagnosisClinicalDetails: traumaDetails,
      fractures,
    });
    expect(result.diagnosisClinicalDetails?.handTrauma).toBeUndefined();
    expect(result.fractures).toBeUndefined();
  });

  it("collapses the details object to undefined when handTrauma was the only key", () => {
    const result = stripStaleHandTraumaData({
      specialty: "hand_wrist",
      handCaseType: "elective",
      diagnosisClinicalDetails: { handTrauma: { affectedDigits: ["II"] } },
      fractures: undefined,
    });
    expect(result.diagnosisClinicalDetails).toBeUndefined();
  });

  it("returns identical references for trauma case type", () => {
    const result = stripStaleHandTraumaData({
      specialty: "hand_wrist",
      handCaseType: "trauma",
      diagnosisClinicalDetails: traumaDetails,
      fractures,
    });
    expect(result.diagnosisClinicalDetails).toBe(traumaDetails);
    expect(result.fractures).toBe(fractures);
  });

  it("returns identical references for an undetermined (null) case type", () => {
    const result = stripStaleHandTraumaData({
      specialty: "hand_wrist",
      handCaseType: null,
      diagnosisClinicalDetails: traumaDetails,
      fractures,
    });
    expect(result.diagnosisClinicalDetails).toBe(traumaDetails);
    expect(result.fractures).toBe(fractures);
  });

  it("returns identical references for non-hand specialties", () => {
    const result = stripStaleHandTraumaData({
      specialty: "general",
      handCaseType: "elective",
      diagnosisClinicalDetails: traumaDetails,
      fractures,
    });
    expect(result.diagnosisClinicalDetails).toBe(traumaDetails);
    expect(result.fractures).toBe(fractures);
  });

  it("passes details through untouched when there is no handTrauma blob", () => {
    const details: DiagnosisClinicalDetails = { laterality: "right" };
    const result = stripStaleHandTraumaData({
      specialty: "hand_wrist",
      handCaseType: "elective",
      diagnosisClinicalDetails: details,
      fractures: undefined,
    });
    expect(result.diagnosisClinicalDetails).toBe(details);
    // fractures still forced off for non-trauma
    expect(result.fractures).toBeUndefined();
  });

  it("handles undefined details", () => {
    const result = stripStaleHandTraumaData({
      specialty: "hand_wrist",
      handCaseType: "elective",
      diagnosisClinicalDetails: undefined,
      fractures: undefined,
    });
    expect(result.diagnosisClinicalDetails).toBeUndefined();
    expect(result.fractures).toBeUndefined();
  });
});
