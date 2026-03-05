/**
 * Modal sheet for flap outcome documentation.
 * Wraps FlapOutcomeSection in a DetailModuleSheet.
 * Zero-tap default: "Complete Survival" with monitoring protocol from preferences.
 */

import React, { useState, useEffect } from "react";
import { DetailModuleSheet } from "./DetailModuleSheet";
import { FlapOutcomeSection } from "@/components/FlapOutcomeSection";
import type { FreeFlapOutcomeDetails } from "@/types/case";

interface FlapOutcomeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (outcome: FreeFlapOutcomeDetails) => void;
  initialOutcome: FreeFlapOutcomeDetails;
}

export function FlapOutcomeSheet({
  visible,
  onClose,
  onSave,
  initialOutcome,
}: FlapOutcomeSheetProps) {
  const [localOutcome, setLocalOutcome] =
    useState<FreeFlapOutcomeDetails>(initialOutcome);

  // Reset local state when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalOutcome(initialOutcome);
    }
  }, [visible, initialOutcome]);

  const handleSave = () => {
    onSave(localOutcome);
    onClose();
  };

  return (
    <DetailModuleSheet
      visible={visible}
      title="Flap Outcome"
      subtitle="Survival, re-exploration & complications"
      onSave={handleSave}
      onCancel={onClose}
    >
      <FlapOutcomeSection outcome={localOutcome} onUpdate={setLocalOutcome} />
    </DetailModuleSheet>
  );
}
