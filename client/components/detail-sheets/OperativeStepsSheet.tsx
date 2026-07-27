/**
 * OperativeStepsSheet — editor for the optional per-procedure operative
 * step layer (free flap harvest / recipient prep / micro + inset) with a
 * per-step team grid (You + every tagged operativeTeam member), per-step
 * roles, and a two-team concurrency marker.
 *
 * Mounted on demand (like FreeFlapSheet): the parent renders it only while
 * a procedure's steps are being edited, so draft state initialises from
 * props once per open. Zero-tap for simple cases — the sheet is only
 * reachable from the Clinical Details hub row / footer "Edit steps" link.
 */

import React, { useState, useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet, TextInput } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { DetailModuleSheet } from "@/components/detail-sheets/DetailModuleSheet";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useCaseFormField } from "@/contexts/CaseFormContext";
import {
  TEAM_MEMBER_ROLE_LABELS,
  type TeamMemberOperativeRole,
} from "@/types/teamContacts";
import {
  SELF_PARTICIPANT_ID,
  buildFreeFlapStepTemplate,
  buildCustomStep,
  ownerOperativeRoleToTeamRole,
  renumberSteps,
  type OperativeStep,
  type StepTeamAssignment,
} from "@/types/operativeSteps";

const ROLE_OPTIONS: TeamMemberOperativeRole[] = ["PS", "FA", "SS", "US", "SA"];

interface ParticipantCandidate {
  id: string;
  label: string;
  defaultRole: TeamMemberOperativeRole;
}

interface OperativeStepsSheetProps {
  visible: boolean;
  procedureName: string;
  isFreeFlap: boolean;
  initialSteps?: OperativeStep[];
  onClose: () => void;
  onSave: (steps: OperativeStep[]) => void;
}

