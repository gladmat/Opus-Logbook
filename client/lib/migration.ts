import { Case, DiagnosisGroup, CaseProcedure } from "@/types/case";
import { v4 as uuidv4 } from "uuid";
import { migrateSnomedCode } from "@/lib/snomedCodeMigration";

function migrateSnomedCodes(c: Case): Case {
  let changed = false;

  const updatedGroups = c.diagnosisGroups.map((group) => {
    let groupChanged = false;

    let updatedDiagnosis = group.diagnosis;
    if (updatedDiagnosis?.snomedCtCode) {
      const fix = migrateSnomedCode(updatedDiagnosis.snomedCtCode);
      if (fix) {
        updatedDiagnosis = { ...updatedDiagnosis, snomedCtCode: fix.newCode };
        groupChanged = true;
      }
    }

    const updatedProcedures = group.procedures.map((proc: CaseProcedure) => {
      if (proc.snomedCtCode) {
        const fix = migrateSnomedCode(proc.snomedCtCode);
        if (fix) {
          groupChanged = true;
          return { ...proc, snomedCtCode: fix.newCode, snomedCtDisplay: fix.newDisplay };
        }
      }
      return proc;
    });

    if (groupChanged) {
      changed = true;
      return { ...group, diagnosis: updatedDiagnosis, procedures: updatedProcedures };
    }
    return group;
  });

  if (changed) {
    return { ...c, diagnosisGroups: updatedGroups };
  }
  return c;
}

export function migrateCase(raw: any): Case {
  if (Array.isArray(raw.diagnosisGroups) && raw.diagnosisGroups.length > 0) {
    const migrated = migrateSnomedCodes(raw as Case);
    if (!migrated.schemaVersion) {
      return { ...migrated, schemaVersion: 2 };
    }
    return migrated;
  }

  const oldDiagnosis = raw.preManagementDiagnosis || raw.finalDiagnosis;

  const group: DiagnosisGroup = {
    id: uuidv4(),
    sequenceOrder: 1,
    specialty: raw.specialty || "general",
    diagnosis: oldDiagnosis
      ? { snomedCtCode: oldDiagnosis.snomedCtCode, displayName: oldDiagnosis.displayName, date: oldDiagnosis.date }
      : undefined,
    diagnosisPicklistId: raw.diagnosisPicklistId || undefined,
    diagnosisStagingSelections: raw.diagnosisStagingSelections || undefined,
    diagnosisClinicalDetails: oldDiagnosis?.clinicalDetails || undefined,
    procedureSuggestionSource: raw.procedureSuggestionSource || undefined,
    pathologicalDiagnosis: raw.pathologicalDiagnosis || undefined,
    fractures: raw.fractures || undefined,
    procedures: raw.procedures || [],
  };

  const migrated: any = { ...raw, diagnosisGroups: [group], schemaVersion: 2 };
  delete migrated.preManagementDiagnosis;
  delete migrated.finalDiagnosis;
  delete migrated.pathologicalDiagnosis;
  delete migrated.diagnosisPicklistId;
  delete migrated.diagnosisStagingSelections;
  delete migrated.procedureSuggestionSource;
  delete migrated.fractures;
  delete migrated.procedures;

  return migrateSnomedCodes(migrated as Case);
}
