import type { Case } from "@/types/case";
import type { SharedCaseData, TeamMemberEntry } from "@/types/sharing";

/**
 * Extracts the shareable subset from a full Case object.
 *
 * Includes: patient identity, clinical record, team roles, operative role.
 * Excludes: personalNotes, episodeId, operativeMedia, draft state, tracking metadata.
 */
export function buildShareableBlob(
  caseData: Case,
  teamRoles: TeamMemberEntry[],
): SharedCaseData {
  return {
    patientFirstName: caseData.patientFirstName,
    patientLastName: caseData.patientLastName,
    patientDateOfBirth: caseData.patientDateOfBirth,
    patientNhi: caseData.patientNhi,
    procedureDate: caseData.procedureDate,
    facility: caseData.facility,
    diagnosisGroups: caseData.diagnosisGroups,
    urgency: caseData.admissionUrgency,
    anaestheticType: caseData.anaestheticType,
    stayType: caseData.stayType,
    outcomes: {
      outcome: caseData.outcome,
      mortalityClassification: caseData.mortalityClassification,
      unplannedICU: caseData.unplannedICU,
      returnToTheatre: caseData.returnToTheatre,
      returnToTheatreReason: caseData.returnToTheatreReason,
      discussedAtMDM: caseData.discussedAtMDM,
      complications: caseData.complications,
    },
    teamRoles,
    operativeRole: caseData.defaultOperativeRole,
    supervisionLevel: caseData.defaultSupervisionLevel,
  };
}
