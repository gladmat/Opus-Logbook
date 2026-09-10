/**
 * shared/professionalRegistrations.ts — registration lookup keys.
 *
 * Registration numbers match on `reg:<jurisdiction>:<UPPERALNUM>`. The SQL
 * backfill in migrations/20260911_team_linking_identifiers.sql applies the
 * same `upper(regexp_replace(v, '[^A-Za-z0-9]', '', 'g'))`; these tests pin
 * the JS side so the two can't drift apart silently.
 */
import { describe, it, expect } from "vitest";
import {
  PROFESSIONAL_REGISTRATION_JURISDICTIONS,
  PROFESSIONAL_REGISTRATION_OPTIONS,
  buildRegistrationLookupKey,
  buildRegistrationLookupKeys,
  getRegistrationJurisdictionForCountry,
  isProfessionalRegistrationJurisdiction,
  normalizeRegistrationNumber,
} from "@shared/professionalRegistrations";

describe("normalizeRegistrationNumber", () => {
  it("uppercases and strips everything but alphanumerics", () => {
    expect(normalizeRegistrationNumber("12 345-ab")).toBe("12345AB");
    expect(normalizeRegistrationNumber(" med0001234567 ")).toBe(
      "MED0001234567",
    );
    expect(normalizeRegistrationNumber("7.654.321")).toBe("7654321");
  });

  it("returns null for blank or punctuation-only input", () => {
    expect(normalizeRegistrationNumber("")).toBeNull();
    expect(normalizeRegistrationNumber("  - ")).toBeNull();
    expect(normalizeRegistrationNumber(null)).toBeNull();
    expect(normalizeRegistrationNumber(undefined)).toBeNull();
  });
});

describe("buildRegistrationLookupKey", () => {
  it("builds reg:<jurisdiction>:<NORM>", () => {
    expect(buildRegistrationLookupKey("new_zealand", "12 345-ab")).toBe(
      "reg:new_zealand:12345AB",
    );
    expect(buildRegistrationLookupKey("united_kingdom", "7654321")).toBe(
      "reg:united_kingdom:7654321",
    );
  });

  it("is null for an unknown jurisdiction or an empty number", () => {
    expect(buildRegistrationLookupKey("mars", "123")).toBeNull();
    expect(buildRegistrationLookupKey(null, "123")).toBeNull();
    expect(buildRegistrationLookupKey("new_zealand", "")).toBeNull();
    expect(buildRegistrationLookupKey("new_zealand", " - ")).toBeNull();
  });

  it("treats formatting variants as one identity", () => {
    const a = buildRegistrationLookupKey("australia", "MED 0001 234 567");
    const b = buildRegistrationLookupKey("australia", "med0001234567");
    expect(a).toBe(b);
  });
});

describe("buildRegistrationLookupKeys", () => {
  it("emits one sorted key per populated jurisdiction", () => {
    expect(
      buildRegistrationLookupKeys({
        united_kingdom: "76 54 321",
        new_zealand: "12345",
        australia: "",
      }),
    ).toEqual(["reg:new_zealand:12345", "reg:united_kingdom:7654321"]);
  });

  it("falls back to the legacy medicalCouncilNumber keyed by country", () => {
    expect(buildRegistrationLookupKeys(null, "99-887", "new_zealand")).toEqual([
      "reg:new_zealand:99887",
    ]);
    expect(buildRegistrationLookupKeys({}, "99887", "other")).toEqual([
      "reg:other:99887",
    ]);
  });

  it("prefers the JSONB map over the legacy number", () => {
    expect(
      buildRegistrationLookupKeys({ poland: "111" }, "999", "poland"),
    ).toEqual(["reg:poland:111"]);
  });

  it("is empty with nothing to key on", () => {
    expect(buildRegistrationLookupKeys(null, null, "new_zealand")).toEqual([]);
    expect(buildRegistrationLookupKeys({}, "  ", null)).toEqual([]);
  });
});

describe("jurisdiction helpers", () => {
  it("the tuple matches the options list and the guard agrees", () => {
    expect(PROFESSIONAL_REGISTRATION_JURISDICTIONS).toEqual(
      PROFESSIONAL_REGISTRATION_OPTIONS.map((o) => o.id),
    );
    for (const id of PROFESSIONAL_REGISTRATION_JURISDICTIONS) {
      expect(isProfessionalRegistrationJurisdiction(id)).toBe(true);
    }
    expect(isProfessionalRegistrationJurisdiction("mars")).toBe(false);
    expect(isProfessionalRegistrationJurisdiction(undefined)).toBe(false);
  });

  it("maps every selectable country incl. switzerland (regression)", () => {
    expect(getRegistrationJurisdictionForCountry("switzerland")).toBe(
      "switzerland",
    );
    for (const id of PROFESSIONAL_REGISTRATION_JURISDICTIONS) {
      if (id === "other") continue;
      expect(getRegistrationJurisdictionForCountry(id)).toBe(id);
    }
    expect(getRegistrationJurisdictionForCountry("other")).toBeUndefined();
  });
});
