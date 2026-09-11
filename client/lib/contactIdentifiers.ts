/**
 * Dependency-free helpers over a contact's matchable identifiers. Kept apart
 * from caseSharing.ts (which pulls in E2EE + native crypto) so UI modules and
 * their tests can import it without the whole share pipeline.
 */
export interface LinkIdentifiers {
  email?: string | null;
  phone?: string | null;
  registrationNumber?: string | null;
  registrationJurisdiction?: string | null;
}

/** Anything the server can match a contact on (email, phone, or a full registration pair). */
export function hasLinkIdentifier(m: LinkIdentifiers): boolean {
  return !!(
    m.email?.trim() ||
    m.phone?.trim() ||
    (m.registrationNumber?.trim() && m.registrationJurisdiction)
  );
}
