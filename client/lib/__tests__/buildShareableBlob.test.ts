/**
 * buildShareableBlob — extracts the subset of a Case that goes into the
 * end-to-end-encrypted SharedCaseData blob sent to recipient devices.
 * The contract here is *what gets shared and what stays local*: patient
 * identity travels (inside the encrypted blob), but personalNotes,
 * episodeId, operativeMedia, draft state, and local tracking metadata do
 * not. Field renaming (admissionUrgency → urgency,
 * defaultOperativeRole → operativeRole,
 * defaultSupervisionLevel → supervisionLevel) and the outcomes
 * sub-object structure are surfaced to the receiver's UI, so drift here
 * causes a silent recipient-side rendering bug.
 *
 * The operativeTeam handling is covered by sharingBridge.test.ts; this
 * file covers patient identity, clinical fields, outcomes nesting,
 * teamRoles pass-through, operative-role rename, and the exclusion list.
 */

import { describe, it, expect } from "vitest";
import type { Case } from "@/types/case";
import type { TeamMemberEntry } from "@/types/sharing";
import { buildShareableBlob } from "@/lib/buildShareableBlob";

const minimalCase = (overrides: Partial<Case> = {}): Case =>
  ({
    id: "case-1",
    patientIdentifier: "PAT-001",
    procedureDate: "2026-05-16",
    facility: "Test Hospital",
    diagnosisGroups: [],
    ...overrides,
  }) as unknown as Case;

describe("buildShareableBlob — patient identity", () => {
  it("includes all 4 patient identity fields when present", () => {
    const c = minimalCase({
      patientFirstName: "Ada",
      patientLastName: "Lovelace",
      patientDateOfBirth: "1987-03-12",
      patientNhi: "ABC1234",
    });
    const blob = buildShareableBlob(c, []);
    expect(blob.patientFirstName).toBe("Ada");
    expect(blob.patientLastName).toBe("Lovelace");
    expect(blob.patientDateOfBirth).toBe("1987-03-12");
    expect(blob.patientNhi).toBe("ABC1234");
  });

  it("leaves patient fields undefined when source case has none", () => {
    const blob = buildShareableBlob(minimalCase(), []);
    expect(blob.patientFirstName).toBeUndefined();
    expect(blob.patientLastName).toBeUndefined();
    expect(blob.patientDateOfBirth).toBeUndefined();
    expect(blob.patientNhi).toBeUndefined();
  });

  it("preserves empty strings (lets recipient see 'explicitly blanked')", () => {
    // Differs from undefined — an empty string is a deliberate decision the
    // surgeon made, not a missing field. Don't coerce away the distinction.
    const c = minimalCase({
      patientFirstName: "",
      patientLastName: "",
    });
    const blob = buildShareableBlob(c, []);
    expect(blob.patientFirstName).toBe("");
    expect(blob.patientLastName).toBe("");
  });
});

