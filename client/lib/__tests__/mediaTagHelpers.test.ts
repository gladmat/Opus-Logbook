import { describe, expect, it } from "vitest";

import {
  DAY_OF_SURGERY_TAGS,
  deriveDateForTemporalTag,
  resolveMediaTag,
  suggestTemporalTag,
  suggestDefaultMediaTag,
} from "@/lib/mediaTagHelpers";
import {
  MEDIA_TAG_REGISTRY,
  getPreferredMediaTagGroup,
  getRelevantGroups,
} from "@/types/media";
import type { TimelineEventType } from "@/types/case";
import type { MediaTag, MediaTagGroup } from "@/types/media";

// ===============================================================
// resolveMediaTag
// ===============================================================

describe("resolveMediaTag", () => {
  it("returns tag when present and valid", () => {
    expect(resolveMediaTag({ tag: "flap_harvest" })).toBe("flap_harvest");
  });

  it('returns "other" when tag is absent', () => {
    expect(resolveMediaTag({})).toBe("other");
  });

  it('returns "other" when tag is undefined', () => {
    expect(resolveMediaTag({ tag: undefined })).toBe("other");
  });

  it('returns "other" for invalid tag', () => {
    expect(resolveMediaTag({ tag: "totally_invalid_tag" as MediaTag })).toBe(
      "other",
    );
  });

  it("returns valid tag for every tag in the registry", () => {
    for (const tag of Object.keys(MEDIA_TAG_REGISTRY) as MediaTag[]) {
      expect(resolveMediaTag({ tag })).toBe(tag);
    }
  });
});

// ===============================================================
// Registry completeness
// ===============================================================

describe("registry completeness", () => {
  it("has exactly 64 tags in the registry", () => {
    expect(Object.keys(MEDIA_TAG_REGISTRY)).toHaveLength(64);
  });

  it("has no duplicate tags in the registry", () => {
    const tags = Object.keys(MEDIA_TAG_REGISTRY);
    const unique = new Set(tags);
    expect(tags.length).toBe(unique.size);
  });
});

// ===============================================================
// getRelevantGroups
// ===============================================================

describe("getRelevantGroups", () => {
  it("always includes temporal, imaging, and other", () => {
    const groups = getRelevantGroups();
    expect(groups).toContain("temporal");
    expect(groups).toContain("imaging");
    expect(groups).toContain("other");
  });

  it("includes flap_surgery for free_flap procedureTag", () => {
    const groups = getRelevantGroups(undefined, ["free_flap"]);
    expect(groups).toContain("flap_surgery");
  });

  it("includes flap_surgery for microsurgery procedureTag", () => {
    const groups = getRelevantGroups(undefined, ["microsurgery"]);
    expect(groups).toContain("flap_surgery");
  });

  it("does not include skin_cancer for skin_cancer specialty alone (diagnosis-driven only)", () => {
    const groups = getRelevantGroups("skin_cancer");
    expect(groups).not.toContain("skin_cancer");
  });

  it("includes skin_cancer for hasSkinCancerAssessment regardless of specialty", () => {
    const groups = getRelevantGroups("orthoplastic", undefined, true);
    expect(groups).toContain("skin_cancer");
  });

  it("includes skin_cancer for hasSkinCancerAssessment with no specialty", () => {
    const groups = getRelevantGroups(undefined, undefined, true);
    expect(groups).toContain("skin_cancer");
  });

  it("includes skin_cancer for hasSkinCancerAssessment with skin_cancer specialty", () => {
    const groups = getRelevantGroups("skin_cancer", undefined, true);
    expect(groups).toContain("skin_cancer");
  });

  it("includes aesthetic for aesthetics specialty", () => {
    const groups = getRelevantGroups("aesthetics");
    expect(groups).toContain("aesthetic");
  });

  it("includes aesthetic for breast specialty", () => {
    const groups = getRelevantGroups("breast");
    expect(groups).toContain("aesthetic");
  });

  it("includes hand_function for hand_wrist specialty", () => {
    const groups = getRelevantGroups("hand_wrist");
    expect(groups).toContain("hand_function");
  });

  it("does not include specialty groups for burns", () => {
    const groups = getRelevantGroups("burns");
    expect(groups).not.toContain("flap_surgery");
    expect(groups).not.toContain("skin_cancer");
    expect(groups).not.toContain("aesthetic");
    expect(groups).not.toContain("hand_function");
  });

  it("does not include skin_cancer for head_neck or general without assessment", () => {
    expect(getRelevantGroups("head_neck")).not.toContain("skin_cancer");
    expect(getRelevantGroups("general")).not.toContain("skin_cancer");
  });

  it("always returns temporal as the first group", () => {
    const groups = getRelevantGroups();
    expect(groups[0]).toBe("temporal");
  });

  it("always returns other as the last group", () => {
    const groups = getRelevantGroups();
    expect(groups[groups.length - 1]).toBe("other");
  });

  it("returns groups as an array of valid MediaTagGroup values", () => {
    const validGroups: MediaTagGroup[] = [
      "temporal",
      "imaging",
      "flap_surgery",
      "skin_cancer",
      "aesthetic",
      "hand_function",
      "other",
    ];
    const groups = getRelevantGroups("hand_wrist", ["free_flap"], true);
    for (const group of groups) {
      expect(validGroups).toContain(group);
    }
  });
});

