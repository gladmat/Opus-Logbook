// Pure date-consistency checks for the case form.
//
// These live in `lib/` (not `hooks/useCaseForm.ts`) so they can be unit-tested
// and coverage-counted without dragging in the Expo/React-Native runtime chain
// that `useCaseForm` pulls in. `useCaseForm` composes these into its
// `validateField` / `validateRequiredFields` / `collectDateWarnings` surface.
//
// All compares use `parseIsoDateValue` (local-noon) to stay timezone-safe,
// mirroring the existing procedureDate non-future check. Every guard no-ops
// when its optional fields are empty so absence never blocks.

import { parseIsoDateValue } from "@/lib/dateValues";
import { endOfTodayLocal } from "@/lib/dateBounds";
import { calculateAgeFromDob } from "@/types/case";

export interface ValidationError {
  field: string;
  sectionId: string;
  message: string;
}

/** The date/time-bearing subset of the case form state. */
export interface CaseDateFields {
  patientDateOfBirth: string;
  procedureDate: string;
  admissionDate: string;
  dischargeDate: string;
  injuryDate: string;
  surgeryStartTime: string;
  surgeryEndTime: string;
}

/**
 * Parse a `HH:MM` time string to minutes-since-midnight, or `null` if the value
 * is absent / malformed / out of range. A partial value (e.g. just the hours
 * typed) returns `null` so validation skips rather than mis-flags an in-progress
 * entry.
 */
export function timeToMinutes(hhmm: string): number | null {
  if (!hhmm) return null;
  const parts = hhmm.split(":");
  if (parts.length !== 2) return null;
  const hours = Number(parts[0]);
  const mins = Number(parts[1]);
  if (!Number.isInteger(hours) || !Number.isInteger(mins)) return null;
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

/**
 * Inline per-field date validation for blur feedback. Returns an error message
 * or `null`. Handles the optional date fields that aren't otherwise required
 * (procedureDate's required + non-future checks stay in `useCaseForm`).
 */
export function validateDateFieldInline(
  field: string,
  fields: CaseDateFields,
): string | null {
  switch (field) {
    case "patientDateOfBirth": {
      if (!fields.patientDateOfBirth) return null;
      const dob = parseIsoDateValue(fields.patientDateOfBirth);
      if (!dob) return "Invalid date of birth";
      if (dob.getTime() > endOfTodayLocal().getTime())
        return "Date of birth cannot be in the future";
      return null;
    }
    case "dischargeDate": {
      const admission = parseIsoDateValue(fields.admissionDate);
      const discharge = parseIsoDateValue(fields.dischargeDate);
      if (admission && discharge && discharge.getTime() < admission.getTime())
        return "Discharge date cannot be before admission date";
      return null;
    }
    case "injuryDate": {
      const procedure = parseIsoDateValue(fields.procedureDate);
      const injury = parseIsoDateValue(fields.injuryDate);
      if (procedure && injury && injury.getTime() > procedure.getTime())
        return "Injury date cannot be after the procedure date";
      return null;
    }
    case "surgeryEndTime": {
      // Equal start/end is a zero-length operation (impossible). end < start is
      // treated as an overnight case — a soft warning, not a hard block.
      const startMins = timeToMinutes(fields.surgeryStartTime);
      const endMins = timeToMinutes(fields.surgeryEndTime);
      if (startMins != null && endMins != null && endMins === startMins)
        return "Surgery end time must be after start time";
      return null;
    }
    default:
      return null;
  }
}

/** Message when the procedure predates the patient's birth, else `null`. */
export function procedureBeforeDobMessage(
  fields: CaseDateFields,
): string | null {
  const dob = parseIsoDateValue(fields.patientDateOfBirth);
  const procedure = parseIsoDateValue(fields.procedureDate);
  if (dob && procedure && procedure.getTime() < dob.getTime())
    return "Procedure date cannot be before the patient's date of birth";
  return null;
}

/**
 * Cross-field hard-block errors (physically-impossible combinations). Excludes
 * required-field presence checks. The caller is responsible for plan-mode
 * gating.
 */
export function getDateHardBlockErrors(
  fields: CaseDateFields,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const dob = parseIsoDateValue(fields.patientDateOfBirth);
  const procedure = parseIsoDateValue(fields.procedureDate);
  const admission = parseIsoDateValue(fields.admissionDate);
  const discharge = parseIsoDateValue(fields.dischargeDate);
  const injury = parseIsoDateValue(fields.injuryDate);

  if (dob && dob.getTime() > endOfTodayLocal().getTime()) {
    errors.push({
      field: "patientDateOfBirth",
      sectionId: "patient",
      message: "Date of birth cannot be in the future",
    });
  }
  if (dob && procedure && procedure.getTime() < dob.getTime()) {
    errors.push({
      field: "procedureDate",
      sectionId: "patient",
      message: "Procedure date cannot be before the patient's date of birth",
    });
  }
  if (admission && discharge && discharge.getTime() < admission.getTime()) {
    errors.push({
      field: "dischargeDate",
      sectionId: "operative",
      message: "Discharge date cannot be before admission date",
    });
  }
  if (procedure && injury && injury.getTime() > procedure.getTime()) {
    errors.push({
      field: "injuryDate",
      sectionId: "operative",
      message: "Injury date cannot be after the procedure date",
    });
  }

  const startMins = timeToMinutes(fields.surgeryStartTime);
  const endMins = timeToMinutes(fields.surgeryEndTime);
  if (startMins != null && endMins != null && endMins === startMins) {
    errors.push({
      field: "surgeryEndTime",
      sectionId: "operative",
      message: "Surgery end time must be after start time",
    });
  }

  return errors;
}

/**
 * Soft, non-blocking warnings for clinically-unusual-but-possible date
 * combinations. The caller is responsible for plan-mode gating.
 */
export function getDateWarnings(fields: CaseDateFields): ValidationError[] {
  const warnings: ValidationError[] = [];
  const procedure = parseIsoDateValue(fields.procedureDate);
  const admission = parseIsoDateValue(fields.admissionDate);
  const discharge = parseIsoDateValue(fields.dischargeDate);

  if (fields.patientDateOfBirth && procedure) {
    const age = calculateAgeFromDob(fields.patientDateOfBirth, procedure);
    if (age != null && age > 120) {
      warnings.push({
        field: "patientDateOfBirth",
        sectionId: "patient",
        message: `Patient age (${age}) is unusually high — please confirm date of birth`,
      });
    }
  }

  if (admission && procedure && admission.getTime() > procedure.getTime()) {
    warnings.push({
      field: "admissionDate",
      sectionId: "operative",
      message: "Admission date is after the procedure date — please confirm",
    });
  }

  if (discharge && !admission) {
    warnings.push({
      field: "dischargeDate",
      sectionId: "operative",
      message: "Discharge date set without an admission date",
    });
  }

  if (admission && discharge) {
    const stayDays =
      (discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24);
    if (stayDays > 365) {
      warnings.push({
        field: "dischargeDate",
        sectionId: "operative",
        message: "Length of stay exceeds one year — please confirm dates",
      });
    }
  }

  const startMins = timeToMinutes(fields.surgeryStartTime);
  const endMins = timeToMinutes(fields.surgeryEndTime);
  if (startMins != null && endMins != null && endMins < startMins) {
    warnings.push({
      field: "surgeryEndTime",
      sectionId: "operative",
      message:
        "Surgery end time is before start time — confirm this crossed midnight",
    });
  }

  return warnings;
}
