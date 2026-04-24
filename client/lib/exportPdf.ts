import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import type { Case } from "@/types/case";
import { buildPdfHtml, type PdfExportOptions } from "@/lib/exportPdfHtml";

export type { PdfExportOptions } from "@/lib/exportPdfHtml";

export async function exportCasesAsPdf(
  cases: Case[],
  options: PdfExportOptions = { includePatientId: true },
): Promise<void> {
  const html = buildPdfHtml(cases, options);
  const { uri } = await Print.printToFileAsync({ html });
  try {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      throw new Error(
        "Sharing is not available on this device. Export aborted.",
      );
    }
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  } finally {
    // Delete the Print temp file whether the share succeeded, failed, or
    // was cancelled. `Print.printToFileAsync` writes to
    // `/tmp/.../Print/<uuid>.pdf` which otherwise lingers until the OS
    // reclaims the cache — leaving a PDF containing patient names + DOBs
    // on disk for days.
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // Best-effort cleanup — ignore failures (e.g. a share target holding
      // the file handle open briefly).
    }
  }
}
