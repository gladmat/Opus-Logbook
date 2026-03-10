import type { MediaTag } from "@/types/media";

/**
 * A capture protocol defines the recommended photo sequence
 * for a specific clinical context. Protocols are suggested,
 * never enforced.
 */
export interface CaptureProtocol {
  id: string;
  label: string;
  description: string;
  /** Which specialty/procedure context activates this protocol */
  activationRules: ProtocolActivationRule;
  /** Ordered list of recommended captures */
  steps: CaptureStep[];
}

export interface CaptureStep {
  tag: MediaTag;
  label: string;
  required: boolean; // Visual indicator only — never blocks save
  captureHint?: string; // Brief instruction shown in capture UI
  bilateral?: boolean; // If true, expect L and R versions
}

export interface ProtocolActivationRule {
  /** Matches if ANY of these specialties are in the case */
  specialties?: string[];
  /** Matches if ANY of these procedure tags are present */
  procedureTags?: string[];
  /** Matches if ANY of these procedure picklist IDs are present */
  procedurePicklistIds?: string[];
  /** Matches if ANY of these diagnosis picklist IDs are present */
  diagnosisPicklistIds?: string[];
  /** Matches if case has skin cancer assessment */
  hasSkinCancerAssessment?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// PROTOCOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const FREE_FLAP_PROTOCOL: CaptureProtocol = {
  id: "free_flap",
  label: "Free Flap Documentation",
  description: "Complete microsurgical free flap photo series",
  activationRules: {
    procedureTags: ["free_flap", "microsurgery"],
  },
  steps: [
    {
      tag: "preop_clinical",
      label: "Defect / indication (pre-op)",
      required: true,
    },
    {
      tag: "flap_planning",
      label: "Flap planning / markings",
      required: true,
      captureHint: "Perforator markings, Doppler points",
    },
    {
      tag: "flap_design",
      label: "Skin paddle design",
      required: false,
      captureHint: "Outline on patient with dimensions",
    },
    {
      tag: "recipient_prep",
      label: "Recipient site preparation",
      required: false,
      captureHint: "Vessels exposed, defect prepared",
    },
    {
      tag: "flap_harvest",
      label: "Flap raised on pedicle",
      required: true,
      captureHint: "Pedicle visible, flap dimensions",
    },
    {
      tag: "anastomosis",
      label: "Anastomosis",
      required: false,
      captureHint: "Completed anastomosis before clamp release",
    },
    { tag: "flap_inset", label: "Flap inset", required: true },
    {
      tag: "flap_perfusion",
      label: "Perfusion check",
      required: false,
      captureHint: "ICG angiography or clinical assessment",
    },
    {
      tag: "donor_site",
      label: "Donor site (before closure)",
      required: false,
    },
    { tag: "donor_closure", label: "Donor site closure", required: false },
    {
      tag: "immediate_postop",
      label: "End of operation",
      required: false,
    },
  ],
};

export const SKIN_CANCER_EXCISION_PROTOCOL: CaptureProtocol = {
  id: "skin_cancer_excision",
  label: "Skin Cancer Excision",
  description: "Skin cancer excision with clinical and margin documentation",
  activationRules: {
    hasSkinCancerAssessment: true,
    specialties: ["skin_cancer"],
  },
  steps: [
    {
      tag: "lesion_overview",
      label: "Lesion in context (~1m)",
      required: true,
      captureHint: "Shows anatomical location, include landmark",
    },
    {
      tag: "lesion_closeup",
      label: "Lesion close-up (10\u201315cm)",
      required: true,
      captureHint: "Surface detail, ruler for scale",
    },
    {
      tag: "margin_marking",
      label: "Excision margins marked",
      required: true,
      captureHint: "Drawn margins visible with measurements",
    },
    {
      tag: "excision_defect",
      label: "Defect after excision",
      required: false,
    },
    {
      tag: "specimen",
      label: "Specimen (oriented)",
      required: false,
      captureHint: "Oriented with suture markers, ruler",
    },
    {
      tag: "reconstruction_intraop",
      label: "Reconstruction / closure",
      required: false,
    },
    {
      tag: "wound_postop",
      label: "Post-op wound / dressing",
      required: false,
    },
  ],
};

export const AESTHETIC_FACE_PROTOCOL: CaptureProtocol = {
  id: "aesthetic_face",
  label: "Aesthetic \u2014 Face (5-view)",
  description: "Standard 5-view facial photography series",
  activationRules: {
    specialties: ["aesthetics"],
  },
  steps: [
    {
      tag: "aesthetic_frontal",
      label: "Frontal (AP)",
      required: true,
      captureHint: "Frankfort plane horizontal, hair back, ears visible",
    },
    {
      tag: "aesthetic_oblique_r",
      label: "Right oblique 45\u00b0",
      required: true,
      captureHint: "Full body rotation, not just head turn",
    },
    {
      tag: "aesthetic_oblique_l",
      label: "Left oblique 45\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_lateral_r",
      label: "Right lateral 90\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_lateral_l",
      label: "Left lateral 90\u00b0",
      required: true,
    },
  ],
};

