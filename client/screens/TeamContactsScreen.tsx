import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { getTeamContacts, linkContact } from "@/lib/teamContactsApi";
import { getCareerStageLabel } from "@shared/careerStages";
import type { TeamContact } from "@/types/teamContacts";
import {
  TEAM_MEMBER_ROLE_SHORT,
  type TeamMemberOperativeRole,
} from "@/types/teamContacts";
import {
  getDiscoveryMatches,
  removeDiscoveryMatch,
} from "@/lib/discoveryService";
import type { DiscoverMatch } from "@/lib/teamContactsApi";

type Section = { title: string; data: TeamContact[] };

export default function TeamContactsScreen() {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { facilities } = useAuth();

  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discoveryMatches, setDiscoveryMatches] = useState<DiscoverMatch[]>([]);

  const loadContacts = useCallback(async () => {
    try {
      const [data, matches] = await Promise.all([
        getTeamContacts(),
        getDiscoveryMatches(),
      ]);
      setContacts(data);
      setDiscoveryMatches(matches);
    } catch {
      // Silently fail — empty list shown
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /** Map contactId → DiscoverMatch for quick lookup */
  const matchByContactId = useMemo(() => {
    const map = new Map<string, DiscoverMatch>();
    for (const m of discoveryMatches) {
      map.set(m.contactId, m);
    }
    return map;
  }, [discoveryMatches]);

  const handleLinkContact = useCallback(
    async (contact: TeamContact, match: DiscoverMatch) => {
      try {
        await linkContact(contact.id, match.userId);
        await removeDiscoveryMatch(contact.id);
        // Refresh list to show updated linked state
        loadContacts();
        Alert.alert(
          "Contact Linked",
          `${contact.displayName} is now linked to their Opus account.`,
        );
      } catch (error) {
        Alert.alert(
          "Link Failed",
          error instanceof Error
            ? error.message
            : "Failed to link contact.",
        );
      }
    },
    [loadContacts],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadContacts();
    }, [loadContacts]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadContacts();
  }, [loadContacts]);

  const sections = useMemo<Section[]>(() => {
    const facilityMap = new Map<string, string>();
    for (const f of facilities) {
      facilityMap.set(f.id, f.facilityName);
    }

    const grouped = new Map<string, TeamContact[]>();
    const ungrouped: TeamContact[] = [];

    for (const contact of contacts) {
      if (
        !contact.facilityIds ||
        (contact.facilityIds as string[]).length === 0
      ) {
        ungrouped.push(contact);
        continue;
      }
      // Add to first matching facility section
      let placed = false;
      for (const fId of contact.facilityIds as string[]) {
        const name = facilityMap.get(fId);
        if (name) {
          const existing = grouped.get(name) ?? [];
          existing.push(contact);
          grouped.set(name, existing);
          placed = true;
          break;
        }
      }
      if (!placed) ungrouped.push(contact);
    }

    const result: Section[] = [];
    for (const [title, data] of grouped) {
      result.push({ title, data });
    }
    if (ungrouped.length > 0) {
      result.push({ title: "Ungrouped", data: ungrouped });
    }
    return result;
  }, [contacts, facilities]);

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={theme.link} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      testID="screen-teamContacts"
    >
      {/* Discovery badge */}
      {discoveryMatches.length > 0 && (
        <View
          style={[
            styles.discoveryBanner,
            {
              backgroundColor: theme.link + "15",
              borderColor: theme.link + "30",
            },
          ]}
        >
          <Feather name="user-plus" size={16} color={theme.link} />
          <ThemedText style={[styles.discoveryText, { color: theme.link }]}>
            {discoveryMatches.length} colleague
            {discoveryMatches.length !== 1 ? "s" : ""} found on Opus
          </ThemedText>
        </View>
      )}

      {contacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather
            name="users"
            size={48}
            color={theme.textTertiary}
          />
          <ThemedText
            style={[styles.emptyTitle, { color: theme.text }]}
          >
            No team members yet
          </ThemedText>
          <ThemedText
            style={[styles.emptySubtitle, { color: theme.textSecondary }]}
          >
            Add colleagues to quickly tag them on cases.
          </ThemedText>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.link}
            />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View
              style={[
                styles.sectionHeader,
                { backgroundColor: theme.backgroundRoot },
              ]}
            >
              <ThemedText
                style={[styles.sectionTitle, { color: theme.textSecondary }]}
              >
                {title.toUpperCase()}
              </ThemedText>
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.contactRow,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                },
              ]}
              onPress={() =>
                navigation.navigate("AddEditTeamContact", {
                  contactId: item.id,
                })
              }
              testID={`teamContacts.row-${item.id}`}
            >
              <View style={styles.contactInfo}>
                <View style={styles.nameRow}>
                  <ThemedText style={[styles.contactName, { color: theme.text }]}>
                    {item.displayName}
                  </ThemedText>
                  {item.linkedUserId && (
                    <Feather
                      name="link"
                      size={14}
                      color={theme.success}
                      style={{ marginLeft: Spacing.xs }}
                    />
                  )}
                </View>
                {item.careerStage && (
                  <ThemedText
                    style={[
                      styles.contactDetail,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {getCareerStageLabel(item.careerStage)}
                  </ThemedText>
                )}
              </View>
              {/* Discovery "Link" button for matched unlinked contacts */}
              {!item.linkedUserId && matchByContactId.has(item.id) && (
                <Pressable
                  style={[
                    styles.linkButton,
                    { backgroundColor: theme.link },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    const match = matchByContactId.get(item.id)!;
                    handleLinkContact(item, match);
                  }}
                  testID={`teamContacts.btn-link-${item.id}`}
                >
                  <ThemedText
                    style={[
                      styles.linkButtonText,
                      { color: theme.buttonText },
                    ]}
                  >
                    Link
                  </ThemedText>
                </Pressable>
              )}
              {item.defaultRole && (
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: theme.link + "15",
                      borderColor: theme.link + "30",
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.roleBadgeText, { color: theme.link }]}
                  >
                    {
                      TEAM_MEMBER_ROLE_SHORT[
                        item.defaultRole as TeamMemberOperativeRole
                      ] ?? item.defaultRole
                    }
                  </ThemedText>
                </View>
              )}
              <Feather
                name="chevron-right"
                size={18}
                color={theme.textTertiary}
              />
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Pressable
        style={[styles.fab, { backgroundColor: theme.link }]}
        onPress={() => navigation.navigate("AddEditTeamContact")}
        testID="teamContacts.btn-add"
      >
        <Feather name="plus" size={24} color={theme.buttonText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  contactInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
  },
  contactDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  discoveryBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  discoveryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  linkButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
    marginRight: Spacing.sm,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
