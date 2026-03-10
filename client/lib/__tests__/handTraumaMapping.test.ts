import { resolveTraumaDiagnosis } from "@/lib/handTraumaMapping";
import type { FractureEntry } from "@/types/case";

function createMetacarpalFracture(
  id: string,
  digit: "II" | "III" | "IV" | "V",
  aoCode: string,
  options: Partial<FractureEntry["details"]> = {},
): FractureEntry {
  return {
    id,
    boneId: `mc-${digit}`,
    boneName: `${digit} metacarpal`,
    aoCode,
    details: {
      familyCode: "77",
      finger:
        digit === "II"
          ? "2"
          : digit === "III"
            ? "3"
            : digit === "IV"
              ? "4"
              : "5",
      segment: "2",
      ...options,
    },
  };
}

describe("hand trauma mapping pairs", () => {
  it("marks fracture pairs as single-select with one default option", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      injuryMechanism: "crush",
      affectedDigits: ["III"],
      activeCategories: ["fracture"],
      fractures: [createMetacarpalFracture("fx-1", "III", "77.3.2C")],
    });

    const fracturePair = result?.pairs.find(
      (pair) => pair.source === "fracture",
    );
    expect(fracturePair?.selectionMode).toBe("single");
    expect(
      fracturePair?.suggestedProcedures.filter(
        (procedure) => procedure.isDefault,
      ),
    ).toHaveLength(1);
  });

  it("marks thumb UCL reconstruction choices as single-select alternatives", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["I"],
      activeCategories: ["ligament"],
      injuredStructures: [
        {
          category: "ligament",
          structureId: "mcp1_ucl",
          displayName: "Thumb MCP UCL",
          digit: "I",
        },
      ],
    });

    const uclPair = result?.pairs.find((pair) =>
      pair.key.startsWith("ligament:ucl:"),
    );

    expect(uclPair?.source).toBe("ligament");
    expect(uclPair?.selectionMode).toBe("single");
    expect(
      uclPair?.suggestedProcedures.map((procedure) => procedure.isDefault),
    ).toEqual([true, false]);
  });

  it("keeps vascular repair and revascularisation complementary when perfusion is impaired", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["III"],
      activeCategories: ["vessel"],
      injuredStructures: [
        {
          category: "artery",
          structureId: "A5",
          displayName: "Radial digital artery",
          digit: "III",
          side: "radial",
        },
      ],
      perfusionStatuses: [{ digit: "III", status: "impaired" }],
    });

    const vesselPair = result?.pairs.find((pair) => pair.source === "vessel");
    expect(vesselPair?.selectionMode).toBe("multiple");
    expect(
      vesselPair?.suggestedProcedures.map(
        (procedure) => procedure.procedurePicklistId,
      ),
    ).toEqual(
      expect.arrayContaining([
        "hand_cov_revascularisation",
        "hand_vasc_digital_artery_repair",
        "hand_vasc_vein_graft",
      ]),
    );
  });

  it("offers vessel repair strategy chips without perfusion deficit", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["II"],
      activeCategories: ["vessel"],
      injuredStructures: [
        {
          category: "artery",
          structureId: "A3",
          displayName: "Radial digital artery",
          digit: "II",
          side: "radial",
        },
      ],
    });

    const vesselPair = result?.pairs.find((pair) => pair.source === "vessel");
    expect(vesselPair?.selectionMode).toBe("single");
    expect(
      vesselPair?.suggestedProcedures.map(
        (procedure) => procedure.procedurePicklistId,
      ),
    ).toEqual(
      expect.arrayContaining([
        "hand_vasc_digital_artery_repair",
        "hand_vasc_vein_graft",
      ]),
    );
    expect(vesselPair?.suggestedProcedures).toHaveLength(2);
  });

  it("keeps PIN and SRN as separate proximal nerve selections", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      activeCategories: ["nerve"],
      affectedDigits: [],
      injuredStructures: [
        {
          category: "nerve",
          structureId: "pin",
          displayName: "Posterior interosseous nerve (PIN)",
        },
        {
          category: "nerve",
          structureId: "srn",
          displayName: "Superficial radial nerve (SRN)",
        },
      ],
    });

    const nervePairs =
      result?.pairs.filter((pair) => pair.source === "nerve") ?? [];

    expect(nervePairs).toHaveLength(2);
    expect(nervePairs.map((pair) => pair.diagnosis.displayName)).toEqual(
      expect.arrayContaining([
        "Posterior interosseous nerve (PIN) injury at wrist level",
        "Superficial radial nerve (SRN) injury at wrist level",
      ]),
    );
    // Each nerve pair should offer repair/graft/conduit chips
    for (const pair of nervePairs) {
      expect(pair.selectionMode).toBe("single");
      expect(pair.suggestedProcedures).toHaveLength(3);
      expect(
        pair.suggestedProcedures.map((p) => p.procedurePicklistId),
      ).toEqual(
        expect.arrayContaining([
          "hand_nerve_radial_repair",
          "hand_nerve_graft",
          "hand_nerve_conduit",
        ]),
      );
    }
  });

  it("offers nerve repair strategy chips for digital nerves", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["II"],
      activeCategories: ["nerve"],
      injuredStructures: [
        {
          category: "nerve",
          structureId: "N3",
          displayName: "Radial digital nerve — Index",
          digit: "II",
          side: "radial",
        },
      ],
    });

    const nervePair = result?.pairs.find((pair) => pair.source === "nerve");
    expect(nervePair?.selectionMode).toBe("single");
    expect(nervePair?.suggestedProcedures).toHaveLength(3);
    expect(
      nervePair?.suggestedProcedures.map((p) => p.procedurePicklistId),
    ).toEqual(
      expect.arrayContaining([
        "hand_nerve_digital_repair",
        "hand_nerve_graft",
        "hand_nerve_conduit",
      ]),
    );
    // Primary repair should be default
    const defaultProc = nervePair?.suggestedProcedures.find((p) => p.isDefault);
    expect(defaultProc?.procedurePicklistId).toBe("hand_nerve_digital_repair");
  });

  it("suggests V-Y advancement for palmar fingertip defect", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["II"],
      activeCategories: ["soft_tissue"],
      softTissueDescriptors: [
        {
          type: "defect",
          surfaces: ["palmar"],
          zone: "fingertip",
          size: "small",
        },
      ],
    });

    const coveragePair = result?.pairs.find((pair) =>
      pair.key.startsWith("soft_tissue:defect:"),
    );
    expect(coveragePair?.source).toBe("soft_tissue");
    expect(
      coveragePair?.suggestedProcedures.map((p) => p.procedurePicklistId),
    ).toContain("hand_cov_vy_advancement");
  });

  it("suggests free flap for large dorsum defect", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "left",
      affectedDigits: [],
      activeCategories: ["soft_tissue"],
      softTissueDescriptors: [
        {
          type: "loss",
          surfaces: ["dorsal"],
          zone: "dorsum_hand",
          size: "large",
        },
      ],
    });

    const coveragePair = result?.pairs.find((pair) =>
      pair.key.startsWith("soft_tissue:loss:"),
    );
    expect(
      coveragePair?.suggestedProcedures.map((p) => p.procedurePicklistId),
    ).toContain("hand_cov_free_flap");
  });

  it("returns empty procedure suggestions when no zone is selected", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["III"],
      activeCategories: ["soft_tissue"],
      softTissueDescriptors: [
        {
          type: "degloving",
          surfaces: ["palmar"],
        },
      ],
    });

    const coveragePair = result?.pairs.find((pair) =>
      pair.key.startsWith("soft_tissue:degloving:"),
    );
    expect(coveragePair?.suggestedProcedures).toHaveLength(0);
  });

  it("routes special injuries to source 'special' with correct key prefix", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["III"],
      activeCategories: ["special"],
      isHighPressureInjection: true,
    });

    const specialPair = result?.pairs.find((pair) =>
      pair.key.startsWith("special:hpi:"),
    );
    expect(specialPair?.source).toBe("special");
    expect(specialPair).toBeDefined();
  });

  it("attaches generic coding references to mapped diagnoses and procedures", () => {
    const result = resolveTraumaDiagnosis({
      laterality: "right",
      injuryMechanism: "crush",
      affectedDigits: ["III"],
      activeCategories: ["fracture"],
      fractures: [createMetacarpalFracture("fx-1", "III", "77.3.2C")],
    });

    const fracturePair = result?.pairs.find(
      (pair) => pair.source === "fracture",
    );

    expect(fracturePair?.diagnosis.codes?.[0]).toMatchObject({
      system: "SNOMED_CT",
    });
    expect(fracturePair?.suggestedProcedures[0]?.codes?.[0]).toMatchObject({
      system: "SNOMED_CT",
    });
  });
});
