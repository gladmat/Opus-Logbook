import { describe, it, expect } from "vitest";
import {
  migrateLegacyRole,
  toNearestLegacyRole,
  isLegacyRole,
  isOperativeRole,
  resolveOperativeRole,
  resolveSupervisionLevel,
  hasRoleOverride,
  formatRoleDisplay,
  supervisionApplicable,
  validSupervisionLevels,
  toRacsMaltPlastics,
  toRacsMaltJDocs,
  toUkElogbook,
  toAcgmeGeneralSurgery,
  toGermanWeiterbildung,
  toSwissSiwf,
  type OperativeRole,
  type SupervisionLevel,
} from "@/types/operativeRole";
import {
  isConsultantLevel,
  suggestRoleDefaults,
} from "@/lib/roleDefaults";

// ─── migrateLegacyRole ─────────────────────────────────────────────────────

describe("migrateLegacyRole", () => {
  it("maps PS → SURGEON + INDEPENDENT", () => {
    expect(migrateLegacyRole("PS")).toEqual({
      role: "SURGEON",
      supervision: "INDEPENDENT",
    });
  });

  it("maps PP → SURGEON + INDEPENDENT", () => {
    expect(migrateLegacyRole("PP")).toEqual({
      role: "SURGEON",
      supervision: "INDEPENDENT",
    });
  });

  it("maps AS → FIRST_ASST + NOT_APPLICABLE", () => {
    expect(migrateLegacyRole("AS")).toEqual({
      role: "FIRST_ASST",
      supervision: "NOT_APPLICABLE",
    });
  });

  it("maps ONS → OBSERVER + NOT_APPLICABLE", () => {
    expect(migrateLegacyRole("ONS")).toEqual({
      role: "OBSERVER",
      supervision: "NOT_APPLICABLE",
    });
  });

  it("maps SS → SUPERVISOR + NOT_APPLICABLE", () => {
    expect(migrateLegacyRole("SS")).toEqual({
      role: "SUPERVISOR",
      supervision: "NOT_APPLICABLE",
    });
  });

  it("maps SNS → SUPERVISOR + NOT_APPLICABLE", () => {
    expect(migrateLegacyRole("SNS")).toEqual({
      role: "SUPERVISOR",
      supervision: "NOT_APPLICABLE",
    });
  });

  it("maps A → OBSERVER + NOT_APPLICABLE", () => {
    expect(migrateLegacyRole("A")).toEqual({
      role: "OBSERVER",
      supervision: "NOT_APPLICABLE",
    });
  });
});

// ─── toNearestLegacyRole ────────────────────────────────────────────────────

describe("toNearestLegacyRole", () => {
  it("SURGEON + INDEPENDENT → PS", () => {
    expect(toNearestLegacyRole("SURGEON", "INDEPENDENT")).toBe("PS");
  });

  it("SURGEON + SUP_SCRUBBED → PS", () => {
    expect(toNearestLegacyRole("SURGEON", "SUP_SCRUBBED")).toBe("PS");
  });

  it("FIRST_ASST → AS", () => {
    expect(toNearestLegacyRole("FIRST_ASST", "NOT_APPLICABLE")).toBe("AS");
  });

  it("SECOND_ASST → AS", () => {
    expect(toNearestLegacyRole("SECOND_ASST", "NOT_APPLICABLE")).toBe("AS");
  });

  it("OBSERVER → ONS", () => {
    expect(toNearestLegacyRole("OBSERVER", "NOT_APPLICABLE")).toBe("ONS");
  });

  it("SUPERVISOR unscrubbed → SNS", () => {
    expect(toNearestLegacyRole("SUPERVISOR", "NOT_APPLICABLE")).toBe("SNS");
  });

  it("SUPERVISOR scrubbed → SS", () => {
    expect(toNearestLegacyRole("SUPERVISOR", "SUP_SCRUBBED")).toBe("SS");
  });
});

// ─── isLegacyRole / isOperativeRole ─────────────────────────────────────────

