import { describe, it, expect } from "vitest";
import {
  getRecipientRegions,
  toggleRecipientRegion,
  buildRecipientRegionPatch,
  formatRecipientRegions,
  unionVesselOptions,
} from "../recipientRegions";
import { RECIPIENT_SITE_SNOMED_MAP, type SnomedRefItem } from "@/types/case";

function vessel(code: string, name: string): SnomedRefItem {
  return {
    id: 0,
    snomedCtCode: code,
    displayName: name,
    commonName: name,
    category: "vessel",
  };
}

describe("getRecipientRegions", () => {
  it("returns the array when present and non-empty", () => {
    expect(
      getRecipientRegions({
        recipientSiteRegion: "hand",
        recipientSiteRegions: ["hand", "forearm"],
      }),
    ).toEqual(["hand", "forearm"]);
  });

  it("falls back to the single field when the array is absent", () => {
    expect(getRecipientRegions({ recipientSiteRegion: "forearm" })).toEqual([
      "forearm",
    ]);
  });

  it("falls back to the single field when the array is empty", () => {
    expect(
      getRecipientRegions({
        recipientSiteRegion: "hand",
        recipientSiteRegions: [],
      }),
    ).toEqual(["hand"]);
  });

  it("returns [] when neither field is set", () => {
    expect(getRecipientRegions({})).toEqual([]);
    expect(getRecipientRegions(undefined)).toEqual([]);
  });
});

describe("toggleRecipientRegion", () => {
  it("appends a new region at the end (order preserved)", () => {
    expect(toggleRecipientRegion(["hand"], "forearm")).toEqual([
      "hand",
      "forearm",
    ]);
  });

  it("removes an already-selected region without reordering survivors", () => {
    expect(
      toggleRecipientRegion(["hand", "forearm", "upper_arm"], "forearm"),
    ).toEqual(["hand", "upper_arm"]);
  });

  it("promotes index 1 to primary when the primary is removed", () => {
    const next = toggleRecipientRegion(["hand", "forearm"], "hand");
    expect(next).toEqual(["forearm"]);
    expect(next[0]).toBe("forearm");
  });

  it("toggles from empty to a single selection", () => {
    expect(toggleRecipientRegion([], "knee")).toEqual(["knee"]);
  });
});

describe("buildRecipientRegionPatch", () => {
  it("mirrors the primary into the single field + SNOMED pair", () => {
    const patch = buildRecipientRegionPatch(["hand", "forearm"]);
    expect(patch.recipientSiteRegion).toBe("hand");
    expect(patch.recipientSiteRegions).toEqual(["hand", "forearm"]);
    expect(patch.recipientSiteSnomedCode).toBe(
      RECIPIENT_SITE_SNOMED_MAP.hand?.code,
    );
    expect(patch.recipientSiteSnomedDisplay).toBe(
      RECIPIENT_SITE_SNOMED_MAP.hand?.display,
    );
  });

  it("re-derives SNOMED when the primary changes", () => {
    const patch = buildRecipientRegionPatch(["forearm"]);
    expect(patch.recipientSiteSnomedCode).toBe(
      RECIPIENT_SITE_SNOMED_MAP.forearm?.code,
    );
  });

  it("clears all four fields on empty selection", () => {
    expect(buildRecipientRegionPatch([])).toEqual({
      recipientSiteRegion: undefined,
      recipientSiteRegions: undefined,
      recipientSiteSnomedCode: undefined,
      recipientSiteSnomedDisplay: undefined,
    });
  });
});

describe("formatRecipientRegions", () => {
  it("renders the canonical label for a single region", () => {
    expect(formatRecipientRegions({ recipientSiteRegion: "head_neck" })).toBe(
      "Head & Neck",
    );
  });

  it("joins multiple regions with ' + ', primary first", () => {
    expect(
      formatRecipientRegions({
        recipientSiteRegion: "hand",
        recipientSiteRegions: ["hand", "forearm"],
      }),
    ).toBe("Hand + Forearm");
  });

  it("returns empty string when nothing is set", () => {
    expect(formatRecipientRegions({})).toBe("");
  });
});

describe("unionVesselOptions", () => {
  it("tags each option with its source region", () => {
    const result = unionVesselOptions([
      { region: "hand", items: [vessel("a1", "Radial artery")] },
      { region: "forearm", items: [vessel("a2", "Ulnar artery")] },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.sourceRegion).toBe("hand");
    expect(result[1]?.sourceRegion).toBe("forearm");
  });

  it("dedups by SNOMED code with the earlier region winning", () => {
    const result = unionVesselOptions([
      { region: "hand", items: [vessel("shared", "Radial artery")] },
      {
        region: "forearm",
        items: [
          vessel("shared", "Radial artery"),
          vessel("a2", "Ulnar artery"),
        ],
      },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.snomedCtCode).toBe("shared");
    expect(result[0]?.sourceRegion).toBe("hand");
  });

  it("preserves per-region order in the merged list", () => {
    const result = unionVesselOptions([
      { region: "hand", items: [vessel("h1", "A"), vessel("h2", "B")] },
      { region: "forearm", items: [vessel("f1", "C")] },
    ]);
    expect(result.map((v) => v.snomedCtCode)).toEqual(["h1", "h2", "f1"]);
  });

  it("returns [] for empty input", () => {
    expect(unionVesselOptions([])).toEqual([]);
  });
});
