/**
 * Thumbnail and image byte extraction for the v2 encrypted media pipeline.
 *
 * Converts file URIs (from ImagePicker / camera) into raw Uint8Array bytes
 * suitable for encryption. Generates thumbnails at 300px / JPEG 0.6 quality.
 *
 * The base64 step is transient — bytes are decoded immediately and never stored.
 */

import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { base64ToBytes } from "./binaryUtils";

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const THUMB_MAX_DIMENSION = 300;
const THUMB_COMPRESS = 0.6;

// ═══════════════════════════════════════════════════════════
// Format helpers (mirrors mediaStorage.ts getSaveFormat)
// ═══════════════════════════════════════════════════════════

function getSaveFormat(mimeType: string): {
  format: SaveFormat;
  mimeType: string;
  compress: number;
} {
  if (mimeType.toLowerCase().includes("png")) {
    return { format: SaveFormat.PNG, mimeType: "image/png", compress: 1 };
  }
  return { format: SaveFormat.JPEG, mimeType: "image/jpeg", compress: 0.72 };
}

// ═══════════════════════════════════════════════════════════
// Full image extraction
// ═══════════════════════════════════════════════════════════

/**
 * Convert a file URI to raw image bytes + metadata.
 *
 * Uses ImageManipulator to normalize the image (respecting format/compression)
 * and extract base64, which is immediately decoded to Uint8Array.
 */
export async function getImageBytesFromUri(
  sourceUri: string,
  mimeType: string,
): Promise<{
  bytes: Uint8Array;
  normalizedMime: string;
  width: number;
  height: number;
}> {
  const { format, mimeType: normalizedMime, compress } =
    getSaveFormat(mimeType);

  const context = ImageManipulator.manipulate(sourceUri);
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format,
    compress,
    base64: true,
  });

  if (!result.base64) {
    throw new Error("Failed to extract image bytes for secure storage.");
  }

  const bytes = base64ToBytes(result.base64);
  return {
    bytes,
    normalizedMime,
    width: result.width,
    height: result.height,
  };
}

// ═══════════════════════════════════════════════════════════
// Thumbnail generation
// ═══════════════════════════════════════════════════════════

/**
 * Generate thumbnail bytes from a source URI.
 *
 * Thumbnail: 300px longest edge, JPEG quality 0.6.
 * Returns null on failure (non-fatal — full image can still be used).
 */
export async function generateThumbnailBytes(
  sourceUri: string,
): Promise<Uint8Array | null> {
  try {
    const context = ImageManipulator.manipulate(sourceUri);
    context.resize({ width: THUMB_MAX_DIMENSION, height: THUMB_MAX_DIMENSION });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: THUMB_COMPRESS,
      base64: true,
    });

    if (!result.base64) return null;
    return base64ToBytes(result.base64);
  } catch (e) {
    console.warn("Thumbnail generation failed:", e);
    return null;
  }
}
