/**
 * X-ray photo enhancement orchestration.
 *
 * Photos of radiology images are usually taken off a monitor: skewed
 * perspective, poor contrast, colour cast. When a plaintext (not yet
 * encrypted) image is tagged with an imaging-group tag, the Add Media screen
 * runs detect → gate → enhance through the opus-image-enhance native module
 * and previews the result behind an Enhanced/Original toggle — never a
 * silent modification of clinical imagery.
 *
 * Everything degrades to a no-op where the native module is absent
 * (Expo Go, vitest, Android).
 */

import { Directory, File, Paths } from "expo-file-system";
import { v4 as uuidv4 } from "uuid";
import { MEDIA_TAG_REGISTRY, type MediaTag } from "@/types/media";
import {
  detectDisplayQuad,
  enhanceXrayImage,
  type DetectedQuadCorners,
  type RectangleDetectionResult,
} from "../../modules/opus-image-enhance";
import { isPersistedMediaUriValue } from "./operativeMediaForm";

const ENHANCE_DIR_NAME = "opus-enhance";

/**
 * Imaging tags whose colour carries clinical information (CTA flow maps,
 * Doppler overlays) — grayscale must NOT be forced for these.
 */
const COLOUR_IMAGING_TAGS: ReadonlySet<MediaTag> = new Set([
  "ct_angiogram",
  "ultrasound",
]);

export function isImagingTag(tag: MediaTag | undefined): boolean {
  if (!tag) return false;
  return MEDIA_TAG_REGISTRY[tag]?.group === "imaging";
}

/** Per-tag enhancement defaults (only meaningful for imaging tags). */
export function getEnhanceDefaultsForTag(tag: MediaTag): {
  grayscale: boolean;
  autoLevels: boolean;
} {
  const imaging = isImagingTag(tag);
  return {
    grayscale: imaging && !COLOUR_IMAGING_TAGS.has(tag),
    autoLevels: imaging,
  };
}

export interface QuadGateOptions {
  minConfidence?: number;
  minAreaFraction?: number;
}

/**
 * Whether a detection result is trustworthy enough to drive perspective
 * correction. Deliberately strict — a false-positive quad (window, cabinet
 * door) would crop clinical content, whereas a miss just skips deskewing.
 */
export function quadAcceptable(
  result: RectangleDetectionResult | null,
  { minConfidence = 0.8, minAreaFraction = 0.2 }: QuadGateOptions = {},
): boolean {
  if (!result?.found || !result.corners) return false;
  return (
    (result.confidence ?? 0) >= minConfidence &&
    (result.areaFraction ?? 0) >= minAreaFraction
  );
}

/** Flatten corners to the native module's TL,TR,BR,BL × x,y ordering. */
export function quadToArray(corners: DetectedQuadCorners): number[] {
  return [
    corners.topLeft.x,
    corners.topLeft.y,
    corners.topRight.x,
    corners.topRight.y,
    corners.bottomRight.x,
    corners.bottomRight.y,
    corners.bottomLeft.x,
    corners.bottomLeft.y,
  ];
}

/**
 * Whether auto-enhancement should run for this tag + image. Plaintext URIs
 * only — an already-encrypted opus-media: URI (edit mode) is committed
 * clinical media and is never reprocessed implicitly.
 */
export function shouldAutoEnhance(args: {
  tag: MediaTag | undefined;
  uri: string | undefined;
}): boolean {
  if (!args.uri || !isImagingTag(args.tag)) return false;
  return !isPersistedMediaUriValue(args.uri);
}

export interface XrayEnhancementResult {
  /** file:// URI of the enhanced JPEG in the cache directory. */
  uri: string;
  /** True when a detected quad drove perspective correction. */
  perspectiveApplied: boolean;
}

/**
 * Detect the display rectangle and render the enhanced variant to a temp
 * file. Grayscale/auto-levels always apply per tag defaults; perspective
 * correction only with an accepted quad. Returns null where the native
 * module is absent or anything fails — enhancement is best-effort and must
 * never block adding media.
 */
export async function runXrayEnhancement(
  srcUri: string,
  tag: MediaTag,
): Promise<XrayEnhancementResult | null> {
  try {
    const detection = await detectDisplayQuad(srcUri);
    if (detection === null) return null; // native module absent

    const useQuad = quadAcceptable(detection);
    const { grayscale, autoLevels } = getEnhanceDefaultsForTag(tag);

    const dir = new Directory(Paths.cache, ENHANCE_DIR_NAME);
    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
    const dstFile = new File(dir, `${uuidv4()}.jpg`);

    const enhanced = await enhanceXrayImage(srcUri, dstFile.uri, {
      quad:
        useQuad && detection.corners
          ? quadToArray(detection.corners)
          : undefined,
      grayscale,
      autoLevels,
    });
    if (enhanced === null) return null;

    return { uri: dstFile.uri, perspectiveApplied: useQuad };
  } catch (error) {
    if (__DEV__) console.warn("[opus:image-enhance] failed:", error);
    return null;
  }
}

/** Best-effort cleanup of an enhanced temp file (cache is OS-reclaimable). */
export function deleteEnhancedTemp(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache-dir file — the OS reclaims it eventually.
  }
}
