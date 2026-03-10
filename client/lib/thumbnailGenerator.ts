/**
 * Image preparation helpers for the v2 encrypted media pipeline.
 *
 * The hot path stays file-based: ImageManipulator writes normalized plaintext
 * temp files, and the media encryption layer consumes those file URIs.
 */

import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const THUMB_MAX_DIMENSION = 300;
const THUMB_COMPRESS = 0.6;

export interface PreparedMediaFile {
  uri: string;
  mimeType: string;
  width: number;
  height: number;
}

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

export async function prepareImageForEncryption(
  sourceUri: string,
  mimeType: string,
): Promise<PreparedMediaFile> {
  const {
    format,
    mimeType: normalizedMime,
    compress,
  } = getSaveFormat(mimeType);

  const context = ImageManipulator.manipulate(sourceUri);
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format,
    compress,
    base64: false,
  });

  return {
    uri: result.uri,
    mimeType: normalizedMime,
    width: result.width,
    height: result.height,
  };
}

export async function generateThumbnailFile(
  sourceUri: string,
): Promise<PreparedMediaFile | null> {
  try {
    const context = ImageManipulator.manipulate(sourceUri);
    context.resize({ width: THUMB_MAX_DIMENSION, height: THUMB_MAX_DIMENSION });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: THUMB_COMPRESS,
      base64: false,
    });

    return {
      uri: result.uri,
      mimeType: "image/jpeg",
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.warn("Thumbnail generation failed:", error);
    return null;
  }
}
