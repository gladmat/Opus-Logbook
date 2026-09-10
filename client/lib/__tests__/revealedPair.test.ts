import { describe, it, expect } from "vitest";
import {
  buildRevealedPair,
  isFullRevealedPair,
  inferViewerRoleFromOwnAssessment,
} from "../revealedPair";
import type {
  SupervisorAssessment,
  TraineeAssessmentV1,
  TraineeAssessmentV2,
  RevealedAssessmentPair,
} from "@/types/sharing";

const FALLBACK = {
  procedureSnomedCode: "FALLBACK",
  procedureDisplayName: "Fallback proc",
};

const SUP: SupervisorAssessment = {
  entrustmentRating: 4,
  caseComplexity: "moderate",
  narrativeFeedback: "Nice flap",
  procedure: { procedureSnomedCode: "SUP-CODE", procedureDisplayName: "Sup" },
  traineeOperativeRole: "PS",
};

const TRN_V2: TraineeAssessmentV2 = {
  instrumentVersion: 2,
  selfEntrustmentRating: 3,
  autonomyMatch: 2,
  bid: { briefing: 2, intraop: 1, debrief: 0 },
  teachingQualityRating: 4,
  teachingNarrative: "Debrief was useful",
  procedure: { procedureSnomedCode: "TRN-CODE", procedureDisplayName: "Trn" },
  traineeOperativeRole: "PS",
};

const TRN_V1: TraineeAssessmentV1 = {
  selfEntrustmentRating: 2,
  teachingQualityRating: 5,
  teachingNarrative: "old narrative",
};

describe("buildRevealedPair", () => {
  it("full pair: copies both sides, v2 fields, narratives, role; partial=false", () => {
    const pair = buildRevealedPair({
      supervisor: SUP,
      trainee: TRN_V2,
      revealedAt: "2026-08-23T00:00:00.000Z",
      fallbackProcedure: FALLBACK,
      viewerRole: "supervisor",
    });
    expect(pair.partial).toBe(false);
    expect(pair.supervisorEntrustment).toBe(4);
    expect(pair.traineeSelfEntrustment).toBe(3);
    expect(pair.teachingQuality).toBe(4);
    expect(pair.instrumentVersion).toBe(2);
    expect(pair.autonomyMatch).toBe(2);
    expect(pair.bid).toEqual({ briefing: 2, intraop: 1, debrief: 0 });
    expect(pair.teachingNarrative).toBe("Debrief was useful");
    expect(pair.supervisorNarrative).toBe("Nice flap");
    expect(pair.caseComplexity).toBe("moderate");
    expect(pair.traineeOperativeRole).toBe("PS");
    expect(pair.viewerRole).toBe("supervisor");
    expect(isFullRevealedPair(pair)).toBe(true);
  });

  it("persists the viewer's side on the pair (trainee)", () => {
    const pair = buildRevealedPair({
      supervisor: SUP,
      trainee: TRN_V2,
      revealedAt: "x",
      fallbackProcedure: FALLBACK,
      viewerRole: "trainee",
    });
    expect(pair.viewerRole).toBe("trainee");
  });

  it("attribution precedence: supervisor payload → trainee payload → fallback", () => {
    expect(
      buildRevealedPair({
        supervisor: SUP,
        trainee: TRN_V2,
        revealedAt: "x",
        fallbackProcedure: FALLBACK,
        viewerRole: "trainee",
      }).procedureCode,
    ).toBe("SUP-CODE");
    expect(
      buildRevealedPair({
        supervisor: { entrustmentRating: 3 },
        trainee: TRN_V2,
        revealedAt: "x",
        fallbackProcedure: FALLBACK,
        viewerRole: "trainee",
      }).procedureCode,
    ).toBe("TRN-CODE");
    const legacy = buildRevealedPair({
      supervisor: { entrustmentRating: 3 },
      trainee: TRN_V1,
      revealedAt: "x",
      fallbackProcedure: FALLBACK,
      viewerRole: "supervisor",
    });
    expect(legacy.procedureCode).toBe("FALLBACK");
    expect(legacy.procedureDisplayName).toBe("Fallback proc");
  });

  it("v1 trainee payload → instrumentVersion 1, no autonomy/bid, narrative carried", () => {
    const pair = buildRevealedPair({
      supervisor: SUP,
      trainee: TRN_V1,
      revealedAt: "x",
      fallbackProcedure: FALLBACK,
      viewerRole: "supervisor",
    });
    expect(pair.instrumentVersion).toBe(1);
    expect(pair.autonomyMatch).toBeUndefined();
    expect(pair.bid).toBeUndefined();
    expect(pair.teachingNarrative).toBe("old narrative");
    expect(pair.teachingQuality).toBe(5);
  });

  it("supervisor-only partial: trainee side zero-filled, partial=true", () => {
    const pair = buildRevealedPair({
      supervisor: SUP,
      trainee: null,
      revealedAt: "x",
      fallbackProcedure: FALLBACK,
      viewerRole: "supervisor",
    });
    expect(pair.partial).toBe(true);
    expect(pair.supervisorEntrustment).toBe(4);
    expect(pair.traineeSelfEntrustment).toBe(0);
    expect(pair.teachingQuality).toBe(0);
    expect(pair.instrumentVersion).toBe(1);
    expect(isFullRevealedPair(pair)).toBe(false);
  });

  it("trainee-only partial: supervisor side zero-filled, partial=true, v2 fields kept", () => {
    const pair = buildRevealedPair({
      supervisor: null,
      trainee: TRN_V2,
      revealedAt: "x",
      fallbackProcedure: FALLBACK,
      viewerRole: "supervisor",
    });
    expect(pair.partial).toBe(true);
    expect(pair.supervisorEntrustment).toBe(0);
    expect(pair.autonomyMatch).toBe(2);
    expect(pair.procedureCode).toBe("TRN-CODE");
    expect(isFullRevealedPair(pair)).toBe(false);
  });
});

