import { describe, expect, it } from "vitest";

import {
  RECENT_CASES_LIMIT,
  capRecentCases,
  resolveRecentCasesSeeAll,
} from "../recentCases";

describe("capRecentCases", () => {
  it("keeps the newest N (input order) and never mutates the input", () => {
    const input = Array.from({ length: RECENT_CASES_LIMIT + 5 }, (_, i) => ({
      id: `c${i}`,
    }));
    const capped = capRecentCases(input);
    expect(capped).toHaveLength(RECENT_CASES_LIMIT);
    expect(capped[0]?.id).toBe("c0");
    expect(capped[RECENT_CASES_LIMIT - 1]?.id).toBe(
      `c${RECENT_CASES_LIMIT - 1}`,
    );
    expect(input).toHaveLength(RECENT_CASES_LIMIT + 5);
  });

  it("returns a copy when under the cap", () => {
    const input = [{ id: "a" }, { id: "b" }];
    const capped = capRecentCases(input);
    expect(capped).toEqual(input);
    expect(capped).not.toBe(input);
  });
});

describe("resolveRecentCasesSeeAll", () => {
  it("shows the affordance only when cases were hidden by the cap or forced", () => {
    expect(resolveRecentCasesSeeAll({ total: 10, shown: 10 })).toBe(false);
    expect(resolveRecentCasesSeeAll({ total: 31, shown: 30 })).toBe(true);
    expect(
      resolveRecentCasesSeeAll({ total: 2, shown: 2, forceSeeAll: true }),
    ).toBe(true);
  });
});
