/**
 * Modal sheet for infection documentation.
 * Wraps InfectionOverlayForm with isolated local state for Save/Cancel semantics.
 */

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { DetailModuleSheet } from "./DetailModuleSheet";
import { InfectionOverlayForm } from "@/components/InfectionOverlayForm";
import type { InfectionOverlay } from "@/types/infection";

interface InfectionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (overlay: InfectionOverlay) => void;
  initialOverlay?: InfectionOverlay;
}

function createDefaultOverlay(): InfectionOverlay {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    syndromePrimary: "skin_soft_tissue",
    region: "hand",
    laterality: "left",
    extent: "localized",
    severity: "local",
    icu: false,
    vasopressors: false,
    episodes: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function InfectionSheet({
  visible,
  onClose,
  onSave,
  initialOverlay,
}: InfectionSheetProps) {
  const [localOverlay, setLocalOverlay] = useState<InfectionOverlay>(
    () => initialOverlay || createDefaultOverlay(),
  );

  // Reset local state when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalOverlay(initialOverlay || createDefaultOverlay());
    }
  }, [visible, initialOverlay]);

  const handleSave = () => {
    onSave(localOverlay);
    onClose();
  };

  const handleChange = (overlay: InfectionOverlay | undefined) => {
    if (overlay) {
      setLocalOverlay(overlay);
    }
  };

  return (
    <DetailModuleSheet
      visible={visible}
      title="Infection Details"
      subtitle="Infection documentation & episodes"
      onSave={handleSave}
      onCancel={onClose}
    >
      <InfectionOverlayForm
        value={localOverlay}
        onChange={handleChange}
      />
    </DetailModuleSheet>
  );
}
