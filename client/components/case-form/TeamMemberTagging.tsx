import React, { useCallback, useRef, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { SelectField } from "@/components/FormField";
import {
  useCaseFormDispatch,
  useCaseFormSelector,
  type CaseFormSnapshot,
} from "@/contexts/CaseFormContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { searchUserByEmail } from "@/lib/sharingApi";
import {
  OPERATIVE_ROLE_LABELS,
  type OperativeRole,
} from "@/types/operativeRole";
import type { UserSearchResult } from "@/types/sharing";

// ── Constants ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 500;

const ROLE_OPTIONS: { value: OperativeRole; label: string }[] = (
  Object.entries(OPERATIVE_ROLE_LABELS) as [OperativeRole, string][]
).map(([value, label]) => ({ value, label }));

type SearchStatus = "idle" | "searching" | "found" | "not_found" | "error";

// ── Component ────────────────────────────────────────────────────────────────

function TeamMemberTaggingInner() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const actions = useCaseFormDispatch();
  const teamMembers = useCaseFormSelector(
    (s: CaseFormSnapshot) => s.state.teamMembers,
  );

  const [email, setEmail] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [foundUser, setFoundUser] = useState<UserSearchResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<OperativeRole>("FIRST_ASST");
  const [errorMessage, setErrorMessage] = useState("");
  const [collapsed, setCollapsed] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      setFoundUser(null);
      setSearchStatus("idle");
      setErrorMessage("");

      if (debounceRef.current) clearTimeout(debounceRef.current);

      const trimmed = text.trim();
      if (!trimmed || !trimmed.includes("@")) return;

      debounceRef.current = setTimeout(async () => {
        setSearchStatus("searching");
        try {
          const result = await searchUserByEmail(trimmed);
          if (!result) {
            setSearchStatus("not_found");
            return;
          }
          if (result.id === user?.id) {
            setSearchStatus("error");
            setErrorMessage("Cannot add yourself");
            return;
          }
          if (teamMembers.some((m) => m.userId === result.id)) {
            setSearchStatus("error");
            setErrorMessage("Already added");
            return;
          }
          setFoundUser(result);
          setSearchStatus("found");
        } catch (err: any) {
          if (err?.message?.includes("429")) {
            setSearchStatus("error");
            setErrorMessage("Too many searches, please wait");
          } else {
            setSearchStatus("error");
            setErrorMessage("Search failed");
          }
        }
      }, DEBOUNCE_MS);
    },
    [user?.id, teamMembers],
  );

  const handleAdd = useCallback(() => {
    if (!foundUser) return;
    actions.dispatch({
      type: "ADD_TEAM_MEMBER",
      member: {
        userId: foundUser.id,
        displayName: foundUser.displayName,
        role: selectedRole,
        publicKeys: foundUser.publicKeys,
      },
    });
    setEmail("");
    setFoundUser(null);
    setSearchStatus("idle");
    setSelectedRole("FIRST_ASST");
  }, [foundUser, selectedRole, actions]);

  const handleRemove = useCallback(
    (userId: string) => {
      actions.dispatch({ type: "REMOVE_TEAM_MEMBER", userId });
    },
    [actions],
  );

  const memberCount = teamMembers.length;

  return (
    <>
      <Pressable
        style={styles.headerRow}
        onPress={() => setCollapsed((c) => !c)}
        testID="caseForm.operative.section-teamMembers"
      >
        <View style={styles.headerLeft}>
          <SectionHeader
            title="Team Members"
            subtitle={memberCount > 0 ? `${memberCount} tagged` : undefined}
          />
        </View>
        <Feather
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>

      {!collapsed && (
        <View style={styles.content}>
          {/* Email search input */}
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather
              name="search"
              size={16}
              color={theme.textTertiary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="Search by exact email..."
              placeholderTextColor={theme.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="caseForm.operative.input-teamEmail"
            />
            {searchStatus === "searching" && (
              <ActivityIndicator
                size="small"
                color={theme.textSecondary}
                style={styles.spinner}
              />
            )}
          </View>

          {/* Search result / status */}
          {searchStatus === "not_found" && (
            <ThemedText
              style={[styles.statusText, { color: theme.textSecondary }]}
            >
              Not on Opus yet
            </ThemedText>
          )}

          {searchStatus === "error" && (
            <ThemedText style={[styles.statusText, { color: theme.error }]}>
              {errorMessage}
            </ThemedText>
          )}

          {searchStatus === "found" && foundUser && (
            <View
              style={[
                styles.foundCard,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.foundInfo}>
                <ThemedText type="body" style={{ color: theme.text }}>
                  {foundUser.displayName}
                </ThemedText>
              </View>
              <View style={styles.foundActions}>
                <SelectField
                  label=""
                  value={selectedRole}
                  options={ROLE_OPTIONS}
                  onSelect={(v: string) => setSelectedRole(v as OperativeRole)}
                  testID="caseForm.operative.picker-teamRole"
                />
                <Pressable
                  style={[styles.addButton, { backgroundColor: theme.accent }]}
                  onPress={handleAdd}
                  testID="caseForm.operative.btn-addTeamMember"
                >
                  <ThemedText
                    type="small"
                    style={{ color: theme.buttonText, fontWeight: "600" }}
                  >
                    Add
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {/* Tagged members list */}
          {teamMembers.map((member) => (
            <View
              key={member.userId}
              style={[
                styles.memberRow,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.memberInfo}>
                <ThemedText type="body" style={{ color: theme.text }}>
                  {member.displayName}
                </ThemedText>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    {OPERATIVE_ROLE_LABELS[member.role as OperativeRole] ??
                      member.role}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                onPress={() => handleRemove(member.userId)}
                hitSlop={8}
                testID={`caseForm.operative.btn-removeTeamMember-${member.userId}`}
              >
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export const TeamMemberTagging = React.memo(TeamMemberTaggingInner);

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: Spacing.md,
    minHeight: 44,
  },
  headerLeft: {
    flex: 1,
  },
  content: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: 48,
  },
  spinner: {
    marginLeft: Spacing.xs,
  },
  statusText: {
    fontSize: 14,
    paddingVertical: Spacing.xs,
  },
  foundCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  foundInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  foundActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minHeight: 48,
  },
  memberInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
});