export const AESTHETIC_RHINOPLASTY_PROTOCOL: CaptureProtocol = {
  id: "aesthetic_rhinoplasty",
  label: "Aesthetic \u2014 Rhinoplasty (7-view)",
  description: "Full rhinoplasty series including base and bird's eye",
  activationRules: {
    procedurePicklistIds: [
      "aes_rhino_open",
      "aes_rhino_closed",
      "aes_rhino_revision",
      "aes_rhino_septorhinoplasty",
      "aes_rhino_tip",
    ],
  },
  steps: [
    {
      tag: "aesthetic_frontal",
      label: "Frontal (AP)",
      required: true,
      captureHint: "Frankfort plane horizontal",
    },
    {
      tag: "aesthetic_oblique_r",
      label: "Right oblique 45\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_oblique_l",
      label: "Left oblique 45\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_lateral_r",
      label: "Right lateral 90\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_lateral_l",
      label: "Left lateral 90\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_base",
      label: "Base (worm's eye)",
      required: true,
      captureHint: "Nostrils visible, columella-labial angle",
    },
    {
      tag: "aesthetic_birds_eye",
      label: "Bird's eye",
      required: false,
      captureHint: "View from above \u2014 nasal dorsum alignment",
    },
  ],
};

export const AESTHETIC_BREAST_PROTOCOL: CaptureProtocol = {
  id: "aesthetic_breast",
  label: "Aesthetic \u2014 Breast (10-view)",
  description: "Complete breast photography series: 5 views \u00d7 2 positions",
  activationRules: {
    specialties: ["breast", "aesthetics"],
  },
  steps: [
    {
      tag: "aesthetic_frontal",
      label: "Frontal (AP)",
      required: true,
      captureHint: "Neck to navel, arms at sides",
    },
    {
      tag: "aesthetic_oblique_r",
      label: "Right oblique 45\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_oblique_l",
      label: "Left oblique 45\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_lateral_r",
      label: "Right lateral 90\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_lateral_l",
      label: "Left lateral 90\u00b0",
      required: true,
    },
    {
      tag: "aesthetic_hands_on_hips",
      label: "Frontal \u2014 hands on hips",
      required: false,
      captureHint: "Pectoralis contraction, symmetry assessment",
    },
    {
      tag: "aesthetic_hands_on_head",
      label: "Frontal \u2014 hands on head",
      required: false,
      captureHint: "Arms elevated, ptosis/IMF assessment",
    },
    {
      tag: "aesthetic_posterior",
      label: "Posterior",
      required: false,
      captureHint: "For LD flap donor / back assessment",
    },
  ],
};

export const AESTHETIC_BODY_PROTOCOL: CaptureProtocol = {
  id: "aesthetic_body",
  label: "Aesthetic \u2014 Body Contouring (6-view)",
  description: "Abdominoplasty, liposuction, body contouring series",
  activationRules: {
    specialties: ["body_contouring"],
  },
  steps: [
    {
      tag: "aesthetic_frontal",
      label: "Frontal (AP)",
      required: true,
      captureHint: "Include mons pubis in frame",
    },
    {
      tag: "aesthetic_lateral_r",
      label: "Right lateral 90\u00b0",
      required: true,
      captureHint: "Arms at 90\u00b0 elbow flexion",
    },
    {
      tag: "aesthetic_lateral_l",
      label: "Left lateral 90\u00b0",
      required: true,
    },
    { tag: "aesthetic_posterior", label: "Posterior", required: true },
    {
      tag: "aesthetic_divers",
      label: "Diver's view",
      required: false,
      captureHint: "Hands on buttocks, 20\u201330\u00b0 hip flexion",
    },
    {
      tag: "aesthetic_oblique_r",
      label: "Right oblique 45\u00b0",
      required: false,
    },
    {
      tag: "aesthetic_oblique_l",
      label: "Left oblique 45\u00b0",
      required: false,
    },
  ],
};

export const HAND_SURGERY_PROTOCOL: CaptureProtocol = {
  id: "hand_surgery",
  label: "Hand Surgery \u2014 Functional Documentation",
  description: "Standard hand/wrist functional photo series",
  activationRules: {
    specialties: ["hand_wrist"],
  },
  steps: [
    {
      tag: "hand_dorsal",
      label: "Dorsal (extended)",
      required: true,
      captureHint: "Both hands side by side for comparison",
    },
    { tag: "hand_palmar", label: "Palmar (extended)", required: true },
    { tag: "hand_lateral", label: "Lateral", required: false },
    {
      tag: "hand_fist",
      label: "Composite fist",
      required: true,
      captureHint: "Fingertips to palm \u2014 assess flexion",
    },
    {
      tag: "hand_extension",
      label: "Full extension",
      required: false,
      captureHint: "Tabletop test \u2014 extensor lag",
    },
    {
      tag: "hand_specific_deficit",
      label: "Specific deficit",
      required: false,
      captureHint: "Pathology-specific posture",
    },
    { tag: "wrist_flexion", label: "Wrist flexion", required: false },
    { tag: "wrist_extension", label: "Wrist extension", required: false },
    { tag: "wrist_supination", label: "Supination", required: false },
    { tag: "wrist_pronation", label: "Pronation", required: false },
    { tag: "xray_preop", label: "X-ray (pre-op)", required: false },
    { tag: "xray_postop", label: "X-ray (post-op)", required: false },
  ],
};

