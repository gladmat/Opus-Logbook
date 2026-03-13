import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { SectionWrapper } from "@/components/skin-cancer/SectionWrapper";
import { BreastChipRow, BreastNumericField } from "./BreastCardHelpers";
import type { NippleDetailsData, NippleReconTechnique } from "@/types/breast";
import { NIPPLE_RECON_TECHNIQUE_LABELS } from "@/types/breast";
import { Spacing } from "@/constants/theme";

const NIPPLE_TECHNIQUES: readonly NippleReconTechnique[] = [
  "cv_flap",
  "skate_flap",
  "star_flap",
  "tattooing_only",
  "three_d_tattoo",
  "prosthetic",
  "other",
] as const;

interface Props {
  value: NippleDetailsData;
  onChange: (data: NippleDetailsData) => void;
}

function getSummary(value: NippleDetailsData): string {
  const parts: string[] = [];
  if (value.technique) {
    parts.push(NIPPLE_RECON_TECHNIQUE_LABELS[value.technique]);
  }

  const x = value.nacPosition?.xCm;
  const y = value.nacPosition?.yCm;
  if (x != null || y != null) {
    parts.push(`NAC ${x ?? "-"} x ${y ?? "-"} cm`);
  }

  return parts.join(", ") || "Tap to configure";
}

export const NippleDetailsCard = React.memo(function NippleDetailsCard({
  value,
  onChange,
}: Props) {
  const update = useCallback(
    (patch: Partial<NippleDetailsData>) => {
      onChange({ ...value, ...patch });
    },
    [onChange, value],
  );

  return (
    <SectionWrapper
      title="Nipple Details"
      icon="circle"
      collapsible
      defaultCollapsed={false}
      subtitle={getSummary(value)}
    >
      <BreastChipRow
        label="Technique"
        options={NIPPLE_TECHNIQUES}
        labels={NIPPLE_RECON_TECHNIQUE_LABELS}
        selected={value.technique}
        onSelect={(technique) => update({ technique })}
        allowDeselect
      />

      <View style={styles.positionRow}>
        <View style={styles.column}>
          <BreastNumericField
            label="NAC Position X"
            value={value.nacPosition?.xCm}
            onValueChange={(xCm) =>
              update({
                nacPosition: {
                  ...(value.nacPosition ?? {}),
                  xCm,
                },
              })
            }
            unit="cm"
          />
        </View>
        <View style={styles.column}>
          <BreastNumericField
            label="NAC Position Y"
            value={value.nacPosition?.yCm}
            onValueChange={(yCm) =>
              update({
                nacPosition: {
                  ...(value.nacPosition ?? {}),
                  yCm,
                },
              })
            }
            unit="cm"
          />
        </View>
      </View>
    </SectionWrapper>
  );
});

const styles = StyleSheet.create({
  positionRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  column: {
    flex: 1,
  },
});