describe("isLegacyRole", () => {
  it("detects legacy codes", () => {
    expect(isLegacyRole("PS")).toBe(true);
    expect(isLegacyRole("SS")).toBe(true);
    expect(isLegacyRole("A")).toBe(true);
  });

  it("rejects new codes", () => {
    expect(isLegacyRole("SURGEON")).toBe(false);
    expect(isLegacyRole("random")).toBe(false);
  });
});

describe("isOperativeRole", () => {
  it("detects new codes", () => {
    expect(isOperativeRole("SURGEON")).toBe(true);
    expect(isOperativeRole("FIRST_ASST")).toBe(true);
    expect(isOperativeRole("SUPERVISOR")).toBe(true);
  });

  it("rejects legacy codes", () => {
    expect(isOperativeRole("PS")).toBe(false);
    expect(isOperativeRole("SS")).toBe(false);
  });
});

// ─── resolveOperativeRole ───────────────────────────────────────────────────

describe("resolveOperativeRole", () => {
  it("returns override when present", () => {
    expect(resolveOperativeRole("FIRST_ASST", "SURGEON")).toBe("FIRST_ASST");
  });

  it("falls back to case default when no override", () => {
    expect(resolveOperativeRole(undefined, "OBSERVER")).toBe("OBSERVER");
  });

  it("falls back to SURGEON when neither set", () => {
    expect(resolveOperativeRole(undefined, undefined)).toBe("SURGEON");
  });
});

// ─── resolveSupervisionLevel ────────────────────────────────────────────────

describe("resolveSupervisionLevel", () => {
  it("returns override when present for SURGEON", () => {
    expect(
      resolveSupervisionLevel("SUP_SCRUBBED", "INDEPENDENT", "SURGEON"),
    ).toBe("SUP_SCRUBBED");
  });

  it("falls back to case default for SURGEON", () => {
    expect(
      resolveSupervisionLevel(undefined, "SUP_PRESENT", "SURGEON"),
    ).toBe("SUP_PRESENT");
  });

  it("falls back to INDEPENDENT for SURGEON when neither set", () => {
    expect(resolveSupervisionLevel(undefined, undefined, "SURGEON")).toBe(
      "INDEPENDENT",
    );
  });

  it("auto NOT_APPLICABLE for non-SURGEON roles", () => {
    expect(
      resolveSupervisionLevel("SUP_SCRUBBED", "INDEPENDENT", "FIRST_ASST"),
    ).toBe("NOT_APPLICABLE");
    expect(
      resolveSupervisionLevel(undefined, undefined, "OBSERVER"),
    ).toBe("NOT_APPLICABLE");
  });
});

// ─── hasRoleOverride ────────────────────────────────────────────────────────

describe("hasRoleOverride", () => {
  it("returns false when no overrides", () => {
    expect(hasRoleOverride({})).toBe(false);
  });

  it("detects role override", () => {
    expect(hasRoleOverride({ operativeRoleOverride: "FIRST_ASST" })).toBe(
      true,
    );
  });

  it("detects supervision override", () => {
    expect(
      hasRoleOverride({ supervisionLevelOverride: "SUP_SCRUBBED" }),
    ).toBe(true);
  });
});

// ─── formatRoleDisplay ──────────────────────────────────────────────────────

describe("formatRoleDisplay", () => {
  it("shows role + supervision for SURGEON", () => {
    expect(formatRoleDisplay("SURGEON", "INDEPENDENT")).toBe(
      "Surgeon · Independent",
    );
    expect(formatRoleDisplay("SURGEON", "SUP_SCRUBBED")).toBe(
      "Surgeon · Sup. scrubbed",
    );
  });

  it("shows only role label for non-SURGEON", () => {
    expect(formatRoleDisplay("FIRST_ASST", "NOT_APPLICABLE")).toBe("1st Asst");
    expect(formatRoleDisplay("OBSERVER", "NOT_APPLICABLE")).toBe("Observer");
    expect(formatRoleDisplay("SUPERVISOR", "NOT_APPLICABLE")).toBe(
      "Supervisor",
    );
  });
});

// ─── supervisionApplicable / validSupervisionLevels ─────────────────────────

