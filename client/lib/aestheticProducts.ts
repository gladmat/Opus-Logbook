// client/lib/aestheticProducts.ts
// Static product catalogue for injectable aesthetic products.
// Read-only. Used by ProductPicker component.

import type { AestheticProduct, MarketRegion } from "../types/aesthetics";

// ═══════════════════════════════════════════
// NEUROTOXINS
// ═══════════════════════════════════════════

export const NEUROTOXIN_PRODUCTS: AestheticProduct[] = [
  // --- FDA-Approved (US) ---
  {
    id: "ntx_botox",
    category: "neurotoxin",
    manufacturer: "Allergan (AbbVie)",
    brandFamily: "Botox",
    productName: "Botox Cosmetic (onabotulinumtoxinA)",
    activeIngredient: "onabotulinumtoxinA",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "uk", "au_nz", "asia", "latam", "global"],
  },
  {
    id: "ntx_dysport",
    category: "neurotoxin",
    manufacturer: "Galderma / Ipsen",
    brandFamily: "Dysport",
    productName: "Dysport (abobotulinumtoxinA)",
    activeIngredient: "abobotulinumtoxinA",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "uk", "au_nz", "asia", "latam", "global"],
  },
  {
    id: "ntx_xeomin",
    category: "neurotoxin",
    manufacturer: "Merz Aesthetics",
    brandFamily: "Xeomin",
    productName: "Xeomin / Bocouture (incobotulinumtoxinA)",
    activeIngredient: "incobotulinumtoxinA",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "uk", "au_nz", "asia", "global"],
  },
  {
    id: "ntx_jeuveau",
    category: "neurotoxin",
    manufacturer: "Evolus",
    brandFamily: "Jeuveau",
    productName: "Jeuveau (prabotulinumtoxinA)",
    activeIngredient: "prabotulinumtoxinA",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us"],
  },
  {
    id: "ntx_daxxify",
    category: "neurotoxin",
    manufacturer: "Revance Therapeutics",
    brandFamily: "Daxxify",
    productName: "Daxxify (daxibotulinumtoxinA-lanm)",
    activeIngredient: "daxibotulinumtoxinA-lanm",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us"],
  },
  {
    id: "ntx_letybo",
    category: "neurotoxin",
    manufacturer: "Hugel Inc.",
    brandFamily: "Letybo",
    productName: "Letybo (letibotulinumtoxinA-wlbg)",
    activeIngredient: "letibotulinumtoxinA-wlbg",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "au_nz", "asia"],
  },
  // --- Global (non-FDA) ---
  {
    id: "ntx_nuceiva",
    category: "neurotoxin",
    manufacturer: "Daewoong Pharmaceutical",
    brandFamily: "Nuceiva / Nabota",
    productName: "Nuceiva / Nabota (prabotulinumtoxinA)",
    activeIngredient: "prabotulinumtoxinA",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "asia"],
  },
  {
    id: "ntx_meditoxin",
    category: "neurotoxin",
    manufacturer: "Medytox Inc.",
    brandFamily: "Meditoxin",
    productName: "Meditoxin / Neuronox",
    activeIngredient: "botulinumtoxinA",
    regulatoryStatus: "kfda_approved",
    availableRegions: ["asia"],
  },
  {
    id: "ntx_botulax",
    category: "neurotoxin",
    manufacturer: "Hugel Inc.",
    brandFamily: "Botulax",
    productName: "Botulax",
    activeIngredient: "letibotulinumtoxinA",
    regulatoryStatus: "kfda_approved",
    availableRegions: ["asia", "latam"],
  },
  {
    id: "ntx_relatox",
    category: "neurotoxin",
    manufacturer: "Microgen NPO",
    brandFamily: "Relatox",
    productName: "Relatox",
    activeIngredient: "botulinumtoxinA",
    regulatoryStatus: "other",
    availableRegions: ["eu"], // Russia/CIS primarily
  },
];

// ═══════════════════════════════════════════
// DERMAL FILLERS — HA
// ═══════════════════════════════════════════

