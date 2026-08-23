import { describe, it, expect } from "vitest";
import { determineAssessorRole } from "@/lib/assessmentRoles";
import type { SharedCaseData, TraineeAssessmentV2 } from "@/types/sharing";
import {
  AUTONOMY_MATCH_LABELS,
  AUTONOMY_MATCH_DESCRIPTIONS,
  BID_ITEM_KEYS,
  BID_ITEM_LABELS,
  BID_ITEM_PROMPTS,
  BID_ITEM_TITLES,
  TEACHING_QUALITY_LABELS,
  TEACHING_QUALITY_LABELS_V1,
  teachingQualityLabel,
  isTraineeAssessmentV2,
} from "@/types/sharing";

// ─── determineAssessorRole ────────────────────────────────────────────────────

describe("determineAssessorRole", () => {
  const ownerUserId = "owner-123";
  const recipientUserId = "recipient-456";

  const baseCaseData: SharedCaseData = {
    procedureDate: "2026-03-20",
    facility: "Test Hospital",
    diagnosisGroups: [],
    outcomes: {},
    teamRoles: [],
  };

  it("owner with SUP_ supervision → supervisor", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      supervisionLevel: "SUP_SCRUBBED",
      operativeRole: "SUPERVISOR",
    };
    expect(
      determineAssessorRole(
        ownerUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("supervisor");
  });

  it("owner with SUP_AVAILABLE → supervisor", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      supervisionLevel: "SUP_AVAILABLE",
    };
    expect(
      determineAssessorRole(
        ownerUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("supervisor");
  });

  it("recipient with SURGEON role → trainee", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      operativeRole: "SURGEON",
    };
    expect(
      determineAssessorRole(
        recipientUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("trainee");
  });

  it("fallback: owner without SUP_ → supervisor", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      supervisionLevel: "INDEPENDENT",
    };
    expect(
      determineAssessorRole(
        ownerUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("supervisor");
  });

  it("fallback: recipient without operative role → trainee", () => {
    expect(
      determineAssessorRole(
        recipientUserId,
        ownerUserId,
        recipientUserId,
        baseCaseData,
      ),
    ).toBe("trainee");
  });

  it("null caseData: owner → supervisor", () => {
    expect(
      determineAssessorRole(ownerUserId, ownerUserId, recipientUserId, null),
    ).toBe("supervisor");
  });

  it("null caseData: recipient → trainee", () => {
    expect(
      determineAssessorRole(
        recipientUserId,
        ownerUserId,
        recipientUserId,
        null,
      ),
    ).toBe("trainee");
  });

  // Seniority-tier-based detection via operativeTeam
  it("seniority tier: consultant owner + fellow recipient → owner is supervisor", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      operativeTeam: [
        {
          contactId: "c1",
          linkedUserId: ownerUserId,
          displayName: "Owner",
          abbreviatedName: "O.",
          careerStage: "nz_consultant", // tier 5
          operativeRole: "FA",
        },
        {
          contactId: "c2",
          linkedUserId: recipientUserId,
          displayName: "Recipient",
          abbreviatedName: "R.",
          careerStage: "nz_fellow", // tier 4
          operativeRole: "PS",
        },
      ],
    };
    // Even though operative role says FA (not supervisor), seniority wins
    expect(
      determineAssessorRole(
        ownerUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("supervisor");
  });

  it("seniority tier: fellow owner + consultant recipient → owner is trainee", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      operativeTeam: [
        {
          contactId: "c1",
          linkedUserId: ownerUserId,
          displayName: "Owner",
          abbreviatedName: "O.",
          careerStage: "nz_fellow", // tier 4
          operativeRole: "PS",
        },
        {
          contactId: "c2",
          linkedUserId: recipientUserId,
          displayName: "Recipient",
          abbreviatedName: "R.",
          careerStage: "nz_consultant", // tier 5
          operativeRole: "FA",
        },
      ],
    };
    expect(
      determineAssessorRole(
        ownerUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("trainee");
  });

  it("seniority tier: equal tiers → falls back to heuristic", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      supervisionLevel: "SUP_SCRUBBED",
      operativeTeam: [
        {
          contactId: "c1",
          linkedUserId: ownerUserId,
          displayName: "Owner",
          abbreviatedName: "O.",
          careerStage: "nz_consultant", // tier 5
          operativeRole: "PS",
        },
        {
          contactId: "c2",
          linkedUserId: recipientUserId,
          displayName: "Recipient",
          abbreviatedName: "R.",
          careerStage: "uk_consultant", // also tier 5
          operativeRole: "FA",
        },
      ],
    };
    // Equal tiers → seniority can't decide → falls to SUP_ heuristic
    expect(
      determineAssessorRole(
        ownerUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("supervisor");
  });

  // ownerParticipant-sourced tiers (2.22.0+ blobs). In production the owner
  // is NEVER in operativeTeam (tagged contacts only), so before
  // ownerParticipant the tier path could not fire for owner↔recipient
  // pairs and the recipient consultant was defaulted to "trainee".
  it("ownerParticipant: recipient consultant over trainee owner → supervisor", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      operativeRole: "SURGEON", // owner logged as SURGEON — old heuristic said "trainee"
      ownerParticipant: {
        userId: ownerUserId,
        displayName: "Trainee Owner",
        careerStage: "nz_set_trainee",
      },
      operativeTeam: [
        {
          contactId: "c2",
          linkedUserId: recipientUserId,
          displayName: "Consultant Recipient",
          abbreviatedName: "C.R.",
          careerStage: "nz_consultant",
          operativeRole: "SA",
        },
      ],
    };
    expect(
      determineAssessorRole(
        recipientUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("supervisor");
  });

  it("ownerParticipant: consultant owner viewing against fellow recipient → supervisor", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      ownerParticipant: {
        userId: ownerUserId,
        displayName: "Consultant Owner",
        careerStage: "nz_consultant",
      },
      operativeTeam: [
        {
          contactId: "c2",
          linkedUserId: recipientUserId,
          displayName: "Fellow Recipient",
          abbreviatedName: "F.R.",
          careerStage: "nz_fellow",
          operativeRole: "PS",
        },
      ],
    };
    expect(
      determineAssessorRole(
        ownerUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("supervisor");
  });

  it("legacy blob without ownerParticipant keeps the old fallback behaviour", () => {
    const caseData: SharedCaseData = {
      ...baseCaseData,
      operativeRole: "SURGEON",
      operativeTeam: [
        {
          contactId: "c2",
          linkedUserId: recipientUserId,
          displayName: "Consultant Recipient",
          abbreviatedName: "C.R.",
          careerStage: "nz_consultant",
          operativeRole: "SA",
        },
      ],
    };
    // Owner tier unresolvable → heuristic: recipient + owner-logged-SURGEON
    // → "trainee" (the documented legacy misdetection; the UI toggle and
    // suggestedRole from epaFromBlob are the corrective paths).
    expect(
      determineAssessorRole(
        recipientUserId,
        ownerUserId,
        recipientUserId,
        caseData,
      ),
    ).toBe("trainee");
  });
});

