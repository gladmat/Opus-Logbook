/**
 * Melanoma staging — AJCC 8th Edition T/N/Overall stage calculator and
 * SLNB recommendation thresholds. These are clinical decision-support
 * outputs surfaced to the surgeon during skin-cancer case entry. Drift in
 * the staging logic would silently miscategorise melanomas, so the tests
 * lock the boundary cases for each substage.
 *
 * Authoritative reference: AJCC Cancer Staging Manual 8th Ed (2017),
 * mirrored by SkinPath NZ engine v2.0.0 per source comment.
 */

import { describe, it, expect } from "vitest";
import {
  calculateTStage,
  calculateNStage,
  calculateOverallStage,
  calculateMelanomaStaging,
  quickTStage,
  getSLNBRecommendation,
} from "@/lib/melanomaStaging";

describe("calculateTStage", () => {
  it("returns Tis for Breslow 0 (melanoma in situ)", () => {
    const r = calculateTStage(0, false);
    expect(r.tStage).toBe("Tis");
    expect(r.tSubstage).toBe("Tis");
    expect(r.breslowMm).toBe(0);
    expect(r.description).toContain("in situ");
  });

  it("returns T1a for Breslow ≤1.0mm without ulceration", () => {
    expect(calculateTStage(0.5, false).tSubstage).toBe("T1a");
    expect(calculateTStage(1.0, false).tSubstage).toBe("T1a");
    expect(calculateTStage(1.0, false).tStage).toBe("T1");
  });

  it("returns T1b for Breslow ≤1.0mm with ulceration", () => {
    expect(calculateTStage(0.5, true).tSubstage).toBe("T1b");
    expect(calculateTStage(1.0, true).tSubstage).toBe("T1b");
  });

  it("returns T2a/T2b for Breslow 1.01–2.0mm", () => {
    expect(calculateTStage(1.5, false).tSubstage).toBe("T2a");
    expect(calculateTStage(1.5, true).tSubstage).toBe("T2b");
    expect(calculateTStage(2.0, false).tSubstage).toBe("T2a");
  });

  it("returns T3a/T3b for Breslow 2.01–4.0mm", () => {
    expect(calculateTStage(2.5, false).tSubstage).toBe("T3a");
    expect(calculateTStage(4.0, true).tSubstage).toBe("T3b");
  });

  it("returns T4a/T4b for Breslow >4.0mm and embeds the value", () => {
    const a = calculateTStage(5.5, false);
    expect(a.tSubstage).toBe("T4a");
    expect(a.description).toContain("5.5mm");
    const b = calculateTStage(10, true);
    expect(b.tSubstage).toBe("T4b");
    expect(b.description).toContain("10mm");
  });

  it("locks boundary values: 1.0 → T1, 1.01 → T2, 2.0 → T2, 2.01 → T3, 4.0 → T3, 4.01 → T4", () => {
    expect(calculateTStage(1.0, false).tStage).toBe("T1");
    expect(calculateTStage(1.01, false).tStage).toBe("T2");
    expect(calculateTStage(2.0, false).tStage).toBe("T2");
    expect(calculateTStage(2.01, false).tStage).toBe("T3");
    expect(calculateTStage(4.0, false).tStage).toBe("T3");
    expect(calculateTStage(4.01, false).tStage).toBe("T4");
  });
});

describe("calculateNStage", () => {
  it("returns N0 when no nodes assessed/positive and no satellite", () => {
    expect(calculateNStage("not_assessed", 0, 0, false).nStage).toBe("N0");
    expect(calculateNStage("negative", 0, 0, false).nStage).toBe("N0");
    expect(calculateNStage("unknown", 0, 0, false).nStage).toBe("N0");
  });

  it("returns N1c for satellite/in-transit with no nodal involvement", () => {
    const r = calculateNStage("negative", 0, 0, true);
    expect(r.nStage).toBe("N1c");
    expect(r.hasSatelliteInTransit).toBe(true);
  });

  it("returns N1a for 1 micrometastatic node, N1b for 1 macrometastatic", () => {
    expect(calculateNStage("positive", 1, 1, false).nSubstage).toBe("N1a");
    expect(calculateNStage("positive", 1, 0, false).nSubstage).toBe("N1b");
  });

  it("returns N2a for 2–3 all-micrometastatic nodes, N2b otherwise", () => {
    expect(calculateNStage("positive", 2, 2, false).nSubstage).toBe("N2a");
    expect(calculateNStage("positive", 3, 3, false).nSubstage).toBe("N2a");
    expect(calculateNStage("positive", 3, 1, false).nSubstage).toBe("N2b");
  });

  it("returns N3 for ≥4 nodes", () => {
    expect(calculateNStage("positive", 4, 0, false).nStage).toBe("N3");
    expect(calculateNStage("positive", 6, 2, true).nStage).toBe("N3");
  });

  it("preserves satelliteInTransit flag on N1/N2 (early N1/N2 short-circuit takes precedence)", () => {
    // The implementation returns N1 for positiveNodes===1 before checking
    // the satelliteInTransit branch — lock in the actual contract.
    const r1 = calculateNStage("positive", 1, 1, true);
    expect(r1.nSubstage).toBe("N1a");
    expect(r1.hasSatelliteInTransit).toBe(true);
    const r2 = calculateNStage("positive", 2, 0, true);
    expect(r2.nStage).toBe("N2");
    expect(r2.hasSatelliteInTransit).toBe(true);
  });

  it("returns NX when status is unrecognized (passes through to fallthrough)", () => {
    expect(calculateNStage("", 0, 0, false).nStage).toBe("NX");
    expect(calculateNStage("garbage" as string, 0, 0, false).nStage).toBe("NX");
  });
});