describe("isFullRevealedPair — legacy retro-detection", () => {
  const base: RevealedAssessmentPair = {
    supervisorEntrustment: 3,
    traineeSelfEntrustment: 3,
    teachingQuality: 3,
    revealedAt: "x",
    procedureCode: "1",
    procedureDisplayName: "P",
  };
  it("unflagged record with both ratings > 0 is full", () => {
    expect(isFullRevealedPair(base)).toBe(true);
  });
  it("unflagged record with a zero-filled side is partial", () => {
    expect(isFullRevealedPair({ ...base, supervisorEntrustment: 0 as 1 })).toBe(
      false,
    );
    expect(
      isFullRevealedPair({ ...base, traineeSelfEntrustment: 0 as 1 }),
    ).toBe(false);
  });
  it("explicit flag wins over ratings", () => {
    expect(isFullRevealedPair({ ...base, partial: true })).toBe(false);
    expect(
      isFullRevealedPair({
        ...base,
        partial: false,
        supervisorEntrustment: 0 as 1,
      }),
    ).toBe(true);
  });
});

describe("inferViewerRoleFromOwnAssessment — legacy backfill", () => {
  it("a supervisor payload → supervisor", () => {
    expect(inferViewerRoleFromOwnAssessment(SUP)).toBe("supervisor");
  });
  it("a trainee payload (v1 or v2) → trainee", () => {
    expect(inferViewerRoleFromOwnAssessment(TRN_V1)).toBe("trainee");
    expect(inferViewerRoleFromOwnAssessment(TRN_V2)).toBe("trainee");
  });
  it("no local record → null (never guesses)", () => {
    expect(inferViewerRoleFromOwnAssessment(null)).toBeNull();
    expect(inferViewerRoleFromOwnAssessment(undefined)).toBeNull();
    expect(
      inferViewerRoleFromOwnAssessment({} as unknown as SupervisorAssessment),
    ).toBeNull();
  });
});
