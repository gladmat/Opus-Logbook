import { describe, it, expect } from "vitest";
import {
  calculateTubianaStage,
  buildRayAssessment,
  updateRayJointDeficit,
  calculateDupuytrenSummary,
  calculateDiathesisScore,
  generateDupuytrenSummaryText,
  generateDupuytrenCsvRayDetail,
  getDominantPatternLabel,
  FINGER_ORDER,
  COMMON_DUPUYTREN_FINGERS,
} from "../dupuytrenHelpers";
import type { DupuytrenAssessment } from "@/types/dupuytren";

// ── calculateTubianaStage ────────────────────────────────────────────────────

describe("calculateTubianaStage", () => {
  it("returns N for 0 deficit", () => {
    expect(calculateTubianaStage(0)).toBe("N");
  });

  it("returns N for negative deficit", () => {
    expect(calculateTubianaStage(-5)).toBe("N");
  });

  it("returns I for 1-45°", () => {
    expect(calculateTubianaStage(1)).toBe("I");
    expect(calculateTubianaStage(30)).toBe("I");
    expect(calculateTubianaStage(45)).toBe("I");
  });

  it("returns II for 46-90°", () => {
    expect(calculateTubianaStage(46)).toBe("II");
    expect(calculateTubianaStage(75)).toBe("II");
    expect(calculateTubianaStage(90)).toBe("II");
  });

  it("returns III for 91-135°", () => {
    expect(calculateTubianaStage(91)).toBe("III");
    expect(calculateTubianaStage(120)).toBe("III");
    expect(calculateTubianaStage(135)).toBe("III");
  });

  it("returns IV for >135°", () => {
    expect(calculateTubianaStage(136)).toBe("IV");
    expect(calculateTubianaStage(180)).toBe("IV");
  });
});

// ── buildRayAssessment ───────────────────────────────────────────────────────

describe("buildRayAssessment", () => {
  it("sums MCP + PIP correctly", () => {
    const ray = buildRayAssessment("ring", 30, 45);
    expect(ray.totalExtensionDeficit).toBe(75);
    expect(ray.tubianaStage).toBe("II");
    expect(ray.fingerId).toBe("ring");
  });

  it("includes DIP when provided", () => {
    const ray = buildRayAssessment("little", 30, 45, 10);
    expect(ray.totalExtensionDeficit).toBe(85);
    expect(ray.tubianaStage).toBe("II");
    expect(ray.dipExtensionDeficit).toBe(10);
  });

  it("omits DIP when not provided", () => {
    const ray = buildRayAssessment("ring", 30, 45);
    expect(ray.dipExtensionDeficit).toBeUndefined();
  });

  it("handles zero deficit", () => {
    const ray = buildRayAssessment("index", 0, 0);
    expect(ray.totalExtensionDeficit).toBe(0);
    expect(ray.tubianaStage).toBe("N");
  });
});

// ── updateRayJointDeficit ────────────────────────────────────────────────────

describe("updateRayJointDeficit", () => {
  it("updates MCP and recalculates", () => {
    const ray = buildRayAssessment("ring", 30, 45);
    const updated = updateRayJointDeficit(ray, "mcp", 60);
    expect(updated.mcpExtensionDeficit).toBe(60);
    expect(updated.pipExtensionDeficit).toBe(45);
    expect(updated.totalExtensionDeficit).toBe(105);
    expect(updated.tubianaStage).toBe("III");
  });

  it("updates PIP and recalculates", () => {
    const ray = buildRayAssessment("ring", 30, 10);
    const updated = updateRayJointDeficit(ray, "pip", 60);
    expect(updated.pipExtensionDeficit).toBe(60);
    expect(updated.totalExtensionDeficit).toBe(90);
    expect(updated.tubianaStage).toBe("II");
  });

  it("updates DIP and recalculates", () => {
    const ray = buildRayAssessment("ring", 30, 45);
    const updated = updateRayJointDeficit(ray, "dip", 15);
    expect(updated.dipExtensionDeficit).toBe(15);
    expect(updated.totalExtensionDeficit).toBe(90);
    expect(updated.tubianaStage).toBe("II");
  });
});

// ── calculateDupuytrenSummary ────────────────────────────────────────────────

describe("calculateDupuytrenSummary", () => {
  it("calculates total hand score", () => {
    const assessment: DupuytrenAssessment = {
      rays: [
        buildRayAssessment("ring", 30, 45), // Tubiana II = 2
        buildRayAssessment("little", 20, 60), // Tubiana II = 2
      ],
      isRevision: false,
    };
    const summary = calculateDupuytrenSummary(assessment);
    expect(summary.totalHandScore).toBe(4);
  });

  it("detects PIP-predominant pattern", () => {
    const assessment: DupuytrenAssessment = {
      rays: [buildRayAssessment("ring", 10, 60)],
      isRevision: false,
    };
    expect(calculateDupuytrenSummary(assessment).dominantPattern).toBe(
      "pip_predominant",
    );
  });

  it("detects MCP-predominant pattern", () => {
    const assessment: DupuytrenAssessment = {
      rays: [buildRayAssessment("ring", 60, 10)],
      isRevision: false,
    };
    expect(calculateDupuytrenSummary(assessment).dominantPattern).toBe(
      "mcp_predominant",
    );
  });

  it("detects mixed pattern", () => {
    const assessment: DupuytrenAssessment = {
      rays: [buildRayAssessment("ring", 45, 45)],
      isRevision: false,
    };
    expect(calculateDupuytrenSummary(assessment).dominantPattern).toBe("mixed");
  });

  it("returns zero score for no rays", () => {
    const assessment: DupuytrenAssessment = { rays: [], isRevision: false };
    const summary = calculateDupuytrenSummary(assessment);
    expect(summary.totalHandScore).toBe(0);
  });

  it("detects pure MCP-only (PIP = 0)", () => {
    const assessment: DupuytrenAssessment = {
      rays: [buildRayAssessment("ring", 30, 0)],
      isRevision: false,
    };
    expect(calculateDupuytrenSummary(assessment).dominantPattern).toBe(
      "mcp_predominant",
    );
  });

  it("detects pure PIP-only (MCP = 0)", () => {
    const assessment: DupuytrenAssessment = {
      rays: [buildRayAssessment("ring", 0, 30)],
      isRevision: false,
    };
    expect(calculateDupuytrenSummary(assessment).dominantPattern).toBe(
      "pip_predominant",
    );
  });
});

