import { z } from "zod";

export const PROFESSIONAL_REGISTRATION_OPTIONS = [
  {
    id: "new_zealand",
    label: "New Zealand",
    authority: "MCNZ",
    placeholder: "Enter MCNZ number",
  },
  {
    id: "australia",
    label: "Australia",
    authority: "AHPRA",
    placeholder: "Enter AHPRA number",
  },
  {
    id: "canada",
    label: "Canada",
    authority: "Provincial licence",
    placeholder: "Enter provincial registration number",
  },
  {
    id: "germany",
    label: "Germany",
    authority: "Approbation",
    placeholder: "Enter Approbation or licence number",
  },
  {
    id: "poland",
    label: "Poland",
    authority: "PWZ",
    placeholder: "Enter PWZ number",
  },
  {
    id: "austria",
    label: "Austria",
    authority: "Aerztekammer",
    placeholder: "Enter Austrian registration number",
  },
  {
    id: "switzerland",
    label: "Switzerland",
    authority: "MEBEKO",
    placeholder: "Enter MEBEKO number",
  },
  {
    id: "united_kingdom",
    label: "United Kingdom",
    authority: "GMC",
    placeholder: "Enter GMC number",
  },
  {
    id: "united_states",
    label: "United States",
    authority: "State licence / NPI",
    placeholder: "Enter licence or NPI",
  },
  {
    id: "other",
    label: "Other jurisdiction",
    authority: "Other",
    placeholder: "Enter registration number",
  },
] as const;

export type ProfessionalRegistrationJurisdiction =
  (typeof PROFESSIONAL_REGISTRATION_OPTIONS)[number]["id"];

export type ProfessionalRegistrations = Partial<
  Record<ProfessionalRegistrationJurisdiction, string>
>;

/** Tuple form of the jurisdiction ids, for `z.enum(...)`. */
export const PROFESSIONAL_REGISTRATION_JURISDICTIONS =
  PROFESSIONAL_REGISTRATION_OPTIONS.map((o) => o.id) as [
    ProfessionalRegistrationJurisdiction,
    ...ProfessionalRegistrationJurisdiction[],
  ];

export function isProfessionalRegistrationJurisdiction(
  value: unknown,
): value is ProfessionalRegistrationJurisdiction {
  return (
    typeof value === "string" &&
    (PROFESSIONAL_REGISTRATION_JURISDICTIONS as string[]).includes(value)
  );
}

export const professionalRegistrationsSchema = z
  .object({
    new_zealand: z.string().trim().max(64).nullable().optional(),
    australia: z.string().trim().max(64).nullable().optional(),
    canada: z.string().trim().max(64).nullable().optional(),
    germany: z.string().trim().max(64).nullable().optional(),
    poland: z.string().trim().max(64).nullable().optional(),
    austria: z.string().trim().max(64).nullable().optional(),
    switzerland: z.string().trim().max(64).nullable().optional(),
    united_kingdom: z.string().trim().max(64).nullable().optional(),
    united_states: z.string().trim().max(64).nullable().optional(),
    other: z.string().trim().max(64).nullable().optional(),
  })
  .strict();

type ProfessionalRegistrationsInput =
  | Partial<Record<ProfessionalRegistrationJurisdiction, string | null>>
  | null
  | undefined;

