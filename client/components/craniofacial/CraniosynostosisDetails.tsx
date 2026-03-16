/**
 * CraniosynostosisDetails
 * ═══════════════════════
 * Craniosynostosis-specific assessment section.
 *
 * - Sutures multi-select (6 cranial sutures)
 * - Syndromic toggle + syndrome name
 * - ICP assessment (collapsible)
 * - Whitaker outcome (revision cases only)
 * - Helmet therapy (endoscopic strip craniectomy only)
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
import type {
  CraniosynostosisDetails as CraniosynostosisDetailsType,
  CranialSuture,
  WhitakerCategory,
} from "@/types/craniofacial";

interface CraniosynostosisDetailsProps {
  value: CraniosynostosisDetailsType | undefined;
  onChange: (details: CraniosynostosisDetailsType) => void;
  pathwayStage?: "primary" | "secondary" | "revision" | "definitive";
  selectedProcedureIds?: string[];
}

const SUTURE_OPTIONS: { value: CranialSuture; label: string }[] = [
  { value: "sagittal", label: "Sagittal" },
  { value: "metopic", label: "Metopic" },
  { value: "right_coronal", label: "R Coronal" },
  { value: "left_coronal", label: "L Coronal" },
  { value: "right_lambdoid", label: "R Lambdoid" },
  { value: "left_lambdoid", label: "L Lambdoid" },
];

const WHITAKER_OPTIONS: { value: WhitakerCategory; label: string; desc: string }[] = [
  { value: "I", label: "I", desc: "No revision" },
  { value: "II", label: "II", desc: "Minor refinement" },
  { value: "III", label: "III", desc: "Major osteotomy" },
  { value: "IV", label: "IV", desc: "Equivalent to original" },
];

const ICP_METHOD_OPTIONS = [
  { value: "invasive_monitoring", label: "Invasive monitoring" },
  { value: "lumbar_puncture", label: "Lumbar puncture" },
  { value: "clinical_only", label: "Clinical only" },
] as const;

const PAPILLEDEMA_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "equivocal", label: "Equivocal" },
] as const;

const COMPLIANCE_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "moderate", label: "Moderate" },
  { value: "poor", label: "Poor" },
] as const;

const DEFAULT: CraniosynostosisDetailsType = {
  suturesInvolved: [],
  syndromic: false,
};

export function CraniosynostosisDetails({
  value,
  onChange,
  pathwayStage,
  selectedProcedureIds = [],
}: CraniosynostosisDetailsProps) {
  const { theme } = useTheme();
  const details = value ?? DEFAULT;
  const [icpExpanded, setIcpExpanded] = useState(
    !!details.icpAssessment?.preOperative?.measured,
  );

  const update = useCallback(
    (updates: Partial<CraniosynostosisDetailsType>) => {
      onChange({ ...details, ...updates });
    },
    [details, onChange],
  );

  const toggleSuture = useCallback(
    (suture: CranialSuture) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const current = details.suturesInvolved;
      const next = current.includes(suture)
        ? current.filter((s) => s !== suture)
        : [...current, suture];
      update({ suturesInvolved: next });
    },
    [details.suturesInvolved, update],
  );

  const showWhitaker = pathwayStage === "revision";
  const showHelmet = selectedProcedureIds.includes(
    "cc_endoscopic_strip_craniectomy",
  );

  const icpPreOp = details.icpAssessment?.preOperative;

  const updateIcp = useCallback(
    (
      updates: Partial<
        NonNullable<
          NonNullable<CraniosynostosisDetailsType["icpAssessment"]>["preOperative"]
        >
      >,
    ) => {
      update({
        icpAssessment: {
          ...details.icpAssessment,
          preOperative: {
            measured: false,
            ...icpPreOp,
            ...updates,
          },
        },
      });
    },
    [details.icpAssessment, icpPreOp, update],
  );

  const updateHelmet = useCallback(
    (
      updates: Partial<NonNullable<CraniosynostosisDetailsType["helmetTherapy"]>>,
    ) => {
      update({
        helmetTherapy: {
          prescribed: false,
          ...details.helmetTherapy,
          ...updates,
        },
      });
    },
    [details.helmetTherapy, update],
  );

  return (
    <SectionWrapper title="Craniosynostosis" icon="layers">
      {/* Sutures multi-select */}
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Sutures involved
      </ThemedText>
      <View style={styles.chipGrid}>
        {SUTURE_OPTIONS.map((opt) => {
          const selected = details.suturesInvolved.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggleSuture(opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? theme.link
                    : theme.backgroundTertiary,
                  borderColor: selected ? theme.link : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: selected ? theme.buttonText : theme.text },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Syndromic toggle */}
      <View style={styles.switchRow}>
        <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
          Syndromic craniosynostosis
        </ThemedText>
        <Switch
          value={details.syndromic}
          onValueChange={(v) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            update({
              syndromic: v,
              syndromeName: v ? details.syndromeName : undefined,
            });
          }}
          trackColor={{ false: theme.border, true: theme.link }}
          thumbColor={Platform.OS === "android" ? "#fff" : undefined}
        />
      </View>
      {details.syndromic ? (
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.backgroundTertiary,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="Syndrome name (e.g., Apert, Crouzon)"
          placeholderTextColor={theme.textTertiary}
          value={details.syndromeName ?? ""}
          onChangeText={(text) => update({ syndromeName: text || undefined })}
        />
      ) : null}

      {/* ICP Assessment — collapsible */}
      <Pressable
        style={styles.subSectionHeader}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          LayoutAnimation.configureNext(
            LayoutAnimation.Presets.easeInEaseOut,
          );
          setIcpExpanded(!icpExpanded);
        }}
      >
        <Feather name="activity" size={14} color={theme.link} />
        <ThemedText
          style={[styles.subSectionTitle, { color: theme.text, flex: 1 }]}
        >
          ICP Assessment
        </ThemedText>
        <Feather
          name={icpExpanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.textSecondary}
        />
      </Pressable>

      {icpExpanded ? (
        <View style={styles.subSectionBody}>
          <View style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
              Pre-operative ICP measured
            </ThemedText>
            <Switch
              value={icpPreOp?.measured ?? false}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateIcp({ measured: v });
              }}
              trackColor={{ false: theme.border, true: theme.link }}
              thumbColor={Platform.OS === "android" ? "#fff" : undefined}
            />
          </View>

          {icpPreOp?.measured ? (
            <>
              {/* Value */}
              <View style={styles.inlineField}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  ICP value (mmHg)
                </ThemedText>
                <TextInput
                  style={[
                    styles.numericInput,
                    {
                      backgroundColor: theme.backgroundTertiary,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={theme.textTertiary}
                  value={
                    icpPreOp.valueMmHg !== undefined
                      ? String(icpPreOp.valueMmHg)
                      : ""
                  }
                  onChangeText={(t) => {
                    const n = parseInt(t, 10);
                    updateIcp({ valueMmHg: isNaN(n) ? undefined : n });
                  }}
                />
              </View>

              {/* Method */}
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Method
              </ThemedText>
              <View style={styles.chipGrid}>
                {ICP_METHOD_OPTIONS.map((opt) => {
                  const sel = icpPreOp.method === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );
                        updateIcp({ method: opt.value });
                      }}
                      style={[
                        styles.chip,
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
                          styles.chipText,
                          {
                            color: sel ? theme.buttonText : theme.text,
                          },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Papilledema */}
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Papilledema
              </ThemedText>
              <View style={styles.chipGrid}>
                {PAPILLEDEMA_OPTIONS.map((opt) => {
                  const sel = icpPreOp.papilledema === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );
                        updateIcp({ papilledema: opt.value });
                      }}
                      style={[
                        styles.chip,
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
                          styles.chipText,
                          {
                            color: sel ? theme.buttonText : theme.text,
                          },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Copper beating */}
              <View style={styles.switchRow}>
                <ThemedText
                  style={[styles.switchLabel, { color: theme.text }]}
                >
                  Copper beating on skull XR
                </ThemedText>
                <Switch
                  value={icpPreOp.copperBeating ?? false}
                  onValueChange={(v) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateIcp({ copperBeating: v });
                  }}
                  trackColor={{ false: theme.border, true: theme.link }}
                  thumbColor={
                    Platform.OS === "android" ? "#fff" : undefined
                  }
                />
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {/* Whitaker outcome — revision cases only */}
      {showWhitaker ? (
        <>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Whitaker outcome
          </ThemedText>
          <View style={styles.chipGrid}>
            {WHITAKER_OPTIONS.map((opt) => {
              const sel = details.whitakerOutcome === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    update({ whitakerOutcome: sel ? undefined : opt.value });
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: sel
                        ? theme.link
                        : theme.backgroundTertiary,
                      borderColor: sel ? theme.link : theme.border,
                    },
                  ]}
                >
                  <View style={{ alignItems: "center" }}>
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: sel ? theme.buttonText : theme.text },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontSize: 10,
                        color: sel ? theme.buttonText + "CC" : theme.textTertiary,
                      }}
                    >
                      {opt.desc}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Helmet therapy — endoscopic strip craniectomy only */}
      {showHelmet ? (
        <>
          <View style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
              Helmet therapy prescribed
            </ThemedText>
            <Switch
              value={details.helmetTherapy?.prescribed ?? false}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateHelmet({ prescribed: v });
              }}
              trackColor={{ false: theme.border, true: theme.link }}
              thumbColor={Platform.OS === "android" ? "#fff" : undefined}
            />
          </View>

          {details.helmetTherapy?.prescribed ? (
            <View style={styles.helmetFields}>
              <View style={styles.inlineField}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Duration (months)
                </ThemedText>
                <TextInput
                  style={[
                    styles.numericInput,
                    {
                      backgroundColor: theme.backgroundTertiary,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={theme.textTertiary}
                  value={
                    details.helmetTherapy.durationMonths !== undefined
                      ? String(details.helmetTherapy.durationMonths)
                      : ""
                  }
                  onChangeText={(t) => {
                    const n = parseInt(t, 10);
                    updateHelmet({
                      durationMonths: isNaN(n) ? undefined : n,
                    });
                  }}
                />
              </View>

              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Compliance
              </ThemedText>
              <View style={styles.chipGrid}>
                {COMPLIANCE_OPTIONS.map((opt) => {
                  const sel =
                    details.helmetTherapy?.compliance === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );
                        updateHelmet({ compliance: opt.value });
                      }}
                      style={[
                        styles.chip,
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
                          styles.chipText,
                          {
                            color: sel ? theme.buttonText : theme.text,
                          },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </SectionWrapper>
  );
}

const styles = StyleSheet.create({
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
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    minHeight: 44,
  },
  numericInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    minHeight: 44,
    width: 80,
    textAlign: "center",
  },
  inlineField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
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
  subSectionBody: {
    gap: Spacing.md,
    paddingLeft: Spacing.xs,
  },
  helmetFields: {
    gap: Spacing.md,
    paddingLeft: Spacing.xs,
  },
});
