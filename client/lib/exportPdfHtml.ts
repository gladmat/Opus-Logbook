import {
  BROWN_MANDIBLE_CLASS_LABELS,
  Case,
  JOINT_CASE_ABLATIVE_SURGEON_LABELS,
  JOINT_CASE_RECONSTRUCTION_SEQUENCE_LABELS,
  JOINT_CASE_STRUCTURE_RESECTED_LABELS,
  MANDIBLE_SEGMENT_LABELS,
  RECIPIENT_VESSEL_QUALITY_LABELS,
  SPECIALTY_LABELS,
  VEIN_GRAFT_SOURCE_LABELS,
  type FreeFlapDetails,
  JOINT_CASE_PARTNER_SPECIALTY_LABELS,
} from "@/types/case";
import {
  generateImplantSummary,
  getImplantBearingProcedures,
} from "@/lib/jointImplant";
import {
  resolveOperativeRole,
  formatRoleDisplay,
  resolveSupervisionLevel,
} from "@/types/operativeRole";
import {
  getOsteotomySummary,
  OSTEOTOMY_PROCEDURE_IDS,
} from "@/types/osteotomy";
import {
  getImplantSummary as getBreastImplantSummary,
  getFlapSummary as getBreastFlapSummary,
  getChestMascSummary,
  getLipofillingSummary,
} from "@/lib/breastConfig";
import { getBreastExportData } from "@/lib/breastExport";
import {
  generateDupuytrenSummaryText,
  calculateDiathesisScore,
} from "@/lib/dupuytrenHelpers";
import {
  NERVE_LABELS,
  MECHANISM_LABELS as PN_MECHANISM_LABELS,
  REPAIR_TECHNIQUE_LABELS,
  BP_PATTERN_LABELS,
  NEUROMA_TECHNIQUE_LABELS,
} from "@/types/peripheralNerve";
import {
  BP_APPROACH_LABELS,
  NEUROMA_AETIOLOGY_LABELS,
} from "@/lib/peripheralNerveConfig";

export interface PdfExportOptions {
  includePatientId?: boolean;
}

function getHeadNeckFlapSummary(caseData: Case): string {
  for (const group of caseData.diagnosisGroups ?? []) {
    for (const procedure of group.procedures ?? []) {
      if (
        (procedure.specialty ?? group.specialty) !== "head_neck" ||
        !procedure.tags?.includes("free_flap") ||
        !procedure.clinicalDetails
      ) {
        continue;
      }

      const details = procedure.clinicalDetails as FreeFlapDetails;
      const parts: string[] = [];
      const recipientVesselQuality = details.recipientVesselQuality;
      const veinGraftUsed = details.veinGraftUsed;

      if (recipientVesselQuality) {
        parts.push(RECIPIENT_VESSEL_QUALITY_LABELS[recipientVesselQuality]);
      }
      if (veinGraftUsed) {
        parts.push(
          `Vein graft${
            details.veinGraftSource
              ? ` (${VEIN_GRAFT_SOURCE_LABELS[details.veinGraftSource]})`
              : ""
          }`,
        );
      }
      if (details.flapSpecificDetails?.fibulaBrownClass) {
        parts.push(
          BROWN_MANDIBLE_CLASS_LABELS[
            details.flapSpecificDetails.fibulaBrownClass
          ],
        );
      }
      if (details.flapSpecificDetails?.fibulaMandibleSegments?.length) {
        parts.push(
          details.flapSpecificDetails.fibulaMandibleSegments
            .map((segment) => MANDIBLE_SEGMENT_LABELS[segment] ?? segment)
            .join(", "),
        );
      }

      return parts.join("; ");
    }
  }

  return "";
}

