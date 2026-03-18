import React, { useMemo, useState } from "react";
import { View, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import {
  FormField,
  SelectField,
  DatePickerField,
} from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { TimeField } from "@/components/TimeField";
import { CollapsibleFormSection } from "./CollapsibleFormSection";
import {
  useCaseFormDispatch,
  useCaseFormField,
  useCaseFormSelector,
} from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { parseDateOnlyValue } from "@/lib/dateValues";
import {
  AdmissionUrgency,
  StayType,
  SmokingStatus,
  ASAScore,
  ASA_GRADE_LABELS,
  ADMISSION_URGENCY_LABELS,
  STAY_TYPE_LABELS,
  SMOKING_STATUS_LABELS,
  COMMON_COMORBIDITIES,
  WoundInfectionRisk,
  AnaestheticType,
} from "@/types/case";
import {
  OPERATIVE_ROLE_LABELS,
  SUPERVISION_LABELS,
  supervisionApplicable,
  type OperativeRole,
  type SupervisionLevel,
} from "@/types/operativeRole";
import { isConsultantLevel } from "@/lib/roleDefaults";
import { useAuth } from "@/contexts/AuthContext";
import { EncounterClass, ENCOUNTER_CLASS_LABELS } from "@/types/episode";

// ── Constants ──────────────────────────────────────────────────────────────

const ASA_SHORT_LABELS: Record<ASAScore, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
};

const ASA_DESCRIPTIONS: Record<ASAScore, string> = {
  1: "A normal healthy patient",
  2: "A patient with mild systemic disease (e.g., well-controlled DM, mild obesity, social drinker)",
  3: "A patient with severe systemic disease (e.g., poorly controlled DM, morbid obesity, active hepatitis, ESRD on dialysis)",
  4: "A patient with severe systemic disease that is a constant threat to life (e.g., recent MI/CVA/TIA, ongoing cardiac ischaemia)",
  5: "A moribund patient who is not expected to survive without the operation (e.g., ruptured AAA, massive trauma)",
  6: "A declared brain-dead patient whose organs are being removed for donor purposes",
};

const ANAESTHETIC_OPTIONS: { value: AnaestheticType; label: string }[] = [
  { value: "general", label: "GA" },
  { value: "local", label: "LA" },
  { value: "sedation_local", label: "Sedation + LA" },
  { value: "walant", label: "WALANT" },
];

const WOUND_RISK_OPTIONS: { value: WoundInfectionRisk; label: string }[] = [
  { value: "clean", label: "Clean" },
  { value: "clean_contaminated", label: "Clean/Contaminated" },
  { value: "contaminated", label: "Contaminated" },
  { value: "dirty", label: "Dirty" },
  { value: "na", label: "N/A" },
];

const OPERATIVE_ROLE_OPTIONS: { value: OperativeRole; label: string }[] = [
  { value: "SURGEON", label: OPERATIVE_ROLE_LABELS.SURGEON },
  { value: "FIRST_ASST", label: OPERATIVE_ROLE_LABELS.FIRST_ASST },
  { value: "SECOND_ASST", label: OPERATIVE_ROLE_LABELS.SECOND_ASST },
  { value: "OBSERVER", label: OPERATIVE_ROLE_LABELS.OBSERVER },
  { value: "SUPERVISOR", label: OPERATIVE_ROLE_LABELS.SUPERVISOR },
];

const SUPERVISION_OPTIONS: { value: SupervisionLevel; label: string }[] = [
  { value: "INDEPENDENT", label: SUPERVISION_LABELS.INDEPENDENT },
  { value: "SUP_AVAILABLE", label: SUPERVISION_LABELS.SUP_AVAILABLE },
  { value: "SUP_PRESENT", label: SUPERVISION_LABELS.SUP_PRESENT },
  { value: "SUP_SCRUBBED", label: SUPERVISION_LABELS.SUP_SCRUBBED },
  { value: "DIRECTED", label: SUPERVISION_LABELS.DIRECTED },
];

// ── Component ──────────────────────────────────────────────────────────────

