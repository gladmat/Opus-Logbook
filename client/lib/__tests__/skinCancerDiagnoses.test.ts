import { describe, expect, it } from "vitest";
import {
  getSkinCancerDiagnosisById,
  isSkinCancerDiagnosis,
  matchHistologyToPicklist,
  resolveSnomedCode,
} from "@/lib/skinCancerDiagnoses";
import { RARE_TYPE_METADATA, getClinicalPathway } from "@/lib/skinCancerConfig";
import { GEN_DX_SKIN_CANCER } from "@/lib/diagnosisPicklists/generalDiagnoses";
import { SKIN_CANCER_DIAGNOSES as SKIN_CANCER_PICKLIST } from "@/lib/diagnosisPicklists/skinCancerDiagnoses";
import { PROCEDURE_PICKLIST } from "@/lib/procedurePicklist";

describe("skin cancer SNOMED repair", () => {
  it("resolves corrected melanoma and BCC subtype codes", () => {
    expect(resolveSnomedCode("melanoma", "ssm")).toEqual({
      snomedCtCode: "254730000",
      snomedCtDisplay:
        "Superficial spreading malignant melanoma of skin (disorder)",
    });
    expect(resolveSnomedCode("bcc", "basosquamous")).toEqual({
      snomedCtCode: "254702000",
      snomedCtDisplay: "Basosquamous carcinoma of skin (disorder)",
    });
  });

  it("expands the rare cutaneous subtype catalogue to 24 entries", () => {
    expect(getSkinCancerDiagnosisById("rare_cutaneous")?.subtypes).toHaveLength(
      24,
    );
  });

  it("detects newly added rare malignancy keywords", () => {
    expect(isSkinCancerDiagnosis(undefined, "Kaposi's sarcoma of skin")).toBe(
      true,
    );
    expect(
      isSkinCancerDiagnosis(
        undefined,
        "Malignant peripheral nerve sheath tumour involving skin",
      ),
    ).toBe(true);
  });

  it("matches new rare histology phrases to canonical subtype ids", () => {
    expect(matchHistologyToPicklist("Eccrine porocarcinoma")).toEqual({
      cancerType: "rare_cutaneous",
      subtypeId: "porocarcinoma",
    });
    expect(matchHistologyToPicklist("Pilomatrical carcinoma")).toEqual({
      cancerType: "rare_cutaneous",
      subtypeId: "pilomatrical_carcinoma",
    });
    expect(
      matchHistologyToPicklist(
        "Malignant peripheral nerve sheath tumour of skin",
      ),
    ).toEqual({
      cancerType: "rare_cutaneous",
      subtypeId: "mpnst",
    });
  });

  it("syncs mirrored diagnosis picklists to the corrected codes", () => {
    expect(
      GEN_DX_SKIN_CANCER.find(
        (entry) => entry.id === "gen_dx_actinic_keratosis",
      )?.snomedCtCode,
    ).toBe("201101007");
    expect(
      SKIN_CANCER_PICKLIST.find((entry) => entry.id === "sc_dx_keratoacanthoma")
        ?.snomedCtCode,
    ).toBe("254662007");
    expect(
      SKIN_CANCER_PICKLIST.find((entry) => entry.id === "sc_dx_dfsp")
        ?.snomedCtCode,
    ).toBe("276799004");
  });

  it("updates skin oncology procedure entries to international codes", () => {
    const procedures = new Map(
      PROCEDURE_PICKLIST.map((entry) => [entry.id, entry] as const),
    );

    expect(procedures.get("hn_skin_bcc_excision")).toMatchObject({
      snomedCtCode: "300025007",
      snomedCtDisplay: "Excision of basal cell carcinoma (procedure)",
    });
    expect(procedures.get("gen_skin_scc_excision_body")).toMatchObject({
      snomedCtCode: "450434000",
      snomedCtDisplay: "Excision of squamous cell carcinoma (procedure)",
    });
    expect(procedures.get("gen_mel_excision_body")).toMatchObject({
      snomedCtCode: "177281002",
      snomedCtDisplay: "Excision of melanoma (procedure)",
    });
    expect(procedures.get("hn_skin_mohs_defect")).toMatchObject({
      snomedCtCode: "418024000",
      snomedCtDisplay: "Mohs surgery (procedure)",
    });
    expect(procedures.get("gen_skin_benign_lesion")).toMatchObject({
      snomedCtCode: "35646002",
      snomedCtDisplay: "Excision of lesion of skin (procedure)",
    });
  });

  it("aligns runtime rare-type metadata and pathway routing", () => {
    expect(RARE_TYPE_METADATA.kaposi_sarcoma.snomedCt).toBe("109386008");
    expect(RARE_TYPE_METADATA.mpnst.snomedCt).toBe("404037002");
    expect(getClinicalPathway("rare_malignant", "mpnst")).toBe("complex_mdt");
  });
});
