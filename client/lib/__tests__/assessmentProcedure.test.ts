import { describe, it, expect } from "vitest";
import {
  resolveAssessmentProcedure,
  UNKNOWN_PROCEDURE_REF,
} from "../assessmentProcedure";
import type { EpaAssessmentTarget } from "../epaDerivation";
import type { SharedCaseData } from "@/types/sharing";

const TARGET: EpaAssessmentTarget = {
  version: 3,
  supervisorContactId: "self",
  supervisorDisplayName: "You",
  supervisorLinkedUserId: "u-s",
  supervisorTier: 5,
  traineeContactId: "c-t",
  traineeDisplayName: "T",
  traineeLinkedUserId: "u-t",
  traineeTier: 3,
  units: [
    {
      procedureId: "p-micro",
      procedureSnomedCode: "MICRO",
      procedureDisplayName: "Microsurgery & inset",
      supervisorRole: "SS",
      traineeRole: "PS",
    },
    {
      procedureId: "p-2",
      procedureSnomedCode: "TWO",
      procedureDisplayName: "Second",
      supervisorRole: "SS",
      traineeRole: "PS",
    },
  ],
};

const BLOB = {
  diagnosisGroups: [
    {
      id: "g",
      diagnosis: { displayName: "Open fracture" },
      procedures: [
        { id: "p-first", procedureName: "Debridement", snomedCtCode: "DEB" },
      ],
    },
  ],
} as unknown as SharedCaseData;

describe("resolveAssessmentProcedure", () => {
  it("prefers the target's FIRST (PS) unit", () => {
    expect(resolveAssessmentProcedure(TARGET, BLOB)).toEqual({
      procedureSnomedCode: "MICRO",
      procedureDisplayName: "Microsurgery & inset",
      procedureId: "p-micro",
    });
  });

  it("falls back to the blob's first procedure without a target", () => {
    expect(resolveAssessmentProcedure(null, BLOB)).toEqual({
      procedureSnomedCode: "DEB",
      procedureDisplayName: "Debridement",
      procedureId: "p-first",
    });
  });

  it("falls back to the diagnosis name, then the neutral label", () => {
    const dxOnly = {
      diagnosisGroups: [{ id: "g", diagnosis: { displayName: "BCC" } }],
    } as unknown as SharedCaseData;
    expect(resolveAssessmentProcedure(null, dxOnly)).toEqual({
      procedureSnomedCode: "",
      procedureDisplayName: "BCC",
    });
    expect(resolveAssessmentProcedure(null, null)).toEqual(
      UNKNOWN_PROCEDURE_REF,
    );
    expect(resolveAssessmentProcedure(undefined, undefined)).toEqual(
      UNKNOWN_PROCEDURE_REF,
    );
  });
});
