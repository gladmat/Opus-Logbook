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
 * - Outcomes & Audit (always available, collapsed by default)
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Pressable,
  Switch,
  TextInput,
  StyleSheet,
  Platform,
  LayoutAnimation,
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
  CraniofacialOutcomes,
  SpeechOutcome,
  DentalOutcome,
  HearingOutcome,
  FeedingOutcome,
  CraniofacialComplications,
  GeneticTestResult,
} from "@/types/craniofacial";
import { getCraniofacialSections } from "@/types/craniofacial";
import {
  computeAgeAtSurgery,
  formatAgeAtSurgery,
  checkAgeWarning,
  getNamedTechniques,
  shouldShowBoneGraftDonor,
  BONE_GRAFT_DONORS,
  calculateCraniofacialCompleteness,
  getOutcomeSectionVisibility,
  getEdgeCaseNote,
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

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC DATA CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PATHWAY_STAGES: {
  value: NonNullable<CraniofacialOperativeDetails["pathwayStage"]>;
  label: string;
}[] = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "revision", label: "Revision" },
  { value: "definitive", label: "Definitive" },
];

const VEAU_OPTIONS: {
  value: VeauClassification;
  label: string;
  desc: string;
}[] = [
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

const VPC_RATINGS: {
  value: NonNullable<SpeechOutcome["vpcRating"]>;
  label: string;
  desc: string;
}[] = [
  { value: 0, label: "0", desc: "Competent" },
  { value: 1, label: "1", desc: "Borderline" },
  { value: 2, label: "2", desc: "Incompetent" },
];

const HYPERNASALITY_OPTIONS: {
  value: NonNullable<SpeechOutcome["hypernasality"]>;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];

const FEEDING_METHODS: {
  value: NonNullable<FeedingOutcome["method"]>;
  label: string;
}[] = [
  { value: "breast", label: "Breast" },
  { value: "bottle_standard", label: "Standard bottle" },
  { value: "bottle_specialist", label: "Specialist bottle" },
  { value: "ng_tube", label: "NG tube" },
  { value: "mixed", label: "Mixed" },
];

const COMPLICATION_TOGGLES: {
  key: keyof CraniofacialComplications;
  label: string;
}[] = [
  { key: "bleedingRequiringOR", label: "Bleeding requiring return to OR" },
  { key: "infectionRequiringOR", label: "Infection requiring return to OR" },
  { key: "oronasalFistula", label: "Oronasal fistula" },
  { key: "completeDehiscence", label: "Complete dehiscence" },
  { key: "respiratoryDistress", label: "Respiratory distress" },
  { key: "readmissionWithin30d", label: "Readmission within 30 days" },
];

const GENETIC_RESULT_OPTIONS: {
  value: NonNullable<GeneticTestResult["result"]>;
  label: string;
}[] = [
  { value: "pathogenic", label: "Pathogenic" },
  { value: "likely_pathogenic", label: "Likely pathogenic" },
  { value: "vus", label: "VUS" },
  { value: "benign", label: "Benign" },
  { value: "pending", label: "Pending" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS DOT — filled/empty indicator for outcome subsections
// ═══════════════════════════════════════════════════════════════════════════════

function StatusDot({ filled, theme }: { filled: boolean; theme: any }) {
  return (
    <View
      style={[
        styles.statusDot,
        {
          backgroundColor: filled ? theme.success : theme.textTertiary + "40",
        },
      ]}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CraniofacialAssessment({
  assessment,
  onAssessmentChange,
  diagnosisId,
  subcategory,
  patientDob,
  surgeryDate,
  selectedProcedureIds = [],
}: CraniofacialAssessmentProps) {
  const { theme } = useTheme();
  const [geneticTestingExpanded, setGeneticTestingExpanded] = useState(
    () => !!assessment.cleftClassification?.geneticTesting?.tested,
  );

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
            showSpeechOutcome: false,
            showDentalOutcome: false,
            showHearingOutcome: false,
            showFeedingOutcome: false,
          },
    [subcategory],
  );

  // Outcome section visibility (includes associatedSyndrome-driven genetic testing)
  const outcomeSections = useMemo(
    () =>
      getOutcomeSectionVisibility(
        subcategory as CraniofacialSubcategory | undefined,
        assessment.cleftClassification?.associatedSyndrome,
      ),
    [subcategory, assessment.cleftClassification?.associatedSyndrome],
  );

  // Completion calculator
  const completion = useMemo(
    () =>
      calculateCraniofacialCompleteness(
        assessment,
        subcategory as CraniofacialSubcategory | undefined,
      ),
    [assessment, subcategory],
  );

  // Edge case note
  const edgeCaseNote = useMemo(
    () => getEdgeCaseNote(diagnosisId, selectedProcedureIds),
    [diagnosisId, selectedProcedureIds],
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

  // ─── Update helpers ──────────────────────────────────────────────────────────

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

  const updateOutcomes = useCallback(
    (updates: Partial<CraniofacialOutcomes>) => {
      onAssessmentChange({
        ...assessment,
        outcomes: { ...assessment.outcomes, ...updates },
      });
    },
    [assessment, onAssessmentChange],
  );

  const updateSpeech = useCallback(
    (updates: Partial<SpeechOutcome>) => {
      updateOutcomes({
        speech: { ...assessment.outcomes?.speech, ...updates },
      });
    },
    [assessment.outcomes?.speech, updateOutcomes],
  );

  const updateDental = useCallback(
    (updates: Partial<DentalOutcome>) => {
      updateOutcomes({
        dental: { ...assessment.outcomes?.dental, ...updates },
      });
    },
    [assessment.outcomes?.dental, updateOutcomes],
  );

  const updateHearing = useCallback(
    (updates: Partial<HearingOutcome>) => {
      updateOutcomes({
        hearing: { ...assessment.outcomes?.hearing, ...updates },
      });
    },
    [assessment.outcomes?.hearing, updateOutcomes],
  );

  const updateFeeding = useCallback(
    (updates: Partial<FeedingOutcome>) => {
      updateOutcomes({
        feeding: { ...assessment.outcomes?.feeding, ...updates },
      });
    },
    [assessment.outcomes?.feeding, updateOutcomes],
  );

  const updateComplications = useCallback(
    (updates: Partial<CraniofacialComplications>) => {
      updateOutcomes({
        complications: { ...assessment.outcomes?.complications, ...updates },
      });
    },
    [assessment.outcomes?.complications, updateOutcomes],
  );

  const updateGeneticTesting = useCallback(
    (updates: Partial<GeneticTestResult>) => {
      updateCleftClassification({
        geneticTesting: {
          ...assessment.cleftClassification?.geneticTesting,
          tested:
            assessment.cleftClassification?.geneticTesting?.tested ?? false,
          ...updates,
        },
      });
    },
    [assessment.cleftClassification?.geneticTesting, updateCleftClassification],
  );

  // ─── Outcome sub-section fill checks ─────────────────────────────────────────

  const outcomes = assessment.outcomes;
  const speechFilled = outcomes?.speech?.vpcRating !== undefined;
  const dentalFilled =
    outcomes?.dental?.fiveYearOldIndex !== undefined ||
    outcomes?.dental?.goslonScore !== undefined;
  const hearingFilled = outcomes?.hearing?.grommetsInserted !== undefined;
  const feedingFilled = outcomes?.feeding?.method !== undefined;
  const complicationsFilled = COMPLICATION_TOGGLES.some(
    (c) => outcomes?.complications?.[c.key] === true,
  );

  const ops = assessment.operativeDetails;

  return (
    <View style={styles.container} testID="caseForm.craniofacial.assessment">
      {/* ────────────────────────────────────────────────────────────────────
       * COMPLETION BADGE
       * ──────────────────────────────────────────────────────────────────── */}
      {completion.total > 0 ? (
        <View
          style={[
            styles.completionBadge,
            {
              backgroundColor:
                (completion.percentage === 100
                  ? theme.success
                  : theme.textSecondary) + "15",
            },
          ]}
        >
          <Feather
            name={completion.percentage === 100 ? "check-circle" : "circle"}
            size={14}
            color={
              completion.percentage === 100
                ? theme.success
                : theme.textSecondary
            }
          />
          <ThemedText
            style={[
              styles.completionText,
              {
                color:
                  completion.percentage === 100
                    ? theme.success
                    : theme.textSecondary,
              },
            ]}
          >
            {completion.filled}/{completion.total} sections complete
          </ThemedText>
        </View>
      ) : null}

      {/* ────────────────────────────────────────────────────────────────────
       * EDGE CASE INFO BANNER
       * ──────────────────────────────────────────────────────────────────── */}
      {edgeCaseNote ? (
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: theme.info + "15",
              borderColor: theme.info + "40",
            },
          ]}
        >
          <Feather
            name={edgeCaseNote.icon as any}
            size={14}
            color={theme.info}
          />
          <ThemedText style={[styles.infoText, { color: theme.info }]}>
            {edgeCaseNote.message}
          </ThemedText>
        </View>
      ) : null}

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

          {/* Associated syndrome */}
          <ThemedText
            style={[
              styles.fieldLabel,
              { color: theme.textSecondary, marginTop: Spacing.sm },
            ]}
          >
            Associated syndrome
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundTertiary,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="e.g., 22q11.2 deletion, Van der Woude"
            placeholderTextColor={theme.textTertiary}
            value={assessment.cleftClassification?.associatedSyndrome ?? ""}
            onChangeText={(t) =>
              updateCleftClassification({
                associatedSyndrome: t || undefined,
              })
            }
          />

          {/* Genetic testing — expandable */}
          {outcomeSections.showGeneticTesting ? (
            <>
              <Pressable
                style={styles.subSectionHeader}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setGeneticTestingExpanded((prev) => !prev);
                }}
              >
                <Feather name="code" size={14} color={theme.link} />
                <ThemedText
                  style={[styles.subSectionTitle, { color: theme.text }]}
                >
                  Genetic Testing
                </ThemedText>
                <Feather
                  name={geneticTestingExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={theme.textSecondary}
                />
              </Pressable>
              {geneticTestingExpanded ? (
                <View style={styles.subSectionBody}>
                  <View style={styles.switchRow}>
                    <ThemedText
                      style={[styles.switchLabel, { color: theme.text }]}
                    >
                      Genetic testing performed
                    </ThemedText>
                    <Switch
                      value={
                        assessment.cleftClassification?.geneticTesting
                          ?.tested ?? false
                      }
                      onValueChange={(v) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateGeneticTesting({
                          tested: v,
                          gene: v
                            ? assessment.cleftClassification?.geneticTesting
                                ?.gene
                            : undefined,
                          result: v
                            ? assessment.cleftClassification?.geneticTesting
                                ?.result
                            : undefined,
                        });
                      }}
                      trackColor={{ false: theme.border, true: theme.link }}
                      thumbColor={
                        Platform.OS === "android" ? "#fff" : undefined
                      }
                    />
                  </View>
                  {assessment.cleftClassification?.geneticTesting?.tested ? (
                    <>
                      <ThemedText
                        style={[
                          styles.fieldLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Gene
                      </ThemedText>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: theme.backgroundTertiary,
                            borderColor: theme.border,
                            color: theme.text,
                          },
                        ]}
                        placeholder="e.g., FGFR2, TWIST1, 22q11.2"
                        placeholderTextColor={theme.textTertiary}
                        value={
                          assessment.cleftClassification?.geneticTesting
                            ?.gene ?? ""
                        }
                        onChangeText={(t) =>
                          updateGeneticTesting({ gene: t || undefined })
                        }
                      />
                      <ThemedText
                        style={[
                          styles.fieldLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Result
                      </ThemedText>
                      <View style={styles.chipGrid}>
                        {GENETIC_RESULT_OPTIONS.map((opt) => {
                          const sel =
                            assessment.cleftClassification?.geneticTesting
                              ?.result === opt.value;
                          return (
                            <Pressable
                              key={opt.value}
                              onPress={() => {
                                Haptics.impactAsync(
                                  Haptics.ImpactFeedbackStyle.Light,
                                );
                                updateGeneticTesting({
                                  result: sel ? undefined : opt.value,
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
                    </>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}
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

      {/* ────────────────────────────────────────────────────────────────────
       * OPERATIVE DETAILS — always visible
       * ──────────────────────────────────────────────────────────────────── */}
      <SectionWrapper title="Operative Details" icon="clipboard">
        {/* Age at surgery */}
        {computedAge ? (
          <View
            style={[styles.ageBadge, { backgroundColor: theme.link + "15" }]}
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
          <ThemedText style={[styles.hintText, { color: theme.textTertiary }]}>
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
                    ageWarning.severity === "red" ? theme.error : theme.warning,
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
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
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
       * OUTCOMES & AUDIT — always available, collapsed by default
       * ──────────────────────────────────────────────────────────────────── */}
      <SectionWrapper
        title="Outcomes & Audit"
        icon="award"
        collapsible
        defaultCollapsed
      >
        {/* ── Speech ──────────────────────────────────────────────────────── */}
        {sections.showSpeechOutcome ? (
          <>
            <View style={styles.outcomeSubHeader}>
              <StatusDot filled={speechFilled} theme={theme} />
              <ThemedText
                style={[styles.outcomeSubTitle, { color: theme.text }]}
              >
                Speech
              </ThemedText>
            </View>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              VPC rating
            </ThemedText>
            <View style={styles.chipGrid}>
              {VPC_RATINGS.map((opt) => {
                const sel = outcomes?.speech?.vpcRating === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateSpeech({
                        vpcRating: sel ? undefined : opt.value,
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
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Hypernasality
            </ThemedText>
            <View style={styles.chipGrid}>
              {HYPERNASALITY_OPTIONS.map((opt) => {
                const sel = outcomes?.speech?.hypernasality === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateSpeech({
                        hypernasality: sel ? undefined : opt.value,
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
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Audible nasal emission
              </ThemedText>
              <Switch
                value={outcomes?.speech?.audibleNasalEmission ?? false}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSpeech({ audibleNasalEmission: v });
                }}
                trackColor={{ false: theme.border, true: theme.link }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Secondary speech surgery needed
              </ThemedText>
              <Switch
                value={outcomes?.speech?.secondarySpeechSurgeryNeeded ?? false}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSpeech({ secondarySpeechSurgeryNeeded: v });
                }}
                trackColor={{ false: theme.border, true: theme.link }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
            <View style={styles.inlineField}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Assessment age (months)
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
                  outcomes?.speech?.assessmentAgeMonths !== undefined
                    ? String(outcomes.speech.assessmentAgeMonths)
                    : ""
                }
                onChangeText={(t) => {
                  const n = parseInt(t, 10);
                  updateSpeech({
                    assessmentAgeMonths: isNaN(n) ? undefined : n,
                  });
                }}
              />
            </View>
            <View
              style={[
                styles.subSectionDivider,
                { borderBottomColor: theme.border },
              ]}
            />
          </>
        ) : null}

        {/* ── Dental ─────────────────────────────────────────────────────── */}
        {sections.showDentalOutcome ? (
          <>
            <View style={styles.outcomeSubHeader}>
              <StatusDot filled={dentalFilled} theme={theme} />
              <ThemedText
                style={[styles.outcomeSubTitle, { color: theme.text }]}
              >
                Dental
              </ThemedText>
            </View>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              5-Year-Old Index
            </ThemedText>
            <View style={styles.chipGrid}>
              {([1, 2, 3, 4, 5] as const).map((v) => {
                const sel = outcomes?.dental?.fiveYearOldIndex === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateDental({
                        fiveYearOldIndex: sel ? undefined : v,
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
                      {String(v)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              GOSLON score
            </ThemedText>
            <View style={styles.chipGrid}>
              {([1, 2, 3, 4, 5] as const).map((v) => {
                const sel = outcomes?.dental?.goslonScore === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateDental({
                        goslonScore: sel ? undefined : v,
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
                      {String(v)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.inlineField}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Assessment age (months)
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
                  outcomes?.dental?.assessmentAgeMonths !== undefined
                    ? String(outcomes.dental.assessmentAgeMonths)
                    : ""
                }
                onChangeText={(t) => {
                  const n = parseInt(t, 10);
                  updateDental({
                    assessmentAgeMonths: isNaN(n) ? undefined : n,
                  });
                }}
              />
            </View>
            <View
              style={[
                styles.subSectionDivider,
                { borderBottomColor: theme.border },
              ]}
            />
          </>
        ) : null}

        {/* ── Hearing ────────────────────────────────────────────────────── */}
        {sections.showHearingOutcome ? (
          <>
            <View style={styles.outcomeSubHeader}>
              <StatusDot filled={hearingFilled} theme={theme} />
              <ThemedText
                style={[styles.outcomeSubTitle, { color: theme.text }]}
              >
                Hearing
              </ThemedText>
            </View>
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Grommets inserted
              </ThemedText>
              <Switch
                value={outcomes?.hearing?.grommetsInserted ?? false}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateHearing({
                    grommetsInserted: v,
                    grommetSets: v ? outcomes?.hearing?.grommetSets : undefined,
                  });
                }}
                trackColor={{ false: theme.border, true: theme.link }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
            {outcomes?.hearing?.grommetsInserted ? (
              <View style={styles.inlineField}>
                <ThemedText
                  style={[styles.fieldLabel, { color: theme.textSecondary }]}
                >
                  Number of grommet sets
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
                    outcomes?.hearing?.grommetSets !== undefined
                      ? String(outcomes.hearing.grommetSets)
                      : ""
                  }
                  onChangeText={(t) => {
                    const n = parseInt(t, 10);
                    updateHearing({
                      grommetSets: isNaN(n) ? undefined : n,
                    });
                  }}
                />
              </View>
            ) : null}
            <View style={styles.switchRow}>
              <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
                Hearing aid use
              </ThemedText>
              <Switch
                value={outcomes?.hearing?.hearingAidUse ?? false}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateHearing({ hearingAidUse: v });
                }}
                trackColor={{ false: theme.border, true: theme.link }}
                thumbColor={Platform.OS === "android" ? "#fff" : undefined}
              />
            </View>
            <View
              style={[
                styles.subSectionDivider,
                { borderBottomColor: theme.border },
              ]}
            />
          </>
        ) : null}

        {/* ── Feeding ────────────────────────────────────────────────────── */}
        {sections.showFeedingOutcome ? (
          <>
            <View style={styles.outcomeSubHeader}>
              <StatusDot filled={feedingFilled} theme={theme} />
              <ThemedText
                style={[styles.outcomeSubTitle, { color: theme.text }]}
              >
                Feeding
              </ThemedText>
            </View>
            <ThemedText
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              Method
            </ThemedText>
            <View style={styles.chipGrid}>
              {FEEDING_METHODS.map((opt) => {
                const sel = outcomes?.feeding?.method === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateFeeding({
                        method: sel ? undefined : opt.value,
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
            <View style={styles.inlineField}>
              <ThemedText
                style={[styles.fieldLabel, { color: theme.textSecondary }]}
              >
                Weight percentile at 3 months
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
                  outcomes?.feeding?.weightPercentileAt3mo !== undefined
                    ? String(outcomes.feeding.weightPercentileAt3mo)
                    : ""
                }
                onChangeText={(t) => {
                  const n = parseInt(t, 10);
                  updateFeeding({
                    weightPercentileAt3mo: isNaN(n) ? undefined : n,
                  });
                }}
              />
            </View>
            <View
              style={[
                styles.subSectionDivider,
                { borderBottomColor: theme.border },
              ]}
            />
          </>
        ) : null}

        {/* ── Complications ──────────────────────────────────────────────── */}
        <View style={styles.outcomeSubHeader}>
          <StatusDot filled={complicationsFilled} theme={theme} />
          <ThemedText style={[styles.outcomeSubTitle, { color: theme.text }]}>
            Complications
          </ThemedText>
        </View>
        {COMPLICATION_TOGGLES.map((comp) => (
          <View key={comp.key} style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: theme.text }]}>
              {comp.label}
            </ThemedText>
            <Switch
              value={outcomes?.complications?.[comp.key] ?? false}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateComplications({ [comp.key]: v });
              }}
              trackColor={{ false: theme.border, true: theme.link }}
              thumbColor={Platform.OS === "android" ? "#fff" : undefined}
            />
          </View>
        ))}
      </SectionWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  completionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  completionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
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
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    minHeight: 44,
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
    minHeight: 44,
    marginTop: Spacing.xs,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  subSectionBody: {
    gap: Spacing.md,
    paddingLeft: Spacing.xs,
  },
  outcomeSubHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  outcomeSubTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subSectionDivider: {
    borderBottomWidth: 1,
    marginTop: Spacing.sm,
  },
});