function getCraniofacialSummary(caseData: Case): string {
  const group = (caseData.diagnosisGroups ?? []).find(
    (g) => g.craniofacialAssessment,
  );
  if (!group?.craniofacialAssessment) return "";

  const ca = group.craniofacialAssessment;
  const parts: string[] = [];

  if (ca.cleftClassification) {
    const cleft = ca.cleftClassification;
    if (cleft.veauClass) parts.push(`Veau ${cleft.veauClass}`);
    if (cleft.laterality)
      parts.push(
        cleft.laterality.charAt(0).toUpperCase() + cleft.laterality.slice(1),
      );
  }

  if (ca.craniosynostosisDetails) {
    const cranio = ca.craniosynostosisDetails;
    const sutures = cranio.suturesInvolved?.join(", ") ?? "";
    parts.push(
      `Cranio: ${sutures}${cranio.syndromic ? ` (${cranio.syndromeName ?? "syndromic"})` : ""}`,
    );
  }

  if (ca.omensClassification) {
    const o = ca.omensClassification;
    parts.push(
      `OMENS: O${o.orbit}M-${o.mandible}E${o.ear}N${o.nerve}S${o.softTissue}`,
    );
  }

  const od = ca.operativeDetails;
  if (od.namedTechnique) parts.push(od.namedTechnique);
  if (od.boneGraftDonor)
    parts.push(`Graft: ${od.boneGraftDonor.replace(/_/g, " ")}`);

  if (ca.outcomes?.speech?.vpcRating != null) {
    const vpcLabels: Record<number, string> = {
      0: "competent",
      1: "borderline",
      2: "incompetent",
    };
    parts.push(
      `VPC: ${vpcLabels[ca.outcomes.speech.vpcRating] ?? ca.outcomes.speech.vpcRating}`,
    );
  }
  if (ca.outcomes?.dental?.goslonScore) {
    parts.push(`GOSLON: ${ca.outcomes.dental.goslonScore}/5`);
  }

  return parts.join(", ");
}

function getPeripheralNerveSummary(caseData: Case): string {
  const group = (caseData.diagnosisGroups ?? []).find(
    (g) => g.peripheralNerveAssessment,
  );
  if (!group?.peripheralNerveAssessment) return "";

  const pn = group.peripheralNerveAssessment;
  const parts: string[] = [];

  if (pn.nerveInjured) parts.push(NERVE_LABELS[pn.nerveInjured]);
  if (pn.sunderlandGrade) parts.push(`Sunderland ${pn.sunderlandGrade}`);
  if (pn.mechanism) parts.push(PN_MECHANISM_LABELS[pn.mechanism]);
  if (pn.repairTechnique)
    parts.push(REPAIR_TECHNIQUE_LABELS[pn.repairTechnique]);

  if (pn.brachialPlexus) {
    const bp = pn.brachialPlexus;
    if (bp.injuryPattern)
      parts.push(`BP: ${BP_PATTERN_LABELS[bp.injuryPattern]}`);
    if (bp.approach) parts.push(BP_APPROACH_LABELS[bp.approach]);
  }

  if (pn.neuroma) {
    const neuroma = pn.neuroma;
    if (neuroma.aetiology)
      parts.push(NEUROMA_AETIOLOGY_LABELS[neuroma.aetiology]);
    if (neuroma.technique)
      parts.push(NEUROMA_TECHNIQUE_LABELS[neuroma.technique]);
  }

  return parts.join(", ");
}

