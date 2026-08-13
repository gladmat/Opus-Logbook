import type { MediaTag } from "@/types/media";
import type { TimelineEventType } from "@/types/case";
import { MEDIA_TAG_REGISTRY } from "@/types/media";
import {
  normalizeDateOnlyValue,
  parseDateOnlyValue,
  toIsoDateValue,
} from "@/lib/dateValues";

/**
 * Resolves the effective MediaTag for a media item.
 * Returns "other" when the tag is missing or not in the registry.
 */
export function resolveMediaTag(item: { tag?: MediaTag }): MediaTag {
  if (item.tag && item.tag in MEDIA_TAG_REGISTRY) return item.tag;
  return "other";
}

/**
 * Suggests a temporal MediaTag based on how many days have passed
 * since the procedure date. Used as a smart default when no tag
 * is pre-selected.
 *
 * - No date / future date -> "preop_clinical"
 * - Same day -> "intraop"
 * - 1-7 days -> "postop_early"
 * - 8-42 days (~2-6 weeks) -> "postop_mid"
 * - 43-135 days (~1.5-4.5 months) -> "followup_3m"
 * - 136-270 days (~4.5-9 months) -> "followup_6m"
 * - 271-450 days (~9-15 months) -> "followup_12m"
 * - >450 days -> "followup_late"
 */
function resolveReferenceDate(referenceDate?: string | Date): Date {
  if (referenceDate instanceof Date) {
    return new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
      12,
      0,
      0,
      0,
    );
  }

  const parsed = parseDateOnlyValue(referenceDate);
  if (parsed) return parsed;

  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0,
  );
}

export function suggestTemporalTag(
  procedureDate?: string,
  referenceDate?: string | Date,
): MediaTag {
  if (!procedureDate) return "preop_clinical";

  const procDate = parseDateOnlyValue(procedureDate);
  if (!procDate) return "preop_clinical";

  const effectiveDate = resolveReferenceDate(referenceDate);
  const diffMs = effectiveDate.getTime() - procDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "preop_clinical";
  if (diffDays === 0) return "intraop";
  if (diffDays <= 7) return "postop_early";
  if (diffDays <= 42) return "postop_mid";
  if (diffDays <= 135) return "followup_3m";
  if (diffDays <= 270) return "followup_6m";
  if (diffDays <= 450) return "followup_12m";
  return "followup_late";
}

/**
 * Tags that by clinical definition are captured on the day of surgery.
 * Selecting one of these can safely snap the media date to the procedure
 * date. Band tags (postop_early = days 1–7, followups) and pre-op tags are
 * deliberately excluded — their true date is ambiguous, and photos OF
 * pre-op imaging carry the photograph date, not the study date.
 */
export const DAY_OF_SURGERY_TAGS: ReadonlySet<MediaTag> = new Set<MediaTag>([
  // Temporal
  "day_of_surgery",
  "intraop",
  "immediate_postop",
  // Imaging (intra-op only — never pre-op, see note above)
  "xray_intraop",
  // Flap surgery intraoperative stages
  "flap_design",
  "flap_harvest",
  "donor_site",
  "donor_closure",
  "recipient_prep",
  "anastomosis",
  "flap_inset",
  "flap_perfusion",
  // Skin cancer intraoperative stages
  "margin_marking",
  "excision_defect",
  "specimen",
  "reconstruction_intraop",
]);

/**
 * Derives the media date implied by a temporal tag: day-of-surgery tags
 * map to the procedure date; every other tag is ambiguous and returns null
 * (leave the date alone). Also returns null when the procedure date is
 * missing/unparseable or lies in the future (a planned case must not snap
 * the date picker past its not-in-the-future cap).
 */
export function deriveDateForTemporalTag(
  procedureDate: string | undefined,
  tag: MediaTag,
): string | null {
  if (!DAY_OF_SURGERY_TAGS.has(tag)) return null;
  const normalized = normalizeDateOnlyValue(procedureDate);
  if (!normalized) return null;
  if (normalized > toIsoDateValue(new Date())) return null;
  return normalized;
}

export function suggestDefaultMediaTag(args: {
  eventType?: TimelineEventType;
  procedureDate?: string;
  mediaDate?: string | Date;
}): MediaTag {
  switch (args.eventType) {
    case "discharge_photo":
      return "discharge";
    case "imaging":
      return "xray_followup";
    case "photo":
    case "follow_up_visit":
    case undefined:
      return suggestTemporalTag(
        args.procedureDate,
        args.mediaDate instanceof Date
          ? toIsoDateValue(args.mediaDate)
          : args.mediaDate,
      );
    default:
      return suggestTemporalTag(
        args.procedureDate,
        args.mediaDate instanceof Date
          ? toIsoDateValue(args.mediaDate)
          : args.mediaDate,
      );
  }
}
