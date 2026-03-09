/**
 * Clinical data for hand infection assessment.
 * Maps organisms to antibiotic sensitivity panels.
 */

import type { HandAntibioticRegimen } from "@/types/handInfection";

/**
 * Maps organism to the antibiotics typically tested in a sensitivity panel.
 * This determines which rows appear in the sensitivities grid.
 */
export const ORGANISM_SENSITIVITY_PANEL: Record<
  string,
  HandAntibioticRegimen[]
> = {
  staph_aureus_mssa: [
    "flucloxacillin",
    "co_amoxiclav",
    "cefazolin",
    "clindamycin",
    "vancomycin",
    "ciprofloxacin_metronidazole",
  ],
  staph_aureus_mrsa: [
    "vancomycin",
    "clindamycin",
    "co_amoxiclav",
    "ciprofloxacin_metronidazole",
    "meropenem",
  ],
  strep_pyogenes: [
    "flucloxacillin",
    "co_amoxiclav",
    "cefazolin",
    "clindamycin",
    "vancomycin",
  ],
  strep_other: [
    "flucloxacillin",
    "co_amoxiclav",
    "cefazolin",
    "clindamycin",
    "vancomycin",
  ],
  pasteurella_multocida: [
    "co_amoxiclav",
    "ciprofloxacin_metronidazole",
    "piperacillin_tazobactam",
    "meropenem",
  ],
  eikenella_corrodens: [
    "co_amoxiclav",
    "ciprofloxacin_metronidazole",
    "piperacillin_tazobactam",
    "meropenem",
  ],
  pseudomonas: [
    "piperacillin_tazobactam",
    "ciprofloxacin_metronidazole",
    "meropenem",
    "cefazolin",
  ],
  enterobacteriaceae: [
    "co_amoxiclav",
    "ciprofloxacin_metronidazole",
    "piperacillin_tazobactam",
    "meropenem",
    "cefazolin",
  ],
  mixed_anaerobes: [
    "co_amoxiclav",
    "clindamycin",
    "piperacillin_tazobactam",
    "meropenem",
  ],
};

/**
 * Generic fallback panel for organisms without a specific mapping.
 */
export const GENERIC_SENSITIVITY_PANEL: HandAntibioticRegimen[] = [
  "flucloxacillin",
  "co_amoxiclav",
  "cefazolin",
  "clindamycin",
  "vancomycin",
  "piperacillin_tazobactam",
  "meropenem",
];
