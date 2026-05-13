import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import * as Haptics from "expo-haptics";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { CollapsibleFormSection } from "@/components/case-form/CollapsibleFormSection";
import {
  useCaseFormDispatch,
  useCaseFormField,
  useCaseFormSelector,
  type CaseFormSnapshot,
} from "@/contexts/CaseFormContext";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getTeamContacts } from "@/lib/teamContactsApi";
import {
  abbreviateName,
  TEAM_MEMBER_ROLE_LABELS,
  TEAM_MEMBER_ROLE_SHORT,
  type TeamMemberOperativeRole,
  type TeamContact,
} from "@/types/teamContacts";

// ── Constants ──────────────────────────────────────────────────────────────

const ALL_ROLES: TeamMemberOperativeRole[] = ["PS", "FA", "SS", "US", "SA"];

// ── Component ──────────────────────────────────────────────────────────────

function TeamSectionInner() {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const actions = useCaseFormDispatch();
  const { facilities } = useAuth();

  const facility = useCaseFormField("facility");
  const operativeTeam = useCaseFormSelector(
    (s: CaseFormSnapshot) => s.state.operativeTeam,
  );

  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  const facilityName = useMemo(() => {
    if (!facility) return "";
    const found = facilities.find((f) => f.facilityName === facility);
    return found?.facilityName ?? facility;
  }, [facility, facilities]);

  // Load contacts when facility changes
  useEffect(() => {
    if (!facility) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const all = await getTeamContacts();
        if (cancelled) return;
        // Filter contacts for the current facility
        const facilityId = facilities.find(
          (f) => f.facilityName === facility,
        )?.id;
        if (facilityId) {
          setContacts(
            all.filter(
              (c) =>
                !c.facilityIds ||
                (c.facilityIds as string[]).length === 0 ||
                (c.facilityIds as string[]).includes(facilityId),
            ),
          );
        } else {
          // No matching facility ID — show all contacts
          setContacts(all);
        }
      } catch {
        setContacts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facility, facilities]);

  const selectedIds = useMemo(
    () => new Set(operativeTeam.map((m) => m.contactId)),
    [operativeTeam],
  );

  const selectedCount = operativeTeam.length;

  const handleToggle = useCallback(
    (contact: TeamContact) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      actions.dispatch({ type: "TOGGLE_OPERATIVE_TEAM", contact });
      setExpandedRoleId(null);
    },
    [actions],
  );

  const handleRoleTap = useCallback((contactId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedRoleId((prev) => (prev === contactId ? null : contactId));
  }, []);

  const handleRoleSelect = useCallback(
    (contactId: string, role: TeamMemberOperativeRole) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      actions.dispatch({
        type: "SET_OPERATIVE_TEAM_ROLE",
        contactId,
        role,
      });
      setExpandedRoleId(null);
    },
    [actions],
  );

  // No facility selected
  if (!facility) {
    return (
      <CollapsibleFormSection
        title="Operative Team"
        filledCount={0}
        totalCount={0}
        defaultExpanded
      >
        <View style={styles.emptyState}>
          <Feather name="map-pin" size={24} color={theme.textTertiary} />
          <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
            Select a facility in Patient Details to see your operative team.
          </ThemedText>
        </View>
      </CollapsibleFormSection>
    );
  }

  // Facility selected but no contacts
  if (contacts.length === 0) {
    return (
      <CollapsibleFormSection
        title="Operative Team"
        filledCount={0}
        totalCount={0}
        defaultExpanded
      >
        <View style={styles.emptyState}>
          <Feather name="users" size={24} color={theme.textTertiary} />
          <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>
            No team members at {facilityName}.
          </ThemedText>
          <Pressable
            onPress={() => navigation.navigate("TeamContacts")}
            testID="caseForm.team.btn-goToSettings"
          >
            <ThemedText style={[styles.linkText, { color: theme.link }]}>
              Add team members in Settings
            </ThemedText>
          </Pressable>
        </View>
      </CollapsibleFormSection>
    );
  }

  return (
    <CollapsibleFormSection
      title="Operative Team"
      subtitle={selectedCount > 0 ? `${selectedCount} present` : undefined}
      filledCount={selectedCount}
      totalCount={contacts.length}
      defaultExpanded
      testID="caseForm.section-team"
    >
      <View style={styles.chipContainer}>
        {contacts.map((contact) => {
          const isSelected = selectedIds.has(contact.id);
          const member = operativeTeam.find((m) => m.contactId === contact.id);
          const isRoleExpanded = expandedRoleId === contact.id;

          return (
            <View key={contact.id} style={styles.chipWrapper}>
              <Pressable
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? theme.link + "15"
                      : theme.backgroundElevated,
                    borderColor: isSelected ? theme.link : theme.border,
                  },
                ]}
                onPress={() => handleToggle(contact)}
                testID={`caseForm.team.chip-${contact.id}`}
                accessibilityRole="checkbox"
                accessibilityLabel={`${contact.firstName} ${contact.lastName}`}
                accessibilityState={{ checked: isSelected }}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? theme.link : theme.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {abbreviateName(contact.firstName, contact.lastName)}
                </ThemedText>
              </Pressable>

              {/* Role badge below selected chip */}
              {isSelected && member && (
                <Pressable
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                  onPress={() => handleRoleTap(contact.id)}
                  testID={`caseForm.team.badge-role-${contact.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${abbreviateName(contact.firstName, contact.lastName)} role: ${TEAM_MEMBER_ROLE_SHORT[member.operativeRole]}. Tap to change.`}
                  accessibilityState={{ expanded: isRoleExpanded }}
                >
                  <ThemedText
                    style={[
                      styles.roleBadgeText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {TEAM_MEMBER_ROLE_SHORT[member.operativeRole]}
                  </ThemedText>
                </Pressable>
              )}

              {/* Inline role picker + legend (P2.5 — abbreviations are
                  jargon for trainees, so spell out the active one) */}
              {isSelected && isRoleExpanded && (
                <View style={styles.rolePickerContainer}>
                  <View
                    style={styles.rolePickerRow}
                    accessibilityRole="radiogroup"
                    accessibilityLabel={`Role for ${contact.firstName} ${contact.lastName}`}
                  >
                    {ALL_ROLES.map((role) => {
                      const isActive = member?.operativeRole === role;
                      return (
                        <Pressable
                          key={role}
                          style={[
                            styles.rolePickerChip,
                            {
                              backgroundColor: isActive
                                ? theme.link
                                : theme.backgroundElevated,
                              borderColor: isActive ? theme.link : theme.border,
                            },
                          ]}
                          onPress={() => handleRoleSelect(contact.id, role)}
                          testID={`caseForm.team.rolePick-${contact.id}-${role}`}
                          accessibilityRole="radio"
                          accessibilityLabel={`${role} — ${TEAM_MEMBER_ROLE_LABELS[role]}`}
                          accessibilityState={{ selected: isActive }}
                        >
                          <ThemedText
                            style={[
                              styles.rolePickerText,
                              {
                                color: isActive ? theme.buttonText : theme.text,
                              },
                            ]}
                          >
                            {role}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {member ? (
                    <ThemedText
                      style={[
                        styles.roleLegendText,
                        { color: theme.textTertiary },
                      ]}
                    >
                      {TEAM_MEMBER_ROLE_LABELS[member.operativeRole]}
                    </ThemedText>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}

        {/* Quick-add chip */}
        <View style={styles.chipWrapper}>
          <Pressable
            style={[
              styles.chip,
              styles.addChip,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
                borderStyle: "dashed",
              },
            ]}
            onPress={() => navigation.navigate("AddEditTeamContact")}
            testID="caseForm.team.btn-addContact"
          >
            <Feather name="plus" size={16} color={theme.textTertiary} />
          </Pressable>
        </View>
      </View>
    </CollapsibleFormSection>
  );
}

export const TeamSection = React.memo(TeamSectionInner);

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  chipWrapper: {
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  addChip: {
    paddingHorizontal: Spacing.sm,
    minWidth: 44,
    alignItems: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  roleBadge: {
    marginTop: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    minWidth: 28,
    alignItems: "center",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  rolePickerContainer: {
    marginTop: 4,
    gap: 6,
  },
  rolePickerRow: {
    flexDirection: "row",
    gap: 4,
  },
  roleLegendText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  rolePickerChip: {
    // Was 6×4 padding / minWidth 30 (~28pt tall, ~30pt wide). Bumped to
    // meet the 44pt HIG minimum on a clinical attribution field where
    // accuracy matters more than chip density (audit P2.7).
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rolePickerText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
