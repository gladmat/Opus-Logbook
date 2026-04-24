/**
 * Canonicalise an email address before any persistence or lookup.
 * All server paths that compare, store, or index emails must go through this
 * so that `Foo@Example.com` and `foo@example.com` are treated as one account.
 *
 * The rules are intentionally narrow: trim outer whitespace, then lowercase.
 * We do NOT strip gmail-style `+tag` aliases or internal dots — those are
 * user-visible identifiers that vary by provider.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * SNOMED CT concept IDs are purely numeric, up to 18 digits (SCTID format).
 * Reject anything else before interpolating into an external URL.
 */
export const SNOMED_CONCEPT_ID_RE = /^\d{1,18}$/;
