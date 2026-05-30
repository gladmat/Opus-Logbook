import type { GalleryMediaItem } from "@/components/media";
import type { OperativeMediaItem, TimelineEvent } from "@/types/case";

// A case's photos live in two places: the top-level `operativeMedia` array and
// the `mediaAttachments` on each timeline event. Historically each surface
// opened its own gallery, so a reviewer had to close one photo set and open
// another to keep browsing. These helpers flatten everything into a single
// ordered list so one gallery can swipe across all of a case's photos.
//
// `OperativeMediaItem` and `MediaAttachment` are both structurally assignable
// to `GalleryMediaItem` (shared id / localUri / mimeType / caption / tag /
// timestamp / createdAt), so no field mapping is required.

/**
 * Flatten a case's operative media + every timeline event's media into one
 * ordered gallery list. Operative media come first, then timeline-event media
 * in the order the events are supplied (the same order they render in).
 */
export function getAllCaseMediaItems(
  operativeMedia: OperativeMediaItem[] | undefined,
  timelineEvents: TimelineEvent[] | undefined,
): GalleryMediaItem[] {
  const items: GalleryMediaItem[] = [];

  if (operativeMedia?.length) {
    items.push(...operativeMedia);
  }

  if (timelineEvents?.length) {
    for (const event of timelineEvents) {
      if (event.mediaAttachments?.length) {
        items.push(...event.mediaAttachments);
      }
    }
  }

  return items;
}

/**
 * Index of the media item with `id` in `items`, or 0 if not found. Used to open
 * the consolidated gallery at the photo the user actually tapped while still
 * allowing them to swipe across the whole case.
 */
export function findCaseMediaIndexById(
  items: GalleryMediaItem[],
  id: string,
): number {
  const index = items.findIndex((item) => item.id === id);
  return index < 0 ? 0 : index;
}
