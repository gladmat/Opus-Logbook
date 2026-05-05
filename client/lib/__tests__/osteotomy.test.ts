import { describe, it, expect } from "vitest";
import {
  createEmptyOsteotomyData,
  getOsteotomySummary,
  OSTEOTOMY_PROCEDURE_IDS,
  OSTEOTOMY_BONE_LABELS,
  DEFORMITY_TYPE_LABELS,
  TECHNIQUE_LABELS,
  GRAFT_TYPE_LABELS,
  GRAFT_DONOR_SITE_LABELS,
  FIXATION_LABELS,
  MC_PHALANX_SITE_LABELS,
  DR_SITE_LABELS,
  type CorrectiveOsteotomyData,
} from "@/types/osteotomy";

// ═══════════════════════════════════════════════════════════
// createEmptyOsteotomyData
// ═══════════════════════════════════════════════════════════

describe("createEmptyOsteotomyData", () => {
  it("returns all null/empty fields", () => {
    const data = createEmptyOsteotomyData();
    expect(data.bone).toBeNull();
    expect(data.boneSite).toBeNull();
    expect(data.deformityType).toEqual([]);
    expect(data.osteotomyTechnique).toBeNull();
    expect(data.graftType).toBeNull();
    expect(data.graftDonorSite).toBeNull();
    expect(data.fixation).toBeNull();
    expect(data.threeDPlanning).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// OSTEOTOMY_PROCEDURE_IDS
// ═══════════════════════════════════════════════════════════

describe("OSTEOTOMY_PROCEDURE_IDS", () => {
  it("contains exactly the 3 corrective osteotomy procedure IDs", () => {
    expect(OSTEOTOMY_PROCEDURE_IDS).toHaveLength(3);
    expect(OSTEOTOMY_PROCEDURE_IDS).toContain(
      "hand_elective_corrective_osteotomy_hand",
    );
    expect(OSTEOTOMY_PROCEDURE_IDS).toContain(
      "hand_elective_corrective_osteotomy_radius",
    );
    expect(OSTEOTOMY_PROCEDURE_IDS).toContain("hand_elective_ulna_shortening");
  });

  it("does not include non-osteotomy procedures", () => {
    expect(OSTEOTOMY_PROCEDURE_IDS).not.toContain(
      "hand_elective_nonunion_repair",
    );
    expect(OSTEOTOMY_PROCEDURE_IDS).not.toContain(
      "hand_elective_hardware_removal",
    );
    expect(OSTEOTOMY_PROCEDURE_IDS).not.toContain(
      "hand_elective_bone_graft_hand",
    );
  });
});

// ═══════════════════════════════════════════════════════════
// Label completeness
// ═══════════════════════════════════════════════════════════

describe("Label maps", () => {
  it("OSTEOTOMY_BONE_LABELS covers all 5 bones", () => {
    expect(Object.keys(OSTEOTOMY_BONE_LABELS)).toHaveLength(5);
  });

  it("DEFORMITY_TYPE_LABELS covers all 4 types", () => {
    expect(Object.keys(DEFORMITY_TYPE_LABELS)).toHaveLength(4);
  });

  it("TECHNIQUE_LABELS covers all 7 techniques", () => {
    expect(Object.keys(TECHNIQUE_LABELS)).toHaveLength(7);
  });

  it("GRAFT_TYPE_LABELS covers all 4 graft types", () => {
    expect(Object.keys(GRAFT_TYPE_LABELS)).toHaveLength(4);
  });

  it("GRAFT_DONOR_SITE_LABELS covers all 5 donor sites", () => {
    expect(Object.keys(GRAFT_DONOR_SITE_LABELS)).toHaveLength(5);
  });

  it("FIXATION_LABELS covers all 6 fixation methods", () => {
    expect(Object.keys(FIXATION_LABELS)).toHaveLength(6);
  });

  it("MC_PHALANX_SITE_LABELS covers 4 sites", () => {
    expect(Object.keys(MC_PHALANX_SITE_LABELS)).toHaveLength(4);
  });

  it("DR_SITE_LABELS covers 2 sites", () => {
    expect(Object.keys(DR_SITE_LABELS)).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════
// getOsteotomySummary
// ═══════════════════════════════════════════════════════════

describe("getOsteotomySummary", () => {
  it("returns empty string for empty data", () => {
    expect(getOsteotomySummary(createEmptyOsteotomyData())).toBe("");
  });

  it("produces correct summary for MC rotational malunion (happy path)", () => {
    const data: CorrectiveOsteotomyData = {
      bone: "metacarpal",
      boneSite: "shaft",
      deformityType: ["rotational"],
      osteotomyTechnique: "step_cut",
      graftType: "none",
      graftDonorSite: null,
      fixation: "plate_screws",
      threeDPlanning: false,
    };
    expect(getOsteotomySummary(data)).toBe("MC, rotational, step-cut, plate");
  });

  it("produces correct summary for DR malunion with graft and 3D planning", () => {
    const data: CorrectiveOsteotomyData = {
      bone: "distal_radius",
      boneSite: "extra_articular",
      deformityType: ["angular", "shortening"],
      osteotomyTechnique: "opening_wedge",
      graftType: "autograft",
      graftDonorSite: "iliac_crest",
      fixation: "plate_screws",
      threeDPlanning: true,
    };
    expect(getOsteotomySummary(data)).toBe(
      "DR, angular + shortening, opening wedge, plate, + autograft, (3D planned)",
    );
  });

  it("handles ulna shortening summary", () => {
    const data: CorrectiveOsteotomyData = {
      bone: "distal_ulna",
      boneSite: null,
      deformityType: ["shortening"],
      osteotomyTechnique: "oblique",
      graftType: "none",
      graftDonorSite: null,
      fixation: "plate_screws",
      threeDPlanning: false,
    };
    expect(getOsteotomySummary(data)).toBe("Ulna, shortening, oblique, plate");
  });

  it("handles bone-only (partial fill)", () => {
    const data: CorrectiveOsteotomyData = {
      ...createEmptyOsteotomyData(),
      bone: "proximal_phalanx",
    };
    expect(getOsteotomySummary(data)).toBe("PP");
  });

  it("includes graft type but excludes 'none'", () => {
    const data: CorrectiveOsteotomyData = {
      ...createEmptyOsteotomyData(),
      bone: "metacarpal",
      graftType: "none",
    };
    expect(getOsteotomySummary(data)).toBe("MC");

    const withAllograft: CorrectiveOsteotomyData = {
      ...createEmptyOsteotomyData(),
      bone: "metacarpal",
      graftType: "allograft",
    };
    expect(getOsteotomySummary(withAllograft)).toBe("MC, + allograft");
  });

  it("handles combined deformity types", () => {
    const data: CorrectiveOsteotomyData = {
      ...createEmptyOsteotomyData(),
      bone: "middle_phalanx",
      deformityType: ["angular", "rotational", "shortening"],
    };
    expect(getOsteotomySummary(data)).toBe(
      "MP, angular + rotational + shortening",
    );
  });
});
