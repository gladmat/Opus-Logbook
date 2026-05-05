import type { MediaAttachment, OperativeMediaItem } from "@/types/case";
import type { MediaTag } from "@/types/media";
import { resolveMediaTag } from "@/lib/mediaTagHelpers";

export function operativeMediaToAttachments(
  media: OperativeMediaItem[],
): MediaAttachment[] {
  return media.map((item) => {
    const tag = resolveMediaTag(item);

    return {
      id: item.id,
      localUri: item.localUri,
      thumbnailUri: item.thumbnailUri,
      mimeType: item.mimeType,
      caption: item.caption,
      createdAt: item.createdAt,
      tag,
      timestamp: item.timestamp,
    };
  });
}

export function attachmentsToOperativeMedia(
  attachments: MediaAttachment[],
): OperativeMediaItem[] {
  return attachments.map((attachment) => ({
    id: attachment.id,
    localUri: attachment.localUri,
    thumbnailUri: attachment.thumbnailUri,
    mimeType: attachment.mimeType,
    caption: attachment.caption,
    createdAt: attachment.createdAt,
    timestamp: attachment.timestamp,
    tag: resolveMediaTag(attachment),
  }));
}
