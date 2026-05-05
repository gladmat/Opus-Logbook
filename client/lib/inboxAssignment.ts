/**
 * Inbox-to-Case Smart Assignment (Capture Pipeline Phase E + H).
 *
 * Pure functions for inferring MediaTag when assigning inbox photos to cases.
 * Uses template metadata from Opus Camera and temporal context from procedure date.
 * Phase H adds autoAssign() for within-case protocol slot assignment and
 * findMatchingCasesByPatientId() for NHI auto-match.
 */

import type { InboxItem } from "@/types/inbox";
import type { MediaTag } from "@/types/media";
import type { OperativeMediaItem, Case } from "@/types/case";
import { ALL_PROTOCOLS, type CaptureStep } from "@/data/mediaCaptureProtocols";
import { suggestTemporalTag } from "@/lib/mediaTagHelpers";
import { hashPatientIdentifierHmac } from "@/lib/patientIdentifierHmac";

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
  if (item.templateId != null && item.templateStepIndex != null) {
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
    createdAt: item.capturedAt,
    templateId: item.templateId,
    templateStepIndex: item.templateStepIndex,
    sourceInboxId: item.id,
  };
}

/**
 * Extract the most common non-empty patientIdentifier from a batch of inbox items.
 * Returns undefined if no items have a patientIdentifier.
 */
export function extractPatientIdHint(items: InboxItem[]): string | undefined {
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

/**
 * Auto-assign media items to protocol slots within a case.
 *
 * Priority chain:
 * 1. Template metadata — photo has templateId + templateStepIndex -> look up step -> assign its tag.
 * 2. Temporal/sequential — group remaining untagged by capture time, fill empty slots in protocol order.
 * 3. Unmatched — leave tag unchanged (keeps existing tag or stays untagged).
 *
 * Returns a new array (never mutates input).
 */
export function autoAssign(
  media: OperativeMediaItem[],
  protocolSteps: CaptureStep[],
  procedureDate?: string,
): OperativeMediaItem[] {
  const result = media.map((m) => ({ ...m }));

  // Track which protocol step indices are already filled
  const filledStepIndices = new Set<number>();

  // Pass 1: template metadata — photo has templateId + templateStepIndex
  for (const item of result) {
    if (item.templateId != null && item.templateStepIndex != null) {
      const protocol = getProtocolById(item.templateId);
      const step = protocol?.steps[item.templateStepIndex];
      if (step) {
        // Find this step's index in the target protocol
        const targetIdx = protocolSteps.findIndex((s) => s.tag === step.tag);
        if (targetIdx >= 0 && !filledStepIndices.has(targetIdx)) {
          item.tag = step.tag;
          filledStepIndices.add(targetIdx);
        }
      }
    }
  }

  // Pass 2: temporal/sequential — fill remaining empty slots with untagged photos
  const untagged = result.filter((m) => !m.tag || m.tag === "other");
  // Sort untagged by capture time ascending
  untagged.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

  for (const item of untagged) {
    // Find the first unfilled protocol slot
    const nextSlotIdx = protocolSteps.findIndex(
      (_, idx) => !filledStepIndices.has(idx),
    );
    if (nextSlotIdx < 0) break; // All slots filled

    const step = protocolSteps[nextSlotIdx]!;
    item.tag = step.tag;
    filledStepIndices.add(nextSlotIdx);
  }

  return result;
}

/**
 * Find cases that match the patient identifier(s) from inbox items.
 * Case-insensitive comparison. Sorted by match count descending.
 * Uses per-user HMAC-SHA256 (consistent with main case storage).
 */
export async function findMatchingCasesByPatientId(
  inboxItems: InboxItem[],
  cases: Case[],
): Promise<{ caseData: Case; matchCount: number }[]> {
  // Collect unique patient hashes from inbox items.
  const pidSet = new Set<string>();
  for (const item of inboxItems) {
    const pid =
      item.patientIdentifierHash ??
      (item.patientIdentifier
        ? await hashPatientIdentifierHmac(item.patientIdentifier)
        : undefined);
    if (pid) pidSet.add(pid);
  }

  if (pidSet.size === 0) return [];

  const matches: { caseData: Case; matchCount: number }[] = [];

  for (const c of cases) {
    if (!c.patientIdentifier) continue;
    const casePid = await hashPatientIdentifierHmac(c.patientIdentifier);
    if (!pidSet.has(casePid)) continue;

    // Count how many inbox items match this case's patient ID
    let matchCount = 0;
    for (const item of inboxItems) {
      const itemHash =
        item.patientIdentifierHash ??
        (item.patientIdentifier
          ? await hashPatientIdentifierHmac(item.patientIdentifier)
          : undefined);
      if (itemHash === casePid) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      matches.push({ caseData: c, matchCount });
    }
  }

  // Sort by match count descending
  matches.sort((a, b) => b.matchCount - a.matchCount);
  return matches;
}