function getLymphaticSummary(caseData: Case): string {
  const group = (caseData.diagnosisGroups ?? []).find(
    (g) => g.lymphoedemaAssessment,
  );
  if (!group?.lymphoedemaAssessment) return "";

  const la = group.lymphoedemaAssessment;
  const parts: string[] = [];

  if (la.islStage) parts.push(`ISL ${la.islStage}`);
  if (la.affectedRegion) {
    const side = la.affectedSide ? ` ${la.affectedSide}` : "";
    parts.push(`${la.affectedRegion.replace(/_/g, " ")}${side}`);
  }
  if (la.limbMeasurements?.excessVolumePercent != null) {
    parts.push(`${la.limbMeasurements.excessVolumePercent}% excess`);
  }

  // Summarise procedure-level details
  for (const proc of group.procedures) {
    if (proc.lvaOperativeDetails?.anastomoses?.length) {
      parts.push(`LVA x${proc.lvaOperativeDetails.anastomoses.length}`);
    }
    if (proc.vlntDetails?.donorSite) {
      parts.push(`VLNT ${proc.vlntDetails.donorSite}`);
    }
    if (proc.saplDetails?.totalAspirateMl) {
      parts.push(`SAPL ${proc.saplDetails.totalAspirateMl}mL`);
    }
  }

  return parts.join(", ");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

export function buildPdfHtml(cases: Case[], options: PdfExportOptions): string {
  const now = new Date();
  const exportDate = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

  const dateRange =
    cases.length > 0
      ? `${formatDate(cases[cases.length - 1]?.procedureDate)} – ${formatDate(cases[0]?.procedureDate)}`
      : "";

  const headerCols = [
    "#",
    ...(options.includePatientId ? ["Patient"] : []),
    "Date",
    "Facility",
    "Specialty",
    "Role",
    "Primary Diagnosis",
    "Primary Procedure",
    "Implant",
    "Complications",
    "Outcome",
  ];

  const rows = cases.map((c, idx) => {
    const primary = c.diagnosisGroups?.[0];
    const primaryProc = primary?.procedures?.[0];
    const complications = c.hasComplications
      ? (c.complications || [])
          .map((comp) => comp.clavienDindoGrade || "Yes")
          .join(", ")
      : "None";

    const implantProcedures = (c.diagnosisGroups ?? []).flatMap((group) =>
      getImplantBearingProcedures(group.procedures ?? []),
    );
    const jointImplantSummary = implantProcedures
      .map((procedure) => {
        const summary = generateImplantSummary(procedure.implantDetails);
        return summary
          ? `${procedure.procedureName}: ${summary}`
          : `${procedure.procedureName}: implant details incomplete`;
      })
      .join("; ");

    // Breast-specific summary from breastAssessment
    const breastParts: string[] = [];
    const breast = getBreastExportData(c.diagnosisGroups ?? []);
    if (breast) {
      for (const side of ["left", "right"] as const) {
        const sideData = breast.assessment.sides[side];
        if (!sideData) continue;
        const prefix = side === "left" ? "L" : "R";
        const imp = getBreastImplantSummary(sideData.implantDetails);
        if (imp) breastParts.push(`${prefix}: ${imp}`);
        const flap = getBreastFlapSummary(sideData.flapDetails);
        if (flap) breastParts.push(`${prefix}: ${flap}`);
        const masc = getChestMascSummary(sideData.chestMasculinisation);
        if (masc) breastParts.push(`${prefix}: ${masc}`);
        const nipple = breast.sides[side]?.nipple?.techniqueLabel;
        if (nipple) breastParts.push(`${prefix}: ${nipple}`);
        const lipofillingVolume = breast.sides[side]?.lipofillingVolumeMl;
        if (lipofillingVolume && breast.assessment.lipofilling) {
          breastParts.push(
            `${prefix}: ${getLipofillingSummary({
              ...breast.assessment.lipofilling,
              injections: {
                [side]: breast.assessment.lipofilling.injections?.[side],
              },
            })}`,
          );
        }
      }

      if (breast.reconstructionEpisodeId) {
        breastParts.push(`Episode: ${breast.reconstructionEpisodeId}`);
      }
    }
    const headNeckFlapSummary = getHeadNeckFlapSummary(c);

    // Dupuytren assessment summary
    let dupuytrenSummary = "";
    const primaryGroup = c.diagnosisGroups?.[0];
    if (primaryGroup?.dupuytrenAssessment?.rays?.length) {
      const da = primaryGroup.dupuytrenAssessment;
      const parts = [`Dupuytren: ${generateDupuytrenSummaryText(da)}`];
      if (da.totalHandScore != null)
        parts.push(`score ${da.totalHandScore}/20`);
      if (da.dominantPattern) {
        const patternMap = {
          mcp_predominant: "MCP",
          pip_predominant: "PIP",
          mixed: "Mixed",
        };
        parts.push(patternMap[da.dominantPattern]);
      }
      if (da.diathesis && calculateDiathesisScore(da.diathesis) > 0) {
        parts.push(`diathesis ${calculateDiathesisScore(da.diathesis)}/4`);
      }
      dupuytrenSummary = parts.join(", ");
    }

    const craniofacialSummary = getCraniofacialSummary(c);
    const peripheralNerveSummary = getPeripheralNerveSummary(c);
    const lymphaticSummary = getLymphaticSummary(c);

    // Osteotomy summary
    const osteotomyProc = (c.diagnosisGroups ?? [])
      .flatMap((g) => g.procedures ?? [])
      .find(
        (p) =>
          p.picklistEntryId &&
          (OSTEOTOMY_PROCEDURE_IDS as readonly string[]).includes(
            p.picklistEntryId,
          ) &&
          p.osteotomyDetails?.bone,
      );
    const osteotomySummary = osteotomyProc?.osteotomyDetails
      ? `Osteotomy: ${getOsteotomySummary(osteotomyProc.osteotomyDetails)}`
      : "";

    const implantSummary = [jointImplantSummary, ...breastParts]
      .filter(Boolean)
      .join("; ");

    const role = resolveOperativeRole(undefined, c.defaultOperativeRole);
    const supervision = resolveSupervisionLevel(
      undefined,
      c.defaultSupervisionLevel,
      role,
    );
    const roleLabel = formatRoleDisplay(role, supervision);

    const cells = [
      String(idx + 1),
      ...(options.includePatientId
        ? [
            escapeHtml(
              [c.patientFirstName, c.patientLastName]
                .filter(Boolean)
                .join(" ") ||
                c.patientIdentifier ||
                "",
            ) +
              (c.patientNhi ? ` (${escapeHtml(c.patientNhi)})` : "") +
              (c.patientDateOfBirth
                ? `<br/><small>DOB: ${escapeHtml(c.patientDateOfBirth)}</small>`
                : ""),
          ]
        : []),
      formatDate(c.procedureDate),
      escapeHtml(c.facility || ""),
      escapeHtml(SPECIALTY_LABELS[c.specialty] || c.specialty),
      escapeHtml(roleLabel) +
        (c.responsibleConsultantName
          ? `<br/><small>${escapeHtml(c.responsibleConsultantName)}</small>`
          : "") +
        (c.jointCaseContext?.isJointCase && c.jointCaseContext.partnerSpecialty
          ? `<br/><small>Joint: ${escapeHtml(JOINT_CASE_PARTNER_SPECIALTY_LABELS[c.jointCaseContext.partnerSpecialty])}${c.jointCaseContext.partnerConsultantName ? ` (${escapeHtml(c.jointCaseContext.partnerConsultantName)})` : ""}</small>`
          : "") +
        (c.jointCaseContext?.ablativeSurgeon
          ? `<br/><small>Ablative: ${escapeHtml(JOINT_CASE_ABLATIVE_SURGEON_LABELS[c.jointCaseContext.ablativeSurgeon])}</small>`
          : "") +
        (c.jointCaseContext?.reconstructionSequence
          ? `<br/><small>Recon: ${escapeHtml(JOINT_CASE_RECONSTRUCTION_SEQUENCE_LABELS[c.jointCaseContext.reconstructionSequence])}</small>`
          : "") +
        (c.jointCaseContext?.structuresResected?.length
          ? `<br/><small>Resected: ${escapeHtml(c.jointCaseContext.structuresResected.map((value) => JOINT_CASE_STRUCTURE_RESECTED_LABELS[value] ?? value).join(", "))}</small>`
          : ""),
      escapeHtml(primary?.diagnosis?.displayName || ""),
      escapeHtml(primaryProc?.procedureName || ""),
      escapeHtml(
        [
          implantSummary,
          headNeckFlapSummary,
          dupuytrenSummary,
          osteotomySummary,
          craniofacialSummary,
          peripheralNerveSummary,
          lymphaticSummary,
        ]
          .filter(Boolean)
          .join("; "),
      ),
      escapeHtml(complications),
      escapeHtml(c.outcome || ""),
    ];

    return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 9px; color: #1F2328; }
  .header { padding: 16px 24px; border-bottom: 2px solid #E5A00D; margin-bottom: 12px; }
  .header h1 { font-size: 18px; font-weight: 700; color: #0C0F14; }
  .header .meta { font-size: 10px; color: #656D76; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 0 24px; }
  th { background: #0C0F14; color: #E6EDF3; font-weight: 600; font-size: 8px;
       text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; text-align: left; }
  td { padding: 5px 8px; border-bottom: 1px solid #D0D7DE; font-size: 9px; vertical-align: top; }
  tr:nth-child(even) td { background: #F6F8FA; }
  .footer { margin-top: 16px; padding: 12px 24px; font-size: 8px; color: #8B949E; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <h1>Opus — Surgical Case Export</h1>
    <div class="meta">${cases.length} cases · ${dateRange} · Exported ${exportDate}</div>
  </div>
  <table>
    <thead><tr>${headerCols.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.join("\n")}</tbody>
  </table>
  <div class="footer">Generated by Opus Logbook</div>
</body>
</html>`;
}
