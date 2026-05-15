/**
 * Episode helpers — suggest episode type and title from specialty/diagnosis
 * context. Used in InlineEpisodeCreator and the on-save bridge that creates
 * episodes for pending cancer-pathway lesions. Drift here = wrong episode
 * type assigned silently (e.g. a burn case routed into a cancer pathway).
 */

import { describe, it, expect } from "vitest";
import { suggestEpisodeType, suggestEpisodeTitle } from "@/lib/episodeHelpers";

describe("suggestEpisodeType", () => {
  it("matches exact subcategory keys", () => {
    expect(suggestEpisodeType("general", "wound_management")).toBe(
      "wound_management",
    );
    expect(suggestEpisodeType("burns", "burns")).toBe("burns_management");
    expect(suggestEpisodeType("skin_cancer", "melanoma")).toBe(
      "cancer_pathway",
    );
    expect(suggestEpisodeType("orthoplastic", "microsurgery")).toBe(
      "multi_stage_microsurgery",
    );
    expect(suggestEpisodeType("general", "abscess")).toBe(
      "infection_management",
    );
  });

  it("normalises whitespace and hyphens to underscores", () => {
    expect(suggestEpisodeType("general", "Wound Management")).toBe(
      "wound_management",
    );
    expect(suggestEpisodeType("general", "skin-graft")).toBe(
      "wound_management",
    );
  });

  it("falls back via partial match when the normalised key isn't a direct hit", () => {
    // "skin cancer pathway" → "skin_cancer_pathway" → partial-matches `skin_cancer`
    expect(suggestEpisodeType("general", "skin cancer pathway")).toBe(
      "cancer_pathway",
    );
    // "burns reconstruction" → matches burns_reconstruction
    expect(suggestEpisodeType("burns", "burns reconstruction")).toBe(
      "burns_management",
    );
  });

  it("uses specialty fallback when no subcategory match", () => {
    expect(suggestEpisodeType("burns", undefined)).toBe("burns_management");
    expect(suggestEpisodeType("breast", undefined)).toBe(
      "staged_reconstruction",
    );
    expect(suggestEpisodeType("orthoplastic", undefined)).toBe(
      "staged_reconstruction",
    );
  });

  it("returns 'other' when no subcategory + no specialty fallback", () => {
    expect(suggestEpisodeType("general", undefined)).toBe("other");
    expect(suggestEpisodeType("aesthetics", undefined)).toBe("other");
  });

  it("returns 'other' when subcategory is empty string", () => {
    // Empty string is falsy — short-circuits the subcategory branch and falls
    // through to the specialty fallback.
    expect(suggestEpisodeType("general", "")).toBe("other");
  });
});

describe("suggestEpisodeTitle", () => {
  it("returns empty string for missing diagnosisName", () => {
    expect(suggestEpisodeTitle(undefined)).toBe("");
    expect(suggestEpisodeTitle("")).toBe("");
  });

  it("appends 'management' when not already implied", () => {
    expect(suggestEpisodeTitle("Diabetic foot ulcer")).toBe(
      "Diabetic foot ulcer management",
    );
  });

  it("preserves diagnosis when it already implies management", () => {
    expect(suggestEpisodeTitle("Burns management")).toBe("Burns management");
    expect(suggestEpisodeTitle("Cancer pathway")).toBe("Cancer pathway");
    expect(suggestEpisodeTitle("DIEP reconstruction")).toBe(
      "DIEP reconstruction",
    );
    expect(suggestEpisodeTitle("Tendon repair")).toBe("Tendon repair");
  });

  it("prepends laterality letter (L/R/Bilat) for non-midline sides", () => {
    expect(suggestEpisodeTitle("Forearm sarcoma", "left")).toBe(
      "L Forearm sarcoma management",
    );
    expect(suggestEpisodeTitle("Forearm sarcoma", "right")).toBe(
      "R Forearm sarcoma management",
    );
    expect(suggestEpisodeTitle("Inguinal lymphadenectomy", "bilateral")).toBe(
      "Bilat Inguinal lymphadenectomy management",
    );
  });

  it("omits laterality prefix for midline", () => {
    expect(suggestEpisodeTitle("Sacral pressure injury", "midline")).toBe(
      "Sacral pressure injury management",
    );
  });

  it("strips parenthetical content and trailing comma fragments", () => {
    expect(suggestEpisodeTitle("BCC (nodular type), forehead")).toBe(
      "BCC management",
    );
    expect(suggestEpisodeTitle("Hand fracture (5th metacarpal, base)")).toBe(
      "Hand fracture management",
    );
  });
});
