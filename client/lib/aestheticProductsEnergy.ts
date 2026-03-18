// client/lib/aestheticProductsEnergy.ts
// Static product catalogue for energy-based aesthetic devices.
// Read-only. Used by ProductPicker component.

import type { AestheticProduct, MarketRegion } from "../types/aesthetics";

// ═══════════════════════════════════════════
// ENERGY DEVICE SPEC — device-specific defaults
// for auto-populating treatment parameters
// ═══════════════════════════════════════════

export interface EnergyDeviceSpec {
  deviceId: string;
  wavelengthsNm?: number[];
  defaultFluenceJcm2?: number;
  defaultSpotSizeMm?: number;
  defaultPulseWidth?: string;
  availableHandpieces?: string[];
  // RF microneedling defaults
  defaultNeedleDepthMm?: number;
  defaultPinCount?: number;
  defaultRfMode?: string;
  // HIFU defaults
  transducerDepths?: number[];
  defaultEnergyPerLineJ?: number;
}

// ═══════════════════════════════════════════
// ENERGY DEVICE SUBCATEGORY (UI grouping)
// ═══════════════════════════════════════════

export type EnergyDeviceSubcategory =
  | "ablative_laser"
  | "fractional_nonablative"
  | "vascular_laser"
  | "pigment_laser"
  | "hair_removal_laser"
  | "rf_microneedling"
  | "monopolar_rf"
  | "hifu"
  | "ipl"
  | "cryolipolysis"
  | "plasma"
  | "body_contouring_ems";

export interface EnergyDeviceProduct extends AestheticProduct {
  subcategory: EnergyDeviceSubcategory;
}

// ═══════════════════════════════════════════
// ABLATIVE LASERS
// ═══════════════════════════════════════════

