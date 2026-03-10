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
