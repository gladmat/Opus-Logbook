import { Alert } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * Shared PHI-confirmation + temp-file + share-sheet plumbing used by both
 * the complete data export (export.ts) and the targeted report generator
 * (client/lib/reports/generateReport.ts).
 *
 * Behavioural contract (established during the 2.6.0 security remediation):
 * - Every interactive PHI-bearing share is gated behind an explicit
 *   "contains patient data" confirmation Alert.
 * - Content is written to `Paths.cache/opus-exports/` (OS-reclaimable,
 *   excluded from iCloud backup) and shared as a file URI — never as a raw
 *   string through `Share.share({ message })`.
 * - The temp file is deleted in `finally` whether the share succeeds,
 *   fails, or is cancelled.
 */

/**
 * Prompt the user to confirm they're about to share patient-identifiable
 * data. Resolves true if the user proceeds, false otherwise.
 * `subjectLabel` names what is being shared (e.g. a format label or a
 * report title) so the message reads naturally.
 */
export function confirmPhiShare(subjectLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Export contains patient data",
      `The ${subjectLabel} export you're about to share contains identifiable patient information (NHI, names, dates of birth). Only share this with parties who are authorised to handle it.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Write `content` to a temp file inside `Paths.cache/opus-exports/` and
 * return the file. Accepts a string (CSV/JSON/HTML) or bytes (XLSX).
 */
export function writeShareFileToCache(
  content: string | Uint8Array,
  opts: { stem: string; extension: string },
): File {
  const exportsDir = new Directory(Paths.cache, "opus-exports");
  if (!exportsDir.exists) {
    exportsDir.create({ idempotent: true, intermediates: true });
  }
  const filename = `${opts.stem}.${opts.extension}`;
  const file = new File(exportsDir, filename);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  file.write(content);
  return file;
}

/**
 * Open the share sheet for `file`, then delete it regardless of outcome —
 * we don't want a plaintext export lingering in the cache directory
 * waiting for an OS sweep.
 */
export async function shareAndCleanup(
  file: File,
  mimeType: string,
  dialogTitle: string = "Share Opus export",
): Promise<void> {
  try {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      throw new Error(
        "Sharing is not available on this device. Export aborted.",
      );
    }
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      // Best-effort — the OS cleans the cache dir eventually anyway.
    }
  }
}
