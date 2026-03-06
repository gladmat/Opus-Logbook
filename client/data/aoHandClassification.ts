// AO/OTA 2018 Hand & Carpus Classification (Region 7)
// Based on AO Foundation fracture classification guidelines

export interface BoneType {
  label: string;
  code: string;
  supportsQualifications?: boolean;
}

export interface Qualification {
  code: string;
  label: string;
}

export interface CarpalBone {
  familyCode: string;
  name: string;
  kind: "carpal_single";
  types: Record<string, BoneType>;
  qualifications?: {
    format: string;
    options: Record<string, string>;
  };
}

export interface OtherCarpalSubBone {
  name: string;
  typeCodes: Record<string, string>;
  typeLabels: Record<string, string>;
}

export interface OtherCarpalBone {
  familyCode: string;
  name: string;
  kind: "carpal_other_with_subbone";
  subBones: Record<string, OtherCarpalSubBone>;
}

export interface LongBone {
  familyCode: string;
  name: string;
  kind: "metacarpal_long_bone" | "phalanx_long_bone";
  identifiers?: Record<string, string>;
  fingers?: Record<string, string>;
  phalanges?: Record<string, string>;
  segments: Record<string, string>;
  typeRulesBySegment: Record<string, Record<string, string>>;
  codeTemplate: string;
}

export interface CrushBone {
  familyCode: string;
  name: string;
  kind: "crush_multiple";
  code: string;
}

export type Bone = CarpalBone | OtherCarpalBone | LongBone | CrushBone;

export interface AOHandClassification {
  region: {
    id: string;
    name: string;
  };
  bones: Bone[];
}

export const AO_HAND_CLASSIFICATION: AOHandClassification = {
  region: {
    id: "7",
    name: "Hand and carpus",
  },
  bones: [
    {
      familyCode: "71",
      name: "Lunate",
      kind: "carpal_single",
      types: {
        A: { label: "Avulsion fracture", code: "71A" },
        B: { label: "Simple fracture", code: "71B" },
        C: { label: "Multifragmentary fracture", code: "71C" },
      },
    },
    {
      familyCode: "72",
      name: "Scaphoid",
      kind: "carpal_single",
      types: {
        A: { label: "Avulsion fracture", code: "72A" },
        B: {
          label: "Simple fracture",
          code: "72B*",
          supportsQualifications: true,
        },
        C: {
          label: "Multifragmentary fracture",
          code: "72C*",
          supportsQualifications: true,
        },
      },
      qualifications: {
        format: "round_brackets_lowercase_letters",
        options: {
          a: "Proximal pole",
          b: "Waist",
          c: "Distal pole",
        },
      },
    },
    {
      familyCode: "73",
      name: "Capitate",
      kind: "carpal_single",
      types: {
        A: { label: "Avulsion fracture", code: "73A" },
        B: { label: "Simple fracture", code: "73B" },
        C: { label: "Multifragmentary fracture", code: "73C" },
      },
    },
    {
      familyCode: "74",
      name: "Hamate",
      kind: "carpal_single",
      types: {
        A: { label: "Hook fracture", code: "74A" },
        B: { label: "Simple fracture", code: "74B" },
        C: { label: "Multifragmentary fracture", code: "74C" },
      },
    },
    {
      familyCode: "75",
      name: "Trapezium",
      kind: "carpal_single",
      types: {
        A: { label: "Avulsion fracture", code: "75A" },
        B: { label: "Simple fracture", code: "75B" },
        C: { label: "Multifragmentary fracture", code: "75C" },
      },
    },
    {
      familyCode: "76",
      name: "Other carpal bones",
      kind: "carpal_other_with_subbone",
      subBones: {
        "1": {
          name: "Pisiform",
          typeCodes: { A: "76.1.A", B: "76.1.B", C: "76.1.C" },
          typeLabels: {
            A: "Avulsion fracture",
            B: "Simple fracture",
            C: "Multifragmentary fracture",
          },
        },
        "2": {
          name: "Triquetrum",
          typeCodes: { A: "76.2.A", B: "76.2.B", C: "76.2.C" },
          typeLabels: {
            A: "Avulsion fracture",
            B: "Simple fracture",
            C: "Multifragmentary fracture",
          },
        },
        "3": {
          name: "Trapezoid",
          typeCodes: { A: "76.3.A", B: "76.3.B", C: "76.3.C" },
          typeLabels: {
            A: "Avulsion fracture",
            B: "Simple fracture",
            C: "Multifragmentary fracture",
          },
        },
      },
    },
    {
      familyCode: "77",
      name: "Metacarpal",
      kind: "metacarpal_long_bone",
      identifiers: {
        "1": "Thumb",
        "2": "Index",
        "3": "Long/Middle",
        "4": "Ring",
        "5": "Little",
      },
      segments: {
        "1": "Proximal end (base)",
        "2": "Diaphysis (shaft)",
        "3": "Distal end (head)",
      },
      typeRulesBySegment: {
        "1": {
          A: "Extraarticular fracture",
          B: "Partial articular fracture",
          C: "Complete articular fracture",
        },
        "2": {
          A: "Simple fracture",
          B: "Wedge fracture",
          C: "Multifragmentary fracture",
        },
        "3": {
          A: "Extraarticular fracture",
          B: "Partial articular fracture",
          C: "Complete articular fracture",
        },
      },
      codeTemplate: "77.{metacarpal}.{segment}{type}",
    },
    {
      familyCode: "78",
      name: "Phalanx",
      kind: "phalanx_long_bone",
      fingers: {
        "1": "Thumb",
        "2": "Index",
        "3": "Long/Middle",
        "4": "Ring",
        "5": "Little",
      },
      phalanges: { "1": "Proximal", "2": "Middle", "3": "Distal" },
      segments: {
        "1": "Proximal end (base)",
        "2": "Diaphysis (shaft)",
        "3": "Distal end (head)",
      },
      typeRulesBySegment: {
        "1": {
          A: "Extraarticular fracture",
          B: "Partial articular fracture",
          C: "Complete articular fracture",
        },
        "2": {
          A: "Simple fracture",
          B: "Wedge fracture",
          C: "Multifragmentary fracture",
        },
        "3": {
          A: "Extraarticular fracture",
          B: "Partial articular fracture",
          C: "Complete articular fracture",
        },
      },
      codeTemplate: "78.{finger}.{phalanx}.{segment}{type}",
    },
    {
      familyCode: "79",
      name: "Crushed / Multiple fractures",
      kind: "crush_multiple",
      code: "79",
    },
  ],
};