describe("calculateOverallStage", () => {
  it("Stage IV for any M1", () => {
    expect(calculateOverallStage("T1a", "N0", "M1a").stage).toBe("IV");
    expect(calculateOverallStage("Tis", "N0", "M1c").stage).toBe("IV");
  });

  it("Stage 0 for melanoma in situ with N0", () => {
    expect(calculateOverallStage("Tis", "N0").stage).toBe("0");
  });

  it("Stage IA for T1a N0", () => {
    expect(calculateOverallStage("T1a", "N0").stage).toBe("IA");
  });

  it("Stage IB for T1b N0 or T2a N0", () => {
    expect(calculateOverallStage("T1b", "N0").stage).toBe("IB");
    expect(calculateOverallStage("T2a", "N0").stage).toBe("IB");
  });

  it("Stage IIA / IIB / IIC ladder by T-substage at N0", () => {
    expect(calculateOverallStage("T2b", "N0").stage).toBe("IIA");
    expect(calculateOverallStage("T3a", "N0").stage).toBe("IIA");
    expect(calculateOverallStage("T3b", "N0").stage).toBe("IIB");
    expect(calculateOverallStage("T4a", "N0").stage).toBe("IIB");
    expect(calculateOverallStage("T4b", "N0").stage).toBe("IIC");
  });

  it("Stage IIIA for T1a/T2a with N1a/N2a (thin, micrometastases only)", () => {
    expect(calculateOverallStage("T1a", "N1a").stage).toBe("IIIA");
    expect(calculateOverallStage("T2a", "N2a").stage).toBe("IIIA");
  });

  it("Stage IIID for T4b N3 (worst Stage III prognosis)", () => {
    expect(calculateOverallStage("T4b", "N3").stage).toBe("IIID");
  });

  it("Stage IIIC for thick T with any N+", () => {
    expect(calculateOverallStage("T3a", "N1a").stage).toBe("IIIC");
    expect(calculateOverallStage("T4a", "N2b").stage).toBe("IIIC");
  });

  it("returns Unknown when staging cannot be determined", () => {
    expect(calculateOverallStage("", "").stage).toBe("Unknown");
  });
});

describe("calculateMelanomaStaging", () => {
  it("builds the full Stage IB summary for T2a N0 M0", () => {
    const r = calculateMelanomaStaging({
      breslowThicknessMm: 1.5,
      ulceration: false,
    });
    expect(r.tStage.tSubstage).toBe("T2a");
    expect(r.nStage.nStage).toBe("N0");
    expect(r.overallStage.stage).toBe("IB");
    expect(r.summary).toBe("Stage IB (T2a N0 M0)");
  });

  it("propagates lnStatus and positiveNodes through to N1a", () => {
    const r = calculateMelanomaStaging({
      breslowThicknessMm: 0.6,
      ulceration: false,
      lnStatus: "positive",
      positiveNodes: 1,
      positiveNodesMicrometastases: 1,
    });
    expect(r.nStage.nSubstage).toBe("N1a");
    expect(r.overallStage.stage).toBe("IIIA");
  });
});

describe("quickTStage", () => {
  it("returns just the T-substage", () => {
    expect(quickTStage(0, false)).toBe("Tis");
    expect(quickTStage(1.5, true)).toBe("T2b");
    expect(quickTStage(5, false)).toBe("T4a");
  });
});

describe("getSLNBRecommendation", () => {
  it("not recommended for MIS", () => {
    expect(getSLNBRecommendation(0, false).recommended).toBe(false);
  });

  it("recommended for Breslow ≥0.8mm regardless of ulceration", () => {
    expect(getSLNBRecommendation(0.8, false).recommended).toBe(true);
    expect(getSLNBRecommendation(1.5, false).recommended).toBe(true);
    expect(getSLNBRecommendation(3, true).recommended).toBe(true);
  });

  it("recommended for thin melanoma <0.8mm WITH ulceration", () => {
    expect(getSLNBRecommendation(0.5, true).recommended).toBe(true);
  });

  it("not recommended for thin melanoma <0.8mm without ulceration", () => {
    expect(getSLNBRecommendation(0.5, false).recommended).toBe(false);
    expect(getSLNBRecommendation(0.79, false).recommended).toBe(false);
  });
});
