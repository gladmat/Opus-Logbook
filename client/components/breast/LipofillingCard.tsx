/**
 * LipofillingCard — Shared lipofilling data capture with per-side injections.
 *
 * Harvest → Process → Inject:
 * 1. Harvest — shared across the assessment
 * 2. Processing — shared across the assessment
 * 3. Injection — repeated for each active side
 * 4. Session tracking — shared across the assessment
 */

import React, { useCallback, useState } from "react";
import { View, LayoutAnimation, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import {
  BreastChipRow,
  BreastMultiChipRow,
  BreastCheckboxRow,
  BreastNumericField,
  BreastSectionToggle,
} from "./BreastCardHelpers";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import { ThemedText } from "@/components/ThemedText";
import type {
  BreastLaterality,
  LipofillingAdditive,
  LipofillingContext,
  LipofillingData,
  LipofillingHarvestSite,
  LipofillingHarvestTechnique,
  LipofillingIndication,
  LipofillingInjectionPlane,
  LipofillingInjectionSide,
  LipofillingInjectionTechnique,
  LipofillingProcessingMethod,
  RecipientSiteCondition,
} from "@/types/breast";
import {
  HARVEST_SITE_LABELS,
  HARVEST_TECHNIQUE_LABELS,
  PROCESSING_METHOD_LABELS,
  LIPOFILLING_ADDITIVE_LABELS,
  LIPOFILLING_INJECTION_TECHNIQUE_LABELS,
  LIPOFILLING_INJECTION_PLANE_LABELS,
  RECIPIENT_SITE_CONDITION_LABELS,
  LIPOFILLING_INDICATION_LABELS,
  LIPOFILLING_CONTEXT_LABELS,
} from "@/types/breast";

const HARVEST_SITES: readonly LipofillingHarvestSite[] = [
  "abdomen",
  "flanks",
  "inner_thigh",
  "outer_thigh",
  "buttocks",
  "arms",
  "back",
  "other",
] as const;

const HARVEST_TECHNIQUES: readonly LipofillingHarvestTechnique[] = [
  "coleman_syringe",
  "power_assisted",
  "vaser",
  "water_assisted",
  "standard_suction",
  "other",
] as const;

const PROCESSING_METHODS: readonly LipofillingProcessingMethod[] = [
  "coleman_centrifuge",
  "puregraft",
  "revolve",
  "telfa_decanting",
  "gravity_sedimentation",
  "filtration",
  "other",
] as const;

const ADDITIVES: readonly LipofillingAdditive[] = [
  "none",
  "prp",
  "prf",
  "svf",
  "ascs",
] as const;

const INJECTION_TECHNIQUES: readonly LipofillingInjectionTechnique[] = [
  "microdroplet",
  "threading",
  "fan_pattern",
  "multiplane",
] as const;

const INJECTION_PLANES: readonly LipofillingInjectionPlane[] = [
  "subcutaneous",
  "intramuscular",
  "subglandular",
  "prepectoral",
] as const;

const SITE_CONDITIONS: readonly RecipientSiteCondition[] = [
  "native",
  "irradiated",
  "scarred",
  "previously_reconstructed",
] as const;

const INDICATIONS: readonly LipofillingIndication[] = [
  "contour_correction",
  "volume_restoration",
  "skin_quality_improvement",
  "rippling_correction",
  "symmetrisation",
  "primary_reconstruction",
  "aesthetic_augmentation",
] as const;

const CONTEXTS: readonly LipofillingContext[] = [
  "adjunct_to_implant",
  "adjunct_to_flap",
  "adjunct_to_bct",
  "primary_reconstruction",
  "standalone_aesthetic",
  "revision",
] as const;

interface Props {
  activeSides: BreastLaterality[];
  value: LipofillingData;
  onChange: (data: LipofillingData) => void;
}

function getSideLabel(side: BreastLaterality): string {
  return side === "left" ? "Left Breast" : "Right Breast";
}

export const LipofillingCard = React.memo(function LipofillingCard({
  activeSides,
  value,
  onChange,
}: Props) {
  const { theme } = useTheme();
  const [showSession, setShowSession] = useState(
    !!(value.sessionNumber || value.indication),
  );

  const update = useCallback(
    (patch: Partial<LipofillingData>) => {
      onChange({ ...value, ...patch });
    },
    [onChange, value],
  );

  const updateInjection = useCallback(
    (side: BreastLaterality, patch: Partial<LipofillingInjectionSide>) => {
      onChange({
        ...value,
        injections: {
          ...(value.injections ?? {}),
          [side]: {
            ...(value.injections?.[side] ?? {}),
            ...patch,
          },
        },
      });
    },
    [onChange, value],
  );

  const isCentrifuge = value.processingMethod === "coleman_centrifuge";

  const summaryParts: string[] = [];
  if (value.harvestSites?.length) {
    summaryParts.push(
      `${value.harvestSites.length} site${value.harvestSites.length > 1 ? "s" : ""}`,
    );
  }
  for (const side of activeSides) {
    const injectedVolume = value.injections?.[side]?.volumeInjectedMl;
    if (injectedVolume) {
      summaryParts.push(`${side === "left" ? "L" : "R"} ${injectedVolume}ml`);
    }
  }
  const summary = summaryParts.join(", ") || "Tap to configure";

  return (
    <SectionWrapper
      title="Lipofilling"
      icon="droplet"
      collapsible
      defaultCollapsed={false}
      subtitle={summary}
      testID="caseForm.breast.section-lipofilling"
    >
      <BreastMultiChipRow
        label="Harvest Sites"
        options={HARVEST_SITES}
        labels={HARVEST_SITE_LABELS}
        selected={value.harvestSites ?? []}
        onToggle={(harvestSites) => update({ harvestSites })}
      />

      <BreastNumericField
        label="Total Volume Harvested"
        value={value.totalVolumeHarvestedMl}
        onValueChange={(totalVolumeHarvestedMl) =>
          update({ totalVolumeHarvestedMl })
        }
        unit="ml"
        integer
      />

      <BreastChipRow
        label="Harvest Technique"
        options={HARVEST_TECHNIQUES}
        labels={HARVEST_TECHNIQUE_LABELS}
        selected={value.harvestTechnique}
        onSelect={(harvestTechnique) => update({ harvestTechnique })}
        allowDeselect
      />

      <BreastNumericField
        label="Cannula Size"
        value={value.cannulaSizeMm}
        onValueChange={(cannulaSizeMm) => update({ cannulaSizeMm })}
        unit="mm"
      />

      <BreastCheckboxRow
        label="Tumescent used"
        value={value.tumescentUsed ?? false}
        onChange={(tumescentUsed) => {
          update({
            tumescentUsed,
            tumescentVolumeMl: tumescentUsed
              ? value.tumescentVolumeMl
              : undefined,
          });
        }}
      />

      {value.tumescentUsed ? (
        <BreastNumericField
          label="Tumescent Volume"
          value={value.tumescentVolumeMl}
          onValueChange={(tumescentVolumeMl) => update({ tumescentVolumeMl })}
          unit="ml"
          integer
        />
      ) : null}

      <View style={styles.sectionDivider} />

      <BreastChipRow
        label="Processing Method"
        options={PROCESSING_METHODS}
        labels={PROCESSING_METHOD_LABELS}
        selected={value.processingMethod}
        onSelect={(processingMethod) => {
          const patch: Partial<LipofillingData> = { processingMethod };
          if (processingMethod !== "coleman_centrifuge") {
            patch.centrifugationRpm = undefined;
            patch.centrifugationMinutes = undefined;
          }
          update(patch);
        }}
        allowDeselect
      />

      {isCentrifuge ? (
        <View style={styles.centrifugeRow}>
          <View style={styles.equalColumn}>
            <BreastNumericField
              label="RPM"
              value={value.centrifugationRpm}
              onValueChange={(centrifugationRpm) =>
                update({ centrifugationRpm })
              }
              integer
            />
          </View>
          <View style={styles.equalColumn}>
            <BreastNumericField
              label="Duration"
              value={value.centrifugationMinutes}
              onValueChange={(centrifugationMinutes) =>
                update({ centrifugationMinutes })
              }
              unit="min"
              integer
            />
          </View>
        </View>
      ) : null}

      <BreastNumericField
        label="Volume After Processing"
        value={value.volumeAfterProcessingMl}
        onValueChange={(volumeAfterProcessingMl) =>
          update({ volumeAfterProcessingMl })
        }
        unit="ml"
        integer
      />

      <BreastMultiChipRow
        label="Additives"
        options={ADDITIVES}
        labels={LIPOFILLING_ADDITIVE_LABELS}
        selected={value.additives ?? []}
        onToggle={(additives) => update({ additives })}
      />

      {activeSides.map((side, index) => {
        const injection = value.injections?.[side];

        return (
          <View key={side}>
            <View style={styles.sectionDivider} />
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, fontWeight: "600" }}
            >
              Injection — {getSideLabel(side)}
            </ThemedText>

            <BreastNumericField
              label="Volume Injected"
              value={injection?.volumeInjectedMl}
              onValueChange={(volumeInjectedMl) =>
                updateInjection(side, { volumeInjectedMl })
              }
              unit="ml"
              integer
            />

            <BreastChipRow
              label="Injection Technique"
              options={INJECTION_TECHNIQUES}
              labels={LIPOFILLING_INJECTION_TECHNIQUE_LABELS}
              selected={injection?.injectionTechnique}
              onSelect={(injectionTechnique) =>
                updateInjection(side, { injectionTechnique })
              }
              allowDeselect
            />

            <BreastMultiChipRow
              label="Injection Planes"
              options={INJECTION_PLANES}
              labels={LIPOFILLING_INJECTION_PLANE_LABELS}
              selected={injection?.injectionPlanes ?? []}
              onToggle={(injectionPlanes) =>
                updateInjection(side, { injectionPlanes })
              }
            />

            <BreastChipRow
              label="Recipient Site Condition"
              options={SITE_CONDITIONS}
              labels={RECIPIENT_SITE_CONDITION_LABELS}
              selected={injection?.recipientSiteCondition}
              onSelect={(recipientSiteCondition) =>
                updateInjection(side, { recipientSiteCondition })
              }
              allowDeselect
            />

            {index < activeSides.length - 1 ? (
              <View style={styles.sideDivider} />
            ) : null}
          </View>
        );
      })}

      <BreastSectionToggle
        label={showSession ? "Hide Session Details" : "Session Details"}
        isExpanded={showSession}
        onToggle={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowSession((current) => !current);
        }}
      />

      {showSession ? (
        <>
          <BreastNumericField
            label="Session Number"
            value={value.sessionNumber}
            onValueChange={(sessionNumber) => update({ sessionNumber })}
            integer
          />

          <BreastNumericField
            label="Interval From Previous Session"
            value={value.intervalFromPreviousMonths}
            onValueChange={(intervalFromPreviousMonths) =>
              update({ intervalFromPreviousMonths })
            }
            unit="months"
            integer
          />

          <BreastChipRow
            label="Indication"
            options={INDICATIONS}
            labels={LIPOFILLING_INDICATION_LABELS}
            selected={value.indication}
            onSelect={(indication) => update({ indication })}
            allowDeselect
          />

          <BreastChipRow
            label="Context"
            options={CONTEXTS}
            labels={LIPOFILLING_CONTEXT_LABELS}
            selected={value.context}
            onSelect={(context) => update({ context })}
            allowDeselect
          />
        </>
      ) : null}
    </SectionWrapper>
  );
});

const styles = StyleSheet.create({
  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(127, 127, 127, 0.18)",
    marginVertical: Spacing.md,
  },
  sideDivider: {
    height: 1,
    backgroundColor: "rgba(127, 127, 127, 0.1)",
    marginTop: Spacing.sm,
  },
  centrifugeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  equalColumn: {
    flex: 1,
  },
});
