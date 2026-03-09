import { normalizeDateOnlyValue } from "./dateValues";
import type { TimelineEvent } from "@/types/case";
import type { TreatmentEpisode } from "@/types/episode";

export function normalizeStoredDateOnlyValue(
  value?: string,
): string | undefined {
  if (value === undefined) return undefined;
  return normalizeDateOnlyValue(value) ?? value;
}

export function normalizeEpisodeDateOnlyFields(
  episode: TreatmentEpisode,
): TreatmentEpisode {
  const onsetDate = normalizeStoredDateOnlyValue(episode.onsetDate);
  if (onsetDate === episode.onsetDate) {
    return episode;
  }

  return {
    ...episode,
    onsetDate: onsetDate ?? episode.onsetDate,
  };
}

export function normalizeTimelineEventDateOnlyFields(
  event: TimelineEvent,
): TimelineEvent {
  const nextReviewDate = normalizeStoredDateOnlyValue(
    event.woundAssessmentData?.nextReviewDate,
  );

  if (nextReviewDate === event.woundAssessmentData?.nextReviewDate) {
    return event;
  }

  return {
    ...event,
    woundAssessmentData: event.woundAssessmentData
      ? {
          ...event.woundAssessmentData,
          nextReviewDate,
        }
      : event.woundAssessmentData,
  };
}
