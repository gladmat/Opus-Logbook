/**
 * AcuteHandSummaryPanel
 * ═════════════════════
 * Accept-mapping flow panel for acute hand diagnoses.
 *
 * Owns the module-specific computation (headline, infection key facts,
 * default selection) and delegates the visual chrome to the shared
 * `AcceptedMappingCard` so every specialty's accept flow lands on
 * identical UI (audit P3.2).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { findPicklistEntry } from "@/lib/procedurePicklist";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { HandInfectionDetails } from "@/types/handInfection";
import { generateHandInfectionSummary } from "@/types/handInfection";
import {
  AcceptedMappingCard,
  type AcceptedMappingProcedureRow,
} from "@/components/case-form/AcceptedMappingCard";

interface AcuteHandSummaryPanelProps {
  diagnosis: DiagnosisPicklistEntry;
  handInfectionDetails?: HandInfectionDetails;
  isAccepted: boolean;
  acceptedProcedureIds?: string[];
  onAccept: (procedurePicklistIds: string[]) => void;
  onEditMapping?: () => void;
  onBrowseFullPicker?: () => void;
}

function buildKeyFacts(infectionDetails?: HandInfectionDetails): string[] {
  const facts: string[] = [];
  const summary = generateHandInfectionSummary(infectionDetails);
  if (summary) {
    facts.push(...summary.split(" · "));
  }
  return facts;
}

interface AcuteHandSuggestion {
  id: string;
  name: string;
  isDefault: boolean;
  snomedCtCode?: string;
}

export function AcuteHandSummaryPanel({
  diagnosis,
  handInfectionDetails,
  isAccepted,
  acceptedProcedureIds,
  onAccept,
  onEditMapping,
  onBrowseFullPicker,
}: AcuteHandSummaryPanelProps) {
  const wasAcceptedRef = useRef(isAccepted);

  const headline = diagnosis.displayName;
  const keyFacts = useMemo(
    () => buildKeyFacts(handInfectionDetails),
    [handInfectionDetails],
  );

  const suggestedProcedures = useMemo<AcuteHandSuggestion[]>(() => {
    const suggestions = diagnosis.suggestedProcedures ?? [];
    return suggestions
      .slice()
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
      .map((s) => {
        const entry = findPicklistEntry(s.procedurePicklistId);
        if (!entry) return null;
        return {
          id: s.procedurePicklistId,
          name: entry.displayName,
          isDefault: Boolean(s.isDefault),
          snomedCtCode: entry.snomedCtCode,
        } as AcuteHandSuggestion;
      })
      .filter((p): p is AcuteHandSuggestion => p !== null);
  }, [diagnosis]);

  const suggestedRows = useMemo<AcceptedMappingProcedureRow[]>(
    () =>
      suggestedProcedures.map((p) => ({
        id: p.id,
        name: p.name,
        snomedCtCode: p.snomedCtCode,
      })),
    [suggestedProcedures],
  );

  const [selectedProcedureIds, setSelectedProcedureIds] = useState<Set<string>>(
    () =>
      new Set(suggestedProcedures.filter((p) => p.isDefault).map((p) => p.id)),
  );

  const acceptedProcedureIdSet = useMemo(
    () => new Set(acceptedProcedureIds ?? []),
    [acceptedProcedureIds],
  );

  useEffect(() => {
    const wasAccepted = wasAcceptedRef.current;
    wasAcceptedRef.current = isAccepted;

    let nextIds = suggestedProcedures
      .filter((p) => p.isDefault)
      .map((p) => p.id);
    if (isAccepted && acceptedProcedureIds && acceptedProcedureIds.length > 0) {
      nextIds = acceptedProcedureIds;
    } else if (
      !isAccepted &&
      wasAccepted &&
      acceptedProcedureIds &&
      acceptedProcedureIds.length > 0
    ) {
      nextIds = acceptedProcedureIds.filter((id) =>
        suggestedProcedures.some((p) => p.id === id),
      );
    }
    setSelectedProcedureIds(new Set(nextIds));
  }, [acceptedProcedureIds, isAccepted, suggestedProcedures]);

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
      onBrowseFullPicker={onBrowseFullPicker}
      codingDiagnosis={{
        displayName: diagnosis.displayName,
        snomedCtCode: diagnosis.snomedCtCode,
      }}
      containerTestID="caseForm.handAcute.summary"
      acceptButtonTestID="caseForm.handAcute.btn-acceptMapping"
      editMappingTestID="caseForm.handAcute.btn-editMapping"
      procedureRowTestIDPrefix="caseForm.handAcute.chip-procedure"
    />
  );
}
