/**
 * Hand case-type guards — strip stale trauma assessment data.
 *
 * The hand trauma assessment writes into
 * `DiagnosisGroup.diagnosisClinicalDetails.handTrauma` and
 * `DiagnosisGroup.fractures`. When the surgeon switches the 3-way hand case
 * type (Trauma / Acute / Elective) away from Trauma, those blobs must not
 * ride along on the group: `getHandTraumaCaseTitle` regenerates the machine
 * diagnosis title from the blob, so a stale one makes an elective case
 * render a trauma diagnosis ("Left hand saw/blade injury - Dig. II") on the
 * review screen. Companion to the orphan-blob prevention in
 * DiagnosisGroupEditor's buildCurrentDiagnosisGroup (audit B1.2).
 */

import type {
  DiagnosisClinicalDetails,
  FractureEntry,
  Specialty,
} from "@/types/case";

export type HandCaseType = "trauma" | "acute" | "elective";

interface StripStaleHandTraumaArgs {
  specialty: Specialty;
  handCaseType: HandCaseType | null;
  diagnosisClinicalDetails: DiagnosisClinicalDetails | undefined;
  fractures: FractureEntry[] | undefined;
}

interface StripStaleHandTraumaResult {
  diagnosisClinicalDetails: DiagnosisClinicalDetails | undefined;
  fractures: FractureEntry[] | undefined;
}

/**
 * Remove trauma-only data from a hand group that is explicitly non-trauma.
 *
 * - Only acts when `specialty === "hand_wrist"` AND the case type is
 *   explicitly "acute" or "elective". A null case type (undetermined) is
 *   left untouched — conservative, so legacy groups without a resolvable
 *   case type are never mutated.
 * - Preserves `laterality` and the top-level `injuryMechanism` fields (both
 *   legitimately outlive a case-type switch); strips only `handTrauma`.
 * - Collapses an emptied details object to `undefined`.
 * - Returns the input references unchanged when there is nothing to strip,
 *   so callers can rely on identity checks.
 */
export function stripStaleHandTraumaData(
  args: StripStaleHandTraumaArgs,
): StripStaleHandTraumaResult {
  const { specialty, handCaseType, diagnosisClinicalDetails, fractures } = args;

  const shouldStrip =
    specialty === "hand_wrist" &&
    (handCaseType === "acute" || handCaseType === "elective");

  if (!shouldStrip) {
    return { diagnosisClinicalDetails, fractures };
  }

  let details = diagnosisClinicalDetails;
  if (details?.handTrauma) {
    const { handTrauma: _stripped, ...rest } = details;
    details = Object.keys(rest).length > 0 ? rest : undefined;
  }

  return {
    diagnosisClinicalDetails: details,
    fractures: undefined,
  };
}
