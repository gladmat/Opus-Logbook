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
          return {
            ...proc,
            snomedCtCode: fix.newCode,
            snomedCtDisplay: fix.newDisplay,
          };
        }
      }
      return proc;
    });

    if (groupChanged) {
      changed = true;
      return {
        ...group,
        diagnosis: updatedDiagnosis,
        procedures: updatedProcedures,
      };
    }
    return group;
  });

  if (changed) {
    return { ...c, diagnosisGroups: updatedGroups };
  }
  return c;
}

export function migrateCase(raw: unknown): Case {
  if (!raw || typeof raw !== "object") {
    console.error("Case migration failed: invalid input (not an object)");
    return { ...(raw as Case), schemaVersion: 2 };
  }

  try {
    const obj = raw as Record<string, unknown>;

    if (Array.isArray(obj.diagnosisGroups) && obj.diagnosisGroups.length > 0) {
      const migrated = migrateSnomedCodes(raw as Case);
      if (!migrated.schemaVersion) {
        return { ...migrated, schemaVersion: 2 };
      }
      return migrated;
    }

    const oldDiagnosis =
      (obj as any).preManagementDiagnosis || (obj as any).finalDiagnosis;

    const group: DiagnosisGroup = {
      id: uuidv4(),
      sequenceOrder: 1,
      specialty: (obj as any).specialty || "general",
      diagnosis: oldDiagnosis
        ? {
            snomedCtCode: oldDiagnosis.snomedCtCode,
            displayName: oldDiagnosis.displayName,
            date: oldDiagnosis.date,
          }
        : undefined,
      diagnosisPicklistId: (obj as any).diagnosisPicklistId || undefined,
      diagnosisStagingSelections:
        (obj as any).diagnosisStagingSelections || undefined,
      diagnosisClinicalDetails: oldDiagnosis?.clinicalDetails || undefined,
      procedureSuggestionSource:
        (obj as any).procedureSuggestionSource || undefined,
      pathologicalDiagnosis: (obj as any).pathologicalDiagnosis || undefined,
      fractures: (obj as any).fractures || undefined,
      procedures: (obj as any).procedures || [],
    };

    const migrated: any = {
      ...obj,
      diagnosisGroups: [group],
      schemaVersion: 2,
    };
    delete migrated.preManagementDiagnosis;
    delete migrated.finalDiagnosis;
    delete migrated.pathologicalDiagnosis;
    delete migrated.diagnosisPicklistId;
    delete migrated.diagnosisStagingSelections;
    delete migrated.procedureSuggestionSource;
    delete migrated.fractures;
    delete migrated.procedures;

    return migrateSnomedCodes(migrated as Case);
  } catch (error) {
    console.error(
      "Case migration failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    // Return raw data with schema version to prevent data loss
    return { ...(raw as Case), schemaVersion: 2 };
  }
}
