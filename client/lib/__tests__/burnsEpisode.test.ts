/**
 * Burns Phase 5 Tests — Episode helpers.
 */

import { describe, it, expect } from "vitest";
import {
  buildBurnEpisodeTitle,
  determineBurnInitialPendingAction,
  shouldSuggestEpisode,
  computeBurnEpisodeAggregate,
  extractBurnCaseSummary,
} from "../burnsEpisodeHelpers";
import type { BurnsAssessmentData } from "../../types/burns";

// ═══════════════════════════════════════════════════════════════════════════════
// buildBurnEpisodeTitle
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildBurnEpisodeTitle", () => {
  it("generates title with mechanism and TBSA", () => {
    const assessment: BurnsAssessmentData = {
      phase: "acute",
      tbsa: { totalTBSA: 25 },
      injuryEvent: { mechanism: "thermal" },
    };
    expect(buildBurnEpisodeTitle(assessment, "2026-03-15")).toBe(
      "Thermal burn — 25% TBSA — 2026-03-15",
    );
  });

  it("generates title without TBSA when not set", () => {
    const assessment: BurnsAssessmentData = {
      phase: "acute",
      injuryEvent: { mechanism: "chemical" },
    };
    expect(buildBurnEpisodeTitle(assessment)).toBe("Chemical burn");
  });

  it("falls back to generic when no mechanism", () => {
    const assessment: BurnsAssessmentData = {
      phase: "acute",
      tbsa: { totalTBSA: 10 },
    };
    expect(buildBurnEpisodeTitle(assessment)).toBe("Burn — 10% TBSA");
  });

  it("omits zero TBSA", () => {
    const assessment: BurnsAssessmentData = {
      phase: "acute",
      tbsa: { totalTBSA: 0 },
      injuryEvent: { mechanism: "electrical" },
    };
    expect(buildBurnEpisodeTitle(assessment)).toBe("Electrical burn");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// determineBurnInitialPendingAction
// ═══════════════════════════════════════════════════════════════════════════════

describe("determineBurnInitialPendingAction", () => {
  it("returns npwt_in_progress when NPWT procedure present", () => {
    const assessment: BurnsAssessmentData = { phase: "acute", tbsa: { totalTBSA: 20 } };
    expect(
      determineBurnInitialPendingAction(assessment, ["burns_acute_npwt"]),
    ).toBe("npwt_in_progress");
  });

  it("returns awaiting_grafting when excision without graft", () => {
    const assessment: BurnsAssessmentData = { phase: "acute", tbsa: { totalTBSA: 15 } };
    expect(
      determineBurnInitialPendingAction(assessment, [
        "burns_acute_tangential_excision",
      ]),
    ).toBe("awaiting_grafting");
  });

  it("returns staged_procedure_planned for major burn >20%", () => {
    const assessment: BurnsAssessmentData = { phase: "acute", tbsa: { totalTBSA: 30 } };
    expect(
      determineBurnInitialPendingAction(assessment, [
        "burns_acute_tangential_excision",
        "burns_graft_stsg_meshed",
      ]),
    ).toBe("staged_procedure_planned");
  });

  it("returns wound_healing for grafted smaller burns", () => {
    const assessment: BurnsAssessmentData = { phase: "acute", tbsa: { totalTBSA: 10 } };
    expect(
      determineBurnInitialPendingAction(assessment, [
        "burns_graft_stsg_meshed",
      ]),
    ).toBe("wound_healing");
  });

  it("returns null when no procedures", () => {
    const assessment: BurnsAssessmentData = { phase: "acute", tbsa: { totalTBSA: 5 } };
    expect(determineBurnInitialPendingAction(assessment, [])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// shouldSuggestEpisode
// ═══════════════════════════════════════════════════════════════════════════════

describe("shouldSuggestEpisode", () => {
  it("returns true for TBSA ≥10%", () => {
    expect(
      shouldSuggestEpisode({ phase: "acute", tbsa: { totalTBSA: 10 } }),
    ).toBe(true);
    expect(
      shouldSuggestEpisode({ phase: "acute", tbsa: { totalTBSA: 50 } }),
    ).toBe(true);
  });

  it("returns false for TBSA <10%", () => {
    expect(
      shouldSuggestEpisode({ phase: "acute", tbsa: { totalTBSA: 9 } }),
    ).toBe(false);
    expect(
      shouldSuggestEpisode({ phase: "acute", tbsa: { totalTBSA: 0 } }),
    ).toBe(false);
  });

  it("returns false when no TBSA", () => {
    expect(shouldSuggestEpisode({ phase: "acute" })).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// computeBurnEpisodeAggregate
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeBurnEpisodeAggregate", () => {
  it("computes cumulative TBSA excised", () => {
    const cases = [
      {
        caseId: "1",
        date: "2026-03-01",
        phase: "acute" as const,
        tbsaExcised: 10,
        procedures: [{ name: "Excision", category: "excision" }],
      },
      {
        caseId: "2",
        date: "2026-03-03",
        phase: "acute" as const,
        tbsaExcised: 8,
        procedures: [{ name: "Excision 2", category: "excision" }],
      },
    ];
    const agg = computeBurnEpisodeAggregate(cases);
    expect(agg.cumulativeTBSAExcised).toBe(18);
  });

  it("computes average graft take", () => {
    const cases = [
      {
        caseId: "1",
        date: "2026-03-01",
        phase: "acute" as const,
        graftTake: 95,
        procedures: [{ name: "STSG", category: "grafting" }],
      },
      {
        caseId: "2",
        date: "2026-03-05",
        phase: "acute" as const,
        graftTake: 85,
        procedures: [{ name: "STSG 2", category: "grafting" }],
      },
    ];
    const agg = computeBurnEpisodeAggregate(cases);
    expect(agg.averageGraftTake).toBe(90);
  });

  it("computes days to first excision from injury date", () => {
    const cases = [
      {
        caseId: "1",
        date: "2026-03-03",
        phase: "acute" as const,
        procedures: [{ name: "Excision", category: "excision" }],
      },
    ];
    const agg = computeBurnEpisodeAggregate(cases, "2026-03-01");
    expect(agg.daysToFirstExcision).toBe(2);
  });

  it("computes total treatment span", () => {
    const cases = [
      {
        caseId: "1",
        date: "2026-03-01",
        phase: "acute" as const,
        procedures: [{ name: "Excision", category: "excision" }],
      },
      {
        caseId: "2",
        date: "2026-03-15",
        phase: "acute" as const,
        procedures: [{ name: "STSG", category: "grafting" }],
      },
    ];
    const agg = computeBurnEpisodeAggregate(cases);
    expect(agg.totalTreatmentSpanDays).toBe(14);
  });

  it("counts procedures by category", () => {
    const cases = [
      {
        caseId: "1",
        date: "2026-03-01",
        phase: "acute" as const,
        procedures: [
          { name: "Excision", category: "excision" },
          { name: "STSG", category: "grafting" },
        ],
      },
    ];
    const agg = computeBurnEpisodeAggregate(cases);
    expect(agg.totalProceduresByCategory).toEqual({
      excision: 1,
      grafting: 1,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// extractBurnCaseSummary
// ═══════════════════════════════════════════════════════════════════════════════

describe("extractBurnCaseSummary", () => {
  it("extracts case summary with TBSA excised from procedure details", () => {
    const summary = extractBurnCaseSummary(
      "case1",
      "2026-03-05",
      { phase: "acute", tbsa: { totalTBSA: 20 } },
      [
        {
          id: "p1",
          picklistEntryId: "burns_acute_tangential_excision",
          procedureName: "Tangential Excision",
          burnProcedureDetails: { excision: { tbsaExcised: 8 } },
        },
      ],
      "2026-03-01",
    );
    expect(summary.tbsaExcised).toBe(8);
    expect(summary.daysSinceInjury).toBe(4);
    expect(summary.phase).toBe("acute");
    expect(summary.procedures[0]!.category).toBe("excision");
  });

  it("computes days since injury", () => {
    const summary = extractBurnCaseSummary(
      "case1",
      "2026-03-10",
      { phase: "acute" },
      [],
      "2026-03-01",
    );
    expect(summary.daysSinceInjury).toBe(9);
  });

  it("handles missing injury date", () => {
    const summary = extractBurnCaseSummary(
      "case1",
      "2026-03-10",
      { phase: "acute" },
      [],
    );
    expect(summary.daysSinceInjury).toBeUndefined();
  });
});
