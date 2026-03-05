import { Share } from "react-native";
import { getCases } from "./storage";
import { getEpisodes } from "./episodeStorage";
import { exportCasesAsCsv } from "./exportCsv";
import { exportCasesAsFhir } from "./exportFhir";
import { TreatmentEpisode } from "@/types/episode";

export type ExportFormat = "json" | "csv" | "fhir";

export interface ExportOptions {
  format: ExportFormat;
  includePatientId?: boolean;
}

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  json: "JSON (Raw data)",
  csv: "CSV (Spreadsheet)",
  fhir: "FHIR R4 (Interoperability)",
};

export async function exportCases(options: ExportOptions): Promise<void> {
  const cases = await getCases();
  if (cases.length === 0) {
    throw new Error("No cases to export");
  }

  // Load episodes for CSV (title lookup) and FHIR (EpisodeOfCare resources)
  let episodes: TreatmentEpisode[] = [];
  try {
    episodes = await getEpisodes();
  } catch {
    // Episodes are optional — export proceeds without them
  }
  const episodeMap = new Map(episodes.map((e) => [e.id, e]));

  let content: string;
  let title: string;

  switch (options.format) {
    case "csv":
      content = exportCasesAsCsv(cases, {
        includePatientId: options.includePatientId ?? true,
        episodeMap,
      });
      title = "Opus Export (CSV)";
      break;
    case "fhir":
      content = exportCasesAsFhir(cases, episodes);
      title = "Opus Export (FHIR R4)";
      break;
    default:
      content = JSON.stringify(cases, null, 2);
      title = "Opus Export (JSON)";
      break;
  }

  await Share.share({ message: content, title });
}
