/**
 * Flap Outcome form component for structured outcome capture.
 * Zero-tap default: "Complete Survival" + monitoring protocol from preferences (~90% of cases).
 * Captures: survival status, re-exploration events, donor/recipient complications.
 */

import React, { useMemo, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { ThemedText } from "@/components/ThemedText";
import { FormField, DatePickerField } from "@/components/FormField";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  type FreeFlapOutcomeDetails,
  type FlapSurvivalStatus,
  type PartialLossManagement,
  type DonorSiteComplication,
  type RecipientSiteComplication,
  type FlapReExplorationEvent,
  type ReExplorationFinding,
  type ReExplorationIntervention,
  type SalvageOutcome,
  FLAP_SURVIVAL_LABELS,
  PARTIAL_LOSS_MANAGEMENT_LABELS,
  DONOR_SITE_COMPLICATION_LABELS,
  RECIPIENT_SITE_COMPLICATION_LABELS,
  RE_EXPLORATION_FINDING_LABELS,
  RE_EXPLORATION_INTERVENTION_LABELS,
  SALVAGE_OUTCOME_LABELS,
} from "@/types/case";
import {
  type FlapMonitoringProtocolId,
  FLAP_MONITORING_PROTOCOLS,
} from "@/types/surgicalPreferences";
import { CollapsibleFormSection } from "@/components/case-form/CollapsibleFormSection";
import {
  normalizeDateOnlyValue,
  toUtcNoonIsoTimestamp,
} from "@/lib/dateValues";

interface FlapOutcomeSectionProps {
  outcome: FreeFlapOutcomeDetails;
  onUpdate: (outcome: FreeFlapOutcomeDetails) => void;
}

// ── Survival Status Segmented Control ─────────────────────────────────────

