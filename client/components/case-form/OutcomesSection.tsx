import React, { useMemo, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { FormField, PickerField, SelectField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { CollapsibleFormSection } from "./CollapsibleFormSection";
import { InfectionOverlayForm } from "@/components/InfectionOverlayForm";
import {
  useCaseFormDispatch,
  useCaseFormField,
} from "@/contexts/CaseFormContext";
import { setField } from "@/hooks/useCaseForm";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  UnplannedICUReason,
  UnplannedReadmissionReason,
  DischargeOutcome,
  MortalityClassification,
  UNPLANNED_ICU_LABELS,
  UNPLANNED_READMISSION_LABELS,
  DISCHARGE_OUTCOME_LABELS,
  MORTALITY_CLASSIFICATION_LABELS,
} from "@/types/case";
import type { InfectionOverlay } from "@/types/infection";

interface OutcomesSectionProps {
  infectionOverlay?: InfectionOverlay;
  onInfectionChange: (v: InfectionOverlay | undefined) => void;
  infectionCollapsed: boolean;
  onInfectionToggle: () => void;
}

export const OutcomesSection = React.memo(function OutcomesSection({
  infectionOverlay,
  onInfectionChange,
  infectionCollapsed,
  onInfectionToggle,
}: OutcomesSectionProps) {
  const { theme } = useTheme();
  const outcome = useCaseFormField("outcome");
  const mortalityClassification = useCaseFormField("mortalityClassification");
  const discussedAtMDM = useCaseFormField("discussedAtMDM");
  const isUnplannedReadmission = useCaseFormField("isUnplannedReadmission");
  const unplannedReadmission = useCaseFormField("unplannedReadmission");
  const unplannedICU = useCaseFormField("unplannedICU");
  const returnToTheatre = useCaseFormField("returnToTheatre");
  const returnToTheatreReason = useCaseFormField("returnToTheatreReason");
  const { dispatch } = useCaseFormDispatch();

  const filledCount = useMemo(() => {
    let count = 0;
    if (outcome) count++;
    return count;
  }, [outcome]);

  // Auto-expand 30-day audit if any audit field already has data (edit mode backward compat)
  const hasAuditData = useMemo(
    () =>
      isUnplannedReadmission ||
      (unplannedReadmission && unplannedReadmission !== "no") ||
      (unplannedICU && unplannedICU !== "no") ||
      returnToTheatre ||
      !!infectionOverlay,
    [
      isUnplannedReadmission,
      unplannedReadmission,
      unplannedICU,
      returnToTheatre,
      infectionOverlay,
    ],
  );

  const [isAuditExpanded, setIsAuditExpanded] = useState(hasAuditData);

  return (
    <CollapsibleFormSection
      title="Outcomes"
      subtitle="Discharge, complications, and infection"
      filledCount={filledCount}
      totalCount={1}
    >
      <SectionHeader title="Outcomes" />

      {/* ── Tier 1: Always visible ─────────────────────────────────── */}

      <PickerField
        label="Discharge Outcome"
        value={outcome}
        options={Object.entries(DISCHARGE_OUTCOME_LABELS).map(
          ([value, label]) => ({ value, label }),
        )}
        onSelect={(v: string) =>
          dispatch(setField("outcome", v as DischargeOutcome))
        }
      />

      {outcome === "died" ? (
        <PickerField
          label="Mortality Classification"
          value={mortalityClassification}
          options={Object.entries(MORTALITY_CLASSIFICATION_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
          onSelect={(v: string) =>
            dispatch(
              setField("mortalityClassification", v as MortalityClassification),
            )
          }
        />
      ) : null}

      <View style={styles.checkboxRow}>
        <Pressable
          style={[
            styles.checkbox,
            {
              backgroundColor: discussedAtMDM
                ? theme.link + "20"
                : theme.backgroundDefault,
              borderColor: discussedAtMDM ? theme.link : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dispatch(setField("discussedAtMDM", !discussedAtMDM));
          }}
        >
          {discussedAtMDM ? (
            <Feather name="check" size={16} color={theme.link} />
          ) : null}
        </Pressable>
        <ThemedText style={styles.checkboxLabel}>Discussed at MDM</ThemedText>
      </View>

      {/* ── Tier 2: 30-Day Audit (collapsible) ─────────────────────── */}

      <Pressable
        style={styles.auditToggle}
        onPress={() => {
          Haptics.selectionAsync();
          setIsAuditExpanded((v) => !v);
        }}
      >
        <Feather
          name={isAuditExpanded ? "chevron-down" : "chevron-right"}
          size={16}
          color={theme.textSecondary}
        />
        <ThemedText
          style={[styles.auditToggleText, { color: theme.textSecondary }]}
        >
          30-Day Audit
        </ThemedText>
        {hasAuditData ? (
          <View style={[styles.auditDot, { backgroundColor: theme.warning }]} />
        ) : null}
      </Pressable>

      {isAuditExpanded ? (
        <>
          <Pressable
            style={styles.checkboxRow}
            testID="checkbox-unplanned-readmission"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const newValue = !isUnplannedReadmission;
              dispatch(setField("isUnplannedReadmission", newValue));
              if (!newValue) {
                dispatch(setField("unplannedReadmission", "no"));
              }
            }}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isUnplannedReadmission
                    ? theme.warning + "20"
                    : theme.backgroundDefault,
                  borderColor: isUnplannedReadmission
                    ? theme.warning
                    : theme.border,
                },
              ]}
            >
              {isUnplannedReadmission ? (
                <Feather name="check" size={16} color={theme.warning} />
              ) : null}
            </View>
            <ThemedText style={styles.checkboxLabel}>
              Unplanned Readmission (within 28 days)
            </ThemedText>
          </Pressable>

          {isUnplannedReadmission ? (
            <SelectField
              label="Readmission Reason"
              value={unplannedReadmission}
              options={Object.entries(UNPLANNED_READMISSION_LABELS)
                .filter(([value]) => value !== "no")
                .map(([value, label]) => ({
                  value,
                  label: label.replace("Yes - ", ""),
                }))}
              onSelect={(v: string) =>
                dispatch(
                  setField(
                    "unplannedReadmission",
                    v as UnplannedReadmissionReason,
                  ),
                )
              }
            />
          ) : null}

          <PickerField
            label="Unplanned ICU Admission"
            value={unplannedICU}
            options={Object.entries(UNPLANNED_ICU_LABELS).map(
              ([value, label]) => ({
                value,
                label,
              }),
            )}
            onSelect={(v: string) =>
              dispatch(setField("unplannedICU", v as UnplannedICUReason))
            }
          />

          <View style={styles.checkboxRow}>
            <Pressable
              style={[
                styles.checkbox,
                {
                  backgroundColor: returnToTheatre
                    ? theme.error + "20"
                    : theme.backgroundDefault,
                  borderColor: returnToTheatre ? theme.error : theme.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                dispatch(setField("returnToTheatre", !returnToTheatre));
              }}
            >
              {returnToTheatre ? (
                <Feather name="check" size={16} color={theme.error} />
              ) : null}
            </Pressable>
            <ThemedText style={styles.checkboxLabel}>
              Unplanned Return to Theatre
            </ThemedText>
          </View>

          {returnToTheatre ? (
            <FormField
              label="Reason for Return"
              value={returnToTheatreReason}
              onChangeText={(v: string) =>
                dispatch(setField("returnToTheatreReason", v))
              }
              placeholder="e.g., Wound dehiscence"
            />
          ) : null}

          {/* ── Infection Documentation ───────────────────────────────── */}

          <SectionHeader
            title="Infection Documentation"
            subtitle="Add if this case involves infection"
          />
          <InfectionOverlayForm
            value={infectionOverlay}
            onChange={onInfectionChange}
            collapsed={infectionCollapsed}
            onToggleCollapse={onInfectionToggle}
          />
        </>
      ) : null}
    </CollapsibleFormSection>
  );
});

const styles = StyleSheet.create({
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
  auditToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  auditToggleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  auditDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
