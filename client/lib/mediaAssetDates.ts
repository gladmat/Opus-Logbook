/**
 * Resolves the real capture instant of a photo-library asset from its
 * library metadata (`creationTime`). Returns undefined when the asset id is
 * missing, the lookup fails (permissions, deleted asset), or the library
 * reports no usable creation time — callers fall back to their own default.
 *
 * expo-media-library is imported lazily so modules that import this one
 * (mediaStorage and its dependents) stay loadable under vitest without a
 * native-module mock.
 */
export async function resolveAssetCapturedAt(
  assetId?: string | null,
): Promise<string | undefined> {
  if (!assetId) {
    return undefined;
  }

  try {
    const MediaLibrary = await import("expo-media-library");
    const info = await MediaLibrary.getAssetInfoAsync(assetId);
    if (typeof info.creationTime === "number" && info.creationTime > 0) {
      return new Date(info.creationTime).toISOString();
    }
  } catch (error) {
    console.warn("[opus:media] Could not resolve asset timestamp:", error);
  }

  return undefined;
}
