/**
 * Pure helpers for the dashboard Recent Cases list.
 *
 * The list renders as a mapped array inside the dashboard ScrollView (a
 * vertical FlatList there is forbidden — VirtualizedList nesting), so it
 * must be capped: every case rendered a full card + encrypted thumbnail.
 */

export const RECENT_CASES_LIMIT = 30;

export interface RecentCasesSeeAllInput {
  /** Cases matching the current filter (before the cap). */
  total: number;
  /** Cases actually rendered. */
  shown: number;
  /** Always show the affordance (e.g. the Shared filter's own screen). */
  forceSeeAll?: boolean;
}

export function resolveRecentCasesSeeAll({
  total,
  shown,
  forceSeeAll = false,
}: RecentCasesSeeAllInput): boolean {
  return forceSeeAll || total > shown;
}

export function capRecentCases<T>(
  cases: readonly T[],
  limit: number = RECENT_CASES_LIMIT,
): T[] {
  return cases.length > limit ? cases.slice(0, limit) : [...cases];
}
