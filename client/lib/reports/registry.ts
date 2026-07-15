import type { UserProfile } from "@/lib/auth";
import type { ReportCategory, ReportDefinition } from "./types";
import { ukElogbookReport } from "./definitions/ukElogbook";
import {
  racsJdocsReport,
  racsMaltPlasticsReport,
} from "./definitions/racsMalt";
import { acgmeCaseLogReport } from "./definitions/acgme";
import { germanWeiterbildungReport } from "./definitions/germanWb";
import { swissSiwfReport } from "./definitions/swissSiwf";
import { eboprasLogReport } from "./definitions/ebopras";
import { breastDeviceRegistryReport } from "./definitions/breastRegistry";
import { burnsRegistryReport } from "./definitions/burnsRegistry";
import { freeFlapAuditReport } from "./definitions/freeFlapAudit";

/**
 * Central registry of report definitions. Order within a category is the
 * display order on the Reports screen.
 */
export const REPORT_DEFINITIONS: ReportDefinition[] = [
  racsMaltPlasticsReport,
  racsJdocsReport,
  ukElogbookReport,
  acgmeCaseLogReport,
  germanWeiterbildungReport,
  swissSiwfReport,
  eboprasLogReport,
  breastDeviceRegistryReport,
  burnsRegistryReport,
  freeFlapAuditReport,
];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  "training-body": "Training Body",
  registry: "Registry",
  audit: "Audit",
};

export function getReportDefinition(id: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((def) => def.id === id);
}

export function getReportsByCategory(
  category: ReportCategory,
): ReportDefinition[] {
  return REPORT_DEFINITIONS.filter((def) => def.category === category);
}

/**
 * Pick the report to pre-select on the Reports screen from the user's
 * training programme (strongest signal), then country of practice.
 */
export function suggestReportForProfile(
  profile: UserProfile | null,
): ReportDefinition {
  const fallback = REPORT_DEFINITIONS[0];
  if (!fallback) {
    throw new Error("No report definitions registered");
  }
  if (!profile) return fallback;

  const programme =
    profile.surgicalPreferences?.personalization?.trainingProgramme ?? null;
  if (programme) {
    const byProgramme = REPORT_DEFINITIONS.find((def) =>
      def.suggestFor?.programmes?.includes(programme),
    );
    if (byProgramme) return byProgramme;
  }

  const country = profile.countryOfPractice;
  if (country) {
    const byCountry = REPORT_DEFINITIONS.find((def) =>
      def.suggestFor?.countries?.includes(country),
    );
    if (byCountry) return byCountry;
  }

  return fallback;
}
