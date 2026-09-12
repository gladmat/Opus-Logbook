import { describe, expect, it } from "vitest";

import {
  EPA_CARD_REFRESH_TTL_MS,
  shouldRefetchEpaCard,
} from "../epaCardRefresh";

describe("shouldRefetchEpaCard", () => {
  it("always fetches on first load", () => {
    expect(
      shouldRefetchEpaCard({
        lastFetchedAt: null,
        now: 1000,
        lastRevision: null,
        revision: 3,
      }),
    ).toBe(true);
  });

  it("serves from the last fetch inside the TTL when nothing was written", () => {
    expect(
      shouldRefetchEpaCard({
        lastFetchedAt: 1000,
        now: 1000 + EPA_CARD_REFRESH_TTL_MS - 1,
        lastRevision: 3,
        revision: 3,
      }),
    ).toBe(false);
  });

  it("refetches once the TTL elapses", () => {
    expect(
      shouldRefetchEpaCard({
        lastFetchedAt: 1000,
        now: 1000 + EPA_CARD_REFRESH_TTL_MS,
        lastRevision: 3,
        revision: 3,
      }),
    ).toBe(true);
  });

  it("refetches immediately after an assessment-storage write (revision bump)", () => {
    expect(
      shouldRefetchEpaCard({
        lastFetchedAt: 1000,
        now: 1001,
        lastRevision: 3,
        revision: 4,
      }),
    ).toBe(true);
  });
});
