import {
  ANATOMICAL_REGION_LABELS,
  type CaseProcedure,
  DONOR_SITE_COMPLICATION_LABELS,
  FLAP_SURVIVAL_LABELS,
  FREE_FLAP_LABELS,
  type FreeFlapDetails,
  INDICATION_LABELS,
  RE_EXPLORATION_FINDING_LABELS,
  RE_EXPLORATION_INTERVENTION_LABELS,
  RECIPIENT_SITE_COMPLICATION_LABELS,
  SALVAGE_OUTCOME_LABELS,
  VEIN_GRAFT_SOURCE_LABELS,
} from "@/types/case";
import { OPERATIVE_ROLE_LABELS } from "@/types/operativeRole";
import {
  ANTICOAGULATION_PROTOCOLS,
  FLAP_MONITORING_PROTOCOLS,
} from "@/types/surgicalPreferences";
import type {
  ProcedureReportContext,
  ProcedureReportDefinition,
  ReportColumn,
} from "../types";
import { procedureCoreColumns } from "./commonColumns";

/**
 * Free flap audit — one row per free-flap procedure with the registry
 * fields (imaging/anticoagulation/monitoring protocols, ischaemia,
 * anastomoses, vein grafting) plus structured flap outcomes.
 *
 * Eligibility mirrors the statistics module's flap detection: a procedure
 * tagged "free_flap" carrying clinical details. Legacy cases that only
 * hold case-level flap details (pre-multi-group era) are not included.
 */

function flapDetails(procedure: CaseProcedure): FreeFlapDetails | undefined {
  if (procedure.tags?.includes("free_flap") !== true) return undefined;
  if (!procedure.clinicalDetails) return undefined;
  return procedure.clinicalDetails as FreeFlapDetails;
}

function flapColumn(
  key: string,
  header: string,
  extract: (
    details: FreeFlapDetails,
    ctx: ProcedureReportContext,
  ) => string | number | boolean | undefined,
): ReportColumn<ProcedureReportContext> {
  return {
    key,
    header,
    extract: (ctx) => {
      const details = flapDetails(ctx.procedure);
      return details ? extract(details, ctx) : "";
    },
  };
}

function yesNo(value: boolean | undefined): string {
  return value === undefined ? "" : value ? "Yes" : "No";
}

export const freeFlapAuditReport: ProcedureReportDefinition = {
  id: "free_flap_audit",
  title: "Free Flap Audit",
  description:
    "Per-flap audit extract: flap type, recipient site, ischaemia, anastomoses, protocols, survival, re-exploration and complications.",
  category: "audit",
  granularity: "procedure",
  isProcedureEligible: (_c, _g, p) => flapDetails(p) !== undefined,
  eligibilityHint: "Only procedures tagged as free flaps are included.",
  defaultIncludePatientId: true,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "flap_type",
    "recipient_region",
    "ischaemia_minutes",
    "flap_survival",
    "re_explored",
  ],
  roleSummaryColumn: "flap_survival",
  columns: [
    ...procedureCoreColumns(),
    {
      key: "operative_role",
      header: "Role",
      extract: (ctx) => OPERATIVE_ROLE_LABELS[ctx.role],
    },
    flapColumn(
      "flap_type",
      "Flap Type",
      (d) =>
        d.flapDisplayName ??
        (d.flapType ? (FREE_FLAP_LABELS[d.flapType] ?? d.flapType) : "") ??
        "",
    ),
    flapColumn("indication", "Indication", (d) =>
      d.indication ? (INDICATION_LABELS[d.indication] ?? "") : "",
    ),
    flapColumn(
      "recipient_site",
      "Recipient Site",
      (d) => d.recipientSite ?? "",
    ),
    flapColumn("recipient_region", "Recipient Region", (d) =>
      d.recipientSiteRegion
        ? (ANATOMICAL_REGION_LABELS[d.recipientSiteRegion] ?? "")
        : "",
    ),
    flapColumn(
      "ischaemia_minutes",
      "Ischaemia (min)",
      (d) => d.ischemiaTimeMinutes,
    ),
    flapColumn(
      "anastomosis_count",
      "Anastomoses",
      (d) => d.anastomoses?.length ?? 0,
    ),
    flapColumn("coupler_size_mm", "Coupler (mm)", (d) => d.couplerSizeMm),
    flapColumn("vein_graft", "Vein Graft", (d) => yesNo(d.veinGraftUsed)),
    flapColumn("vein_graft_source", "Vein Graft Source", (d) =>
      d.veinGraftSource
        ? (VEIN_GRAFT_SOURCE_LABELS[d.veinGraftSource] ?? "")
        : "",
    ),
    {
      key: "prior_radiotherapy",
      header: "Prior Radiotherapy",
      extract: (ctx) => yesNo(ctx.case.priorRadiotherapy),
    },
    flapColumn("anticoagulation_protocol", "Anticoagulation", (d) =>
      d.anticoagulationProtocol
        ? (ANTICOAGULATION_PROTOCOLS.find(
            (p) => p.id === d.anticoagulationProtocol,
          )?.label ?? d.anticoagulationProtocol)
        : "",
    ),
    flapColumn("monitoring_protocol", "Monitoring", (d) =>
      d.flapOutcome?.monitoringProtocol
        ? (FLAP_MONITORING_PROTOCOLS.find(
            (p) => p.id === d.flapOutcome?.monitoringProtocol,
          )?.label ?? d.flapOutcome.monitoringProtocol)
        : "",
    ),
    flapColumn("flap_survival", "Flap Survival", (d) =>
      d.flapOutcome
        ? (FLAP_SURVIVAL_LABELS[d.flapOutcome.flapSurvival] ?? "")
        : "",
    ),
    flapColumn(
      "partial_loss_pct",
      "Partial Loss (%)",
      (d) => d.flapOutcome?.partialLossPercentage,
    ),
    flapColumn("re_explored", "Re-explored", (d) =>
      yesNo(d.flapOutcome?.reExploration?.reExplored),
    ),
    flapColumn(
      "re_exploration_count",
      "Re-exploration Events",
      (d) => d.flapOutcome?.reExploration?.events?.length ?? "",
    ),
    flapColumn("re_exploration_finding", "First Finding", (d) => {
      const event = d.flapOutcome?.reExploration?.events?.[0];
      return event ? (RE_EXPLORATION_FINDING_LABELS[event.finding] ?? "") : "";
    }),
    flapColumn("re_exploration_intervention", "First Intervention", (d) => {
      const event = d.flapOutcome?.reExploration?.events?.[0];
      return event
        ? (RE_EXPLORATION_INTERVENTION_LABELS[event.intervention] ?? "")
        : "";
    }),
    flapColumn("salvage_outcome", "Salvage Outcome", (d) => {
      const event = d.flapOutcome?.reExploration?.events?.[0];
      return event ? (SALVAGE_OUTCOME_LABELS[event.salvageOutcome] ?? "") : "";
    }),
    flapColumn("donor_site_complications", "Donor Site Complications", (d) =>
      (d.flapOutcome?.donorSiteComplications ?? [])
        .map((comp) => DONOR_SITE_COMPLICATION_LABELS[comp] ?? comp)
        .join("; "),
    ),
    flapColumn(
      "recipient_site_complications",
      "Recipient Site Complications",
      (d) =>
        (d.flapOutcome?.recipientSiteComplications ?? [])
          .map((comp) => RECIPIENT_SITE_COMPLICATION_LABELS[comp] ?? comp)
          .join("; "),
    ),
  ],
};
