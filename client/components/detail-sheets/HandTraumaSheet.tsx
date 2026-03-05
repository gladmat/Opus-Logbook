/**
 * Modal sheet for hand trauma structure documentation.
 * Wraps HandTraumaStructurePicker with isolated local state for Save/Cancel semantics.
 */

import React, { useState, useEffect } from "react";
import { DetailModuleSheet } from "./DetailModuleSheet";
import { HandTraumaStructurePicker } from "@/components/hand-trauma/HandTraumaStructurePicker";
import type { CaseProcedure, HandTraumaDetails } from "@/types/case";
import type { DiagnosisPicklistEntry } from "@/types/diagnosis";

interface HandTraumaSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (details: HandTraumaDetails, procedures: CaseProcedure[]) => void;
  initialDetails: HandTraumaDetails;
  selectedDiagnosis?: DiagnosisPicklistEntry;
  initialProcedures: CaseProcedure[];
}

export function HandTraumaSheet({
  visible,
  onClose,
  onSave,
  initialDetails,
  selectedDiagnosis,
  initialProcedures,
}: HandTraumaSheetProps) {
  const [localDetails, setLocalDetails] =
    useState<HandTraumaDetails>(initialDetails);
  const [localProcedures, setLocalProcedures] =
    useState<CaseProcedure[]>(initialProcedures);

  // Reset local state when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalDetails(initialDetails);
      setLocalProcedures(initialProcedures);
    }
  }, [visible, initialDetails, initialProcedures]);

  const handleSave = () => {
    onSave(localDetails, localProcedures);
    onClose();
  };

  return (
    <DetailModuleSheet
      visible={visible}
      title="Hand Structures"
      subtitle="Injured structures & generated procedures"
      onSave={handleSave}
      onCancel={onClose}
    >
      <HandTraumaStructurePicker
        value={localDetails}
        onChange={setLocalDetails}
        selectedDiagnosis={selectedDiagnosis}
        procedures={localProcedures}
        onProceduresChange={setLocalProcedures}
      />
    </DetailModuleSheet>
  );
}