function SurvivalStatusControl({
  value,
  onSelect,
}: {
  value: FlapSurvivalStatus;
  onSelect: (v: FlapSurvivalStatus) => void;
}) {
  const { theme } = useTheme();
  const options: { value: FlapSurvivalStatus; label: string; color: string }[] =
    [
      { value: "complete_survival", label: "Complete", color: theme.success },
      { value: "partial_loss", label: "Partial Loss", color: theme.warning },
      { value: "total_loss", label: "Total Loss", color: theme.error },
    ];

  return (
    <View style={styles.segmentedControl}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
        Flap Survival
      </ThemedText>
      <View style={styles.segmentedRow}>
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.segmentedButton,
                {
                  backgroundColor: isActive
                    ? opt.color + "20"
                    : theme.backgroundDefault,
                  borderColor: isActive ? opt.color : theme.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(opt.value);
              }}
            >
              <ThemedText
                style={[
                  styles.segmentedButtonText,
                  { color: isActive ? opt.color : theme.text },
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
}

// ── Complication Chip Selector ─────────────────────────────────────────────

function ComplicationChips<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Record<string, string>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.chipSection}>
      <ThemedText
        style={[styles.chipSectionLabel, { color: theme.textSecondary }]}
      >
        {label}
      </ThemedText>
      <View style={styles.chipGrid}>
        {Object.entries(options).map(([value, chipLabel]) => {
          const isActive = selected.includes(value as T);
          return (
            <Pressable
              key={value}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? theme.link + "18"
                    : theme.backgroundDefault,
                  borderColor: isActive ? theme.link : theme.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(value as T);
              }}
            >
              {isActive ? (
                <Feather
                  name="check"
                  size={12}
                  color={theme.link}
                  style={{ marginRight: 4 }}
                />
              ) : null}
              <ThemedText
                style={[
                  styles.chipText,
                  { color: isActive ? theme.link : theme.text },
                ]}
                numberOfLines={1}
              >
                {chipLabel}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Re-exploration Event Card ─────────────────────────────────────────────

function ReExplorationCard({
  event,
  index,
  onUpdate,
  onRemove,
}: {
  event: FlapReExplorationEvent;
  index: number;
  onUpdate: (event: FlapReExplorationEvent) => void;
  onRemove: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.reExplorationCard,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.reExplorationCardHeader}>
        <ThemedText
          style={[styles.reExplorationCardTitle, { color: theme.text }]}
        >
          Re-exploration #{index + 1}
        </ThemedText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onRemove();
          }}
          hitSlop={8}
        >
          <Feather name="x" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>

      <FormField
        label="Hours Post-op"
        value={event.hoursPostOp ? String(event.hoursPostOp) : ""}
        onChangeText={(v) =>
          onUpdate({ ...event, hoursPostOp: v ? parseInt(v) : 0 })
        }
        placeholder="e.g., 6"
        keyboardType="numeric"
        unit="hrs"
      />

      <View style={styles.selectField}>
        <ThemedText
          style={[styles.selectLabel, { color: theme.textSecondary }]}
        >
          Finding
        </ThemedText>
        <View style={styles.selectOptions}>
          {Object.entries(RE_EXPLORATION_FINDING_LABELS).map(
            ([value, label]) => {
              const isActive = event.finding === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.selectOption,
                    {
                      backgroundColor: isActive
                        ? theme.link + "20"
                        : theme.backgroundDefault,
                      borderColor: isActive ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onUpdate({
                      ...event,
                      finding: value as ReExplorationFinding,
                    });
                  }}
                >
                  <ThemedText
                    style={[
                      styles.selectOptionText,
                      { color: isActive ? theme.link : theme.text },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            },
          )}
        </View>
      </View>

      <View style={styles.selectField}>
        <ThemedText
          style={[styles.selectLabel, { color: theme.textSecondary }]}
        >
          Intervention
        </ThemedText>
        <View style={styles.selectOptions}>
          {Object.entries(RE_EXPLORATION_INTERVENTION_LABELS).map(
            ([value, label]) => {
              const isActive = event.intervention === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.selectOption,
                    {
                      backgroundColor: isActive
                        ? theme.link + "20"
                        : theme.backgroundDefault,
                      borderColor: isActive ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onUpdate({
                      ...event,
                      intervention: value as ReExplorationIntervention,
                    });
                  }}
                >
                  <ThemedText
                    style={[
                      styles.selectOptionText,
                      { color: isActive ? theme.link : theme.text },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              );
            },
          )}
        </View>
      </View>

      <View style={styles.selectField}>
        <ThemedText
          style={[styles.selectLabel, { color: theme.textSecondary }]}
        >
          Salvage Outcome
        </ThemedText>
        <View style={styles.selectOptions}>
          {Object.entries(SALVAGE_OUTCOME_LABELS).map(([value, label]) => {
            const isActive = event.salvageOutcome === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.selectOption,
                  {
                    backgroundColor: isActive
                      ? theme.link + "20"
                      : theme.backgroundDefault,
                    borderColor: isActive ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onUpdate({
                    ...event,
                    salvageOutcome: value as SalvageOutcome,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.selectOptionText,
                    { color: isActive ? theme.link : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function FlapOutcomeSection({
  outcome,
  onUpdate,
}: FlapOutcomeSectionProps) {
  const { theme } = useTheme();
  const assessedDate = normalizeDateOnlyValue(outcome.assessedAt) ?? "";

  const handleAssessedDateChange = useCallback(
    (date: string) => {
      if (!date) {
        const next = { ...outcome };
        delete next.assessedAt;
        onUpdate(next);
        return;
      }
      onUpdate({
        ...outcome,
        assessedAt: toUtcNoonIsoTimestamp(date) ?? new Date().toISOString(),
      });
    },
    [outcome, onUpdate],
  );

  const handleAssessedDaysChange = useCallback(
    (value: string) => {
      const parsed = Number.parseInt(value, 10);
      if (!value.trim() || Number.isNaN(parsed) || parsed < 0) {
        const next = { ...outcome };
        delete next.assessedDaysPostOp;
        onUpdate(next);
        return;
      }
      onUpdate({
        ...outcome,
        assessedDaysPostOp: parsed,
      });
    },
    [outcome, onUpdate],
  );

  // ── Survival Status ──────────────────────────────────────────────────────
  const handleSurvivalChange = useCallback(
    (status: FlapSurvivalStatus) => {
      const updated = { ...outcome, flapSurvival: status };
      // Clear partial loss fields if not partial
      if (status !== "partial_loss") {
        delete updated.partialLossPercentage;
        delete updated.partialLossManagement;
      }
      onUpdate(updated);
    },
    [outcome, onUpdate],
  );

  // ── Monitoring Protocol ──────────────────────────────────────────────────
  const monitoringOptions = useMemo(
    () =>
      FLAP_MONITORING_PROTOCOLS.map((p) => ({
        value: p.id,
        label: p.label,
      })),
    [],
  );

  // ── Re-exploration ───────────────────────────────────────────────────────
  const reExploration = useMemo(
    () =>
      outcome.reExploration || {
        reExplored: false,
        events: [],
      },
    [outcome.reExploration],
  );
  const events = useMemo(
    () => reExploration.events || [],
    [reExploration.events],
  );

  const toggleReExploration = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newReExplored = !reExploration.reExplored;
    onUpdate({
      ...outcome,
      reExploration: {
        reExplored: newReExplored,
        events:
          newReExplored && events.length === 0
            ? [
                {
                  id: uuidv4(),
                  hoursPostOp: 0,
                  finding: "venous_thrombosis",
                  intervention: "thrombectomy_reanastomosis",
                  salvageOutcome: "salvaged_complete",
                },
              ]
            : events,
      },
    });
  }, [outcome, reExploration, events, onUpdate]);

  const addReExplorationEvent = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({
      ...outcome,
      reExploration: {
        reExplored: true,
        events: [
          ...events,
          {
            id: uuidv4(),
            hoursPostOp: 0,
            finding: "venous_thrombosis",
            intervention: "thrombectomy_reanastomosis",
            salvageOutcome: "salvaged_complete",
          },
        ],
      },
    });
  }, [outcome, events, onUpdate]);

  const updateEvent = useCallback(
    (updated: FlapReExplorationEvent) => {
      onUpdate({
        ...outcome,
        reExploration: {
          reExplored: true,
          events: events.map((e) => (e.id === updated.id ? updated : e)),
        },
      });
    },
    [outcome, events, onUpdate],
  );

  const removeEvent = useCallback(
    (id: string) => {
      const filtered = events.filter((e) => e.id !== id);
      onUpdate({
        ...outcome,
        reExploration: {
          reExplored: filtered.length > 0,
          events: filtered,
        },
      });
    },
    [outcome, events, onUpdate],
  );

  // ── Complication toggles ─────────────────────────────────────────────────
  const donorComplications = outcome.donorSiteComplications || [];
  const recipientComplications = outcome.recipientSiteComplications || [];

  const toggleDonorComplication = useCallback(
    (comp: DonorSiteComplication) => {
      const current = outcome.donorSiteComplications || [];
      const updated = current.includes(comp)
        ? current.filter((c) => c !== comp)
        : [...current, comp];
      onUpdate({ ...outcome, donorSiteComplications: updated });
    },
    [outcome, onUpdate],
  );

  const toggleRecipientComplication = useCallback(
    (comp: RecipientSiteComplication) => {
      const current = outcome.recipientSiteComplications || [];
      const updated = current.includes(comp)
        ? current.filter((c) => c !== comp)
        : [...current, comp];
      onUpdate({ ...outcome, recipientSiteComplications: updated });
    },
    [outcome, onUpdate],
  );

  return (
    <View style={styles.container}>
      <View style={styles.timingSection}>
        <DatePickerField
          label="Assessment Date"
          value={assessedDate}
          onChange={handleAssessedDateChange}
          placeholder="Select assessment date..."
          clearable
        />
        <FormField
          label="Assessment Day Post-op"
          value={
            outcome.assessedDaysPostOp !== undefined
              ? String(outcome.assessedDaysPostOp)
              : ""
          }
          onChangeText={handleAssessedDaysChange}
          placeholder="e.g., 7"
          keyboardType="number-pad"
        />
      </View>

      {/* Survival Status */}
      <SurvivalStatusControl
        value={outcome.flapSurvival}
        onSelect={handleSurvivalChange}
      />

      {/* Partial Loss Details */}
      {outcome.flapSurvival === "partial_loss" ? (
        <View style={styles.partialLossSection}>
          <FormField
            label="Loss Percentage"
            value={
              outcome.partialLossPercentage
                ? String(outcome.partialLossPercentage)
                : ""
            }
            onChangeText={(v) =>
              onUpdate({
                ...outcome,
                partialLossPercentage: v ? parseInt(v) : undefined,
              })
            }
            placeholder="e.g., 20"
            keyboardType="numeric"
            unit="%"
          />
          <View style={styles.selectField}>
            <ThemedText
              style={[styles.selectLabel, { color: theme.textSecondary }]}
            >
              Management
            </ThemedText>
            <View style={styles.selectOptions}>
              {Object.entries(PARTIAL_LOSS_MANAGEMENT_LABELS).map(
                ([value, label]) => {
                  const isActive = outcome.partialLossManagement === value;
                  return (
                    <Pressable
                      key={value}
                      style={[
                        styles.selectOption,
                        {
                          backgroundColor: isActive
                            ? theme.link + "20"
                            : theme.backgroundDefault,
                          borderColor: isActive ? theme.link : theme.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onUpdate({
                          ...outcome,
                          partialLossManagement: value as PartialLossManagement,
                        });
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.selectOptionText,
                          { color: isActive ? theme.link : theme.text },
                        ]}
                        numberOfLines={1}
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
      ) : null}

      {/* Monitoring Protocol */}
      <View style={styles.selectField}>
        <ThemedText
          style={[styles.selectLabel, { color: theme.textSecondary }]}
        >
          Monitoring Protocol
        </ThemedText>
        <View style={styles.selectOptions}>
          {monitoringOptions.map((opt) => {
            const isActive = outcome.monitoringProtocol === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.selectOption,
                  {
                    backgroundColor: isActive
                      ? theme.link + "20"
                      : theme.backgroundDefault,
                    borderColor: isActive ? theme.link : theme.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onUpdate({
                    ...outcome,
                    monitoringProtocol: opt.value as FlapMonitoringProtocolId,
                  });
                }}
              >
                <ThemedText
                  style={[
                    styles.selectOptionText,
                    { color: isActive ? theme.link : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Re-exploration */}
      <CollapsibleFormSection
        title="Re-exploration"
        subtitle="Return to theatre for flap assessment"
        filledCount={reExploration.reExplored ? events.length : 0}
        totalCount={reExploration.reExplored ? Math.max(events.length, 1) : 1}
        defaultExpanded={reExploration.reExplored}
      >
        <View style={styles.reExplorationContent}>
          <Pressable
            style={[
              styles.toggleRow,
              {
                backgroundColor: reExploration.reExplored
                  ? theme.warning + "15"
                  : theme.backgroundDefault,
                borderColor: reExploration.reExplored
                  ? theme.warning + "40"
                  : theme.border,
              },
            ]}
            onPress={toggleReExploration}
          >
            <View
              style={[
                styles.toggleCheckbox,
                {
                  backgroundColor: reExploration.reExplored
                    ? theme.warning + "20"
                    : theme.backgroundDefault,
                  borderColor: reExploration.reExplored
                    ? theme.warning
                    : theme.border,
                },
              ]}
            >
              {reExploration.reExplored ? (
                <Feather name="check" size={14} color={theme.warning} />
              ) : null}
            </View>
            <ThemedText style={[styles.toggleLabel, { color: theme.text }]}>
              Flap was re-explored
            </ThemedText>
          </Pressable>

          {reExploration.reExplored ? (
            <>
              {events.map((event, idx) => (
                <ReExplorationCard
                  key={event.id}
                  event={event}
                  index={idx}
                  onUpdate={updateEvent}
                  onRemove={() => removeEvent(event.id)}
                />
              ))}
              <Pressable
                style={[
                  styles.addButton,
                  {
                    backgroundColor: theme.link + "15",
                    borderColor: theme.link + "30",
                  },
                ]}
                onPress={addReExplorationEvent}
              >
                <Feather name="plus" size={16} color={theme.link} />
                <ThemedText
                  style={[styles.addButtonText, { color: theme.link }]}
                >
                  Add Re-exploration
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </View>
      </CollapsibleFormSection>

      {/* Complications */}
      <CollapsibleFormSection
        title="Complications"
        subtitle="Donor & recipient site"
        filledCount={
          (donorComplications.length > 0 ? 1 : 0) +
          (recipientComplications.length > 0 ? 1 : 0)
        }
        totalCount={2}
        defaultExpanded={
          donorComplications.length > 0 || recipientComplications.length > 0
        }
      >
        <View style={styles.complicationsContent}>
          <ComplicationChips
            label="Donor Site Complications"
            options={DONOR_SITE_COMPLICATION_LABELS}
            selected={donorComplications}
            onToggle={toggleDonorComplication}
          />

          <ComplicationChips
            label="Recipient Site Complications"
            options={RECIPIENT_SITE_COMPLICATION_LABELS}
            selected={recipientComplications}
            onToggle={toggleRecipientComplication}
          />
        </View>
      </CollapsibleFormSection>
    </View>
  );
}

// ── Summary generator for DetailModuleRow ─────────────────────────────────

export function generateFlapOutcomeSummary(
  outcome: FreeFlapOutcomeDetails | undefined,
): string | null {
  if (!outcome?.flapSurvival) return null;

  const parts: string[] = [FLAP_SURVIVAL_LABELS[outcome.flapSurvival]];

  if (
    outcome.flapSurvival === "partial_loss" &&
    outcome.partialLossPercentage
  ) {
    parts[0] += ` (${outcome.partialLossPercentage}%)`;
  }

  if (outcome.reExploration?.reExplored) {
    const count = outcome.reExploration.events?.length || 0;
    parts.push(`${count} re-exploration${count !== 1 ? "s" : ""}`);
  }

  const totalComps =
    (outcome.donorSiteComplications?.length || 0) +
    (outcome.recipientSiteComplications?.length || 0);
  if (totalComps > 0) {
    parts.push(`${totalComps} complication${totalComps !== 1 ? "s" : ""}`);
  }

  return parts.join(" · ");
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  timingSection: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  segmentedControl: {
    marginBottom: Spacing.xs,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentedButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  partialLossSection: {
    gap: Spacing.md,
  },
  selectField: {
    marginBottom: Spacing.xs,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  selectOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  selectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  selectOptionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  reExplorationContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  toggleCheckbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  reExplorationCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  reExplorationCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  reExplorationCardTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  complicationsContent: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  chipSection: {
    gap: Spacing.sm,
  },
  chipSectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
