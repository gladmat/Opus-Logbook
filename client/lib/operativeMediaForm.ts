import type { OperativeMediaItem } from "@/types/case";
import type { MediaTag } from "@/types/media";
import { TAG_TO_MEDIA_TYPE } from "@/lib/operativeMedia";

const LEGACY_MEDIA_PREFIX = "encrypted-media:";
const OPUS_MEDIA_PREFIX = "opus-media:";

export function isPersistedMediaUriValue(uri?: string): boolean {
  if (!uri) return false;
  return (
    uri.startsWith(LEGACY_MEDIA_PREFIX) || uri.startsWith(OPUS_MEDIA_PREFIX)
  );
}

export function resolveOperativeMediaSavePlan(args: {
  editMode?: boolean;
  originalUri?: string;
  currentUri: string;
}): {
  reuseExistingUri: boolean;
  uriToDeleteAfterCommit?: string;
} {
  if (!args.editMode) {
    return { reuseExistingUri: false };
  }

  const originalUri = args.originalUri;
  const hasPersistedOriginal = isPersistedMediaUriValue(originalUri);
  const reuseExistingUri =
    hasPersistedOriginal &&
    typeof originalUri === "string" &&
    originalUri === args.currentUri;

  return {
    reuseExistingUri,
    uriToDeleteAfterCommit:
      hasPersistedOriginal && !reuseExistingUri ? originalUri : undefined,
  };
}

export function buildOperativeMediaItemRecord(args: {
  id: string;
  localUri: string;
  mimeType: string;
  tag: MediaTag;
  caption?: string;
  timestamp?: string;
  createdAt: string;
}): OperativeMediaItem {
  const trimmedCaption = args.caption?.trim();

  return {
    id: args.id,
    localUri: args.localUri,
    mimeType: args.mimeType,
    tag: args.tag,
    mediaType: TAG_TO_MEDIA_TYPE[args.tag],
    caption: trimmedCaption ? trimmedCaption : undefined,
    timestamp: args.timestamp,
    createdAt: args.createdAt,
  };
}
