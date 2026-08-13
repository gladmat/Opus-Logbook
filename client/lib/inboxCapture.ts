import type { OperativeMediaItem } from "@/types/case";
import type { InboxItem } from "@/types/inbox";
import type { MediaTag } from "@/types/media";
import { ALL_PROTOCOLS } from "@/data/mediaCaptureProtocols";
import { suggestTemporalTag } from "@/lib/mediaTagHelpers";

function resolveProtocolTag(
  templateId?: string,
  templateStepIndex?: number,
): MediaTag | undefined {
  if (templateId == null || templateStepIndex == null) {
    return undefined;
  }

  const protocol = ALL_PROTOCOLS.find((entry) => entry.id === templateId);
  return protocol?.steps[templateStepIndex]?.tag;
}

export function resolveCapturedMediaTag(args: {
  templateId?: string;
  templateStepIndex?: number;
  procedureDate?: string;
  capturedAt: string;
}): MediaTag {
  const protocolTag = resolveProtocolTag(
    args.templateId,
    args.templateStepIndex,
  );
  if (protocolTag) {
    return protocolTag;
  }

  if (args.procedureDate) {
    return suggestTemporalTag(args.procedureDate, args.capturedAt);
  }

  return "other";
}

export function buildOperativeMediaItemFromInboxItem(
  item: InboxItem,
  procedureDate?: string,
): OperativeMediaItem {
  const tag = resolveCapturedMediaTag({
    templateId: item.templateId,
    templateStepIndex: item.templateStepIndex,
    procedureDate,
    capturedAt: item.capturedAt,
  });

  return {
    id: item.id,
    localUri: item.localUri,
    mimeType: item.mimeType,
    tag,
    // capturedAt is a real wall-clock instant — carried on timestamp so the
    // clinical date survives later metadata edits (createdAt alone is only
    // a display fallback and gets lost on edit round-trips).
    timestamp: item.capturedAt,
    createdAt: item.capturedAt,
    templateId: item.templateId,
    templateStepIndex: item.templateStepIndex,
    sourceInboxId: item.id,
  };
}

export function buildCapturedOperativeMediaItem(args: {
  id: string;
  localUri: string;
  mimeType: string;
  capturedAt: string;
  procedureDate?: string;
  templateId?: string;
  templateStepIndex?: number;
}): OperativeMediaItem {
  const tag = resolveCapturedMediaTag({
    templateId: args.templateId,
    templateStepIndex: args.templateStepIndex,
    procedureDate: args.procedureDate,
    capturedAt: args.capturedAt,
  });

  return {
    id: args.id,
    localUri: args.localUri,
    mimeType: args.mimeType,
    tag,
    timestamp: args.capturedAt,
    createdAt: args.capturedAt,
    templateId: args.templateId,
    templateStepIndex: args.templateStepIndex,
  };
}
