import { useState, useCallback } from "react";
import { InteractionManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getVisibleDashboardEpisodes } from "@/lib/episodeStorage";
import { getCaseSummaries } from "@/lib/storage";
import { groupCaseSummariesByEpisodeId } from "@/lib/episodeHelpers";
import type { TreatmentEpisode } from "@/types/episode";
import type { CaseSummary } from "@/types/caseSummary";

export interface EpisodeWithCases {
  episode: TreatmentEpisode;
  cases: CaseSummary[];
}

export function useActiveEpisodes() {
  const [data, setData] = useState<EpisodeWithCases[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (isCancelled?: () => boolean) => {
    setLoading(true);
    try {
      const [episodes, summaries] = await Promise.all([
        getVisibleDashboardEpisodes(),
        getCaseSummaries(),
      ]);
      if (isCancelled?.()) return;
      const byEpisode = groupCaseSummariesByEpisodeId(summaries);
      setData(
        episodes.map((episode) => ({
          episode,
          cases: byEpisode.get(episode.id) ?? [],
        })),
      );
    } catch (error) {
      if (__DEV__) console.error("Error loading active episodes:", error);
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Defer the episode decrypts until the focus transition has landed
      // (same pattern as the dashboard's own loaders).
      let cancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        void refresh(() => cancelled);
      });
      return () => {
        cancelled = true;
        task.cancel();
      };
    }, [refresh]),
  );

  return { episodes: data, loading, refresh };
}
