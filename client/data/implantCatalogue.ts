/**
 * Joint implant catalogue for hand arthroplasty.
 * 26 entries across CMC1, PIP, and MCP joints.
 * Includes active implants, discontinued (for revision documentation),
 * and NZ/Australasian availability flags.
 */

import type {
  ImplantJointType,
  ImplantFixation,
  ImplantBearing,
  ImplantIndication,
} from "@/types/jointImplant";

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImplantCatalogueEntry {
  id: string;
  displayName: string;
  manufacturer: string;
  jointTypes: ImplantJointType[];
  implantCategory:
    | "total_joint"
    | "hemiarthroplasty"
    | "silicone_spacer"
    | "surface_replacement"
    | "interposition";
  defaultFixation: ImplantFixation;
  defaultBearing: ImplantBearing;
  material: string;
  sizes: ImplantSizeConfig;
  isDiscontinued?: boolean;
  availableInNZ?: boolean;
  sortOrder: number;
}

export type ImplantSizeConfig =
  | { type: "unified"; options: string[] }
  | {
      type: "components";
      cup: string[];
      stem: string[];
      neck?: string[];
      liner?: string[];
    }
  | { type: "matched"; options: string[] };

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE
// ═══════════════════════════════════════════════════════════════════════════════

export const IMPLANT_CATALOGUE: Record<string, ImplantCatalogueEntry> = {
  // ═══════════════════════════════════════════════════════════════════════
  // CMC1 — TOTAL JOINT PROSTHESES (ACTIVE)
  // ═══════════════════════════════════════════════════════════════════════

  cmc1_touch: {
    id: "cmc1_touch",
    displayName: "Touch (KeriMedical)",
    manufacturer: "KeriMedical / Medartis",
    jointTypes: ["cmc1"],
    implantCategory: "total_joint",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe_dual_mobility",
    material: "Ti6Al4V stem, stainless steel cup, XLPE liner",
    sizes: {
      type: "components",
      cup: ["9mm", "10mm"],
      stem: ["Size 1", "Size 2", "Size 3", "Size 4", "Size 5", "Size 6"],
      neck: [
        "Standard straight",
        "Standard offset",
        "Short straight",
        "Short offset",
        "Long straight",
        "Long offset",
      ],
    },
    availableInNZ: true,
    sortOrder: 1,
  },
  cmc1_maia: {
    id: "cmc1_maia",
    displayName: "Ma\u00EFa (Groupe L\u00E9pine)",
    manufacturer: "Groupe L\u00E9pine",
    jointTypes: ["cmc1"],
    implantCategory: "total_joint",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe_dual_mobility",
    material: "Titanium stem + cup, HA bilayer coating, PE liner",
    sizes: {
      type: "components",
      cup: ["8mm", "9mm", "10mm"],
      stem: [
        "Size 1",
        "Size 2",
        "Size 3",
        "Size 4",
        "Size 5",
        "Size 6",
        "Size 7",
      ],
      neck: ["Small offset", "Medium offset", "Large offset"],
    },
    availableInNZ: false,
    sortOrder: 2,
  },
  cmc1_moovis: {
    id: "cmc1_moovis",
    displayName: "Moovis (Stryker)",
    manufacturer: "Stryker",
    jointTypes: ["cmc1"],
    implantCategory: "total_joint",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe_dual_mobility",
    material: "CoCr cup, Ti stem, PE insert",
    sizes: {
      type: "components",
      cup: ["8mm cemented", "9mm press-fit", "10mm threaded"],
      stem: ["XS", "S", "M", "L"],
      neck: ["S (10mm)", "M (12mm)", "L (13mm)"],
    },
    availableInNZ: false,
    sortOrder: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CMC1 — HEMIARTHROPLASTY / INTERPOSITION
  // ═══════════════════════════════════════════════════════════════════════

  cmc1_nugrip: {
    id: "cmc1_nugrip",
    displayName: "NuGrip (Integra)",
    manufacturer: "Integra LifeSciences",
    jointTypes: ["cmc1"],
    implantCategory: "hemiarthroplasty",
    defaultFixation: "uncemented",
    defaultBearing: "pyrocarbon_interposition",
    material: "Pyrocarbon head, titanium stem",
    sizes: { type: "unified", options: ["S", "M", "L"] },
    availableInNZ: true,
    sortOrder: 10,
  },
  cmc1_pi2: {
    id: "cmc1_pi2",
    displayName: "Pi2 (Stryker)",
    manufacturer: "Stryker",
    jointTypes: ["cmc1"],
    implantCategory: "interposition",
    defaultFixation: "not_applicable",
    defaultBearing: "pyrocarbon_interposition",
    material: "Pyrocarbon free spacer",
    sizes: { type: "unified", options: ["S", "M", "L"] },
    availableInNZ: false,
    sortOrder: 11,
  },
  cmc1_pyrodisk: {
    id: "cmc1_pyrodisk",
    displayName: "Pyrodisk (Integra)",
    manufacturer: "Integra LifeSciences",
    jointTypes: ["cmc1"],
    implantCategory: "interposition",
    defaultFixation: "not_applicable",
    defaultBearing: "pyrocarbon_interposition",
    material: "Pyrocarbon disc (tendon-stabilised)",
    sizes: { type: "unified", options: ["S", "M", "L"] },
    availableInNZ: true,
    sortOrder: 12,
  },
  cmc1_pyrocardan: {
    id: "cmc1_pyrocardan",
    displayName: "Pyrocardan (Stryker)",
    manufacturer: "Stryker",
    jointTypes: ["cmc1"],
    implantCategory: "interposition",
    defaultFixation: "not_applicable",
    defaultBearing: "pyrocarbon_interposition",
    material: "Pyrocarbon biconcave resurfacing spacer",
    sizes: { type: "unified", options: ["S", "M", "L"] },
    availableInNZ: false,
    sortOrder: 13,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CMC1 — DISCONTINUED (for revision case documentation)
  // ═══════════════════════════════════════════════════════════════════════

  cmc1_ivory: {
    id: "cmc1_ivory",
    displayName: "Ivory (Stryker) \u26A0 Discontinued",
    manufacturer: "Stryker (ex-Memometal)",
    jointTypes: ["cmc1"],
    implantCategory: "total_joint",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe",
    material: "CoCr/Ti, PE cup",
    sizes: {
      type: "components",
      cup: ["S", "M", "L"],
      stem: ["S", "M", "L"],
    },
    isDiscontinued: true,
    sortOrder: 50,
  },
  cmc1_arpe: {
    id: "cmc1_arpe",
    displayName: "ARPE (Zimmer Biomet) \u26A0 Discontinued",
    manufacturer: "Zimmer Biomet",
    jointTypes: ["cmc1"],
    implantCategory: "total_joint",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe",
    material: "CoCr head, PE cup, HA-coated Ti stem",
    sizes: {
      type: "components",
      cup: ["S", "M", "L"],
      stem: ["XS", "S", "M", "L"],
    },
    isDiscontinued: true,
    sortOrder: 51,
  },
  cmc1_elektra: {
    id: "cmc1_elektra",
    displayName: "Elektra (SBI) \u26A0 Discontinued",
    manufacturer: "Small Bone Innovations",
    jointTypes: ["cmc1"],
    implantCategory: "total_joint",
    defaultFixation: "uncemented",
    defaultBearing: "other",
    material: "CoCr on CoCr (metal-on-metal)",
    sizes: {
      type: "components",
      cup: ["S", "M", "L"],
      stem: ["S", "M", "L"],
    },
    isDiscontinued: true,
    sortOrder: 52,
  },
  cmc1_roseland: {
    id: "cmc1_roseland",
    displayName: "Roseland (DePuy) \u26A0 Discontinued",
    manufacturer: "DePuy",
    jointTypes: ["cmc1"],
    implantCategory: "total_joint",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe",
    material: "CoCr, PE, HA-coated",
    sizes: {
      type: "components",
      cup: ["S", "M", "L"],
      stem: ["S", "M", "L"],
    },
    isDiscontinued: true,
    sortOrder: 53,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PIP — SILICONE SPACERS
  // ═══════════════════════════════════════════════════════════════════════

  pip_swanson: {
    id: "pip_swanson",
    displayName: "Swanson Silicone PIP (Stryker)",
    manufacturer: "Stryker",
    jointTypes: ["pip"],
    implantCategory: "silicone_spacer",
    defaultFixation: "not_applicable",
    defaultBearing: "silicone",
    material: "Flexspan silicone elastomer",
    sizes: {
      type: "unified",
      options: ["00", "0", "1", "2", "3", "4", "5"],
    },
    availableInNZ: true,
    sortOrder: 1,
  },
  pip_neuflex: {
    id: "pip_neuflex",
    displayName: "NeuFlex PIP (DePuy Synthes)",
    manufacturer: "DePuy Synthes (J&J)",
    jointTypes: ["pip"],
    implantCategory: "silicone_spacer",
    defaultFixation: "not_applicable",
    defaultBearing: "silicone",
    material: "Silicone elastomer, 15\u00B0 pre-bend",
    sizes: { type: "unified", options: ["0", "1", "2", "3", "4", "5"] },
    isDiscontinued: true,
    availableInNZ: false,
    sortOrder: 2,
  },
  pip_integra_silicone: {
    id: "pip_integra_silicone",
    displayName: "Integra Silicone PIP",
    manufacturer: "Integra LifeSciences",
    jointTypes: ["pip"],
    implantCategory: "silicone_spacer",
    defaultFixation: "not_applicable",
    defaultBearing: "silicone",
    material: "Silicone elastomer",
    sizes: { type: "unified", options: ["0", "1", "2", "3", "4", "5"] },
    availableInNZ: true,
    sortOrder: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PIP — SURFACE REPLACEMENT / TOTAL JOINT
  // ═══════════════════════════════════════════════════════════════════════

  pip_capflex: {
    id: "pip_capflex",
    displayName: "CapFlex-PIP (KLS Martin)",
    manufacturer: "KLS Martin",
    jointTypes: ["pip"],
    implantCategory: "surface_replacement",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe",
    material: "CoCr proximal, UHMWPE distal, Ti stems",
    sizes: {
      type: "components",
      cup: ["S", "M", "L"],
      stem: ["S", "M", "L"],
    },
    availableInNZ: true,
    sortOrder: 10,
  },
  pip_ascension_pyrocarbon: {
    id: "pip_ascension_pyrocarbon",
    displayName: "Ascension PyroCarbon PIP (Integra)",
    manufacturer: "Integra LifeSciences (ex-Ascension)",
    jointTypes: ["pip"],
    implantCategory: "surface_replacement",
    defaultFixation: "uncemented",
    defaultBearing: "pyrocarbon_on_pyrocarbon",
    material: "PyroCarbon (graphite core + pyrolytic carbon coating)",
    sizes: { type: "matched", options: ["10", "20", "30", "40", "50"] },
    availableInNZ: true,
    sortOrder: 11,
  },
  pip_sr_pip: {
    id: "pip_sr_pip",
    displayName: "SR PIP (Stryker)",
    manufacturer: "Stryker (ex-Avanta)",
    jointTypes: ["pip"],
    implantCategory: "surface_replacement",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe",
    material: "CoCr proximal, UHMWPE/Ti distal",
    sizes: { type: "matched", options: ["XS", "S", "M", "L", "XL"] },
    availableInNZ: false,
    sortOrder: 12,
  },
  pip_tactys: {
    id: "pip_tactys",
    displayName: "TACTYS (Stryker)",
    manufacturer: "Stryker",
    jointTypes: ["pip"],
    implantCategory: "surface_replacement",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe",
    material: "PE proximal, CoCr distal, HA-coated Ti stems",
    sizes: {
      type: "components",
      cup: ["S", "M", "L"],
      stem: ["S", "M", "L"],
    },
    availableInNZ: false,
    sortOrder: 13,
  },
  pip_matortho: {
    id: "pip_matortho",
    displayName: "MatOrtho PIPR",
    manufacturer: "MatOrtho Ltd",
    jointTypes: ["pip"],
    implantCategory: "surface_replacement",
    defaultFixation: "uncemented",
    defaultBearing: "metal_on_pe",
    material: "CoCr, mobile PE insert, HA-coated stems",
    sizes: { type: "matched", options: ["S", "M", "L"] },
    availableInNZ: false,
    sortOrder: 14,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MCP — SILICONE SPACERS
  // ═══════════════════════════════════════════════════════════════════════

  mcp_swanson: {
    id: "mcp_swanson",
    displayName: "Swanson Silicone MCP (Stryker)",
    manufacturer: "Stryker",
    jointTypes: ["mcp"],
    implantCategory: "silicone_spacer",
    defaultFixation: "not_applicable",
    defaultBearing: "silicone",
    material: "Flexspan silicone elastomer (0\u00B0 neutral)",
    sizes: {
      type: "unified",
      options: ["00", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    },
    availableInNZ: true,
    sortOrder: 1,
  },
  mcp_neuflex: {
    id: "mcp_neuflex",
    displayName: "NeuFlex MCP (DePuy Synthes)",
    manufacturer: "DePuy Synthes (J&J)",
    jointTypes: ["mcp"],
    implantCategory: "silicone_spacer",
    defaultFixation: "not_applicable",
    defaultBearing: "silicone",
    material: "Silicone elastomer, 30\u00B0 pre-bend",
    sizes: {
      type: "unified",
      options: ["0", "10", "20", "30", "40", "50", "60"],
    },
    availableInNZ: true,
    sortOrder: 2,
  },
  mcp_integra_silicone: {
    id: "mcp_integra_silicone",
    displayName: "Integra Silicone MCP",
    manufacturer: "Integra LifeSciences",
    jointTypes: ["mcp"],
    implantCategory: "silicone_spacer",
    defaultFixation: "not_applicable",
    defaultBearing: "silicone",
    material: "Silicone elastomer",
    sizes: { type: "unified", options: ["1", "2", "3", "4", "5", "6"] },
    availableInNZ: true,
    sortOrder: 3,
  },
  mcp_enovis_silicone: {
    id: "mcp_enovis_silicone",
    displayName: "Enovis Silicone MCP",
    manufacturer: "Enovis (ex-DJO)",
    jointTypes: ["mcp"],
    implantCategory: "silicone_spacer",
    defaultFixation: "not_applicable",
    defaultBearing: "silicone",
    material: "Silicone elastomer (0\u00B0 neutral, volar hinge axis)",
    sizes: { type: "unified", options: ["S", "M", "L", "XL"] },
    availableInNZ: false,
    sortOrder: 4,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MCP — SURFACE REPLACEMENT / PYROCARBON
  // ═══════════════════════════════════════════════════════════════════════

  mcp_ascension_pyrocarbon: {
    id: "mcp_ascension_pyrocarbon",
    displayName: "Ascension PyroCarbon MCP (Integra)",
    manufacturer: "Integra LifeSciences (ex-Ascension)",
    jointTypes: ["mcp"],
    implantCategory: "surface_replacement",
    defaultFixation: "uncemented",
    defaultBearing: "pyrocarbon_on_pyrocarbon",
    material:
      "PyroCarbon (graphite core + pyrolytic carbon, tungsten radiopaque)",
    sizes: { type: "matched", options: ["10", "20", "30", "40", "50"] },
    availableInNZ: true,
    sortOrder: 10,
  },
  mcp_avanta_sr: {
    id: "mcp_avanta_sr",
    displayName: "Avanta / Enovis SR MCP",
    manufacturer: "Enovis (ex-Stryker/Avanta)",
    jointTypes: ["mcp"],
    implantCategory: "surface_replacement",
    defaultFixation: "cemented",
    defaultBearing: "metal_on_pe",
    material: "CoCrMo proximal, UHMWPE distal",
    sizes: { type: "matched", options: ["1", "2", "3", "4", "5"] },
    availableInNZ: false,
    sortOrder: 11,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GENERIC "OTHER"
  // ═══════════════════════════════════════════════════════════════════════

  other: {
    id: "other",
    displayName: "Other (specify)",
    manufacturer: "",
    jointTypes: ["cmc1", "pip", "mcp"],
    implantCategory: "total_joint",
    defaultFixation: "uncemented",
    defaultBearing: "other",
    material: "",
    sizes: { type: "unified", options: [] },
    sortOrder: 99,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns implant entries filtered by joint type, with active implants first
 * and discontinued implants at the end (greyed out in UI).
 */
export function getImplantsForJoint(
  joint: ImplantJointType,
): ImplantCatalogueEntry[] {
  return Object.values(IMPLANT_CATALOGUE)
    .filter((e) => e.jointTypes.includes(joint))
    .sort((a, b) => {
      // Active before discontinued
      if (a.isDiscontinued && !b.isDiscontinued) return 1;
      if (!a.isDiscontinued && b.isDiscontinued) return -1;
      // NZ-available first within active
      if (a.availableInNZ && !b.availableInNZ) return -1;
      if (!a.availableInNZ && b.availableInNZ) return 1;
      return a.sortOrder - b.sortOrder;
    });
}

/**
 * Maps a diagnosis to an implant indication.
 */
export const DIAGNOSIS_TO_INDICATION: Record<string, ImplantIndication> = {
  hand_dx_cmc1_oa: "oa",
  hand_dx_pip_oa: "oa",
  hand_dx_mcp_oa: "oa",
  hand_dx_dip_oa: "oa",
  hand_dx_rheumatoid_mcp: "ra",
  hand_dx_wrist_oa: "oa",
  hand_dx_preiser: "avascular_necrosis",
  hand_dx_kienbock: "avascular_necrosis",
};

/**
 * Maps a procedure ID to its implant joint type.
 */
export const PROCEDURE_TO_JOINT_TYPE: Record<string, ImplantJointType> = {
  hand_joint_cmc1_prosthesis: "cmc1",
  hand_joint_pip_arthroplasty: "pip",
  hand_joint_mcp_arthroplasty: "mcp",
};
