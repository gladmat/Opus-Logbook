import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { createIdentifierBudget } from "../rateLimit";

function run(
  mw: ReturnType<typeof createIdentifierBudget>,
  userId: string,
  contacts: number,
) {
  const req = {
    userId,
    body: { contacts: Array(contacts).fill({}) },
    ip: "1.1.1.1",
  } as unknown as Request;
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  const setHeader = vi.fn();
  const res = { status, json, setHeader } as unknown as Response;
  const next = vi.fn();
  mw(req, res, next);
  return {
    passed: next.mock.calls.length === 1,
    status: status.mock.calls[0]?.[0],
  };
}

describe("createIdentifierBudget", () => {
  const mk = (now: () => number) =>
    createIdentifierBudget({
      windowMs: 600_000,
      budget: 100,
      weigh: (req) => (req.body as { contacts: unknown[] }).contacts.length,
      message: "too many",
      now,
    });

  it("counts identifiers, not requests: 40 + 40 pass, the third 40 is 429", () => {
    const mw = mk(() => 0);
    expect(run(mw, "u1", 40).passed).toBe(true);
    expect(run(mw, "u1", 40).passed).toBe(true);
    expect(run(mw, "u1", 40)).toEqual({ passed: false, status: 429 });
    // Room for exactly the remaining 20.
    expect(run(mw, "u1", 20).passed).toBe(true);
    expect(run(mw, "u1", 1).passed).toBe(false);
  });

  it("buckets are per user", () => {
    const mw = mk(() => 0);
    expect(run(mw, "u1", 100).passed).toBe(true);
    expect(run(mw, "u2", 100).passed).toBe(true);
    expect(run(mw, "u1", 1).passed).toBe(false);
  });

  it("resets when the window elapses", () => {
    let t = 0;
    const mw = mk(() => t);
    expect(run(mw, "u1", 100).passed).toBe(true);
    expect(run(mw, "u1", 1).passed).toBe(false);
    t = 600_001;
    expect(run(mw, "u1", 100).passed).toBe(true);
  });
});