export const HA_FILLER_PRODUCTS: AestheticProduct[] = [
  // --- Allergan / Juvéderm ---
  {
    id: "filler_juvederm_ultra_xc",
    category: "ha_filler",
    manufacturer: "Allergan (AbbVie)",
    brandFamily: "Juvéderm",
    productName: "Ultra XC",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_juvederm_ultra_plus_xc",
    category: "ha_filler",
    manufacturer: "Allergan (AbbVie)",
    brandFamily: "Juvéderm",
    productName: "Ultra Plus XC",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_juvederm_voluma_xc",
    category: "ha_filler",
    manufacturer: "Allergan (AbbVie)",
    brandFamily: "Juvéderm",
    productName: "Voluma XC",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_juvederm_volbella_xc",
    category: "ha_filler",
    manufacturer: "Allergan (AbbVie)",
    brandFamily: "Juvéderm",
    productName: "Volbella XC",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_juvederm_vollure_xc",
    category: "ha_filler",
    manufacturer: "Allergan (AbbVie)",
    brandFamily: "Juvéderm",
    productName: "Vollure XC",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_juvederm_volux_xc",
    category: "ha_filler",
    manufacturer: "Allergan (AbbVie)",
    brandFamily: "Juvéderm",
    productName: "Volux XC",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_juvederm_skinvive",
    category: "ha_filler",
    manufacturer: "Allergan (AbbVie)",
    brandFamily: "Juvéderm",
    productName: "SkinVive",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us"],
  },
  // --- Galderma / Restylane ---
  {
    id: "filler_restylane",
    category: "ha_filler",
    manufacturer: "Galderma",
    brandFamily: "Restylane",
    productName: "Restylane-L",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_restylane_lyft",
    category: "ha_filler",
    manufacturer: "Galderma",
    brandFamily: "Restylane",
    productName: "Lyft",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_restylane_silk",
    category: "ha_filler",
    manufacturer: "Galderma",
    brandFamily: "Restylane",
    productName: "Silk",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us"],
  },
  {
    id: "filler_restylane_refyne",
    category: "ha_filler",
    manufacturer: "Galderma",
    brandFamily: "Restylane",
    productName: "Refyne",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_restylane_defyne",
    category: "ha_filler",
    manufacturer: "Galderma",
    brandFamily: "Restylane",
    productName: "Defyne",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_restylane_kysse",
    category: "ha_filler",
    manufacturer: "Galderma",
    brandFamily: "Restylane",
    productName: "Kysse",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_restylane_contour",
    category: "ha_filler",
    manufacturer: "Galderma",
    brandFamily: "Restylane",
    productName: "Contour",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "filler_restylane_eyelight",
    category: "ha_filler",
    manufacturer: "Galderma",
    brandFamily: "Restylane",
    productName: "Eyelight",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  // --- Merz / Belotero ---
  {
    id: "filler_belotero_balance",
    category: "ha_filler",
    manufacturer: "Merz Aesthetics",
    brandFamily: "Belotero",
    productName: "Balance",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "global"],
  },
  {
    id: "filler_belotero_volume",
    category: "ha_filler",
    manufacturer: "Merz Aesthetics",
    brandFamily: "Belotero",
    productName: "Volume",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "au_nz", "asia"],
  },
  {
    id: "filler_belotero_revive",
    category: "ha_filler",
    manufacturer: "Merz Aesthetics",
    brandFamily: "Belotero",
    productName: "Revive",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "au_nz", "asia"],
  },
  {
    id: "filler_belotero_intense",
    category: "ha_filler",
    manufacturer: "Merz Aesthetics",
    brandFamily: "Belotero",
    productName: "Intense",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "au_nz", "asia"],
  },
  {
    id: "filler_belotero_lips",
    category: "ha_filler",
    manufacturer: "Merz Aesthetics",
    brandFamily: "Belotero",
    productName: "Lips Shape / Contour",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "au_nz", "asia"],
  },
  // --- Teoxane / Teosyal ---
  {
    id: "filler_teosyal_rha1",
    category: "ha_filler",
    manufacturer: "Teoxane",
    brandFamily: "Teosyal",
    productName: "RHA 1",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "global"],
  },
  {
    id: "filler_teosyal_rha2",
    category: "ha_filler",
    manufacturer: "Teoxane",
    brandFamily: "Teosyal",
    productName: "RHA 2",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "global"],
  },
  {
    id: "filler_teosyal_rha3",
    category: "ha_filler",
    manufacturer: "Teoxane",
    brandFamily: "Teosyal",
    productName: "RHA 3",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "global"],
  },
  {
    id: "filler_teosyal_rha4",
    category: "ha_filler",
    manufacturer: "Teoxane",
    brandFamily: "Teosyal",
    productName: "RHA 4",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "global"],
  },
  {
    id: "filler_teosyal_redensity_ii",
    category: "ha_filler",
    manufacturer: "Teoxane",
    brandFamily: "Teosyal",
    productName: "Redensity II (tear trough)",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "au_nz", "asia"],
  },
  // --- Other FDA-approved ---
  {
    id: "filler_revanesse_versa",
    category: "ha_filler",
    manufacturer: "Prollenium",
    brandFamily: "Revanesse",
    productName: "Versa+",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us"],
  },
  // --- CE-only global ---
  {
    id: "filler_stylage_m",
    category: "ha_filler",
    manufacturer: "Vivacy",
    brandFamily: "Stylage",
    productName: "Stylage M / L / XL / Lips / Special Lips",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "asia"],
  },
  {
    id: "filler_princess_volume",
    category: "ha_filler",
    manufacturer: "Croma-Pharma",
    brandFamily: "Princess",
    productName: "Princess Volume / Filler / Rich",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "asia"],
  },
];

