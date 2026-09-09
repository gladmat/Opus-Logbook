import { describe, expect, it } from "vitest";
import {
  FLAP_HARVEST_SIDE_FIELD,
  getFlapWarnings,
} from "@/lib/caseFormFlapChecks";
import type { CaseProcedure, DiagnosisGroup } from "@/types/case";

function group(procedures: Partial<CaseProcedure>[]): DiagnosisGroup {
  return {
    id: "g1",
    specialty: "orthoplastic",
    procedures: procedures.map((p, i) => ({
      id: `p${i}`,
      procedureName: "Procedure",
      ...p,
    })) as CaseProcedure[],
  } as DiagnosisGroup;
}

describe("getFlapWarnings", () => {
  it("warns once per free-flap procedure with no harvest side", () => {
    const warnings = getFlapWarnings([
      group([
        {
          procedureName: "Free ALT flap",
          clinicalDetails: { flapType: "alt", anastomoses: [] },
        },
      ]),
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      field: FLAP_HARVEST_SIDE_FIELD,
      sectionId: "case",
    });
    expect(warnings[0]?.message).toContain("Harvest side not set");
    expect(warnings[0]?.message).toContain("ALT");
  });

  it("prefers the flap display name in the message", () => {
    const [w] = getFlapWarnings([
      group([
        {
          clinicalDetails: {
            flapType: "diep",
            flapDisplayName: "DIEP flap",
            anastomoses: [],
          },
        },
      ]),
    ]);
    expect(w?.message).toBe("Harvest side not set — DIEP flap");
  });

  it("is silent when the side is set", () => {
    expect(
      getFlapWarnings([
        group([
          {
            clinicalDetails: {
              flapType: "alt",
              harvestSide: "right",
              anastomoses: [],
            },
          },
        ]),
      ]),
    ).toEqual([]);
  });

  it("ignores non-flap procedures and procedures without details", () => {
    expect(
      getFlapWarnings([
        group([
          { clinicalDetails: undefined },
          { clinicalDetails: { basins: [], radioisotopeUsed: true } },
        ]),
      ]),
    ).toEqual([]);
  });

  it("handles groups with no procedures array", () => {
    expect(
      getFlapWarnings([{ id: "g", specialty: "general" } as DiagnosisGroup]),
    ).toEqual([]);
  });
});
