import { describe, expect, it } from "vitest";
import type { Case } from "@/types/case";
import type { UserProfile } from "@/lib/auth";
import { buildReportRows } from "@/lib/reports/engine";
import type { ReportDefinition } from "@/lib/reports/types";
import {
  racsMaltPlasticsReport,
  racsJdocsReport,
} from "@/lib/reports/definitions/racsMalt";
import { ukElogbookReport } from "@/lib/reports/definitions/ukElogbook";
import { acgmeCaseLogReport } from "@/lib/reports/definitions/acgme";
import { germanWeiterbildungReport } from "@/lib/reports/definitions/germanWb";
import { swissSiwfReport } from "@/lib/reports/definitions/swissSiwf";
import {
  eboprasLogReport,
  toEboprasRole,
} from "@/lib/reports/definitions/ebopras";
import { makeCase, makeGroup, makeProcedure } from "./reportFixtures";

/**
 * Canonical role matrix: a single case whose procedures span the role /
 * supervision combinations every training-body report must code.
 */
function roleMatrixCase(): Case {
  return makeCase({
    defaultOperativeRole: "SURGEON",
    defaultSupervisionLevel: "INDEPENDENT",
    diagnosisGroups: [
      makeGroup({
        procedures: [
          makeProcedure({ supervisionLevelOverride: "INDEPENDENT" }),
          makeProcedure({ supervisionLevelOverride: "SUP_AVAILABLE" }),
          makeProcedure({ supervisionLevelOverride: "SUP_PRESENT" }),
          makeProcedure({ supervisionLevelOverride: "SUP_SCRUBBED" }),
          makeProcedure({ supervisionLevelOverride: "DIRECTED" }),
          makeProcedure({ operativeRoleOverride: "FIRST_ASST" }),
          makeProcedure({ operativeRoleOverride: "SECOND_ASST" }),
          makeProcedure({ operativeRoleOverride: "OBSERVER" }),
          makeProcedure({ operativeRoleOverride: "SUPERVISOR" }),
        ],
      }),
    ],
  });
}

function roleCodes(
  def: ReportDefinition,
  roleKey: string,
  profile: UserProfile | null = null,
): unknown[] {
  const result = buildReportRows(def, [roleMatrixCase()], profile, {
    includePatientId: false,
  });
  const idx = result.columnKeys.indexOf(roleKey);
  expect(idx).toBeGreaterThanOrEqual(0);
  return result.rows.map((r) => r[idx]);
}

describe("training-body role coding", () => {
  it("RACS MALT Plastics codes the full role matrix", () => {
    expect(roleCodes(racsMaltPlasticsReport, "malt_supervision")).toEqual([
      "Surgeon alone",
      "Surgeon alone",
      "Mentor available",
      "Mentor scrubbed",
      "Mentor scrubbed",
      "Assistant",
      "Assistant",
      "Observer",
      "Surgeon alone",
    ]);
  });

  it("RACS JDocs codes the full role matrix", () => {
    expect(roleCodes(racsJdocsReport, "jdocs_role")).toEqual([
      "Independent",
      "Independent",
      "Supervised",
      "Supervised",
      "Supervised",
      "1st Assistant",
      "2nd Assistant",
      "Observed",
      "Independent",
    ]);
  });

  it("UK eLogbook codes the full role matrix", () => {
    expect(roleCodes(ukElogbookReport, "supervision_code")).toEqual([
      "P",
      "P",
      "S-TU",
      "S-TS",
      "S-TS",
      "A",
      "A",
      "O",
      "T",
    ]);
  });

  it("German Weiterbildung codes the full role matrix", () => {
    expect(roleCodes(germanWeiterbildungReport, "taetigkeit")).toEqual([
      "Selbstverantwortlich",
      "Selbstverantwortlich",
      "Unter Anleitung",
      "Unter Anleitung",
      "Unter Anleitung",
      "Assistiert",
      "Assistiert",
      "Assistiert",
      "Selbstverantwortlich",
    ]);
  });

  it("Swiss SIWF codes the full role matrix", () => {
    expect(roleCodes(swissSiwfReport, "siwf_status")).toEqual([
      "O",
      "O",
      "AI",
      "AI",
      "AI",
      "A",
      "A",
      "A",
      "O",
    ]);
  });

  it("EBOPRAS provisional mapper codes the full role matrix", () => {
    expect(roleCodes(eboprasLogReport, "ebopras_role")).toEqual([
      "Operator",
      "Operator",
      "Operator (supervised)",
      "Operator (supervised)",
      "Operator (supervised)",
      "Assistant",
      "Assistant",
      "Observer",
      "Supervising surgeon",
    ]);
    expect(toEboprasRole("SURGEON", "DIRECTED")).toBe("Operator (supervised)");
  });
});

