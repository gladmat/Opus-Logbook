import type { MediaTag } from "@/types/media";
import type { MediaCategory, OperativeMediaType } from "@/types/case";
import { MEDIA_TAG_REGISTRY } from "@/types/media";
import { parseDateOnlyValue } from "@/lib/dateValues";

/**
 * Maps legacy OperativeMediaType to the new MediaTag.
 * Used when reading old cases.
 */
export function migrateOperativeMediaType(type: OperativeMediaType): MediaTag {
  const map: Record<OperativeMediaType, MediaTag> = {
    preoperative_photo: "preop_clinical",
    intraoperative_photo: "intraop",
    xray: "xray_preop", // Best guess — no temporal context in old type
    ct_scan: "ct_scan",
    mri: "mri",
    diagram: "diagram",
    document: "document",
    other: "other",
  };
  return map[type] ?? "other";
}

/**
 * Maps legacy MediaCategory to the new MediaTag.
 * More precise than OperativeMediaType since categories had temporal info.
 *
 * Covers all 20 MediaCategory values from client/types/case.ts.
 */
export function migrateMediaCategory(category: MediaCategory): MediaTag {
  const map: Record<MediaCategory, MediaTag> = {
    preop: "preop_clinical",
    flap_harvest: "flap_harvest",
    flap_inset: "flap_inset",
    anastomosis: "anastomosis",
    closure: "donor_closure",
    immediate_postop: "immediate_postop",
    flap_planning: "flap_planning",
    xray: "xray_preop",
    preop_xray: "xray_preop",
    intraop_xray: "xray_intraop",
    postop_xray: "xray_postop",
    ct_angiogram: "ct_angiogram",
    ultrasound: "ultrasound",
    // Extended mappings (not in original blueprint — added for completeness)
    discharge_wound: "discharge",
    discharge_donor: "discharge",
    followup_photo: "scar_followup",
    donor_site: "donor_site",
    complication: "wound_postop",
    revision: "intraop",
    other: "other",
  };
  return map[category] ?? "other";
}

/**
 * Resolves the effective MediaTag for a media item,
 * checking `tag` first, then falling back to legacy fields.
 */
export function resolveMediaTag(item: {
  tag?: MediaTag;
  mediaType?: OperativeMediaType;
  category?: MediaCategory;
}): MediaTag {
  if (item.tag && item.tag in MEDIA_TAG_REGISTRY) return item.tag;
  if (item.category) return migrateMediaCategory(item.category);
  if (item.mediaType) return migrateOperativeMediaType(item.mediaType);
  return "other";
}

/**
 * Suggests a temporal MediaTag based on how many days have passed
 * since the procedure date. Used as a smart default when no tag
 * is pre-selected.
 *
 * - No date / future date → "preop_clinical"
 * - Same day → "intraop"
 * - 1–7 days → "postop_early"
 * - 8–42 days (~2–6 weeks) → "postop_mid"
 * - 43–135 days (~1.5–4.5 months) → "followup_3m"
 * - 136–270 days (~4.5–9 months) → "followup_6m"
 * - 271–450 days (~9–15 months) → "followup_12m"
 * - >450 days → "followup_late"
 */
export function suggestTemporalTag(procedureDate?: string): MediaTag {
  if (!procedureDate) return "preop_clinical";

  const procDate = parseDateOnlyValue(procedureDate);
  if (!procDate) return "preop_clinical";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const diffMs = today.getTime() - procDate.getTime();
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
