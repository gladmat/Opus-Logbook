/**
 * Modal sheet for free flap clinical details.
 * Wraps the existing FreeFlapClinicalFields in a DetailModuleSheet.
 */

import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet, Alert } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { DetailModuleSheet } from "./DetailModuleSheet";
import {
  FreeFlapClinicalFields,
  type BreastFlapContext,
} from "@/components/ProcedureClinicalDetails";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import type { FreeFlapDetails } from "@/types/case";

interface FreeFlapSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (details: FreeFlapDetails) => void;
  initialDetails: FreeFlapDetails;
  procedureType: string;
  picklistEntryId?: string;
  priorRadiotherapy?: boolean;
  /** When set, configures breast-specific behavior (locked recipient site, IMA/IMV auto-fill, extension section) */
  breastContext?: BreastFlapContext;
  /** When provided, shows "Copy to Other Side" button for bilateral cases */
  onCopyToOtherSide?: (details: FreeFlapDetails) => void;
  /** Label for the target side (e.g., "Left" or "Right") */
  copyTargetSideLabel?: string;
}

export function FreeFlapSheet({
  visible,
  onClose,
  onSave,
  initialDetails,
  procedureType,
  picklistEntryId,
  priorRadiotherapy,
  breastContext,
  onCopyToOtherSide,
  copyTargetSideLabel,
}: FreeFlapSheetProps) {
  const { theme } = useTheme();
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

  const handleCopyToOtherSide = () => {
    if (!onCopyToOtherSide) return;
    const targetLabel = copyTargetSideLabel ?? "other side";

    Alert.alert(
      `Copy to ${targetLabel}?`,
      `This will replace flap details on the ${targetLabel.toLowerCase()}. Ischaemia time, perforators, flap weight, and dimensions are not copied.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onCopyToOtherSide(localDetails);
          },
        },
      ],
    );
  };

  return (
    <DetailModuleSheet
      visible={visible}
      title="Flap Details"
      subtitle={
        breastContext
          ? `Breast free flap (${breastContext.side})`
          : "Free flap documentation"
      }
      onSave={handleSave}
      onCancel={onClose}
    >
      <FreeFlapClinicalFields
        clinicalDetails={localDetails}
        procedureType={procedureType}
        picklistEntryId={picklistEntryId}
        onUpdate={setLocalDetails}
        priorRadiotherapy={priorRadiotherapy}
        breastContext={breastContext}
      />
      {onCopyToOtherSide ? (
        <View style={styles.copyContainer}>
          <Pressable
            onPress={handleCopyToOtherSide}
            style={({ pressed }) => [
              styles.copyButton,
              { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="copy" size={16} color={theme.link} />
            <ThemedText style={[styles.copyLabel, { color: theme.link }]}>
              Copy to {copyTargetSideLabel ?? "Other Side"}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </DetailModuleSheet>
  );
}

const styles = StyleSheet.create({
  copyContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: "center",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  copyLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
