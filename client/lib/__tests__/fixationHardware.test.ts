/**
 * fixationHardware — data model for the FixationHardwareDetails per-procedure
 * card (K-wire gauge/count, screw system/diameter/length/count, plate
 * system/type/profile for fracture fixation / osteotomy / wrist plating).
 */

import { describe, it, expect } from "vitest";
import {
  FIXATION_HARDWARE_PROCEDURE_IDS,
  KWIRE_GAUGE_OPTIONS,
  KWIRE_GAUGE_LABELS,
  SCREW_SYSTEM_OPTIONS,
  SCREW_SYSTEM_LABELS,
  SCREW_DIAMETER_OPTIONS,
  SCREW_DIAMETER_LABELS,
  PLATE_SYSTEM_OPTIONS,
  PLATE_SYSTEM_LABELS,
  PLATE_TYPE_OPTIONS,
  PLATE_TYPE_LABELS,
  PLATE_PROFILE_OPTIONS,
  PLATE_PROFILE_LABELS,
  createEmptyFixationHardwareData,
  createEmptyKwireHardware,
  createEmptyScrewHardware,
  createEmptyPlateHardware,
  isFixationHardwareProcedure,
  getSuggestedHardwareSections,
  normalizeFixationHardware,
  getFixationHardwareSummary,
} from "@/types/fixationHardware";
import { OSTEOTOMY_PROCEDURE_IDS } from "@/types/osteotomy";
import { findPicklistEntry } from "@/lib/procedurePicklist";

describe("createEmptyFixationHardwareData", () => {
  it("returns all-null sub-entries", () => {
    expect(createEmptyFixationHardwareData()).toEqual({
      kwires: null,
      screws: null,
      plate: null,
    });
  });
});

describe("FIXATION_HARDWARE_PROCEDURE_IDS", () => {
  it("every gate ID resolves to a real procedure picklist entry", () => {
    for (const id of FIXATION_HARDWARE_PROCEDURE_IDS) {
      const entry = findPicklistEntry(id);
      expect(entry, `gate ID ${id} must resolve`).toBeTruthy();
    }
  });

  it("contains no duplicate IDs", () => {
    expect(new Set(FIXATION_HARDWARE_PROCEDURE_IDS).size).toBe(
      FIXATION_HARDWARE_PROCEDURE_IDS.length,
    );
  });

  it("is a superset of the osteotomy procedure IDs", () => {
    for (const id of OSTEOTOMY_PROCEDURE_IDS) {
      expect(FIXATION_HARDWARE_PROCEDURE_IDS).toContain(id);
    }
  });

  it("covers representative fracture, dislocation, and mallet procedures", () => {
    expect(FIXATION_HARDWARE_PROCEDURE_IDS).toContain("hand_fx_scaphoid_orif");
    expect(FIXATION_HARDWARE_PROCEDURE_IDS).toContain(
      "hand_fx_phalanx_crif_ccs",
    );
    expect(FIXATION_HARDWARE_PROCEDURE_IDS).toContain("hand_disloc_cmc_crif");
    expect(FIXATION_HARDWARE_PROCEDURE_IDS).toContain(
      "hand_fx_mallet_extension_block",
    );
    expect(FIXATION_HARDWARE_PROCEDURE_IDS).toContain(
      "hand_elective_nonunion_repair",
    );
  });

  it("excludes metal-free procedures", () => {
    expect(FIXATION_HARDWARE_PROCEDURE_IDS).not.toContain("hand_disloc_pip_cr");
    expect(FIXATION_HARDWARE_PROCEDURE_IDS).not.toContain(
      "hand_disloc_pip_volar_plate_arthroplasty",
    );
    expect(FIXATION_HARDWARE_PROCEDURE_IDS).not.toContain(
      "hand_elective_hardware_removal",
    );
  });
});

describe("isFixationHardwareProcedure", () => {
  it("matches gated fracture and dislocation IDs", () => {
    expect(isFixationHardwareProcedure("hand_fx_scaphoid_orif")).toBe(true);
    expect(isFixationHardwareProcedure("hand_disloc_cmc_crif")).toBe(true);
  });

  it("rejects undefined, null, and ungated IDs", () => {
    expect(isFixationHardwareProcedure(undefined)).toBe(false);
    expect(isFixationHardwareProcedure(null)).toBe(false);
    expect(isFixationHardwareProcedure("hand_disloc_pip_cr")).toBe(false);
    expect(isFixationHardwareProcedure("hand_tend_flexor_repair")).toBe(false);
  });
});