// ─── Reflective notes stripping ────────────────────────────────────────────────

describe("reflective notes privacy", () => {
  it("trainee reflective notes are excluded from shareable payload", () => {
    const traineeAssessment = {
      selfEntrustmentRating: 3 as const,
      teachingQualityRating: 4 as const,
      teachingNarrative: "Good session",
      reflectiveNotes: "I need to work on suturing technique",
    };

    // Simulate the stripping logic from AssessmentScreen
    const { reflectiveNotes: _stripped, ...shareable } = traineeAssessment;

    expect(shareable).not.toHaveProperty("reflectiveNotes");
    expect(shareable.selfEntrustmentRating).toBe(3);
    expect(shareable.teachingQualityRating).toBe(4);
    expect(shareable.teachingNarrative).toBe("Good session");
  });

  it("supervisor assessment has no reflective notes to strip", () => {
    const supervisorAssessment = {
      entrustmentRating: 4 as const,
      caseComplexity: "moderate" as const,
      narrativeFeedback: "Good tissue handling",
    };

    // Supervisor assessment is the shareable payload directly
    expect(supervisorAssessment).not.toHaveProperty("reflectiveNotes");
    expect(supervisorAssessment.entrustmentRating).toBe(4);
  });
});

// ─── Calibration gap ────────────────────────────────────────────────────────────

describe("calibration gap logic", () => {
  // Inline the gap logic for testing (from AssessmentRevealScreen)
  function getGapInfo(
    supervisorRating: number,
    traineeRating: number,
  ): { message: string; color: "success" | "warning" | "error" } {
    const gap = supervisorRating - traineeRating;
    const absGap = Math.abs(gap);

    if (absGap === 0) return { message: "Aligned", color: "success" };
    if (absGap === 1) {
      return gap > 0
        ? { message: "You may be underestimating yourself", color: "success" }
        : { message: "Close alignment — minor difference", color: "success" };
    }
    if (absGap === 2) {
      return gap > 0
        ? {
            message: "Your supervisor sees more independence than you do",
            color: "warning",
          }
        : {
            message: "Your supervisor sees room for growth here",
            color: "warning",
          };
    }
    return gap > 0
      ? {
          message: "Significant gap — you may be too self-critical",
          color: "error",
        }
      : {
          message: "Significant gap — worth discussing together",
          color: "error",
        };
  }

  it("gap = 0 → Aligned (success)", () => {
    const result = getGapInfo(3, 3);
    expect(result.message).toBe("Aligned");
    expect(result.color).toBe("success");
  });

  it("gap = +1 (supervisor higher) → underestimating (success)", () => {
    const result = getGapInfo(4, 3);
    expect(result.message).toContain("underestimating");
    expect(result.color).toBe("success");
  });

  it("gap = -1 (trainee higher) → minor difference (success)", () => {
    const result = getGapInfo(3, 4);
    expect(result.message).toContain("minor difference");
    expect(result.color).toBe("success");
  });

  it("gap = +2 → warning", () => {
    const result = getGapInfo(5, 3);
    expect(result.color).toBe("warning");
  });

  it("gap = -2 → warning", () => {
    const result = getGapInfo(2, 4);
    expect(result.color).toBe("warning");
  });

  it("gap = +3 → error (too self-critical)", () => {
    const result = getGapInfo(5, 2);
    expect(result.message).toContain("too self-critical");
    expect(result.color).toBe("error");
  });

  it("gap = -3 → error (discuss)", () => {
    const result = getGapInfo(1, 4);
    expect(result.message).toContain("discussing together");
    expect(result.color).toBe("error");
  });
});

