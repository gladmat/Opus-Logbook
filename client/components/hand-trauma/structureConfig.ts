import type { DigitId } from "@/types/case";

export const DIGIT_LABELS: Record<DigitId, string> = {
  I: "Thumb",
  II: "Index",
  III: "Middle",
  IV: "Ring",
  V: "Little",
};

export const ALL_DIGITS: DigitId[] = ["I", "II", "III", "IV", "V"];

export const DIGIT_FLEXOR_MAP: Record<DigitId, string[]> = {
  I: ["FPL"],
  II: ["FDP", "FDS"],
  III: ["FDP", "FDS"],
  IV: ["FDP", "FDS"],
  V: ["FDP", "FDS"],
};

export const DIGIT_EXTENSOR_MAP: Record<DigitId, string[]> = {
  I: ["EPL", "EPB", "APL"],
  II: ["EDC", "EIP"],
  III: ["EDC"],
  IV: ["EDC"],
  V: ["EDC", "EDM"],
};

export const FLEXOR_ZONES_DIGIT = ["I", "II", "III", "IV", "V"] as const;
export const FLEXOR_ZONES_THUMB = ["T1", "T2", "T3"] as const;

export const EXTENSOR_ZONES_DIGIT = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
] as const;
export const EXTENSOR_ZONES_THUMB = ["TI", "TII", "TIII", "TIV", "TV"] as const;

export const DIGIT_NERVE_MAP: Record<
  DigitId,
  { radial: string; ulnar: string }
> = {
  I: { radial: "N1", ulnar: "N2" },
  II: { radial: "N3", ulnar: "N4" },
  III: { radial: "N5", ulnar: "N6" },
  IV: { radial: "N7", ulnar: "N8" },
  V: { radial: "N9", ulnar: "N10" },
};

export const DIGIT_ARTERY_MAP: Record<
  DigitId,
  { radial: string; ulnar: string }
> = {
  I: { radial: "A1", ulnar: "A2" },
  II: { radial: "A3", ulnar: "A4" },
  III: { radial: "A5", ulnar: "A6" },
  IV: { radial: "A7", ulnar: "A8" },
  V: { radial: "A9", ulnar: "A10" },
};

export const PROXIMAL_NERVES = [
  { id: "median", label: "Median nerve" },
  { id: "ulnar", label: "Ulnar nerve" },
  { id: "radial", label: "Radial nerve / PIN / SRN" },
  { id: "dbun", label: "Dorsal branch of ulnar nerve" },
] as const;

export const PROXIMAL_ARTERIES = [
  { id: "radial_artery", label: "Radial artery" },
  { id: "ulnar_artery", label: "Ulnar artery" },
  { id: "superficial_arch", label: "Superficial palmar arch" },
  { id: "deep_arch", label: "Deep palmar arch" },
] as const;

export const NERVE_LABELS: Record<string, string> = {
  N1: "Radial digital nerve — Thumb",
  N2: "Ulnar digital nerve — Thumb",
  N3: "Radial digital nerve — Index",
  N4: "Ulnar digital nerve — Index",
  N5: "Radial digital nerve — Middle",
  N6: "Ulnar digital nerve — Middle",
  N7: "Radial digital nerve — Ring",
  N8: "Ulnar digital nerve — Ring",
  N9: "Radial digital nerve — Little",
  N10: "Ulnar digital nerve — Little",
  median: "Median nerve",
  ulnar: "Ulnar nerve",
  radial: "Radial nerve / PIN / SRN",
  dbun: "Dorsal branch of ulnar nerve",
};

export const ARTERY_LABELS: Record<string, string> = {
  A1: "Radial digital artery — Thumb",
  A2: "Ulnar digital artery — Thumb",
  A3: "Radial digital artery — Index",
  A4: "Ulnar digital artery — Index",
  A5: "Radial digital artery — Middle",
  A6: "Ulnar digital artery — Middle",
  A7: "Radial digital artery — Ring",
  A8: "Ulnar digital artery — Ring",
  A9: "Radial digital artery — Little",
  A10: "Ulnar digital artery — Little",
  radial_artery: "Radial artery",
  ulnar_artery: "Ulnar artery",
  superficial_arch: "Superficial palmar arch",
  deep_arch: "Deep palmar arch",
};

