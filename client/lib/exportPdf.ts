import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Case } from "@/types/case";
import { buildPdfHtml, type PdfExportOptions } from "@/lib/exportPdfHtml";

export type { PdfExportOptions } from "@/lib/exportPdfHtml";

export async function exportCasesAsPdf(
  cases: Case[],
  options: PdfExportOptions = { includePatientId: true },
): Promise<void> {
  const html = buildPdfHtml(cases, options);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
  });
}