export const OperativeSection = React.memo(function OperativeSection() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const diagnosisGroups = useCaseFormField("diagnosisGroups");
  const asaScore = useCaseFormField("asaScore");
  const defaultOperativeRole = useCaseFormField("defaultOperativeRole");
  const defaultSupervisionLevel = useCaseFormField("defaultSupervisionLevel");
  const responsibleConsultantName = useCaseFormField(
    "responsibleConsultantName",
  );
  const admissionUrgency = useCaseFormField("admissionUrgency");
  const stayType = useCaseFormField("stayType");
  const admissionDate = useCaseFormField("admissionDate");
  const dischargeDate = useCaseFormField("dischargeDate");
  const injuryDate = useCaseFormField("injuryDate");
  const episodeId = useCaseFormField("episodeId");
  const encounterClass = useCaseFormField("encounterClass");
  const surgeryStartTime = useCaseFormField("surgeryStartTime");
  const surgeryEndTime = useCaseFormField("surgeryEndTime");
  const anaestheticType = useCaseFormField("anaestheticType");
  const woundInfectionRisk = useCaseFormField("woundInfectionRisk");
  const antibioticProphylaxis = useCaseFormField("antibioticProphylaxis");
  const dvtProphylaxis = useCaseFormField("dvtProphylaxis");
  const smoker = useCaseFormField("smoker");
  const heightCm = useCaseFormField("heightCm");
  const weightKg = useCaseFormField("weightKg");
  const selectedComorbidities = useCaseFormField("selectedComorbidities");
  const showInjuryDate = useCaseFormSelector(
    (snapshot) => snapshot.showInjuryDate,
  );
  const durationDisplay = useCaseFormSelector(
    (snapshot) => snapshot.durationDisplay,
  );
  const calculatedBmi = useCaseFormSelector(
    (snapshot) => snapshot.calculatedBmi,
  );
  const { dispatch } = useCaseFormDispatch();
  const { profile } = useAuth();
  const [showAsaInfo, setShowAsaInfo] = useState(false);

  const hasHandTraumaGroup = diagnosisGroups.some(
    (group) =>
      group.specialty === "hand_wrist" &&
      Boolean(group.diagnosisClinicalDetails?.handTrauma),
  );

  const asaNum = asaScore ? parseInt(asaScore) : 0;
  const showComorbidities = asaNum >= 2;

  const isConsultant = isConsultantLevel(profile?.careerStage);

  const filledCount = useMemo(() => {
    let count = 0;
    if (defaultOperativeRole) count++;
    if (responsibleConsultantName) count++;
    if (admissionUrgency) count++;
    if (stayType) count++;
    if (anaestheticType) count++;
    if (surgeryStartTime) count++;
    return count;
  }, [
    defaultOperativeRole,
    responsibleConsultantName,
    admissionUrgency,
    stayType,
    anaestheticType,
    surgeryStartTime,
  ]);

  return (
    <CollapsibleFormSection
      title="Operative Details"
      subtitle="Role, admission, timing, and patient factors"
      filledCount={filledCount}
      totalCount={6}
    >
      {/* ── Your Role & Supervision ──────────────────────────────────────── */}

      <SectionHeader title="Your Role & Supervision" />

      {isConsultant ? (
        <View style={styles.consultantRow}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Responsible Consultant
          </ThemedText>
          <ThemedText style={styles.consultantValue}>
            {responsibleConsultantName || "You"}
          </ThemedText>
          {responsibleConsultantName ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                dispatch(setField("responsibleConsultantName", ""));
                dispatch(setField("responsibleConsultantUserId", ""));
              }}
              hitSlop={8}
            >
              <ThemedText style={[styles.changeLink, { color: theme.link }]}>
                Change
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FormField
          label="Responsible Consultant"
          value={responsibleConsultantName}
          onChangeText={(v: string) =>
            dispatch(setField("responsibleConsultantName", v))
          }
          placeholder="Consultant name"
        />
      )}

      <SelectField
        label="Operative Role"
        value={defaultOperativeRole}
        options={OPERATIVE_ROLE_OPTIONS}
        onSelect={(v: string) => {
          dispatch(setField("defaultOperativeRole", v as OperativeRole));
          // Auto-clear supervision when switching away from SURGEON
          if (!supervisionApplicable(v as OperativeRole)) {
            dispatch(setField("defaultSupervisionLevel", "NOT_APPLICABLE"));
          }
        }}
      />

      {supervisionApplicable(defaultOperativeRole as OperativeRole) ? (
        <SelectField
          label="Supervision Level"
          value={defaultSupervisionLevel}
          options={SUPERVISION_OPTIONS}
          onSelect={(v: string) =>
            dispatch(setField("defaultSupervisionLevel", v as SupervisionLevel))
          }
        />
      ) : null}

      {/* ── Admission & Timing ──────────────────────────────────────────── */}

      <SectionHeader title="Admission & Timing" />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Urgency
          </ThemedText>
          <View
            style={[
              styles.segmentedControl,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundDefault,
              },
            ]}
          >
            {(
              Object.entries(ADMISSION_URGENCY_LABELS) as [
                AdmissionUrgency,
                string,
              ][]
            ).map(([value, label]) => {
              const isSelected = admissionUrgency === value;
              return (
                <Pressable
                  key={value}
                  testID={`caseForm.operative.chip-urgency-${value}`}
                  style={[
                    styles.segmentedButton,
                    isSelected ? { backgroundColor: theme.link } : undefined,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    dispatch(setField("admissionUrgency", value));
                  }}
                >
                  <ThemedText
                    style={[
                      styles.segmentedButtonText,
                      { color: isSelected ? "#FFFFFF" : theme.textSecondary },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.halfField}>
          <ThemedText
            style={[styles.fieldLabel, { color: theme.textSecondary }]}
          >
            Stay Type
          </ThemedText>
          <View
            style={[
              styles.segmentedControl,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundDefault,
              },
            ]}
          >
            {(Object.entries(STAY_TYPE_LABELS) as [StayType, string][]).map(
              ([value, label]) => {
                const isSelected = stayType === value;
                return (
                  <Pressable
                    key={value}
                    testID={`caseForm.operative.chip-stay-${value}`}
                    style={[
                      styles.segmentedButton,
                      isSelected ? { backgroundColor: theme.link } : undefined,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      dispatch(setField("stayType", value));
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.segmentedButtonText,
                        { color: isSelected ? "#FFFFFF" : theme.textSecondary },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              },
            )}
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <DatePickerField
            label="Admission Date"
            value={admissionDate}
            onChange={(v: string) => dispatch(setField("admissionDate", v))}
            maximumDate={new Date()}
          />
        </View>
        <View style={styles.halfField}>
          <DatePickerField
            label="Discharge Date"
            value={dischargeDate}
            onChange={(v: string) => dispatch(setField("dischargeDate", v))}
            minimumDate={parseDateOnlyValue(admissionDate) ?? undefined}
            clearable
          />
        </View>
      </View>

      {showInjuryDate && !hasHandTraumaGroup ? (
        <View style={styles.row}>
          <View style={styles.halfField}>
            <DatePickerField
              label="Day of Injury"
              value={injuryDate}
              onChange={(v: string) => dispatch(setField("injuryDate", v))}
              placeholder="Select date..."
              maximumDate={new Date()}
            />
          </View>
        </View>
      ) : null}

      {episodeId ? (
        <SelectField
          label="Encounter Class"
          value={encounterClass}
          options={Object.entries(ENCOUNTER_CLASS_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
          onSelect={(v: string) =>
            dispatch(setField("encounterClass", v as EncounterClass))
          }
        />
      ) : null}

      <View style={styles.row}>
        <View style={styles.halfField}>
          <TimeField
            label="Start Time"
            value={surgeryStartTime}
            onChangeText={(v: string) =>
              dispatch(setField("surgeryStartTime", v))
            }
            placeholder="e.g., 0830"
          />
        </View>
        <View style={styles.halfField}>
          <TimeField
            label="End Time"
            value={surgeryEndTime}
            onChangeText={(v: string) =>
              dispatch(setField("surgeryEndTime", v))
            }
            placeholder="e.g., 1415"
          />
        </View>
      </View>

      {durationDisplay ? (
        <View
          style={[styles.durationCard, { backgroundColor: theme.link + "10" }]}
        >
          <Feather name="clock" size={16} color={theme.link} />
          <ThemedText style={[styles.durationText, { color: theme.link }]}>
            Duration: {durationDisplay}
          </ThemedText>
        </View>
      ) : null}

      {/* ── Anaesthesia ────────────────────────────────────────────────── */}

      <SectionHeader title="Anaesthesia" />

      <SelectField
        label="Anaesthetic Type"
        value={anaestheticType}
        options={ANAESTHETIC_OPTIONS}
        onSelect={(v: string) =>
          dispatch(setField("anaestheticType", v as AnaestheticType))
        }
      />

      {/* ── Surgical Factors ────────────────────────────────────────────── */}

      <SectionHeader title="Surgical Factors" />

      <SelectField
        label="Wound Infection Risk"
        value={woundInfectionRisk}
        options={WOUND_RISK_OPTIONS}
        onSelect={(v: string) =>
          dispatch(setField("woundInfectionRisk", v as WoundInfectionRisk))
        }
      />

      <View style={styles.checkboxRow}>
        <Pressable
          style={[
            styles.checkbox,
            {
              backgroundColor: antibioticProphylaxis
                ? theme.link + "20"
                : theme.backgroundDefault,
              borderColor: antibioticProphylaxis ? theme.link : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dispatch(setField("antibioticProphylaxis", !antibioticProphylaxis));
          }}
        >
          {antibioticProphylaxis ? (
            <Feather name="check" size={16} color={theme.link} />
          ) : null}
        </Pressable>
        <ThemedText style={styles.checkboxLabel}>
          Antibiotic Prophylaxis Given
        </ThemedText>
      </View>

      <View style={styles.checkboxRow}>
        <Pressable
          style={[
            styles.checkbox,
            {
              backgroundColor: dvtProphylaxis
                ? theme.link + "20"
                : theme.backgroundDefault,
              borderColor: dvtProphylaxis ? theme.link : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dispatch(setField("dvtProphylaxis", !dvtProphylaxis));
          }}
        >
          {dvtProphylaxis ? (
            <Feather name="check" size={16} color={theme.link} />
          ) : null}
        </Pressable>
        <ThemedText style={styles.checkboxLabel}>
          DVT Prophylaxis Given
        </ThemedText>
      </View>

      {/* ── Patient Factors (collapsed by default) ──────────────────────── */}

      <SectionHeader title="Patient Factors" />

      <View style={styles.labelRow}>
        <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          ASA Score
        </ThemedText>
        <Pressable
          onPress={() => setShowAsaInfo(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="info" size={16} color={theme.textTertiary} />
        </Pressable>
      </View>
      <View
        style={[
          styles.segmentedControl,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        {(Object.entries(ASA_SHORT_LABELS) as [string, string][]).map(
          ([value, label]) => {
            const isSelected = asaScore === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.segmentedButton,
                  isSelected ? { backgroundColor: theme.link } : undefined,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  dispatch(setField("asaScore", value));
                }}
              >
                <ThemedText
                  style={[
                    styles.segmentedButtonText,
                    { color: isSelected ? "#FFFFFF" : theme.textSecondary },
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          },
        )}
      </View>
      {asaScore ? (
        <ThemedText
          style={[styles.asaDescription, { color: theme.textTertiary }]}
        >
          {ASA_GRADE_LABELS[parseInt(asaScore) as ASAScore]}
        </ThemedText>
      ) : null}

      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Smoking Status
      </ThemedText>
      <View
        style={[
          styles.segmentedControl,
          {
            borderColor: theme.border,
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        {(
          Object.entries(SMOKING_STATUS_LABELS) as [SmokingStatus, string][]
        ).map(([value, label]) => {
          const isSelected = smoker === value;
          return (
            <Pressable
              key={value}
              style={[
                styles.segmentedButton,
                isSelected ? { backgroundColor: theme.link } : undefined,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                dispatch(setField("smoker", value));
              }}
            >
              <ThemedText
                style={[
                  styles.segmentedButtonText,
                  { color: isSelected ? "#FFFFFF" : theme.textSecondary },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.thirdField}>
          <FormField
            label="Height"
            value={heightCm}
            onChangeText={(v: string) => dispatch(setField("heightCm", v))}
            placeholder="170"
            keyboardType="decimal-pad"
            unit="cm"
          />
        </View>
        <View style={styles.thirdField}>
          <FormField
            label="Weight"
            value={weightKg}
            onChangeText={(v: string) => dispatch(setField("weightKg", v))}
            placeholder="70"
            keyboardType="decimal-pad"
            unit="kg"
          />
        </View>
        <View style={styles.thirdField}>
          <View style={styles.bmiDisplay}>
            <ThemedText
              style={[styles.bmiLabel, { color: theme.textSecondary }]}
            >
              BMI
            </ThemedText>
            <ThemedText
              style={[
                styles.bmiValue,
                { color: calculatedBmi ? theme.text : theme.textTertiary },
              ]}
            >
              {calculatedBmi ? calculatedBmi.toFixed(1) : "--"}
            </ThemedText>
          </View>
        </View>
      </View>

      {showComorbidities ? (
        <>
          <SectionHeader
            title="Co-morbidities"
            subtitle="Select all that apply"
          />

          <View style={styles.comorbidityGrid}>
            {COMMON_COMORBIDITIES.slice(0, 20).map((comorbidity) => {
              const isSelected = selectedComorbidities.some(
                (c) => c.snomedCtCode === comorbidity.snomedCtCode,
              );
              return (
                <Pressable
                  key={comorbidity.snomedCtCode}
                  style={[
                    styles.comorbidityChip,
                    {
                      backgroundColor: isSelected
                        ? theme.link + "20"
                        : theme.backgroundDefault,
                      borderColor: isSelected ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (isSelected) {
                      dispatch(
                        setField(
                          "selectedComorbidities",
                          selectedComorbidities.filter(
                            (c) => c.snomedCtCode !== comorbidity.snomedCtCode,
                          ),
                        ),
                      );
                    } else {
                      dispatch(
                        setField("selectedComorbidities", [
                          ...selectedComorbidities,
                          comorbidity,
                        ]),
                      );
                    }
                  }}
                >
                  <ThemedText
                    style={[
                      styles.comorbidityText,
                      { color: isSelected ? theme.link : theme.text },
                    ]}
                  >
                    {comorbidity.commonName || comorbidity.displayName}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {/* ASA Info Modal */}
      <Modal
        visible={showAsaInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAsaInfo(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAsaInfo(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.backgroundElevated,
                paddingBottom: insets.bottom,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                ASA Physical Status Classification
              </ThemedText>
              <Pressable
                onPress={() => setShowAsaInfo(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              {(Object.entries(ASA_SHORT_LABELS) as [string, string][]).map(
                ([value, roman]) => (
                  <View
                    key={value}
                    style={[styles.asaRow, { borderBottomColor: theme.border }]}
                  >
                    <View
                      style={[
                        styles.asaBadge,
                        {
                          backgroundColor: theme.link + "15",
                        },
                      ]}
                    >
                      <ThemedText
                        style={[styles.asaBadgeText, { color: theme.link }]}
                      >
                        {roman}
                      </ThemedText>
                    </View>
                    <View style={styles.asaTextContainer}>
                      <ThemedText
                        style={[styles.asaGradeLabel, { color: theme.text }]}
                      >
                        {ASA_GRADE_LABELS[parseInt(value) as ASAScore]}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.asaGradeDesc,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {ASA_DESCRIPTIONS[parseInt(value) as ASAScore]}
                      </ThemedText>
                    </View>
                  </View>
                ),
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </CollapsibleFormSection>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  thirdField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden" as const,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  segmentedButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  asaDescription: {
    fontSize: 12,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  durationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  durationText: {
    fontSize: 14,
    fontWeight: "500",
  },
  consultantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  consultantValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  changeLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginVertical: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    fontSize: 15,
    flex: 1,
  },
  bmiDisplay: {
    paddingTop: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  bmiLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  bmiValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  comorbidityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  comorbidityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  comorbidityText: {
    fontSize: 13,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
  },
  asaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  asaBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  asaBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  asaTextContainer: {
    flex: 1,
  },
  asaGradeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  asaGradeDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
