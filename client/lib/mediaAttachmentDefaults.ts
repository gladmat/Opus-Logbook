import { v4 as uuidv4 } from "uuid";

import type { MediaAttachment, TimelineEventType } from "@/types/case";
import { toIsoDateValue, toUtcNoonIsoTimestamp } from "@/lib/dateValues";
import { suggestDefaultMediaTag } from "@/lib/mediaTagMigration";
import { getLegacyCategoryForTag } from "@/lib/operativeMedia";

interface SavedMediaAsset {
  localUri: string;
  mimeType: string;
}

export function buildDefaultMediaAttachment(args: {
  savedMedia: SavedMediaAsset;
  createdAt: string;
  eventType?: TimelineEventType;
  procedureDate?: string;
  mediaDate?: string | Date;
  id?: string;
}): MediaAttachment {
  const tag = suggestDefaultMediaTag({
    eventType: args.eventType,
    procedureDate: args.procedureDate,
    mediaDate: args.mediaDate,
  });
  const category = getLegacyCategoryForTag(tag);
  const dateValue =
    args.mediaDate instanceof Date
      ? toIsoDateValue(args.mediaDate)
      : args.mediaDate;

  return {
    id: args.id ?? uuidv4(),
    localUri: args.savedMedia.localUri,
    mimeType: args.savedMedia.mimeType,
    createdAt: args.createdAt,
    timestamp: dateValue ? toUtcNoonIsoTimestamp(dateValue) : undefined,
    tag,
    ...(category ? { category } : {}),
  };
}
