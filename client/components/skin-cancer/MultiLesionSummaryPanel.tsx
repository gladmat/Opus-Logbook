/**
 * MultiLesionSummaryPanel
 * ═══════════════════════
 * Group-level accept-mapping panel for multi-lesion skin cancer sessions.
 *
 * Aggregates every lesion's suggested procedures into a single selectable
 * list (one row per lesion × procedure, labelled with the lesion site) and
 * delegates the visual chrome to the shared `AcceptedMappingCard`, exactly
 * like the single-lesion `SkinCancerSummaryPanel`. Accepting materialises
 * one procedure per selected row and flips the group's
 * `procedureSuggestionSource` to "skinCancer", satisfying the Phase-7 save
 * gate that multi-lesion mode previously could never pass.
 */

import React, { useEffect, useMemo, useState } from "react";
import type { LesionInstance } from "@/types/case";
import {
  buildMultiLesionHeadline,
  buildMultiLesionKeyFacts,
  buildMultiLesionSuggestionItems,
  resolvePrimaryMultiLesionDiagnosis,
  type MultiLesionSuggestionItem,
} from "@/lib/multiLesionMapping";
import {
  AcceptedMappingCard,
  type AcceptedMappingProcedureRow,
} from "@/components/case-form/AcceptedMappingCard";

interface MultiLesionSummaryPanelProps {
  lesions: LesionInstance[];
  isAccepted: boolean;
  /** Current group procedures, shown in the post-accept list */
  acceptedProcedures: AcceptedMappingProcedureRow[];
  onAccept: (selections: MultiLesionSuggestionItem[]) => void;
  onEditMapping?: () => void;
}

export function MultiLesionSummaryPanel({
  lesions,
  isAccepted,
  acceptedProcedures,
  onAccept,
  onEditMapping,
}: MultiLesionSummaryPanelProps) {
  const headline = useMemo(() => buildMultiLesionHeadline(lesions), [lesions]);
  const keyFacts = useMemo(() => buildMultiLesionKeyFacts(lesions), [lesions]);

  const items = useMemo(
    () => buildMultiLesionSuggestionItems(lesions),
    [lesions],
  );

  const resolvedDiagnosis = useMemo(
    () => resolvePrimaryMultiLesionDiagnosis(lesions),
    [lesions],
  );

  const suggestedRows = useMemo<AcceptedMappingProcedureRow[]>(
    () =>
      items.map((item) => ({
        id: item.key,
        name: item.displayName,
        snomedCtCode: item.snomedCtCode,
      })),
    [items],
  );

  const defaultKeySignature = useMemo(
    () =>
      items
        .filter((i) => i.isDefault)
        .map((i) => i.key)
        .join("|"),
    [items],
  );

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.isDefault).map((i) => i.key)),
  );

  // Re-seed defaults whenever the lesion set / suggestions change while
  // un-accepted (mirrors SkinCancerSummaryPanel's re-seed effect).
  useEffect(() => {
    if (isAccepted) return;
    setSelectedKeys(
      new Set(defaultKeySignature ? defaultKeySignature.split("|") : []),
    );
  }, [defaultKeySignature, isAccepted]);

  const toggleRow = (key: string) => {
    if (isAccepted) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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
      selectedSuggestedProcedureIds={selectedKeys}
      onToggleSuggestedProcedure={toggleRow}
      acceptedProcedures={acceptedProcedures}
      canAccept={selectedKeys.size > 0}
      onAccept={() => onAccept(items.filter((i) => selectedKeys.has(i.key)))}
      onEditMapping={onEditMapping}
      preAcceptEmptyHint="Complete at least one lesion's assessment to see suggested procedures."
      postAcceptEmptyHint="No accepted procedures recorded."
      codingDiagnosis={
        resolvedDiagnosis
          ? {
              displayName: resolvedDiagnosis.displayName,
              snomedCtCode: resolvedDiagnosis.snomedCtCode,
            }
          : undefined
      }
      containerTestID="caseForm.skinCancer.multiLesion.panel"
      acceptButtonTestID="caseForm.skinCancer.multiLesion.btn-acceptMapping"
      editMappingTestID="caseForm.skinCancer.multiLesion.btn-editMapping"
      procedureRowTestIDPrefix="caseForm.skinCancer.multiLesion.chip-procedure"
    />
  );
}
