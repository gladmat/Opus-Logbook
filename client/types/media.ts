// ═══════════════════════════════════════════════════════════════
// MEDIA TAG SYSTEM — Single source of truth for all media types
// ═══════════════════════════════════════════════════════════════

/**
 * MediaTagGroup — top-level grouping for UI display.
 * These are the section headers in the tag picker.
 */
export type MediaTagGroup =
  | "temporal" // Generic pre/intra/post timeline
  | "imaging" // Radiology / diagnostics
  | "flap_surgery" // Free flap / pedicled flap specific
  | "skin_cancer" // Skin cancer specific
  | "aesthetic" // Standardized aesthetic views
  | "hand_function" // Hand surgery functional documentation
  | "other"; // Documents, diagrams, misc

/**
 * MediaTag — the atomic unit. Every media item gets exactly ONE tag.
 * Tags are unique across all groups (no collisions).
 */
export type MediaTag =
  // ── Temporal (generic, available for all specialties) ──
  | "preop_clinical" // Pre-operative clinical photo
  | "day_of_surgery" // Day-of-surgery (before anaesthesia)
  | "intraop" // Generic intraoperative
  | "immediate_postop" // Day 0 post-op
  | "postop_early" // Days 1–7
  | "postop_mid" // Weeks 2–6
  | "followup_3m" // 3-month follow-up
  | "followup_6m" // 6-month follow-up
  | "followup_12m" // 12-month follow-up
  | "followup_late" // >12 months
  | "discharge" // Discharge documentation
  // ── Imaging ──
  | "xray_preop"
  | "xray_intraop"
  | "xray_postop"
  | "xray_followup"
  | "ct_scan"
  | "ct_angiogram"
  | "mri"
  | "ultrasound"
  // ── Flap surgery ──
  | "flap_planning" // Preop markings, perforator mapping
  | "flap_design" // Skin paddle outline on patient
  | "flap_harvest" // Raised flap showing pedicle
  | "donor_site" // Donor site before closure
  | "donor_closure" // Donor site after closure
  | "recipient_prep" // Recipient site / vessel preparation
  | "anastomosis" // Microsurgical anastomosis
  | "flap_inset" // Flap in situ at recipient
  | "flap_perfusion" // ICG / clinical perfusion check
  | "flap_monitoring" // Post-op flap monitoring photos
  // ── Skin cancer ──
  | "lesion_overview" // Orientation photo (1m distance, shows anatomy)
  | "lesion_closeup" // Close-up clinical (10–15cm)
  | "margin_marking" // Excision margins drawn on skin
  | "excision_defect" // Defect after excision
  | "specimen" // Excised specimen (oriented)
  | "reconstruction_intraop" // Reconstruction / closure intraop
  | "wound_postop" // Post-op wound / dressing
  | "scar_followup" // Scar assessment at follow-up
  // ── Aesthetic (standardized view series) ──
  | "aesthetic_frontal" // AP view
  | "aesthetic_oblique_l" // Left oblique 45°
  | "aesthetic_oblique_r" // Right oblique 45°
  | "aesthetic_lateral_l" // Left lateral 90°
  | "aesthetic_lateral_r" // Right lateral 90°
  | "aesthetic_base" // Worm's eye (rhinoplasty)
  | "aesthetic_birds_eye" // Bird's eye (rhinoplasty)
  | "aesthetic_hands_on_hips" // Breast — hands on hips
  | "aesthetic_hands_on_head" // Breast — hands above head
  | "aesthetic_posterior" // Back view (body contouring / LD flap)
  | "aesthetic_divers" // Diver's view (abdominoplasty)
  // ── Hand surgery functional ──
  | "hand_dorsal" // Dorsal view, fingers extended
  | "hand_palmar" // Palmar view, fingers extended
  | "hand_lateral" // Lateral view
  | "hand_fist" // Composite fist
  | "hand_extension" // Full extension (tabletop test)
  | "hand_opposition" // Thumb opposition
  | "hand_grip" // Grip strength posture
  | "hand_specific_deficit" // Pathology-specific (claw, mallet, etc.)
  | "wrist_flexion" // Wrist flexion
  | "wrist_extension" // Wrist extension
  | "wrist_supination" // Forearm supination
  | "wrist_pronation" // Forearm pronation
  // ── Other ──
  | "diagram"
  | "document"
  | "consent_form"
  | "other";

/**
 * Tag metadata for UI rendering and protocol matching.
 */
