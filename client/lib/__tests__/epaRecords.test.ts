import { describe, expect, it } from "vitest";

import type { EpaAssessmentTarget, EpaExposureRecord } from "../epaDerivation";
import { splitEpaRecords } from "../epaRecords";

const target = { version: 3 } as unknown as EpaAssessmentTarget;
const exposure = {
  participantContactId: "self",
} as unknown as EpaExposureRecord;

describe("splitEpaRecords", () => {
  it("drops empty sides and keeps per-case grouping + order", () => {
    const out = splitEpaRecords([
      { caseId: "a", targets: [target], exposures: [] },
      { caseId: "b", targets: [], exposures: [exposure] },
      { caseId: "c", targets: [target, target], exposures: [exposure] },
    ]);
    expect(out.targetsByCase.map((t) => t.caseId)).toEqual(["a", "c"]);
    expect(out.targetsByCase[1]?.targets).toHaveLength(2);
    expect(out.exposuresByCase.map((e) => e.caseId)).toEqual(["b", "c"]);
  });

  it("returns two empty lists for no records", () => {
    expect(splitEpaRecords([])).toEqual({
      targetsByCase: [],
      exposuresByCase: [],
    });
  });
});
