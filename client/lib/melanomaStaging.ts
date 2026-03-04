/**
 * Melanoma Staging Utility — AJCC 8th Edition
 * ═══════════════════════════════════════════════
 *
 * Auto-calculates T-stage, N-stage, and overall stage from histology data.
 * Logic mirrors the SkinPath NZ CDS engine (skin_cancer_cds_engine.js)
 * but adapted as a standalone TypeScript module for the logbook.
 *
 * References:
 *   - AJCC Cancer Staging Manual, 8th Edition (2017)
 *   - SkinPath NZ engine v2.0.0 (calculateMelanomaTStage, calculateNStage, calculateOverallStage)
 *   - SCNZ 2025, CCA 2021, ESMO 2024 guidelines
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface MelanomaTStageResult {
  tStage: string; // e.g., "T1", "T2", "T3", "T4", "Tis"
  tSubstage: string; // e.g., "T1a", "T1b", "T2a"
  description: string;
  breslowMm: number;
}

export interface MelanomaNStageResult {
  nStage: string; // e.g., "N0", "N1", "N2", "N3"
  nSubstage?: string; // e.g., "N1a", "N1b", "N1c"
  description: string;
  hasSatelliteInTransit: boolean;
}

export interface MelanomaOverallStageResult {
  stage: string; // e.g., "0", "IA", "IB", "IIA", "IIIC", "IV"
  description: string;
  fiveYearSurvivalApprox: string;
  mStage?: string;
}

export interface MelanomaStagingInput {
  /** Breslow thickness in mm. 0 = melanoma in situ */
  breslowThicknessMm: number;
  /** Ulceration present on histology */
  ulceration: boolean;
  /** Lymph node status */
  lnStatus?: "negative" | "positive" | "not_assessed" | "unknown";
  /** Number of positive nodes (if lnStatus === "positive") */
  positiveNodes?: number;
  /** Number of positive nodes that are micrometastases */
  positiveNodesMicrometastases?: number;
  /** Satellite or in-transit metastases present */
  satelliteInTransit?: boolean;
  /** Distant metastasis stage */
  mStage?: string;
}

