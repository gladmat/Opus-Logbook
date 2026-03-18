/**
 * Diagnosis-specific additional structured fields for elective hand.
 * Maps diagnosis picklist IDs to extra UI fields that appear
 * after diagnosis selection (e.g., per-finger selection for trigger finger).
 */

export interface ElectiveFingerOption {
  id: "thumb" | "index" | "middle" | "ring" | "little";
  label: string;
}

export const FINGER_OPTIONS: ElectiveFingerOption[] = [
  { id: "thumb", label: "Thumb" },
  { id: "index", label: "Index" },
  { id: "middle", label: "Middle" },
  { id: "ring", label: "Ring" },
  { id: "little", label: "Little" },
];

export interface DiagnosisFingerConfig {
  fingerOptions: ElectiveFingerOption[];
  multiSelect: boolean;
  label: string;
}

/**
 * Map of diagnosis IDs → finger selection config.
 * Only diagnoses that need per-finger selection appear here.
 */
// Trigger finger/thumb entries removed — unified trigger digit uses DigitMultiSelect.
// Config kept for potential future per-finger diagnoses.
const DIAGNOSIS_FINGER_CONFIG: Record<string, DiagnosisFingerConfig> = {};

/**
 * Get finger selection config for a diagnosis, if applicable.
 */
export function getFingerConfigForDiagnosis(
  diagnosisId: string | undefined,
): DiagnosisFingerConfig | null {
  if (!diagnosisId) return null;
  return DIAGNOSIS_FINGER_CONFIG[diagnosisId] ?? null;
}

/**
 * Quinnell grading options for trigger finger severity.
 * Used inline per-finger rather than via server staging config.
 */
export const QUINNELL_GRADES: { value: string; label: string; description: string }[] = [
  { value: "0", label: "0", description: "Normal movement" },
  { value: "1", label: "I", description: "Uneven movement" },
  { value: "2", label: "II", description: "Actively correctable" },
  { value: "3", label: "III", description: "Passively correctable" },
  { value: "4", label: "IV", description: "Fixed contracture" },
];

/**
 * Diagnoses that support per-finger Quinnell grading.
 */
export function hasPerFingerQuinnell(diagnosisId: string | undefined): boolean {
  return diagnosisId === "hand_dx_trigger_finger" || diagnosisId === "hand_dx_trigger_thumb";
}

/**
 * Format per-finger Quinnell grading as a summary string.
 * e.g. "Index Grade II, Ring Grade III"
 */
export function formatTriggerFingerGrading(
  grading: Record<string, string>,
  affectedFingers: string[],
): string {
  return affectedFingers
    .filter((f) => grading[f])
    .map((f) => {
      const label = FINGER_OPTIONS.find((o) => o.id === f)?.label ?? f;
      const grade = QUINNELL_GRADES.find((g) => g.value === grading[f]);
      return `${label} Grade ${grade?.label ?? grading[f]}`;
    })
    .join(", ");
}
