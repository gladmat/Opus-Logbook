/**
 * Pure geometry for the manual corner-adjust crop editor.
 *
 * The editor renders an image `resizeMode="contain"` inside a container and
 * overlays four draggable corner handles. Corners are stored NORMALIZED
 * (0–1, top-left origin — the opus-image-enhance convention); these helpers
 * map between normalized image space and container layout points.
 */

import type { DetectedQuadCorners, QuadPoint } from "./imageEnhance";

export interface Size {
  width: number;
  height: number;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The rect an image occupies inside a container under contain-fit (centered). */
export function computeContainRect(container: Size, image: Size): LayoutRect {
  if (
    container.width <= 0 ||
    container.height <= 0 ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const scale = Math.min(
    container.width / image.width,
    container.height / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    x: (container.width - width) / 2,
    y: (container.height - height) / 2,
    width,
    height,
  };
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Normalized image point → container layout point. */
export function normalizedToLayout(p: QuadPoint, rect: LayoutRect): QuadPoint {
  return { x: rect.x + p.x * rect.width, y: rect.y + p.y * rect.height };
}

/** Container layout point → normalized image point, clamped into the image. */
export function layoutToNormalized(p: QuadPoint, rect: LayoutRect): QuadPoint {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: clamp01((p.x - rect.x) / rect.width),
    y: clamp01((p.y - rect.y) / rect.height),
  };
}

/** Full-frame quad inset by `inset` on every side — the no-detection seed. */
export function defaultQuad(inset = 0.08): DetectedQuadCorners {
  const lo = clamp01(inset);
  const hi = clamp01(1 - inset);
  return {
    topLeft: { x: lo, y: lo },
    topRight: { x: hi, y: lo },
    bottomRight: { x: hi, y: hi },
    bottomLeft: { x: lo, y: hi },
  };
}

/** Corner keys in the TL, TR, BR, BL order the native module expects. */
export const QUAD_CORNER_KEYS = [
  "topLeft",
  "topRight",
  "bottomRight",
  "bottomLeft",
] as const;

export type QuadCornerKey = (typeof QUAD_CORNER_KEYS)[number];
