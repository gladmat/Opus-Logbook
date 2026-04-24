import type { Specialty } from "@/types/case";
import type { OperativeRole } from "@/types/operativeRole";

export interface CaseSummary {
  id: string;
  procedureDate: string;
  createdAt: string;
  updatedAt: string;
  patientIdentifier: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientDisplayName?: string;
  patientNhi?: string;
  facility?: string;
  specialty: Specialty;
  specialties: Specialty[];
  caseStatus?: string;
  plannedDate?: string;
  plannedTemplateId?: string;
  plannedNote?: string;
  episodeId?: string;
  encounterClass?: string;
  stayType?: string;
  dischargeDate?: string;
  outcomeRecorded: boolean;
  procedureType?: string;
  diagnosisTitle?: string;
  primaryProcedureName?: string;
  procedureNames: string[];
  operativeMediaCount: number;
  /** opus-media:{uuid} URI of the first operative photo, for list thumbnails. */
  firstOperativeMediaUri?: string;
  canAddHistology: boolean;
  needsHistology: boolean;
  infectionStatus?: "active" | "resolved" | "deceased";
  infectionSyndrome?: string;
  hasSevereHandInfection: boolean;
  operativeRole?: OperativeRole;
  skinCancerBadgeLabel?: string;
  skinCancerBadgeColorKey?: "error" | "warning" | "info" | "success";
  siteLabel?: string;
  searchableText: string;
}

export function isPlannedCaseSummary(
  summary: Pick<CaseSummary, "caseStatus">,
): boolean {
  return summary.caseStatus === "planned";
}
