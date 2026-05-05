import { describe, expect, it, vi } from "vitest";
import { calculateAgeFromDob, getPatientDisplayName } from "@/types/case";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => {}),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
}));

vi.mock("@noble/hashes/hmac.js", () => ({
  hmac: vi.fn(() => new Uint8Array(32)),
}));

vi.mock("@noble/hashes/sha2.js", () => ({
  sha256: {},
}));

vi.mock("@noble/hashes/utils.js", () => ({
  bytesToHex: vi.fn(() => "hmac-hash"),
  hexToBytes: vi.fn(() => new Uint8Array(32)),
  randomBytes: vi.fn(() => new Uint8Array(32)),
  utf8ToBytes: vi.fn(() => new Uint8Array(0)),
}));

describe("calculateAgeFromDob", () => {
  it("returns undefined for empty/undefined DOB", () => {
    expect(calculateAgeFromDob(undefined)).toBeUndefined();
    expect(calculateAgeFromDob("")).toBeUndefined();
  });

  it("calculates age correctly for a past date", () => {
    // Reference: 2024-06-15
    const ref = new Date(2024, 5, 15); // June 15, 2024
    expect(calculateAgeFromDob("1990-01-01", ref)).toBe(34);
  });

  it("handles birthday not yet reached this year", () => {
    // Reference: 2024-03-01, DOB: 1990-06-15 → still 33
    const ref = new Date(2024, 2, 1); // March 1, 2024
    expect(calculateAgeFromDob("1990-06-15", ref)).toBe(33);
  });

  it("handles exact birthday", () => {
    const ref = new Date(2024, 5, 15); // June 15, 2024
    expect(calculateAgeFromDob("1990-06-15", ref)).toBe(34);
  });

  it("returns undefined for invalid date string", () => {
    expect(calculateAgeFromDob("not-a-date")).toBeUndefined();
  });
});

describe("getPatientDisplayName", () => {
  it("returns full name when both parts present", () => {
    expect(
      getPatientDisplayName({
        patientFirstName: "John",
        patientLastName: "Smith",
      }),
    ).toBe("John Smith");
  });

  it("returns first name only", () => {
    expect(getPatientDisplayName({ patientFirstName: "John" })).toBe("John");
  });

  it("returns last name only", () => {
    expect(getPatientDisplayName({ patientLastName: "Smith" })).toBe("Smith");
  });

  it("returns undefined when no name fields", () => {
    expect(getPatientDisplayName({})).toBeUndefined();
  });
});
