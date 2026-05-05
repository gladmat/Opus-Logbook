/**
 * OMENSInput
 * ══════════
 * OMENS+ classification input for craniofacial microsomia (Pruzansky-Kaban).
 *
 * 5 domain rows: Orbit (0-3), Mandible (I/IIa/IIb/III), Ear (0-3), Nerve (0-3), Soft Tissue (0-3).
 * Plus laterality and extracraniofacial anomalies.
 * Renders computed OMENS string badge.
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Pressable,
  Switch,
  TextInput,
  StyleSheet,
  LayoutAnimation,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import type { OMENSClassification } from "@/types/craniofacial";

interface OMENSInputProps {
  value: OMENSClassification | undefined;
  onChange: (classification: OMENSClassification) => void;
}

type NumericGrade = 0 | 1 | 2 | 3;
type MandibleGrade = "I" | "IIa" | "IIb" | "III";

interface DomainConfig {
  key: string;
  letter: string;
  label: string;
  options: { value: string; label: string }[];
  descriptions: string[];
}

const NUMERIC_OPTIONS = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
];

const MANDIBLE_OPTIONS = [
  { value: "I", label: "I" },
  { value: "IIa", label: "IIa" },
  { value: "IIb", label: "IIb" },
  { value: "III", label: "III" },
];

const DOMAINS: DomainConfig[] = [
  {
    key: "orbit",
    letter: "O",
    label: "Orbit",
    options: NUMERIC_OPTIONS,
    descriptions: ["Normal", "Abnormal size", "Abnormal position", "Both"],
  },
  {
    key: "mandible",
    letter: "M",
    label: "Mandible",
    options: MANDIBLE_OPTIONS,
    descriptions: [
      "Small mandible",
      "Short ramus, normal TMJ",
      "Abnormal ramus",
      "Absent ramus",
    ],
  },
  {
    key: "ear",
    letter: "E",
    label: "Ear",
    options: NUMERIC_OPTIONS,
    descriptions: ["Normal", "Small, all structures", "No canal", "Absent"],
  },
  {
    key: "nerve",
    letter: "N",
    label: "Nerve",
    options: NUMERIC_OPTIONS,
    descriptions: ["Normal", "Upper branches", "Lower branches", "All"],
  },
  {
    key: "softTissue",
    letter: "S",
    label: "Soft tissue",
    options: NUMERIC_OPTIONS,
    descriptions: ["Normal", "Minimal", "Moderate", "Severe"],
  },
];

const LATERALITY_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "bilateral", label: "Bilateral" },
] as const;

const DEFAULT: OMENSClassification = {
  orbit: 0,
  mandible: "I",
  ear: 0,
  nerve: 0,
  softTissue: 0,
  laterality: "left",
};

function computeOmensString(v: OMENSClassification): string {
  return `O${v.orbit} M-${v.mandible} E${v.ear} N${v.nerve} S${v.softTissue}`;
}

export function OMENSInput({ value, onChange }: OMENSInputProps) {
  const { theme } = useTheme();
  const current = value ?? DEFAULT;
  const [extrasExpanded, setExtrasExpanded] = useState(
    !!current.extracraniofacialAnomalies &&
      Object.values(current.extracraniofacialAnomalies).some(Boolean),
  );

  const update = useCallback(
    (updates: Partial<OMENSClassification>) => {
      onChange({ ...current, ...updates });
    },
    [current, onChange],
  );

  const setDomainValue = useCallback(
    (key: string, val: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (key === "mandible") {
        update({ mandible: val as MandibleGrade });
      } else {
        update({
          [key]: Number(val) as NumericGrade,
        } as Partial<OMENSClassification>);
      }
    },
    [update],
  );

  const extras = current.extracraniofacialAnomalies;

  const updateExtras = useCallback(
    (
      updates: Partial<
        NonNullable<OMENSClassification["extracraniofacialAnomalies"]>
      >,
    ) => {
      update({
        extracraniofacialAnomalies: {
          ...extras,
          ...updates,
        },
      });
    },
    [extras, update],
  );

  const omensString = computeOmensString(current);

  return (
    <SectionWrapper title="OMENS+ Classification" icon="target">
      {/* Domain rows */}
      {DOMAINS.map((domain) => {
        const currentVal =
          domain.key === "mandible"
            ? current.mandible
            : String(current[domain.key as keyof OMENSClassification]);
        const selectedIdx = domain.options.findIndex(
          (o) => o.value === String(currentVal),
        );
        const desc =
          selectedIdx >= 0 ? domain.descriptions[selectedIdx] : undefined;

        return (
          <View key={domain.key} style={styles.domainRow}>
            <View style={styles.domainLabel}>
              <ThemedText style={[styles.domainLetter, { color: theme.link }]}>
                {domain.letter}
              </ThemedText>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.domainName, { color: theme.text }]}>
                  {domain.label}
                </ThemedText>
                {desc ? (
                  <ThemedText
                    style={[styles.domainDesc, { color: theme.textTertiary }]}
                  >
                    {desc}
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <View style={styles.gradeChips}>
              {domain.options.map((opt) => {
                const sel = String(currentVal) === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setDomainValue(domain.key, opt.value)}
                    style={[
                      styles.gradeChip,
                      {
                        backgroundColor: sel
                          ? theme.link
                          : theme.backgroundTertiary,
                        borderColor: sel ? theme.link : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.gradeText,
                        { color: sel ? theme.buttonText : theme.text },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Laterality */}
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Laterality
      </ThemedText>
      <View style={styles.chipGrid}>
        {LATERALITY_OPTIONS.map((opt) => {
          const sel = current.laterality === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                update({ laterality: opt.value });
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: sel ? theme.link : theme.backgroundTertiary,
                  borderColor: sel ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: sel ? theme.buttonText : theme.text },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Extracraniofacial anomalies — collapsible */}
      <Pressable
        style={styles.subSectionHeader}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExtrasExpanded(!extrasExpanded);
        }}
      >
        <Feather name="plus-circle" size={14} color={theme.link} />
        <ThemedText
          style={[styles.subSectionTitle, { color: theme.text, flex: 1 }]}
        >
          Extracraniofacial anomalies
        </ThemedText>
        <Feather
          name={extrasExpanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.textSecondary}
        />
      </Pressable>

      {extrasExpanded ? (
        <View style={styles.extrasBody}>
          {(
            [
              { key: "cardiac", label: "Cardiac" },
              { key: "vertebral", label: "Vertebral" },
              { key: "renal", label: "Renal" },
              { key: "limb", label: "Limb" },
            ] as const
          ).map((item) => (
            <View key={item.key} style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                {item.label}
              </ThemedText>
              <Switch
                value={(extras?.[item.key] as boolean | undefined) ?? false}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateExtras({ [item.key]: v });
                }}
                trackColor={{ false: theme.border, true: theme.link }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
          ))}
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundTertiary,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Other anomalies"
            placeholderTextColor={theme.textTertiary}
            value={extras?.other ?? ""}
            onChangeText={(text) => updateExtras({ other: text || undefined })}
          />
        </View>
      ) : null}

      {/* OMENS string badge */}
      <View
        style={[styles.notationBadge, { backgroundColor: theme.link + "15" }]}
      >
        <ThemedText
          style={[styles.notationLabel, { color: theme.textSecondary }]}
        >
          OMENS:
        </ThemedText>
        <ThemedText style={[styles.notationValue, { color: theme.link }]}>
          {omensString}
        </ThemedText>
      </View>
    </SectionWrapper>
  );
}

const styles = StyleSheet.create({
  domainRow: {
    gap: Spacing.sm,
  },
  domainLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  domainLetter: {
    fontSize: 18,
    fontWeight: "700",
    width: 24,
    textAlign: "center",
  },
  domainName: {
    fontSize: 14,
    fontWeight: "600",
  },
  domainDesc: {
    fontSize: 11,
  },
  gradeChips: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingLeft: 32,
  },
  gradeChip: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    marginRight: Spacing.sm,
  },
  subSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 36,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  extrasBody: {
    gap: Spacing.md,
    paddingLeft: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    minHeight: 44,
  },
  notationBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: 2,
  },
  notationLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  notationValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
