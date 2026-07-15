import { describe, it, expect } from "vitest";
import { shouldFetchDiagnosisStaging } from "@/lib/diagnosisStagingGate";
import { ALL_DIAGNOSES, findDiagnosisById } from "@/lib/diagnosisPicklists";
import { getStagingForDiagnosis } from "../../../server/diagnosisStagingConfig";

const asSelected = (id: string) => {
  const dx = findDiagnosisById(id);
  if (!dx) throw new Error(`missing picklist entry ${id}`);
  return dx;
};

const asPrimary = (id: string) => {
  const dx = asSelected(id);
  return { conceptId: dx.snomedCtCode, term: dx.displayName };
};

describe("shouldFetchDiagnosisStaging", () => {
  it("never fetches without a diagnosis", () => {
    expect(
      shouldFetchDiagnosisStaging({
        selectedDiagnosis: null,
        primaryDiagnosis: null,
        hadStoredSelections: false,
      }),
    ).toBe(false);
  });

  it("keeps the keyword fallback for free-SNOMED diagnoses (no entry)", () => {
    expect(
      shouldFetchDiagnosisStaging({
        selectedDiagnosis: null,
        primaryDiagnosis: { conceptId: "125666000", term: "Burn of skin" },
        hadStoredSelections: false,
      }),
    ).toBe(true);
  });

  it("ignores a stale entry after a SNOMED-search override", () => {
    // The free-search path replaces primaryDiagnosis without clearing
    // selectedDiagnosis — the opted-out entry must not gate the new dx.
    expect(
      shouldFetchDiagnosisStaging({
        selectedDiagnosis: asSelected("burns_dx_acute"),
        primaryDiagnosis: {
          conceptId: "123456789",
          term: "Something else entirely",
        },
        hadStoredSelections: false,
      }),
    ).toBe(true);
  });

  it("fetches for entries that declare staging", () => {
    expect(
      shouldFetchDiagnosisStaging({
        selectedDiagnosis: asSelected("hn_dx_scalp_friction_burn"),
        primaryDiagnosis: asPrimary("hn_dx_scalp_friction_burn"),
        hadStoredSelections: false,
      }),
    ).toBe(true);
  });

  it("suppresses the fetch for entries that opt out (burns_dx_acute)", () => {
    expect(
      shouldFetchDiagnosisStaging({
        selectedDiagnosis: asSelected("burns_dx_acute"),
        primaryDiagnosis: asPrimary("burns_dx_acute"),
        hadStoredSelections: false,
      }),
    ).toBe(false);
  });

  it("keeps fetching for legacy groups that already stored selections", () => {
    expect(
      shouldFetchDiagnosisStaging({
        selectedDiagnosis: asSelected("burns_dx_acute"),
        primaryDiagnosis: asPrimary("burns_dx_acute"),
        hadStoredSelections: true,
      }),
    ).toBe(true);
  });
});

describe("staging data integrity (client picklists ↔ server configs)", () => {
  it("every hasStaging:true entry resolves a staging config on the server", () => {
    // Guards the "broken promise" class: an entry that declares staging but
    // never matches a config (by code or keyword) renders nothing while
    // claiming otherwise. The 2026-07 audit found 10 of these (9 H&N cancers
    // with drifted SNOMED codes + Merkel cell); all were repaired.
    const broken = ALL_DIAGNOSES.filter(
      (dx) =>
        dx.hasStaging &&
        !getStagingForDiagnosis(dx.snomedCtCode, dx.displayName),
    ).map((dx) => dx.id);
    expect(broken).toEqual([]);
  });

  it("the repaired H&N cancer entries resolve AJCC 8th Ed TNM staging", () => {
    const repaired = [
      "hn_dx_tongue_ca",
      "hn_dx_buccal_ca",
      "hn_dx_mandible_tumour",
      "hn_dx_maxilla_tumour",
      "hn_dx_maxillary_sinus_ca",
      "hn_dx_parotid_mucoepidermoid",
      "hn_dx_parotid_adenoid_cystic",
      "hn_dx_parotid_acinic_cell",
      "hn_dx_submandibular_malignant",
    ];
    for (const id of repaired) {
      const dx = asSelected(id);
      const config = getStagingForDiagnosis(dx.snomedCtCode, dx.displayName);
      expect(
        config?.stagingSystems.some((s) => s.name.includes("AJCC 8th Ed")),
        `${id} should resolve AJCC 8th Ed TNM`,
      ).toBe(true);
    }
  });

  it("hn_dx_scalp_friction_burn keeps its deliberate burn-depth staging", () => {
    const dx = asSelected("hn_dx_scalp_friction_burn");
    expect(dx.hasStaging).toBe(true);
    const config = getStagingForDiagnosis(dx.snomedCtCode, dx.displayName);
    expect(config?.stagingSystems.map((s) => s.name)).toContain("Depth");
  });

  it("burns_dx_acute opts out so the assessment module owns depth/TBSA", () => {
    expect(asSelected("burns_dx_acute").hasStaging).toBe(false);
  });
});
