/**
 * Phone-number canonicalisation shared by client + server.
 *
 * Every phone that participates in colleague matching — `profiles.phone`,
 * `team_contacts.phone`, the PSI member set, `/api/users/search?phone=`,
 * `/api/users/discover` — is stored and compared as E.164 (`+64211234567`).
 * Before 2.26.0 phones were compared as raw strings (trim only), so
 * "+64 21 123 4567", "021 123 4567" and "+64211234567" were three different
 * identities and never matched.
 *
 * The default region (for national-format input like "021 123 4567") comes
 * from the OWNER's `countryOfPractice` — the person typing the number — not
 * the contact's, because the contact has no country of their own.
 */
// `libphonenumber-js/core` + explicit metadata instead of the bundled
// `libphonenumber-js/min` entry: the min entry loads its metadata through a
// JSON `import`, which tsx (the dev server loader) wraps as `{ default }`
// and the library then rejects ("not a valid metadata"). Passing the JS
// metadata wrapper ourselves works identically under tsx, esbuild
// (Railway), Metro and vitest.
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.min";

export type PhoneRegion =
  | "NZ"
  | "AU"
  | "GB"
  | "US"
  | "PL"
  | "DE"
  | "CH"
  | "CA"
  | "AT";

export const COUNTRY_OF_PRACTICE_TO_PHONE_REGION: Record<string, PhoneRegion> =
  {
    new_zealand: "NZ",
    australia: "AU",
    united_kingdom: "GB",
    united_states: "US",
    poland: "PL",
    germany: "DE",
    switzerland: "CH",
    canada: "CA",
    austria: "AT",
  };

export function getDefaultPhoneRegion(
  countryOfPractice: string | null | undefined,
): PhoneRegion | undefined {
  if (!countryOfPractice) return undefined;
  return COUNTRY_OF_PRACTICE_TO_PHONE_REGION[countryOfPractice];
}

/** Mirrors the `profiles_phone_is_e164` CHECK constraint. */
export const E164_RE = /^\+[1-9]\d{1,14}$/;

export function isE164(value: string): boolean {
  return E164_RE.test(value);
}

/**
 * Parse any user-typed phone into E.164, or `null` when it is blank or
 * cannot be parsed as a VALID number. National-format input needs a
 * `region`; input that already carries `+CC` parses without one.
 *
 * Returns `null` (never throws) so callers decide between "reject the
 * save" (forms) and "skip this identifier" (discovery).
 */
export function normalizePhoneE164(
  raw: string | null | undefined,
  region?: PhoneRegion,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  // "00" is the international dialling prefix in every supported region
  // except US/CA ("011"); libphonenumber only recognises it when a region
  // is supplied, so rewrite it up front (the SQL backfill does the same).
  const candidate = trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
  try {
    const parsed = parsePhoneNumberFromString(
      candidate,
      { defaultCountry: region as CountryCode | undefined },
      metadata,
    );
    // isPossible() (length rules) rather than isValid() (per-range
    // patterns): bundled metadata lags real allocations, and a surgeon
    // must never be blocked from saving a colleague's genuine number. A
    // wrong-but-plausible number simply never matches anyone.
    if (!parsed || !parsed.isPossible()) return null;
    return isE164(parsed.number) ? parsed.number : null;
  } catch {
    return null;
  }
}

/** "+64211234567" → "+64 21 123 4567". Falls back to the input verbatim. */
export function formatPhoneForDisplay(e164: string): string {
  try {
    const parsed = parsePhoneNumberFromString(e164, metadata);
    return parsed ? parsed.formatInternational() : e164;
  } catch {
    return e164;
  }
}
