/**
 * caseSummaryFields — refactor guard: the derivation extracted from
 * storage.buildCaseSummary must produce the same values for a local Case,
 * and must work on a bare { diagnosisGroups } source (share blobs).
 */
import { describe, it, expect } from "vitest";
import type { Case, DiagnosisGroup } from "@/types/case";
import { getAllProcedures, getPrimarySiteLabel } from "@/types/case";
import { getCasePrimaryTitle } from "@/lib/caseDiagnosisSummary";
import {
  buildSearchableText,
  deriveCaseSummaryFields,
  hasSevereHandInfectionInGroups,
  resolveSkinCancerBadgeFromGroups,
} from "@/lib/caseSummaryFields";

const groups: DiagnosisGroup[] = [
  {
    id: "g1",
    sequenceOrder: 1,
    specialty: "skin_cancer",
    diagnosis: { snomedCode: "1", displayName: "BCC" },
    diagnosisClinicalDetails: { laterality: "right" },
    lesionInstances: [{ id: "l1", site: "nose" }],
    procedures: [
      {
        id: "p1",
        sequenceOrder: 1,
        procedureName: "Excision",
        specialty: "skin_cancer",
        surgeonRole: "PS",
      },
      {
        id: "p2",
        sequenceOrder: 2,
        procedureName: "FTSG",
        specialty: "skin_cancer",
        surgeonRole: "PS",
      },
    ],
    handInfectionDetails: {
      severity: "spreading",
      escalatedToFullModule: false,
    },
  } as unknown as DiagnosisGroup,
];

const caseData = {
  id: "c1",
  patientIdentifier: "P1",
  procedureDate: "2026-09-01",
  facility: "F",
  specialty: "skin_cancer",
  procedureType: "Fallback",
  diagnosisGroups: groups,
  teamMembers: [],
  schemaVersion: 5,
  createdAt: "x",
  updatedAt: "x",
} as unknown as Case;

describe("deriveCaseSummaryFields", () => {
  it("matches the individual helpers on a full Case", () => {
    const f = deriveCaseSummaryFields(caseData);
    expect(f.diagnosisTitle).toBe(getCasePrimaryTitle(caseData));
    expect(f.primaryProcedureName).toBe(
      getAllProcedures(caseData)[0]!.procedureName,
    );
    expect(f.procedureNames).toEqual(["Excision", "FTSG"]);
    expect(f.siteLabel).toBe(getPrimarySiteLabel(caseData));
    expect(f.siteLabel).toBe("Right nose");
    expect(f.hasSevereHandInfection).toBe(true);
    expect(f.skinCancerBadgeLabel).toBe(
      resolveSkinCancerBadgeFromGroups(groups)?.label,
    );
  });

  it("works on a bare diagnosis-group source (share blob shape)", () => {
    const f = deriveCaseSummaryFields({ diagnosisGroups: groups });
    expect(f.diagnosisTitle).toBe(getCasePrimaryTitle(caseData));
    expect(f.primaryProcedureName).toBe("Excision");
  });

  it("falls back to procedureType and tolerates missing groups", () => {
    const f = deriveCaseSummaryFields({ procedureType: "Manual" });
    expect(f.diagnosisTitle).toBe("Manual");
    expect(f.primaryProcedureName).toBe("Manual");
    expect(f.procedureNames).toEqual([]);
    expect(f.siteLabel).toBeUndefined();
    expect(f.hasSevereHandInfection).toBe(false);
    expect(hasSevereHandInfectionInGroups(undefined)).toBe(false);
  });

  it("buildSearchableText lower-cases and drops blanks", () => {
    expect(buildSearchableText(["A", undefined, "b C", null, ""])).toBe(
      "a b c",
    );
  });
});