// ═══════════════════════════════════════════
// DERMAL FILLERS — NON-HA
// ═══════════════════════════════════════════

export const NON_HA_FILLER_PRODUCTS: AestheticProduct[] = [
  {
    id: "filler_radiesse",
    category: "non_ha_filler",
    manufacturer: "Merz Aesthetics",
    brandFamily: "Radiesse",
    productName: "Radiesse / Radiesse+ (CaHA)",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "au_nz", "global"],
  },
  {
    id: "filler_bellafill",
    category: "non_ha_filler",
    manufacturer: "Suneva Medical",
    brandFamily: "Bellafill",
    productName: "Bellafill (PMMA + bovine collagen)",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us"],
  },
  {
    id: "filler_ellanse_s",
    category: "non_ha_filler",
    manufacturer: "Sinclair / AQTIS",
    brandFamily: "Ellansé",
    productName: "Ellansé S (1yr PCL)",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "asia", "latam"],
  },
  {
    id: "filler_ellanse_m",
    category: "non_ha_filler",
    manufacturer: "Sinclair / AQTIS",
    brandFamily: "Ellansé",
    productName: "Ellansé M (2yr PCL)",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "asia", "latam"],
  },
  {
    id: "filler_ellanse_l",
    category: "non_ha_filler",
    manufacturer: "Sinclair / AQTIS",
    brandFamily: "Ellansé",
    productName: "Ellansé L (3yr PCL)",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "asia", "latam"],
  },
];

// ═══════════════════════════════════════════
// BIOSTIMULATORS
// ═══════════════════════════════════════════

export const BIOSTIMULATOR_PRODUCTS: AestheticProduct[] = [
  {
    id: "biostim_sculptra",
    category: "biostimulator",
    manufacturer: "Galderma",
    brandFamily: "Sculptra",
    productName: "Sculptra Aesthetic (PLLA)",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "au_nz", "global"],
  },
  {
    id: "biostim_profhilo",
    category: "biostimulator",
    manufacturer: "IBSA",
    brandFamily: "Profhilo",
    productName: "Profhilo (HA biostimulator)",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "uk", "au_nz", "asia"],
  },
  {
    id: "biostim_sunekos",
    category: "biostimulator",
    manufacturer: "Professional Dietetics",
    brandFamily: "Sunekos",
    productName: "Sunekos 200 / 1200",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "uk", "asia"],
  },
  {
    id: "biostim_lanluma",
    category: "biostimulator",
    manufacturer: "Sinclair",
    brandFamily: "Lanluma",
    productName: "Lanluma (PLLA body)",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "uk"],
  },
  {
    id: "biostim_juvelook",
    category: "biostimulator",
    manufacturer: "DEXLEVO",
    brandFamily: "Juvelook",
    productName: "Juvelook (PDLLA + HA)",
    regulatoryStatus: "kfda_approved",
    availableRegions: ["asia", "eu"],
  },
];

