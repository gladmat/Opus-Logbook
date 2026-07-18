import {
  buildSelectionFromGroup,
  generateHandTraumaDiagnosis,
  type HandTraumaDiagnosisSelection,
} from "@/lib/handTraumaDiagnosis";
import type { DiagnosisGroup, FractureEntry } from "@/types/case";

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

describe("hand trauma diagnosis generation", () => {
  it("keeps bullet categories in deterministic order", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["III"],
      fractures: [
        {
          id: "p2",
          boneId: "p2-base",
          boneName: "Middle phalanx base",
          aoCode: "78.3.1B",
          details: {
            familyCode: "78",
            finger: "3",
            phalanx: "2",
            segment: "1",
          },
        },
      ],
      dislocations: [{ joint: "pip", digit: "III", hasFracture: true }],
      injuredStructures: [
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "III",
          completeness: "complete",
        },
        {
          category: "nerve",
          structureId: "N5",
          displayName: "N5",
          digit: "III",
          side: "radial",
        },
        {
          category: "artery",
          structureId: "A5",
          displayName: "A5",
          digit: "III",
          side: "radial",
        },
      ],
      perfusionStatuses: [{ digit: "III", status: "impaired" }],
      softTissueDescriptors: [{ type: "contamination" }],
    });

    const lines = result!.diagnosisTextShort.split("\n").slice(1);
    expect(lines[0]).toContain("fracture");
    expect(lines[1]).toContain("fracture-dislocation");
    expect(lines[2]).toContain("EDC");
    expect(lines[3]).toContain("nerve");
    expect(lines[4]).toContain("Digital vessel injury");
    expect(lines[5]).toContain("Gross contamination");
  });

  it("groups contiguous digits when attributes match", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["II", "III", "IV"],
      injuredStructures: [
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "II",
          completeness: "complete",
        },
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "III",
          completeness: "complete",
        },
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "IV",
          completeness: "complete",
        },
      ],
    });

    expect(result!.diagnosisTextShort).toContain(
      "Complete extensor tendon lacerations, Dig. II–IV",
    );
  });

  it("refuses to over-group mixed partial and complete flexor injuries", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "right",
      injuryMechanism: "crush",
      affectedDigits: ["II", "III", "IV"],
      injuredStructures: [
        {
          category: "flexor_tendon",
          structureId: "FDP",
          displayName: "FDP",
          digit: "II",
          completeness: "complete",
        },
        {
          category: "flexor_tendon",
          structureId: "FDS",
          displayName: "FDS",
          digit: "III",
          completeness: "complete",
        },
        {
          category: "flexor_tendon",
          structureId: "FDP",
          displayName: "FDP",
          digit: "III",
          completeness: "complete",
        },
        {
          category: "flexor_tendon",
          structureId: "FDP",
          displayName: "FDP",
          digit: "IV",
          completeness: "partial",
        },
      ],
    });

    const lines = result!.diagnosisTextShort.split("\n");
    expect(lines).toContain("- Complete laceration of FDP, Dig. II");
    expect(lines).toContain("- Complete lacerations of FDP/FDS, Dig. III");
    expect(lines).toContain("- Partial laceration of FDP, Dig. IV");
    expect(lines.filter((line) => line.startsWith("- "))).toHaveLength(3);
  });

  it("shows AO codes only on fracture bullets", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["III"],
      fractures: [createMetacarpalFracture("fx-1", "III", "77.3.2C")],
      injuredStructures: [
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "III",
          completeness: "complete",
        },
      ],
    });

    const lines = result!.diagnosisTextShort.split("\n").slice(1);
    expect(lines[0]).toContain("(AO: 77.3.2C)");
    expect(lines[1]).not.toContain("(AO:");
  });

  it("prioritizes amputation wording in the header", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["I"],
      digitAmputations: [
        {
          digit: "I",
          level: "proximal_phalanx",
          type: "complete",
          isReplantable: true,
        },
      ],
    });

    expect(result!.headerLine).toBe("Left thumb amputation injury");
  });

  it("falls back safely in latin mode when a niche term is not in the dictionary", () => {
    const result = generateHandTraumaDiagnosis(
      {
        laterality: "left",
        injuryMechanism: "other",
        injuryMechanismOther: "jet injector",
        affectedDigits: ["III"],
      },
      "latin_medical",
    );

    expect(result!.headerLine).toContain("jet injector");
  });

  it("renders controlled anatomy terms fully in latin without English fallbacks", () => {
    const result = generateHandTraumaDiagnosis(
      {
        laterality: "left",
        injuryMechanism: "saw_blade",
        affectedDigits: ["II", "III"],
        fractures: [
          createMetacarpalFracture("fx-1", "II", "77.2.2A", {
            openStatus: "open",
          }),
          createMetacarpalFracture("fx-2", "III", "77.3.2C", {
            openStatus: "open",
          }),
        ],
        injuredStructures: [
          {
            category: "extensor_tendon",
            structureId: "EDC",
            displayName: "EDC",
            digit: "II",
            completeness: "complete",
          },
          {
            category: "extensor_tendon",
            structureId: "EDC",
            displayName: "EDC",
            digit: "III",
            completeness: "complete",
          },
          {
            category: "nerve",
            structureId: "median",
            displayName: "Median nerve",
          },
          {
            category: "artery",
            structureId: "radial_artery",
            displayName: "Radial artery",
          },
        ],
        softTissueDescriptors: [
          {
            type: "loss",
            surfaces: ["palmar", "dorsal"],
            digits: ["II", "III"],
          },
        ],
      },
      "latin_medical",
    );

    expect(result!.headerLine).toContain("Manus sinistra");
    expect(result!.diagnosisTextShort).toContain(
      "Fracturae apertae ossium metacarpalium II–III corpora",
    );
    expect(result!.diagnosisTextShort).toContain(
      "Lacerationes completae tendinum extensorum digitorum II–III",
    );
    expect(result!.diagnosisTextShort).toContain(
      "Laceratio nervi mediani ad carpum",
    );
    expect(result!.diagnosisTextShort).toContain("Laesio arteriae radialis");
    expect(result!.diagnosisTextShort).toContain(
      "Defectus textuum mollium volaris et dorsalis digitorum II–III",
    );
    expect(result!.diagnosisTextShort).not.toMatch(
      /\b(thumb|nerve injury|digital artery injury|soft-tissue)\b/i,
    );
  });

  it("avoids vague trauma wording when specific structures are present", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["III"],
      injuredStructures: [
        {
          category: "nerve",
          structureId: "median",
          displayName: "Median nerve",
        },
      ],
    });

    expect(result!.diagnosisTextShort).toContain("Median nerve injury");
    expect(result!.diagnosisTextShort.toLowerCase()).not.toContain(
      "complex hand injury",
    );
    expect(result!.diagnosisTextShort.toLowerCase()).not.toContain(
      "severe hand trauma",
    );
  });

  it("renders PIN and SRN as separate named nerves", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "right",
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

    expect(result!.diagnosisTextShort).toContain(
      "Posterior interosseous nerve (PIN) injury at wrist level",
    );
    expect(result!.diagnosisTextShort).toContain(
      "Superficial radial nerve (SRN) injury at wrist level",
    );
  });

  it("keeps legacy radial nerve payloads readable for backward compatibility", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "left",
      affectedDigits: [],
      injuredStructures: [
        {
          category: "nerve",
          structureId: "radial",
          displayName: "Radial nerve",
        },
      ],
    });

    expect(result!.diagnosisTextShort).toContain(
      "Radial nerve injury at wrist level",
    );
  });

  it("returns identical output for identical input", () => {
    const selection: HandTraumaDiagnosisSelection = {
      laterality: "left",
      injuryMechanism: "saw_blade",
      affectedDigits: ["II", "III", "IV"],
      fractures: [
        createMetacarpalFracture("fx-1", "II", "77.2.2A", {
          openStatus: "open",
        }),
        createMetacarpalFracture("fx-2", "III", "77.3.2C", {
          openStatus: "open",
          isComminuted: true,
        }),
        createMetacarpalFracture("fx-3", "IV", "77.4.2A", {
          openStatus: "open",
        }),
      ],
      injuredStructures: [
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "II",
          completeness: "complete",
        },
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "III",
          completeness: "complete",
        },
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "IV",
          completeness: "complete",
        },
      ],
      softTissueDescriptors: [
        {
          type: "loss",
          surfaces: ["palmar", "dorsal"],
          digits: ["II", "III", "IV"],
        },
        { type: "contamination" },
      ],
    };

    expect(generateHandTraumaDiagnosis(selection)).toEqual(
      generateHandTraumaDiagnosis(selection),
    );
  });

  it("keeps the machine summary language independent across render modes", () => {
    const selection: HandTraumaDiagnosisSelection = {
      laterality: "right",
      affectedDigits: ["IV"],
      dislocations: [{ joint: "pip", digit: "IV", hasFracture: true }],
      fractures: [
        {
          id: "fx-pip",
          boneId: "p2-base",
          boneName: "Middle phalanx base",
          aoCode: "78.4.1B",
          details: {
            familyCode: "78",
            finger: "4",
            phalanx: "2",
            segment: "1",
          },
        },
      ],
    };

    const shorthand = generateHandTraumaDiagnosis(
      selection,
      "shorthand_english",
    );
    const latin = generateHandTraumaDiagnosis(selection, "latin_medical");

    expect(shorthand!.machineSummary).toEqual(latin!.machineSummary);
  });

  it("keeps backward compatibility with legacy hand trauma payloads", () => {
    const group: DiagnosisGroup = {
      id: "group-1",
      sequenceOrder: 1,
      specialty: "hand_wrist",
      procedures: [],
      diagnosisClinicalDetails: {
        laterality: "left",
        handTrauma: {
          injuryMechanism: "crush",
          affectedDigits: ["III"],
        },
      },
    };

    const selection = buildSelectionFromGroup(group);
    const result = selection
      ? generateHandTraumaDiagnosis(selection, "shorthand_english")
      : null;

    expect(selection?.injuryMechanism).toBe("crush");
    expect(result?.headerLine).toBe("Left hand crush injury - Dig. III");
  });

  it("renders a representative circular saw multi-ray injury summary", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "left",
      injuryMechanism: "saw_blade",
      affectedDigits: ["II", "III", "IV"],
      fractures: [
        createMetacarpalFracture("fx-1", "II", "77.2.2A", {
          openStatus: "open",
        }),
        createMetacarpalFracture("fx-2", "III", "77.3.2C", {
          openStatus: "open",
          isComminuted: true,
        }),
        createMetacarpalFracture("fx-3", "IV", "77.4.2A", {
          openStatus: "open",
        }),
      ],
      injuredStructures: [
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "II",
          completeness: "complete",
        },
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "III",
          completeness: "complete",
        },
        {
          category: "extensor_tendon",
          structureId: "EDC",
          displayName: "EDC",
          digit: "IV",
          completeness: "complete",
        },
        {
          category: "nerve",
          structureId: "N3",
          displayName: "N3",
          digit: "II",
          side: "radial",
        },
        {
          category: "nerve",
          structureId: "N5",
          displayName: "N5",
          digit: "III",
          side: "radial",
        },
        {
          category: "artery",
          structureId: "A5",
          displayName: "A5",
          digit: "III",
          side: "radial",
        },
      ],
      perfusionStatuses: [{ digit: "III", status: "impaired" }],
      softTissueDescriptors: [
        {
          type: "loss",
          surfaces: ["palmar", "dorsal"],
          digits: ["II", "III", "IV"],
        },
        { type: "contamination" },
      ],
    });

    expect(result!.headerLine).toBe("Left hand saw/blade injury - rays II–IV");
    expect(result!.diagnosisTextShort).toContain(
      "Complete extensor tendon lacerations, Dig. II–IV",
    );
    expect(result!.diagnosisTextShort).toContain(
      "Digital vessel injury with impaired perfusion of Dig. III",
    );
  });

  it("renders a PIP fracture-dislocation with associated volar plate injury", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["IV"],
      dislocations: [{ joint: "pip", digit: "IV", hasFracture: true }],
      fractures: [
        {
          id: "fx-1",
          boneId: "middle-phalanx-base",
          boneName: "Middle phalanx base",
          aoCode: "78.4.1B",
          details: {
            familyCode: "78",
            finger: "4",
            phalanx: "2",
            segment: "1",
          },
        },
      ],
      injuredStructures: [
        {
          category: "other",
          structureId: "volar_plate_IV",
          displayName: "Volar plate",
          digit: "IV",
        },
      ],
    });

    expect(result!.headerLine).toBe("Right Dig. IV injury");
    expect(result!.diagnosisTextLong).toContain(
      "PIP fracture-dislocation, Dig. IV",
    );
    expect(result!.diagnosisTextLong).toContain("Volar plate injury, Dig. IV");
  });

  it("includes zone in soft tissue diagnosis text when specified", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["II"],
      softTissueDescriptors: [
        {
          type: "defect",
          surfaces: ["palmar"],
          zone: "fingertip",
          size: "small",
        },
      ],
    });

    expect(result!.diagnosisTextLong).toContain("fingertip");
  });

  it("renders soft tissue without zone when zone is undefined", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["III"],
      softTissueDescriptors: [
        {
          type: "loss",
          surfaces: ["dorsal"],
        },
      ],
    });

    expect(result!.diagnosisTextLong).toContain("Dorsal");
    expect(result!.diagnosisTextLong).not.toContain("fingertip");
  });
});

