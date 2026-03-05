import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getVisibleDashboardEpisodes } from "@/lib/episodeStorage";
import { getCasesByEpisodeId } from "@/lib/storage";
import type { TreatmentEpisode } from "@/types/episode";
import type { Case } from "@/types/case";

export interface EpisodeWithCases {
  episode: TreatmentEpisode;
  cases: Case[];
}

export function useActiveEpisodes() {
  const [data, setData] = useState<EpisodeWithCases[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const episodes = await getVisibleDashboardEpisodes();
      const withCases = await Promise.all(
        episodes.map(async (episode) => ({
          episode,
          cases: await getCasesByEpisodeId(episode.id),
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
