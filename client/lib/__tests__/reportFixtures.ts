import type { Case, CaseProcedure, DiagnosisGroup } from "@/types/case";

/**
 * Minimal Case fixtures for report-system tests. Mirrors the inline-object
 * pattern used across the export test suites, centralised because the
 * report tests span several files.
 */

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function makeProcedure(
  overrides: Partial<CaseProcedure> = {},
): CaseProcedure {
  return {
    id: nextId("proc"),
    sequenceOrder: 1,
    procedureName: "Test procedure",
    ...overrides,
  } as CaseProcedure;
}

export function makeGroup(
  overrides: Partial<DiagnosisGroup> = {},
): DiagnosisGroup {
  return {
    id: nextId("group"),
    sequenceOrder: 1,
    specialty: "hand_wrist",
    diagnosis: {
      displayName: "Test diagnosis",
      snomedCtCode: "123456",
    },
    procedures: [makeProcedure()],
    ...overrides,
  } as DiagnosisGroup;
}

export function makeCase(overrides: Partial<Case> = {}): Case {
  return {
    id: nextId("case"),
    patientIdentifier: "PAT-001",
    procedureDate: "2026-03-10",
    facility: "Test Hospital",
    specialty: "hand_wrist",
    procedureType: "test",
    diagnosisGroups: [makeGroup()],
    clinicalDetails: {},
    teamMembers: [],
    ownerId: "owner-1",
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
    ...overrides,
  } as Case;
}