describe("getSuggestedHardwareSections", () => {
  it("suggests kwires for CRIF / ex-fix / K-wire procedures", () => {
    expect(getSuggestedHardwareSections("hand_fx_phalanx_crif")).toEqual([
      "kwires",
    ]);
    expect(getSuggestedHardwareSections("hand_fx_metacarpal_exfix")).toEqual([
      "kwires",
    ]);
    expect(
      getSuggestedHardwareSections("hand_disloc_druj_reduction_kwire"),
    ).toEqual(["kwires"]);
    expect(
      getSuggestedHardwareSections("hand_fx_mallet_extension_block"),
    ).toEqual(["kwires"]);
  });

  it("suggests screws for CCS / scaphoid / hemihamate procedures", () => {
    expect(getSuggestedHardwareSections("hand_fx_phalanx_crif_ccs")).toEqual([
      "screws",
    ]);
    expect(getSuggestedHardwareSections("hand_fx_scaphoid_orif")).toEqual([
      "screws",
    ]);
    expect(getSuggestedHardwareSections("hand_disloc_pip_hemihamate")).toEqual([
      "screws",
    ]);
  });

  it("suggests plate for distal radius ORIF and osteotomies", () => {
    expect(getSuggestedHardwareSections("hand_fx_distal_radius_orif")).toEqual([
      "plate",
    ]);
    for (const id of OSTEOTOMY_PROCEDURE_IDS) {
      expect(getSuggestedHardwareSections(id)).toEqual(["plate"]);
    }
  });

  it("suggests kwires + screws for perilunate ORIF", () => {
    expect(getSuggestedHardwareSections("hand_disloc_perilunate_orif")).toEqual(
      ["kwires", "screws"],
    );
  });

  it("returns empty for unknown or missing IDs", () => {
    expect(getSuggestedHardwareSections("hand_tend_flexor_repair")).toEqual([]);
    expect(getSuggestedHardwareSections(undefined)).toEqual([]);
  });

  it("prefers the osteotomy fixation hint over the ID default", () => {
    expect(
      getSuggestedHardwareSections(
        "hand_elective_corrective_osteotomy_radius",
        "headless_compression_screw",
      ),
    ).toEqual(["screws"]);
    expect(
      getSuggestedHardwareSections("hand_elective_ulna_shortening", "kwires"),
    ).toEqual(["kwires"]);
    expect(
      getSuggestedHardwareSections("hand_fx_phalanx_crif", "combination"),
    ).toEqual(["plate", "screws", "kwires"]);
  });
});

describe("normalizeFixationHardware", () => {
  it("returns undefined when entirely empty", () => {
    expect(
      normalizeFixationHardware(createEmptyFixationHardwareData()),
    ).toBeUndefined();
    expect(
      normalizeFixationHardware({
        kwires: createEmptyKwireHardware(),
        screws: createEmptyScrewHardware(),
        plate: createEmptyPlateHardware(),
      }),
    ).toBeUndefined();
  });

  it("drops all-null sub-entries but keeps substantive ones", () => {
    const result = normalizeFixationHardware({
      kwires: { gaugeMm: "1.2", count: 2 },
      screws: createEmptyScrewHardware(),
      plate: null,
    });
    expect(result).toEqual({
      kwires: { gaugeMm: "1.2", count: 2 },
      screws: null,
      plate: null,
    });
  });

  it("strips systemOther when system is not 'other'", () => {
    const result = normalizeFixationHardware({
      kwires: null,
      screws: {
        system: "acutrak",
        systemOther: "stale text",
        diameterMm: "2.4",
        lengthMm: 22,
        count: 1,
      },
      plate: null,
    });
    expect(result?.screws?.systemOther).toBeUndefined();
    expect(result?.screws?.system).toBe("acutrak");
  });

  it("keeps systemOther when system is 'other'", () => {
    const result = normalizeFixationHardware({
      kwires: null,
      screws: {
        system: "other",
        systemOther: "Skeletal Dynamics",
        diameterMm: null,
        lengthMm: null,
        count: null,
      },
      plate: null,
    });
    expect(result?.screws?.systemOther).toBe("Skeletal Dynamics");
  });

  it("treats a screws entry with only whitespace systemOther as empty", () => {
    expect(
      normalizeFixationHardware({
        kwires: null,
        screws: {
          system: null,
          systemOther: "   ",
          diameterMm: null,
          lengthMm: null,
          count: null,
        },
        plate: null,
      }),
    ).toBeUndefined();
  });
});

