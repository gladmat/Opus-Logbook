import { describe, expect, it } from "vitest";
import type { UserProfile } from "@/lib/auth";
import {
  getReportDefinition,
  getReportsByCategory,
  REPORT_DEFINITIONS,
  suggestReportForProfile,
} from "@/lib/reports/registry";

function profileWith(overrides: {
  trainingProgramme?: string | null;
  countryOfPractice?: string | null;
}): UserProfile {
  return {
    countryOfPractice: overrides.countryOfPractice ?? null,
    careerStage: null,
    surgicalPreferences: {
      personalization: {
        trainingProgramme: overrides.trainingProgramme ?? null,
      },
    },
  } as unknown as UserProfile;
}

describe("report registry", () => {
  it("has unique report ids", () => {
    const ids = REPORT_DEFINITIONS.map((def) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves definitions by id and returns undefined for unknown ids", () => {
    expect(getReportDefinition("racs_malt_plastics")?.title).toBe(
      "RACS MALT (Plastics)",
    );
    expect(getReportDefinition("nope")).toBeUndefined();
  });

  it("groups by category with every definition covered", () => {
    const grouped = [
      ...getReportsByCategory("training-body"),
      ...getReportsByCategory("registry"),
      ...getReportsByCategory("audit"),
    ];
    expect(grouped.length).toBe(REPORT_DEFINITIONS.length);
  });

  it("every pdfTableColumn and roleSummaryColumn references a real column key", () => {
    for (const def of REPORT_DEFINITIONS) {
      const keys = new Set(def.columns.map((col) => col.key));
      for (const key of def.pdfTableColumns) {
        expect(keys.has(key), `${def.id} pdfTableColumns → ${key}`).toBe(true);
      }
      if (def.roleSummaryColumn) {
        expect(
          keys.has(def.roleSummaryColumn),
          `${def.id} roleSummaryColumn → ${def.roleSummaryColumn}`,
        ).toBe(true);
      }
    }
  });

  it("training-body reports default identifiers off; registries default on", () => {
    for (const def of REPORT_DEFINITIONS) {
      if (def.category === "training-body") {
        expect(def.defaultIncludePatientId, def.id).toBe(false);
      } else {
        expect(def.defaultIncludePatientId, def.id).toBe(true);
      }
    }
  });
});

describe("suggestReportForProfile", () => {
  it("keys off the training programme first", () => {
    expect(
      suggestReportForProfile(profileWith({ trainingProgramme: "racs" })).id,
    ).toBe("racs_malt_plastics");
    expect(
      suggestReportForProfile(profileWith({ trainingProgramme: "iscp" })).id,
    ).toBe("uk_elogbook");
    expect(
      suggestReportForProfile(profileWith({ trainingProgramme: "acgme" })).id,
    ).toBe("acgme_case_log");
    expect(
      suggestReportForProfile(profileWith({ trainingProgramme: "febopras" }))
        .id,
    ).toBe("ebopras_log");
  });

  it("falls back to country of practice", () => {
    expect(
      suggestReportForProfile(profileWith({ countryOfPractice: "new_zealand" }))
        .id,
    ).toBe("racs_malt_plastics");
    expect(
      suggestReportForProfile(profileWith({ countryOfPractice: "germany" })).id,
    ).toBe("german_weiterbildung");
    expect(
      suggestReportForProfile(profileWith({ countryOfPractice: "switzerland" }))
        .id,
    ).toBe("swiss_siwf");
    expect(
      suggestReportForProfile(
        profileWith({ countryOfPractice: "united_states" }),
      ).id,
    ).toBe("acgme_case_log");
  });

  it("training programme wins over country", () => {
    expect(
      suggestReportForProfile(
        profileWith({
          trainingProgramme: "iscp",
          countryOfPractice: "new_zealand",
        }),
      ).id,
    ).toBe("uk_elogbook");
  });

  it("returns the first definition for a null profile", () => {
    expect(suggestReportForProfile(null).id).toBe(REPORT_DEFINITIONS[0]?.id);
  });
});