// Bone position data for visual hand diagram (dorsal view, left hand)
// Coordinates are relative percentages for responsive SVG
export interface BonePosition {
  id: string;
  name: string;
  familyCode: string;
  subBoneId?: string;
  finger?: string;
  phalanx?: string;
  path: string; // SVG path data
  labelPosition: { x: number; y: number };
}

// Finger identifiers
export const FINGER_NAMES: Record<string, string> = {
  "1": "Thumb",
  "2": "Index",
  "3": "Middle",
  "4": "Ring",
  "5": "Little",
};

// Phalanx names
export const PHALANX_NAMES: Record<string, string> = {
  "1": "Proximal",
  "2": "Middle",
  "3": "Distal",
};

// Segment names
export const SEGMENT_NAMES: Record<string, string> = {
  "1": "Base (proximal)",
  "2": "Shaft (diaphysis)",
  "3": "Head (distal)",
};

// Generate AO code from selections
export function generateAOCode(params: {
  familyCode: string;
  type?: string;
  subBoneId?: string;
  finger?: string;
  phalanx?: string;
  segment?: string;
  qualifications?: string[];
}): string {
  const {
    familyCode,
    type,
    subBoneId,
    finger,
    phalanx,
    segment,
    qualifications,
  } = params;

  // Crush/multiple
  if (familyCode === "79") {
    return "79";
  }

  // Carpal single bones (71-75)
  if (["71", "72", "73", "74", "75"].includes(familyCode)) {
    let code = `${familyCode}${type || ""}`;
    // Handle scaphoid qualifications
    if (
      familyCode === "72" &&
      (type === "B" || type === "C") &&
      qualifications &&
      qualifications.length > 0
    ) {
      code = `${familyCode}${type}(${qualifications.join(",")})`;
    }
    return code;
  }

  // Other carpal bones (76.x.X)
  if (familyCode === "76" && subBoneId) {
    return `76.${subBoneId}.${type || ""}`;
  }

  // Metacarpal (77.finger.segment + type)
  if (familyCode === "77" && finger && segment) {
    return `77.${finger}.${segment}${type || ""}`;
  }

  // Phalanx (78.finger.phalanx.segment + type)
  if (familyCode === "78" && finger && phalanx && segment) {
    return `78.${finger}.${phalanx}.${segment}${type || ""}`;
  }

  return familyCode;
}