export interface MediaTagMeta {
  tag: MediaTag;
  group: MediaTagGroup;
  label: string; // Short label for chips/badges
  description?: string; // Longer description for capture guidance
  sortOrder: number; // Within group
  captureHint?: string; // Brief instruction shown during capture
  defaultForEventType?: string; // Auto-suggest when this timeline event type is created
}

/**
 * Complete tag registry — single source of truth for labels and metadata.
 */
export const MEDIA_TAG_REGISTRY: Record<MediaTag, MediaTagMeta> = {
  // Temporal
  preop_clinical: {
    tag: "preop_clinical",
    group: "temporal",
    label: "Pre-op",
    sortOrder: 1,
  },
  day_of_surgery: {
    tag: "day_of_surgery",
    group: "temporal",
    label: "Day of surgery",
    sortOrder: 2,
  },
  intraop: {
    tag: "intraop",
    group: "temporal",
    label: "Intra-op",
    sortOrder: 3,
  },
  immediate_postop: {
    tag: "immediate_postop",
    group: "temporal",
    label: "Immediate post-op",
    sortOrder: 4,
  },
  postop_early: {
    tag: "postop_early",
    group: "temporal",
    label: "Post-op (1\u20137d)",
    sortOrder: 5,
  },
  postop_mid: {
    tag: "postop_mid",
    group: "temporal",
    label: "Post-op (2\u20136wk)",
    sortOrder: 6,
  },
  followup_3m: {
    tag: "followup_3m",
    group: "temporal",
    label: "3-month F/U",
    sortOrder: 7,
  },
  followup_6m: {
    tag: "followup_6m",
    group: "temporal",
    label: "6-month F/U",
    sortOrder: 8,
  },
  followup_12m: {
    tag: "followup_12m",
    group: "temporal",
    label: "12-month F/U",
    sortOrder: 9,
  },
  followup_late: {
    tag: "followup_late",
    group: "temporal",
    label: "Late F/U (>12m)",
    sortOrder: 10,
  },
  discharge: {
    tag: "discharge",
    group: "temporal",
    label: "Discharge",
    sortOrder: 11,
  },

  // Imaging
  xray_preop: {
    tag: "xray_preop",
    group: "imaging",
    label: "X-ray (pre-op)",
    sortOrder: 1,
  },
  xray_intraop: {
    tag: "xray_intraop",
    group: "imaging",
    label: "X-ray (intra-op)",
    sortOrder: 2,
  },
  xray_postop: {
    tag: "xray_postop",
    group: "imaging",
    label: "X-ray (post-op)",
    sortOrder: 3,
  },
  xray_followup: {
    tag: "xray_followup",
    group: "imaging",
    label: "X-ray (F/U)",
    sortOrder: 4,
  },
  ct_scan: {
    tag: "ct_scan",
    group: "imaging",
    label: "CT",
    sortOrder: 5,
  },
  ct_angiogram: {
    tag: "ct_angiogram",
    group: "imaging",
    label: "CT Angiogram",
    sortOrder: 6,
  },
  mri: { tag: "mri", group: "imaging", label: "MRI", sortOrder: 7 },
  ultrasound: {
    tag: "ultrasound",
    group: "imaging",
    label: "Ultrasound",
    sortOrder: 8,
  },

  // Flap surgery
  flap_planning: {
    tag: "flap_planning",
    group: "flap_surgery",
    label: "Flap planning",
    sortOrder: 1,
    captureHint: "Perforator markings, CT angiogram overlay",
  },
  flap_design: {
    tag: "flap_design",
    group: "flap_surgery",
    label: "Flap design",
    sortOrder: 2,
    captureHint: "Skin paddle outline on patient",
  },
  flap_harvest: {
    tag: "flap_harvest",
    group: "flap_surgery",
    label: "Flap harvest",
    sortOrder: 3,
    captureHint: "Raised flap showing pedicle",
  },
  donor_site: {
    tag: "donor_site",
    group: "flap_surgery",
    label: "Donor site",
    sortOrder: 4,
  },
  donor_closure: {
    tag: "donor_closure",
    group: "flap_surgery",
    label: "Donor closure",
    sortOrder: 5,
  },
  recipient_prep: {
    tag: "recipient_prep",
    group: "flap_surgery",
    label: "Recipient prep",
    sortOrder: 6,
    captureHint: "Recipient vessels exposed",
  },
  anastomosis: {
    tag: "anastomosis",
    group: "flap_surgery",
    label: "Anastomosis",
    sortOrder: 7,
    captureHint: "Completed anastomosis before release",
  },
  flap_inset: {
    tag: "flap_inset",
    group: "flap_surgery",
    label: "Flap inset",
    sortOrder: 8,
  },
  flap_perfusion: {
    tag: "flap_perfusion",
    group: "flap_surgery",
    label: "Perfusion check",
    sortOrder: 9,
    captureHint: "ICG or clinical perfusion assessment",
  },
  flap_monitoring: {
    tag: "flap_monitoring",
    group: "flap_surgery",
    label: "Flap monitoring",
    sortOrder: 10,
  },

  // Skin cancer
  lesion_overview: {
    tag: "lesion_overview",
    group: "skin_cancer",
    label: "Lesion overview",
    sortOrder: 1,
    captureHint: "~1m distance, shows anatomical location",
  },
  lesion_closeup: {
    tag: "lesion_closeup",
    group: "skin_cancer",
    label: "Lesion close-up",
    sortOrder: 2,
    captureHint: "10\u201315cm, surface detail visible",
  },
  margin_marking: {
    tag: "margin_marking",
    group: "skin_cancer",
    label: "Margin markings",
    sortOrder: 3,
    captureHint: "Excision margins drawn on skin",
  },
  excision_defect: {
    tag: "excision_defect",
    group: "skin_cancer",
    label: "Excision defect",
    sortOrder: 4,
  },
  specimen: {
    tag: "specimen",
    group: "skin_cancer",
    label: "Specimen",
    sortOrder: 5,
    captureHint: "Oriented specimen with suture markers",
  },
  reconstruction_intraop: {
    tag: "reconstruction_intraop",
    group: "skin_cancer",
    label: "Reconstruction",
    sortOrder: 6,
  },
  wound_postop: {
    tag: "wound_postop",
    group: "skin_cancer",
    label: "Wound post-op",
    sortOrder: 7,
  },
  scar_followup: {
    tag: "scar_followup",
    group: "skin_cancer",
    label: "Scar F/U",
    sortOrder: 8,
  },

  // Aesthetic
  aesthetic_frontal: {
    tag: "aesthetic_frontal",
    group: "aesthetic",
    label: "Frontal (AP)",
    sortOrder: 1,
    captureHint: "Frankfort horizontal plane parallel to ground",
  },
  aesthetic_oblique_l: {
    tag: "aesthetic_oblique_l",
    group: "aesthetic",
    label: "L oblique 45\u00b0",
    sortOrder: 2,
    captureHint: "Patient rotates full body 45\u00b0 left",
  },
  aesthetic_oblique_r: {
    tag: "aesthetic_oblique_r",
    group: "aesthetic",
    label: "R oblique 45\u00b0",
    sortOrder: 3,
    captureHint: "Patient rotates full body 45\u00b0 right",
  },
  aesthetic_lateral_l: {
    tag: "aesthetic_lateral_l",
    group: "aesthetic",
    label: "L lateral 90\u00b0",
    sortOrder: 4,
  },
  aesthetic_lateral_r: {
    tag: "aesthetic_lateral_r",
    group: "aesthetic",
    label: "R lateral 90\u00b0",
    sortOrder: 5,
  },
  aesthetic_base: {
    tag: "aesthetic_base",
    group: "aesthetic",
    label: "Base view",
    sortOrder: 6,
    captureHint: "Worm's eye \u2014 nostrils visible (rhinoplasty)",
  },
  aesthetic_birds_eye: {
    tag: "aesthetic_birds_eye",
    group: "aesthetic",
    label: "Bird's eye",
    sortOrder: 7,
    captureHint: "Superior view of nasal dorsum",
  },
  aesthetic_hands_on_hips: {
    tag: "aesthetic_hands_on_hips",
    group: "aesthetic",
    label: "Hands on hips",
    sortOrder: 8,
    captureHint: "Breast \u2014 pectoralis contraction",
  },
  aesthetic_hands_on_head: {
    tag: "aesthetic_hands_on_head",
    group: "aesthetic",
    label: "Hands on head",
    sortOrder: 9,
    captureHint: "Breast \u2014 arms elevated, ptosis assessment",
  },
  aesthetic_posterior: {
    tag: "aesthetic_posterior",
    group: "aesthetic",
    label: "Posterior",
    sortOrder: 10,
    captureHint: "Body contouring / LD donor",
  },
  aesthetic_divers: {
    tag: "aesthetic_divers",
    group: "aesthetic",
    label: "Diver's view",
    sortOrder: 11,
    captureHint: "Hands on buttocks, 20\u201330\u00b0 hip flexion",
  },

  // Hand function
  hand_dorsal: {
    tag: "hand_dorsal",
    group: "hand_function",
    label: "Dorsal",
    sortOrder: 1,
    captureHint: "Both hands, fingers extended, side by side",
  },
  hand_palmar: {
    tag: "hand_palmar",
    group: "hand_function",
    label: "Palmar",
    sortOrder: 2,
  },
  hand_lateral: {
    tag: "hand_lateral",
    group: "hand_function",
    label: "Lateral",
    sortOrder: 3,
  },
  hand_fist: {
    tag: "hand_fist",
    group: "hand_function",
    label: "Fist",
    sortOrder: 4,
    captureHint: "Composite fist \u2014 fingertips to palm",
  },
  hand_extension: {
    tag: "hand_extension",
    group: "hand_function",
    label: "Full extension",
    sortOrder: 5,
    captureHint: "Tabletop test \u2014 extensor lag assessment",
  },
  hand_opposition: {
    tag: "hand_opposition",
    group: "hand_function",
    label: "Opposition",
    sortOrder: 6,
  },
  hand_grip: {
    tag: "hand_grip",
    group: "hand_function",
    label: "Grip",
    sortOrder: 7,
  },
  hand_specific_deficit: {
    tag: "hand_specific_deficit",
    group: "hand_function",
    label: "Specific deficit",
    sortOrder: 8,
    captureHint: "Claw, mallet, Boutonni\u00e8re, etc.",
  },
  wrist_flexion: {
    tag: "wrist_flexion",
    group: "hand_function",
    label: "Wrist flexion",
    sortOrder: 9,
  },
  wrist_extension: {
    tag: "wrist_extension",
    group: "hand_function",
    label: "Wrist extension",
    sortOrder: 10,
  },
  wrist_supination: {
    tag: "wrist_supination",
    group: "hand_function",
    label: "Supination",
    sortOrder: 11,
  },
  wrist_pronation: {
    tag: "wrist_pronation",
    group: "hand_function",
    label: "Pronation",
    sortOrder: 12,
  },

  // Other
  diagram: { tag: "diagram", group: "other", label: "Diagram", sortOrder: 1 },
  document: {
    tag: "document",
    group: "other",
    label: "Document",
    sortOrder: 2,
  },
  consent_form: {
    tag: "consent_form",
    group: "other",
    label: "Consent form",
    sortOrder: 3,
  },
  other: { tag: "other", group: "other", label: "Other", sortOrder: 4 },
};

