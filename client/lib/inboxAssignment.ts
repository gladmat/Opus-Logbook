/**
 * Inbox-to-Case Smart Assignment (Capture Pipeline Phase E).
 *
 * Pure functions for inferring MediaTag when assigning inbox photos to cases.
 * Uses template metadata from Opus Camera and temporal context from procedure date.
 */

import type { InboxItem } from "@/types/inbox";
import type { MediaTag } from "@/types/media";
import type { OperativeMediaItem, OperativeMediaType } from "@/types/case";
import { ALL_PROTOCOLS } from "@/data/mediaCaptureProtocols";
import { suggestTemporalTag } from "@/lib/mediaTagMigration";
import { TAG_TO_MEDIA_TYPE } from "@/lib/operativeMedia";

/**
 * Look up a capture protocol by its ID.
 */
function getProtocolById(id: string) {
  return ALL_PROTOCOLS.find((p) => p.id === id);
}

/**
 * Infer the best MediaTag for an inbox item given case context.
 *
 * Priority:
 * 1. Template step tag — if the item was captured via guided Opus Camera
 *    and the protocol step is valid, use that step's tag directly.
 * 2. Temporal suggestion — if a procedureDate is available, derive the tag
 *    from days-since-procedure (preop / intraop / postop_early / etc.).
 * 3. Fallback — "other".
 */
export function inferMediaTagForInboxItem(
  item: InboxItem,
  procedureDate?: string,
): MediaTag {
  // Priority 1: template metadata from guided capture
  if (
    item.templateId != null &&
    item.templateStepIndex != null
  ) {
    const protocol = getProtocolById(item.templateId);
    const step = protocol?.steps[item.templateStepIndex];
    if (step) return step.tag;
  }

  // Priority 2: temporal inference from procedure date
  if (procedureDate) {
    return suggestTemporalTag(procedureDate, item.capturedAt);
  }

  // Fallback
  return "other";
}

/**
 * Convert an InboxItem to OperativeMediaItem with a smart-inferred tag.
 */
export function inboxItemToOperativeMediaSmart(
  item: InboxItem,
  tag: MediaTag,
): OperativeMediaItem {
  return {
    id: item.id,
    localUri: item.localUri,
    mimeType: item.mimeType,
    tag,
    mediaType: (TAG_TO_MEDIA_TYPE[tag] ?? "other") as OperativeMediaType,
    createdAt: item.capturedAt,
  };
}

/**
 * Extract the most common non-empty patientIdentifier from a batch of inbox items.
 * Returns undefined if no items have a patientIdentifier.
 */
export function extractPatientIdHint(
  items: InboxItem[],
): string | undefined {
  const counts = new Map<string, number>();

  for (const item of items) {
    const pid = item.patientIdentifier?.trim();
    if (pid) {
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return undefined;

  let best: string | undefined;
  let bestCount = 0;
  for (const [pid, count] of counts) {
    if (count > bestCount) {
      best = pid;
      bestCount = count;
    }
  }
  return best;
}
