import { describe, it, expect, vi } from "vitest";
import { createExpoFileSystemMock } from "./helpers/mockExpoFileSystem";

import {
  isImagingTag,
  getEnhanceDefaultsForTag,
  quadAcceptable,
  quadToArray,
  shouldAutoEnhance,
  runXrayEnhancement,
} from "../imageEnhance";
import { buildOperativeMediaItemRecord } from "../operativeMediaForm";
import type { MediaTag } from "@/types/media";
import type {
  DetectedQuadCorners,
  RectangleDetectionResult,
} from "../../../modules/opus-image-enhance";

vi.mock("expo-file-system", () => createExpoFileSystemMock());

const IMAGING_TAGS: MediaTag[] = [
  "xray_preop",
  "xray_intraop",
  "xray_postop",
  "xray_followup",
  "ct_scan",
  "ct_angiogram",
  "mri",
  "ultrasound",
];

const CORNERS: DetectedQuadCorners = {
  topLeft: { x: 0.1, y: 0.1 },
  topRight: { x: 0.9, y: 0.12 },
  bottomRight: { x: 0.88, y: 0.9 },
  bottomLeft: { x: 0.12, y: 0.88 },
};

function detection(
  overrides: Partial<RectangleDetectionResult> = {},
): RectangleDetectionResult {
  return {
    found: true,
    confidence: 0.9,
    areaFraction: 0.5,
    corners: CORNERS,
    ...overrides,
  };
}

describe("isImagingTag", () => {
  it("accepts all 8 imaging-group tags", () => {
    for (const tag of IMAGING_TAGS) {
      expect(isImagingTag(tag)).toBe(true);
    }
  });

  it("rejects non-imaging tags and undefined", () => {
    expect(isImagingTag("preop")).toBe(false);
    expect(isImagingTag("intraop")).toBe(false);
    expect(isImagingTag("other")).toBe(false);
    expect(isImagingTag(undefined)).toBe(false);
  });
});

describe("getEnhanceDefaultsForTag", () => {
  it("enables grayscale for monochrome imaging modalities", () => {
    for (const tag of [
      "xray_preop",
      "xray_intraop",
      "xray_postop",
      "xray_followup",
      "ct_scan",
      "mri",
    ] as MediaTag[]) {
      expect(getEnhanceDefaultsForTag(tag)).toEqual({
        grayscale: true,
        autoLevels: true,
      });
    }
  });

  it("keeps colour for CTA and ultrasound (flow maps / Doppler)", () => {
    expect(getEnhanceDefaultsForTag("ct_angiogram")).toEqual({
      grayscale: false,
      autoLevels: true,
    });
    expect(getEnhanceDefaultsForTag("ultrasound")).toEqual({
      grayscale: false,
      autoLevels: true,
    });
  });

  it("disables everything for non-imaging tags", () => {
    expect(getEnhanceDefaultsForTag("preop")).toEqual({
      grayscale: false,
      autoLevels: false,
    });
  });
});

describe("quadAcceptable", () => {
  it("accepts a confident, large quad", () => {
    expect(quadAcceptable(detection())).toBe(true);
  });

  it("rejects null, not-found, and missing corners", () => {
    expect(quadAcceptable(null)).toBe(false);
    expect(quadAcceptable({ found: false })).toBe(false);
    expect(quadAcceptable(detection({ corners: undefined }))).toBe(false);
  });

  it("rejects below the confidence threshold (default 0.8)", () => {
    expect(quadAcceptable(detection({ confidence: 0.79 }))).toBe(false);
    expect(quadAcceptable(detection({ confidence: 0.8 }))).toBe(true);
  });

  it("rejects below the area threshold (default 0.2)", () => {
    expect(quadAcceptable(detection({ areaFraction: 0.19 }))).toBe(false);
    expect(quadAcceptable(detection({ areaFraction: 0.2 }))).toBe(true);
  });

  it("honours custom thresholds", () => {
    expect(
      quadAcceptable(detection({ confidence: 0.7 }), { minConfidence: 0.6 }),
    ).toBe(true);
    expect(
      quadAcceptable(detection({ areaFraction: 0.3 }), {
        minAreaFraction: 0.4,
      }),
    ).toBe(false);
  });
});

describe("quadToArray", () => {
  it("flattens TL, TR, BR, BL in x,y pairs (native module ordering)", () => {
    expect(quadToArray(CORNERS)).toEqual([
      0.1, 0.1, 0.9, 0.12, 0.88, 0.9, 0.12, 0.88,
    ]);
  });
});

describe("shouldAutoEnhance", () => {
  it("fires for an imaging tag on a plaintext URI", () => {
    expect(
      shouldAutoEnhance({ tag: "xray_postop", uri: "file:///tmp/photo.jpg" }),
    ).toBe(true);
  });

  it("never fires for persisted (already encrypted) media", () => {
    expect(
      shouldAutoEnhance({ tag: "xray_postop", uri: "opus-media:abc-123" }),
    ).toBe(false);
  });

  it("never fires for non-imaging tags or missing input", () => {
    expect(
      shouldAutoEnhance({ tag: "intraop", uri: "file:///tmp/photo.jpg" }),
    ).toBe(false);
    expect(
      shouldAutoEnhance({ tag: undefined, uri: "file:///tmp/photo.jpg" }),
    ).toBe(false);
    expect(shouldAutoEnhance({ tag: "xray_postop", uri: undefined })).toBe(
      false,
    );
  });
});

describe("runXrayEnhancement", () => {
  it("returns null where the native module is absent (this environment)", async () => {
    const result = await runXrayEnhancement(
      "file:///tmp/photo.jpg",
      "xray_postop",
    );
    expect(result).toBeNull();
  });
});

describe("buildOperativeMediaItemRecord enhanced flag", () => {
  const base = {
    id: "m1",
    localUri: "opus-media:m1",
    mimeType: "image/jpeg",
    tag: "xray_postop" as MediaTag,
    createdAt: "2026-07-30T00:00:00.000Z",
  };

  it("carries enhanced: true through", () => {
    expect(
      buildOperativeMediaItemRecord({ ...base, enhanced: true }).enhanced,
    ).toBe(true);
  });

  it("normalises false/absent to undefined", () => {
    expect(
      buildOperativeMediaItemRecord({ ...base, enhanced: false }).enhanced,
    ).toBeUndefined();
    expect(buildOperativeMediaItemRecord(base).enhanced).toBeUndefined();
  });
});
