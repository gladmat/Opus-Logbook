import { File } from "expo-file-system";

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
