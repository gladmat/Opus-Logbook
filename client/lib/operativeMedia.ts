import type {
  MediaAttachment,
  MediaCategory,
  OperativeMediaItem,
  OperativeMediaType,
} from "@/types/case";
import type { MediaTag } from "@/types/media";
import { resolveMediaTag } from "@/lib/mediaTagMigration";

/** Internal legacy mapping — used only within this module for backward-compat conversion. */
const MEDIA_TYPE_TO_CATEGORY: Record<OperativeMediaType, MediaCategory> = {
  preoperative_photo: "preop",
  intraoperative_photo: "immediate_postop",
  xray: "xray",
  ct_scan: "ct_angiogram",
  mri: "ultrasound",
  diagram: "other",
  document: "other",
  other: "other",
};

/** Internal legacy mapping — used only within this module for backward-compat conversion. */
const CATEGORY_TO_MEDIA_TYPE: Partial<
  Record<MediaCategory, OperativeMediaType>
> = {
  preop: "preoperative_photo",
  flap_harvest: "intraoperative_photo",
  flap_inset: "intraoperative_photo",
  anastomosis: "intraoperative_photo",
  closure: "intraoperative_photo",
  immediate_postop: "intraoperative_photo",
  flap_planning: "preoperative_photo",
  xray: "xray",
  preop_xray: "xray",
  intraop_xray: "xray",
  postop_xray: "xray",
  ct_angiogram: "ct_scan",
  ultrasound: "other",
  other: "other",
};

/**
 * Reverse mapping from MediaTag → OperativeMediaType for backward-compatible writes.
 * Groups multiple tags into the nearest legacy type.
 */
export const TAG_TO_MEDIA_TYPE: Record<MediaTag, OperativeMediaType> = {
  // temporal
  preop_clinical: "preoperative_photo",
  day_of_surgery: "preoperative_photo",
  intraop: "intraoperative_photo",
  immediate_postop: "intraoperative_photo",
  postop_early: "intraoperative_photo",
  postop_mid: "intraoperative_photo",
  followup_3m: "intraoperative_photo",
  followup_6m: "intraoperative_photo",
  followup_12m: "intraoperative_photo",
  followup_late: "intraoperative_photo",
  discharge: "intraoperative_photo",

  // imaging
  xray_preop: "xray",
  xray_intraop: "xray",
  xray_postop: "xray",
  xray_followup: "xray",
  ct_scan: "ct_scan",
  ct_angiogram: "ct_scan",
  mri: "mri",
  ultrasound: "other",

  // flap_surgery
  flap_planning: "preoperative_photo",
  flap_design: "preoperative_photo",
  flap_harvest: "intraoperative_photo",
  donor_site: "intraoperative_photo",
  donor_closure: "intraoperative_photo",
  recipient_prep: "intraoperative_photo",
  anastomosis: "intraoperative_photo",
  flap_inset: "intraoperative_photo",
  flap_perfusion: "intraoperative_photo",
  flap_monitoring: "intraoperative_photo",

  // skin_cancer
  lesion_overview: "preoperative_photo",
  lesion_closeup: "preoperative_photo",
  margin_marking: "preoperative_photo",
  excision_defect: "intraoperative_photo",
  specimen: "intraoperative_photo",
  reconstruction_intraop: "intraoperative_photo",
  wound_postop: "intraoperative_photo",
  scar_followup: "intraoperative_photo",

  // aesthetic
  aesthetic_frontal: "preoperative_photo",
  aesthetic_oblique_l: "preoperative_photo",
  aesthetic_oblique_r: "preoperative_photo",
  aesthetic_lateral_l: "preoperative_photo",
  aesthetic_lateral_r: "preoperative_photo",
  aesthetic_base: "preoperative_photo",
  aesthetic_birds_eye: "preoperative_photo",
  aesthetic_hands_on_hips: "preoperative_photo",
  aesthetic_hands_on_head: "preoperative_photo",
  aesthetic_posterior: "preoperative_photo",
  aesthetic_divers: "preoperative_photo",

  // hand_function
  hand_dorsal: "preoperative_photo",
  hand_palmar: "preoperative_photo",
  hand_lateral: "preoperative_photo",
  hand_fist: "preoperative_photo",
  hand_extension: "preoperative_photo",
  hand_opposition: "preoperative_photo",
  hand_grip: "preoperative_photo",
  hand_specific_deficit: "preoperative_photo",
  wrist_flexion: "preoperative_photo",
  wrist_extension: "preoperative_photo",
  wrist_supination: "preoperative_photo",
  wrist_pronation: "preoperative_photo",

  // other
  diagram: "diagram",
  document: "document",
  consent_form: "document",
  other: "other",
};

/**
 * Reverse mapping from MediaTag → MediaCategory for backward-compatible writes.
 */
export const TAG_TO_CATEGORY: Partial<Record<MediaTag, MediaCategory>> = {
  preop_clinical: "preop",
  day_of_surgery: "preop",
  intraop: "immediate_postop",
  immediate_postop: "immediate_postop",
  discharge: "discharge_wound",
  scar_followup: "followup_photo",
  xray_preop: "preop_xray",
  xray_intraop: "intraop_xray",
  xray_postop: "postop_xray",
  ct_angiogram: "ct_angiogram",
  ultrasound: "ultrasound",
  flap_planning: "flap_planning",
  flap_harvest: "flap_harvest",
  flap_inset: "flap_inset",
  anastomosis: "anastomosis",
  donor_closure: "closure",
  donor_site: "donor_site",
  wound_postop: "complication",
  other: "other",
};

export function getLegacyCategoryForTag(
  tag?: MediaTag,
): MediaCategory | undefined {
  return tag ? TAG_TO_CATEGORY[tag] : undefined;
}

export function operativeMediaToAttachments(
  media: OperativeMediaItem[],
): MediaAttachment[] {
  return media.map((item) => {
    const tag = item.tag ?? resolveMediaTag(item);
    const category = item.tag
      ? getLegacyCategoryForTag(tag)
      : MEDIA_TYPE_TO_CATEGORY[item.mediaType];

    return {
      id: item.id,
      localUri: item.localUri,
      thumbnailUri: item.thumbnailUri,
      mimeType: item.mimeType,
      caption: item.caption,
      createdAt: item.createdAt,
      tag,
      ...(category ? { category } : {}),
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
    tag: attachment.tag ?? resolveMediaTag(attachment),
    mediaType: attachment.tag
      ? TAG_TO_MEDIA_TYPE[attachment.tag]
      : (attachment.category && CATEGORY_TO_MEDIA_TYPE[attachment.category]) ||
        "intraoperative_photo",
  }));
}
