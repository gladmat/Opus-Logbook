import { describe, it, expect } from "vitest";
import {
  blindIdentifiers,
  finalizeAndIntersect,
  normalizeDiscoveryEmail,
  normalizeDiscoveryPhone,
} from "../psiDiscovery";
import {
  generateEphemeralOprfKey,
  evaluateBlindedPoint,
  evaluateIdentifier,
} from "../../../server/psi";

/** Simulate one server round: evaluate blinded points + build member set. */
function simulateServer(
  payload: { ref: string; point: string }[],
  memberIdentifiers: string[],
) {
  const secretKey = generateEphemeralOprfKey();
  const evaluated = payload.map((b) => ({
    ref: b.ref,
    point: evaluateBlindedPoint(secretKey, b.point),
  }));
  const members = memberIdentifiers
    .map((identifier) => evaluateIdentifier(secretKey, identifier))
    .sort();
  return { evaluated, members };
}

describe("PSI discovery protocol round-trip", () => {
  it("matches exactly the identifiers that are in the server's member set", () => {
    const { payload, contexts } = blindIdentifiers([
      { ref: "c1|email", value: "alice@example.com" },
      { ref: "c2|email", value: "bob@example.com" },
      { ref: "c3|phone", value: "+64211234567" },
    ]);

    const response = simulateServer(payload, [
      "alice@example.com",
      "+64211234567",
      "someone-else@example.com",
    ]);

    const matched = finalizeAndIntersect(
      contexts,
      response.evaluated,
      response.members,
    );

    expect(matched).toEqual(new Set(["c1|email", "c3|phone"]));
  });

  it("matches nothing when the member set is disjoint", () => {
    const { payload, contexts } = blindIdentifiers([
      { ref: "c1|email", value: "alice@example.com" },
    ]);
    const response = simulateServer(payload, ["unrelated@example.com"]);

    expect(
      finalizeAndIntersect(contexts, response.evaluated, response.members),
    ).toEqual(new Set());
  });

  it("blinded payload reveals nothing identifiable and differs per run", () => {
    const a = blindIdentifiers([{ ref: "r", value: "alice@example.com" }]);
    const b = blindIdentifiers([{ ref: "r", value: "alice@example.com" }]);
    // Fresh random blind each run → different wire bytes for same input.
    expect(a.payload[0]?.point).not.toBe(b.payload[0]?.point);
    expect(a.payload[0]?.point).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ephemeral server keys make member sets uncorrelatable across requests", () => {
    const memberIdentifiers = ["alice@example.com"];
    const r1 = simulateServer(
      blindIdentifiers([{ ref: "r", value: "x@example.com" }]).payload,
      memberIdentifiers,
    );
    const r2 = simulateServer(
      blindIdentifiers([{ ref: "r", value: "x@example.com" }]).payload,
      memberIdentifiers,
    );
    expect(r1.members[0]).not.toBe(r2.members[0]);
  });

  it("survives malformed evaluated elements without throwing", () => {
    const { payload, contexts } = blindIdentifiers([
      { ref: "c1|email", value: "alice@example.com" },
    ]);
    const response = simulateServer(payload, ["alice@example.com"]);

    const matched = finalizeAndIntersect(
      contexts,
      [{ ref: "c1|email", point: "00".repeat(32) }],
      response.members,
    );
    expect(matched).toEqual(new Set());
  });

  it("server rejects malformed blinded points by throwing in blindEvaluate", () => {
    const secretKey = generateEphemeralOprfKey();
    expect(() =>
      evaluateBlindedPoint(secretKey, "ff".repeat(32)),
    ).toThrowError();
  });
});

describe("identifier normalization", () => {
  it("lowercases and trims emails (parity with server normalizeEmail)", () => {
    expect(normalizeDiscoveryEmail("  Alice@Example.COM ")).toBe(
      "alice@example.com",
    );
  });

  it("trims phones without reformatting (legacy exact-match parity)", () => {
    expect(normalizeDiscoveryPhone(" +64 21 123 4567 ")).toBe(
      "+64 21 123 4567",
    );
  });
});