function cleanRegistrationNumber(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeProfessionalRegistrations(
  registrations: ProfessionalRegistrationsInput,
): ProfessionalRegistrations | undefined {
  if (!registrations) {
    return undefined;
  }

  const normalized: ProfessionalRegistrations = {};

  for (const option of PROFESSIONAL_REGISTRATION_OPTIONS) {
    const value = cleanRegistrationNumber(registrations[option.id]);
    if (value) {
      normalized[option.id] = value;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function getRegistrationJurisdictionForCountry(
  countryOfPractice: string | null | undefined,
): ProfessionalRegistrationJurisdiction | undefined {
  switch (countryOfPractice) {
    case "new_zealand":
      return "new_zealand";
    case "australia":
      return "australia";
    case "canada":
      return "canada";
    case "germany":
      return "germany";
    case "poland":
      return "poland";
    case "austria":
      return "austria";
    case "switzerland":
      return "switzerland";
    case "united_kingdom":
      return "united_kingdom";
    case "united_states":
      return "united_states";
    default:
      return undefined;
  }
}

export function getProfessionalRegistrations(
  registrations: ProfessionalRegistrationsInput,
  legacyMedicalCouncilNumber?: string | null,
  countryOfPractice?: string | null,
): ProfessionalRegistrations | undefined {
  const normalized = normalizeProfessionalRegistrations(registrations);
  if (normalized) {
    return normalized;
  }

  const legacyNumber = cleanRegistrationNumber(legacyMedicalCouncilNumber);
  if (!legacyNumber) {
    return undefined;
  }

  const fallbackJurisdiction =
    getRegistrationJurisdictionForCountry(countryOfPractice) ?? "other";

  return {
    [fallbackJurisdiction]: legacyNumber,
  };
}

export function getLegacyMedicalCouncilNumber(
  registrations: ProfessionalRegistrationsInput,
  countryOfPractice?: string | null,
): string | null {
  const normalized = normalizeProfessionalRegistrations(registrations);
  if (!normalized) {
    return null;
  }

  const primaryJurisdiction =
    getRegistrationJurisdictionForCountry(countryOfPractice);
  if (primaryJurisdiction && normalized[primaryJurisdiction]) {
    return normalized[primaryJurisdiction] ?? null;
  }

  for (const option of PROFESSIONAL_REGISTRATION_OPTIONS) {
    const value = normalized[option.id];
    if (value) {
      return value;
    }
  }

  return null;
}

export function getProfessionalRegistrationEntries(
  registrations: ProfessionalRegistrationsInput,
  legacyMedicalCouncilNumber?: string | null,
  countryOfPractice?: string | null,
) {
  const resolved = getProfessionalRegistrations(
    registrations,
    legacyMedicalCouncilNumber,
    countryOfPractice,
  );

  if (!resolved) {
    return [];
  }

  return PROFESSIONAL_REGISTRATION_OPTIONS.flatMap((option) => {
    const number = resolved[option.id];
    if (!number) {
      return [];
    }

    return [
      {
        jurisdiction: option.id,
        label: option.label,
        authority: option.authority,
        number,
      },
    ];
  });
}

// ── Registration lookup keys (colleague matching) ────────────────────────────
//
// Registration numbers are matched on a canonical form: uppercase alphanumerics
// only, so "12 345-ab", "12345AB" and " 12345ab " are one identity. The stored
// display value keeps the surgeon's formatting; only the lookup key is
// normalised. The same normalisation runs in SQL inside
// migrations/20260911_team_linking_identifiers.sql
// (`upper(regexp_replace(v, '[^A-Za-z0-9]', '', 'g'))`) — keep them in step.

export const REGISTRATION_LOOKUP_PREFIX = "reg:";

export function normalizeRegistrationNumber(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const normalized = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * `reg:<jurisdiction>:<NORMALISED>` — the string that enters the PSI member
 * set and the `profiles.registration_lookup_keys` array. `null` when the
 * jurisdiction is unknown or the number normalises to nothing.
 */
export function buildRegistrationLookupKey(
  jurisdiction: string | null | undefined,
  number: string | null | undefined,
): string | null {
  if (!isProfessionalRegistrationJurisdiction(jurisdiction)) return null;
  const normalized = normalizeRegistrationNumber(number);
  if (!normalized) return null;
  return `${REGISTRATION_LOOKUP_PREFIX}${jurisdiction}:${normalized}`;
}

/**
 * Every lookup key for a profile — includes the legacy `medicalCouncilNumber`
 * fallback exactly as `getProfessionalRegistrationEntries` resolves it for
 * display, so what the surgeon sees on their profile is what colleagues can
 * match on.
 */
export function buildRegistrationLookupKeys(
  registrations: ProfessionalRegistrationsInput,
  legacyMedicalCouncilNumber?: string | null,
  countryOfPractice?: string | null,
): string[] {
  const keys = new Set<string>();
  for (const entry of getProfessionalRegistrationEntries(
    registrations,
    legacyMedicalCouncilNumber,
    countryOfPractice,
  )) {
    const key = buildRegistrationLookupKey(entry.jurisdiction, entry.number);
    if (key) keys.add(key);
  }
  return [...keys].sort();
}