describe("supervisionApplicable", () => {
  it("true only for SURGEON", () => {
    expect(supervisionApplicable("SURGEON")).toBe(true);
    expect(supervisionApplicable("FIRST_ASST")).toBe(false);
    expect(supervisionApplicable("OBSERVER")).toBe(false);
    expect(supervisionApplicable("SUPERVISOR")).toBe(false);
  });
});

describe("validSupervisionLevels", () => {
  it("returns 5 levels for SURGEON (excludes NOT_APPLICABLE)", () => {
    const levels = validSupervisionLevels("SURGEON");
    expect(levels).toHaveLength(5);
    expect(levels).not.toContain("NOT_APPLICABLE");
  });

  it("returns only NOT_APPLICABLE for non-SURGEON", () => {
    expect(validSupervisionLevels("FIRST_ASST")).toEqual(["NOT_APPLICABLE"]);
    expect(validSupervisionLevels("OBSERVER")).toEqual(["NOT_APPLICABLE"]);
  });
});

// ─── suggestRoleDefaults ────────────────────────────────────────────────────

describe("suggestRoleDefaults", () => {
  it("consultant_specialist → SURGEON + INDEPENDENT", () => {
    expect(
      suggestRoleDefaults({ careerStage: "consultant_specialist" }),
    ).toEqual({ role: "SURGEON", supervision: "INDEPENDENT" });
  });

  it("fellow → SURGEON + INDEPENDENT", () => {
    expect(suggestRoleDefaults({ careerStage: "fellow" })).toEqual({
      role: "SURGEON",
      supervision: "INDEPENDENT",
    });
  });

  it("moss → SURGEON + INDEPENDENT", () => {
    expect(suggestRoleDefaults({ careerStage: "moss" })).toEqual({
      role: "SURGEON",
      supervision: "INDEPENDENT",
    });
  });

  it("set_trainee → SURGEON + SUP_SCRUBBED", () => {
    expect(suggestRoleDefaults({ careerStage: "set_trainee" })).toEqual({
      role: "SURGEON",
      supervision: "SUP_SCRUBBED",
    });
  });

  it("null profile → SURGEON + INDEPENDENT", () => {
    expect(suggestRoleDefaults(null)).toEqual({
      role: "SURGEON",
      supervision: "INDEPENDENT",
    });
  });
});

// ─── isConsultantLevel ──────────────────────────────────────────────────────

describe("isConsultantLevel", () => {
  it("recognizes consultant stages", () => {
    expect(isConsultantLevel("consultant_specialist")).toBe(true);
    expect(isConsultantLevel("fellow")).toBe(true);
    expect(isConsultantLevel("moss")).toBe(true);
  });

  it("rejects trainee stages", () => {
    expect(isConsultantLevel("set_trainee")).toBe(false);
    expect(isConsultantLevel("registrar")).toBe(false);
  });

  it("handles null/undefined", () => {
    expect(isConsultantLevel(null)).toBe(false);
    expect(isConsultantLevel(undefined)).toBe(false);
  });
});

// ─── Export mappings ────────────────────────────────────────────────────────

describe("toRacsMaltPlastics", () => {
  it("SURGEON + INDEPENDENT → Surgeon alone", () => {
    expect(toRacsMaltPlastics("SURGEON", "INDEPENDENT")).toBe("Surgeon alone");
  });

  it("SURGEON + SUP_SCRUBBED → Mentor scrubbed", () => {
    expect(toRacsMaltPlastics("SURGEON", "SUP_SCRUBBED")).toBe(
      "Mentor scrubbed",
    );
  });

  it("SURGEON + SUP_PRESENT → Mentor available", () => {
    expect(toRacsMaltPlastics("SURGEON", "SUP_PRESENT")).toBe(
      "Mentor available",
    );
  });

  it("FIRST_ASST → Assistant", () => {
    expect(toRacsMaltPlastics("FIRST_ASST", "NOT_APPLICABLE")).toBe(
      "Assistant",
    );
  });

  it("OBSERVER → Observer", () => {
    expect(toRacsMaltPlastics("OBSERVER", "NOT_APPLICABLE")).toBe("Observer");
  });

  it("SUPERVISOR → Surgeon alone", () => {
    expect(toRacsMaltPlastics("SUPERVISOR", "NOT_APPLICABLE")).toBe(
      "Surgeon alone",
    );
  });
});

