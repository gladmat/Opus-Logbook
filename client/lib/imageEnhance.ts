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
  isImageEnhanceAvailable,
  type DetectedQuadCorners,
  type QuadPoint,
  type RectangleDetectionResult,
} from "../../modules/opus-image-enhance";
import { isPersistedMediaUriValue } from "./operativeMediaForm";
import { getMasterKeyBytes } from "./encryption";
import {
  decryptMediaVariantToFile,
  opusMediaIdFromUri,
} from "./mediaFileStorage";
import { saveEncryptedMediaFromUri } from "./mediaStorage";

export { isImageEnhanceAvailable };
export type { DetectedQuadCorners, QuadPoint };

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
  /** True when a quad (detected or manual) drove perspective correction. */
  perspectiveApplied: boolean;
  /**
   * The quad Vision detected (top-left origin, normalized) — present even
   * when it failed the acceptance gate, so a manual-adjust editor can seed
   * from it. Absent when a quadOverride skipped detection entirely.
   */
  detectedCorners?: DetectedQuadCorners;
}

/**
 * Detect the display rectangle and render the enhanced variant to a temp
 * file. Grayscale/auto-levels always apply per tag defaults; perspective
 * correction only with an accepted quad — unless `quadOverride` is given
 * (manual corner adjustment), which skips detection and always applies.
 * Returns null where the native module is absent or anything fails —
 * enhancement is best-effort and must never block adding media.
 */
export async function runXrayEnhancement(
  srcUri: string,
  tag: MediaTag,
  opts: { quadOverride?: DetectedQuadCorners } = {},
): Promise<XrayEnhancementResult | null> {
  try {
    let quad: number[] | undefined;
    let perspectiveApplied = false;
    let detectedCorners: DetectedQuadCorners | undefined;

    if (opts.quadOverride) {
      quad = quadToArray(opts.quadOverride);
      perspectiveApplied = true;
    } else {
      const detection = await detectDisplayQuad(srcUri);
      if (detection === null) return null; // native module absent
      detectedCorners = detection.corners;
      if (quadAcceptable(detection) && detection.corners) {
        quad = quadToArray(detection.corners);
        perspectiveApplied = true;
      }
    }

    const { grayscale, autoLevels } = getEnhanceDefaultsForTag(tag);

    const dir = new Directory(Paths.cache, ENHANCE_DIR_NAME);
    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
    const dstFile = new File(dir, `${uuidv4()}.jpg`);

    const enhanced = await enhanceXrayImage(srcUri, dstFile.uri, {
      quad,
      grayscale,
      autoLevels,
    });
    if (enhanced === null) return null;

    return { uri: dstFile.uri, perspectiveApplied, detectedCorners };
  } catch (error) {
    if (__DEV__) console.warn("[opus:image-enhance] failed:", error);
    return null;
  }
}

export interface EnhancementSource {
  /** Plaintext file:// URI usable as enhancement/crop input. */
  uri: string;
  /** True when this is a decrypted temp the caller must clean up. */
  isDecryptedTemp: boolean;
}

/**
 * Resolves a plaintext enhancement source for any media URI: plaintext URIs
 * pass through; persisted `opus-media:` URIs are decrypted (full variant) to
 * a cache temp. Returns null when the native module is absent (no point
 * decrypting) or decryption fails.
 */
export async function prepareEnhancementSource(
  uri: string,
): Promise<EnhancementSource | null> {
  if (!isPersistedMediaUriValue(uri)) {
    return { uri, isDecryptedTemp: false };
  }
  if (!isImageEnhanceAvailable()) return null;
  try {
    const masterKey = await getMasterKeyBytes();
    const mediaId = opusMediaIdFromUri(uri);
    const dir = new Directory(Paths.cache, ENHANCE_DIR_NAME);
    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
    const dstFile = new File(dir, `src-${uuidv4()}.jpg`);
    await decryptMediaVariantToFile(mediaId, masterKey, "full", dstFile.uri);
    return { uri: dstFile.uri, isDecryptedTemp: true };
  } catch (error) {
    if (__DEV__) {
      console.warn("[opus:image-enhance] source decrypt failed:", error);
    }
    return null;
  }
}

/**
 * Re-enhances an already-encrypted media item (re-tag flow): decrypt →
 * detect/enhance → encrypt the enhanced variant as NEW media. The caller
 * owns swapping references and deleting the old media — this never touches
 * the original. Null when the module is absent or any step fails.
 */
export async function enhancePersistedMedia(
  opusUri: string,
  tag: MediaTag,
): Promise<{ localUri: string; mimeType: string } | null> {
  if (!isPersistedMediaUriValue(opusUri)) return null;
  const source = await prepareEnhancementSource(opusUri);
  if (!source) return null;
  try {
    const enhanced = await runXrayEnhancement(source.uri, tag);
    if (!enhanced) return null;
    try {
      return await saveEncryptedMediaFromUri(enhanced.uri, "image/jpeg");
    } finally {
      deleteEnhancedTemp(enhanced.uri);
    }
  } catch (error) {
    if (__DEV__) console.warn("[opus:image-enhance] re-enhance failed:", error);
    return null;
  } finally {
    deleteEnhancedTemp(source.uri);
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
