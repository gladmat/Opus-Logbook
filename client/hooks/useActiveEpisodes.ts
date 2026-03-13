import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getVisibleDashboardEpisodes } from "@/lib/episodeStorage";
import { getCaseSummariesByEpisodeId } from "@/lib/storage";
import type { TreatmentEpisode } from "@/types/episode";
import type { CaseSummary } from "@/types/caseSummary";

export interface EpisodeWithCases {
  episode: TreatmentEpisode;
  cases: CaseSummary[];
}

export function useActiveEpisodes() {
  const [data, setData] = useState<EpisodeWithCases[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const episodes = await getVisibleDashboardEpisodes();
      const withCases = await Promise.all(
        episodes.map(async (episode) => ({
          episode,
          cases: await getCaseSummariesByEpisodeId(episode.id),
        })),
      );
      setData(withCases);
    } catch (error) {
      console.error("Error loading active episodes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { episodes: data, loading, refresh };
}