export interface MelanomaStagingResult {
  tStage: MelanomaTStageResult;
  nStage: MelanomaNStageResult;
  overallStage: MelanomaOverallStageResult;
  /** Human-readable summary, e.g., "Stage IIA (T2b N0 M0)" */
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// T-Stage Calculation
// ═══════════════════════════════════════════════════════════════════════════

export function calculateTStage(
  breslow: number,
  ulceration: boolean,
): MelanomaTStageResult {
  if (breslow === 0) {
    return {
      tStage: "Tis",
      tSubstage: "Tis",
      description: "Melanoma in situ (MIS) — no dermal invasion",
      breslowMm: 0,
    };
  }

  if (breslow <= 1.0) {
    const sub = ulceration ? "T1b" : "T1a";
    return {
      tStage: "T1",
      tSubstage: sub,
      description: ulceration
        ? "T1b: ≤1.0mm with ulceration"
        : "T1a: ≤1.0mm without ulceration",
      breslowMm: breslow,
    };
  }

  if (breslow <= 2.0) {
    const sub = ulceration ? "T2b" : "T2a";
    return {
      tStage: "T2",
      tSubstage: sub,
      description: ulceration
        ? "T2b: 1.01–2.0mm with ulceration"
        : "T2a: 1.01–2.0mm without ulceration",
      breslowMm: breslow,
    };
  }

  if (breslow <= 4.0) {
    const sub = ulceration ? "T3b" : "T3a";
    return {
      tStage: "T3",
      tSubstage: sub,
      description: ulceration
        ? "T3b: 2.01–4.0mm with ulceration"
        : "T3a: 2.01–4.0mm without ulceration",
      breslowMm: breslow,
    };
  }

  const sub = ulceration ? "T4b" : "T4a";
  return {
    tStage: "T4",
    tSubstage: sub,
    description: ulceration
      ? `T4b: >4.0mm (${breslow}mm) with ulceration`
      : `T4a: >4.0mm (${breslow}mm) without ulceration`,
    breslowMm: breslow,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// N-Stage Calculation
// ═══════════════════════════════════════════════════════════════════════════

export function calculateNStage(
  lnStatus: string = "not_assessed",
  positiveNodes: number = 0,
  positiveNodesMicrometastases: number = 0,
  satelliteInTransit: boolean = false,
): MelanomaNStageResult {
  if (
    lnStatus === "negative" ||
    lnStatus === "not_assessed" ||
    lnStatus === "unknown"
  ) {
    if (!satelliteInTransit) {
      return {
        nStage: "N0",
        description: "N0: No regional lymph node metastases",
        hasSatelliteInTransit: false,
      };
    }
    return {
      nStage: "N1c",
      nSubstage: "N1c",
      description:
        "N1c: Satellite/in-transit metastases without nodal involvement",
      hasSatelliteInTransit: true,
    };
  }

  if (lnStatus === "positive") {
    if (positiveNodes === 1) {
      const sub = positiveNodesMicrometastases >= 1 ? "N1a" : "N1b";
      return {
        nStage: "N1",
        nSubstage: sub,
        description:
          sub === "N1a"
            ? "N1a: 1 node with micrometastases"
            : "N1b: 1 node with macrometastases",
        hasSatelliteInTransit: satelliteInTransit,
      };
    }

    if (positiveNodes >= 2 && positiveNodes <= 3) {
      const sub = positiveNodesMicrometastases >= positiveNodes ? "N2a" : "N2b";
      return {
        nStage: "N2",
        nSubstage: sub,
        description:
          sub === "N2a"
            ? `N2a: ${positiveNodes} nodes with micrometastases`
            : `N2b: ${positiveNodes} nodes with macrometastases`,
        hasSatelliteInTransit: satelliteInTransit,
      };
    }

    if (positiveNodes >= 4 || (positiveNodes >= 1 && satelliteInTransit)) {
      return {
        nStage: "N3",
        description: `N3: ${positiveNodes} positive node(s)${satelliteInTransit ? " plus in-transit metastases" : ""}`,
        hasSatelliteInTransit: satelliteInTransit,
      };
    }

    // Positive but count not specified — assume at least N1b
    return {
      nStage: "N1",
      nSubstage: "N1b",
      description: "N1b: Positive lymph node(s) — count not specified",
      hasSatelliteInTransit: satelliteInTransit,
    };
  }

  return {
    nStage: "NX",
    description: "N stage cannot be determined",
    hasSatelliteInTransit: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Overall Stage Calculation (AJCC 8th Edition)
// ═══════════════════════════════════════════════════════════════════════════

export function calculateOverallStage(
  tSubstage: string,
  nStageOrSubstage: string,
  mStage: string = "M0",
): MelanomaOverallStageResult {
  const t = tSubstage.toUpperCase();
  const n = nStageOrSubstage.toUpperCase();
  const m = mStage.toUpperCase();

  // Stage IV: any M1
  if (m.startsWith("M1")) {
    return {
      stage: "IV",
      description: `Stage IV: Distant metastases (${m})`,
      fiveYearSurvivalApprox: "7–10%",
      mStage: m,
    };
  }

  // Stage 0: melanoma in situ
  if (t === "TIS" && n === "N0") {
    return {
      stage: "0",
      description: "Stage 0: Melanoma in situ",
      fiveYearSurvivalApprox: ">99%",
    };
  }

  // Stages I–II: N0 only
  if (n === "N0") {
    if (t === "T1A")
      return {
        stage: "IA",
        description: "Stage IA: T1a N0",
        fiveYearSurvivalApprox: "95–97%",
      };
    if (t === "T1B" || t === "T2A")
      return {
        stage: "IB",
        description: `Stage IB: ${t} N0`,
        fiveYearSurvivalApprox: "91–94%",
      };
    if (t === "T2B" || t === "T3A")
      return {
        stage: "IIA",
        description: `Stage IIA: ${t} N0`,
        fiveYearSurvivalApprox: "87–91%",
      };
    if (t === "T3B" || t === "T4A")
      return {
        stage: "IIB",
        description: `Stage IIB: ${t} N0`,
        fiveYearSurvivalApprox: "79–87%",
      };
    if (t === "T4B")
      return {
        stage: "IIC",
        description: "Stage IIC: T4b N0",
        fiveYearSurvivalApprox: "67–79%",
      };
  }

  // Stage III: any N+
  const thinT = ["TIS", "T0", "T1A", "T1B", "T2A", "T2B"].includes(t);
  const thickT = ["T3A", "T3B", "T4A", "T4B"].includes(t);

  // IIIA: thin non-ulcerated + micrometastases only
  if ((t === "T1A" || t === "T2A") && (n === "N1A" || n === "N2A")) {
    return {
      stage: "IIIA",
      description: `Stage IIIA: ${t} ${n}`,
      fiveYearSurvivalApprox: "74–87%",
    };
  }

  // IIIB: thin T + macrometastases/satellite
  if (thinT && (n === "N1B" || n === "N1C" || n === "N2B")) {
    return {
      stage: "IIIB",
      description: `Stage IIIB: ${t} ${n}`,
      fiveYearSurvivalApprox: "62–74%",
    };
  }
  if ((t === "T1B" || t === "T2B") && (n === "N1A" || n === "N2A")) {
    return {
      stage: "IIIB",
      description: `Stage IIIB: ${t} ${n}`,
      fiveYearSurvivalApprox: "62–74%",
    };
  }

  // IIID: T4b + N3 (worst Stage III prognosis — check before generic IIIC)
  if (t === "T4B" && n === "N3") {
    return {
      stage: "IIID",
      description: "Stage IIID: T4b N3",
      fiveYearSurvivalApprox: "26–40%",
    };
  }

  // IIIC: catch-all for remaining Stage III
  if (thinT && (n === "N2C" || n === "N3")) {
    return {
      stage: "IIIC",
      description: `Stage IIIC: ${t} ${n}`,
      fiveYearSurvivalApprox: "40–62%",
    };
  }
  if (thickT && n !== "N0" && !n.startsWith("NX")) {
    return {
      stage: "IIIC",
      description: `Stage IIIC: ${t} ${n}`,
      fiveYearSurvivalApprox: "40–62%",
    };
  }

  // Generic Stage III
  if (n && n !== "N0" && !n.startsWith("NX")) {
    return {
      stage: "III",
      description: `Stage III: ${t} ${n} — provide node details for substaging`,
      fiveYearSurvivalApprox: "26–87%",
    };
  }

  return {
    stage: "Unknown",
    description: "Stage cannot be determined — review inputs",
    fiveYearSurvivalApprox: "N/A",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Combined Staging Function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate complete melanoma staging from histology input.
 * This is the main function to call from the UI.
 */
export function calculateMelanomaStaging(
  input: MelanomaStagingInput,
): MelanomaStagingResult {
  const tStage = calculateTStage(input.breslowThicknessMm, input.ulceration);

  const nStage = calculateNStage(
    input.lnStatus || "not_assessed",
    input.positiveNodes || 0,
    input.positiveNodesMicrometastases || 0,
    input.satelliteInTransit || false,
  );

  const overallStage = calculateOverallStage(
    tStage.tSubstage,
    nStage.nSubstage || nStage.nStage,
    input.mStage || "M0",
  );

  const summary = `Stage ${overallStage.stage} (${tStage.tSubstage} ${nStage.nSubstage || nStage.nStage} ${input.mStage || "M0"})`;

  return {
    tStage,
    nStage,
    overallStage,
    summary,
  };
}

/**
 * Quick T-stage only calculation — for display when only Breslow + ulceration known.
 * This is useful at initial case entry before full staging data is available.
 */
export function quickTStage(breslowMm: number, ulceration: boolean): string {
  const result = calculateTStage(breslowMm, ulceration);
  return result.tSubstage;
}

/**
 * Get SLNB recommendation based on Breslow thickness.
 * Mirrors SkinPath NZ threshold: ≥0.8mm.
 */
export function getSLNBRecommendation(
  breslowMm: number,
  ulceration: boolean,
): { recommended: boolean; reason: string } {
  if (breslowMm === 0) {
    return { recommended: false, reason: "MIS — SLNB not indicated" };
  }
  if (breslowMm >= 0.8) {
    return {
      recommended: true,
      reason: `Breslow ${breslowMm}mm (≥0.8mm threshold) — SLNB should be offered`,
    };
  }
  if (breslowMm > 0 && breslowMm < 0.8 && ulceration) {
    return {
      recommended: true,
      reason: `Breslow ${breslowMm}mm with ulceration — consider SLNB`,
    };
  }
  return {
    recommended: false,
    reason: `Breslow ${breslowMm}mm without ulceration — SLNB not routine`,
  };
}
