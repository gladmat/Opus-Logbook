import { Specialty, FreeFlapDetails } from "@/types/case";

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  unit?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  conditionalOn?: { field: string; value: unknown };
}

export interface ProcedureModuleConfig {
  id: Specialty;
  displayName: string;
  icon: string;
  aiPrompt: string;
  fields: FieldConfig[];
}

export const BREAST_CONFIG: ProcedureModuleConfig = {
  id: "breast",
  displayName: "Breast",
  icon: "heart",
  aiPrompt: `You are a medical data extraction assistant specialized in breast surgery.
Extract the following information from the operation note:
- Procedure type (reconstruction, reduction, augmentation, etc.)
- Reconstruction method if applicable (DIEP, LD, implant, TRAM)
- Laterality (left, right, bilateral)
- Implant details if used (type, size, position)
- Flap details if applicable
- Sentinel lymph node biopsy performed

Return the data as JSON.`,
  fields: [
    {
      key: "laterality",
      label: "Side",
      type: "select",
      options: [
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
        { value: "bilateral", label: "Bilateral" },
      ],
      required: true,
    },
    {
      key: "implantType",
      label: "Implant Type",
      type: "select",
      options: [
        { value: "silicone", label: "Silicone" },
        { value: "saline", label: "Saline" },
        { value: "expander", label: "Tissue Expander" },
        { value: "none", label: "No Implant" },
      ],
    },
    {
      key: "implantSizeCc",
      label: "Implant Size",
      type: "number",
      unit: "cc",
      keyboardType: "numeric",
    },
  ],
};

export const HAND_SURGERY_CONFIG: ProcedureModuleConfig = {
  id: "hand_surgery",
  displayName: "Hand Surgery",
  icon: "edit-3",
  aiPrompt: "Extract hand surgery details...",
  fields: [
    {
      key: "injuryMechanism",
      label: "Injury Mechanism",
      type: "select",
      options: [
        { value: "fall", label: "Fall" },
        { value: "crush", label: "Crush injury" },
        { value: "saw_blade", label: "Saw/blade injury" },
        { value: "punch_assault", label: "Punch/assault" },
        { value: "sports", label: "Sports injury" },
        { value: "mva", label: "Motor vehicle accident" },
        { value: "work_related", label: "Work-related" },
        { value: "other", label: "Other" },
      ],
    },
  ],
};

export const BODY_CONTOURING_CONFIG: ProcedureModuleConfig = {
  id: "body_contouring",
  displayName: "Body Contouring",
  icon: "user",
  aiPrompt: "Extract body contouring surgical details...",
  fields: [
    {
      key: "resectionWeightGrams",
      label: "Resection Weight",
      type: "number",
      unit: "g",
      keyboardType: "numeric",
    },
    {
      key: "drainOutputMl",
      label: "Drain Output",
      type: "number",
      unit: "mL",
      keyboardType: "numeric",
    },
  ],
};

export const ORTHOPLASTIC_CONFIG: ProcedureModuleConfig = {
  id: "orthoplastic",
  displayName: "Orthoplastic",
  icon: "activity",
  aiPrompt: `You are a medical data extraction assistant specialized in orthoplastic surgery.
Extract the following information from the operation note:
- Defect location and size
- Coverage method (free flap, pedicled flap, local flap, skin graft)
- Flap type if applicable
- Fracture classification if applicable (Gustilo-Anderson)
- Bone involvement
- Vascular status

Return the data as JSON.`,
  fields: [
    {
      key: "defectLocation",
      label: "Defect Location",
      type: "text",
      placeholder: "e.g., Anterior tibia",
    },
    {
      key: "defectSizeCm",
      label: "Defect Size",
      type: "text",
      placeholder: "e.g., 10 x 5 cm",
    },
    {
      key: "gustiloAnderson",
      label: "Gustilo-Anderson Grade",
      type: "select",
      options: [
        { value: "I", label: "Grade I" },
        { value: "II", label: "Grade II" },
        { value: "IIIa", label: "Grade IIIa" },
        { value: "IIIb", label: "Grade IIIb" },
        { value: "IIIc", label: "Grade IIIc" },
        { value: "na", label: "N/A" },
      ],
    },
    {
      key: "ischemiaTimeMinutes",
      label: "Ischemia Time",
      type: "number",
      unit: "min",
      keyboardType: "numeric",
    },
  ],
};

export const HEAD_NECK_CONFIG: ProcedureModuleConfig = {
  id: "head_neck",
  displayName: "Head & Neck",
  icon: "mic",
  aiPrompt: `You are a medical data extraction assistant specialized in head & neck reconstructive surgery.
Extract the following information from the operation note:
- Primary tumor site
- Defect location and size
- Reconstruction method
- Flap type if applicable
- Neck dissection performed and levels
- Tracheostomy performed

Return the data as JSON.`,
  fields: [
    {
      key: "tumorSite",
      label: "Primary Tumor Site",
      type: "text",
      placeholder: "e.g., Floor of mouth",
    },
    {
      key: "neckDissection",
      label: "Neck Dissection",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "selective", label: "Selective (I-III)" },
        { value: "modified_radical", label: "Modified Radical" },
        { value: "radical", label: "Radical" },
      ],
    },
    {
      key: "tracheostomy",
      label: "Tracheostomy",
      type: "boolean",
    },
  ],
};

export const PROCEDURE_CONFIGS: Record<Specialty, ProcedureModuleConfig> = {
  breast: BREAST_CONFIG,
  body_contouring: BODY_CONTOURING_CONFIG,
  aesthetics: {
    id: "aesthetics",
    displayName: "Aesthetics",
    icon: "star",
    aiPrompt: "Extract aesthetic surgery details...",
    fields: [],
  },
  hand_surgery: HAND_SURGERY_CONFIG,
  orthoplastic: ORTHOPLASTIC_CONFIG,
  burns: {
    id: "burns",
    displayName: "Burns",
    icon: "thermometer",
    aiPrompt: "Extract burn surgery details...",
    fields: [],
  },
  general: {
    id: "general",
    displayName: "General",
    icon: "clipboard",
    aiPrompt: "Extract general plastic surgery details...",
    fields: [
      {
        key: "histologyDiagnosis",
        label: "Histology Diagnosis",
        type: "text",
        placeholder: "e.g., Basal cell carcinoma, nodular type",
      },
      {
        key: "peripheralMarginMm",
        label: "Peripheral Margin",
        type: "number",
        unit: "mm",
        keyboardType: "decimal-pad",
      },
      {
        key: "deepMarginMm",
        label: "Deep Margin",
        type: "number",
        unit: "mm",
        keyboardType: "decimal-pad",
      },
      {
        key: "excisionCompleteness",
        label: "Excision Completeness",
        type: "select",
        options: [
          { value: "complete", label: "Complete" },
          { value: "incomplete", label: "Incomplete" },
          { value: "uncertain", label: "Uncertain" },
        ],
      },
    ],
  },
  head_neck: HEAD_NECK_CONFIG,
};

export function getConfigForSpecialty(
  specialty: Specialty,
): ProcedureModuleConfig {
  return PROCEDURE_CONFIGS[specialty];
}

export function getDefaultClinicalDetails(
  specialty: Specialty,
): Record<string, unknown> {
  const config = PROCEDURE_CONFIGS[specialty];
  const defaults: Record<string, unknown> = {};

  config.fields.forEach((field) => {
    if (field.type === "boolean") {
      defaults[field.key] = false;
    } else if (field.type === "number") {
      defaults[field.key] = undefined;
    } else {
      defaults[field.key] = "";
    }
  });

  return defaults;
}
