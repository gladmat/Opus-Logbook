/**
 * sharedCaseSummary — a decrypted share blob becomes a dashboard summary
 * that reads like an owned case, plus `shared` metadata.
 */
import { describe, it, expect } from "vitest";
import type { DiagnosisGroup } from "@/types/case";
import type { SharedCaseData, SharedCaseInboxEntry } from "@/types/sharing";
import {
  buildSharedCaseSummary,
  isSharedCaseSummary,
  sharedSummariesSignature,
  UNHYDRATED_DIAGNOSIS_TITLE,
} from "@/lib/sharedCaseSummary";
import { deriveCaseSummaryFields } from "@/lib/caseSummaryFields";

const entry: SharedCaseInboxEntry = {
  id: "share-1",
  caseId: "case-owner-1",
  ownerUserId: "owner",
  ownerDisplayName: "Mateusz Gladysz",
  recipientRole: "PS",
  verificationStatus: "pending",
  blobVersion: 2,
  createdAt: "2026-09-09T22:00:00.000Z",
  updatedAt: "2026-09-09T22:00:00.000Z",
};

const group: DiagnosisGroup = {
  id: "g1",
  sequenceOrder: 1,
  specialty: "hand_wrist",
  diagnosis: {
    snomedCode: "85922006",
    displayName: "Fracture of hook of hamate",
  },
  diagnosisClinicalDetails: { laterality: "left" },
  procedures: [
    {
      id: "p1",
      sequenceOrder: 1,
      procedureName: "Excision of hook of hamate",
      specialty: "hand_wrist",
      surgeonRole: "PS",
    },
  ],
} as DiagnosisGroup;

const blob: SharedCaseData = {
  patientFirstName: "Jane",
  patientLastName: "Doe",
  patientNhi: "ABC1234",
  procedureDate: "2026-09-08",
  facility: "Waikato",
  diagnosisGroups: [group],
  stayType: "day_case",
  outcomes: { outcome: "discharged_home" },
  teamRoles: [],
  media: [
    {
      mediaId: "m1",
      dekHex: "ab".repeat(32),
      mimeType: "image/jpeg",
      width: 10,
      height: 10,
      image: { nonce: "n", tag: "t", size: 1, ciphertextSize: 1 },
      thumb: { nonce: "n", tag: "t", size: 1, ciphertextSize: 1 },
      createdAt: "2026-09-08T00:00:00.000Z",
    },
    {
      mediaId: "m2",
      dekHex: "cd".repeat(32),
      mimeType: "image/jpeg",
      width: 10,
      height: 10,
      image: { nonce: "n", tag: "t", size: 1, ciphertextSize: 1 },
      thumb: null,
      createdAt: "2026-09-08T00:00:00.000Z",
    },
  ],
} as SharedCaseData;

describe("buildSharedCaseSummary", () => {
  it("hydrated: reads like an owned CaseSummary keyed on the share id, with shared metadata", () => {
    const s = buildSharedCaseSummary(entry, blob, new Set(["m1"]));
    expect(isSharedCaseSummary(s)).toBe(true);
    expect(s.id).toBe("share-1");
    expect(s.procedureDate).toBe("2026-09-08");
    expect(s.specialty).toBe("hand_wrist");
    expect(s.specialties).toEqual(["hand_wrist"]);
    expect(s.patientIdentifier).toBe("ABC1234");
    expect(s.patientDisplayName).toBe("Jane Doe");
    expect(s.diagnosisTitle).toBe(
      deriveCaseSummaryFields({ diagnosisGroups: [group] }).diagnosisTitle,
    );
    expect(s.primaryProcedureName).toBe("Excision of hook of hamate");
    expect(s.siteLabel).toBe("Left");
    expect(s.outcomeRecorded).toBe(true);
    expect(s.canAddHistology).toBe(false);
    expect(s.needsHistology).toBe(false);
    expect(s.operativeMediaCount).toBe(2);
    expect(s.firstOperativeMediaUri).toBe("opus-media:m1");
    expect(s.mediaDescriptors).toHaveLength(2);
    expect(s.shared).toEqual({
      sharedCaseId: "share-1",
      ownerUserId: "owner",
      ownerDisplayName: "Mateusz Gladysz",
      recipientRole: "PS",
      verificationStatus: "pending",
      blobVersion: 2,
      hydrated: true,
    });
    // Search finds it by owner name and by "shared".
    expect(s.searchableText).toContain("mateusz gladysz");
    expect(s.searchableText).toContain("shared");
    expect(s.searchableText).toContain("hamate");
  });

  it("no local thumbnail yet → no card thumbnail (never a broken image)", () => {
    const s = buildSharedCaseSummary(entry, blob, new Set());
    expect(s.firstOperativeMediaUri).toBeUndefined();
    expect(s.operativeMediaCount).toBe(2);
  });

  it("un-hydrated (never decrypted / offline): placeholder copy, no PHI, still tappable", () => {
    const s = buildSharedCaseSummary(entry, null);
    expect(s.shared.hydrated).toBe(false);
    expect(s.diagnosisTitle).toBe(UNHYDRATED_DIAGNOSIS_TITLE);
    expect(s.patientIdentifier).toBe("");
    expect(s.specialty).toBe("general");
    expect(s.procedureDate).toBe("2026-09-09");
    expect(s.searchableText).toContain("mateusz gladysz");
  });

  it("missing owner name falls back to 'a colleague'", () => {
    const s = buildSharedCaseSummary({ ...entry, ownerDisplayName: "" }, null);
    expect(s.shared.ownerDisplayName).toBe("a colleague");
  });

  it("isSharedCaseSummary rejects plain summaries", () => {
    expect(isSharedCaseSummary({ id: "x", searchableText: "" })).toBe(false);
    expect(isSharedCaseSummary(null)).toBe(false);
  });
});

describe("sharedSummariesSignature", () => {
  const base = () => buildSharedCaseSummary(entry, blob, new Set<string>());

  it("is stable across identical inputs and empty for none", () => {
    expect(sharedSummariesSignature([])).toBe("");
    expect(sharedSummariesSignature([base()])).toBe(
      sharedSummariesSignature([base()]),
    );
  });

  it("changes with blob version, verification status, hydration and order", () => {
    const a = base();
    const key = sharedSummariesSignature([a]);
    const bumped = buildSharedCaseSummary(
      { ...entry, blobVersion: entry.blobVersion + 1 },
      blob,
      new Set<string>(),
    );
    const verified = buildSharedCaseSummary(
      { ...entry, verificationStatus: "verified" },
      blob,
      new Set<string>(),
    );
    const unhydrated = buildSharedCaseSummary(entry, null, new Set<string>());
    expect(sharedSummariesSignature([bumped])).not.toBe(key);
    expect(sharedSummariesSignature([verified])).not.toBe(key);
    expect(sharedSummariesSignature([unhydrated])).not.toBe(key);
    expect(sharedSummariesSignature([a, bumped])).not.toBe(
      sharedSummariesSignature([bumped, a]),
    );
  });
});