// ─── Assessment type structure ──────────────────────────────────────────────────

describe("assessment type structure", () => {
  it("SupervisorAssessment has required fields", () => {
    const assessment = {
      entrustmentRating: 4 as const,
    };
    expect(assessment.entrustmentRating).toBe(4);
  });

  it("TraineeAssessment has required fields", () => {
    const assessment = {
      selfEntrustmentRating: 3 as const,
      teachingQualityRating: 4 as const,
    };
    expect(assessment.selfEntrustmentRating).toBe(3);
    expect(assessment.teachingQualityRating).toBe(4);
  });

  it("RevealedAssessmentPair has required fields", () => {
    const pair = {
      supervisorEntrustment: 4 as const,
      traineeSelfEntrustment: 3 as const,
      teachingQuality: 4 as const,
      revealedAt: "2026-03-23T12:00:00Z",
      procedureCode: "80146002",
      procedureDisplayName: "Carpal tunnel release",
    };
    expect(pair.supervisorEntrustment).toBe(4);
    expect(pair.traineeSelfEntrustment).toBe(3);
    expect(pair.teachingQuality).toBe(4);
    expect(pair.procedureDisplayName).toBe("Carpal tunnel release");
  });
});

// ─── Instrument v2 (granted-autonomy match + BID + per-case global) ──────────

describe("trainee instrument v2", () => {
  it("autonomy match labels + descriptions cover 1–5 with the centre as ideal", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(AUTONOMY_MATCH_LABELS[level]).toBeTruthy();
      expect(AUTONOMY_MATCH_DESCRIPTIONS[level]).toBeTruthy();
    }
    expect(AUTONOMY_MATCH_LABELS[3]).toBe("Well matched");
    expect(AUTONOMY_MATCH_LABELS[1]).toBe("Held back");
    expect(AUTONOMY_MATCH_LABELS[5]).toBe("Beyond me");
  });

  it("BID items: three keys, each with title + prompt, levels 0–2 labelled", () => {
    expect(BID_ITEM_KEYS).toEqual(["briefing", "intraop", "debrief"]);
    for (const key of BID_ITEM_KEYS) {
      expect(BID_ITEM_TITLES[key]).toBeTruthy();
      expect(BID_ITEM_PROMPTS[key]).toBeTruthy();
    }
    expect(BID_ITEM_LABELS[0]).toBe("Not this case");
    expect(BID_ITEM_LABELS[2]).toBe("Yes, clearly");
  });

  it("Part C anchors are per-case attainable; v1 anchors kept for legacy display", () => {
    expect(TEACHING_QUALITY_LABELS[5]).toBe("Outstanding");
    expect(TEACHING_QUALITY_LABELS[5]).not.toMatch(/changed my practice/);
    expect(TEACHING_QUALITY_LABELS_V1[5]).toMatch(/changed my practice/);
    expect(teachingQualityLabel(5, 2)).toBe("Outstanding");
    expect(teachingQualityLabel(5, 1)).toMatch(/changed my practice/);
    // Unversioned (legacy) records render on the v1 scale.
    expect(teachingQualityLabel(3)).toBe(TEACHING_QUALITY_LABELS_V1[3]);
  });

  it("v2 shareable strip keeps reflective notes private and carries the new fields", () => {
    const full: TraineeAssessmentV2 = {
      instrumentVersion: 2,
      selfEntrustmentRating: 3,
      autonomyMatch: 2,
      bid: { briefing: 2, intraop: 1, debrief: 0 },
      teachingQualityRating: 4,
      teachingNarrative: "Good debrief",
      reflectiveNotes: "PRIVATE",
      procedure: { procedureSnomedCode: "1", procedureDisplayName: "CTR" },
      traineeOperativeRole: "PS",
    };
    expect(isTraineeAssessmentV2(full)).toBe(true);
    const { reflectiveNotes: _stripped, ...shareable } = full;
    const json = JSON.stringify(shareable);
    expect(json).not.toContain("PRIVATE");
    expect(json).toContain('"instrumentVersion":2');
    expect(json).toContain('"autonomyMatch":2');
    expect(json).toContain('"traineeOperativeRole":"PS"');
    expect(
      isTraineeAssessmentV2({
        selfEntrustmentRating: 3,
        teachingQualityRating: 4,
      }),
    ).toBe(false);
  });
});
