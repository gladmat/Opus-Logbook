/**
 * CraniofacialAssessment
 * ══════════════════════
 * Main orchestrator for the cleft & craniofacial inline assessment.
 * Renders inside DiagnosisGroupEditor when specialty === "cleft_cranio".
 *
 * Sections are conditionally visible based on diagnosis subcategory:
 * - Operative Details (always)
 * - Cleft Classification (cleft lip/palate/CLP)
 * - Fistula Classification (oronasal fistula — SC03)
 * - Craniosynostosis Details (craniosynostosis)
 * - OMENS+ (craniofacial microsomia — CF01)
 */

import React, { useCallback, useMemo } from "react";
import {
  View,
  Pressable,
  Switch,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { SectionWrapper } from "@/components/shared/SectionWrapper";
import type {
  CraniofacialAssessmentData,
  CraniofacialOperativeDetails,
  CleftClassification,
  VeauClassification,
  CleftLaterality,
  CraniofacialSubcategory,
  PittsburghFistulaType,
} from "@/types/craniofacial";
import { getCraniofacialSections } from "@/types/craniofacial";
import {
  computeAgeAtSurgery,
  formatAgeAtSurgery,
  checkAgeWarning,
  getNamedTechniques,
  shouldShowBoneGraftDonor,
  BONE_GRAFT_DONORS,
} from "@/lib/craniofacialConfig";
import { LAHSHALInput } from "./LAHSHALInput";
import { CraniosynostosisDetails } from "./CraniosynostosisDetails";
import { OMENSInput } from "./OMENSInput";

interface CraniofacialAssessmentProps {
  assessment: CraniofacialAssessmentData;
  onAssessmentChange: (assessment: CraniofacialAssessmentData) => void;
  diagnosisId?: string;
  subcategory?: string;
  patientDob?: string;
  surgeryDate?: string;
  selectedProcedureIds?: string[];
}

const PATHWAY_STAGES: {
  value: NonNullable<CraniofacialOperativeDetails["pathwayStage"]>;
  label: string;
}[] = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "revision", label: "Revision" },
  { value: "definitive", label: "Definitive" },
];

const VEAU_OPTIONS: { value: VeauClassification; label: string; desc: string }[] = [
  { value: "I", label: "I", desc: "Soft palate only" },
  { value: "II", label: "II", desc: "Soft + hard palate" },
  { value: "III", label: "III", desc: "Unilateral complete" },
  { value: "IV", label: "IV", desc: "Bilateral complete" },
  { value: "submucous", label: "SM", desc: "Submucous" },
];

const LATERALITY_OPTIONS: { value: CleftLaterality; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "bilateral", label: "Bilateral" },
  { value: "midline", label: "Midline" },
];

const PITTSBURGH_OPTIONS: {
  value: PittsburghFistulaType;
  label: string;
  desc: string;
}[] = [
  { value: "I", label: "I", desc: "Bifid uvula" },
  { value: "II", label: "II", desc: "Soft palate" },
  { value: "III", label: "III", desc: "Junction hard/soft" },
  { value: "IV", label: "IV", desc: "Hard palate" },
  { value: "V", label: "V", desc: "Primary/secondary" },
  { value: "VI", label: "VI", desc: "Lingual-alveolar" },
  { value: "VII", label: "VII", desc: "Labial-alveolar" },
];

