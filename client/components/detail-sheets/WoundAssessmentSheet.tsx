/**
 * Modal sheet for wound assessment documentation.
 * Wraps WoundAssessmentForm with isolated local state for Save/Cancel semantics.
 */

import React, { useState, useEffect } from "react";
import { DetailModuleSheet } from "./DetailModuleSheet";
import { WoundAssessmentForm } from "@/components/WoundAssessmentForm";
import type { WoundAssessment } from "@/types/wound";

interface WoundAssessmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (assessment: WoundAssessment) => void;
  initialAssessment?: WoundAssessment;
}

function createDefaultAssessment(): WoundAssessment {
  return {
    dressings: [],
  };
}

export function WoundAssessmentSheet({
  visible,
  onClose,
  onSave,
  initialAssessment,
}: WoundAssessmentSheetProps) {
  const [localAssessment, setLocalAssessment] = useState<WoundAssessment>(
    () => initialAssessment || createDefaultAssessment(),
  );

  // Reset local state when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalAssessment(initialAssessment || createDefaultAssessment());
    }
  }, [visible, initialAssessment]);

  const handleSave = () => {
    onSave(localAssessment);
    onClose();
  };

  const handleChange = (assessment: WoundAssessment) => {
    setLocalAssessment(assessment);
  };

  return (
    <DetailModuleSheet
      visible={visible}
      title="Wound Assessment"
      subtitle="Wound dimensions, tissue, dressings & healing"
      onSave={handleSave}
      onCancel={onClose}
    >
      <WoundAssessmentForm value={localAssessment} onChange={handleChange} />
    </DetailModuleSheet>
  );
}
