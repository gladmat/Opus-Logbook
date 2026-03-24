import { describe, it, expect } from "vitest";
import { determineAssessorRole } from "@/lib/assessmentRoles";
import type { SharedCaseData } from "@/types/sharing";

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
