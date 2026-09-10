import type {
  AutonomyMatchLevel,
  BidItemKey,
  EntrustmentLevel,
} from "@/types/sharing";
import { BID_ITEM_KEYS } from "@/types/sharing";
import type { RevealedPairWithContext } from "./assessmentStorage";
import { isFullRevealedPair } from "./revealedPair";

// ── Thresholds ───────────────────────────────────────────────────────────────

/** Supervisor-facing aggregates (teaching global, BID, granted autonomy)
 *  stay hidden below this many assessments … */
export const SUPERVISOR_AGGREGATE_MIN_ASSESSMENTS = 5;
/** … AND this many distinct shared cases (proxy for distinct trainees —
 *  RevealedAssessmentPair deliberately stores no counterpart userId).
 *  Identification-prevention threshold; also the SETQ-type reliability
 *  floor. */
export const SUPERVISOR_AGGREGATE_MIN_UNIQUE_CASES = 3;
/** Trainee-facing self-calibration / autonomy-gap minimum. */
export const CALIBRATION_MIN_PAIRS = 3;

export function meetsSupervisorAggregateThreshold(
  pairs: RevealedPairWithContext[],
): boolean {
  const uniqueSharedCaseIds = new Set(pairs.map((p) => p.sharedCaseId));
  return (
    pairs.length >= SUPERVISOR_AGGREGATE_MIN_ASSESSMENTS &&
    uniqueSharedCaseIds.size >= SUPERVISOR_AGGREGATE_MIN_UNIQUE_CASES
  );
}

/**
 * Phase C: every analytic runs over FULL pairs only. A 72h partial reveal
 * zero-fills the missing side; ingesting that 0 would corrupt calibration
 * gaps, curve points and averages.
 */
export function fullPairsOnly(
  pairs: RevealedPairWithContext[],
): RevealedPairWithContext[] {
  return pairs.filter(isFullRevealedPair);
}

// ── Viewer-role split (2.25.0) ───────────────────────────────────────────────

/**
 * A fellow both supervises juniors and is supervised by consultants, so the
 * local revealed-pair store mixes "pairs where I taught" with "pairs where
 * I was assessed". Every trainee-facing analytic (learning curves,
 * calibration, autonomy gap) must run over the latter only, and every
 * supervisor-facing analytic (teaching aggregate, entrustment given) over
 * the former only. Records without `viewerRole` (pre-2.25.0, no local own
 * assessment to backfill from) are reported separately and excluded from
 * BOTH sides rather than guessed.
 */
export interface ViewerRoleSplit {
  asTrainee: RevealedPairWithContext[];
  asSupervisor: RevealedPairWithContext[];
  unattributed: RevealedPairWithContext[];
}

export function splitPairsByViewerRole(
  pairs: RevealedPairWithContext[],
): ViewerRoleSplit {
  const split: ViewerRoleSplit = {
    asTrainee: [],
    asSupervisor: [],
    unattributed: [],
  };
  for (const pair of pairs) {
    if (pair.viewerRole === "trainee") split.asTrainee.push(pair);
    else if (pair.viewerRole === "supervisor") split.asSupervisor.push(pair);
    else split.unattributed.push(pair);
  }
  return split;
}

export function pairsAsTrainee(
  pairs: RevealedPairWithContext[],
): RevealedPairWithContext[] {
  return splitPairsByViewerRole(pairs).asTrainee;
}

