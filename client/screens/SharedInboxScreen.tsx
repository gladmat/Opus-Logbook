import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { DashboardCaseCard } from "@/components/dashboard/CaseCard";
import { getSharedCaseSummaries, syncSharedCases } from "@/lib/sharedCaseSync";
import type { SharedCaseSummary } from "@/lib/sharedCaseSummary";
import { sortCasesByProcedureDateDesc } from "@/lib/dashboardSelectors";
import { ensurePushPermissionsWithPrompt } from "@/lib/pushPermissions";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * "See all" for cases shared WITH the viewer, and the landing screen for
 * verification pushes. Since 2.25.0 shared cases live on the dashboard
 * (merged into Recent Cases with a "Shared with me" filter); this screen
 * renders the same cards over the full list.
 */
export default function SharedInboxScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [summaries, setSummaries] = useState<SharedCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOffline = useCallback(async () => {
    try {
      const local = await getSharedCaseSummaries();
      setSummaries(sortCasesByProcedureDateDesc(local));
    } catch (error) {
      console.error("Error loading shared cases:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sync = useCallback(async () => {
    try {
      const result = await syncSharedCases();
      setSummaries(sortCasesByProcedureDateDesc(result.summaries));
      // Colleagues are sharing with this user — the moment push value is
      // self-evident. One-shot contextual permission pre-prompt.
      if (result.summaries.length > 0) {
        void ensurePushPermissionsWithPrompt("shared-inbox");
      }
    } catch {
      // Offline — the cached list stays.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await loadOffline();
        if (!cancelled) await sync();
      })();
      return () => {
        cancelled = true;
      };
    }, [loadOffline, sync]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await sync();
    setRefreshing(false);
  };

  const handleCardPress = useCallback(
    (summary: SharedCaseSummary) => {
      navigation.navigate("SharedCaseDetail", {
        sharedCaseId: summary.shared.sharedCaseId,
      });
    },
    [navigation],
  );

  if (loading) {
    return (
      <View
        testID="screen-sharedInbox"
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (summaries.length === 0) {
    return (
      <View
        testID="screen-sharedInbox"
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <Feather
          name="users"
          size={48}
          color={theme.textTertiary}
          style={styles.emptyIcon}
        />
        <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
          No shared cases yet
        </ThemedText>
        <ThemedText
          style={[styles.emptySubtitle, { color: theme.textSecondary }]}
        >
          When a colleague tags you on a case, it appears on your dashboard and
          here.
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      testID="screen-sharedInbox"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <FlatList
        data={summaries}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View>
            <DashboardCaseCard
              caseData={item}
              onPress={() => handleCardPress(item)}
            />
            {index < summaries.length - 1 ? (
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
            ) : null}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.link}
          />
        }
      />
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
    paddingHorizontal: Spacing.xl,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  divider: {
    height: 1,
    marginLeft: 80,
    marginRight: Spacing.lg,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
