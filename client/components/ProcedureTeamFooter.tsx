/**
 * Compact team footer shown below each procedure entry card.
 * Shows which team members participated in this procedure with their roles.
 * Tappable to expand for per-procedure role overrides and presence toggles.
 */

import React, { useState, useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet, LayoutAnimation } from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  useCaseFormField,
  useCaseFormDispatch,
} from "@/contexts/CaseFormContext";
import {
  TEAM_MEMBER_ROLE_SHORT,
  TEAM_MEMBER_ROLE_LABELS,
  type CaseTeamMember,
  type TeamMemberOperativeRole,
} from "@/types/teamContacts";

const ROLE_OPTIONS: TeamMemberOperativeRole[] = ["PS", "FA", "SS", "US", "SA"];

interface ProcedureTeamFooterProps {
  procedureIndex: number;
}

export const ProcedureTeamFooter = React.memo(function ProcedureTeamFooter({
  procedureIndex,
}: ProcedureTeamFooterProps) {
  const { theme } = useTheme();
  const operativeTeam = useCaseFormField("operativeTeam");
  const { dispatch } = useCaseFormDispatch();
  const [expanded, setExpanded] = useState(false);

  // Members present for this procedure
  const presentMembers = useMemo(() => {
    if (!operativeTeam || operativeTeam.length === 0) return [];
    return operativeTeam.filter(
      (m) =>
        m.presentForProcedures === null ||
        m.presentForProcedures === undefined ||
        m.presentForProcedures.includes(procedureIndex),
    );
  }, [operativeTeam, procedureIndex]);

  const resolveRole = useCallback(
    (member: CaseTeamMember): TeamMemberOperativeRole => {
      return (
        member.procedureRoleOverrides?.[procedureIndex] ?? member.operativeRole
      );
    },
    [procedureIndex],
  );

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const handleRoleChange = useCallback(
    (contactId: string, role: TeamMemberOperativeRole) => {
      dispatch({
        type: "SET_PROCEDURE_ROLE_OVERRIDE",
        contactId,
        procedureIndex,
        role,
      });
    },
    [dispatch, procedureIndex],
  );

  const handleTogglePresence = useCallback(
    (contactId: string) => {
      dispatch({
        type: "TOGGLE_MEMBER_PROCEDURE_PRESENCE",
        contactId,
        procedureIndex,
      });
    },
    [dispatch, procedureIndex],
  );

  if (!operativeTeam || operativeTeam.length === 0) return null;

  // Compact summary line
  const summaryParts = presentMembers.map((m) => {
    const role = TEAM_MEMBER_ROLE_SHORT[resolveRole(m)];
    return `${m.abbreviatedName} (${role})`;
  });
  const absentCount = operativeTeam.length - presentMembers.length;

  return (
    <View style={[styles.container, { borderTopColor: theme.border }]}>
      <Pressable
        style={styles.summaryRow}
        onPress={handleToggleExpand}
        hitSlop={8}
      >
        <Feather
          name="users"
          size={12}
          color={theme.textTertiary}
          style={styles.icon}
        />
        <ThemedText
          style={[styles.summaryText, { color: theme.textTertiary }]}
          numberOfLines={1}
        >
          {presentMembers.length > 0
            ? summaryParts.join(" · ")
            : "No team members for this procedure"}
          {absentCount > 0 ? ` (+${absentCount} not present)` : ""}
        </ThemedText>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={theme.textTertiary}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.expandedContent}>
          {operativeTeam.map((member) => {
            const isPresent =
              member.presentForProcedures === null ||
              member.presentForProcedures === undefined ||
              member.presentForProcedures.includes(procedureIndex);
            const currentRole = resolveRole(member);
            const hasOverride =
              member.procedureRoleOverrides?.[procedureIndex] != null;

            return (
              <View
                key={member.contactId}
                style={[styles.memberRow, { borderBottomColor: theme.border }]}
              >
                <View style={styles.memberNameRow}>
                  <Pressable
                    onPress={() => handleTogglePresence(member.contactId)}
                    hitSlop={8}
                    style={styles.presenceToggle}
                  >
                    <Feather
                      name={isPresent ? "check-square" : "square"}
                      size={16}
                      color={isPresent ? theme.link : theme.textTertiary}
                    />
                  </Pressable>
                  <ThemedText
                    style={[
                      styles.memberName,
                      {
                        color: isPresent ? theme.text : theme.textTertiary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {member.abbreviatedName}
                  </ThemedText>
                  {hasOverride ? (
                    <ThemedText
                      style={[styles.overrideBadge, { color: theme.link }]}
                    >
                      override
                    </ThemedText>
                  ) : null}
                </View>

                {isPresent ? (
                  <View style={styles.roleChips}>
                    {ROLE_OPTIONS.map((role) => {
                      const isSelected = currentRole === role;
                      return (
                        <Pressable
                          key={role}
                          onPress={() =>
                            handleRoleChange(member.contactId, role)
                          }
                          style={[
                            styles.roleChip,
                            {
                              backgroundColor: isSelected
                                ? theme.link + "18"
                                : theme.backgroundSecondary,
                              borderColor: isSelected
                                ? theme.link
                                : theme.border,
                            },
                          ]}
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
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 32,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  expandedContent: {
    paddingTop: Spacing.xs,
  },
  memberRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  presenceToggle: {
    marginRight: Spacing.sm,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  overrideBadge: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roleChips: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginLeft: 28, // align with name (past checkbox)
  },
  roleChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