/**
 * Group metadata for section headers in the tag picker.
 */
export const MEDIA_TAG_GROUP_LABELS: Record<MediaTagGroup, string> = {
  temporal: "Timeline",
  imaging: "Imaging",
  flap_surgery: "Flap Surgery",
  skin_cancer: "Skin Cancer",
  aesthetic: "Aesthetic Views",
  hand_function: "Hand Function",
  other: "Other",
};

/**
 * Helper: get all tags for a given group.
 */
export function getTagsForGroup(group: MediaTagGroup): MediaTagMeta[] {
  return Object.values(MEDIA_TAG_REGISTRY)
    .filter((meta) => meta.group === group)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPreferredMediaTagGroup(
  selectedTag: MediaTag | undefined,
  groups: MediaTagGroup[],
): MediaTagGroup {
  if (selectedTag) {
    const meta = MEDIA_TAG_REGISTRY[selectedTag];
    if (meta && groups.includes(meta.group)) {
      return meta.group;
    }
  }

  return groups[0] ?? "temporal";
}

/**
 * Helper: get the groups relevant to a given specialty/procedure context.
 * "temporal", "imaging", and "other" are always included.
 *
 * Skin cancer tags are diagnosis-driven: `hasSkinCancerAssessment` overrides
 * specialty gating so any specialty with a skin cancer diagnosis gets the
 * skin_cancer tag group.
 */
export function getRelevantGroups(
  specialty?: string,
  procedureTags?: string[],
  hasSkinCancerAssessment?: boolean,
): MediaTagGroup[] {
  const groups: MediaTagGroup[] = ["temporal", "imaging"];

  const hasFreeFlap = procedureTags?.some(
    (t) => t === "free_flap" || t === "pedicled_flap" || t === "microsurgery",
  );
  if (hasFreeFlap) groups.push("flap_surgery");

  if (hasSkinCancerAssessment) {
    groups.push("skin_cancer");
  }

  if (
    specialty === "aesthetics" ||
    specialty === "body_contouring" ||
    specialty === "breast"
  ) {
    groups.push("aesthetic");
  }

  if (specialty === "hand_wrist") {
    groups.push("hand_function");
  }

  groups.push("other");
  return groups;
}