describe("ACGME seniority branch", () => {
  const seniorProfile = { careerStage: "us_resident_senior" } as UserProfile;
  const juniorProfile = { careerStage: "us_resident_junior" } as UserProfile;

  it("codes surgeon rows SC for senior residents and SJ for junior residents", () => {
    expect(roleCodes(acgmeCaseLogReport, "acgme_role", seniorProfile)[0]).toBe(
      "SC",
    );
    expect(roleCodes(acgmeCaseLogReport, "acgme_role", juniorProfile)[0]).toBe(
      "SJ",
    );
  });

  it("falls back to senior when career stage is unknown", () => {
    expect(roleCodes(acgmeCaseLogReport, "acgme_role", null)[0]).toBe("SC");
  });

  it("codes assistant and supervisor rows independent of seniority", () => {
    const codes = roleCodes(acgmeCaseLogReport, "acgme_role", juniorProfile);
    expect(codes[5]).toBe("FA");
    expect(codes[8]).toBe("TA");
  });
});

describe("RACS MALT audit block", () => {
  it("extracts the 30-day audit fields onto every procedure row", () => {
    const c = makeCase({
      unplannedReadmission: "infection",
      returnToTheatre: true,
      returnToTheatreReason: "Washout",
      unplannedICU: "generalised_sepsis",
      outcome: "discharged_home",
      mortalityClassification: "not_applicable",
      complicationsReviewed: true,
      hasComplications: true,
      complications: [
        { id: "comp-1", description: "Seroma", clavienDindoGrade: "I" },
        { id: "comp-2", description: "Reoperation", clavienDindoGrade: "IIIb" },
      ],
      diagnosisGroups: [
        makeGroup({ procedures: [makeProcedure(), makeProcedure()] }),
      ],
    });
    const result = buildReportRows(racsMaltPlasticsReport, [c], null, {
      includePatientId: false,
    });
    const get = (key: string, rowIdx: number) =>
      result.rows[rowIdx]?.[result.columnKeys.indexOf(key)];

    for (const rowIdx of [0, 1]) {
      expect(get("unplanned_readmission", rowIdx)).toBe("Yes - Infection");
      expect(get("return_to_theatre", rowIdx)).toBe("Yes");
      expect(get("return_to_theatre_reason", rowIdx)).toBe("Washout");
      expect(get("max_clavien_dindo", rowIdx)).toBe(
        "Grade IIIb - Intervention under GA",
      );
      expect(get("discharge_outcome", rowIdx)).toBe("Discharged Home");
      expect(get("complications_reviewed", rowIdx)).toBe("Yes");
    }
  });

  it("leaves audit fields blank when unrecorded", () => {
    const result = buildReportRows(racsMaltPlasticsReport, [makeCase()], null, {
      includePatientId: false,
    });
    for (const key of [
      "unplanned_readmission",
      "return_to_theatre",
      "max_clavien_dindo",
      "discharge_outcome",
      "complications_reviewed",
    ]) {
      expect(result.rows[0]?.[result.columnKeys.indexOf(key)]).toBe("");
    }
  });
});

describe("header layouts (lock column order per report)", () => {
  const CORE_KEYS = [
    "procedure_date",
    "facility",
    "specialty",
    "patient_identifier",
    "patient_age",
    "patient_gender",
    "diagnosis_name",
    "diagnosis_snomed",
    "procedure_name",
    "procedure_snomed",
    "laterality",
    "responsible_consultant",
  ];

  const expectedKeys: Record<string, string[]> = {
    racs_malt_plastics: [
      ...CORE_KEYS,
      "malt_supervision",
      "admission_urgency",
      "stay_type",
      "asa_score",
      "unplanned_readmission",
      "return_to_theatre",
      "return_to_theatre_reason",
      "unplanned_icu",
      "max_clavien_dindo",
      "discharge_outcome",
      "mortality_classification",
      "complications_reviewed",
    ],
    racs_jdocs: [...CORE_KEYS, "jdocs_role", "admission_urgency"],
    uk_elogbook: [
      ...CORE_KEYS,
      "supervision_code",
      "admission_type",
      "anaesthetic_type",
      "complications_flag",
      "notes",
    ],
    acgme_case_log: [...CORE_KEYS, "acgme_role", "attending", "institution"],
    german_weiterbildung: [...CORE_KEYS, "taetigkeit", "ops_code"],
    swiss_siwf: [...CORE_KEYS, "siwf_status"],
    ebopras_log: [...CORE_KEYS, "ebopras_role", "ebopras_category"],
  };

  for (const def of [
    racsMaltPlasticsReport,
    racsJdocsReport,
    ukElogbookReport,
    acgmeCaseLogReport,
    germanWeiterbildungReport,
    swissSiwfReport,
    eboprasLogReport,
  ]) {
    it(`${def.id} column keys are stable`, () => {
      expect(def.columns.map((c) => c.key)).toEqual(expectedKeys[def.id]);
    });
  }
});
