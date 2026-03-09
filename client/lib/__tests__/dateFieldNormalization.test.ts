import { describe, expect, it } from "vitest";

import {
  normalizeEpisodeDateOnlyFields,
  normalizeTimelineEventDateOnlyFields,
} from "@/lib/dateFieldNormalization";
import { normalizeCaseDateOnlyFields, migrateCase } from "@/lib/migration";
import type { TreatmentEpisode } from "@/types/episode";
import type { TimelineEvent } from "@/types/case";

describe("date field normalization", () => {
  it("normalizes legacy case date-only fields on load", () => {
    const rawCase = {
      id: "case-1",
      schemaVersion: 5,
      specialty: "skin_cancer",
      patientIdentifier: "ABC123",
      facility: "Opus",
      procedureType: "Excision",
      procedureDate: "2026-03-09T08:30:00.000Z",
      admissionDate: "2026-03-08T00:00:00.000Z",
      dischargeDate: "2026-03-11T00:00:00.000Z",
      injuryDate: "2026-03-07T00:00:00.000Z",
      createdAt: "2026-03-09T09:00:00.000Z",
      updatedAt: "2026-03-09T09:30:00.000Z",
      diagnosisGroups: [
        {
          id: "group-1",
          sequenceOrder: 1,
          specialty: "skin_cancer",
          procedures: [],
          skinCancerAssessment: {
            currentHistology: {
              source: "current_procedure",
              pathologyCategory: "bcc",
              marginStatus: "pending",
              reportDate: "2026-03-10T08:45:00.000Z",
            },
            priorHistology: {
              source: "own_biopsy",
              pathologyCategory: "bcc",
              marginStatus: "complete",
              reportDate: "2026-02-15T12:15:00.000Z",
            },
          },
          lesionInstances: [
            {
              id: "lesion-1",
              skinCancerAssessment: {
                currentHistology: {
                  source: "current_procedure",
                  pathologyCategory: "bcc",
                  marginStatus: "pending",
                  reportDate: "2026-03-11T10:00:00.000Z",
                },
              },
            },
          ],
        },
      ],
    } as any;

    const migrated = migrateCase(rawCase);

    expect(migrated.procedureDate).toBe("2026-03-09");
    expect(migrated.admissionDate).toBe("2026-03-08");
    expect(migrated.dischargeDate).toBe("2026-03-11");
    expect(migrated.injuryDate).toBe("2026-03-07");
    expect(
      migrated.diagnosisGroups[0]?.skinCancerAssessment?.currentHistology
        ?.reportDate,
    ).toBe("2026-03-10");
    expect(
      migrated.diagnosisGroups[0]?.skinCancerAssessment?.priorHistology
        ?.reportDate,
    ).toBe("2026-02-15");
    expect(
      migrated.diagnosisGroups[0]?.lesionInstances?.[0]?.skinCancerAssessment
        ?.currentHistology?.reportDate,
    ).toBe("2026-03-11");
    expect(migrated.createdAt).toBe(rawCase.createdAt);
  });

  it("normalizes episode onset dates without touching timestamp fields", () => {
    const episode: TreatmentEpisode = {
      id: "episode-1",
      patientIdentifier: "ABC123",
      title: "Histology follow-up",
      primaryDiagnosisCode: "",
      primaryDiagnosisDisplay: "BCC",
      type: "cancer_pathway",
      specialty: "skin_cancer",
      status: "completed",
      onsetDate: "2026-03-09T08:30:00.000Z",
      resolvedDate: "2026-03-12T09:00:00.000Z",
      ownerId: "user-1",
      createdAt: "2026-03-09T08:35:00.000Z",
      updatedAt: "2026-03-09T08:35:00.000Z",
    };

    const normalized = normalizeEpisodeDateOnlyFields(episode);

    expect(normalized.onsetDate).toBe("2026-03-09");
    expect(normalized.resolvedDate).toBe(episode.resolvedDate);
    expect(normalized.createdAt).toBe(episode.createdAt);
  });

  it("normalizes timeline wound review dates without changing timestamps", () => {
    const event: TimelineEvent = {
      id: "event-1",
      caseId: "case-1",
      eventType: "wound_assessment",
      note: "",
      createdAt: "2026-03-09T08:30:00.000Z",
      mediaAttachments: [
        {
          id: "media-1",
          localUri: "encrypted-media:media-1",
          mimeType: "image/jpeg",
          createdAt: "2026-03-09T08:30:00.000Z",
          timestamp: "2026-03-09T08:35:00.000Z",
        },
      ],
      woundAssessmentData: {
        dressings: [],
        nextReviewDate: "2026-03-15T12:00:00.000Z",
      },
    };

    const normalized = normalizeTimelineEventDateOnlyFields(event);

    expect(normalized.woundAssessmentData?.nextReviewDate).toBe("2026-03-15");
    expect(normalized.createdAt).toBe(event.createdAt);
    expect(normalized.mediaAttachments?.[0]?.timestamp).toBe(
      event.mediaAttachments?.[0]?.timestamp,
    );
  });

  it("leaves already-canonical cases unchanged", () => {
    const currentCase = {
      id: "case-2",
      schemaVersion: 5,
      specialty: "general",
      patientIdentifier: "XYZ789",
      facility: "Opus",
      procedureType: "Case",
      procedureDate: "2026-03-09",
      createdAt: "2026-03-09T09:00:00.000Z",
      updatedAt: "2026-03-09T09:30:00.000Z",
      diagnosisGroups: [
        {
          id: "group-2",
          sequenceOrder: 1,
          specialty: "general",
          procedures: [],
        },
      ],
    } as any;

    expect(normalizeCaseDateOnlyFields(currentCase)).toBe(currentCase);
  });
});
