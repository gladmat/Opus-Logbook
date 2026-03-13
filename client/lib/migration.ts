import { Case, DiagnosisGroup, CaseProcedure } from "@/types/case";
import { v4 as uuidv4 } from "uuid";
import { migrateSnomedCode } from "@/lib/snomedCodeMigration";
import { resolveSkinCancerDiagnosis } from "@/lib/skinCancerConfig";
import { repairCaseSpecialty } from "@/lib/caseSpecialty";
import { normalizeDateOnlyValue } from "@/lib/dateValues";
import type { SkinCancerHistology } from "@/types/skinCancer";
import { normalizeBreastAssessment } from "@/lib/breastState";

const CURRENT_CASE_SCHEMA_VERSION = 5;

/**
 * Rename hand_surgery → hand_wrist in all specialty references.
 * Runs on every case load — idempotent (no-op if already hand_wrist).
 */
function migrateSpecialty(c: Case): Case {
  let changed = false;

  // Migrate top-level specialty
  if ((c as any).specialty === "hand_surgery") {
    c = { ...c, specialty: "hand_wrist" as any };
    changed = true;
  }

  const updatedGroups = c.diagnosisGroups.map((group) => {
    let groupChanged = false;
    let updatedGroup = group;

    if (group.specialty === ("hand_surgery" as any)) {
      updatedGroup = { ...updatedGroup, specialty: "hand_wrist" };
      groupChanged = true;
    }

    const updatedProcedures = updatedGroup.procedures.map((proc) => {
      if (proc.specialty === ("hand_surgery" as any)) {
        groupChanged = true;
        return { ...proc, specialty: "hand_wrist" as any };
      }
      return proc;
    });

    if (groupChanged) {
      changed = true;
      return { ...updatedGroup, procedures: updatedProcedures };
    }
    return updatedGroup;
  });

  if (changed) {
    return { ...c, diagnosisGroups: updatedGroups };
  }
  return c;
}

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

function migrateSkinCancerDiagnosisConsistency(c: Case): Case {
  let changed = false;

  const diagnosisGroups = c.diagnosisGroups.map((group) => {
    if (!group.skinCancerAssessment) return group;

    const resolved = resolveSkinCancerDiagnosis(group.skinCancerAssessment);
    if (!resolved) return group;

    const nextDiagnosis = {
      displayName: resolved.displayName,
      ...(resolved.snomedCtCode ? { snomedCtCode: resolved.snomedCtCode } : {}),
    };

    if (
      group.diagnosis?.displayName === nextDiagnosis.displayName &&
      (group.diagnosis?.snomedCtCode ?? "") ===
        (nextDiagnosis.snomedCtCode ?? "") &&
      group.diagnosisPicklistId === resolved.diagnosisPicklistId
    ) {
      return group;
    }

    changed = true;
    return {
      ...group,
      diagnosis: nextDiagnosis,
      diagnosisPicklistId: resolved.diagnosisPicklistId,
    };
  });

  return changed ? { ...c, diagnosisGroups } : c;
}

function normalizeStoredDateOnlyValue(value?: string): string | undefined {
  if (value === undefined) return undefined;
  return normalizeDateOnlyValue(value) ?? value;
}

function normalizeSkinCancerHistology(
  histology?: SkinCancerHistology,
): SkinCancerHistology | undefined {
  if (!histology) return histology;

  const reportDate = normalizeStoredDateOnlyValue(histology.reportDate);
  if (reportDate === histology.reportDate) {
    return histology;
  }

  return {
    ...histology,
    reportDate,
  };
}

