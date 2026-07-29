import type { FollowUpInterval } from "@/types/case";
import { parseDateOnlyValue } from "@/lib/dateValues";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Derives the closest named follow-up interval from the number of days
 * between the procedure date and the event date. Boundaries sit at the
 * midpoints between the named buckets:
 *
 *   bucket    anchor   accepts (days)
 *   2_weeks     14        0 - 28
 *   6_weeks     42       29 - 66
 *   3_months    91       67 - 136
 *   6_months   182      137 - 273
 *   1_year     365      274 - 548
 *   custom      -        > 548
 *
 * Returns null when either date is missing/unparseable or the event
 * precedes the procedure — the caller keeps manual selection in play.
 */
export function deriveFollowUpInterval(
  procedureDate: string | undefined,
  eventDate: string,
): FollowUpInterval | null {
  const procDate = parseDateOnlyValue(procedureDate);
  const evtDate = parseDateOnlyValue(eventDate);
  if (!procDate || !evtDate) return null;

  const diffDays = Math.round(
    (evtDate.getTime() - procDate.getTime()) / MS_PER_DAY,
  );

  if (diffDays < 0) return null;
  if (diffDays <= 28) return "2_weeks";
  if (diffDays <= 66) return "6_weeks";
  if (diffDays <= 136) return "3_months";
  if (diffDays <= 273) return "6_months";
  if (diffDays <= 548) return "1_year";
  return "custom";
}