describe("getFixationHardwareSummary", () => {
  it("returns empty string for empty / missing data", () => {
    expect(getFixationHardwareSummary(undefined)).toBe("");
    expect(getFixationHardwareSummary(null)).toBe("");
    expect(getFixationHardwareSummary(createEmptyFixationHardwareData())).toBe(
      "",
    );
  });

  it("formats K-wires with count and gauge", () => {
    expect(
      getFixationHardwareSummary({
        kwires: { gaugeMm: "1.2", count: 2 },
        screws: null,
        plate: null,
      }),
    ).toBe("2× K-wire 1.2 mm");
  });

  it("omits the count prefix for a single wire", () => {
    expect(
      getFixationHardwareSummary({
        kwires: { gaugeMm: "1.1", count: 1 },
        screws: null,
        plate: null,
      }),
    ).toBe("K-wire 1.1 mm");
  });

  it("formats the scaphoid screw audit case", () => {
    expect(
      getFixationHardwareSummary({
        kwires: null,
        screws: {
          system: "acutrak",
          diameterMm: "2.4",
          lengthMm: 22,
          count: 1,
        },
        plate: null,
      }),
    ).toBe("Acutrak ⌀2.4 × 22 mm");
  });

  it("uses the free-text screw system name when system is 'other'", () => {
    expect(
      getFixationHardwareSummary({
        kwires: null,
        screws: {
          system: "other",
          systemOther: "Skeletal Dynamics",
          diameterMm: "2.0",
          lengthMm: null,
          count: 2,
        },
        plate: null,
      }),
    ).toBe("2× Skeletal Dynamics ⌀2.0");
  });

  it("formats plate system, type, and profile", () => {
    expect(
      getFixationHardwareSummary({
        kwires: null,
        screws: null,
        plate: {
          system: "medartis_aptus",
          plateType: "t_plate",
          profileMm: "1.5",
        },
      }),
    ).toBe("Medartis Aptus T-plate 1.5");
  });

  it("joins all three sections with a middle dot", () => {
    expect(
      getFixationHardwareSummary({
        kwires: { gaugeMm: "1.2", count: 2 },
        screws: {
          system: "acutrak",
          diameterMm: "2.4",
          lengthMm: 22,
          count: 1,
        },
        plate: {
          system: "medartis_aptus",
          plateType: "t_plate",
          profileMm: "1.5",
        },
      }),
    ).toBe(
      "2× K-wire 1.2 mm · Acutrak ⌀2.4 × 22 mm · Medartis Aptus T-plate 1.5",
    );
  });

  it("renders a bare plate when only the type is known", () => {
    expect(
      getFixationHardwareSummary({
        kwires: null,
        screws: null,
        plate: { system: null, plateType: "volar_dr", profileMm: null },
      }),
    ).toBe("volar DR plate");
  });
});

describe("label maps", () => {
  it("every option has a label", () => {
    for (const g of KWIRE_GAUGE_OPTIONS) {
      expect(KWIRE_GAUGE_LABELS[g]).toBeTruthy();
    }
    for (const s of SCREW_SYSTEM_OPTIONS) {
      expect(SCREW_SYSTEM_LABELS[s]).toBeTruthy();
    }
    for (const d of SCREW_DIAMETER_OPTIONS) {
      expect(SCREW_DIAMETER_LABELS[d]).toBeTruthy();
    }
    for (const p of PLATE_SYSTEM_OPTIONS) {
      expect(PLATE_SYSTEM_LABELS[p]).toBeTruthy();
    }
    for (const t of PLATE_TYPE_OPTIONS) {
      expect(PLATE_TYPE_LABELS[t]).toBeTruthy();
    }
    for (const p of PLATE_PROFILE_OPTIONS) {
      expect(PLATE_PROFILE_LABELS[p]).toBeTruthy();
    }
  });
});
