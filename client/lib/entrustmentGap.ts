/**
 * entrustmentGap — audience-aware copy for the supervisor-vs-self
 * entrustment comparison shown at reveal.
 *
 * Both parties open the same reveal screen. The comparison is the same
 * two numbers, but the sentence that explains it must address the reader:
 * a trainee reads about their own self-assessment, a supervisor reads
 * about their trainee's. Before 2.25.0 the screen rendered the trainee
 * wording to everyone, so a supervisor who rated 4 against a trainee's 3
 * was told "You may be underestimating yourself".
 *
 * `gap = supervisor − self`: positive means the supervisor saw MORE
 * independence than the trainee claimed.
 */

import type { AssessorRole, EntrustmentLevel } from "@/types/sharing";

export type GapTone = "success" | "warning" | "error";

export interface EntrustmentGapInfo {
  message: string;
  color: GapTone;
  /** Signed supervisor − self difference. */
  gap: number;
}

const TRAINEE_COPY = {
  aligned: "Aligned",
  plus1: "You may be underestimating yourself",
  minus1: "Close alignment — minor difference",
  plus2: "Your supervisor sees more independence than you do",
  minus2: "Your supervisor sees room for growth here",
  plus3: "Significant gap — you may be too self-critical",
  minus3: "Significant gap — worth discussing together",
} as const;

const SUPERVISOR_COPY = {
  aligned: "Aligned — your trainee sees it the same way",
  plus1: "You saw more independence than your trainee did",
  minus1: "Your trainee rated themselves one level higher than you did",
  plus2: "Your trainee may be under-selling themselves — worth saying so",
  minus2: "Your trainee sees more independence than you did — worth a debrief",
  plus3: "Significant gap — your trainee is far more self-critical than you",
  minus3: "Significant gap — worth discussing together",
} as const;

export function getEntrustmentGapInfo(
  supervisorRating: EntrustmentLevel,
  traineeRating: EntrustmentLevel,
  audience: AssessorRole,
): EntrustmentGapInfo {
  const copy = audience === "supervisor" ? SUPERVISOR_COPY : TRAINEE_COPY;
  const gap = supervisorRating - traineeRating;
  const absGap = Math.abs(gap);

  if (absGap === 0) return { message: copy.aligned, color: "success", gap };
  if (absGap === 1) {
    return {
      message: gap > 0 ? copy.plus1 : copy.minus1,
      color: "success",
      gap,
    };
  }
  if (absGap === 2) {
    return {
      message: gap > 0 ? copy.plus2 : copy.minus2,
      color: "warning",
      gap,
    };
  }
  return {
    message: gap > 0 ? copy.plus3 : copy.minus3,
    color: "error",
    gap,
  };
}
