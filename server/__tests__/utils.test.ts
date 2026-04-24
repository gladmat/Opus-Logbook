import { describe, it, expect } from "vitest";
import { normalizeEmail, SNOMED_CONCEPT_ID_RE } from "../utils";

describe("normalizeEmail", () => {
  it("lowercases uppercase input", () => {
    expect(normalizeEmail("Foo@Example.COM")).toBe("foo@example.com");
  });

  it("trims outer whitespace", () => {
    expect(normalizeEmail("  foo@example.com  ")).toBe("foo@example.com");
  });

  it("combines trim and lowercase", () => {
    expect(normalizeEmail(" Foo@Bar.io\n")).toBe("foo@bar.io");
  });

  it("preserves internal dots and plus-aliases", () => {
    // Deliberately does NOT normalise gmail-style aliases — providers differ
    expect(normalizeEmail("first.last+tag@gmail.com")).toBe(
      "first.last+tag@gmail.com",
    );
  });

  it("treats already-lowercased emails idempotently", () => {
    const input = "foo@bar.io";
    expect(normalizeEmail(input)).toBe(input);
    expect(normalizeEmail(normalizeEmail(input))).toBe(input);
  });
});

describe("SNOMED_CONCEPT_ID_RE", () => {
  it("accepts pure numeric IDs of 1–18 digits", () => {
    expect(SNOMED_CONCEPT_ID_RE.test("1")).toBe(true);
    expect(SNOMED_CONCEPT_ID_RE.test("123456789")).toBe(true);
    expect(SNOMED_CONCEPT_ID_RE.test("1".repeat(18))).toBe(true);
  });

  it("rejects strings with non-digit characters", () => {
    expect(SNOMED_CONCEPT_ID_RE.test("123&foo=bar")).toBe(false);
    expect(SNOMED_CONCEPT_ID_RE.test("12 3")).toBe(false);
    expect(SNOMED_CONCEPT_ID_RE.test("12-3")).toBe(false);
    expect(SNOMED_CONCEPT_ID_RE.test("abc")).toBe(false);
  });

  it("rejects empty or overlong input", () => {
    expect(SNOMED_CONCEPT_ID_RE.test("")).toBe(false);
    expect(SNOMED_CONCEPT_ID_RE.test("1".repeat(19))).toBe(false);
  });
});
