import { describe, it, expect } from "vitest";
import {
  buildDiscoverableIdentifiers,
  padMemberSet,
} from "../discoverableIdentifiers";

describe("buildDiscoverableIdentifiers", () => {
  it("emits email, E.164 phone and reg keys for discoverable users", () => {
    expect(
      buildDiscoverableIdentifiers([
        {
          email: "a@x.com",
          phone: "+64215550100",
          discoverable: true,
          registrationLookupKeys: ["reg:new_zealand:123", "reg:other:ABC"],
        },
      ]),
    ).toEqual([
      "a@x.com",
      "+64215550100",
      "reg:new_zealand:123",
      "reg:other:ABC",
    ]);
  });

  it("skips opt-outs entirely but keeps profile-less users", () => {
    expect(
      buildDiscoverableIdentifiers([
        {
          email: "out@x.com",
          phone: "+64215550100",
          discoverable: false,
          registrationLookupKeys: ["reg:other:1"],
        },
        {
          email: "noprofile@x.com",
          phone: null,
          discoverable: null,
          registrationLookupKeys: null,
        },
      ]),
    ).toEqual(["noprofile@x.com"]);
  });

  it("skips synthetic Apple relay placeholders and non-E.164 phones", () => {
    expect(
      buildDiscoverableIdentifiers([
        {
          email: "apple_abc@private.opus.local",
          phone: "021 555 0100",
          discoverable: true,
          registrationLookupKeys: [],
        },
      ]),
    ).toEqual([]);
  });

  it("deduplicates identical identifiers across rows", () => {
    expect(
      buildDiscoverableIdentifiers([
        {
          email: "a@x.com",
          phone: null,
          discoverable: true,
          registrationLookupKeys: ["reg:other:1"],
        },
        {
          email: "b@x.com",
          phone: null,
          discoverable: true,
          registrationLookupKeys: ["reg:other:1"],
        },
      ]),
    ).toEqual(["a@x.com", "reg:other:1", "b@x.com"]);
  });
});

describe("padMemberSet", () => {
  const real = ["b".repeat(128), "a".repeat(128), "c".repeat(128)];

  it("pads to the next multiple and keeps every real member", () => {
    const padded = padMemberSet(real, 32);
    expect(padded).toHaveLength(32);
    for (const m of real) expect(padded).toContain(m);
    expect(padded).toEqual([...padded].sort());
    for (const m of padded) expect(m).toMatch(/^[0-9a-f]{128}$/);
  });

  it("pads an exact multiple to itself and an empty set to one block", () => {
    const thirtyTwo = Array.from({ length: 32 }, (_, i) =>
      i.toString(16).padStart(128, "0"),
    );
    expect(padMemberSet(thirtyTwo, 32)).toHaveLength(32);
    expect(padMemberSet([], 32)).toHaveLength(32);
  });

  it("uses fresh randomness per call", () => {
    const a = padMemberSet(real, 8).filter((m) => !real.includes(m));
    const b = padMemberSet(real, 8).filter((m) => !real.includes(m));
    expect(a).not.toEqual(b);
  });
});
