import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Case, DiagnosisGroup, Specialty } from "@/types/case";

const asyncStorageState = new Map<string, string>();
const asyncStorageWrites: { key: string; value: string }[] = [];

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => asyncStorageState.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      asyncStorageState.set(key, value);
      asyncStorageWrites.push({ key, value });
    }),
    removeItem: vi.fn(async (key: string) => {
      asyncStorageState.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const key of keys) {
        asyncStorageState.delete(key);
      }
    }),
    getAllKeys: vi.fn(async () => [...asyncStorageState.keys()]),
  },
}));

vi.mock("react-native", () => ({
  InteractionManager: {
    runAfterInteractions: (callback: () => void) => {
      callback();
      return { cancel: vi.fn() };
    },
  },
}));

vi.mock("expo-crypto", () => ({
  digestStringAsync: vi.fn(async () => "patient-hash"),
  CryptoDigestAlgorithm: {
    SHA256: "sha256",
  },
  CryptoEncoding: {
    HEX: "hex",
  },
}));

vi.mock("@/lib/encryption", () => ({
  decryptData: vi.fn(async (value: string) => value),
  encryptData: vi.fn(async (value: string) => value),
}));

vi.mock("@/lib/mediaStorage", () => ({
  canonicalizePersistedMediaUris: vi.fn(async (value: unknown) => value),
  clearAllMediaStorage: vi.fn(async () => {}),
  deleteMultipleEncryptedMedia: vi.fn(async () => {}),
}));

const CASE_INDEX_KEY = "@surgical_logbook_case_index";
const CASE_PREFIX = "@surgical_logbook_case_";
const CASE_SPECIALTY_REPAIR_KEY = "@surgical_logbook_case_specialty_repair_v1";

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

async function loadStorageModule() {
  vi.resetModules();
  return import("@/lib/storage");
}

describe("stored case specialty repair", () => {
  beforeEach(() => {
    asyncStorageState.clear();
    asyncStorageWrites.length = 0;
  });

  it("repairs recoverable cases without changing timestamps or index metadata", async () => {
    const caseData = makeCase({
      id: "case-repair",
      specialty: "general",
      diagnosisGroups: [
        makeDiagnosisGroup("general", 2),
        makeDiagnosisGroup("hand_wrist", 1),
      ],
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-05T00:00:00Z",
    });
    const index = [
      {
        id: caseData.id,
        procedureDate: caseData.procedureDate,
        patientIdentifierHash: "patient-hash",
        updatedAt: caseData.updatedAt,
        episodeId: "episode-1",
        encounterClass: "outpatient",
      },
    ];

    asyncStorageState.set(CASE_INDEX_KEY, JSON.stringify(index));
    asyncStorageState.set(
      `${CASE_PREFIX}${caseData.id}`,
      JSON.stringify(caseData),
    );

    const { getCases } = await loadStorageModule();
    const cases = await getCases();

    expect(cases).toHaveLength(1);
    expect(cases[0]?.specialty).toBe("hand_wrist");

    const repairedStoredCase = JSON.parse(
      asyncStorageState.get(`${CASE_PREFIX}${caseData.id}`) ?? "{}",
    ) as Case;
    expect(repairedStoredCase.specialty).toBe("hand_wrist");
    expect(repairedStoredCase.createdAt).toBe(caseData.createdAt);
    expect(repairedStoredCase.updatedAt).toBe(caseData.updatedAt);
    expect(asyncStorageState.get(CASE_INDEX_KEY)).toBe(JSON.stringify(index));
    expect(asyncStorageState.get(CASE_SPECIALTY_REPAIR_KEY)).toBe("1");
  });

  it("marks repair complete so subsequent reads do not rewrite the same case", async () => {
    const caseData = makeCase({
      id: "case-once",
      specialty: "general",
      diagnosisGroups: [makeDiagnosisGroup("hand_wrist", 1)],
    });

    asyncStorageState.set(
      CASE_INDEX_KEY,
      JSON.stringify([
        {
          id: caseData.id,
          procedureDate: caseData.procedureDate,
          patientIdentifierHash: "patient-hash",
          updatedAt: caseData.updatedAt,
        },
      ]),
    );
    asyncStorageState.set(
      `${CASE_PREFIX}${caseData.id}`,
      JSON.stringify(caseData),
    );

    const { getCases } = await loadStorageModule();

    await getCases();
    const writesAfterFirstRead = asyncStorageWrites.filter(
      (write) => write.key === `${CASE_PREFIX}${caseData.id}`,
    ).length;

    await getCases();
    const writesAfterSecondRead = asyncStorageWrites.filter(
      (write) => write.key === `${CASE_PREFIX}${caseData.id}`,
    ).length;

    expect(writesAfterFirstRead).toBe(1);
    expect(writesAfterSecondRead).toBe(writesAfterFirstRead);
  });
});
