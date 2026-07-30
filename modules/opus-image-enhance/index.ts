import { requireOptionalNativeModule } from "expo-modules-core";

export interface QuadPoint {
  /** Normalized 0–1, top-left origin. */
  x: number;
  y: number;
}

export interface DetectedQuadCorners {
  topLeft: QuadPoint;
  topRight: QuadPoint;
  bottomRight: QuadPoint;
  bottomLeft: QuadPoint;
}

export interface RectangleDetectionResult {
  found: boolean;
  /** Vision confidence 0–1. Present only when found. */
  confidence?: number;
  /** Quad area as a fraction of the frame. Present only when found. */
  areaFraction?: number;
  corners?: DetectedQuadCorners;
}

export interface EnhanceImageOptions {
  /**
   * 8 normalized top-left-origin values ordered TL.x, TL.y, TR.x, TR.y,
   * BR.x, BR.y, BL.x, BL.y. Omit to skip perspective correction.
   */
  quad?: number[];
  grayscale?: boolean;
  autoLevels?: boolean;
  rotateQuarterTurns?: number;
  jpegQuality?: number;
}

export interface EnhanceImageResult {
  width: number;
  height: number;
}

interface OpusImageEnhanceNative {
  detectRectangle(srcPath: string): Promise<RectangleDetectionResult>;
  enhanceImage(
    srcPath: string,
    dstPath: string,
    options: EnhanceImageOptions,
  ): Promise<EnhanceImageResult>;
}

const native =
  requireOptionalNativeModule<OpusImageEnhanceNative>("OpusImageEnhance");

/** True when the native module is present (dev client / release build). */
export function isImageEnhanceAvailable(): boolean {
  return native != null;
}

/**
 * Detects the dominant screen/lightbox rectangle in a photo via Vision.
 * Returns null where the native module is absent (Expo Go, vitest, Android)
 * — callers treat that as "no enhancement available", never an error.
 */
export async function detectDisplayQuad(
  srcUri: string,
): Promise<RectangleDetectionResult | null> {
  if (!native) return null;
  return native.detectRectangle(srcUri);
}

/**
 * Applies perspective correction (when a quad is given), optional grayscale,
 * and histogram-stretch auto-levels; writes a JPEG to dstUri. Null where the
 * native module is absent.
 */
export async function enhanceXrayImage(
  srcUri: string,
  dstUri: string,
  options: EnhanceImageOptions,
): Promise<EnhanceImageResult | null> {
  if (!native) return null;
  return native.enhanceImage(srcUri, dstUri, options);
}
