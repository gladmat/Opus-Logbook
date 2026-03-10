/**
 * Skin Cancer Staging Configurations
 * ═══════════════════════════════════════
 *
 * Enhanced staging configurations for all skin cancer types.
 * These entries should REPLACE the existing melanoma entry in
 * server/diagnosisStagingConfig.ts and ADD new entries for BCC, SCC,
 * Merkel cell, and Dysplastic Naevus.
 *
 * INTEGRATION:
 *   In diagnosisStagingConfig.ts, find and replace the melanoma entry:
 *     // Melanoma (Breslow Thickness & Clark Level)
 *     { snomedCtCodes: ["93655004", "189758001"], ...
 *
 *   Replace with all entries from this file (copy the array contents
 *   into the diagnosisStagingConfigs array).
 */

import type { DiagnosisStagingConfig } from "@/lib/snomedApi";

export const SKIN_CANCER_STAGING_CONFIGS: DiagnosisStagingConfig[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // MELANOMA — Enhanced (replaces existing melanoma entry)
  // ═══════════════════════════════════════════════════════════════════════
  {
    snomedCtCodes: [
      "93655004", // Malignant melanoma of skin
      "189758001", // Melanoma in situ
      "254730000", // Superficial spreading malignant melanoma of skin
      "254731001", // Nodular malignant melanoma of skin
      "302837001", // Lentigo maligna melanoma
      "254732008", // Acral lentiginous malignant melanoma of skin
      "403924008", // Desmoplastic malignant melanoma
      "276751004", // Amelanotic malignant melanoma of skin
      "1295234004", // Spitz malignant melanoma
      "302836005", // Lentigo maligna
    ],
    keywords: ["melanoma", "lentigo maligna"],
    stagingSystems: [
      {
        name: "Breslow Thickness",
        description: "Depth of invasion in millimeters (AJCC 8th Edition)",
        options: [
          {
            value: "in_situ",
            label: "In situ (0mm)",
            description: "Confined to epidermis — MIS",
          },
          {
            value: "≤0.8",
            label: "≤0.8 mm",
            description: "T1 — SLNB not routine",
          },
          {
            value: "0.81-1.0",
            label: "0.81–1.0 mm",
            description: "T1 — SLNB should be offered (≥0.8mm)",
          },
          {
            value: "1.01-2.0",
            label: "1.01–2.0 mm",
            description: "T2 — intermediate thickness",
          },
          {
            value: "2.01-4.0",
            label: "2.01–4.0 mm",
            description: "T3 — thick melanoma",
          },
          {
            value: ">4.0",
            label: ">4.0 mm",
            description: "T4 — very thick melanoma",
          },
        ],
      },
      {
        name: "Ulceration",
        description: "Histological ulceration (upstages T substage: a→b)",
        options: [
          {
            value: "absent",
            label: "Absent",
            description: "No ulceration — substage 'a'",
          },
          {
            value: "present",
            label: "Present",
            description: "Ulceration present — substage 'b'",
          },
        ],
      },
      {
        name: "Clark Level",
        description:
          "Anatomical level of invasion (optional — less used in AJCC 8th)",
        options: [
          {
            value: "I",
            label: "Level I",
            description: "Epidermis only (in situ)",
          },
          { value: "II", label: "Level II", description: "Papillary dermis" },
          {
            value: "III",
            label: "Level III",
            description: "Filling papillary dermis",
          },
          { value: "IV", label: "Level IV", description: "Reticular dermis" },
          { value: "V", label: "Level V", description: "Subcutaneous fat" },
        ],
      },
      {
        name: "Lymph Node Status",
        description: "Regional lymph node involvement",
        options: [
          { value: "not_assessed", label: "Not assessed" },
          { value: "negative", label: "N0 — Negative" },
          {
            value: "positive_micro",
            label: "N+ micrometastases",
            description: "Detected by SLNB",
          },
          {
            value: "positive_macro",
            label: "N+ macrometastases",
            description: "Clinically detected",
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BCC — Risk Stratification (NEW)
  // ═══════════════════════════════════════════════════════════════════════
  {
    snomedCtCodes: [
      "254701007", // Basal cell carcinoma of skin
      "716274007", // Nodular BCC
      "403914000", // Superficial BCC
      "403913006", // Morphoeic BCC
      "402527000", // Infiltrative BCC
      "402529002", // Micronodular BCC
      "254702000", // Basosquamous carcinoma
      "403909004", // Pigmented BCC
    ],
    keywords: ["basal cell", "bcc", "basalioma", "rodent ulcer"],
    stagingSystems: [
      {
        name: "BCC Histological Subtype",
        description: "Histological pattern — drives risk stratification",
        options: [
          {
            value: "nodular",
            label: "Nodular",
            description: "Most common, low risk",
          },
          {
            value: "superficial",
            label: "Superficial",
            description: "Low risk",
          },
          {
            value: "morphoeic",
            label: "Morphoeic (sclerosing)",
            description: "HIGH RISK — aggressive subtype",
          },
          {
            value: "infiltrative",
            label: "Infiltrative",
            description: "HIGH RISK — aggressive subtype",
          },
          {
            value: "micronodular",
            label: "Micronodular",
            description: "HIGH RISK — aggressive subtype",
          },
          {
            value: "basosquamous",
            label: "Basosquamous (metatypical)",
            description: "HIGH RISK — behaves like SCC",
          },
          {
            value: "pigmented",
            label: "Pigmented",
            description: "Usually nodular variant",
          },
          { value: "mixed", label: "Mixed subtype" },
        ],
      },
      {
        name: "Anatomical Location",
        description:
          "H-zone = central face, ears, eyelids, genitals (higher risk)",
        options: [
          {
            value: "h_zone",
            label: "H-zone (high risk)",
            description: "Central face, nose, periorbital, ears, lips, temples",
          },
          {
            value: "non_h_zone",
            label: "Non-H-zone",
            description: "Trunk, limbs, peripheral face",
          },
        ],
      },
      {
        name: "Excision Completeness",
        description: "Margin status on histology",
        options: [
          { value: "complete", label: "Complete — margins clear" },
          { value: "close", label: "Close margins (<1mm)" },
          { value: "incomplete", label: "Incomplete — tumour at margin" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SCC — Risk Stratification (NEW)
  // ═══════════════════════════════════════════════════════════════════════
  {
    snomedCtCodes: [
      "254651007", // Squamous cell carcinoma of skin
      "89906000", // Verrucous carcinoma of skin
    ],
    keywords: ["squamous cell", "scc", "verrucous carcinoma"],
    stagingSystems: [
      {
        name: "SCC Differentiation",
        description: "Histological differentiation grade — key risk factor",
        options: [
          {
            value: "well",
            label: "Well differentiated",
            description: "Lower risk",
          },
          { value: "moderate", label: "Moderately differentiated" },
          {
            value: "poor",
            label: "Poorly differentiated",
            description: "HIGH RISK",
          },
          {
            value: "undifferentiated",
            label: "Undifferentiated",
            description: "HIGH RISK",
          },
        ],
      },
      {
        name: "Anatomical Location",
        description: "H-zone = central face, ears, eyelids (higher risk)",
        options: [
          {
            value: "h_zone",
            label: "H-zone (high risk)",
            description: "Central face, nose, periorbital, ears, lips",
          },
          {
            value: "non_h_zone",
            label: "Non-H-zone",
            description: "Trunk, limbs, scalp",
          },
        ],
      },
      {
        name: "Depth of Invasion",
        description: "Tumour thickness in mm",
        options: [
          { value: "<2", label: "<2 mm", description: "Low risk" },
          { value: "2-4", label: "2–4 mm" },
          { value: "4-6", label: "4–6 mm", description: "Moderate risk" },
          { value: ">6", label: ">6 mm", description: "HIGH RISK" },
        ],
      },
      {
        name: "Perineural Invasion",
        description: "Nerve involvement on histology — significant risk factor",
        options: [
          { value: "absent", label: "Absent" },
          {
            value: "small_nerve",
            label: "Present — small calibre nerve (<0.1mm)",
          },
          {
            value: "large_nerve",
            label: "Present — large calibre nerve (≥0.1mm)",
            description: "HIGH RISK — referral recommended",
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MERKEL CELL CARCINOMA (NEW)
  // ═══════════════════════════════════════════════════════════════════════
  {
    snomedCtCodes: [
      "253001006", // Merkel cell carcinoma of skin
    ],
    keywords: ["merkel cell", "merkel", "neuroendocrine carcinoma skin"],
    stagingSystems: [
      {
        name: "Tumour Size",
        description: "Maximum dimension of primary tumour",
        options: [
          {
            value: "≤2cm",
            label: "≤2 cm",
            description: "T1 — smaller primary",
          },
          {
            value: ">2cm",
            label: ">2 cm",
            description: "T2–T3 — larger primary",
          },
          {
            value: "bone_fascia",
            label: "Invading bone/fascia",
            description: "T4 — deep invasion",
          },
        ],
      },
      {
        name: "Lymph Node Status",
        description: "Regional lymph node involvement",
        options: [
          { value: "not_assessed", label: "Not assessed" },
          { value: "negative", label: "N0 — SLNB negative" },
          { value: "positive_micro", label: "N+ micrometastases (SLNB)" },
          { value: "positive_macro", label: "N+ macrometastases (clinical)" },
          { value: "in_transit", label: "In-transit metastases" },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // DYSPLASTIC NAEVUS (NEW)
  // ═══════════════════════════════════════════════════════════════════════
  {
    snomedCtCodes: [
      "254818000", // Dysplastic naevus of skin
    ],
    keywords: ["dysplastic naevus", "dysplastic nevus", "atypical mole"],
    stagingSystems: [
      {
        name: "Atypia Grade",
        description: "Degree of cytological and architectural atypia",
        options: [
          {
            value: "mild",
            label: "Mild atypia",
            description: "Re-excision if incomplete — routine follow-up",
          },
          {
            value: "moderate",
            label: "Moderate atypia",
            description: "Re-excision recommended if margin involved",
          },
          {
            value: "severe",
            label: "Severe atypia",
            description:
              "Re-excision with clear margins — consider melanoma surveillance",
          },
        ],
      },
      {
        name: "Margin Status",
        description: "Excision completeness",
        options: [
          { value: "clear", label: "Clear (>1mm)" },
          { value: "close", label: "Close (<1mm)" },
          { value: "involved", label: "Involved — at margin" },
        ],
      },
    ],
  },
];