const ABLATIVE_LASERS: EnergyDeviceProduct[] = [
  { id: "energy_ultrapulse", category: "energy_device", subcategory: "ablative_laser", manufacturer: "Lumenis", brandFamily: "UltraPulse", productName: "UltraPulse (CO2 10,600nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
  { id: "energy_smartxide_dot", category: "energy_device", subcategory: "ablative_laser", manufacturer: "DEKA", brandFamily: "SmartXide", productName: "SmartXide DOT (CO2 10,600nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_contour_trl", category: "energy_device", subcategory: "ablative_laser", manufacturer: "Sciton", brandFamily: "Contour TRL", productName: "Contour TRL (Er:YAG 2,940nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
];

// ═══════════════════════════════════════════
// FRACTIONAL NON-ABLATIVE LASERS
// ═══════════════════════════════════════════

const FRACTIONAL_NONABLATIVE: EnergyDeviceProduct[] = [
  { id: "energy_fraxel_dual", category: "energy_device", subcategory: "fractional_nonablative", manufacturer: "Solta Medical (Bausch)", brandFamily: "Fraxel", productName: "Fraxel Dual (1550/1927nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_clear_brilliant", category: "energy_device", subcategory: "fractional_nonablative", manufacturer: "Solta Medical (Bausch)", brandFamily: "Clear + Brilliant", productName: "Clear + Brilliant (1440/1927nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_halo", category: "energy_device", subcategory: "fractional_nonablative", manufacturer: "Sciton", brandFamily: "HALO", productName: "HALO (1470 + 2940nm hybrid)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_moxi", category: "energy_device", subcategory: "fractional_nonablative", manufacturer: "Sciton", brandFamily: "MOXI", productName: "MOXI (1927nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
];

// ═══════════════════════════════════════════
// VASCULAR LASERS
// ═══════════════════════════════════════════

const VASCULAR_LASERS: EnergyDeviceProduct[] = [
  { id: "energy_vbeam_prima", category: "energy_device", subcategory: "vascular_laser", manufacturer: "Candela", brandFamily: "Vbeam", productName: "Vbeam Prima (PDL 595nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
  { id: "energy_excel_v_plus", category: "energy_device", subcategory: "vascular_laser", manufacturer: "Cutera", brandFamily: "excel V+", productName: "excel V+ (532/1064nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
];

// ═══════════════════════════════════════════
// PICOSECOND / PIGMENT LASERS
// ═══════════════════════════════════════════

const PIGMENT_LASERS: EnergyDeviceProduct[] = [
  { id: "energy_picosure_pro", category: "energy_device", subcategory: "pigment_laser", manufacturer: "Cynosure", brandFamily: "PicoSure", productName: "PicoSure Pro (755nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
  { id: "energy_picoway", category: "energy_device", subcategory: "pigment_laser", manufacturer: "Candela", brandFamily: "PicoWay", productName: "PicoWay (532/785/1064nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_enlighten", category: "energy_device", subcategory: "pigment_laser", manufacturer: "Cutera", brandFamily: "enlighten", productName: "enlighten III (532/670/1064nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_discovery_pico", category: "energy_device", subcategory: "pigment_laser", manufacturer: "Quanta System", brandFamily: "Discovery Pico", productName: "Discovery Pico Plus (532/694/1064nm)", regulatoryStatus: "ce_marked", availableRegions: ["eu", "au_nz", "asia"] },
];

// ═══════════════════════════════════════════
// HAIR REMOVAL LASERS
// ═══════════════════════════════════════════

const HAIR_REMOVAL_LASERS: EnergyDeviceProduct[] = [
  { id: "energy_gentlemax_pro_plus", category: "energy_device", subcategory: "hair_removal_laser", manufacturer: "Candela", brandFamily: "GentleMax Pro", productName: "GentleMax Pro Plus (755/1064nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
  { id: "energy_splendorx", category: "energy_device", subcategory: "hair_removal_laser", manufacturer: "Lumenis", brandFamily: "Splendor X", productName: "Splendor X (755/1064nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_vectus", category: "energy_device", subcategory: "hair_removal_laser", manufacturer: "Cynosure", brandFamily: "Vectus", productName: "Vectus (810nm diode)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_soprano_titanium", category: "energy_device", subcategory: "hair_removal_laser", manufacturer: "Alma Lasers", brandFamily: "Soprano", productName: "Soprano Titanium (755/810/1064nm)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
];

// ═══════════════════════════════════════════
// RF MICRONEEDLING
// ═══════════════════════════════════════════

const RF_MICRONEEDLING: EnergyDeviceProduct[] = [
  { id: "energy_morpheus8", category: "energy_device", subcategory: "rf_microneedling", manufacturer: "InMode", brandFamily: "Morpheus8", productName: "Morpheus8", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
  { id: "energy_potenza", category: "energy_device", subcategory: "rf_microneedling", manufacturer: "Cynosure", brandFamily: "Potenza", productName: "Potenza", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_genius", category: "energy_device", subcategory: "rf_microneedling", manufacturer: "Lutronic", brandFamily: "Genius", productName: "Genius", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "asia", "global"] },
  { id: "energy_vivace_ultra", category: "energy_device", subcategory: "rf_microneedling", manufacturer: "Aesthetics Biomedical", brandFamily: "Vivace", productName: "Vivace Ultra", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu"] },
  { id: "energy_secret_rf", category: "energy_device", subcategory: "rf_microneedling", manufacturer: "Cutera", brandFamily: "Secret RF", productName: "Secret RF", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_sylfirm_x", category: "energy_device", subcategory: "rf_microneedling", manufacturer: "Sillfirm (Viol)", brandFamily: "Sylfirm X", productName: "Sylfirm X", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "asia", "global"] },
];

// ═══════════════════════════════════════════
// MONOPOLAR RF
// ═══════════════════════════════════════════

const MONOPOLAR_RF: EnergyDeviceProduct[] = [
  { id: "energy_thermage_flx", category: "energy_device", subcategory: "monopolar_rf", manufacturer: "Solta Medical (Bausch)", brandFamily: "Thermage", productName: "Thermage FLX (6.78 MHz)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
  { id: "energy_exilis_ultra_360", category: "energy_device", subcategory: "monopolar_rf", manufacturer: "BTL", brandFamily: "Exilis", productName: "Exilis Ultra 360", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
];

// ═══════════════════════════════════════════
// HIFU
// ═══════════════════════════════════════════

const HIFU_DEVICES: EnergyDeviceProduct[] = [
  { id: "energy_ultherapy", category: "energy_device", subcategory: "hifu", manufacturer: "Merz Aesthetics", brandFamily: "Ultherapy", productName: "Ultherapy", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
  { id: "energy_ultraformer_iii", category: "energy_device", subcategory: "hifu", manufacturer: "Classys", brandFamily: "Ultraformer", productName: "Ultraformer III", regulatoryStatus: "ce_marked", availableRegions: ["eu", "au_nz", "asia", "global"] },
  { id: "energy_doublo_gold", category: "energy_device", subcategory: "hifu", manufacturer: "Hironic", brandFamily: "Doublo", productName: "Doublo Gold", regulatoryStatus: "ce_marked", availableRegions: ["eu", "asia"] },
];

// ═══════════════════════════════════════════
// IPL
// ═══════════════════════════════════════════

const IPL_DEVICES: EnergyDeviceProduct[] = [
  { id: "energy_bbl_hero", category: "energy_device", subcategory: "ipl", manufacturer: "Sciton", brandFamily: "BBL", productName: "BBL HERO", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_stellar_m22", category: "energy_device", subcategory: "ipl", manufacturer: "Lumenis", brandFamily: "Stellar M22", productName: "Stellar M22", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
];

// ═══════════════════════════════════════════
// CRYOLIPOLYSIS
// ═══════════════════════════════════════════

const CRYOLIPOLYSIS_DEVICES: EnergyDeviceProduct[] = [
  { id: "energy_coolsculpting_elite", category: "energy_device", subcategory: "cryolipolysis", manufacturer: "Allergan (AbbVie)", brandFamily: "CoolSculpting", productName: "CoolSculpting Elite", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
];

// ═══════════════════════════════════════════
// PLASMA
// ═══════════════════════════════════════════

const PLASMA_DEVICES: EnergyDeviceProduct[] = [
  { id: "energy_renuvion_j_plasma", category: "energy_device", subcategory: "plasma", manufacturer: "Apyx Medical", brandFamily: "Renuvion", productName: "Renuvion / J-Plasma", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "global"] },
  { id: "energy_neogen_psr", category: "energy_device", subcategory: "plasma", manufacturer: "Energist", brandFamily: "NeoGen", productName: "NeoGen PSR (nitrogen plasma)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
];

// ═══════════════════════════════════════════
// BODY CONTOURING — EMS
// ═══════════════════════════════════════════

const BODY_CONTOURING_EMS: EnergyDeviceProduct[] = [
  { id: "energy_emsculpt_neo", category: "energy_device", subcategory: "body_contouring_ems", manufacturer: "BTL", brandFamily: "Emsculpt", productName: "Emsculpt NEO (HIFEM + RF)", regulatoryStatus: "fda_approved", availableRegions: ["us", "eu", "au_nz", "global"] },
];

// ═══════════════════════════════════════════
// AGGREGATE EXPORT
// ═══════════════════════════════════════════

export const ALL_ENERGY_DEVICES: EnergyDeviceProduct[] = [
  ...ABLATIVE_LASERS,
  ...FRACTIONAL_NONABLATIVE,
  ...VASCULAR_LASERS,
  ...PIGMENT_LASERS,
  ...HAIR_REMOVAL_LASERS,
  ...RF_MICRONEEDLING,
  ...MONOPOLAR_RF,
  ...HIFU_DEVICES,
  ...IPL_DEVICES,
  ...CRYOLIPOLYSIS_DEVICES,
  ...PLASMA_DEVICES,
  ...BODY_CONTOURING_EMS,
];

// ═══════════════════════════════════════════
// DEVICE SPECS — default treatment parameters
// ═══════════════════════════════════════════

export const ENERGY_DEVICE_SPECS: Record<string, EnergyDeviceSpec> = {
  // --- Ablative lasers ---
  energy_ultrapulse: {
    deviceId: "energy_ultrapulse",
    wavelengthsNm: [10600],
    defaultSpotSizeMm: 1.3,
    defaultPulseWidth: "0.5-1ms (DeepFX)",
    availableHandpieces: ["DeepFX", "ActiveFX", "SCAAR FX", "TotalFX"],
  },
  energy_smartxide_dot: {
    deviceId: "energy_smartxide_dot",
    wavelengthsNm: [10600],
    defaultSpotSizeMm: 0.3,
    defaultPulseWidth: "0.2-2ms (DOT mode)",
    availableHandpieces: ["DOT Scanner", "Free-hand HP", "CoolPeel"],
  },
  energy_contour_trl: {
    deviceId: "energy_contour_trl",
    wavelengthsNm: [2940],
    defaultFluenceJcm2: 25,
    defaultSpotSizeMm: 4,
    defaultPulseWidth: "short (ablative)",
  },
  // --- Fractional non-ablative ---
  energy_fraxel_dual: {
    deviceId: "energy_fraxel_dual",
    wavelengthsNm: [1550, 1927],
    defaultSpotSizeMm: 0.12,
    defaultPulseWidth: "3-10ms",
  },
  energy_clear_brilliant: {
    deviceId: "energy_clear_brilliant",
    wavelengthsNm: [1440, 1927],
    defaultSpotSizeMm: 0.11,
  },
  energy_halo: {
    deviceId: "energy_halo",
    wavelengthsNm: [1470, 2940],
    defaultPulseWidth: "hybrid fractional",
  },
  energy_moxi: {
    deviceId: "energy_moxi",
    wavelengthsNm: [1927],
    defaultPulseWidth: "non-ablative fractional",
  },
  // --- Vascular lasers ---
  energy_vbeam_prima: {
    deviceId: "energy_vbeam_prima",
    wavelengthsNm: [595],
    defaultFluenceJcm2: 10,
    defaultSpotSizeMm: 10,
    defaultPulseWidth: "0.45-40ms",
    availableHandpieces: ["7mm", "10mm", "12mm"],
  },
  energy_excel_v_plus: {
    deviceId: "energy_excel_v_plus",
    wavelengthsNm: [532, 1064],
    defaultSpotSizeMm: 6,
    defaultPulseWidth: "1-60ms",
    availableHandpieces: ["Green (532nm)", "Nd:YAG (1064nm)"],
  },
  // --- Pigment / picosecond lasers ---
  energy_picosure_pro: {
    deviceId: "energy_picosure_pro",
    wavelengthsNm: [755],
    defaultFluenceJcm2: 0.71,
    defaultSpotSizeMm: 6,
    defaultPulseWidth: "750ps",
    availableHandpieces: ["Focus Lens Array", "Flat Optic", "Zoom 2-6mm"],
  },
  energy_picoway: {
    deviceId: "energy_picoway",
    wavelengthsNm: [532, 785, 1064],
    defaultSpotSizeMm: 5,
    defaultPulseWidth: "300-450ps",
    availableHandpieces: ["Resolve (fractional)", "Zoom", "Fusion (dual wavelength)"],
  },
  energy_enlighten: {
    deviceId: "energy_enlighten",
    wavelengthsNm: [532, 670, 1064],
    defaultSpotSizeMm: 5,
    defaultPulseWidth: "750ps / 2ns",
    availableHandpieces: ["Pico Genesis FX", "Standard Spot"],
  },
  energy_discovery_pico: {
    deviceId: "energy_discovery_pico",
    wavelengthsNm: [532, 694, 1064],
    defaultPulseWidth: "370-450ps",
    availableHandpieces: ["OptiPulse", "Fractional"],
  },
  // --- Hair removal lasers ---
  energy_gentlemax_pro_plus: {
    deviceId: "energy_gentlemax_pro_plus",
    wavelengthsNm: [755, 1064],
    defaultFluenceJcm2: 18,
    defaultSpotSizeMm: 24,
    defaultPulseWidth: "3ms",
    availableHandpieces: ["12mm", "15mm", "18mm", "20mm", "24mm"],
  },
  energy_splendorx: {
    deviceId: "energy_splendorx",
    wavelengthsNm: [755, 1064],
    defaultFluenceJcm2: 16,
    defaultSpotSizeMm: 27,
    defaultPulseWidth: "2-100ms",
  },
  energy_vectus: {
    deviceId: "energy_vectus",
    wavelengthsNm: [810],
    defaultFluenceJcm2: 30,
    defaultSpotSizeMm: 23,
    defaultPulseWidth: "5-300ms",
    availableHandpieces: ["Small (12x12mm)", "Large (23x38mm)"],
  },
  energy_soprano_titanium: {
    deviceId: "energy_soprano_titanium",
    wavelengthsNm: [755, 810, 1064],
    defaultSpotSizeMm: 20,
    defaultPulseWidth: "SHR (super hair removal)",
    availableHandpieces: ["Trio Cluster", "Duo (810+1064)", "Alex (755)"],
  },
  // --- RF microneedling ---
  energy_morpheus8: {
    deviceId: "energy_morpheus8",
    defaultNeedleDepthMm: 3,
    defaultPinCount: 24,
    defaultRfMode: "bipolar fractional",
    availableHandpieces: ["24-pin standard", "40-pin body", "Prime (resurfacing)"],
  },
  energy_potenza: {
    deviceId: "energy_potenza",
    defaultNeedleDepthMm: 2.5,
    defaultPinCount: 25,
    defaultRfMode: "monopolar + bipolar",
    availableHandpieces: ["1MHz monopolar", "2MHz bipolar", "Fusion (drug delivery)"],
  },
  energy_genius: {
    deviceId: "energy_genius",
    defaultNeedleDepthMm: 3.5,
    defaultPinCount: 49,
    defaultRfMode: "bipolar impedance-controlled",
  },
  energy_vivace_ultra: {
    deviceId: "energy_vivace_ultra",
    defaultNeedleDepthMm: 3.5,
    defaultPinCount: 36,
    defaultRfMode: "bipolar",
  },
  energy_secret_rf: {
    deviceId: "energy_secret_rf",
    defaultNeedleDepthMm: 3.5,
    defaultPinCount: 25,
    defaultRfMode: "bipolar fractional",
    availableHandpieces: ["25-pin (face)", "64-pin (body)"],
  },
  energy_sylfirm_x: {
    deviceId: "energy_sylfirm_x",
    defaultNeedleDepthMm: 2,
    defaultPinCount: 25,
    defaultRfMode: "pulsed wave + continuous wave",
  },
  // --- Monopolar RF ---
  energy_thermage_flx: {
    deviceId: "energy_thermage_flx",
    defaultRfMode: "monopolar capacitive 6.78MHz",
    availableHandpieces: ["Total Tip 3.0 (face)", "Total Tip 4.0 (body)", "Total Tip Eye"],
  },
  energy_exilis_ultra_360: {
    deviceId: "energy_exilis_ultra_360",
    defaultRfMode: "monopolar + ultrasound",
    availableHandpieces: ["Small (face)", "Large (body)"],
  },
  // --- HIFU ---
  energy_ultherapy: {
    deviceId: "energy_ultherapy",
    transducerDepths: [1.5, 3.0, 4.5],
    defaultEnergyPerLineJ: 1.2,
    availableHandpieces: ["DS 7-4.5 (4.5mm SMAS)", "DS 7-3.0 (3.0mm)", "DS 10-1.5 (1.5mm dermis)"],
  },
  energy_ultraformer_iii: {
    deviceId: "energy_ultraformer_iii",
    transducerDepths: [1.5, 2.0, 3.0, 4.5, 6.0, 9.0, 13.0],
    defaultEnergyPerLineJ: 1.0,
  },
  energy_doublo_gold: {
    deviceId: "energy_doublo_gold",
    transducerDepths: [1.5, 3.0, 4.5],
    defaultEnergyPerLineJ: 0.8,
  },
  // --- IPL ---
  energy_bbl_hero: {
    deviceId: "energy_bbl_hero",
    wavelengthsNm: [400, 515, 560, 590, 640, 695],
    defaultFluenceJcm2: 12,
    defaultPulseWidth: "10-30ms",
    availableHandpieces: ["Standard", "SkinTyte II", "Forever Young BBL"],
  },
  energy_stellar_m22: {
    deviceId: "energy_stellar_m22",
    wavelengthsNm: [515, 560, 590, 615, 640, 695],
    defaultFluenceJcm2: 14,
    defaultPulseWidth: "5-20ms",
    availableHandpieces: ["IPL", "ResurFX (1565nm fractional)"],
  },
  // --- Cryolipolysis ---
  energy_coolsculpting_elite: {
    deviceId: "energy_coolsculpting_elite",
    availableHandpieces: ["CoolAdvantage", "CoolAdvantage Plus", "CoolAdvantage Petite", "CoolMini", "CoolSmooth Pro"],
  },
  // --- Plasma ---
  energy_renuvion_j_plasma: {
    deviceId: "energy_renuvion_j_plasma",
    defaultRfMode: "helium plasma + RF",
    availableHandpieces: ["Subcutaneous (skin tightening)", "Open (resurfacing)"],
  },
  energy_neogen_psr: {
    deviceId: "energy_neogen_psr",
    defaultRfMode: "nitrogen plasma",
    availableHandpieces: ["Low energy (PSR)", "High energy (full resurfacing)"],
  },
  // --- Body contouring EMS ---
  energy_emsculpt_neo: {
    deviceId: "energy_emsculpt_neo",
    defaultRfMode: "HIFEM + synchronized RF",
    availableHandpieces: ["Large (abdomen/buttocks)", "Small (arms/calves)", "Edge (obliques)"],
  },
};

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

/** Look up device spec defaults by product ID */
export function getEnergyDeviceSpec(
  deviceId: string,
): EnergyDeviceSpec | undefined {
  return ENERGY_DEVICE_SPECS[deviceId];
}

/** Get all energy devices sorted by subcategory */
export function getAllEnergyDevices(): EnergyDeviceProduct[] {
  return ALL_ENERGY_DEVICES;
}

/** Filter energy devices by subcategory */
export function getEnergyDevicesBySubcategory(
  subcategory: EnergyDeviceSubcategory,
): EnergyDeviceProduct[] {
  return ALL_ENERGY_DEVICES.filter((d) => d.subcategory === subcategory);
}

/** Filter energy devices by region availability */
export function getEnergyDevicesByRegion(
  region: MarketRegion,
): EnergyDeviceProduct[] {
  return ALL_ENERGY_DEVICES.filter(
    (d) =>
      d.availableRegions.includes(region) ||
      d.availableRegions.includes("global"),
  );
}
