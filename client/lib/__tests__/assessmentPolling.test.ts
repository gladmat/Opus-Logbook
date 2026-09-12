import { describe, expect, it } from "vitest";

import {
  assessmentPollKey,
  isBothRevealed,
  shouldPollForReveal,
  type PollableStatus,
} from "../assessmentPolling";

function status(
  my: PollableStatus["myAssessment"],
  other: PollableStatus["otherAssessment"] = null,
): PollableStatus {
  return { myAssessment: my, otherAssessment: other };
}

describe("shouldPollForReveal", () => {
  it("is false with no status or no own assessment", () => {
    expect(shouldPollForReveal(null)).toBe(false);
    expect(shouldPollForReveal(status(null))).toBe(false);
  });

  it("is true while own assessment is committed but not revealed", () => {
    expect(shouldPollForReveal(status({ id: "a", revealedAt: null }))).toBe(
      true,
    );
  });

  it("is false once own assessment is revealed", () => {
    expect(
      shouldPollForReveal(status({ id: "a", revealedAt: "2026-09-12" })),
    ).toBe(false);
  });
});

describe("assessmentPollKey", () => {
  it("is identical for two structurally-equal fetches (the loop regression)", () => {
    const a = status(
      { id: "a", revealedAt: null, committedAt: "t1", hasContent: false },
      { id: "b", revealedAt: null, committedAt: null },
    );
    const b = status(
      { id: "a", revealedAt: null, committedAt: "t1", hasContent: false },
      { id: "b", revealedAt: null, committedAt: null },
    );
    expect(a).not.toBe(b);
    expect(assessmentPollKey(a)).toBe(assessmentPollKey(b));
  });

  it("changes when any poll-relevant field changes", () => {
    const base = status(
      { id: "a", revealedAt: null, committedAt: "t1", hasContent: false },
      { id: "b", revealedAt: null, committedAt: null, hasContent: false },
    );
    const key = assessmentPollKey(base);
    const variants: PollableStatus[] = [
      status(
        { id: "a", revealedAt: "r", committedAt: "t1", hasContent: false },
        base.otherAssessment,
      ),
      status(
        { id: "a", revealedAt: null, committedAt: "t1", hasContent: true },
        base.otherAssessment,
      ),
      status(base.myAssessment, {
        id: "c",
        revealedAt: null,
        committedAt: null,
        hasContent: false,
      }),
      status(base.myAssessment, {
        id: "b",
        revealedAt: null,
        committedAt: "t2",
        hasContent: false,
      }),
      status(base.myAssessment, null),
    ];
    for (const v of variants) {
      expect(assessmentPollKey(v)).not.toBe(key);
    }
  });

  it("returns an empty key for a null status", () => {
    expect(assessmentPollKey(null)).toBe("");
  });
});

describe("isBothRevealed", () => {
  it("requires both sides revealed", () => {
    expect(isBothRevealed(null)).toBe(false);
    expect(isBothRevealed(status({ id: "a", revealedAt: "r" }, null))).toBe(
      false,
    );
    expect(
      isBothRevealed(
        status({ id: "a", revealedAt: "r" }, { id: "b", revealedAt: null }),
      ),
    ).toBe(false);
    expect(
      isBothRevealed(
        status({ id: "a", revealedAt: "r" }, { id: "b", revealedAt: "r2" }),
      ),
    ).toBe(true);
  });
});
