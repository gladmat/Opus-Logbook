/**
 * SkinCancerSummaryPanel
 * ══════════════════════
 * Accept-mapping flow panel for the skin cancer module.
 *
 * Owns the module-specific computation (headline, key facts, diagnosis
 * resolution, default selection) and delegates the visual chrome to the
 * shared `AcceptedMappingCard` so every specialty's accept flow lands on
 * identical UI (audit P3.2).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import {
  getDefaultSkinCancerSelectedProcedureIds,
  getSkinCancerPrimaryHistology,
  resolveSkinCancerDiagnosis,
} from "@/lib/skinCancerConfig";
import type { SkinCancerLesionAssessment } from "@/types/skinCancer";
import {
  AcceptedMappingCard,
  type AcceptedMappingProcedureRow,
} from "@/components/case-form/AcceptedMappingCard";

interface SkinCancerSummaryPanelProps {
  assessment: SkinCancerLesionAssessment;
  suggestedProcedureIds: string[];
  acceptedProcedureIds?: string[];
  isAccepted: boolean;
  onAccept: (procedurePicklistIds: string[]) => void;
  onEditMapping?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  bcc: "BCC",
  scc: "SCC",
  melanoma: "Melanoma",
  merkel_cell: "MCC",
  rare_malignant: "Other malig.",
  benign: "Benign",
  uncertain: "Uncertain",
};

function buildHeadline(assessment: SkinCancerLesionAssessment): string {
  const pathology =
    getSkinCancerPrimaryHistology(assessment)?.pathologyCategory ??
    assessment.clinicalSuspicion;
  const label = pathology ? (CATEGORY_LABELS[pathology] ?? pathology) : "—";
  const site = assessment.site;
  const lat = assessment.laterality;

  const parts = [label];
  if (site) {
    const siteWithLat = lat && lat !== "midline" ? `${site}, ${lat}` : site;
    parts.push(siteWithLat);
  }
  return parts.join(" — ");
}

function buildKeyFacts(assessment: SkinCancerLesionAssessment): string[] {
  const facts: string[] = [];
  const histo = getSkinCancerPrimaryHistology(assessment);

  if (histo?.melanomaBreslowMm !== undefined) {
    facts.push(`Breslow ${histo.melanomaBreslowMm}mm`);
  }
  if (histo?.melanomaUlceration) {
    facts.push("Ulcerated");
  }
  if (histo?.marginStatus && histo.marginStatus !== "pending") {
    const statusLabel =
      histo.marginStatus === "complete"
        ? "Clear margins"
        : histo.marginStatus === "close"
          ? "Close margins"
          : histo.marginStatus === "incomplete"
            ? "Involved margins"
            : histo.marginStatus;
    facts.push(statusLabel);
  }
  if (assessment.slnb?.performed) {
    const result = assessment.slnb.result;
    if (result && result !== "pending") {
      facts.push(
        `SLNB ${result.replace("positive_", "+").replace("negative", "−")}`,
      );
    } else {
      facts.push("SLNB pending");
    }
  }
  const resolved = resolveSkinCancerDiagnosis(assessment);
  if (resolved?.reviewNote) {
    facts.push(resolved.reviewNote);
  }
  return facts;
}

export function SkinCancerSummaryPanel({
  assessment,
  suggestedProcedureIds,
  acceptedProcedureIds,
  isAccepted,
  onAccept,
  onEditMapping,
}: SkinCancerSummaryPanelProps) {
  const wasAcceptedRef = useRef(isAccepted);

  const headline = useMemo(() => buildHeadline(assessment), [assessment]);
  const keyFacts = useMemo(() => buildKeyFacts(assessment), [assessment]);

  const resolvedDiagnosis = useMemo(
    () => resolveSkinCancerDiagnosis(assessment),
    [assessment],
  );

  const suggestedRows = useMemo<AcceptedMappingProcedureRow[]>(
    () =>
      suggestedProcedureIds
        .map((id) => {
          const entry = findPicklistEntry(id);
          if (!entry) return null;
          return {
            id,
            name: entry.displayName,
            snomedCtCode: entry.snomedCtCode,
          } as AcceptedMappingProcedureRow;
        })
        .filter((r): r is AcceptedMappingProcedureRow => r !== null),
    [suggestedProcedureIds],
  );

  const [selectedProcedureIds, setSelectedProcedureIds] = useState<Set<string>>(
    () =>
      new Set(
        getDefaultSkinCancerSelectedProcedureIds(
          assessment,
          suggestedProcedureIds,
        ),
      ),
  );

  const acceptedProcedureIdSet = useMemo(
    () => new Set(acceptedProcedureIds ?? []),
    [acceptedProcedureIds],
  );

  useEffect(() => {
    const wasAccepted = wasAcceptedRef.current;
    wasAcceptedRef.current = isAccepted;

    let nextIds = getDefaultSkinCancerSelectedProcedureIds(
      assessment,
      suggestedProcedureIds,
    );
    if (isAccepted && acceptedProcedureIds && acceptedProcedureIds.length > 0) {
      nextIds = acceptedProcedureIds;
    } else if (
      !isAccepted &&
      wasAccepted &&
      acceptedProcedureIds &&
      acceptedProcedureIds.length > 0
    ) {
      nextIds = acceptedProcedureIds.filter((id) =>
        suggestedProcedureIds.includes(id),
      );
    }
    setSelectedProcedureIds(new Set(nextIds));
  }, [acceptedProcedureIds, assessment, isAccepted, suggestedProcedureIds]);

  const acceptedRows = useMemo<AcceptedMappingProcedureRow[]>(
    () => suggestedRows.filter((proc) => acceptedProcedureIdSet.has(proc.id)),
    [acceptedProcedureIdSet, suggestedRows],
  );

  const toggleProcedureSelection = (procedureId: string) => {
    if (isAccepted) return;
    setSelectedProcedureIds((prev) => {
      const next = new Set(prev);
      if (next.has(procedureId)) {
        next.delete(procedureId);
      } else {
        next.add(procedureId);
      }
      return next;
    });
  };

  return (
    <AcceptedMappingCard
      isAccepted={isAccepted}
      headline={headline}
      keyFacts={keyFacts}
      suggestedProcedures={suggestedRows}
      selectedSuggestedProcedureIds={selectedProcedureIds}
      onToggleSuggestedProcedure={toggleProcedureSelection}
      acceptedProcedures={acceptedRows}
      canAccept={selectedProcedureIds.size > 0}
      onAccept={() => onAccept([...selectedProcedureIds])}
      onEditMapping={onEditMapping}
      preAcceptEmptyHint="No suggested procedures for the current assessment."
      postAcceptEmptyHint="No accepted suggested procedures recorded."
      codingDiagnosis={
        resolvedDiagnosis
          ? {
              displayName: resolvedDiagnosis.displayName,
              snomedCtCode: resolvedDiagnosis.snomedCtCode,
            }
          : undefined
      }
      acceptButtonTestID="caseForm.skinCancer.btn-acceptMapping"
      editMappingTestID="caseForm.skinCancer.btn-editMapping"
      procedureRowTestIDPrefix="caseForm.skinCancer.chip-procedure"
    />
  );
}