export const STRUCTURE_PROCEDURE_MAP: Record<string, string> = {
  FDP: "hand_tend_flexor_primary",
  FDS: "hand_tend_flexor_primary",
  FPL: "hand_tend_fpl_repair",
  EDC: "hand_tend_extensor_primary",
  EIP: "hand_tend_extensor_primary",
  EDM: "hand_tend_extensor_primary",
  EPL: "hand_tend_extensor_primary",
  EPB: "hand_tend_extensor_primary",
  APL: "hand_tend_extensor_primary",
  N1: "hand_nerve_digital_repair",
  N2: "hand_nerve_digital_repair",
  N3: "hand_nerve_digital_repair",
  N4: "hand_nerve_digital_repair",
  N5: "hand_nerve_digital_repair",
  N6: "hand_nerve_digital_repair",
  N7: "hand_nerve_digital_repair",
  N8: "hand_nerve_digital_repair",
  N9: "hand_nerve_digital_repair",
  N10: "hand_nerve_digital_repair",
  median: "hand_nerve_median_repair",
  ulnar: "hand_nerve_ulnar_repair",
  radial: "hand_nerve_radial_repair",
  dbun: "hand_nerve_ulnar_repair",
  A1: "hand_vasc_digital_artery_repair",
  A2: "hand_vasc_digital_artery_repair",
  A3: "hand_vasc_digital_artery_repair",
  A4: "hand_vasc_digital_artery_repair",
  A5: "hand_vasc_digital_artery_repair",
  A6: "hand_vasc_digital_artery_repair",
  A7: "hand_vasc_digital_artery_repair",
  A8: "hand_vasc_digital_artery_repair",
  A9: "hand_vasc_digital_artery_repair",
  A10: "hand_vasc_digital_artery_repair",
  radial_artery: "hand_vasc_radial_artery_repair",
  ulnar_artery: "hand_vasc_ulnar_artery_repair",
  superficial_arch: "hand_vasc_palmar_arch_repair",
  deep_arch: "hand_vasc_palmar_arch_repair",
  pip_collateral: "hand_joint_pip_collateral_repair",
  mcp1_ucl: "hand_joint_mcp_collateral_repair",
  mcp1_rcl: "hand_joint_mcp_collateral_repair",
  nail_bed: "hand_cov_nail_bed_repair",
  volar_plate: "hand_joint_volar_plate_repair",
};

export type StructureCategory =
  | "flexor_tendon"
  | "extensor_tendon"
  | "nerve"
  | "artery"
  | "ligament"
  | "other";

export const SMART_DEFAULTS: Record<string, StructureCategory[]> = {
  hand_dx_flexor_tendon_lac: ["flexor_tendon"],
  hand_dx_extensor_tendon_lac: ["extensor_tendon"],
  hand_dx_fpl_laceration: ["flexor_tendon"],
  hand_dx_epl_rupture: ["extensor_tendon"],
  hand_dx_digital_nerve_lac: ["nerve"],
  hand_dx_median_nerve_lac: ["nerve"],
  hand_dx_ulnar_nerve_lac: ["nerve"],
  hand_dx_radial_nerve_lac: ["nerve"],
  hand_dx_dbun_injury: ["nerve"],
  hand_dx_fingertip_injury: ["other"],
  hand_dx_nail_bed_injury: ["other"],
  hand_dx_digital_amputation: [
    "flexor_tendon",
    "extensor_tendon",
    "nerve",
    "artery",
    "other",
  ],
  hand_dx_complex_laceration: ["flexor_tendon", "nerve", "artery"],
  hand_dx_hand_degloving: ["other"],
};
