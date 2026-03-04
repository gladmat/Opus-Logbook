import React, { useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { FormField, PickerField, SelectField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { TimeField } from "@/components/TimeField";
import { CollapsibleFormSection } from "./CollapsibleFormSection";
import { useCaseFormState, useCaseFormDispatch } from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  OperatingTeamRole,
  WoundInfectionRisk,
  AnaestheticType,
  OPERATING_TEAM_ROLE_LABELS,
} from "@/types/case";

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

const TEAM_ROLES: { value: OperatingTeamRole; label: string }[] = [
  { value: "scrub_nurse", label: "Scrub Nurse" },
  { value: "circulating_nurse", label: "Circulating Nurse" },
  { value: "anaesthetist", label: "Anaesthetist" },
  { value: "anaesthetic_registrar", label: "Anaesthetic Registrar" },
  { value: "surgical_assistant", label: "Surgical Assistant" },
  { value: "surgical_registrar", label: "Surgical Registrar" },
  { value: "medical_student", label: "Medical Student" },
];

export const OperativeFactorsSection = React.memo(function OperativeFactorsSection() {
  const { theme } = useTheme();
  const { state, durationDisplay } = useCaseFormState();
  const { dispatch, addTeamMember, removeTeamMember } = useCaseFormDispatch();

  const filledCount = useMemo(() => {
    let count = 0;
    if (state.anaestheticType) count++;
    if (state.woundInfectionRisk) count++;
    if (state.surgeryStartTime) count++;
    return count;
  }, [state.anaestheticType, state.woundInfectionRisk, state.surgeryStartTime]);

  return (
    <CollapsibleFormSection
      title="Operative Factors"
      subtitle="Timing, team, and surgical details"
      filledCount={filledCount}
      totalCount={3}
    >
      <SectionHeader title="Surgery Timing" subtitle="Optional but recommended" />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <TimeField
            label="Start Time"
            value={state.surgeryStartTime}
            onChangeText={(v: string) => dispatch(setField("surgeryStartTime", v))}
            placeholder="e.g., 0830"
          />
        </View>
        <View style={styles.halfField}>
          <TimeField
            label="End Time"
            value={state.surgeryEndTime}
            onChangeText={(v: string) => dispatch(setField("surgeryEndTime", v))}
            placeholder="e.g., 1415"
          />
        </View>
      </View>

      {durationDisplay ? (
        <View style={[styles.durationCard, { backgroundColor: theme.link + "10" }]}>
          <Feather name="clock" size={16} color={theme.link} />
          <ThemedText style={[styles.durationText, { color: theme.link }]}>
            Duration: {durationDisplay}
          </ThemedText>
        </View>
      ) : null}

      <SectionHeader title="Operating Team" subtitle="Add team members (optional)" />

      {state.operatingTeam.length > 0 ? (
        <View style={styles.teamList}>
          {state.operatingTeam.map((member) => (
            <View
              key={member.id}
              style={[
                styles.teamMemberCard,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View style={styles.teamMemberInfo}>
                <ThemedText style={styles.teamMemberName}>
                  {member.name}
                </ThemedText>
                <ThemedText
                  style={[styles.teamMemberRole, { color: theme.textSecondary }]}
                >
                  {OPERATING_TEAM_ROLE_LABELS[member.role]}
                </ThemedText>
              </View>
              <Pressable onPress={() => removeTeamMember(member.id)} hitSlop={8}>
                <Feather name="x" size={20} color={theme.textTertiary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.addTeamMemberContainer}>
        <View style={styles.row}>
          <View style={styles.halfField}>
            <FormField
              label="Name"
              value={state.newTeamMemberName}
              onChangeText={(v: string) => dispatch(setField("newTeamMemberName", v))}
              placeholder="Team member name"
            />
          </View>
          <View style={styles.halfField}>
            <PickerField
              label="Role"
              value={state.newTeamMemberRole}
              options={TEAM_ROLES}
              onSelect={(v: string) =>
                dispatch(setField("newTeamMemberRole", v as OperatingTeamRole))
              }
            />
          </View>
        </View>
        <Pressable
          style={[styles.addButton, { backgroundColor: theme.link + "15" }]}
          onPress={addTeamMember}
        >
          <Feather name="plus" size={18} color={theme.link} />
          <ThemedText style={[styles.addButtonText, { color: theme.link }]}>
            Add Team Member
          </ThemedText>
        </Pressable>
      </View>

      <SectionHeader title="Operative Factors" />

      <SelectField
        label="Wound Infection Risk"
        value={state.woundInfectionRisk}
        options={WOUND_RISK_OPTIONS}
        onSelect={(v: string) =>
          dispatch(setField("woundInfectionRisk", v as WoundInfectionRisk))
        }
      />

      <SelectField
        label="Anaesthetic Type"
        value={state.anaestheticType}
        options={ANAESTHETIC_OPTIONS}
        onSelect={(v: string) =>
          dispatch(setField("anaestheticType", v as AnaestheticType))
        }
      />

      <View style={styles.checkboxRow}>
        <Pressable
          style={[
            styles.checkbox,
            {
              backgroundColor: state.antibioticProphylaxis
                ? theme.link + "20"
                : theme.backgroundDefault,
              borderColor: state.antibioticProphylaxis
                ? theme.link
                : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dispatch(
              setField("antibioticProphylaxis", !state.antibioticProphylaxis),
            );
          }}
        >
          {state.antibioticProphylaxis ? (
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
              backgroundColor: state.dvtProphylaxis
                ? theme.link + "20"
                : theme.backgroundDefault,
              borderColor: state.dvtProphylaxis
                ? theme.link
                : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dispatch(setField("dvtProphylaxis", !state.dvtProphylaxis));
          }}
        >
          {state.dvtProphylaxis ? (
            <Feather name="check" size={16} color={theme.link} />
          ) : null}
        </Pressable>
        <ThemedText style={styles.checkboxLabel}>
          DVT Prophylaxis Given
        </ThemedText>
      </View>
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
  teamList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  teamMemberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  teamMemberInfo: {
    flex: 1,
  },
  teamMemberName: {
    fontSize: 15,
    fontWeight: "500",
  },
  teamMemberRole: {
    fontSize: 13,
    marginTop: 2,
  },
  addTeamMemberContainer: {
    marginBottom: Spacing.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  addButtonText: {
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
});