describe("buildShareableBlob — clinical record", () => {
  it("passes through procedureDate, facility, and diagnosisGroups by reference", () => {
    const groups = [
      { id: "g1", procedures: [], specialty: "hand_wrist" },
    ] as Case["diagnosisGroups"];
    const c = minimalCase({
      procedureDate: "2026-05-16",
      facility: "Mercy Hospital",
      diagnosisGroups: groups,
    });
    const blob = buildShareableBlob(c, []);
    expect(blob.procedureDate).toBe("2026-05-16");
    expect(blob.facility).toBe("Mercy Hospital");
    // Reference identity — the blob shares the underlying array.
    expect(blob.diagnosisGroups).toBe(groups);
  });

  it("renames admissionUrgency → urgency", () => {
    const c = minimalCase({
      admissionUrgency: "emergency",
    } as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    expect(blob.urgency).toBe("emergency");
    // The original key should NOT appear on the blob.
    expect("admissionUrgency" in blob).toBe(false);
  });

  it("includes anaestheticType and stayType verbatim", () => {
    const c = minimalCase({
      anaestheticType: "general",
      stayType: "inpatient",
    } as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    expect(blob.anaestheticType).toBe("general");
    expect(blob.stayType).toBe("inpatient");
  });
});

describe("buildShareableBlob — outcomes nesting", () => {
  it("collects 7 outcome fields into the outcomes sub-object", () => {
    const c = minimalCase({
      outcome: "discharged_home",
      mortalityClassification: "none",
      unplannedICU: false,
      returnToTheatre: true,
      returnToTheatreReason: "Haemorrhage",
      discussedAtMDM: true,
      complications: [
        { id: "c1", clavienDindo: "II", note: "Wound infection" },
      ],
    } as unknown as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    expect(blob.outcomes.outcome).toBe("discharged_home");
    expect(blob.outcomes.mortalityClassification).toBe("none");
    expect(blob.outcomes.unplannedICU).toBe(false);
    expect(blob.outcomes.returnToTheatre).toBe(true);
    expect(blob.outcomes.returnToTheatreReason).toBe("Haemorrhage");
    expect(blob.outcomes.discussedAtMDM).toBe(true);
    expect(blob.outcomes.complications).toHaveLength(1);
  });

  it("outcomes sub-object always present even when every field is undefined", () => {
    // The receiver's UI reads `blob.outcomes.outcome` directly — if outcomes
    // were undefined the read would throw. The shape contract is: outcomes
    // is always an object, even if all its values are undefined.
    const blob = buildShareableBlob(minimalCase(), []);
    expect(blob.outcomes).toBeDefined();
    expect(typeof blob.outcomes).toBe("object");
    expect(blob.outcomes.outcome).toBeUndefined();
    expect(blob.outcomes.mortalityClassification).toBeUndefined();
  });
});

describe("buildShareableBlob — team & role mapping", () => {
  const role = (userId: string, displayName: string): TeamMemberEntry => ({
    userId,
    displayName,
    role: "FA",
  });

  it("passes teamRoles through verbatim by reference", () => {
    const roles = [role("u1", "Ada L.")];
    const blob = buildShareableBlob(minimalCase(), roles);
    expect(blob.teamRoles).toBe(roles);
  });

  it("passes operativeTeam through from caseData", () => {
    const opTeam = [
      {
        contactId: "c1",
        displayName: "Charlotte",
        abbreviatedName: "Charlotte L.",
        operativeRole: "FA",
        presentForProcedures: null,
      },
    ] as Case["operativeTeam"];
    const c = minimalCase({ operativeTeam: opTeam });
    const blob = buildShareableBlob(c, []);
    expect(blob.operativeTeam).toBe(opTeam);
  });

  it("renames defaultOperativeRole → operativeRole and defaultSupervisionLevel → supervisionLevel", () => {
    const c = minimalCase({
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "INDEPENDENT",
    } as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    expect(blob.operativeRole).toBe("SURGEON");
    expect(blob.supervisionLevel).toBe("INDEPENDENT");
    // Original keys are NOT carried into the blob.
    expect("defaultOperativeRole" in blob).toBe(false);
    expect("defaultSupervisionLevel" in blob).toBe(false);
  });
});

describe("buildShareableBlob — exclusion list", () => {
  it("excludes personalNotes (private surgeon-side annotation)", () => {
    const c = minimalCase({
      personalNotes: "My patient gets nervous before surgery",
    } as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    expect("personalNotes" in blob).toBe(false);
  });

  it("excludes episodeId (recipient does not have access to episode store)", () => {
    const c = minimalCase({ episodeId: "ep-1" } as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    expect("episodeId" in blob).toBe(false);
  });

  it("excludes operativeMedia (photos handled by separate share pipeline)", () => {
    const c = minimalCase({
      operativeMedia: [{ id: "m1", encryptedUri: "opus-media:abc" }],
    } as unknown as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    expect("operativeMedia" in blob).toBe(false);
  });

  it("excludes tracking metadata (id, ownerId, caseStatus, createdAt, updatedAt)", () => {
    const c = minimalCase({
      id: "case-99",
      ownerId: "user-1",
      caseStatus: "active",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-05-16T12:00:00Z",
    } as unknown as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    expect("id" in blob).toBe(false);
    expect("ownerId" in blob).toBe(false);
    expect("caseStatus" in blob).toBe(false);
    expect("createdAt" in blob).toBe(false);
    expect("updatedAt" in blob).toBe(false);
  });

  it("excludes draft / form-only fields (handCaseType, isPlanMode, clinicalDetails legacy)", () => {
    const c = minimalCase({
      handCaseType: "trauma",
      isPlanMode: true,
      clinicalDetails: { somethingLegacy: "value" },
    } as unknown as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    expect("handCaseType" in blob).toBe(false);
    expect("isPlanMode" in blob).toBe(false);
    expect("clinicalDetails" in blob).toBe(false);
  });
});

describe("buildShareableBlob — output shape stability", () => {
  it("returns exactly the documented set of top-level keys (no extras leak in)", () => {
    const c = minimalCase({
      patientFirstName: "Ada",
      operativeTeam: [],
      defaultOperativeRole: "SURGEON",
      defaultSupervisionLevel: "INDEPENDENT",
      anaestheticType: "general",
      stayType: "day_case",
      admissionUrgency: "elective",
      outcome: "discharged_home",
    } as unknown as Partial<Case>);
    const blob = buildShareableBlob(c, []);
    const expected = new Set([
      "patientFirstName",
      "patientLastName",
      "patientDateOfBirth",
      "patientNhi",
      "procedureDate",
      "facility",
      "diagnosisGroups",
      "urgency",
      "anaestheticType",
      "stayType",
      "outcomes",
      "teamRoles",
      "operativeTeam",
      "operativeRole",
      "supervisionLevel",
    ]);
    const actual = new Set(Object.keys(blob));
    expect(actual).toEqual(expected);
  });
});
