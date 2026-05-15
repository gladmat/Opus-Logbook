import { describe, expect, it } from "vitest";
import { getStagingForDiagnosis } from "../diagnosisStagingConfig";

describe("melanoma staging SNOMED repair", () => {
  it("matches the corrected melanoma parent and subtype codes", () => {
    for (const code of [
      "93655004",
      "189758001",
      "254730000",
      "254731001",
      "302837001",
      "254732008",
      "403924008",
      "276751004",
      "1295234004",
      "302836005",
    ]) {
      expect(getStagingForDiagnosis(code)).not.toBeNull();
    }
  });

  it("no longer relies on 372244006 for melanoma staging lookup", () => {
    expect(getStagingForDiagnosis("372244006")).toBeNull();
  });

  it("still falls back by melanoma keywords", () => {
    expect(
      getStagingForDiagnosis(undefined, "Lentigo maligna melanoma of skin"),
    ).not.toBeNull();
  });
});

describe("lymphoedema ISL staging — aetiology-named diagnoses", () => {
  // Regression guard: prior to adding their SNOMED codes to the ISL config,
  // these diagnoses fell through to keyword matching and got captured by
  // earlier configs (TNM-Breast for "breast cancer-related ...",
  // TNM-Breslow for "post-melanoma ..."). The fix forces SNOMED exact
  // match for every lymphoedema picklist entry.

  it("resolves BCRL upper limb to ISL Stage (not TNM-Breast)", () => {
    const staging = getStagingForDiagnosis(
      "449620005",
      "Breast cancer-related lymphoedema — upper limb",
    );
    expect(staging?.stagingSystems[0]?.name).toBe("ISL Stage");
  });

  it("resolves BCRL breast/trunk to ISL Stage (not TNM-Breast)", () => {
    const staging = getStagingForDiagnosis(
      "234097001",
      "Breast cancer-related lymphoedema — breast/trunk",
    );
    expect(staging?.stagingSystems[0]?.name).toBe("ISL Stage");
  });

  it("resolves post-melanoma upper-limb lymphoedema to ISL Stage (not Breslow)", () => {
    const staging = getStagingForDiagnosis(
      "449620005",
      "Post-melanoma lymphoedema — upper limb",
    );
    expect(staging?.stagingSystems[0]?.name).toBe("ISL Stage");
  });

  it("resolves post-melanoma lower-limb lymphoedema to ISL Stage (not Breslow)", () => {
    const staging = getStagingForDiagnosis(
      "403385000",
      "Post-melanoma lymphoedema — lower limb",
    );
    expect(staging?.stagingSystems[0]?.name).toBe("ISL Stage");
  });

  it("resolves all non-BCRL secondary-cancer lymphoedema picklist entries to ISL via SNOMED", () => {
    // Locked from client/lib/diagnosisPicklists/lymphoedemaDiagnoses.ts —
    // every secondary-cancer entry's SNOMED code is now in the ISL config.
    const secondaryCancerCodes: [string, string][] = [
      ["403385000", "Post-gynaecological cancer lymphoedema — lower limb"],
      ["403385000", "Post-urological cancer lymphoedema — lower limb"],
      ["440121002", "Post-sarcoma lymphoedema"],
      ["724859002", "Post-radiation lymphoedema"],
      ["403386004", "Post-cancer genital lymphoedema"],
      ["234097001", "Post-head & neck cancer lymphoedema — face/neck"],
    ];
    for (const [code, name] of secondaryCancerCodes) {
      const staging = getStagingForDiagnosis(code, name);
      expect(staging?.stagingSystems[0]?.name).toBe("ISL Stage");
    }
  });

  it("resolves primary lymphoedema entries to ISL via SNOMED", () => {
    const primaryCodes = [
      "1217009002", // Primary lymphoedema (primary upper / lower)
      "254199006", // Hereditary lymphoedema (hereditary other)
      "400158000", // Primary lymphoedema tardum (tarda)
      "77123007", // Lymphedema praecox (Meige)
      "399889006", // Hereditary lymphoedema type I (Milroy)
    ];
    for (const code of primaryCodes) {
      const staging = getStagingForDiagnosis(code);
      expect(staging?.stagingSystems[0]?.name).toBe("ISL Stage");
    }
  });
});