export function CraniofacialAssessment({
  assessment,
  onAssessmentChange,
  subcategory,
  patientDob,
  surgeryDate,
  selectedProcedureIds = [],
}: CraniofacialAssessmentProps) {
  const { theme } = useTheme();

  // Section visibility
  const sections = useMemo(
    () =>
      subcategory
        ? getCraniofacialSections(subcategory as CraniofacialSubcategory)
        : {
            showCleftClassification: false,
            showCraniosynostosis: false,
            showOMENS: false,
            showFistula: false,
          },
    [subcategory],
  );

  // Age computation
  const computedAge = useMemo(
    () =>
      patientDob && surgeryDate
        ? computeAgeAtSurgery(patientDob, surgeryDate)
        : null,
    [patientDob, surgeryDate],
  );

  const ageWarning = useMemo(() => {
    if (!computedAge) return null;
    for (const procId of selectedProcedureIds) {
      const w = checkAgeWarning(computedAge.totalMonths, procId);
      if (w) return w;
    }
    return null;
  }, [computedAge, selectedProcedureIds]);

  // Named techniques
  const techniques = useMemo(
    () => getNamedTechniques(selectedProcedureIds),
    [selectedProcedureIds],
  );

  const showBoneGraft = useMemo(
    () => shouldShowBoneGraftDonor(selectedProcedureIds),
    [selectedProcedureIds],
  );

  // Update helpers
  const updateOperativeDetails = useCallback(
    (updates: Partial<CraniofacialOperativeDetails>) => {
      onAssessmentChange({
        ...assessment,
        operativeDetails: { ...assessment.operativeDetails, ...updates },
      });
    },
    [assessment, onAssessmentChange],
  );

  const updateCleftClassification = useCallback(
    (updates: Partial<CleftClassification>) => {
      onAssessmentChange({
        ...assessment,
        cleftClassification: {
          ...assessment.cleftClassification,
          ...updates,
        },
      });
    },
    [assessment, onAssessmentChange],
  );

  const ops = assessment.operativeDetails;

  return (
    <View style={styles.container}>
      {/* ────────────────────────────────────────────────────────────────────
       * OPERATIVE DETAILS — always visible
       * ──────────────────────────────────────────────────────────────────── */}
      <SectionWrapper title="Operative Details" icon="clipboard">
        {/* Age at surgery */}
        {computedAge ? (
          <View
            style={[
              styles.ageBadge,
              { backgroundColor: theme.link + "15" },
            ]}
          >
            <Feather name="calendar" size={14} color={theme.link} />
            <ThemedText style={[styles.ageText, { color: theme.text }]}>
              Age at surgery:{" "}
              <ThemedText style={{ fontWeight: "700", color: theme.link }}>
                {formatAgeAtSurgery(computedAge)}
              </ThemedText>
            </ThemedText>
          </View>
        ) : (
          <ThemedText
            style={[styles.hintText, { color: theme.textTertiary }]}
          >
            Add date of birth and procedure date for auto-computed age
          </ThemedText>
        )}

        {/* Age CDS warning */}
        {ageWarning ? (
          <View
            style={[
              styles.warningBanner,
              {
                backgroundColor:
                  ageWarning.severity === "red"
                    ? theme.error + "15"
                    : theme.warning + "15",
                borderColor:
                  ageWarning.severity === "red"
                    ? theme.error + "40"
                    : theme.warning + "40",
              },
            ]}
          >
            <Feather
              name="alert-triangle"
              size={14}
              color={
                ageWarning.severity === "red" ? theme.error : theme.warning
              }
            />
            <ThemedText
              style={[
                styles.warningText,
                {
                  color:
                    ageWarning.severity === "red"
                      ? theme.error
                      : theme.warning,
                },
              ]}
            >
              {ageWarning.message}
            </ThemedText>
          </View>
        ) : null}

        {/* Weight */}
        <View style={styles.inlineField}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Weight (kg)
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
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={theme.textTertiary}
            value={ops.weightKg !== undefined ? String(ops.weightKg) : ""}
            onChangeText={(t) => {
              const n = parseFloat(t);
              updateOperativeDetails({ weightKg: isNaN(n) ? undefined : n });
            }}
          />
        </View>

        {/* Pathway stage */}
        <ThemedText
          style={[styles.fieldLabel, { color: theme.textSecondary }]}
        >
          Pathway stage
        </ThemedText>
        <View style={styles.chipGrid}>
          {PATHWAY_STAGES.map((opt) => {
            const sel = ops.pathwayStage === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateOperativeDetails({
                    pathwayStage: sel ? undefined : opt.value,
                  });
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
                    { color: sel ? theme.buttonText : theme.text },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Named technique — conditional on procedure type */}
        {techniques ? (
          <>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Named technique
            </ThemedText>
            <View style={styles.chipGrid}>
              {techniques.map((tech) => {
                const sel = ops.namedTechnique === tech.value;
                return (
                  <Pressable
                    key={tech.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateOperativeDetails({
                        namedTechnique: sel ? undefined : tech.value,
                      });
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
                        { color: sel ? theme.buttonText : theme.text },
                      ]}
                    >
                      {tech.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Bone graft donor — conditional on procedure */}
        {showBoneGraft ? (
          <>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Bone graft donor site
            </ThemedText>
            <View style={styles.chipGrid}>
              {BONE_GRAFT_DONORS.map((donor) => {
                const sel = ops.boneGraftDonor === donor.value;
                return (
                  <Pressable
                    key={donor.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateOperativeDetails({
                        boneGraftDonor: sel ? undefined : donor.value,
                      });
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
                        { color: sel ? theme.buttonText : theme.text },
                      ]}
                    >
                      {donor.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Blood loss */}
        <View style={styles.inlineField}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Estimated blood loss (mL)
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
              ops.estimatedBloodLossMl !== undefined
                ? String(ops.estimatedBloodLossMl)
                : ""
            }
            onChangeText={(t) => {
              const n = parseInt(t, 10);
              updateOperativeDetails({
                estimatedBloodLossMl: isNaN(n) ? undefined : n,
              });
            }}
          />
        </View>

        {/* Transfusion */}
        {(ops.estimatedBloodLossMl ?? 0) > 0 ? (
          <>
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Transfusion required
              </ThemedText>
              <Switch
                value={ops.transfusionRequired ?? false}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateOperativeDetails({
                    transfusionRequired: v,
                    transfusionVolumeMl: v
                      ? ops.transfusionVolumeMl
                      : undefined,
                  });
                }}
                trackColor={{ false: theme.border, true: theme.link }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
            {ops.transfusionRequired ? (
              <View style={styles.inlineField}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Transfusion volume (mL)
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
                    ops.transfusionVolumeMl !== undefined
                      ? String(ops.transfusionVolumeMl)
                      : ""
                  }
                  onChangeText={(t) => {
                    const n = parseInt(t, 10);
                    updateOperativeDetails({
                      transfusionVolumeMl: isNaN(n) ? undefined : n,
                    });
                  }}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </SectionWrapper>

      {/* ────────────────────────────────────────────────────────────────────
       * CLEFT CLASSIFICATION — cleft lip/palate/CLP diagnoses
       * ──────────────────────────────────────────────────────────────────── */}
      {sections.showCleftClassification ? (
        <SectionWrapper
          title="Cleft Classification"
          icon="git-merge"
          collapsible
        >
          {/* LAHSHAL */}
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            LAHSHAL notation
          </ThemedText>
          <LAHSHALInput
            value={assessment.cleftClassification?.lahshal}
            onChange={(lahshal) => updateCleftClassification({ lahshal })}
          />

          {/* Veau class */}
          <ThemedText
            style={[
              styles.fieldLabel,
              { color: theme.textSecondary, marginTop: Spacing.sm },
            ]}
          >
            Veau classification
          </ThemedText>
          <View style={styles.chipGrid}>
            {VEAU_OPTIONS.map((opt) => {
              const sel =
                assessment.cleftClassification?.veauClass === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateCleftClassification({
                      veauClass: sel ? undefined : opt.value,
                    });
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
                        color: sel
                          ? theme.buttonText + "CC"
                          : theme.textTertiary,
                      }}
                    >
                      {opt.desc}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Laterality */}
          <ThemedText
            style={[
              styles.fieldLabel,
              { color: theme.textSecondary, marginTop: Spacing.sm },
            ]}
          >
            Laterality
          </ThemedText>
          <View style={styles.chipGrid}>
            {LATERALITY_OPTIONS.map((opt) => {
              const sel =
                assessment.cleftClassification?.laterality === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateCleftClassification({
                      laterality: sel ? undefined : opt.value,
                    });
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
                      { color: sel ? theme.buttonText : theme.text },
                    ]}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Associated features */}
          <ThemedText
            style={[
              styles.fieldLabel,
              { color: theme.textSecondary, marginTop: Spacing.sm },
            ]}
          >
            Associated features
          </ThemedText>
          {(
            [
              { key: "submucousCleft", label: "Submucous cleft" },
              { key: "bifidUvula", label: "Bifid uvula" },
              { key: "simonartBand", label: "Simonart band" },
              { key: "microformCleft", label: "Microform cleft" },
            ] as const
          ).map((feat) => (
            <View key={feat.key} style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                {feat.label}
              </ThemedText>
              <Switch
                value={
                  (assessment.cleftClassification?.[feat.key] as
                    | boolean
                    | undefined) ?? false
                }
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateCleftClassification({ [feat.key]: v });
                }}
                trackColor={{ false: theme.border, true: theme.link }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
          ))}
        </SectionWrapper>
      ) : null}

      {/* ────────────────────────────────────────────────────────────────────
       * FISTULA CLASSIFICATION — Pittsburgh (SC03 oronasal fistula)
       * ──────────────────────────────────────────────────────────────────── */}
      {sections.showFistula ? (
        <SectionWrapper
          title="Fistula Classification"
          icon="map-pin"
          collapsible
        >
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Pittsburgh classification
          </ThemedText>
          <View style={styles.chipGrid}>
            {PITTSBURGH_OPTIONS.map((opt) => {
              const sel = ops.pittsburghFistulaType === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateOperativeDetails({
                      pittsburghFistulaType: sel ? undefined : opt.value,
                    });
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
                        color: sel
                          ? theme.buttonText + "CC"
                          : theme.textTertiary,
                      }}
                    >
                      {opt.desc}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SectionWrapper>
      ) : null}

      {/* ────────────────────────────────────────────────────────────────────
       * CRANIOSYNOSTOSIS DETAILS
       * ──────────────────────────────────────────────────────────────────── */}
      {sections.showCraniosynostosis ? (
        <CraniosynostosisDetails
          value={assessment.craniosynostosisDetails}
          onChange={(craniosynostosisDetails) =>
            onAssessmentChange({ ...assessment, craniosynostosisDetails })
          }
          pathwayStage={ops.pathwayStage}
          selectedProcedureIds={selectedProcedureIds}
        />
      ) : null}

      {/* ────────────────────────────────────────────────────────────────────
       * OMENS+ CLASSIFICATION
       * ──────────────────────────────────────────────────────────────────── */}
      {sections.showOMENS ? (
        <OMENSInput
          value={assessment.omensClassification}
          onChange={(omensClassification) =>
            onAssessmentChange({ ...assessment, omensClassification })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  ageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  ageText: {
    fontSize: 14,
    fontWeight: "500",
  },
  hintText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
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
  inlineField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
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
});
