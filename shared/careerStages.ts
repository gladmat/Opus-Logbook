/**
 * Country-specific career stage definitions with universal seniority tier mapping.
 * Used for country-filtered career stage pickers and consultant-level detection.
 *
 * The 6-tier seniority model:
 *   Tier 1 = Pre-training / Intern
 *   Tier 2 = Junior Trainee
 *   Tier 3 = Senior Trainee
 *   Tier 4 = Independent Specialist
 *   Tier 5 = Senior Specialist
 *   Tier 6 = Department Lead
 */

export type SeniorityTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface CareerStageOption {
  value: string;
  label: string;
  /** Matches countryOfPractice values from profiles, or 'other' */
  country: string;
  seniorityTier: SeniorityTier;
  /** For role defaults — replaces the hardcoded CONSULTANT_CAREER_STAGES Set */
  isConsultantLevel: boolean;
}

export const CAREER_STAGE_OPTIONS: CareerStageOption[] = [
  // NZ
  {
    value: "nz_pgy1",
    label: "PGY-1 (House Officer)",
    country: "new_zealand",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "nz_pgy2",
    label: "PGY-2 (House Officer)",
    country: "new_zealand",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "nz_registrar_non_training",
    label: "Registrar (Non-Training)",
    country: "new_zealand",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "nz_set_trainee",
    label: "SET Trainee",
    country: "new_zealand",
    seniorityTier: 3,
    isConsultantLevel: false,
  },
  {
    value: "nz_fellow",
    label: "Fellow",
    country: "new_zealand",
    seniorityTier: 4,
    isConsultantLevel: true,
  },
  {
    value: "nz_consultant",
    label: "Consultant / Specialist",
    country: "new_zealand",
    seniorityTier: 5,
    isConsultantLevel: true,
  },
  {
    value: "nz_head_of_department",
    label: "Head of Department",
    country: "new_zealand",
    seniorityTier: 6,
    isConsultantLevel: true,
  },
  {
    value: "nz_moss",
    label: "Medical Officer Special Scale",
    country: "new_zealand",
    seniorityTier: 4,
    isConsultantLevel: true,
  },

  // AU — shares NZ stage values (RACS pipeline). Label variation for MOSS only.
  {
    value: "nz_pgy1",
    label: "PGY-1 (House Officer)",
    country: "australia",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "nz_pgy2",
    label: "PGY-2 (House Officer)",
    country: "australia",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "nz_registrar_non_training",
    label: "Registrar (Non-Training)",
    country: "australia",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "nz_set_trainee",
    label: "SET Trainee",
    country: "australia",
    seniorityTier: 3,
    isConsultantLevel: false,
  },
  {
    value: "nz_fellow",
    label: "Fellow",
    country: "australia",
    seniorityTier: 4,
    isConsultantLevel: true,
  },
  {
    value: "nz_consultant",
    label: "Consultant / Specialist",
    country: "australia",
    seniorityTier: 5,
    isConsultantLevel: true,
  },
  {
    value: "nz_head_of_department",
    label: "Head of Department",
    country: "australia",
    seniorityTier: 6,
    isConsultantLevel: true,
  },
  {
    value: "nz_moss",
    label: "Staff Specialist / VMO",
    country: "australia",
    seniorityTier: 4,
    isConsultantLevel: true,
  },

  // UK
  {
    value: "uk_fy1",
    label: "Foundation Year 1 (FY1)",
    country: "united_kingdom",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "uk_fy2",
    label: "Foundation Year 2 (FY2)",
    country: "united_kingdom",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "uk_ct",
    label: "Core Surgical Training (CT1\u2013CT2)",
    country: "united_kingdom",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "uk_st_junior",
    label: "Specialty Registrar (ST3\u2013ST5)",
    country: "united_kingdom",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "uk_st_senior",
    label: "Specialty Registrar (ST6\u2013ST8)",
    country: "united_kingdom",
    seniorityTier: 3,
    isConsultantLevel: false,
  },
  {
    value: "uk_trust_grade",
    label: "Trust Grade / LED",
    country: "united_kingdom",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "uk_post_cct_fellow",
    label: "Post-CCT Fellow",
    country: "united_kingdom",
    seniorityTier: 4,
    isConsultantLevel: true,
  },
  {
    value: "uk_sas",
    label: "SAS Doctor",
    country: "united_kingdom",
    seniorityTier: 4,
    isConsultantLevel: true,
  },
  {
    value: "uk_consultant",
    label: "Consultant",
    country: "united_kingdom",
    seniorityTier: 5,
    isConsultantLevel: true,
  },
  {
    value: "uk_clinical_director",
    label: "Clinical Director",
    country: "united_kingdom",
    seniorityTier: 6,
    isConsultantLevel: true,
  },

  // DE
  {
    value: "de_assistenzarzt_junior",
    label: "Assistenzarzt (WB 1\u20132)",
    country: "germany",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "de_assistenzarzt_senior",
    label: "Assistenzarzt (WB 3\u20136)",
    country: "germany",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "de_fellow",
    label: "Fellow (Schwerpunkt)",
    country: "germany",
    seniorityTier: 3,
    isConsultantLevel: false,
  },
  {
    value: "de_facharzt",
    label: "Facharzt",
    country: "germany",
    seniorityTier: 4,
    isConsultantLevel: true,
  },
  {
    value: "de_oberarzt",
    label: "Oberarzt",
    country: "germany",
    seniorityTier: 5,
    isConsultantLevel: true,
  },
  {
    value: "de_leitender_oberarzt",
    label: "Leitender Oberarzt",
    country: "germany",
    seniorityTier: 6,
    isConsultantLevel: true,
  },
  {
    value: "de_chefarzt",
    label: "Chefarzt / Klinikdirektor",
    country: "germany",
    seniorityTier: 6,
    isConsultantLevel: true,
  },

  // CH
  {
    value: "ch_assistenzarzt_junior",
    label: "Assistenzarzt (WB 1\u20132)",
    country: "switzerland",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "ch_assistenzarzt_senior",
    label: "Assistenzarzt (WB 3\u20136)",
    country: "switzerland",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "ch_fellow",
    label: "Fellow (Schwerpunkt)",
    country: "switzerland",
    seniorityTier: 3,
    isConsultantLevel: false,
  },
  {
    value: "ch_oberarzt",
    label: "Oberarzt",
    country: "switzerland",
    seniorityTier: 4,
    isConsultantLevel: true,
  },
  {
    value: "ch_leitender_arzt",
    label: "Leitender Arzt",
    country: "switzerland",
    seniorityTier: 5,
    isConsultantLevel: true,
  },
  {
    value: "ch_chefarzt",
    label: "Chefarzt",
    country: "switzerland",
    seniorityTier: 6,
    isConsultantLevel: true,
  },

  // PL
  {
    value: "pl_stazysta",
    label: "Lekarz Sta\u017cysta",
    country: "poland",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "pl_rezydent_junior",
    label: "Lekarz Rezydent (lata 1\u20133)",
    country: "poland",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "pl_rezydent_senior",
    label: "Lekarz Rezydent (lata 4\u20136)",
    country: "poland",
    seniorityTier: 3,
    isConsultantLevel: false,
  },
  {
    value: "pl_specjalista",
    label: "Lekarz Specjalista",
    country: "poland",
    seniorityTier: 4,
    isConsultantLevel: true,
  },
  {
    value: "pl_starszy_asystent",
    label: "Starszy Asystent",
    country: "poland",
    seniorityTier: 5,
    isConsultantLevel: true,
  },
  {
    value: "pl_ordynator",
    label: "Ordynator / Kierownik Kliniki",
    country: "poland",
    seniorityTier: 6,
    isConsultantLevel: true,
  },

  // US
  {
    value: "us_intern",
    label: "Intern (PGY-1)",
    country: "united_states",
    seniorityTier: 1,
    isConsultantLevel: false,
  },
  {
    value: "us_resident_junior",
    label: "Resident (PGY-2 \u2013 PGY-3)",
    country: "united_states",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "us_resident_senior",
    label: "Resident (PGY-4 \u2013 PGY-6)",
    country: "united_states",
    seniorityTier: 3,
    isConsultantLevel: false,
  },
  {
    value: "us_fellow",
    label: "Fellow",
    country: "united_states",
    seniorityTier: 3,
    isConsultantLevel: false,
  },
  {
    value: "us_attending",
    label: "Attending Physician",
    country: "united_states",
    seniorityTier: 5,
    isConsultantLevel: true,
  },
  {
    value: "us_division_chief",
    label: "Division Chief / Chair",
    country: "united_states",
    seniorityTier: 6,
    isConsultantLevel: true,
  },

  // Other
  {
    value: "other_junior_trainee",
    label: "Junior Trainee",
    country: "other",
    seniorityTier: 2,
    isConsultantLevel: false,
  },
  {
    value: "other_senior_trainee",
    label: "Senior Trainee",
    country: "other",
    seniorityTier: 3,
    isConsultantLevel: false,
  },
  {
    value: "other_specialist",
    label: "Specialist",
    country: "other",
    seniorityTier: 4,
    isConsultantLevel: true,
  },
  {
    value: "other_senior_specialist",
    label: "Senior Specialist",
    country: "other",
    seniorityTier: 5,
    isConsultantLevel: true,
  },
];

