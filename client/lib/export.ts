import { Share } from "react-native";
import { getCases } from "./storage";
import { exportCasesAsCsv } from "./exportCsv";
import { exportCasesAsFhir } from "./exportFhir";

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

  let content: string;
  let title: string;

  switch (options.format) {
    case "csv":
      content = exportCasesAsCsv(cases, {
        includePatientId: options.includePatientId ?? true,
      });
      title = "Surgical Logbook Export (CSV)";
      break;
    case "fhir":
      content = exportCasesAsFhir(cases);
      title = "Surgical Logbook Export (FHIR R4)";
      break;
    default:
      content = JSON.stringify(cases, null, 2);
      title = "Surgical Logbook Export (JSON)";
      break;
  }

  await Share.share({ message: content, title });
}
