import React, { useCallback, useMemo, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { NeurotoxinDetailsCard } from "./NeurotoxinDetailsCard";
import { FillerDetailsCard } from "./FillerDetailsCard";
import { EnergyDeviceDetailsCard } from "./EnergyDeviceDetailsCard";
import { BiostimulatorDetailsCard } from "./BiostimulatorDetailsCard";
import { PrpDetailsCard } from "./PrpDetailsCard";
import { ThreadLiftDetailsCard } from "./ThreadLiftDetailsCard";
import { FatGraftingDetailsCard } from "./FatGraftingDetailsCard";
import { LiposuctionDetailsCard } from "./LiposuctionDetailsCard";
import { PostBariatricContext } from "./PostBariatricContext";
import {
  getInterventionType,
  getAestheticIntentFromDiagnosis,
  getAcgmeCategory,
  getAcgmeSubcategory,
  isAestheticProcedure,
  INTENT_LABELS,
  INTENT_COLORS,
  ACGME_LABELS,
} from "@/lib/aestheticsConfig";
import type {
  AestheticAssessment as AestheticAssessmentData,
  AestheticInterventionType,
  AestheticIntent,
  NeurotoxinDetails,
  FillerDetails,
  EnergyDeviceDetails,
  BiostimulatorDetails,
  PrpDetails,
  ThreadLiftDetails,
  AestheticFatGraftingDetails,
  LiposuctionDetails,
} from "@/types/aesthetics";
import { Spacing, BorderRadius } from "@/constants/theme";

interface AestheticAssessmentProps {
  assessment: AestheticAssessmentData;
  onAssessmentChange: (assessment: AestheticAssessmentData) => void;
  /** All picklistEntryIds in the diagnosis group */
  procedureIds: string[];
  /** Selected diagnosis ID for intent derivation (used in diagnosis-first flow) */
  diagnosisId?: string;
  /** Direct intent override (used in procedure-first flow) */
  intent?: AestheticIntent;
  /** Hide badge row (procedure-first flow shows coding details separately) */
  hideBadges?: boolean;
}

// ─── Detail card type derivation ────────────────────────────────────────────

type DetailCardType =
  | "neurotoxin"
  | "filler"
  | "energy"
  | "biostimulator"
  | "prp"
  | "thread"
  | "fat_grafting"
  | "liposuction"
  | "none";

function getDetailCardType(procedureId: string): DetailCardType {
  if (procedureId.includes("_botox_") || procedureId.includes("_inj_botox")) {
    return "neurotoxin";
  }
  if (procedureId.includes("_filler_") || procedureId.includes("_inj_filler")) {
    return "filler";
  }
  if (procedureId.includes("_biostim_")) return "biostimulator";
  if (procedureId.includes("_prp")) return "prp";
  if (
    procedureId.includes("_thread_") ||
    procedureId.startsWith("aes_thread_")
  ) {
    return "thread";
  }
  if (procedureId.includes("_fat_transfer")) return "fat_grafting";
  if (procedureId.includes("_liposuction")) return "liposuction";
  if (
    procedureId.includes("_energy_") ||
    procedureId.includes("_laser_") ||
    procedureId.includes("_rf_") ||
    procedureId.includes("_hifu") ||
    procedureId.includes("_ipl") ||
    procedureId.includes("_cryo") ||
    procedureId.includes("_plasma") ||
    procedureId.includes("_emsculpt") ||
    procedureId.includes("_led")
  ) {
    return "energy";
  }
  return "none";
}

export const AestheticAssessment = React.memo(function AestheticAssessment({
  assessment,
  onAssessmentChange,
  procedureIds,
  diagnosisId,
  intent: intentOverride,
  hideBadges,
}: AestheticAssessmentProps) {
  const { theme } = useTheme();

  // Find primary aesthetic procedure
  const primaryAestheticProcedureId = useMemo(
    () => procedureIds.find((id) => isAestheticProcedure(id)),
    [procedureIds],
  );

  // Derive intervention type, intent, ACGME
  const derivedInterventionType = useMemo((): AestheticInterventionType => {
    if (!primaryAestheticProcedureId) return "surgical";
    return getInterventionType(primaryAestheticProcedureId);
  }, [primaryAestheticProcedureId]);

  const derivedIntent = useMemo((): AestheticIntent => {
    if (intentOverride) return intentOverride;
    if (!diagnosisId) return "cosmetic";
    return getAestheticIntentFromDiagnosis(diagnosisId);
  }, [intentOverride, diagnosisId]);

  const derivedAcgmeCategory = useMemo(() => {
    if (!primaryAestheticProcedureId) return undefined;
    return getAcgmeCategory(primaryAestheticProcedureId);
  }, [primaryAestheticProcedureId]);

  const derivedAcgmeSubcategory = useMemo(() => {
    if (!primaryAestheticProcedureId) return undefined;
    return getAcgmeSubcategory(primaryAestheticProcedureId);
  }, [primaryAestheticProcedureId]);

  // Sync derived values into assessment (only when they actually change)
  useEffect(() => {
    if (
      assessment.interventionType !== derivedInterventionType ||
      assessment.intent !== derivedIntent ||
      assessment.acgmeCategory !== derivedAcgmeCategory ||
      assessment.acgmeSubcategory !== derivedAcgmeSubcategory
    ) {
      onAssessmentChange({
        ...assessment,
        interventionType: derivedInterventionType,
        intent: derivedIntent,
        acgmeCategory: derivedAcgmeCategory,
        acgmeSubcategory: derivedAcgmeSubcategory,
      });
    }
    // Only run when derived values change, not on every assessment change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    derivedInterventionType,
    derivedIntent,
    derivedAcgmeCategory,
    derivedAcgmeSubcategory,
  ]);

  // Determine which detail card to show
  const detailCardType = useMemo((): DetailCardType => {
    if (!primaryAestheticProcedureId) return "none";
    return getDetailCardType(primaryAestheticProcedureId);
  }, [primaryAestheticProcedureId]);

  // Detail card change handlers
  const handleNeurotoxinChange = useCallback(
    (neurotoxinDetails: NeurotoxinDetails) => {
      onAssessmentChange({ ...assessment, neurotoxinDetails });
    },
    [assessment, onAssessmentChange],
  );

  const handleFillerChange = useCallback(
    (fillerDetails: FillerDetails) => {
      onAssessmentChange({ ...assessment, fillerDetails });
    },
    [assessment, onAssessmentChange],
  );

  const handleEnergyChange = useCallback(
    (energyDeviceDetails: EnergyDeviceDetails) => {
      onAssessmentChange({ ...assessment, energyDeviceDetails });
    },
    [assessment, onAssessmentChange],
  );

  const handleBiostimulatorChange = useCallback(
    (biostimulatorDetails: BiostimulatorDetails) => {
      onAssessmentChange({ ...assessment, biostimulatorDetails });
    },
    [assessment, onAssessmentChange],
  );

  const handlePrpChange = useCallback(
    (prpDetails: PrpDetails) => {
      onAssessmentChange({ ...assessment, prpDetails });
    },
    [assessment, onAssessmentChange],
  );

  const handleThreadChange = useCallback(
    (threadLiftDetails: ThreadLiftDetails) => {
      onAssessmentChange({ ...assessment, threadLiftDetails });
    },
    [assessment, onAssessmentChange],
  );

  const handleFatGraftingChange = useCallback(
    (fatGraftingDetails: AestheticFatGraftingDetails) => {
      onAssessmentChange({ ...assessment, fatGraftingDetails });
    },
    [assessment, onAssessmentChange],
  );

  const handleLiposuctionChange = useCallback(
    (liposuctionDetails: LiposuctionDetails) => {
      onAssessmentChange({ ...assessment, liposuctionDetails });
    },
    [assessment, onAssessmentChange],
  );

  const intentColor = INTENT_COLORS[derivedIntent];
  const acgmeLabel = derivedAcgmeCategory
    ? (ACGME_LABELS[derivedAcgmeCategory] ?? derivedAcgmeCategory)
    : undefined;

  return (
    <View style={styles.container} testID="caseForm.aesthetics.assessment">
      {/* Badges row — hidden in procedure-first flow (coding details shown separately) */}
      {!hideBadges && (
        <View style={styles.badgeRow}>
          {/* Intent badge */}
          <View
            style={[
              styles.badge,
              { backgroundColor: intentColor + "1A", borderColor: intentColor },
            ]}
          >
            <ThemedText style={[styles.badgeText, { color: intentColor }]}>
              {INTENT_LABELS[derivedIntent]}
            </ThemedText>
          </View>

          {/* ACGME category badge */}
          {acgmeLabel && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText
                style={[styles.badgeText, { color: theme.textSecondary }]}
              >
                {acgmeLabel}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Detail card */}
      {detailCardType === "neurotoxin" && (
        <NeurotoxinDetailsCard
          details={assessment.neurotoxinDetails}
          onChange={handleNeurotoxinChange}
        />
      )}

      {detailCardType === "filler" && (
        <FillerDetailsCard
          details={assessment.fillerDetails}
          onChange={handleFillerChange}
        />
      )}

      {detailCardType === "energy" && (
        <EnergyDeviceDetailsCard
          details={assessment.energyDeviceDetails}
          onChange={handleEnergyChange}
        />
      )}

      {detailCardType === "biostimulator" && (
        <BiostimulatorDetailsCard
          details={assessment.biostimulatorDetails}
          onChange={handleBiostimulatorChange}
        />
      )}

      {detailCardType === "prp" && (
        <PrpDetailsCard
          details={assessment.prpDetails}
          onChange={handlePrpChange}
        />
      )}

      {detailCardType === "thread" && (
        <ThreadLiftDetailsCard
          details={assessment.threadLiftDetails}
          onChange={handleThreadChange}
        />
      )}

      {detailCardType === "fat_grafting" && (
        <FatGraftingDetailsCard
          details={assessment.fatGraftingDetails}
          onChange={handleFatGraftingChange}
        />
      )}

      {detailCardType === "liposuction" && (
        <LiposuctionDetailsCard
          details={assessment.liposuctionDetails}
          onChange={handleLiposuctionChange}
        />
      )}

      {/* Post-bariatric context — shown above detail card for MWL cases */}
      {derivedIntent === "post_bariatric_mwl" && (
        <PostBariatricContext
          assessment={assessment}
          onAssessmentChange={onAssessmentChange}
        />
      )}

      {!hideBadges &&
        detailCardType === "none" &&
        primaryAestheticProcedureId && (
          <View
            style={[
              styles.noDetailCard,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              style={[styles.noDetailText, { color: theme.textTertiary }]}
            >
              Surgical procedure — standard operative fields apply
            </ThemedText>
          </View>
        )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  badge: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noDetailCard: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
  },
  noDetailText: {
    fontSize: 13,
    fontStyle: "italic",
  },
});
