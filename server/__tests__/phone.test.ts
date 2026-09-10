/**
 * shared/phone.ts — E.164 canonicalisation for colleague matching.
 *
 * Every phone that enters `profiles.phone`, `team_contacts.phone`, the PSI
 * member set, or a search query goes through normalizePhoneE164. These
 * tests pin the contract: national-format input resolves with a region,
 * `+CC` input resolves without one, invalid input is null (never throws).
 */
import { describe, it, expect } from "vitest";
import {
  E164_RE,
  formatPhoneForDisplay,
  getDefaultPhoneRegion,
  isE164,
  normalizePhoneE164,
} from "@shared/phone";

describe("normalizePhoneE164", () => {
  it("resolves NZ national format with the NZ region", () => {
    expect(normalizePhoneE164("021 123 4567", "NZ")).toBe("+64211234567");
    expect(normalizePhoneE164("0211234567", "NZ")).toBe("+64211234567");
    expect(normalizePhoneE164("(021) 123-4567", "NZ")).toBe("+64211234567");
  });

  it("resolves AU / GB / PL national formats", () => {
    expect(normalizePhoneE164("0412 345 678", "AU")).toBe("+61412345678");
    expect(normalizePhoneE164("07911 123456", "GB")).toBe("+447911123456");
    expect(normalizePhoneE164("512 345 678", "PL")).toBe("+48512345678");
  });

  it("passes E.164 input through regardless of region", () => {
    expect(normalizePhoneE164("+64211234567")).toBe("+64211234567");
    expect(normalizePhoneE164("+64211234567", "GB")).toBe("+64211234567");
  });

  it("treats spaced international input as the same identity", () => {
    expect(normalizePhoneE164(" +64 21 123 4567 ")).toBe("+64211234567");
    expect(normalizePhoneE164("0064211234567")).toBe("+64211234567");
  });

  it("returns null for blank input", () => {
    expect(normalizePhoneE164("")).toBeNull();
    expect(normalizePhoneE164("   ")).toBeNull();
    expect(normalizePhoneE164(null)).toBeNull();
    expect(normalizePhoneE164(undefined)).toBeNull();
  });

  it("returns null for national format without a region", () => {
    expect(normalizePhoneE164("021 123 4567")).toBeNull();
  });

  it("returns null for invalid numbers instead of throwing", () => {
    expect(normalizePhoneE164("12", "NZ")).toBeNull();
    expect(normalizePhoneE164("not a phone", "NZ")).toBeNull();
    expect(normalizePhoneE164("+999 1", "NZ")).toBeNull();
  });
});

describe("isE164 / E164_RE", () => {
  it("accepts canonical E.164 and rejects everything else", () => {
    expect(isE164("+64211234567")).toBe(true);
    expect(isE164("64211234567")).toBe(false);
    expect(isE164("+0211234567")).toBe(false);
    expect(isE164("+64 21 123 4567")).toBe(false);
    expect(E164_RE.test("+1234567890123456")).toBe(false); // 16 digits
  });
});

describe("getDefaultPhoneRegion", () => {
  it("maps every supported countryOfPractice to an ISO region", () => {
    expect(getDefaultPhoneRegion("new_zealand")).toBe("NZ");
    expect(getDefaultPhoneRegion("australia")).toBe("AU");
    expect(getDefaultPhoneRegion("united_kingdom")).toBe("GB");
    expect(getDefaultPhoneRegion("united_states")).toBe("US");
    expect(getDefaultPhoneRegion("poland")).toBe("PL");
    expect(getDefaultPhoneRegion("germany")).toBe("DE");
    expect(getDefaultPhoneRegion("switzerland")).toBe("CH");
    expect(getDefaultPhoneRegion("canada")).toBe("CA");
    expect(getDefaultPhoneRegion("austria")).toBe("AT");
  });

  it("returns undefined for other / unknown / missing", () => {
    expect(getDefaultPhoneRegion("other")).toBeUndefined();
    expect(getDefaultPhoneRegion(null)).toBeUndefined();
    expect(getDefaultPhoneRegion(undefined)).toBeUndefined();
  });
});

describe("formatPhoneForDisplay", () => {
  it("formats E.164 internationally and falls back verbatim", () => {
    expect(formatPhoneForDisplay("+64211234567")).toBe("+64 21 123 4567");
    expect(formatPhoneForDisplay("garbage")).toBe("garbage");
  });
});