describe("toRacsMaltJDocs", () => {
  it("SURGEON + INDEPENDENT → Independent", () => {
    expect(toRacsMaltJDocs("SURGEON", "INDEPENDENT")).toBe("Independent");
  });

  it("SURGEON + SUP_SCRUBBED → Supervised", () => {
    expect(toRacsMaltJDocs("SURGEON", "SUP_SCRUBBED")).toBe("Supervised");
  });

  it("FIRST_ASST → 1st Assistant", () => {
    expect(toRacsMaltJDocs("FIRST_ASST", "NOT_APPLICABLE")).toBe(
      "1st Assistant",
    );
  });

  it("OBSERVER → Observed", () => {
    expect(toRacsMaltJDocs("OBSERVER", "NOT_APPLICABLE")).toBe("Observed");
  });
});

describe("toUkElogbook", () => {
  it("SURGEON + INDEPENDENT → P", () => {
    expect(toUkElogbook("SURGEON", "INDEPENDENT")).toBe("P");
  });

  it("SURGEON + SUP_SCRUBBED → S-TS", () => {
    expect(toUkElogbook("SURGEON", "SUP_SCRUBBED")).toBe("S-TS");
  });

  it("SURGEON + SUP_PRESENT → S-TU", () => {
    expect(toUkElogbook("SURGEON", "SUP_PRESENT")).toBe("S-TU");
  });

  it("FIRST_ASST → A", () => {
    expect(toUkElogbook("FIRST_ASST", "NOT_APPLICABLE")).toBe("A");
  });

  it("OBSERVER → O", () => {
    expect(toUkElogbook("OBSERVER", "NOT_APPLICABLE")).toBe("O");
  });

  it("SUPERVISOR → T", () => {
    expect(toUkElogbook("SUPERVISOR", "NOT_APPLICABLE")).toBe("T");
  });
});

describe("toAcgmeGeneralSurgery", () => {
  it("SURGEON (senior) → SC", () => {
    expect(toAcgmeGeneralSurgery("SURGEON", "INDEPENDENT", true)).toBe("SC");
  });

  it("SURGEON (junior) → SJ", () => {
    expect(toAcgmeGeneralSurgery("SURGEON", "INDEPENDENT", false)).toBe("SJ");
  });

  it("FIRST_ASST → FA", () => {
    expect(toAcgmeGeneralSurgery("FIRST_ASST", "NOT_APPLICABLE")).toBe("FA");
  });

  it("SUPERVISOR → TA", () => {
    expect(toAcgmeGeneralSurgery("SUPERVISOR", "NOT_APPLICABLE")).toBe("TA");
  });
});

describe("toGermanWeiterbildung", () => {
  it("SURGEON + INDEPENDENT → Selbstverantwortlich", () => {
    expect(toGermanWeiterbildung("SURGEON", "INDEPENDENT")).toBe(
      "Selbstverantwortlich",
    );
  });

  it("SURGEON + SUP_SCRUBBED → Unter Anleitung", () => {
    expect(toGermanWeiterbildung("SURGEON", "SUP_SCRUBBED")).toBe(
      "Unter Anleitung",
    );
  });

  it("FIRST_ASST → Assistiert", () => {
    expect(toGermanWeiterbildung("FIRST_ASST", "NOT_APPLICABLE")).toBe(
      "Assistiert",
    );
  });
});

describe("toSwissSiwf", () => {
  it("SURGEON + INDEPENDENT → O", () => {
    expect(toSwissSiwf("SURGEON", "INDEPENDENT")).toBe("O");
  });

  it("SURGEON + SUP_SCRUBBED → AI", () => {
    expect(toSwissSiwf("SURGEON", "SUP_SCRUBBED")).toBe("AI");
  });

  it("FIRST_ASST → A", () => {
    expect(toSwissSiwf("FIRST_ASST", "NOT_APPLICABLE")).toBe("A");
  });

  it("SUPERVISOR → O", () => {
    expect(toSwissSiwf("SUPERVISOR", "NOT_APPLICABLE")).toBe("O");
  });
});
