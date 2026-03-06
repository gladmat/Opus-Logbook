/**
 * Migration validation utility — verifies all cases conform to v2 schema.
 *
 * Checks: diagnosisGroups structure, sequenceOrder, specialty enums,
 * procedure fields, absence of flat legacy fields.
 */

import { Case, Specialty } from "@/types/case";
import { getCases } from "./storage";

const VALID_SPECIALTIES: Set<string> = new Set<string>([
  "breast",
  "hand_wrist",
  "head_neck",
  "cleft_cranio",
  "skin_cancer",
  "orthoplastic",
  "burns",
  "lymphoedema",
  "body_contouring",
  "aesthetics",
  "peripheral_nerve",
  "general",
  // Legacy value — accepted for backward compat (migration renames to hand_wrist)
  "hand_surgery",
]);

const LEGACY_ROOT_FIELDS = [
  "preManagementDiagnosis",
  "finalDiagnosis",
  "pathologicalDiagnosis",
  "diagnosisPicklistId",
  "diagnosisStagingSelections",
  "procedureSuggestionSource",
  "fractures",
  "procedures",
] as const;

export interface MigrationWarning {
  caseId: string;
  field: string;
  message: string;
}

export interface MigrationTestResult {
  totalCases: number;
  successCount: number;
  failedCases: Array<{ caseId: string; errors: string[] }>;
  warningCases: MigrationWarning[];
}

function validateCase(c: Case): {
  errors: string[];
  warnings: MigrationWarning[];
} {
  const errors: string[] = [];
  const warnings: MigrationWarning[] = [];

  // 1. diagnosisGroups must be an array
  if (!Array.isArray(c.diagnosisGroups)) {
    errors.push("diagnosisGroups is not an array");
    return { errors, warnings };
  }

  // 2. Each group must have id, sequenceOrder, procedures array
  c.diagnosisGroups.forEach((group, idx) => {
    if (!group.id) {
      errors.push(`diagnosisGroups[${idx}] missing id`);
    }

    if (typeof group.sequenceOrder !== "number") {
      warnings.push({
        caseId: c.id,
        field: `diagnosisGroups[${idx}].sequenceOrder`,
        message: "Missing or non-numeric sequenceOrder",
      });
    }

    // Specialty enum check
    if (group.specialty && !VALID_SPECIALTIES.has(group.specialty)) {
      errors.push(
        `diagnosisGroups[${idx}].specialty "${group.specialty}" is not a valid Specialty`,
      );
    }

    if (!Array.isArray(group.procedures)) {
      errors.push(`diagnosisGroups[${idx}].procedures is not an array`);
    } else {
      group.procedures.forEach((proc, pIdx) => {
        if (!proc.id) {
          errors.push(`diagnosisGroups[${idx}].procedures[${pIdx}] missing id`);
        }
        if (!proc.procedureName && !proc.snomedCtCode) {
          warnings.push({
            caseId: c.id,
            field: `diagnosisGroups[${idx}].procedures[${pIdx}]`,
            message: "Procedure has neither name nor SNOMED code",
          });
        }
        if (!proc.surgeonRole) {
          warnings.push({
            caseId: c.id,
            field: `diagnosisGroups[${idx}].procedures[${pIdx}].surgeonRole`,
            message: "Missing surgeonRole",
          });
        }
      });
    }
  });

  // 3. Check for lingering flat legacy fields
  const raw = c as any;
  for (const field of LEGACY_ROOT_FIELDS) {
    if (raw[field] !== undefined) {
      errors.push(`Legacy flat field "${field}" still present at root level`);
    }
  }

  return { errors, warnings };
}

export async function validateMigrationCorpus(): Promise<MigrationTestResult> {
  const cases = await getCases();

  const result: MigrationTestResult = {
    totalCases: cases.length,
    successCount: 0,
    failedCases: [],
    warningCases: [],
  };

  for (const c of cases) {
    const { errors, warnings } = validateCase(c);
    result.warningCases.push(...warnings);

    if (errors.length > 0) {
      result.failedCases.push({ caseId: c.id, errors });
    } else {
      result.successCount++;
    }
  }

  return result;
}
