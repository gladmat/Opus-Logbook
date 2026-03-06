/**
 * Modal sheet for unified hand trauma assessment.
 * Wraps HandTraumaAssessment with isolated local state for Save/Cancel semantics.
 *
 * Replaces the old HandTraumaStructurePicker-only sheet with the unified
 * assessment that covers fractures, dislocations, structures, and soft tissue.
 */

import React, { useState, useEffect, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { DetailModuleSheet } from "./DetailModuleSheet";
import {
  HandTraumaAssessment,
  type HandTraumaAcceptContext,
} from "@/components/hand-trauma/HandTraumaAssessment";
import type {
  CaseProcedure,
  FractureEntry,
  HandTraumaDetails,
} from "@/types/case";
import type { TraumaMappingResult } from "@/lib/handTraumaMapping";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

interface HandTraumaSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    details: HandTraumaDetails,
    procedures: CaseProcedure[],
    fractures: FractureEntry[],
    mappingResult?: TraumaMappingResult | null,
  ) => void;
  initialDetails: HandTraumaDetails;
  selectedDiagnosis?: DiagnosisPicklistEntry;
  initialProcedures: CaseProcedure[];
  initialFractures: FractureEntry[];
}

export function HandTraumaSheet({
  visible,
  onClose,
  onSave,
  initialDetails,
  selectedDiagnosis,
  initialProcedures,
  initialFractures,
}: HandTraumaSheetProps) {
  const [localDetails, setLocalDetails] =
    useState<HandTraumaDetails>(initialDetails);
  const [localProcedures, setLocalProcedures] =
    useState<CaseProcedure[]>(initialProcedures);
  const [localFractures, setLocalFractures] =
    useState<FractureEntry[]>(initialFractures);

  // Reset local state when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalDetails(initialDetails);
      setLocalProcedures(initialProcedures);
      setLocalFractures(initialFractures);
    }
  }, [visible, initialDetails, initialProcedures, initialFractures]);

  const handleSave = useCallback(
    (context?: HandTraumaAcceptContext) => {
      const proceduresToSave = context?.mergedProcedures ?? localProcedures;
      const mappingResult = context?.mappingResult ?? null;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSave(localDetails, proceduresToSave, localFractures, mappingResult);
      onClose();
    },
    [localDetails, localProcedures, localFractures, onSave, onClose],
  );

  const handleProceduresChange = useCallback(
    (updater: (prev: CaseProcedure[]) => CaseProcedure[]) => {
      setLocalProcedures(updater);
    },
    [],
  );

  return (
    <DetailModuleSheet
      visible={visible}
      title="Hand Trauma Assessment"
      subtitle="Injuries, classification & procedures"
      onSave={handleSave}
      onCancel={onClose}
    >
      <HandTraumaAssessment
        value={localDetails}
        onChange={setLocalDetails}
        fractures={localFractures}
        onFracturesChange={setLocalFractures}
        procedures={localProcedures}
        onProceduresChange={handleProceduresChange}
        selectedDiagnosis={selectedDiagnosis}
        onAccept={handleSave}
      />
    </DetailModuleSheet>
  );
}