export function pairsAsSupervisor(
  pairs: RevealedPairWithContext[],
): RevealedPairWithContext[] {
  return splitPairsByViewerRole(pairs).asSupervisor;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface LearningCurvePoint {
  caseNumber: number;
  supervisorRating: EntrustmentLevel;
  selfRating: EntrustmentLevel;
  date: string;
  sharedCaseId: string;
  caseComplexity?: string;
}

export interface ProcedureLearningCurve {
  procedureCode: string;
  procedureDisplayName: string;
  totalCases: number;
  latestRating: EntrustmentLevel;
  points: LearningCurvePoint[];
}

export interface TeachingAggregate {
  overallAverage: number;
  totalAssessments: number;
  /** Approximate unique trainee count (uses distinct sharedCaseId as proxy). */
  uniqueTrainees: number;
  byProcedure: {
    procedureCode: string;
    procedureDisplayName: string;
    averageRating: number;
    count: number;
  }[];
  trend: {
    month: string;
    averageRating: number;
    count: number;
  }[];
  meetsThreshold: boolean;
  /** Pairs rated on the pre-2.23.0 teaching anchors (v1). Both scales are
   *  monotone 1–5 so `overallAverage` pools them; surfaced so the caveat
   *  can be shown. */
  legacyScaleCount: number;
  /** BID behaviour frequencies (instrument v2 pairs only); null when none. */
  behaviours: BidFrequencies | null;
  /** How trainees experienced the autonomy this supervisor granted
   *  (instrument v2 pairs only); null when none. */
  autonomy: AutonomyGapStats | null;
}

export type AutonomyDirection = "held_back" | "matched" | "over_extended";

export interface AutonomyGapStats {
  /** mean(autonomyMatch − 3): negative = held back, positive = over-extended. */
  meanSignedGap: number;
  /** Share of pairs rated 1–2 (given less than could handle). */
  heldBackRate: number;
  /** Share of pairs rated 3. */
  matchedRate: number;
  /** Share of pairs rated 4–5 (given more than could handle). */
  overExtendedRate: number;
  direction: AutonomyDirection;
  totalRated: number;
  distribution: { level: AutonomyMatchLevel; count: number }[];
  /** Mean autonomy match per supervisor entrustment level. */
  byEntrustment: {
    level: EntrustmentLevel;
    meanMatch: number;
    count: number;
  }[];
  monthlyTrend: { month: string; meanSignedGap: number; count: number }[];
}

export interface BidItemFrequency {
  /** counts[0] = "Not this case", [1] = "Somewhat", [2] = "Yes, clearly". */
  counts: [number, number, number];
  /** Share rated "Yes, clearly". */
  clearRate: number;
  mean: number;
}

export interface BidFrequencies {
  items: Record<BidItemKey, BidItemFrequency>;
  total: number;
}

export type CalibrationInterpretation =
  | "excellent"
  | "good"
  | "needs_attention";
export type CalibrationDirection =
  | "over_estimates"
  | "under_estimates"
  | "balanced";

export interface CalibrationScore {
  overallMeanGap: number;
  interpretation: CalibrationInterpretation;
  direction: CalibrationDirection;
  monthlyTrend: {
    month: string;
    meanGap: number;
    count: number;
  }[];
  totalPairs: number;
}

export interface TrainingOverviewStats {
  totalAssessments: number;
  proceduresAssessed: number;
  uniqueCounterparts: number;
  averageSupervisorRating: number;
  averageSelfRating: number;
}

// ── Learning Curves ──────────────────────────────────────────────────────────

/**
 * Group revealed pairs by procedure, sort by date, assign sequential case numbers.
 * Returns curves sorted by totalCases descending.
 */
export function computeLearningCurves(
  allPairs: RevealedPairWithContext[],
): ProcedureLearningCurve[] {
  // Full pairs only (Phase C), and Primary-Surgeon entrustment only: a
  // counterpart on an older app may still derive an FA pair — an
  // entrustment rating for an assisting role is not on the same construct
  // and must not enter the curve. Legacy records (no role) are kept.
  const pairs = fullPairsOnly(allPairs).filter(
    (p) => p.traineeOperativeRole == null || p.traineeOperativeRole === "PS",
  );
  if (pairs.length === 0) return [];

  // Group by procedure code
  const byProcedure = new Map<string, RevealedPairWithContext[]>();
  for (const pair of pairs) {
    if (!pair.procedureCode) continue;
    const existing = byProcedure.get(pair.procedureCode);
    if (existing) {
      existing.push(pair);
    } else {
      byProcedure.set(pair.procedureCode, [pair]);
    }
  }

  const curves: ProcedureLearningCurve[] = [];

  for (const [code, group] of byProcedure) {
    // Sort by date ascending
    const sorted = [...group].sort(
      (a, b) =>
        new Date(a.revealedAt).getTime() - new Date(b.revealedAt).getTime(),
    );

    const points: LearningCurvePoint[] = sorted.map((pair, i) => ({
      caseNumber: i + 1,
      supervisorRating: pair.supervisorEntrustment,
      selfRating: pair.traineeSelfEntrustment,
      date: pair.revealedAt,
      sharedCaseId: pair.sharedCaseId,
      caseComplexity: pair.caseComplexity,
    }));

    const last = sorted[sorted.length - 1]!;

    curves.push({
      procedureCode: code,
      procedureDisplayName: last.procedureDisplayName || code,
      totalCases: points.length,
      latestRating: last.supervisorEntrustment,
      points,
    });
  }

  // Sort by total cases descending
  curves.sort((a, b) => b.totalCases - a.totalCases);

  return curves;
}

/**
 * Get learning curve for a single procedure.
 */
export function computeLearningCurveForProcedure(
  pairs: RevealedPairWithContext[],
  procedureCode: string,
): ProcedureLearningCurve | null {
  const filtered = pairs.filter((p) => p.procedureCode === procedureCode);
  if (filtered.length === 0) return null;
  const curves = computeLearningCurves(filtered);
  return curves[0] ?? null;
}

// ── Teaching Aggregate ───────────────────────────────────────────────────────

/**
 * Compute aggregate teaching quality score.
 *
 * Privacy: Returns null when fewer than 5 assessments or fewer than 3 unique
 * sharedCaseIds (proxy for unique trainees). RevealedAssessmentPair does not
 * store counterpart userId — sharedCaseId cardinality approximates unique
 * encounters, which is sufficient for the identification-prevention threshold.
 */
export function computeTeachingAggregate(
  allPairs: RevealedPairWithContext[],
): TeachingAggregate | null {
  const pairs = fullPairsOnly(allPairs);
  if (pairs.length === 0) return null;

  const uniqueSharedCaseIds = new Set(pairs.map((p) => p.sharedCaseId));
  const meetsThreshold = meetsSupervisorAggregateThreshold(pairs);

  const totalTeaching = pairs.reduce((sum, p) => sum + p.teachingQuality, 0);
  const overallAverage = Math.round((totalTeaching / pairs.length) * 10) / 10;

  // Group by procedure
  const procMap = new Map<
    string,
    { name: string; sum: number; count: number }
  >();
  for (const pair of pairs) {
    if (!pair.procedureCode) continue;
    const existing = procMap.get(pair.procedureCode);
    if (existing) {
      existing.sum += pair.teachingQuality;
      existing.count += 1;
    } else {
      procMap.set(pair.procedureCode, {
        name: pair.procedureDisplayName || pair.procedureCode,
        sum: pair.teachingQuality,
        count: 1,
      });
    }
  }

  const byProcedure = Array.from(procMap.entries())
    .map(([code, data]) => ({
      procedureCode: code,
      procedureDisplayName: data.name,
      averageRating: Math.round((data.sum / data.count) * 10) / 10,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count);

  // Monthly trend
  const monthMap = new Map<string, { sum: number; count: number }>();
  for (const pair of pairs) {
    const month = pair.revealedAt.slice(0, 7); // "YYYY-MM"
    const existing = monthMap.get(month);
    if (existing) {
      existing.sum += pair.teachingQuality;
      existing.count += 1;
    } else {
      monthMap.set(month, { sum: pair.teachingQuality, count: 1 });
    }
  }

  const trend = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      averageRating: Math.round((data.sum / data.count) * 10) / 10,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  if (!meetsThreshold) return null;

  return {
    overallAverage,
    totalAssessments: pairs.length,
    uniqueTrainees: uniqueSharedCaseIds.size,
    byProcedure,
    trend,
    meetsThreshold,
    legacyScaleCount: pairs.filter((p) => p.instrumentVersion !== 2).length,
    // Supervisor-facing: the threshold above already gates identification;
    // the per-item helpers re-apply it over the v2 subset they use.
    behaviours: computeBidFrequencies(pairs),
    autonomy: computeAutonomyGap(pairs, "supervisor"),
  };
}

// ── Calibration Score ────────────────────────────────────────────────────────

/**
 * Compute calibration score: mean |supervisor - self| across all pairs.
 * Lower is better (0 = perfect calibration).
 *
 * Returns null when fewer than 3 pairs (insufficient data).
 */
export function computeCalibrationScore(
  allPairs: RevealedPairWithContext[],
): CalibrationScore | null {
  const pairs = fullPairsOnly(allPairs);
  if (pairs.length < CALIBRATION_MIN_PAIRS) return null;

  const gaps = pairs.map(
    (p) => p.supervisorEntrustment - p.traineeSelfEntrustment,
  );
  const absGaps = gaps.map(Math.abs);
  const overallMeanGap =
    Math.round((absGaps.reduce((a, b) => a + b, 0) / absGaps.length) * 100) /
    100;

  // Signed mean for direction: positive = supervisor rates higher = trainee under-estimates
  const signedMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  let interpretation: CalibrationInterpretation;
  if (overallMeanGap < 0.5) {
    interpretation = "excellent";
  } else if (overallMeanGap <= 1.0) {
    interpretation = "good";
  } else {
    interpretation = "needs_attention";
  }

  let direction: CalibrationDirection;
  if (Math.abs(signedMean) < 0.25) {
    direction = "balanced";
  } else if (signedMean > 0) {
    direction = "under_estimates";
  } else {
    direction = "over_estimates";
  }

  // Monthly trend
  const monthMap = new Map<string, { sumAbs: number; count: number }>();
  for (let i = 0; i < pairs.length; i++) {
    const month = pairs[i]!.revealedAt.slice(0, 7);
    const existing = monthMap.get(month);
    if (existing) {
      existing.sumAbs += absGaps[i]!;
      existing.count += 1;
    } else {
      monthMap.set(month, { sumAbs: absGaps[i]!, count: 1 });
    }
  }

  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      meanGap: Math.round((data.sumAbs / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    overallMeanGap,
    interpretation,
    direction,
    monthlyTrend,
    totalPairs: pairs.length,
  };
}

// ── Training Overview ────────────────────────────────────────────────────────

/**
 * Compute summary statistics for the training overview cards.
 */
export function computeTrainingOverview(
  allPairs: RevealedPairWithContext[],
): TrainingOverviewStats {
  const pairs = fullPairsOnly(allPairs);
  if (pairs.length === 0) {
    return {
      totalAssessments: 0,
      proceduresAssessed: 0,
      uniqueCounterparts: 0,
      averageSupervisorRating: 0,
      averageSelfRating: 0,
    };
  }

  const procedures = new Set(pairs.map((p) => p.procedureCode).filter(Boolean));
  const counterparts = new Set(pairs.map((p) => p.sharedCaseId));

  const avgSup =
    Math.round(
      (pairs.reduce((s, p) => s + p.supervisorEntrustment, 0) / pairs.length) *
        10,
    ) / 10;
  const avgSelf =
    Math.round(
      (pairs.reduce((s, p) => s + p.traineeSelfEntrustment, 0) / pairs.length) *
        10,
    ) / 10;

  return {
    totalAssessments: pairs.length,
    proceduresAssessed: procedures.size,
    uniqueCounterparts: counterparts.size,
    averageSupervisorRating: avgSup,
    averageSelfRating: avgSelf,
  };
}

// ── Entrustment Distribution ─────────────────────────────────────────────────

/**
 * Count supervisor entrustment ratings at each level 1–5.
 * Used for the supervisor's "ratings given" distribution chart.
 */
export function computeEntrustmentDistribution(
  allPairs: RevealedPairWithContext[],
): { level: number; count: number }[] {
  const pairs = fullPairsOnly(allPairs);
  const counts = new Map<number, number>();
  for (let l = 1; l <= 5; l++) counts.set(l, 0);

  for (const pair of pairs) {
    const level = pair.supervisorEntrustment;
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => a.level - b.level);
}

// ── Procedures with assessments ──────────────────────────────────────────────

/**
 * List procedures that have at least 1 revealed assessment.
 */
export function getProceduresWithAssessments(
  allPairs: RevealedPairWithContext[],
): { code: string; name: string; count: number }[] {
  const pairs = fullPairsOnly(allPairs);
  const map = new Map<string, { name: string; count: number }>();

  for (const pair of pairs) {
    if (!pair.procedureCode) continue;
    const existing = map.get(pair.procedureCode);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(pair.procedureCode, {
        name: pair.procedureDisplayName || pair.procedureCode,
        count: 1,
      });
    }
  }

  return Array.from(map.entries())
    .map(([code, data]) => ({ code, name: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count);
}

// ── Granted-autonomy gap (instrument v2, Part A) ─────────────────────────────

/**
 * The entrustment–autonomy gap: how the autonomy granted compared with what
 * the trainee could handle. Signed around the centre-ideal (3): negative =
 * held back, positive = over-extended. Only instrument-v2 pairs carry
 * `autonomyMatch`; legacy pairs are ignored.
 *
 * `audience: "trainee"` → the viewer's own data (≥ CALIBRATION_MIN_PAIRS).
 * `audience: "supervisor"` → how trainees experienced the autonomy this
 * supervisor granted — identification-prevention threshold applies.
 */
export function computeAutonomyGap(
  allPairs: RevealedPairWithContext[],
  audience: "trainee" | "supervisor",
): AutonomyGapStats | null {
  const pairs = fullPairsOnly(allPairs).filter(
    (p): p is RevealedPairWithContext & { autonomyMatch: AutonomyMatchLevel } =>
      p.autonomyMatch != null,
  );
  if (pairs.length === 0) return null;
  if (audience === "trainee") {
    if (pairs.length < CALIBRATION_MIN_PAIRS) return null;
  } else if (!meetsSupervisorAggregateThreshold(pairs)) {
    return null;
  }

  const signed = pairs.map((p) => p.autonomyMatch - 3);
  const meanSignedGap =
    Math.round((signed.reduce((a, b) => a + b, 0) / signed.length) * 100) / 100;
  const heldBack = pairs.filter((p) => p.autonomyMatch <= 2).length;
  const matched = pairs.filter((p) => p.autonomyMatch === 3).length;
  const overExtended = pairs.filter((p) => p.autonomyMatch >= 4).length;
  const rate = (n: number) => Math.round((n / pairs.length) * 100) / 100;

  let direction: AutonomyDirection;
  if (Math.abs(meanSignedGap) < 0.25) direction = "matched";
  else if (meanSignedGap < 0) direction = "held_back";
  else direction = "over_extended";

  const distribution = ([1, 2, 3, 4, 5] as AutonomyMatchLevel[]).map(
    (level) => ({
      level,
      count: pairs.filter((p) => p.autonomyMatch === level).length,
    }),
  );

  const byEntrustmentMap = new Map<
    EntrustmentLevel,
    { sum: number; count: number }
  >();
  for (const p of pairs) {
    const existing = byEntrustmentMap.get(p.supervisorEntrustment);
    if (existing) {
      existing.sum += p.autonomyMatch;
      existing.count += 1;
    } else {
      byEntrustmentMap.set(p.supervisorEntrustment, {
        sum: p.autonomyMatch,
        count: 1,
      });
    }
  }
  const byEntrustment = Array.from(byEntrustmentMap.entries())
    .map(([level, d]) => ({
      level,
      meanMatch: Math.round((d.sum / d.count) * 100) / 100,
      count: d.count,
    }))
    .sort((a, b) => a.level - b.level);

  const monthMap = new Map<string, { sum: number; count: number }>();
  for (const p of pairs) {
    const month = p.revealedAt.slice(0, 7);
    const existing = monthMap.get(month);
    if (existing) {
      existing.sum += p.autonomyMatch - 3;
      existing.count += 1;
    } else {
      monthMap.set(month, { sum: p.autonomyMatch - 3, count: 1 });
    }
  }
  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, d]) => ({
      month,
      meanSignedGap: Math.round((d.sum / d.count) * 100) / 100,
      count: d.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    meanSignedGap,
    heldBackRate: rate(heldBack),
    matchedRate: rate(matched),
    overExtendedRate: rate(overExtended),
    direction,
    totalRated: pairs.length,
    distribution,
    byEntrustment,
    monthlyTrend,
  };
}

// ── BID behaviour frequencies (instrument v2, Part B) ────────────────────────

/**
 * Per-item frequency of the three BID behaviours (briefing / intra-op
 * guidance / debrief). Supervisor-facing — identification-prevention
 * threshold applies over the v2 subset. Null when no v2 pairs.
 */
export function computeBidFrequencies(
  allPairs: RevealedPairWithContext[],
): BidFrequencies | null {
  const pairs = fullPairsOnly(allPairs).filter((p) => p.bid != null);
  if (pairs.length === 0) return null;
  if (!meetsSupervisorAggregateThreshold(pairs)) return null;

  const items = {} as Record<BidItemKey, BidItemFrequency>;
  for (const key of BID_ITEM_KEYS) {
    const counts: [number, number, number] = [0, 0, 0];
    let sum = 0;
    for (const p of pairs) {
      const level = p.bid![key];
      counts[level] += 1;
      sum += level;
    }
    items[key] = {
      counts,
      clearRate: Math.round((counts[2] / pairs.length) * 100) / 100,
      mean: Math.round((sum / pairs.length) * 100) / 100,
    };
  }
  return { items, total: pairs.length };
}