/**
 * Returns career stage options for a given country.
 * Falls back to 'other' stages if no stages found for the country.
 */
export function getCareerStagesForCountry(
  countryOfPractice: string | null | undefined,
): CareerStageOption[] {
  if (!countryOfPractice) {
    return CAREER_STAGE_OPTIONS.filter((o) => o.country === "other");
  }
  const stages = CAREER_STAGE_OPTIONS.filter(
    (o) => o.country === countryOfPractice,
  );
  return stages.length > 0
    ? stages
    : CAREER_STAGE_OPTIONS.filter((o) => o.country === "other");
}

/**
 * Look up the display label for any career stage value (including legacy).
 * Returns the raw value if not found.
 */
export function getCareerStageLabel(careerStage: string): string {
  const option = CAREER_STAGE_OPTIONS.find((o) => o.value === careerStage);
  if (option) return option.label;

  // Legacy fallback labels
  const legacyLabels: Record<string, string> = {
    junior_house_officer: "Junior House Officer",
    registrar_non_training: "Registrar (Non-Training)",
    set_trainee: "SET Trainee",
    fellow: "Fellow",
    consultant_specialist: "Consultant / Specialist",
    moss: "Medical Officer Special Scale",
  };
  return legacyLabels[careerStage] ?? careerStage;
}