// ===============================================================
// suggestTemporalTag
// ===============================================================

describe("suggestTemporalTag", () => {
  const REFERENCE_DATE = "2026-03-10";

  function daysAgo(days: number): string {
    const d = new Date(`${REFERENCE_DATE}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().split("T")[0]!;
  }

  it('returns "preop_clinical" when no procedureDate is provided', () => {
    expect(suggestTemporalTag()).toBe("preop_clinical");
    expect(suggestTemporalTag(undefined)).toBe("preop_clinical");
  });

  it('returns "preop_clinical" for invalid date string', () => {
    expect(suggestTemporalTag("not-a-date")).toBe("preop_clinical");
  });

  it('returns "preop_clinical" for future date', () => {
    const future = new Date(`${REFERENCE_DATE}T12:00:00Z`);
    future.setUTCDate(future.getUTCDate() + 7);
    const futureStr = future.toISOString().split("T")[0]!;
    expect(suggestTemporalTag(futureStr, REFERENCE_DATE)).toBe(
      "preop_clinical",
    );
  });

  it('returns "intraop" for today', () => {
    expect(suggestTemporalTag(daysAgo(0), REFERENCE_DATE)).toBe("intraop");
  });

  it('returns "postop_early" for 1 day ago', () => {
    expect(suggestTemporalTag(daysAgo(1), REFERENCE_DATE)).toBe("postop_early");
  });

  it('returns "postop_early" for 7 days ago', () => {
    expect(suggestTemporalTag(daysAgo(7), REFERENCE_DATE)).toBe("postop_early");
  });

  it('returns "postop_mid" for 8 days ago', () => {
    expect(suggestTemporalTag(daysAgo(8), REFERENCE_DATE)).toBe("postop_mid");
  });

  it('returns "postop_mid" for 42 days ago (6 weeks)', () => {
    expect(suggestTemporalTag(daysAgo(42), REFERENCE_DATE)).toBe("postop_mid");
  });

  it('returns "followup_3m" for 43 days ago', () => {
    expect(suggestTemporalTag(daysAgo(43), REFERENCE_DATE)).toBe("followup_3m");
  });

  it('returns "followup_3m" for 90 days ago (~3 months)', () => {
    expect(suggestTemporalTag(daysAgo(90), REFERENCE_DATE)).toBe("followup_3m");
  });

  it('returns "followup_3m" for 135 days ago', () => {
    expect(suggestTemporalTag(daysAgo(135), REFERENCE_DATE)).toBe(
      "followup_3m",
    );
  });

  it('returns "followup_6m" for 136 days ago', () => {
    expect(suggestTemporalTag(daysAgo(136), REFERENCE_DATE)).toBe(
      "followup_6m",
    );
  });

  it('returns "followup_6m" for 180 days ago (~6 months)', () => {
    expect(suggestTemporalTag(daysAgo(180), REFERENCE_DATE)).toBe(
      "followup_6m",
    );
  });

  it('returns "followup_6m" for 270 days ago', () => {
    expect(suggestTemporalTag(daysAgo(270), REFERENCE_DATE)).toBe(
      "followup_6m",
    );
  });

  it('returns "followup_12m" for 271 days ago', () => {
    expect(suggestTemporalTag(daysAgo(271), REFERENCE_DATE)).toBe(
      "followup_12m",
    );
  });

  it('returns "followup_12m" for 365 days ago (~12 months)', () => {
    expect(suggestTemporalTag(daysAgo(365), REFERENCE_DATE)).toBe(
      "followup_12m",
    );
  });

  it('returns "followup_12m" for 450 days ago', () => {
    expect(suggestTemporalTag(daysAgo(450), REFERENCE_DATE)).toBe(
      "followup_12m",
    );
  });

  it('returns "followup_late" for 451 days ago', () => {
    expect(suggestTemporalTag(daysAgo(451), REFERENCE_DATE)).toBe(
      "followup_late",
    );
  });

  it('returns "followup_late" for 730 days ago (2 years)', () => {
    expect(suggestTemporalTag(daysAgo(730), REFERENCE_DATE)).toBe(
      "followup_late",
    );
  });

  it("uses the provided reference date instead of today", () => {
    expect(suggestTemporalTag("2026-01-01", "2026-04-15")).toBe("followup_3m");
  });

  it("all returned tags are valid MediaTags in the registry", () => {
    const testDays = [
      0, 1, 7, 8, 42, 43, 90, 135, 136, 270, 271, 365, 450, 451, 730,
    ];
    for (const d of testDays) {
      const tag = suggestTemporalTag(daysAgo(d), REFERENCE_DATE);
      expect(
        tag in MEDIA_TAG_REGISTRY,
        `suggestTemporalTag(${d} days ago) returned invalid tag: ${tag}`,
      ).toBe(true);
    }
  });
});

describe("suggestDefaultMediaTag", () => {
  it('defaults discharge_photo to "discharge"', () => {
    expect(
      suggestDefaultMediaTag({
        eventType: "discharge_photo",
        procedureDate: "2026-01-01",
        mediaDate: "2026-01-05",
      }),
    ).toBe("discharge");
  });

  it('defaults imaging to "xray_followup"', () => {
    expect(
      suggestDefaultMediaTag({
        eventType: "imaging",
        procedureDate: "2026-01-01",
        mediaDate: "2026-01-05",
      }),
    ).toBe("xray_followup");
  });

  it("uses temporal suggestion for follow_up_visit", () => {
    expect(
      suggestDefaultMediaTag({
        eventType: "follow_up_visit",
        procedureDate: "2026-01-01",
        mediaDate: "2026-04-15",
      }),
    ).toBe("followup_3m");
  });

  it("uses temporal suggestion for generic photo events", () => {
    expect(
      suggestDefaultMediaTag({
        eventType: "photo",
        procedureDate: "2026-01-01",
        mediaDate: "2026-01-01",
      }),
    ).toBe("intraop");
  });

  it("falls back to temporal suggestion when event type is unrelated", () => {
    expect(
      suggestDefaultMediaTag({
        eventType: "complication" as TimelineEventType,
        procedureDate: "2026-01-01",
        mediaDate: "2026-01-15",
      }),
    ).toBe("postop_mid");
  });
});

describe("getPreferredMediaTagGroup", () => {
  it("prefers the selected tag group when available", () => {
    expect(
      getPreferredMediaTagGroup("flap_harvest", [
        "temporal",
        "flap_surgery",
        "other",
      ]),
    ).toBe("flap_surgery");
  });

  it("falls back to the first allowed group when the selected tag group is hidden", () => {
    expect(
      getPreferredMediaTagGroup("flap_harvest", ["temporal", "other"]),
    ).toBe("temporal");
  });

  it('falls back to "temporal" when no groups are provided', () => {
    expect(getPreferredMediaTagGroup(undefined, [])).toBe("temporal");
  });
});

// ===============================================================
// deriveDateForTemporalTag (tag → date, day-of-surgery snapping)
// ===============================================================

describe("deriveDateForTemporalTag", () => {
  const SNAPPING_TAGS: MediaTag[] = [
    "day_of_surgery",
    "intraop",
    "immediate_postop",
    "xray_intraop",
    "flap_design",
    "flap_harvest",
    "donor_site",
    "donor_closure",
    "recipient_prep",
    "anastomosis",
    "flap_inset",
    "flap_perfusion",
    "margin_marking",
    "excision_defect",
    "specimen",
    "reconstruction_intraop",
  ];

  it("snaps every day-of-surgery tag to the procedure date", () => {
    for (const tag of SNAPPING_TAGS) {
      expect(deriveDateForTemporalTag("2026-08-01", tag)).toBe("2026-08-01");
    }
  });

  it("matches the exported DAY_OF_SURGERY_TAGS set exactly", () => {
    expect(new Set(SNAPPING_TAGS)).toEqual(new Set(DAY_OF_SURGERY_TAGS));
  });

  it("every day-of-surgery tag exists in the registry", () => {
    for (const tag of DAY_OF_SURGERY_TAGS) {
      expect(MEDIA_TAG_REGISTRY[tag]).toBeDefined();
    }
  });

  it("returns null for ambiguous band and pre-op tags", () => {
    const nonSnapping: MediaTag[] = [
      "preop_clinical",
      "postop_early",
      "postop_mid",
      "followup_3m",
      "followup_late",
      "discharge",
      "xray_preop",
      "xray_postop",
      "flap_planning",
      "flap_monitoring",
      "lesion_overview",
      "wound_postop",
      "scar_followup",
      "aesthetic_frontal",
      "hand_dorsal",
      "other",
    ];
    for (const tag of nonSnapping) {
      expect(deriveDateForTemporalTag("2026-08-01", tag)).toBeNull();
    }
  });

  it("returns null when the procedure date is missing or unparseable", () => {
    expect(deriveDateForTemporalTag(undefined, "intraop")).toBeNull();
    expect(deriveDateForTemporalTag("", "intraop")).toBeNull();
    expect(deriveDateForTemporalTag("not-a-date", "intraop")).toBeNull();
    expect(deriveDateForTemporalTag("2026-13-40", "intraop")).toBeNull();
  });

  it("returns null for a future procedure date (planned case)", () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const yyyy = future.getFullYear();
    const mm = `${future.getMonth() + 1}`.padStart(2, "0");
    const dd = `${future.getDate()}`.padStart(2, "0");
    expect(
      deriveDateForTemporalTag(`${yyyy}-${mm}-${dd}`, "intraop"),
    ).toBeNull();
  });

  it("normalizes full-ISO timestamp input to the date-only value", () => {
    expect(
      deriveDateForTemporalTag("2026-08-01T03:15:00.000Z", "intraop"),
    ).toBe("2026-08-01");
  });
});
