import { describe, it, expect } from "vitest";
import { getEntrustmentGapInfo } from "@/lib/entrustmentGap";
import type { EntrustmentLevel } from "@/types/sharing";

// Both audiences see the SAME two numbers; only the sentence addressing the
// reader changes. The trainee rows freeze the pre-2.25.0 wording — that is
// what every viewer used to see — so a copy edit can't silently drift.

const cases: {
  sup: EntrustmentLevel;
  self: EntrustmentLevel;
  gap: number;
  color: "success" | "warning" | "error";
  trainee: string;
  supervisor: string;
}[] = [
  {
    sup: 3,
    self: 3,
    gap: 0,
    color: "success",
    trainee: "Aligned",
    supervisor: "Aligned — your trainee sees it the same way",
  },
  {
    sup: 4,
    self: 3,
    gap: 1,
    color: "success",
    trainee: "You may be underestimating yourself",
    supervisor: "You saw more independence than your trainee did",
  },
  {
    sup: 3,
    self: 4,
    gap: -1,
    color: "success",
    trainee: "Close alignment — minor difference",
    supervisor: "Your trainee rated themselves one level higher than you did",
  },
  {
    sup: 5,
    self: 3,
    gap: 2,
    color: "warning",
    trainee: "Your supervisor sees more independence than you do",
    supervisor:
      "Your trainee may be under-selling themselves — worth saying so",
  },
  {
    sup: 2,
    self: 4,
    gap: -2,
    color: "warning",
    trainee: "Your supervisor sees room for growth here",
    supervisor:
      "Your trainee sees more independence than you did — worth a debrief",
  },
  {
    sup: 5,
    self: 2,
    gap: 3,
    color: "error",
    trainee: "Significant gap — you may be too self-critical",
    supervisor:
      "Significant gap — your trainee is far more self-critical than you",
  },
  {
    sup: 1,
    self: 4,
    gap: -3,
    color: "error",
    trainee: "Significant gap — worth discussing together",
    supervisor: "Significant gap — worth discussing together",
  },
  {
    sup: 1,
    self: 5,
    gap: -4,
    color: "error",
    trainee: "Significant gap — worth discussing together",
    supervisor: "Significant gap — worth discussing together",
  },
];

describe("getEntrustmentGapInfo", () => {
  for (const c of cases) {
    it(`sup ${c.sup} / self ${c.self} → trainee wording`, () => {
      const r = getEntrustmentGapInfo(c.sup, c.self, "trainee");
      expect(r.message).toBe(c.trainee);
      expect(r.color).toBe(c.color);
      expect(r.gap).toBe(c.gap);
    });
    it(`sup ${c.sup} / self ${c.self} → supervisor wording`, () => {
      const r = getEntrustmentGapInfo(c.sup, c.self, "supervisor");
      expect(r.message).toBe(c.supervisor);
      expect(r.color).toBe(c.color);
      expect(r.gap).toBe(c.gap);
    });
  }

  it("the reported bug: a supervisor is never told they underestimate THEMSELVES", () => {
    for (let sup = 1; sup <= 5; sup++) {
      for (let self = 1; self <= 5; self++) {
        const r = getEntrustmentGapInfo(
          sup as EntrustmentLevel,
          self as EntrustmentLevel,
          "supervisor",
        );
        expect(r.message).not.toMatch(/yourself/i);
        expect(r.message).not.toMatch(/your supervisor/i);
      }
    }
  });

  it("the trainee is never addressed as if they had a trainee", () => {
    for (let sup = 1; sup <= 5; sup++) {
      for (let self = 1; self <= 5; self++) {
        const r = getEntrustmentGapInfo(
          sup as EntrustmentLevel,
          self as EntrustmentLevel,
          "trainee",
        );
        expect(r.message).not.toMatch(/your trainee/i);
      }
    }
  });
});
