import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { SharedCaseInboxEntry } from "@/types/sharing";
import { getSharedInbox } from "@/lib/sharingApi";
import { updateSharedInboxIndex } from "@/lib/sharingStorage";
import { getMyAssessment, getRevealedPair } from "@/lib/assessmentStorage";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ROLE_LABELS: Record<string, string> = {
  surgeon: "Surgeon",
  supervisor: "Supervisor",
  trainee: "Trainee",
};

function formatSharedDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function VerificationBadge({
  status,
  theme,
}: {
  status: SharedCaseInboxEntry["verificationStatus"];
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const config = {
    pending: {
      label: "Pending",
      bg: theme.warningSurface,
      color: theme.warning,
    },
    verified: {
      label: "Verified",
      bg: theme.successSurface,
      color: theme.success,
    },
    disputed: { label: "Disputed", bg: theme.errorSurface, color: theme.error },
  };
  const { label, bg, color } = config[status];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText style={[styles.badgeText, { color }]}>{label}</ThemedText>
    </View>
  );
}

type AssessmentBadgeStatus = "submitted" | "revealed" | null;

function AssessmentBadge({
  status,
  theme,
}: {
  status: AssessmentBadgeStatus;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  if (!status) return null;

  const config = {
    submitted: {
      label: "Assessed",
      icon: "clock" as const,
      bg: theme.warningSurface,
      color: theme.warning,
    },
    revealed: {
      label: "Assessed",
      icon: "check-circle" as const,
      bg: theme.successSurface,
      color: theme.success,
    },
  };
  const { label, icon, bg, color } = config[status];

  return (
    <View
      style={[styles.badge, { backgroundColor: bg, marginRight: Spacing.xs }]}
    >
      <Feather name={icon} size={10} color={color} style={{ marginRight: 3 }} />
      <ThemedText style={[styles.badgeText, { color }]}>{label}</ThemedText>
    </View>
  );
}

const SharedCaseCard = React.memo(function SharedCaseCard({
  entry,
  assessmentStatus,
  onPress,
}: {
  entry: SharedCaseInboxEntry;
  assessmentStatus: AssessmentBadgeStatus;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      testID={`sharedInbox.card-${entry.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
        Shadows.card,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: theme.accentSurface },
            ]}
          >
            <Feather name="user" size={16} color={theme.accent} />
          </View>
          <View style={styles.cardHeaderText}>
            <ThemedText
              style={[styles.ownerName, { color: theme.text }]}
              numberOfLines={1}
            >
              {entry.ownerDisplayName || "Unknown"}
            </ThemedText>
            <ThemedText
              style={[styles.cardMeta, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {formatSharedDate(entry.createdAt)}
              {"  ·  "}
              {ROLE_LABELS[entry.recipientRole] || entry.recipientRole}
            </ThemedText>
          </View>
        </View>
        <View style={styles.badgeRow}>
          <AssessmentBadge status={assessmentStatus} theme={theme} />
          <VerificationBadge status={entry.verificationStatus} theme={theme} />
        </View>
      </View>
    </Pressable>
  );
});

export default function SharedInboxScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [entries, setEntries] = useState<SharedCaseInboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assessmentBadges, setAssessmentBadges] = useState<
    Map<string, AssessmentBadgeStatus>
  >(new Map());

  const loadInbox = useCallback(async () => {
    try {
      const data = await getSharedInbox();
      // Sort by createdAt DESC
      data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setEntries(data);
      await updateSharedInboxIndex(data);
    } catch (error) {
      console.error("Error loading shared inbox:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load assessment badge status for all entries
  useEffect(() => {
    if (entries.length === 0) return;

    const loadBadges = async () => {
      const results = await Promise.allSettled(
        entries.map(async (entry) => {
          const revealed = await getRevealedPair(entry.id);
          if (revealed) return { id: entry.id, status: "revealed" as const };
          const mine = await getMyAssessment(entry.id);
          if (mine) return { id: entry.id, status: "submitted" as const };
          return { id: entry.id, status: null };
        }),
      );

      const map = new Map<string, AssessmentBadgeStatus>();
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          map.set(r.value.id, r.value.status);
        }
      }
      setAssessmentBadges(map);
    };

    loadBadges();
  }, [entries]);

  useFocusEffect(
    useCallback(() => {
      loadInbox();
    }, [loadInbox]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInbox();
    setRefreshing(false);
  };

  const handleCardPress = useCallback(
    (entry: SharedCaseInboxEntry) => {
      navigation.navigate("SharedCaseDetail", { sharedCaseId: entry.id });
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

  if (entries.length === 0) {
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
          When a colleague shares a case with you, it will appear here.
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
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SharedCaseCard
            entry={item}
            assessmentStatus={assessmentBadges.get(item.id) ?? null}
            onPress={() => handleCardPress(item)}
          />
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  cardHeaderText: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
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
