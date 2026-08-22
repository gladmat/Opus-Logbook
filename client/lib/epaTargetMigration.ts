/**
 * epaTargetMigration — migrate-on-read for stored EPA targets.
 *
 * v2 targets (pre role-gate) carried every unit a junior shared with a
 * senior, regardless of the junior's role. v3 restricts units to those
 * where the trainee operated as Primary Surgeon. Rather than purging v2
 * records (which would blank old cases' CaseDetail Assessments card until
 * the case is re-saved), the reader filters each v2 target's units down to
 * PS-trainee units, drops targets left with none, and stamps version 3.
 *
 * Anything that is not a v2/v3 target array yields [] (regenerates on the
 * next save — the existing purge semantics for v1/plaintext records).
 */

import type { EpaAssessmentTarget, EpaUnitRef } from "./epaDerivation";

export interface EpaTargetMigrationResult {
  targets: EpaAssessmentTarget[];
  /** True when the stored records differ from what was returned (v2 →
   *  v3 rewrite, units dropped, or unrecognised input discarded). */
  changed: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnitRef(value: unknown): value is EpaUnitRef {
  return (
    isRecord(value) &&
    typeof value.procedureId === "string" &&
    typeof value.traineeRole === "string" &&
    typeof value.supervisorRole === "string"
  );
}

function isTargetShape(value: unknown): value is EpaAssessmentTarget & {
  version: number;
} {
  return (
    isRecord(value) &&
    typeof value.version === "number" &&
    typeof value.supervisorLinkedUserId === "string" &&
    typeof value.traineeLinkedUserId === "string" &&
    Array.isArray(value.units)
  );
}

export function migrateLegacyEpaTargets(
  raw: unknown,
): EpaTargetMigrationResult {
  if (!Array.isArray(raw)) return { targets: [], changed: true };
  let changed = false;
  const targets: EpaAssessmentTarget[] = [];
  for (const entry of raw) {
    if (!isTargetShape(entry)) {
      changed = true;
      continue;
    }
    if (entry.version === 3) {
      targets.push(entry);
      continue;
    }
    if (entry.version !== 2) {
      // v1 / unknown — drop (regenerates on next save).
      changed = true;
      continue;
    }
    changed = true;
    const units = (entry.units as unknown[])
      .filter(isUnitRef)
      .filter((u) => u.traineeRole === "PS");
    if (units.length === 0) continue;
    targets.push({ ...entry, version: 3, units });
  }
  return { targets, changed };
}
