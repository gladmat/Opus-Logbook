import { Alert } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getCases } from "./storage";
import { getEpisodes } from "./episodeStorage";
import { exportCasesAsCsv } from "./exportCsv";
import { exportCasesAsFhir } from "./exportFhir";
import { exportCasesAsPdf } from "./exportPdf";
import { TreatmentEpisode } from "@/types/episode";

export type ExportFormat = "json" | "csv" | "fhir" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  includePatientId?: boolean;
  /**
   * When true, skip the PHI-confirmation dialog. Reserved for automated
   * flows / tests. Interactive callers should leave this undefined so the
   * user explicitly acknowledges the export contains patient data.
   */
  skipPhiConfirmation?: boolean;
}

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  json: "JSON (Raw data)",
  csv: "CSV (Spreadsheet)",
  fhir: "FHIR R4 (Interoperability)",
  pdf: "PDF (Document)",
};

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  json: "json",
  csv: "csv",
  fhir: "json",
  pdf: "pdf",
};

const FORMAT_MIME_TYPES: Record<ExportFormat, string> = {
  json: "application/json",
  csv: "text/csv",
  fhir: "application/fhir+json",
  pdf: "application/pdf",
};

/**
 * Prompt the user to confirm they're about to share patient-identifiable
 * data. Resolves true if the user proceeds, false otherwise. On iOS this
 * is a modal Alert; on hostile UX surfaces (automated tests) callers can
 * bypass via `skipPhiConfirmation: true`.
 */
function confirmPhiExport(format: ExportFormat): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Export contains patient data",
      `The ${EXPORT_FORMAT_LABELS[format]} export you're about to share contains identifiable patient information (NHI, names, dates of birth). Only share this with parties who are authorised to handle it.`,
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
 * Write `content` to a temp file inside `Paths.cache` and return the file.
 * `Paths.cache` files are OS-reclaimable and never included in iCloud
 * backup — the appropriate tier for a transient export that we'll delete
 * moments later anyway.
 */
function writeExportToCache(
  content: string,
  format: ExportFormat,
  stem: string,
): File {
  const exportsDir = new Directory(Paths.cache, "opus-exports");
  if (!exportsDir.exists) {
    exportsDir.create({ idempotent: true, intermediates: true });
  }
  const filename = `${stem}.${FORMAT_EXTENSIONS[format]}`;
  const file = new File(exportsDir, filename);
  if (file.exists) file.delete();
  file.create({ overwrite: true });
  file.write(content);
  return file;
}

function exportFilenameStem(format: ExportFormat): string {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `opus-export-${dateStamp}-${format}`;
}

export async function exportCases(options: ExportOptions): Promise<void> {
  const cases = await getCases();
  if (cases.length === 0) {
    throw new Error("No cases to export");
  }

  // Gate every export behind an explicit "contains patient data" confirm.
  // Prior versions silently launched the Share Sheet — a mis-tap sent the
  // whole CSV (names, NHIs, DOBs) to whoever was last in the user's
  // iMessage thread.
  if (!options.skipPhiConfirmation) {
    const confirmed = await confirmPhiExport(options.format);
    if (!confirmed) return;
  }

  // Load episodes for CSV (title lookup) and FHIR (EpisodeOfCare resources)
  let episodes: TreatmentEpisode[] = [];
  try {
    episodes = await getEpisodes();
  } catch {
    // Episodes are optional — export proceeds without them
  }
  const episodeMap = new Map(episodes.map((e) => [e.id, e]));

  if (options.format === "pdf") {
    await exportCasesAsPdf(cases, {
      includePatientId: options.includePatientId ?? true,
    });
    return;
  }

  let content: string;

  switch (options.format) {
    case "csv":
      content = exportCasesAsCsv(cases, {
        includePatientId: options.includePatientId ?? true,
        episodeMap,
      });
      break;
    case "fhir":
      content = exportCasesAsFhir(cases, episodes);
      break;
    default:
      content = JSON.stringify(cases, null, 2);
      break;
  }

  // Write to a temp file and share the file URI. Previously used
  // `Share.share({ message: content })` which routed the raw CSV/FHIR/JSON
  // text through the iOS Share Sheet as a string — targets like Messages,
  // Mail, Notes, WhatsApp and watchOS previews would index the PHI string
  // directly. File-based sharing restricts the target set to apps that
  // can handle a document (Files.app, Mail-as-attachment, AirDrop).
  const stem = exportFilenameStem(options.format);
  const tempFile = writeExportToCache(content, options.format, stem);

  try {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      throw new Error(
        "Sharing is not available on this device. Export aborted.",
      );
    }
    await Sharing.shareAsync(tempFile.uri, {
      mimeType: FORMAT_MIME_TYPES[options.format],
      dialogTitle: "Share Opus export",
    });
  } finally {
    // Delete the temp file whether the share succeeded, failed, or was
    // cancelled — we don't want a plaintext CSV lingering in the cache
    // directory waiting for an OS sweep.
    try {
      if (tempFile.exists) tempFile.delete();
    } catch {
      // Best-effort — the OS cleans the cache dir eventually anyway.
    }
  }
}