// ═══════════════════════════════════════════════════════════════
// PROTOCOL REGISTRY
// ═══════════════════════════════════════════════════════════════

export const ALL_PROTOCOLS: CaptureProtocol[] = [
  FREE_FLAP_PROTOCOL,
  SKIN_CANCER_EXCISION_PROTOCOL,
  AESTHETIC_RHINOPLASTY_PROTOCOL, // More specific — check before generic face
  AESTHETIC_FACE_PROTOCOL,
  AESTHETIC_BREAST_PROTOCOL,
  AESTHETIC_BODY_PROTOCOL,
  HAND_SURGERY_PROTOCOL,
];

/**
 * Find ALL matching protocols for a given case context.
 * Returns an array (may be empty). Most specific protocols listed first
 * in ALL_PROTOCOLS are returned first.
 *
 * For single-protocol cases (most common), use matchedProtocols[0].
 * For multi-protocol cases (e.g., free flap skin cancer reconstruction),
 * pass the array to mergeProtocols() for a chronological merged checklist.
 */
export function findProtocols(context: {
  specialties?: string[];
  procedureTags?: string[];
  procedurePicklistIds?: string[];
  diagnosisPicklistIds?: string[];
  hasSkinCancerAssessment?: boolean;
}): CaptureProtocol[] {
  return ALL_PROTOCOLS.filter((protocol) => {
    const rules = protocol.activationRules;

    if (rules.procedureTags?.length) {
      const match = rules.procedureTags.some((t) =>
        context.procedureTags?.includes(t),
      );
      if (match) return true;
    }

    if (rules.hasSkinCancerAssessment && context.hasSkinCancerAssessment) {
      return true;
    }

    if (rules.procedurePicklistIds?.length) {
      const match = rules.procedurePicklistIds.some((id) =>
        context.procedurePicklistIds?.includes(id),
      );
      if (match) return true;
    }

    if (rules.diagnosisPicklistIds?.length) {
      const match = rules.diagnosisPicklistIds.some((id) =>
        context.diagnosisPicklistIds?.includes(id),
      );
      if (match) return true;
    }

    if (rules.specialties?.length) {
      const match = rules.specialties.some((s) =>
        context.specialties?.includes(s),
      );
      if (match) return true;
    }

    return false;
  });
}

/**
 * Convenience wrapper — returns the single best protocol or undefined.
 * Use when you only need one (e.g., protocol badge display).
 */
export function findProtocol(
  context: Parameters<typeof findProtocols>[0],
): CaptureProtocol | undefined {
  return findProtocols(context)[0];
}

// ═══════════════════════════════════════════════════════════════
// MULTI-PROTOCOL MERGE
// ═══════════════════════════════════════════════════════════════

export interface MergedCaptureStep extends CaptureStep {
  /** Which protocol this step originated from */
  sourceProtocolId: string;
  /** Section header label (shown as divider before first step of each protocol) */
  sectionLabel?: string;
}

/**
 * Merge multiple protocols into a single chronological checklist.
 *
 * Example: a free flap for skin cancer reconstruction produces:
 *   ── Excision ──
 *   Lesion overview → close-up → margins → defect → specimen
 *   ── Reconstruction ──
 *   Flap planning → harvest → anastomosis → inset → perfusion
 *
 * Rules:
 * 1. Deduplicate by tag (e.g., if both protocols have preop_clinical, keep the first)
 * 2. Each protocol's steps stay in their own order (no interleaving)
 * 3. Section divider inserted before the first step of each protocol
 * 4. Completion counter shows the combined total
 */
export function mergeProtocols(protocols: CaptureProtocol[]): {
  label: string;
  description: string;
  steps: MergedCaptureStep[];
} {
  if (protocols.length === 0) return { label: "", description: "", steps: [] };
  if (protocols.length === 1) {
    return {
      label: protocols[0]!.label,
      description: protocols[0]!.description,
      steps: protocols[0]!.steps.map((step) => ({
        ...step,
        sourceProtocolId: protocols[0]!.id,
      })),
    };
  }

  const seenTags = new Set<string>();
  const mergedSteps: MergedCaptureStep[] = [];

  for (const protocol of protocols) {
    let isFirstInSection = true;
    for (const step of protocol.steps) {
      if (seenTags.has(step.tag)) continue; // Deduplicate
      seenTags.add(step.tag);
      mergedSteps.push({
        ...step,
        sourceProtocolId: protocol.id,
        sectionLabel: isFirstInSection ? protocol.label : undefined,
      });
      isFirstInSection = false;
    }
  }

  const labels = protocols.map((p) => p.label);
  return {
    label: labels.join(" + "),
    description: `Combined: ${labels.join(", ")}`,
    steps: mergedSteps,
  };
}
