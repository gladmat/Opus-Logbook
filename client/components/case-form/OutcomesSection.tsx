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
import { parseIsoDateValue } from "@/lib/dateValues";
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
  const stayType = useCaseFormField("stayType");
  const procedureDate = useCaseFormField("procedureDate");
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

  // Day case auto-fills outcome = "discharged_home" (applyDayCaseDefaults in
  // useCaseForm) — surface that it was automatic (follow-up 5b / B3.7).
  const isOutcomeAutoFilled =
    stayType === "day_case" && outcome === "discharged_home";

  // 30-day RACS audit window: teaser once the procedure is ≥30 days old and
  // nothing has been recorded yet (follow-up 5c / B3.5). No auto-expand.
  const auditWindowReached = useMemo(() => {
    const parsed = parseIsoDateValue(procedureDate);
    if (!parsed) return false;
    const elapsedDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
    return elapsedDays >= 30;
  }, [procedureDate]);

  const showAuditTeaser =
    auditWindowReached && !hasAuditData && !isAuditExpanded;

  return (
    <CollapsibleFormSection
      title="Outcomes"
      subtitle="Discharge, complications, and infection"
      filledCount={filledCount}
      totalCount={1}
    >
      {/* Duplicate <SectionHeader title="Outcomes" /> removed (audit P3.8 —
          the outer CollapsibleFormSection already shows the title). */}

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
        testID="caseForm.outcomes.picker-dischargeOutcome"
      />

      {isOutcomeAutoFilled ? (
        <View
          style={[
            styles.autoFillBadge,
            { backgroundColor: theme.accentSurface },
          ]}
          accessibilityLabel="Outcome auto-filled from day case stay type"
          testID="caseForm.outcomes.badge-outcomeAutoFilled"
        >
          <Feather name="zap" size={12} color={theme.link} />
          <ThemedText style={[styles.autoFillBadgeText, { color: theme.link }]}>
            Auto-filled
          </ThemedText>
        </View>
      ) : null}

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
          testID="caseForm.outcomes.picker-mortalityClassification"
        />
      ) : null}

      <View style={styles.checkboxRow}>
        <Pressable
          style={[
            styles.checkbox,
            {
              backgroundColor: discussedAtMDM
                ? theme.accentSurface
                : theme.backgroundDefault,
              borderColor: discussedAtMDM ? theme.link : theme.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dispatch(setField("discussedAtMDM", !discussedAtMDM));
          }}
          accessibilityRole="checkbox"
          accessibilityLabel="Discussed at MDM"
          accessibilityState={{ checked: !!discussedAtMDM }}
          testID="caseForm.outcomes.toggle-mdm"
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
        accessibilityRole="button"
        accessibilityLabel={`30-day audit, ${
          hasAuditData
            ? "has entries"
            : showAuditTeaser
              ? "audit window reached, tap to record"
              : "empty"
        }`}
        accessibilityState={{ expanded: isAuditExpanded }}
        testID="caseForm.outcomes.section-30dayAudit"
      >
        <View style={styles.auditToggleRow}>
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
          {/* Status pairs colour + text (CLAUDE.md Medical UX Rule 1 — never
              use colour alone). The previous bare warning-coloured dot
              communicated state by hue only. */}
          {hasAuditData ? (
            <View style={styles.auditBadge}>
              <View
                style={[styles.auditDot, { backgroundColor: theme.warning }]}
              />
              <ThemedText
                style={[styles.auditBadgeText, { color: theme.warning }]}
              >
                Has entries
              </ThemedText>
            </View>
          ) : null}
        </View>
        {showAuditTeaser ? (
          <ThemedText style={[styles.auditTeaserText, { color: theme.link }]}>
            30-day audit window reached — tap to record
          </ThemedText>
        ) : null}
      </Pressable>

      {isAuditExpanded ? (
        <>
          <Pressable
            style={styles.checkboxRow}
            testID="caseForm.outcomes.toggle-unplannedReadmission"
            accessibilityRole="checkbox"
            accessibilityLabel="Unplanned readmission within 28 days"
            accessibilityState={{ checked: !!isUnplannedReadmission }}
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
                    ? theme.warningSurface
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
            testID="caseForm.outcomes.toggle-unplannedIcu"
          />

          <View style={styles.checkboxRow}>
            <Pressable
              style={[
                styles.checkbox,
                {
                  backgroundColor: returnToTheatre
                    ? theme.errorSurface
                    : theme.backgroundDefault,
                  borderColor: returnToTheatre ? theme.error : theme.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                dispatch(setField("returnToTheatre", !returnToTheatre));
              }}
              accessibilityRole="checkbox"
              accessibilityLabel="Unplanned return to theatre"
              accessibilityState={{ checked: !!returnToTheatre }}
              testID="caseForm.outcomes.toggle-returnToTheatre"
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
  autoFillBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  autoFillBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  auditToggle: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  auditToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
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
  auditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  auditBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  auditTeaserText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: Spacing.lg,
  },
});