describe("laceration rendering", () => {
  const webSpaceSelection: HandTraumaDiagnosisSelection = {
    laterality: "left",
    injuryMechanism: "saw_blade",
    affectedDigits: ["I", "II"],
    softTissueDescriptors: [
      {
        type: "laceration",
        digits: ["I", "II"],
        zone: "web_space",
        intactStructures: ["flexor_tendon", "nerve"],
        muscleInvolved: true,
      },
    ],
  };

  it("renders the full stab-wound repro title with exploration findings", () => {
    const result = generateHandTraumaDiagnosis(webSpaceSelection);
    expect(result!.headerLine).toBe(
      "Left hand saw/blade injury - first web space laceration with muscle involvement — explored: flexor tendons + nerves intact",
    );
  });

  it("collapses flexor+extensor to 'tendons' in the intact suffix", () => {
    const result = generateHandTraumaDiagnosis({
      ...webSpaceSelection,
      softTissueDescriptors: [
        {
          type: "laceration",
          digits: ["I", "II"],
          zone: "web_space",
          intactStructures: ["flexor_tendon", "extensor_tendon", "nerve"],
        },
      ],
    });
    expect(result!.headerLine).toContain("explored: tendons + nerves intact");
    expect(result!.headerLine).not.toContain("flexor");
  });

  it("maps adjacent digit pairs to web space ordinals", () => {
    const ordinalByDigits: [
      ["I", "II"] | ["II", "III"] | ["III", "IV"] | ["IV", "V"],
      string,
    ][] = [
      [["I", "II"], "first web space"],
      [["II", "III"], "second web space"],
      [["III", "IV"], "third web space"],
      [["IV", "V"], "fourth web space"],
    ];
    for (const [digits, label] of ordinalByDigits) {
      const result = generateHandTraumaDiagnosis({
        laterality: "left",
        affectedDigits: digits,
        softTissueDescriptors: [
          { type: "laceration", digits, zone: "web_space" },
        ],
      });
      expect(result!.headerLine).toContain(label);
    }
  });

  it("falls back to plain zone + digits when the web ordinal does not apply", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "right",
      affectedDigits: ["II"],
      softTissueDescriptors: [
        { type: "laceration", digits: ["II"], zone: "digit_shaft" },
      ],
    });
    expect(result!.headerLine).toContain("digit laceration, Dig. II");
  });

  it("renders the Latin variant of the laceration title", () => {
    const result = generateHandTraumaDiagnosis(
      webSpaceSelection,
      "latin_medical",
    );
    expect(result!.headerLine).toContain("Vulnus lacerum");
    expect(result!.headerLine).toContain("spatii interdigitalis primi");
    expect(result!.headerLine).toContain("cum laesione musculi");
    expect(result!.headerLine).toContain(
      "exploratio: tendines flexores et nervi integri",
    );
  });

  it("keeps the topographic header for mixed laceration + structure injuries", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["II"],
      softTissueDescriptors: [
        { type: "laceration", digits: ["II"], zone: "digit_shaft" },
      ],
      injuredStructures: [
        {
          category: "flexor_tendon",
          structureId: "FDP",
          displayName: "FDP",
          digit: "II",
        },
      ],
    });
    // A real structure injury means the laceration is no longer the substance
    // of the case — the standard topographic header wins.
    expect(result!.headerLine).not.toContain("explored");
    expect(result!.diagnosisTextShort).toContain("laceration");
  });

  it("renders a legacy laceration descriptor without new fields cleanly", () => {
    const result = generateHandTraumaDiagnosis({
      laterality: "right",
      affectedDigits: [],
      softTissueDescriptors: [{ type: "laceration", zone: "palm" }],
    });
    expect(result!.headerLine).toBe("Right hand injury - palmar laceration");
  });

  it("stays deterministic regardless of intact-structure selection order", () => {
    const a = generateHandTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["II"],
      softTissueDescriptors: [
        {
          type: "laceration",
          digits: ["II"],
          zone: "digit_shaft",
          intactStructures: ["vessel", "nerve", "flexor_tendon"],
        },
      ],
    });
    const b = generateHandTraumaDiagnosis({
      laterality: "left",
      affectedDigits: ["II"],
      softTissueDescriptors: [
        {
          type: "laceration",
          digits: ["II"],
          zone: "digit_shaft",
          intactStructures: ["flexor_tendon", "nerve", "vessel"],
        },
      ],
    });
    expect(a).toEqual(b);
    expect(a!.headerLine).toContain(
      "explored: flexor tendons + nerves + vessels intact",
    );
  });
});