// ── calculateDiathesisScore ──────────────────────────────────────────────────

describe("calculateDiathesisScore", () => {
  it("returns 0 when all false/undefined", () => {
    expect(calculateDiathesisScore({})).toBe(0);
  });

  it("returns 4 when all true", () => {
    expect(
      calculateDiathesisScore({
        familyHistory: true,
        bilateralDisease: true,
        ectopicLesions: true,
        onsetBeforeAge50: true,
      }),
    ).toBe(4);
  });

  it("counts individual features", () => {
    expect(calculateDiathesisScore({ familyHistory: true })).toBe(1);
    expect(
      calculateDiathesisScore({ familyHistory: true, ectopicLesions: true }),
    ).toBe(2);
  });
});

// ── generateDupuytrenSummaryText ─────────────────────────────────────────────

describe("generateDupuytrenSummaryText", () => {
  it("generates readable summary", () => {
    const assessment: DupuytrenAssessment = {
      rays: [
        buildRayAssessment("ring", 30, 45),
        buildRayAssessment("little", 20, 60),
      ],
      isRevision: false,
      firstWebSpace: { isAffected: true },
    };
    const text = generateDupuytrenSummaryText(assessment);
    expect(text).toContain("Ring");
    expect(text).toContain("Little");
    expect(text).toContain("1st web");
    expect(text).not.toContain("recurrent");
  });

  it("includes recurrent flag", () => {
    const assessment: DupuytrenAssessment = {
      rays: [buildRayAssessment("ring", 30, 45)],
      isRevision: true,
    };
    expect(generateDupuytrenSummaryText(assessment)).toContain("recurrent");
  });

  it("returns placeholder for no rays", () => {
    const assessment: DupuytrenAssessment = { rays: [], isRevision: false };
    expect(generateDupuytrenSummaryText(assessment)).toBe("No rays assessed");
  });

  it("shows Tubiana stage per finger", () => {
    const assessment: DupuytrenAssessment = {
      rays: [buildRayAssessment("ring", 30, 45)], // 75° → II
      isRevision: false,
    };
    const text = generateDupuytrenSummaryText(assessment);
    expect(text).toContain("Ring (II)");
  });
});

// ── generateDupuytrenCsvRayDetail ─────────────────────────────────────────────

describe("generateDupuytrenCsvRayDetail", () => {
  it("returns empty string for no rays", () => {
    const assessment: DupuytrenAssessment = { rays: [], isRevision: false };
    expect(generateDupuytrenCsvRayDetail(assessment)).toBe("");
  });

  it("outputs per-ray joint-level detail", () => {
    const assessment: DupuytrenAssessment = {
      rays: [buildRayAssessment("ring", 30, 45)],
      isRevision: false,
    };
    const detail = generateDupuytrenCsvRayDetail(assessment);
    expect(detail).toBe("Ring: MCP 30° PIP 45° total 75° Tubiana II");
  });

  it("includes DIP when present", () => {
    const assessment: DupuytrenAssessment = {
      rays: [buildRayAssessment("little", 30, 45, 10)],
      isRevision: false,
    };
    const detail = generateDupuytrenCsvRayDetail(assessment);
    expect(detail).toContain("DIP 10°");
    expect(detail).toContain("total 85°");
  });

  it("semicolon-separates multiple rays", () => {
    const assessment: DupuytrenAssessment = {
      rays: [
        buildRayAssessment("ring", 30, 45),
        buildRayAssessment("little", 20, 60),
      ],
      isRevision: false,
    };
    const detail = generateDupuytrenCsvRayDetail(assessment);
    expect(detail).toContain("; Little:");
  });
});

// ── getDominantPatternLabel ──────────────────────────────────────────────────

describe("getDominantPatternLabel", () => {
  it("returns MCP-predominant", () => {
    expect(getDominantPatternLabel("mcp_predominant")).toBe("MCP-predominant");
  });

  it("returns PIP-predominant", () => {
    expect(getDominantPatternLabel("pip_predominant")).toBe("PIP-predominant");
  });

  it("returns Mixed", () => {
    expect(getDominantPatternLabel("mixed")).toBe("Mixed");
  });

  it("returns empty for undefined", () => {
    expect(getDominantPatternLabel(undefined)).toBe("");
  });
});

// ── Constants ────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("FINGER_ORDER has 5 entries in radial-to-ulnar order", () => {
    expect(FINGER_ORDER).toEqual([
      "thumb",
      "index",
      "middle",
      "ring",
      "little",
    ]);
  });

  it("COMMON_DUPUYTREN_FINGERS lists ring and little first", () => {
    expect(COMMON_DUPUYTREN_FINGERS).toContain("ring");
    expect(COMMON_DUPUYTREN_FINGERS).toContain("little");
  });
});