// ═══════════════════════════════════════════
// PRP SYSTEMS
// ═══════════════════════════════════════════

export const PRP_SYSTEMS: AestheticProduct[] = [
  {
    id: "prp_arthrex_angel",
    category: "prp_system",
    manufacturer: "Arthrex",
    brandFamily: "Angel",
    productName: "Angel System",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "global"],
  },
  {
    id: "prp_emcyte_pureprp",
    category: "prp_system",
    manufacturer: "EmCyte",
    brandFamily: "PurePRP",
    productName: "PurePRP SP",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu"],
  },
  {
    id: "prp_eclipse",
    category: "prp_system",
    manufacturer: "Eclipse Aesthetics",
    brandFamily: "Eclipse PRP",
    productName: "Eclipse PRP",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us"],
  },
  {
    id: "prp_regenlab",
    category: "prp_system",
    manufacturer: "Regen Lab",
    brandFamily: "RegenKit",
    productName: "RegenKit A-PRP",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "uk", "au_nz", "global"],
  },
  {
    id: "prp_harvest_smartprep",
    category: "prp_system",
    manufacturer: "Terumo / Harvest",
    brandFamily: "SmartPrep",
    productName: "SmartPrep 2",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "eu", "global"],
  },
];

// ═══════════════════════════════════════════
// THREAD LIFT PRODUCTS
// ═══════════════════════════════════════════

export const THREAD_PRODUCTS: AestheticProduct[] = [
  {
    id: "thread_mint_pdo",
    category: "thread_lift",
    manufacturer: "HansBiomed",
    brandFamily: "MINT",
    productName: "MINT Lift (PDO cog)",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us", "global"],
  },
  {
    id: "thread_novathreads",
    category: "thread_lift",
    manufacturer: "AQTIS Medical",
    brandFamily: "NovaThreads",
    productName: "NovaThreads (PDO)",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us"],
  },
  {
    id: "thread_silhouette_instalift",
    category: "thread_lift",
    manufacturer: "Sinclair / Tiger Aesthetics",
    brandFamily: "Silhouette",
    productName: "Silhouette InstaLift (PLLA cones)",
    regulatoryStatus: "fda_approved",
    availableRegions: ["us"],
  },
  {
    id: "thread_silhouette_soft",
    category: "thread_lift",
    manufacturer: "Sinclair",
    brandFamily: "Silhouette",
    productName: "Silhouette Soft (PLLA cones)",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "uk", "au_nz", "asia", "global"],
  },
  {
    id: "thread_tesslift",
    category: "thread_lift",
    manufacturer: "DKLS Co.",
    brandFamily: "TESSLift",
    productName: "TESSLift Soft (PDO mesh + cog)",
    regulatoryStatus: "ce_marked",
    availableRegions: ["eu", "asia"],
  },
];

// ═══════════════════════════════════════════
// AGGREGATE EXPORT
// ═══════════════════════════════════════════

export const ALL_INJECTABLE_PRODUCTS: AestheticProduct[] = [
  ...NEUROTOXIN_PRODUCTS,
  ...HA_FILLER_PRODUCTS,
  ...NON_HA_FILLER_PRODUCTS,
  ...BIOSTIMULATOR_PRODUCTS,
  ...PRP_SYSTEMS,
  ...THREAD_PRODUCTS,
];

/** Look up a product by ID across all catalogues */
export function getProductById(
  productId: string,
): AestheticProduct | undefined {
  return ALL_INJECTABLE_PRODUCTS.find((p) => p.id === productId);
}

/** Filter products by region availability */
export function getProductsByRegion(region: MarketRegion): AestheticProduct[] {
  return ALL_INJECTABLE_PRODUCTS.filter(
    (p) =>
      p.availableRegions.includes(region) ||
      p.availableRegions.includes("global"),
  );
}

/** Get products by category */
export function getProductsByCategory(
  category: AestheticProduct["category"],
): AestheticProduct[] {
  return ALL_INJECTABLE_PRODUCTS.filter((p) => p.category === category);
}
