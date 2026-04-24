import { Directory, File, Paths } from "expo-file-system";

import { addToInbox, setPendingInboxSelection } from "@/lib/inboxStorage";
import {
  clearPendingLockedCameraCaptures,
  readPendingLockedCameraCaptures,
  replacePendingLockedCameraCaptures,
} from "@/lib/nativeExtensionBridge";

async function deleteFileIfExists(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore best-effort cleanup failures for extension-produced temp files.
  }
}

const LOCKED_CAMERA_ORPHAN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Delete extension-produced JPEGs in the shared App Group's
 * `LockedCameraPending/` directory that are older than `LOCKED_CAMERA_ORPHAN_TTL_MS`.
 *
 * Normally the main app's boot `ingestPendingLockedCameraCaptures()` picks up
 * every capture and deletes the source file. But if the user never opens the
 * app after an extension capture — or an ingestion crash leaves stale files —
 * those plaintext JPEGs would accumulate in the shared container. This sweep
 * runs opportunistically at boot and any AppState `active` transition so the
 * shared-container plaintext window is bounded to at most 7 days.
 */
const OPUS_APP_GROUP = "group.com.drgladysz.opus";

export async function sweepOrphanedLockedCameraFiles(): Promise<number> {
  try {
    const sharedContainers = Paths.appleSharedContainers;
    const containerDir = sharedContainers?.[OPUS_APP_GROUP];
    if (!containerDir) return 0;

    const captureDir = new Directory(containerDir, "LockedCameraPending");
    if (!captureDir.exists) return 0;

    const cutoffMs = Date.now() - LOCKED_CAMERA_ORPHAN_TTL_MS;
    let deleted = 0;

    // `list()` returns a snapshot of current entries. We only delete files
    // (not nested directories).
    const entries = captureDir.list();
    for (const entry of entries) {
      if (!(entry instanceof File)) continue;
      try {
        // `modificationTime` is a Unix-epoch number (seconds) per the
        // expo-file-system ExpoFileSystem.types surface. Fall back to "delete
        // now" when null so an un-timestamped orphan isn't stuck forever.
        const mtimeSec = entry.modificationTime;
        const mtimeMs =
          typeof mtimeSec === "number" ? mtimeSec * 1000 : Date.now();
        if (mtimeMs < cutoffMs) {
          entry.delete();
          deleted++;
        }
      } catch {
        // Best-effort — continue to the next file.
      }
    }
    return deleted;
  } catch {
    // Shared container / file-system API unavailable — no-op.
    return 0;
  }
}

export async function ingestPendingLockedCameraCaptures(): Promise<number> {
  const pendingCaptures = readPendingLockedCameraCaptures();
  if (pendingCaptures.length === 0) {
    return 0;
  }

  const remainingCaptures = [];
  const importedInboxIds: string[] = [];

  for (const capture of pendingCaptures) {
    try {
      const item = await addToInbox(
        capture.sourceUri,
        capture.mimeType ?? "image/jpeg",
        "opus_camera",
        {
          capturedAt: capture.capturedAt,
          width: capture.width,
          height: capture.height,
          templateId: capture.templateId,
          templateStepIndex: capture.templateStepIndex,
          patientIdentifier: capture.patientIdentifier,
        },
      );

      importedInboxIds.push(item.id);
      await deleteFileIfExists(capture.sourceUri);
    } catch (error) {
      console.warn("[LockedCamera] Failed to ingest pending capture:", error);
      remainingCaptures.push(capture);
    }
  }

  if (remainingCaptures.length > 0) {
    replacePendingLockedCameraCaptures(remainingCaptures);
  } else {
    clearPendingLockedCameraCaptures();
  }

  if (importedInboxIds.length > 0) {
    setPendingInboxSelection(importedInboxIds);
  }

  return importedInboxIds.length;
}
