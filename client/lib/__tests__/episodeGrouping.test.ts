import { describe, expect, it } from "vitest";

import type { CaseSummary } from "@/types/caseSummary";
import { groupCaseSummariesByEpisodeId } from "../episodeHelpers";

function summary(
  id: string,
  procedureDate: string,
  episodeId?: string,
): CaseSummary {
  return { id, procedureDate, episodeId } as unknown as CaseSummary;
}

describe("groupCaseSummariesByEpisodeId", () => {
  it("groups by episode in ascending procedure-date order", () => {
    const grouped = groupCaseSummariesByEpisodeId([
      summary("c3", "2026-03-11", "e1"),
      summary("c1", "2026-01-05", "e1"),
      summary("c2", "2026-02-20", "e1"),
      summary("x1", "2026-02-01", "e2"),
    ]);
    expect(grouped.get("e1")?.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(grouped.get("e2")?.map((c) => c.id)).toEqual(["x1"]);
  });

  it("omits summaries without an episode and episodes with no cases", () => {
    const grouped = groupCaseSummariesByEpisodeId([
      summary("c1", "2026-01-05"),
      summary("c2", "2026-01-06", ""),
    ]);
    expect(grouped.size).toBe(0);
    expect(grouped.get("never")).toBeUndefined();
  });
});