export function normalizeCaseDateOnlyFields(c: Case): Case {
  let changed = false;

  const procedureDate = normalizeStoredDateOnlyValue(c.procedureDate);
  const admissionDate = normalizeStoredDateOnlyValue(c.admissionDate);
  const dischargeDate = normalizeStoredDateOnlyValue(c.dischargeDate);
  const injuryDate = normalizeStoredDateOnlyValue(c.injuryDate);

  if (procedureDate !== c.procedureDate) changed = true;
  if (admissionDate !== c.admissionDate) changed = true;
  if (dischargeDate !== c.dischargeDate) changed = true;
  if (injuryDate !== c.injuryDate) changed = true;

  const diagnosisGroups = c.diagnosisGroups.map((group) => {
    let groupChanged = false;

    let skinCancerAssessment = group.skinCancerAssessment;
    if (group.skinCancerAssessment) {
      const priorHistology = normalizeSkinCancerHistology(
        group.skinCancerAssessment.priorHistology,
      );
      const currentHistology = normalizeSkinCancerHistology(
        group.skinCancerAssessment.currentHistology,
      );

      if (
        priorHistology !== group.skinCancerAssessment.priorHistology ||
        currentHistology !== group.skinCancerAssessment.currentHistology
      ) {
        skinCancerAssessment = {
          ...group.skinCancerAssessment,
          priorHistology,
          currentHistology,
        };
        groupChanged = true;
      }
    }

    const lesionInstances = group.lesionInstances?.map((lesion) => {
      if (!lesion.skinCancerAssessment) {
        return lesion;
      }

      const priorHistology = normalizeSkinCancerHistology(
        lesion.skinCancerAssessment.priorHistology,
      );
      const currentHistology = normalizeSkinCancerHistology(
        lesion.skinCancerAssessment.currentHistology,
      );

      if (
        priorHistology === lesion.skinCancerAssessment.priorHistology &&
        currentHistology === lesion.skinCancerAssessment.currentHistology
      ) {
        return lesion;
      }

      groupChanged = true;
      return {
        ...lesion,
        skinCancerAssessment: {
          ...lesion.skinCancerAssessment,
          priorHistology,
          currentHistology,
        },
      };
    });

    if (!groupChanged) {
      return group;
    }

    changed = true;
    return {
      ...group,
      skinCancerAssessment,
      lesionInstances,
    };
  });

  if (!changed) {
    return c;
  }

  return {
    ...c,
    procedureDate: procedureDate ?? c.procedureDate,
    admissionDate,
    dischargeDate,
    injuryDate,
    diagnosisGroups,
  };
}

export function normalizeCaseBreastFields(c: Case): Case {
  const diagnosisGroups = c.diagnosisGroups.map((group) => {
    if (!group.breastAssessment) return group;

    return {
      ...group,
      breastAssessment: normalizeBreastAssessment(group.breastAssessment),
    };
  });

  return {
    ...c,
    diagnosisGroups,
  };
}

export function migrateCase(raw: unknown): Case {
  if (!raw || typeof raw !== "object") {
    console.error("Case migration failed: invalid input (not an object)");
    return { ...(raw as Case), schemaVersion: CURRENT_CASE_SCHEMA_VERSION };
  }

  try {
    const obj = raw as Record<string, unknown>;

    if (Array.isArray(obj.diagnosisGroups) && obj.diagnosisGroups.length > 0) {
      let migrated = migrateSpecialty(raw as Case);
      migrated = migrateSnomedCodes(migrated);
      migrated = migrateSkinCancerDiagnosisConsistency(migrated);
      migrated = normalizeCaseDateOnlyFields(migrated);
      migrated = normalizeCaseBreastFields(migrated);
      migrated = repairCaseSpecialty(migrated);
      if (
        !migrated.schemaVersion ||
        migrated.schemaVersion < CURRENT_CASE_SCHEMA_VERSION
      ) {
        return { ...migrated, schemaVersion: CURRENT_CASE_SCHEMA_VERSION };
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
      schemaVersion: CURRENT_CASE_SCHEMA_VERSION,
    };
    delete migrated.preManagementDiagnosis;
    delete migrated.finalDiagnosis;
    delete migrated.pathologicalDiagnosis;
    delete migrated.diagnosisPicklistId;
    delete migrated.diagnosisStagingSelections;
    delete migrated.procedureSuggestionSource;
    delete migrated.fractures;
    delete migrated.procedures;

    return repairCaseSpecialty(
      normalizeCaseBreastFields(
        normalizeCaseDateOnlyFields(
          migrateSkinCancerDiagnosisConsistency(
            migrateSnomedCodes(migrated as Case),
          ),
        ),
      ),
    );
  } catch (error) {
    console.error(
      "Case migration failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    // Return raw data with schema version to prevent data loss
    return { ...(raw as Case), schemaVersion: CURRENT_CASE_SCHEMA_VERSION };
  }
}
