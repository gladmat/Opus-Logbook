import { Alert } from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import {
  getAlwaysDeleteAfterImport,
  setAlwaysDeleteAfterImport,
} from "./smartImportPrefs";

/**
 * Shared "delete originals from Camera Roll" flow for every gallery-import
 * path outside SmartImportScreen (which keeps its own full-screen prompt UI).
 * Call AFTER the encrypted copy has been committed — never at pick time for
 * flows where the user can still cancel the import.
 */

export type GalleryCleanupAction = "none" | "delete_silently" | "prompt";

/** Keeps only usable Camera Roll asset ids (picker returns string | null). */
export function collectDeletableAssetIds(
  assetIds: (string | null | undefined)[],
): string[] {
  return assetIds.filter((id): id is string => !!id);
}

/** Pure decision logic so the branch matrix is unit-testable. */
export function resolveCleanupAction(
  ids: string[],
  alwaysDelete: boolean,
): GalleryCleanupAction {
  if (ids.length === 0) return "none";
  return alwaysDelete ? "delete_silently" : "prompt";
}

/**
 * Deletes the given assets from the photo library. Returns true on success.
 * Permission denial and failures surface an informational alert — a privacy
 * feature must never pretend deletion happened when it did not.
 */
export async function deleteGalleryAssets(ids: string[]): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Opus needs photo library access to delete originals. Imported photos have been kept safely.",
      );
      return false;
    }

    await MediaLibrary.deleteAssetsAsync(ids);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return true;
  } catch (error) {
    if (__DEV__) console.warn("[galleryCleanup] Delete failed:", error);
    Alert.alert(
      "Could Not Delete",
      "Imported photos were saved successfully. You can delete originals manually from Camera Roll.",
    );
    return false;
  }
}

/**
 * Offers to delete the Camera Roll originals for freshly imported photos.
 * No-ops when no usable asset ids exist; deletes silently when the shared
 * "always delete after import" preference is set (same preference as
 * SmartImport, so opting in anywhere silences the prompt everywhere).
 */
export async function offerGalleryCleanup(
  assetIds: (string | null | undefined)[],
): Promise<void> {
  const ids = collectDeletableAssetIds(assetIds);
  const alwaysDelete = await getAlwaysDeleteAfterImport().catch(() => false);
  const action = resolveCleanupAction(ids, alwaysDelete);

  if (action === "none") return;
  if (action === "delete_silently") {
    await deleteGalleryAssets(ids);
    return;
  }

  const count = ids.length;
  Alert.alert(
    "Delete Originals from Camera Roll?",
    `${count} photo${count === 1 ? " was" : "s were"} encrypted into Opus. Delete the original${count === 1 ? "" : "s"} from your Camera Roll to protect patient privacy?`,
    [
      {
        text: "Delete Originals",
        style: "destructive",
        onPress: () => void deleteGalleryAssets(ids),
      },
      {
        text: "Always Delete After Import",
        onPress: () => {
          void (async () => {
            await setAlwaysDeleteAfterImport(true).catch(() => {});
            await deleteGalleryAssets(ids);
          })();
        },
      },
      { text: "Keep Originals", style: "cancel" },
    ],
  );
}
