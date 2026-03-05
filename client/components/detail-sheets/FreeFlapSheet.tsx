/**
 * Modal sheet for free flap clinical details.
 * Wraps the existing FreeFlapClinicalFields in a DetailModuleSheet.
 */

import React, { useState, useEffect } from "react";
import { DetailModuleSheet } from "./DetailModuleSheet";
import { FreeFlapClinicalFields } from "@/components/ProcedureClinicalDetails";
import type { FreeFlapDetails } from "@/types/case";

interface FreeFlapSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (details: FreeFlapDetails) => void;
  initialDetails: FreeFlapDetails;
  procedureType: string;
  picklistEntryId?: string;
}

export function FreeFlapSheet({
  visible,
  onClose,
  onSave,
  initialDetails,
  procedureType,
  picklistEntryId,
}: FreeFlapSheetProps) {
  const [localDetails, setLocalDetails] =
    useState<FreeFlapDetails>(initialDetails);

  // Reset local state when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalDetails(initialDetails);
    }
  }, [visible, initialDetails]);

  const handleSave = () => {
    onSave(localDetails);
    onClose();
  };

  return (
    <DetailModuleSheet
      visible={visible}
      title="Flap Details"
      subtitle="Free flap documentation"
      onSave={handleSave}
      onCancel={onClose}
    >
      <FreeFlapClinicalFields
        clinicalDetails={localDetails}
        procedureType={procedureType}
        picklistEntryId={picklistEntryId}
        onUpdate={setLocalDetails}
      />
    </DetailModuleSheet>
  );
}
