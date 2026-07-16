/**
 * boneTumour — data model for the BoneTumourDetails inline card
 * (bone/digit site + graft donor site for bone tumour curettage/graft,
 * e.g. enchondroma).
 */

import { describe, it, expect } from "vitest";
import {
  BONE_TUMOUR_BONE_LABELS,
  BONE_TUMOUR_BONE_TITLE_LABELS,
  BONE_TUMOUR_PROCEDURE_IDS,
  createEmptyBoneTumourData,
  getBoneTumourSummary,
  getBoneTumourTitleSuffix,
  isDigitBearingBone,
  type BoneTumourBone,
} from "@/types/boneTumour";
import { findPicklistEntry } from "@/lib/procedurePicklist";

describe("createEmptyBoneTumourData", () => {
  it("returns all-null fields", () => {
    expect(createEmptyBoneTumourData()).toEqual({
      bone: null,
      digit: null,
      graftType: null,
      graftDonorSite: null,
    });
  });
});

describe("BONE_TUMOUR_PROCEDURE_IDS", () => {
  it("includes the enchondroma curettage + bone graft procedure", () => {
    expect(BONE_TUMOUR_PROCEDURE_IDS).toContain(
      "hand_elective_curettage_bone_graft",
    );
  });

  it("every gate ID resolves to a real procedure picklist entry", () => {
    for (const id of BONE_TUMOUR_PROCEDURE_IDS) {
      const entry = findPicklistEntry(id);
      expect(entry, `gate ID ${id} must resolve`).toBeTruthy();
    }
  });
});

describe("bone labels", () => {
  const ALL_BONES: BoneTumourBone[] = [
    "metacarpal",
    "proximal_phalanx",
    "middle_phalanx",
    "distal_phalanx",
    "carpal",
    "other",
  ];

  it("every bone has a chip label and a title label", () => {
    for (const bone of ALL_BONES) {
      expect(BONE_TUMOUR_BONE_LABELS[bone]).toBeTruthy();
      expect(BONE_TUMOUR_BONE_TITLE_LABELS[bone]).toBeTruthy();
    }
  });
});

describe("isDigitBearingBone", () => {
  it("digit applies to metacarpal and phalanges", () => {
    expect(isDigitBearingBone("metacarpal")).toBe(true);
    expect(isDigitBearingBone("proximal_phalanx")).toBe(true);
    expect(isDigitBearingBone("middle_phalanx")).toBe(true);
    expect(isDigitBearingBone("distal_phalanx")).toBe(true);
  });

  it("digit does not apply to carpal / other / null", () => {
    expect(isDigitBearingBone("carpal")).toBe(false);
    expect(isDigitBearingBone("other")).toBe(false);
    expect(isDigitBearingBone(null)).toBe(false);
  });
});

describe("getBoneTumourSummary", () => {
  it("returns empty string for empty data", () => {
    expect(getBoneTumourSummary(createEmptyBoneTumourData())).toBe("");
  });

  it("formats bone only", () => {
    expect(
      getBoneTumourSummary({
        bone: "middle_phalanx",
        digit: null,
        graftType: null,
        graftDonorSite: null,
      }),
    ).toBe("Mid phalanx");
  });

  it("formats bone + digit", () => {
    expect(
      getBoneTumourSummary({
        bone: "middle_phalanx",
        digit: "V",
        graftType: null,
        graftDonorSite: null,
      }),
    ).toBe("Mid phalanx, Dig. V");
  });

  it("formats the full enchondroma repro case", () => {
    expect(
      getBoneTumourSummary({
        bone: "middle_phalanx",
        digit: "V",
        graftType: "autograft",
        graftDonorSite: "distal_radius",
      }),
    ).toBe("Mid phalanx, Dig. V · autograft (distal radius)");
  });

  it("omits the graft part when graft is none", () => {
    expect(
      getBoneTumourSummary({
        bone: "metacarpal",
        digit: "I",
        graftType: "none",
        graftDonorSite: null,
      }),
    ).toBe("Metacarpal, Dig. I");
  });

  it("ignores digit on non-digit-bearing bones", () => {
    expect(
      getBoneTumourSummary({
        bone: "carpal",
        digit: "V",
        graftType: null,
        graftDonorSite: null,
      }),
    ).toBe("Carpal bone");
  });

  it("shows graft type without donor site for allograft", () => {
    expect(
      getBoneTumourSummary({
        bone: null,
        digit: null,
        graftType: "allograft",
        graftDonorSite: null,
      }),
    ).toBe("allograft");
  });
});

describe("getBoneTumourTitleSuffix", () => {
  it("returns null when no bone is set", () => {
    expect(getBoneTumourTitleSuffix(createEmptyBoneTumourData())).toBeNull();
  });

  it("returns bone + digit in title casing", () => {
    expect(
      getBoneTumourTitleSuffix({
        bone: "middle_phalanx",
        digit: "V",
        graftType: "autograft",
        graftDonorSite: "distal_radius",
      }),
    ).toBe("middle phalanx, Dig. V");
  });

  it("returns bone only for non-digit-bearing bones", () => {
    expect(
      getBoneTumourTitleSuffix({
        bone: "carpal",
        digit: "V",
        graftType: null,
        graftDonorSite: null,
      }),
    ).toBe("carpal bone");
  });
});
