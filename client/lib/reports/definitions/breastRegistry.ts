import type { Case } from "@/types/case";
import {
  type BreastExportData,
  type BreastSideExportData,
  getBreastExportData,
} from "@/lib/breastExport";
import type {
  CaseReportContext,
  CaseReportDefinition,
  ReportColumn,
} from "../types";
import {
  auditOutcomeColumns,
  caseCoreColumns,
  patientIdentityColumns,
} from "./commonColumns";

/**
 * Breast implant registry (ABDR-style) — one row per case with left/right
 * device column pairs, matching the shape of the shared breast export
 * normaliser. Device registries require patient identity, so the full
 * identity block is included and identifiers default ON.
 *
 * Note: real-world device registries are often one row per DEVICE; this
 * v1 keeps the per-case L/R layout used across the app's breast export.
 */

const exportDataCache = new WeakMap<Case, BreastExportData | undefined>();

function breastData(c: Case): BreastExportData | undefined {
  if (!exportDataCache.has(c)) {
    exportDataCache.set(c, getBreastExportData(c.diagnosisGroups ?? []));
  }
  return exportDataCache.get(c);
}

function hasAnyImplant(c: Case): boolean {
  const data = breastData(c);
  if (!data) return false;
  return Boolean(data.sides.left?.implant || data.sides.right?.implant);
}

type BreastSide = "left" | "right";

function sideColumn(
  side: BreastSide,
  key: string,
  header: string,
  extract: (
    sideData: BreastSideExportData,
  ) => string | number | boolean | undefined,
): ReportColumn<CaseReportContext> {
  const prefix = side === "left" ? "L" : "R";
  return {
    key: `${side}_${key}`,
    header: `${prefix} ${header}`,
    extract: (ctx) => {
      const sideData = breastData(ctx.case)?.sides[side];
      return sideData ? extract(sideData) : "";
    },
  };
}

function sideColumns(side: BreastSide): ReportColumn<CaseReportContext>[] {
  return [
    sideColumn(side, "context", "Context", (s) => s.clinicalContextLabel ?? ""),
    sideColumn(
      side,
      "recon_timing",
      "Recon Timing",
      (s) => s.reconstructionTimingLabel ?? "",
    ),
    sideColumn(
      side,
      "device_type",
      "Device Type",
      (s) => s.implant?.deviceType ?? "",
    ),
    sideColumn(
      side,
      "manufacturer",
      "Manufacturer",
      (s) => s.implant?.manufacturerLabel ?? "",
    ),
    sideColumn(side, "volume_cc", "Volume (cc)", (s) => s.implant?.volumeCc),
    sideColumn(
      side,
      "surface",
      "Surface",
      (s) => s.implant?.surfaceLabel ?? "",
    ),
    sideColumn(side, "fill", "Fill", (s) => s.implant?.fillLabel ?? ""),
    sideColumn(side, "shape", "Shape", (s) => s.implant?.shapeLabel ?? ""),
    sideColumn(
      side,
      "profile",
      "Profile",
      (s) => s.implant?.profileLabel ?? "",
    ),
    sideColumn(side, "plane", "Plane", (s) => s.implant?.planeLabel ?? ""),
    sideColumn(
      side,
      "incision",
      "Incision",
      (s) => s.implant?.incisionLabel ?? "",
    ),
    sideColumn(side, "adm_used", "ADM Used", (s) =>
      s.implant?.admUsed === undefined ? "" : s.implant.admUsed ? "Yes" : "No",
    ),
    sideColumn(
      side,
      "adm_product",
      "ADM Product",
      (s) => s.implant?.admProduct ?? "",
    ),
  ];
}

export const breastDeviceRegistryReport: CaseReportDefinition = {
  id: "breast_device_registry",
  title: "Breast Device Registry",
  description:
    "ABDR-style implant registry extract: device details per side (manufacturer, volume, surface, plane, ADM) with patient identity and 30-day outcomes.",
  category: "registry",
  granularity: "case",
  isCaseEligible: hasAnyImplant,
  eligibilityHint: "Only implant-bearing breast cases are included.",
  defaultIncludePatientId: true,
  pdfTableColumns: [
    "procedure_date",
    "facility",
    "left_manufacturer",
    "left_volume_cc",
    "right_manufacturer",
    "right_volume_cc",
  ],
  columns: [
    ...caseCoreColumns(),
    ...patientIdentityColumns(),
    ...sideColumns("left"),
    ...sideColumns("right"),
    ...auditOutcomeColumns(),
  ],
};