export function OperativeStepsSheet({
  visible,
  procedureName,
  isFreeFlap,
  initialSteps,
  onClose,
  onSave,
}: OperativeStepsSheetProps) {
  const { theme } = useTheme();
  const operativeTeam = useCaseFormField("operativeTeam");
  const defaultOperativeRole = useCaseFormField("defaultOperativeRole");

  const candidates = useMemo<ParticipantCandidate[]>(
    () => [
      {
        id: SELF_PARTICIPANT_ID,
        label: "You",
        defaultRole: ownerOperativeRoleToTeamRole(
          defaultOperativeRole || undefined,
        ),
      },
      ...(operativeTeam ?? []).map((m) => ({
        id: m.contactId,
        label: m.abbreviatedName || m.displayName,
        defaultRole: m.operativeRole,
      })),
    ],
    [operativeTeam, defaultOperativeRole],
  );

  const defaultTeam = useMemo<StepTeamAssignment[]>(
    () => candidates.map((c) => ({ participantId: c.id, role: c.defaultRole })),
    [candidates],
  );

  const [draft, setDraft] = useState<OperativeStep[]>(
    () => initialSteps?.map((s) => ({ ...s, team: [...s.team] })) ?? [],
  );

  const handleSeedTemplate = useCallback(() => {
    setDraft(buildFreeFlapStepTemplate(defaultTeam));
  }, [defaultTeam]);

  const handleAddStep = useCallback(() => {
    setDraft((prev) => [...prev, buildCustomStep(prev.length, defaultTeam)]);
  }, [defaultTeam]);

  const handleDeleteStep = useCallback((stepId: string) => {
    setDraft((prev) => prev.filter((s) => s.id !== stepId));
  }, []);

  const handleMoveStep = useCallback((stepId: string, delta: -1 | 1) => {
    setDraft((prev) => {
      const idx = prev.findIndex((s) => s.id === stepId);
      const target = idx + delta;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved!);
      return next;
    });
  }, []);

  const handleLabelChange = useCallback((stepId: string, label: string) => {
    setDraft((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, label } : s)),
    );
  }, []);

  const handleToggleConcurrent = useCallback((stepId: string) => {
    setDraft((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, concurrentWithPrevious: !s.concurrentWithPrevious }
          : s,
      ),
    );
  }, []);

  const handleTogglePresence = useCallback(
    (
      stepId: string,
      participantId: string,
      defaultRole: TeamMemberOperativeRole,
    ) => {
      setDraft((prev) =>
        prev.map((s) => {
          if (s.id !== stepId) return s;
          const existing = s.team.find(
            (a) => a.participantId === participantId,
          );
          return {
            ...s,
            team: existing
              ? s.team.filter((a) => a.participantId !== participantId)
              : [...s.team, { participantId, role: defaultRole }],
          };
        }),
      );
    },
    [],
  );

  const handleRoleChange = useCallback(
    (stepId: string, participantId: string, role: TeamMemberOperativeRole) => {
      setDraft((prev) =>
        prev.map((s) =>
          s.id === stepId
            ? {
                ...s,
                team: s.team.map((a) =>
                  a.participantId === participantId ? { ...a, role } : a,
                ),
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleSave = useCallback(() => {
    const cleaned = renumberSteps(draft).map((s, idx) => ({
      ...s,
      label: s.label.trim() || `Step ${idx + 1}`,
      // A first step can't be concurrent with a previous one.
      concurrentWithPrevious:
        idx === 0 ? undefined : s.concurrentWithPrevious || undefined,
    }));
    onSave(cleaned);
  }, [draft, onSave]);

  return (
    <DetailModuleSheet
      visible={visible}
      title="Operative steps & team"
      subtitle={procedureName}
      onSave={handleSave}
      onCancel={onClose}
      testID="sheet-operative-steps"
    >
      {draft.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
            },
          ]}
        >
          {isFreeFlap ? (
            <>
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                Suggested steps for a free flap
              </ThemedText>
              <ThemedText
                style={[styles.emptyBody, { color: theme.textSecondary }]}
              >
                1. Free flap harvest{"\n"}2. Recipient vessel prep ± debridement
                {"\n"}3. Microsurgery & inset
              </ThemedText>
              <ThemedText
                style={[styles.emptyHint, { color: theme.textTertiary }]}
              >
                Everyone tagged on the case starts present on every step with
                their case role — untick and adjust per step.
              </ThemedText>
              <Pressable
                style={[styles.seedButton, { backgroundColor: theme.link }]}
                onPress={handleSeedTemplate}
                accessibilityRole="button"
                accessibilityLabel="Add these steps"
                testID="caseForm.steps.btn-seed"
              >
                <ThemedText
                  style={[styles.seedButtonText, { color: theme.buttonText }]}
                >
                  Add these steps
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <ThemedText
              style={[styles.emptyBody, { color: theme.textSecondary }]}
            >
              Break this procedure into operative steps to record who did what —
              including two teams working at the same time.
            </ThemedText>
          )}
        </View>
      ) : (
        draft.map((step, stepIdx) => (
          <View
            key={step.id}
            style={[
              styles.stepCard,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Header: label + reorder + delete */}
            <View style={styles.stepHeader}>
              <View
                style={[
                  styles.stepOrderBadge,
                  { backgroundColor: theme.accentSurface },
                ]}
              >
                <ThemedText
                  style={[styles.stepOrderText, { color: theme.link }]}
                >
                  {stepIdx + 1}
                </ThemedText>
              </View>
              <TextInput
                style={[
                  styles.labelInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundDefault,
                  },
                ]}
                value={step.label}
                onChangeText={(text) => handleLabelChange(step.id, text)}
                placeholder={`Step ${stepIdx + 1}`}
                placeholderTextColor={theme.textTertiary}
                testID={`caseForm.steps.input-label-${step.id}`}
                accessibilityLabel={`Step ${stepIdx + 1} label`}
              />
              {stepIdx > 0 ? (
                <Pressable
                  onPress={() => handleMoveStep(step.id, -1)}
                  hitSlop={8}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Move step up"
                  testID={`caseForm.steps.btn-up-${step.id}`}
                >
                  <Feather
                    name="chevron-up"
                    size={16}
                    color={theme.textSecondary}
                  />
                </Pressable>
              ) : null}
              {stepIdx < draft.length - 1 ? (
                <Pressable
                  onPress={() => handleMoveStep(step.id, 1)}
                  hitSlop={8}
                  style={styles.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Move step down"
                  testID={`caseForm.steps.btn-down-${step.id}`}
                >
                  <Feather
                    name="chevron-down"
                    size={16}
                    color={theme.textSecondary}
                  />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => handleDeleteStep(step.id)}
                hitSlop={8}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Delete step"
                testID={`caseForm.steps.btn-delete-${step.id}`}
              >
                <Feather name="x" size={16} color={theme.error} />
              </Pressable>
            </View>

            {/* Concurrency toggle (not for the first step) */}
            {stepIdx > 0 ? (
              <Pressable
                style={styles.concurrentRow}
                onPress={() => handleToggleConcurrent(step.id)}
                accessibilityRole="switch"
                accessibilityLabel="Concurrent with previous step"
                accessibilityState={{
                  checked: step.concurrentWithPrevious === true,
                }}
                testID={`caseForm.steps.toggle-concurrent-${step.id}`}
              >
                <Feather
                  name={step.concurrentWithPrevious ? "check-square" : "square"}
                  size={16}
                  color={
                    step.concurrentWithPrevious
                      ? theme.link
                      : theme.textTertiary
                  }
                />
                <ThemedText
                  style={[
                    styles.concurrentLabel,
                    {
                      color: step.concurrentWithPrevious
                        ? theme.link
                        : theme.textSecondary,
                    },
                  ]}
                >
                  ∥ Concurrent with previous step (two teams)
                </ThemedText>
              </Pressable>
            ) : null}

            {/* Team grid */}
            {candidates.map((candidate) => {
              const assignment = step.team.find(
                (a) => a.participantId === candidate.id,
              );
              const isPresent = assignment != null;
              return (
                <View
                  key={candidate.id}
                  style={[styles.memberRow, { borderTopColor: theme.border }]}
                >
                  <Pressable
                    style={styles.memberNameRow}
                    onPress={() =>
                      handleTogglePresence(
                        step.id,
                        candidate.id,
                        candidate.defaultRole,
                      )
                    }
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${candidate.label} present on ${step.label || `step ${stepIdx + 1}`}`}
                    accessibilityState={{ checked: isPresent }}
                    testID={`caseForm.steps.toggle-present-${step.id}-${candidate.id}`}
                  >
                    <Feather
                      name={isPresent ? "check-square" : "square"}
                      size={16}
                      color={isPresent ? theme.link : theme.textTertiary}
                    />
                    <ThemedText
                      style={[
                        styles.memberName,
                        {
                          color: isPresent ? theme.text : theme.textTertiary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {candidate.label}
                    </ThemedText>
                  </Pressable>
                  {isPresent ? (
                    <View style={styles.roleChips}>
                      {ROLE_OPTIONS.map((role) => {
                        const isSelected = assignment.role === role;
                        return (
                          <Pressable
                            key={role}
                            onPress={() =>
                              handleRoleChange(step.id, candidate.id, role)
                            }
                            style={[
                              styles.roleChip,
                              {
                                backgroundColor: isSelected
                                  ? theme.accentSurface
                                  : theme.backgroundSecondary,
                                borderColor: isSelected
                                  ? theme.link
                                  : theme.border,
                              },
                            ]}
                            accessibilityRole="radio"
                            accessibilityLabel={`${candidate.label}: ${TEAM_MEMBER_ROLE_LABELS[role]}`}
                            accessibilityState={{ selected: isSelected }}
                            testID={`caseForm.steps.chip-role-${step.id}-${candidate.id}-${role}`}
                          >
                            <ThemedText
                              style={[
                                styles.roleChipText,
                                {
                                  color: isSelected
                                    ? theme.link
                                    : theme.textSecondary,
                                },
                              ]}
                            >
                              {role}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))
      )}

      {/* Add step */}
      <Pressable
        style={[styles.addStepButton, { borderColor: theme.border }]}
        onPress={handleAddStep}
        accessibilityRole="button"
        accessibilityLabel="Add step"
        testID="caseForm.steps.btn-addStep"
      >
        <Feather name="plus" size={16} color={theme.link} />
        <ThemedText style={[styles.addStepText, { color: theme.link }]}>
          Add step
        </ThemedText>
      </Pressable>

      {/* Role legend */}
      <ThemedText style={[styles.legend, { color: theme.textTertiary }]}>
        {ROLE_OPTIONS.map((r) => `${r} = ${TEAM_MEMBER_ROLE_LABELS[r]}`).join(
          " · ",
        )}
      </ThemedText>
    </DetailModuleSheet>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  emptyHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  seedButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  seedButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  stepCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stepOrderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepOrderText: {
    fontSize: 12,
    fontWeight: "700",
  },
  labelInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 14,
    minHeight: 40,
  },
  iconBtn: {
    padding: 6,
    minWidth: 28,
    alignItems: "center",
  },
  concurrentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  concurrentLabel: {
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },
  memberRow: {
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xs,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 28,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  roleChips: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginLeft: 28,
    marginTop: Spacing.xs,
  },
  roleChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    minWidth: 40,
    alignItems: "center",
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  addStepButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: BorderRadius.sm,
    minHeight: 48,
    marginBottom: Spacing.md,
  },
  addStepText: {
    fontSize: 14,
    fontWeight: "600",
  },
  legend: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
});
