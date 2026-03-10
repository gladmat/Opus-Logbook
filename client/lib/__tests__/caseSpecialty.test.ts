import { describe, expect, it } from "vitest";

import {
  inferRepairedCaseSpecialty,
  repairCaseSpecialty,
  resolveCaseFormSpecialty,
} from "@/lib/caseSpecialty";
import type { Case, DiagnosisGroup, Specialty } from "@/types/case";

function makeDiagnosisGroup(
  specialty: Specialty,
  sequenceOrder: number,
): DiagnosisGroup {
  return {
    id: `group-${specialty}-${sequenceOrder}`,
    sequenceOrder,
    specialty,
    procedures: [
      {
        id: `procedure-${specialty}-${sequenceOrder}`,
        sequenceOrder: 1,
        procedureName: `${specialty} procedure`,
        specialty,
        surgeonRole: "PS",
      },
    ],
  } as DiagnosisGroup;
}

function makeCase(overrides: Partial<Case> = {}): Case {
  const specialty = overrides.specialty ?? "general";

  return {
    id: overrides.id ?? "case-1",
    patientIdentifier: overrides.patientIdentifier ?? "TEST001",
    procedureDate: overrides.procedureDate ?? "2026-03-11",
    facility: overrides.facility ?? "Test Hospital",
    specialty,
    procedureType: overrides.procedureType ?? "Procedure",
    diagnosisGroups: overrides.diagnosisGroups ?? [
      makeDiagnosisGroup(specialty, 1),
    ],
    schemaVersion: overrides.schemaVersion ?? 5,
    createdAt: overrides.createdAt ?? "2026-03-11T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-03-11T00:00:00Z",
    ...overrides,
  } as Case;
}

describe("case specialty helpers", () => {
  it("prefers the loaded case specialty in edit mode", () => {
    expect(
      resolveCaseFormSpecialty({
        isEditMode: true,
        routeSpecialty: "general",
        existingCaseSpecialty: "hand_wrist",
      }),
    ).toBe("hand_wrist");
  });

  it("falls back through route, duplicate, then general for new cases", () => {
    expect(
      resolveCaseFormSpecialty({
        isEditMode: false,
        routeSpecialty: "orthoplastic",
      }),
    ).toBe("orthoplastic");

    expect(
      resolveCaseFormSpecialty({
        isEditMode: false,
        duplicateSpecialty: "peripheral_nerve",
      }),
    ).toBe("peripheral_nerve");

    expect(
      resolveCaseFormSpecialty({
        isEditMode: false,
      }),
    ).toBe("general");
  });

  it("repairs a general case when sequence-ordered diagnosis groups agree on one non-general specialty", () => {
    const caseData = makeCase({
      specialty: "general",
      diagnosisGroups: [
        makeDiagnosisGroup("general", 2),
        makeDiagnosisGroup("hand_wrist", 1),
      ],
    });

    expect(inferRepairedCaseSpecialty(caseData)).toBe("hand_wrist");
    expect(repairCaseSpecialty(caseData).specialty).toBe("hand_wrist");
  });

  it("leaves ambiguous mixed-specialty cases unchanged", () => {
    const caseData = makeCase({
      specialty: "general",
      diagnosisGroups: [
        makeDiagnosisGroup("hand_wrist", 1),
        makeDiagnosisGroup("orthoplastic", 2),
      ],
    });

    expect(inferRepairedCaseSpecialty(caseData)).toBeNull();
    expect(repairCaseSpecialty(caseData)).toBe(caseData);
  });

  it("does not touch already-correct non-general cases", () => {
    const caseData = makeCase({
      specialty: "hand_wrist",
      diagnosisGroups: [makeDiagnosisGroup("hand_wrist", 1)],
    });

    expect(inferRepairedCaseSpecialty(caseData)).toBeNull();
    expect(repairCaseSpecialty(caseData)).toBe(caseData);
  });
});
