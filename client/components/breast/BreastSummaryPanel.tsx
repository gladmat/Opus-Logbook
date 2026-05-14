/**
 * BreastSummaryPanel
 * ══════════════════
 * Accept-mapping flow panel for the breast module.
 *
 * Owns the module-specific computation (mapping per-procedure data,
 * draft-count gating) and delegates the visual chrome to the shared
 * `AcceptedMappingCard` so every specialty's accept flow lands on
 * identical UI (audit P3.2).
 */

import React, { useMemo } from "react";
import type { CaseProcedure } from "@/types/case";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import {
  AcceptedMappingCard,
  type AcceptedMappingProcedureRow,
} from "@/components/case-form/AcceptedMappingCard";

interface SuggestedProcedure {
  id: string;
  name: string;
}

interface BreastSummaryPanelProps {
  diagnosisName: string;
  diagnosisCode?: string;
  summaryChips: string[];
  suggestedProcedures: SuggestedProcedure[];
  selectedSuggestedProcedureIds: Set<string>;
  acceptedProcedures: CaseProcedure[];
  draftProcedureCount: number;
  isAccepted: boolean;
  onToggleSuggestedProcedure: (procedureId: string) => void;
  onBrowseFullPicker?: () => void;
  onAccept: () => void;
  onEditMapping?: () => void;
}

export function BreastSummaryPanel({
  diagnosisName,
  diagnosisCode,
  summaryChips,
  suggestedProcedures,
  selectedSuggestedProcedureIds,
  acceptedProcedures,
  draftProcedureCount,
  isAccepted,
  onToggleSuggestedProcedure,
  onBrowseFullPicker,
  onAccept,
  onEditMapping,
}: BreastSummaryPanelProps) {
  // Breast accepts both suggestion-derived and manually-added procedures, so
  // `acceptedProcedures` arrives as `CaseProcedure[]` from the parent rather
  // than a filtered subset of suggestions.
  const acceptedRows = useMemo<AcceptedMappingProcedureRow[]>(
    () =>
      acceptedProcedures
        .filter((procedure) => procedure.procedureName.trim().length > 0)
        .map((procedure) => ({
          id: procedure.id,
          name: procedure.procedureName,
          snomedCtCode:
            procedure.snomedCtCode ||
            (procedure.picklistEntryId
              ? findPicklistEntry(procedure.picklistEntryId)?.snomedCtCode
              : undefined),
        })),
    [acceptedProcedures],
  );

  const suggestedRows = useMemo<AcceptedMappingProcedureRow[]>(
    () => suggestedProcedures.map(({ id, name }) => ({ id, name })),
    [suggestedProcedures],
  );

  return (
    <AcceptedMappingCard
      isAccepted={isAccepted}
      headline={diagnosisName}
      keyFacts={summaryChips}
      suggestedProcedures={suggestedRows}
      selectedSuggestedProcedureIds={selectedSuggestedProcedureIds}
      onToggleSuggestedProcedure={onToggleSuggestedProcedure}
      acceptedProcedures={acceptedRows}
      canAccept={draftProcedureCount > 0}
      onAccept={onAccept}
      onEditMapping={onEditMapping}
      onBrowseFullPicker={onBrowseFullPicker}
      preAcceptEmptyHint="No suggested procedures for this diagnosis yet."
      codingDiagnosis={{
        displayName: diagnosisName,
        snomedCtCode: diagnosisCode,
      }}
    />
  );
}
