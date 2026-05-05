import React, { useState, useCallback } from "react";
import {
  View,
  SectionList,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { EpisodeCard } from "@/components/EpisodeCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getEpisodes } from "@/lib/episodeStorage";
import {
  getCaseSummariesByEpisodeId,
  getLatestCaseForEpisode,
} from "@/lib/storage";
import type { CaseSummary } from "@/types/caseSummary";
import type { TreatmentEpisode, EpisodePrefillData } from "@/types/episode";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EpisodeWithCases {
  episode: TreatmentEpisode;
  cases: CaseSummary[];
}

interface Section {
  title: string;
  data: EpisodeWithCases[];
}

export default function EpisodeListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [allEpisodes, setAllEpisodes] = useState<EpisodeWithCases[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const episodes = await getEpisodes();
      const withCases = await Promise.all(
        episodes.map(async (episode) => ({
          episode,
          cases: await getCaseSummariesByEpisodeId(episode.id),
        })),
      );
      setAllEpisodes(withCases);
    } catch (error) {
      console.error("Error loading episodes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Filter by search
  const filtered = search.trim()
    ? allEpisodes.filter(
        ({ episode }) =>
          episode.title.toLowerCase().includes(search.toLowerCase()) ||
          episode.patientIdentifier
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
    : allEpisodes;

  // Group into sections
  const sections: Section[] = [];
  const active = filtered.filter(
    ({ episode }) =>
      episode.status === "active" ||
      episode.status === "on_hold" ||
      episode.status === "planned",
  );
  const completed = filtered.filter(
    ({ episode }) => episode.status === "completed",
  );
  const cancelled = filtered.filter(
    ({ episode }) => episode.status === "cancelled",
  );

  if (active.length > 0) sections.push({ title: "Active", data: active });
  if (completed.length > 0)
    sections.push({ title: "Completed", data: completed });
  if (cancelled.length > 0)
    sections.push({ title: "Cancelled", data: cancelled });

  const handleNavigateEpisode = useCallback(
    (episodeId: string) => {
      navigation.navigate("EpisodeDetail", { episodeId });
    },
    [navigation],
  );

  const handleLogCase = useCallback(
    async (episode: TreatmentEpisode) => {
      const lastCase = await getLatestCaseForEpisode(episode.id);
      const linkedCases = allEpisodes.find(
        (e) => e.episode.id === episode.id,
      )?.cases;
      const seq = (linkedCases?.length ?? 0) + 1;

      const prefill: EpisodePrefillData = {
        patientIdentifier: episode.patientIdentifier,
        facility: lastCase?.facility,
        specialty: episode.specialty,
        diagnosisGroups: lastCase?.diagnosisGroups,
        encounterClass: lastCase?.encounterClass,
        reconstructionTiming: lastCase?.reconstructionTiming,
        priorRadiotherapy: lastCase?.priorRadiotherapy,
        priorChemotherapy: lastCase?.priorChemotherapy,
        episodeSequence: seq,
      };

      navigation.navigate("CaseForm", {
        specialty: episode.specialty,
        episodeId: episode.id,
        episodePrefill: prefill,
      });
    },
    [navigation, allEpisodes],
  );

  return (
    <View
      testID="screen-episodeList"
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      {/* Search bar */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="search" size={18} color={theme.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search episodes..."
          placeholderTextColor={theme.textTertiary}
          style={[styles.searchInput, { color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          testID="episodes.input-search"
        />
        {search ? (
          <Feather
            name="x"
            size={18}
            color={theme.textTertiary}
            onPress={() => setSearch("")}
          />
        ) : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.episode.id}
        renderItem={({ item }) => (
          <View
            style={styles.cardContainer}
            testID={`episodes.card-${item.episode.id}`}
          >
            <EpisodeCard
              episode={item.episode}
              linkedCases={item.cases}
              onPress={() => handleNavigateEpisode(item.episode.id)}
              onLogCase={() => handleLogCase(item.episode)}
            />
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.sectionHeader,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <ThemedText
              style={[styles.sectionTitle, { color: theme.textSecondary }]}
            >
              {section.title}
            </ThemedText>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="layers" size={32} color={theme.textTertiary} />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              {loading
                ? "Loading..."
                : search
                  ? "No episodes match your search"
                  : "No episodes yet"}
            </ThemedText>
          </View>
        }
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    ...Platform.select({
      ios: { fontFamily: "System" },
      default: {},
    }),
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  cardContainer: {
    marginBottom: Spacing.xs,
  },
  sectionHeader: {
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 15,
  },
});
