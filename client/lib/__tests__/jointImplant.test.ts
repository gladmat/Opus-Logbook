import { describe, it, expect } from "vitest";
import {
  getApproachesForJoint,
  generateImplantSummary,
} from "@/types/jointImplant";
import type { JointImplantDetails } from "@/types/jointImplant";
import {
  IMPLANT_CATALOGUE,
  getImplantsForJoint,
  DIAGNOSIS_TO_INDICATION,
  PROCEDURE_TO_JOINT_TYPE,
} from "@/data/implantCatalogue";
import { PROCEDURE_PICKLIST } from "@/lib/procedurePicklist";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Catalogue filtering by joint type
// ═══════════════════════════════════════════════════════════════════════════════

describe("Catalogue filtering", () => {
  it("getImplantsForJoint('cmc1') returns only CMC1 implants", () => {
    const implants = getImplantsForJoint("cmc1");
    expect(implants.length).toBeGreaterThan(0);
    for (const entry of implants) {
      expect(entry.jointTypes).toContain("cmc1");
    }
  });

  it("getImplantsForJoint('pip') returns only PIP implants", () => {
    const implants = getImplantsForJoint("pip");
    expect(implants.length).toBeGreaterThan(0);
    for (const entry of implants) {
      expect(entry.jointTypes).toContain("pip");
    }
  });

  it("getImplantsForJoint('mcp') returns only MCP implants", () => {
    const implants = getImplantsForJoint("mcp");
    expect(implants.length).toBeGreaterThan(0);
    for (const entry of implants) {
      expect(entry.jointTypes).toContain("mcp");
    }
  });

  it("CMC1 has 11 entries (including 'other')", () => {
    const implants = getImplantsForJoint("cmc1");
    // 3 active total joints + 4 hemi/interposition + 4 discontinued + 1 other = 12
    expect(implants.length).toBe(12);
  });

  it("PIP has 8 entries (including 'other')", () => {
    const implants = getImplantsForJoint("pip");
    // 3 silicone + 5 surface replacement + 1 other = 9
    expect(implants.length).toBe(9);
  });

  it("MCP has 7 entries (including 'other')", () => {
    const implants = getImplantsForJoint("mcp");
    // 4 silicone + 2 surface replacement + 1 other = 7
    expect(implants.length).toBe(7);
  });

  it("NZ-available implants appear before non-NZ within active group", () => {
    const cmc1 = getImplantsForJoint("cmc1");
    const activeImplants = cmc1.filter((e) => !e.isDiscontinued);
    // Find first non-NZ active implant
    const firstNonNZ = activeImplants.findIndex(
      (e) => !e.availableInNZ && e.id !== "other",
    );
    const lastNZ = activeImplants.reduce(
      (last, e, i) => (e.availableInNZ ? i : last),
      -1,
    );
    if (firstNonNZ !== -1 && lastNZ !== -1) {
      expect(lastNZ).toBeLessThan(firstNonNZ);
    }
  });

  it("discontinued implants appear after active implants", () => {
    const cmc1 = getImplantsForJoint("cmc1");
    const firstDiscontinued = cmc1.findIndex((e) => e.isDiscontinued);
    const lastActive = cmc1.reduce(
      (last, e, i) => (!e.isDiscontinued && e.id !== "other" ? i : last),
      -1,
    );
    if (firstDiscontinued !== -1 && lastActive !== -1) {
      expect(lastActive).toBeLessThan(firstDiscontinued);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Approach filtering
// ═══════════════════════════════════════════════════════════════════════════════

describe("Approach filtering", () => {
  it("CMC1 has 4 approaches", () => {
    const approaches = getApproachesForJoint("cmc1");
    expect(approaches).toEqual([
      "dorsal",
      "wagner_lateral",
      "dorsoradial",
      "other",
    ]);
  });

  it("PIP has 5 approaches", () => {
    const approaches = getApproachesForJoint("pip");
    expect(approaches).toEqual([
      "dorsal_chamay",
      "dorsal_splitting",
      "volar_simmen",
      "lateral_midaxial",
      "other",
    ]);
  });

  it("MCP has 3 approaches", () => {
    const approaches = getApproachesForJoint("mcp");
    expect(approaches).toEqual([
      "dorsal_longitudinal",
      "dorsal_transverse",
      "other",
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Diagnosis-to-indication mapping
// ═══════════════════════════════════════════════════════════════════════════════

describe("Diagnosis mapping", () => {
  it("CMC1 OA maps to 'oa'", () => {
    expect(DIAGNOSIS_TO_INDICATION["hand_dx_cmc1_oa"]).toBe("oa");
  });

  it("RA MCP maps to 'ra'", () => {
    expect(DIAGNOSIS_TO_INDICATION["hand_dx_rheumatoid_mcp"]).toBe("ra");
  });

  it("Kienb\u00F6ck maps to 'avascular_necrosis'", () => {
    expect(DIAGNOSIS_TO_INDICATION["hand_dx_kienbock"]).toBe(
      "avascular_necrosis",
    );
  });

  it("Preiser maps to 'avascular_necrosis'", () => {
    expect(DIAGNOSIS_TO_INDICATION["hand_dx_preiser"]).toBe(
      "avascular_necrosis",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Procedure-to-joint-type mapping
// ═══════════════════════════════════════════════════════════════════════════════

describe("Procedure mapping", () => {
  it("CMC1 prosthesis maps to 'cmc1'", () => {
    expect(PROCEDURE_TO_JOINT_TYPE["hand_joint_cmc1_prosthesis"]).toBe("cmc1");
  });

  it("PIP arthroplasty maps to 'pip'", () => {
    expect(PROCEDURE_TO_JOINT_TYPE["hand_joint_pip_arthroplasty"]).toBe("pip");
  });

  it("MCP arthroplasty maps to 'mcp'", () => {
    expect(PROCEDURE_TO_JOINT_TYPE["hand_joint_mcp_arthroplasty"]).toBe("mcp");
  });

  it("all 3 procedure mappings exist", () => {
    expect(Object.keys(PROCEDURE_TO_JOINT_TYPE)).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Summary generation
// ═══════════════════════════════════════════════════════════════════════════════

describe("Summary generation", () => {
  it("returns null when no implant selected", () => {
    expect(generateImplantSummary(undefined, IMPLANT_CATALOGUE)).toBeNull();
    expect(
      generateImplantSummary(
        {
          jointType: "cmc1",
          indication: "oa",
          procedureType: "primary",
          implantSystemId: "",
        },
        IMPLANT_CATALOGUE,
      ),
    ).toBeNull();
  });

  it("generates summary for Touch with sizes", () => {
    const details: JointImplantDetails = {
      jointType: "cmc1",
      indication: "oa",
      procedureType: "primary",
      implantSystemId: "cmc1_touch",
      cupSize: "9mm",
      stemSize: "Size 3",
      approach: "dorsal",
    };
    const summary = generateImplantSummary(details, IMPLANT_CATALOGUE);
    expect(summary).toContain("Touch (KeriMedical)");
    expect(summary).toContain("Cup 9mm");
    expect(summary).toContain("Stem Size 3");
    expect(summary).toContain("Dorsal");
  });

  it("generates summary for Swanson with unified size", () => {
    const details: JointImplantDetails = {
      jointType: "mcp",
      indication: "ra",
      procedureType: "primary",
      implantSystemId: "mcp_swanson",
      sizeUnified: "4",
    };
    const summary = generateImplantSummary(details, IMPLANT_CATALOGUE);
    expect(summary).toContain("Swanson");
    expect(summary).toContain("Size 4");
  });

  it("uses implantSystemOther for 'other' implant", () => {
    const details: JointImplantDetails = {
      jointType: "pip",
      indication: "oa",
      procedureType: "primary",
      implantSystemId: "unknown_id",
      implantSystemOther: "Custom Implant X",
    };
    const summary = generateImplantSummary(details, IMPLANT_CATALOGUE);
    expect(summary).toBe("Custom Implant X");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. hasImplant flag on procedure picklist
// ═══════════════════════════════════════════════════════════════════════════════

describe("hasImplant flag", () => {
  const implantProcIds = [
    "hand_joint_cmc1_prosthesis",
    "hand_joint_pip_arthroplasty",
    "hand_joint_mcp_arthroplasty",
  ];

  it.each(implantProcIds)("procedure '%s' has hasImplant: true", (id) => {
    const proc = PROCEDURE_PICKLIST.find((p) => p.id === id);
    expect(proc).toBeDefined();
    expect(proc!.hasImplant).toBe(true);
  });

  const nonImplantProcIds = [
    "hand_joint_trapeziectomy",
    "hand_joint_dip_arthrodesis",
    "hand_joint_pip_arthrodesis",
    "hand_joint_wrist_arthrodesis",
  ];

  it.each(nonImplantProcIds)(
    "procedure '%s' does NOT have hasImplant",
    (id) => {
      const proc = PROCEDURE_PICKLIST.find((p) => p.id === id);
      expect(proc).toBeDefined();
      expect(proc!.hasImplant).toBeFalsy();
    },
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Size config validity
// ═══════════════════════════════════════════════════════════════════════════════

describe("Size config validity", () => {
  it("every catalogue entry has a valid size config type", () => {
    for (const entry of Object.values(IMPLANT_CATALOGUE)) {
      expect(["unified", "components", "matched"]).toContain(entry.sizes.type);
    }
  });

  it("component-type entries have cup and stem arrays", () => {
    for (const entry of Object.values(IMPLANT_CATALOGUE)) {
      if (entry.sizes.type === "components") {
        expect(Array.isArray(entry.sizes.cup)).toBe(true);
        expect(Array.isArray(entry.sizes.stem)).toBe(true);
        expect(entry.sizes.cup.length).toBeGreaterThan(0);
        expect(entry.sizes.stem.length).toBeGreaterThan(0);
      }
    }
  });

  it("Touch has 6 neck variants", () => {
    const touch = IMPLANT_CATALOGUE["cmc1_touch"];
    expect(touch).toBeDefined();
    expect(touch.sizes.type).toBe("components");
    if (touch.sizes.type === "components") {
      expect(touch.sizes.neck).toBeDefined();
      expect(touch.sizes.neck!.length).toBe(6);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. No duplicate catalogue IDs
// ═══════════════════════════════════════════════════════════════════════════════

describe("No duplicate catalogue IDs", () => {
  it("all catalogue entry IDs are unique", () => {
    const ids = Object.keys(IMPLANT_CATALOGUE);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("all entry.id values match their key in the record", () => {
    for (const [key, entry] of Object.entries(IMPLANT_CATALOGUE)) {
      expect(entry.id).toBe(key);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Auto-fill defaults
// ═══════════════════════════════════════════════════════════════════════════════

describe("Auto-fill defaults", () => {
  it("Touch defaults to uncemented + metal_on_pe_dual_mobility", () => {
    const touch = IMPLANT_CATALOGUE["cmc1_touch"];
    expect(touch.defaultFixation).toBe("uncemented");
    expect(touch.defaultBearing).toBe("metal_on_pe_dual_mobility");
  });

  it("Swanson MCP defaults to not_applicable + silicone", () => {
    const swanson = IMPLANT_CATALOGUE["mcp_swanson"];
    expect(swanson.defaultFixation).toBe("not_applicable");
    expect(swanson.defaultBearing).toBe("silicone");
  });

  it("Ascension PyroCarbon PIP defaults to pyrocarbon_on_pyrocarbon", () => {
    const ascension = IMPLANT_CATALOGUE["pip_ascension_pyrocarbon"];
    expect(ascension.defaultBearing).toBe("pyrocarbon_on_pyrocarbon");
  });

  it("Avanta SR MCP defaults to cemented", () => {
    const avanta = IMPLANT_CATALOGUE["mcp_avanta_sr"];
    expect(avanta.defaultFixation).toBe("cemented");
  });
});
