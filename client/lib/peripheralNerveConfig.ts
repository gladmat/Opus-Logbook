/**
 * Peripheral Nerve Module — Configuration & Activation Logic
 *
 * Activation is diagnosis-driven (not specialty-gated), matching the
 * skin cancer pattern. The module activates when a diagnosis has
 * `peripheralNerveModule: true` on its picklist entry.
 */

import type { DiagnosisPicklistEntry } from "@/types/diagnosis";
import type { PeripheralNerveAssessmentData } from "@/types/peripheralNerve";

// ══════════════════════════════════════════════════
// ACTIVATION FUNCTIONS
// ══════════════════════════════════════════════════

/** Returns true when the diagnosis activates the peripheral nerve assessment module */
export function isPeripheralNerveDiagnosis(
  diagnosis: DiagnosisPicklistEntry | undefined,
): boolean {
  return diagnosis?.peripheralNerveModule === true;
}

/** Returns true when the diagnosis activates the brachial plexus sub-module */
export function isBrachialPlexusDiagnosis(
  diagnosis: DiagnosisPicklistEntry | undefined,
): boolean {
  return diagnosis?.brachialPlexusModule === true;
}

/** Returns true when the diagnosis activates the neuroma sub-module */
export function isNeuromaDiagnosis(
  diagnosis: DiagnosisPicklistEntry | undefined,
): boolean {
  return diagnosis?.neuromaModule === true;
}

// ══════════════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════════════

/** Empty assessment with no populated fields */
export function getDefaultPeripheralNerveAssessment(): PeripheralNerveAssessmentData {
  return {};
}

/** Default brachial plexus roots — all unknown */
export function getDefaultBrachialPlexusRoots(): PeripheralNerveAssessmentData {
  return {
    brachialPlexus: {
      roots: {},
    },
  };
}
