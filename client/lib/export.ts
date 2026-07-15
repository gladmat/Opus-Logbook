import { getCases } from "./storage";
import { getEpisodes } from "./episodeStorage";
import { exportCasesAsCsv } from "./exportCsv";
import { exportCasesAsFhir } from "./exportFhir";
import { exportCasesAsPdf } from "./exportPdf";
import {
  confirmPhiShare,
  shareAndCleanup,
  writeShareFileToCache,
} from "./exportShare";
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
    const confirmed = await confirmPhiShare(
      EXPORT_FORMAT_LABELS[options.format],
    );
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

  // Write to a temp file and share the file URI — file-based sharing
  // restricts the target set to apps that can handle a document
  // (Files.app, Mail-as-attachment, AirDrop). See exportShare.ts for the
  // full contract.
  const tempFile = writeShareFileToCache(content, {
    stem: exportFilenameStem(options.format),
    extension: FORMAT_EXTENSIONS[options.format],
  });
  await shareAndCleanup(tempFile, FORMAT_MIME_TYPES[options.format]);
}
