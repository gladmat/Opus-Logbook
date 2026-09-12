/**
 * Pure projections over stored EPA records (targets + exposures per case).
 * The storage layer decrypts each record ONCE via `getAllEpaTargetRecords`;
 * these helpers split the result into the two shapes the pending-EPA and
 * Training surfaces consume, without a second decrypt.
 */

import type { EpaAssessmentTarget, EpaExposureRecord } from "./epaDerivation";

export interface EpaTargetsRecordWithCase {
  caseId: string;
  targets: EpaAssessmentTarget[];
  exposures: EpaExposureRecord[];
}

export interface EpaTargetsWithCase {
  caseId: string;
  targets: EpaAssessmentTarget[];
}

export interface EpaExposuresWithCase {
  caseId: string;
  exposures: EpaExposureRecord[];
}

export interface SplitEpaRecords {
  targetsByCase: EpaTargetsWithCase[];
  exposuresByCase: EpaExposuresWithCase[];
}

/** Drop empty sides; keep per-case grouping and input order. */
export function splitEpaRecords(
  records: readonly EpaTargetsRecordWithCase[],
): SplitEpaRecords {
  const targetsByCase: EpaTargetsWithCase[] = [];
  const exposuresByCase: EpaExposuresWithCase[] = [];
  for (const record of records) {
    if (record.targets.length > 0) {
      targetsByCase.push({ caseId: record.caseId, targets: record.targets });
    }
    if (record.exposures.length > 0) {
      exposuresByCase.push({
        caseId: record.caseId,
        exposures: record.exposures,
      });
    }
  }
  return { targetsByCase, exposuresByCase };
}
