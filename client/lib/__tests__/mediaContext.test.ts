import { describe, expect, it } from "vitest";

import type { Case, DiagnosisGroup } from "@/types/case";
import {
  buildMediaContext,
  buildMediaContextFromCase,
} from "@/lib/mediaContext";
import {
  findProtocols,
  AESTHETIC_RHINOPLASTY_PROTOCOL,
} from "@/data/mediaCaptureProtocols";

function makeDiagnosisGroups(): DiagnosisGroup[] {
  return [
    {
      id: "group-1",
      sequenceOrder: 1,
      specialty: "aesthetics",
      diagnosisPicklistId: "aes_dx_nasal_cosmetic",
      procedures: [
        {
          id: "proc-1",
          sequenceOrder: 1,
          procedureName: "Rhinoplasty — open",
          specialty: "aesthetics",
          picklistEntryId: "aes_rhino_open",
          tags: ["cosmetic"],
          surgeonRole: "PS",
        },
      ],
      lesionInstances: [],
    },
    {
      id: "group-2",
      sequenceOrder: 2,
      specialty: "skin_cancer",
      diagnosisPicklistId: "sc_dx_bcc",
      procedures: [],
      skinCancerAssessment: {
        pathwayStage: "histology_known",
      },
    },
  ] as DiagnosisGroup[];
}

describe("mediaContext", () => {
  it("collects specialty, procedure tags, picklist IDs, and skin-cancer state", () => {
    const context = buildMediaContext({
      specialty: "aesthetics",
      procedureDate: "2026-01-01",
      diagnosisGroups: makeDiagnosisGroups(),
    });

    expect(context.specialty).toBe("aesthetics");
    expect(context.procedureDate).toBe("2026-01-01");
    expect(context.procedureTags).toEqual(["cosmetic"]);
    expect(context.procedurePicklistIds).toEqual(["aes_rhino_open"]);
    expect(context.diagnosisPicklistIds).toEqual([
      "aes_dx_nasal_cosmetic",
      "sc_dx_bcc",
    ]);
    expect(context.hasSkinCancerAssessment).toBe(true);
  });

  it("builds the same context from a Case object", () => {
    const caseData = {
      specialty: "aesthetics",
      procedureDate: "2026-01-01",
      diagnosisGroups: makeDiagnosisGroups(),
    } as Case;

    const context = buildMediaContextFromCase(caseData);
    expect(context.procedurePicklistIds).toEqual(["aes_rhino_open"]);
    expect(context.diagnosisPicklistIds).toContain("aes_dx_nasal_cosmetic");
  });

  it("activates the rhinoplasty protocol through derived case context", () => {
    const context = buildMediaContext({
      specialty: "aesthetics",
      procedureDate: "2026-01-01",
      diagnosisGroups: makeDiagnosisGroups(),
    });

    const protocols = findProtocols({
      specialties: context.specialty ? [context.specialty] : undefined,
      procedureTags: context.procedureTags,
      procedurePicklistIds: context.procedurePicklistIds,
      diagnosisPicklistIds: context.diagnosisPicklistIds,
      hasSkinCancerAssessment: context.hasSkinCancerAssessment,
    });

    expect(protocols).toContain(AESTHETIC_RHINOPLASTY_PROTOCOL);
  });
});