// Validate AO code format
export function validateAOCode(code: string): {
  valid: boolean;
  error?: string;
} {
  const patterns: Record<string, RegExp> = {
    lunate: /^71[ABC]$/,
    scaphoid: /^72[ABC](\([abc](,[abc])*\))?$/,
    capitate: /^73[ABC]$/,
    hamate: /^74[ABC]$/,
    trapezium: /^75[ABC]$/,
    otherCarpal: /^76\.[123]\.[ABC]$/,
    metacarpal: /^77\.[1-5]\.[1-3][ABC]$/,
    phalanx: /^78\.[1-5]\.[1-3]\.[1-3][ABC]$/,
    crush: /^79$/,
  };

  for (const [, pattern] of Object.entries(patterns)) {
    if (pattern.test(code)) {
      return { valid: true };
    }
  }

  return { valid: false, error: "Invalid AO code format" };
}

// Parse AO code to get bone details
export function parseAOCode(code: string): {
  familyCode: string;
  boneName: string;
  type?: string;
  subBoneId?: string;
  finger?: string;
  phalanx?: string;
  segment?: string;
  qualifications?: string[];
} | null {
  // Crush
  if (code === "79") {
    return { familyCode: "79", boneName: "Crushed / Multiple fractures" };
  }

  // Carpal single (71-75)
  const carpalMatch = code.match(/^(7[1-5])([ABC])(\(([abc,]+)\))?$/);
  if (carpalMatch) {
    const boneNames: Record<string, string> = {
      "71": "Lunate",
      "72": "Scaphoid",
      "73": "Capitate",
      "74": "Hamate",
      "75": "Trapezium",
    };
    return {
      familyCode: carpalMatch[1]!,
      boneName: boneNames[carpalMatch[1]!] ?? "Unknown",
      type: carpalMatch[2],
      qualifications: carpalMatch[4]?.split(","),
    };
  }

  // Other carpal (76.x.X)
  const otherCarpalMatch = code.match(/^76\.([123])\.([ABC])$/);
  if (otherCarpalMatch) {
    const subBoneNames: Record<string, string> = {
      "1": "Pisiform",
      "2": "Triquetrum",
      "3": "Trapezoid",
    };
    return {
      familyCode: "76",
      boneName: subBoneNames[otherCarpalMatch[1]!] ?? "Unknown",
      subBoneId: otherCarpalMatch[1],
      type: otherCarpalMatch[2],
    };
  }

  // Metacarpal (77.finger.segment + type)
  const metacarpalMatch = code.match(/^77\.([1-5])\.([1-3])([ABC])$/);
  if (metacarpalMatch) {
    return {
      familyCode: "77",
      boneName: `${FINGER_NAMES[metacarpalMatch[1]!] ?? "Unknown"} Metacarpal`,
      finger: metacarpalMatch[1],
      segment: metacarpalMatch[2],
      type: metacarpalMatch[3],
    };
  }

  // Phalanx (78.finger.phalanx.segment + type)
  const phalanxMatch = code.match(/^78\.([1-5])\.([1-3])\.([1-3])([ABC])$/);
  if (phalanxMatch) {
    return {
      familyCode: "78",
      boneName: `${FINGER_NAMES[phalanxMatch[1]!] ?? "Unknown"} ${PHALANX_NAMES[phalanxMatch[2]!] ?? "Unknown"} Phalanx`,
      finger: phalanxMatch[1],
      phalanx: phalanxMatch[2],
      segment: phalanxMatch[3],
      type: phalanxMatch[4],
    };
  }

  return null;
}

// Get fracture type label
export function getFractureTypeLabel(segment: string, type: string): string {
  if (segment === "2") {
    // Diaphyseal
    const labels: Record<string, string> = {
      A: "Simple fracture",
      B: "Wedge fracture",
      C: "Multifragmentary fracture",
    };
    return labels[type] || type;
  } else {
    // Articular (segment 1 or 3)
    const labels: Record<string, string> = {
      A: "Extraarticular fracture",
      B: "Partial articular fracture",
      C: "Complete articular fracture",
    };
    return labels[type] || type;
  }
}
