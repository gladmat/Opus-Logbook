/**
 * Server-side verification of team-contact links (pure — storage injected).
 *
 * Before 2.26.0 `PUT /api/team-contacts/:id/link` trusted whatever
 * `linkedUserId` the client sent: any discoverable account could be linked
 * to any contact (leaking that account's careerStage via the COALESCE
 * copy), a contact could be linked to its own owner, and two contacts
 * could point at one account. The link is now resolved from the contact's
 * OWN stored identifiers and the requested user must be among them.
 */
import { normalizeEmail } from "./utils";
import { normalizePhoneE164, type PhoneRegion } from "@shared/phone";
import { buildRegistrationLookupKey } from "@shared/professionalRegistrations";
import type { LinkErrorCode } from "./validation/teamContacts";

export interface ContactIdentifiers {
  email: string | null;
  phone: string | null;
  registrationNumber: string | null;
  registrationJurisdiction: string | null;
}

export interface LinkableContact extends ContactIdentifiers {
  id: string;
  ownerUserId: string;
  displayName: string;
  linkedUserId: string | null;
}

export interface DiscoverableProfile {
  discoverable: boolean | null;
  fullName?: string | null;
}

export interface LinkResolverDeps {
  getUser(id: string): Promise<{ id: string } | undefined>;
  getProfile(userId: string): Promise<DiscoverableProfile | undefined>;
  getUserByEmail(email: string): Promise<{ id: string } | undefined>;
  getUserByPhone(e164: string): Promise<{ id: string } | undefined>;
  getUserByRegistrationKey(key: string): Promise<{ id: string } | undefined>;
  findContactLinkedTo(
    ownerUserId: string,
    linkedUserId: string,
  ): Promise<{ id: string; displayName: string } | undefined>;
}

/**
 * Missing profile = discoverable (the column defaults to true and the Apple
 * sign-in path can leave a user briefly profile-less). One helper so every
 * gate agrees instead of four hand-written `profile && ... === false`.
 */
export function isDiscoverable(
  profile: { discoverable: boolean | null } | undefined | null,
): boolean {
  return profile?.discoverable !== false;
}

/**
 * Every discoverable user the contact's identifiers resolve to, in
 * email → phone → registration priority, deduplicated.
 */
export async function resolveLinkCandidates(
  deps: LinkResolverDeps,
  contact: ContactIdentifiers,
): Promise<string[]> {
  const found: string[] = [];
  const consider = async (user: { id: string } | undefined) => {
    if (!user || found.includes(user.id)) return;
    if (!isDiscoverable(await deps.getProfile(user.id))) return;
    found.push(user.id);
  };

  if (contact.email) {
    await consider(await deps.getUserByEmail(normalizeEmail(contact.email)));
  }
  if (contact.phone) {
    // Stored phones are E.164 since 2.26.0; a legacy national-format value
    // simply won't resolve (it never did).
    const e164 = normalizePhoneE164(contact.phone);
    if (e164) await consider(await deps.getUserByPhone(e164));
  }
  const regKey = buildRegistrationLookupKey(
    contact.registrationJurisdiction,
    contact.registrationNumber,
  );
  if (regKey) {
    await consider(await deps.getUserByRegistrationKey(regKey));
  }
  return found;
}

export type LinkVerdict =
  | { ok: true; userId: string; alreadyLinked: boolean }
  | {
      ok: false;
      status: 403 | 404 | 409;
      code: LinkErrorCode;
      message: string;
      conflict?: { contactId: string; displayName: string };
    };

export async function verifyLinkRequest(
  deps: LinkResolverDeps,
  args: { contact: LinkableContact; requestedUserId: string },
): Promise<LinkVerdict> {
  const { contact, requestedUserId } = args;

  if (requestedUserId === contact.ownerUserId) {
    return {
      ok: false,
      status: 403,
      code: "SELF_LINK",
      message: "You can't link a contact to your own account.",
    };
  }

  if (contact.linkedUserId) {
    if (contact.linkedUserId === requestedUserId) {
      return { ok: true, userId: requestedUserId, alreadyLinked: true };
    }
    return {
      ok: false,
      status: 409,
      code: "CONTACT_ALREADY_LINKED",
      message: `${contact.displayName} is already linked to a different Opus account. Unlink them first.`,
    };
  }

  const target = await deps.getUser(requestedUserId);
  if (!target || !isDiscoverable(await deps.getProfile(target.id))) {
    return {
      ok: false,
      status: 404,
      code: "NO_IDENTIFIER_MATCH",
      message: "Target user not found",
    };
  }

  const candidates = await resolveLinkCandidates(deps, contact);
  if (!candidates.includes(requestedUserId)) {
    return {
      ok: false,
      status: 409,
      code: "NO_IDENTIFIER_MATCH",
      message: `${contact.displayName}'s email, phone or registration doesn't match that Opus account.`,
    };
  }

  const other = await deps.findContactLinkedTo(
    contact.ownerUserId,
    requestedUserId,
  );
  if (other && other.id !== contact.id) {
    return {
      ok: false,
      status: 409,
      code: "DUPLICATE_LINK",
      message: `${other.displayName} is already linked to this Opus account.`,
      conflict: { contactId: other.id, displayName: other.displayName },
    };
  }

  return { ok: true, userId: requestedUserId, alreadyLinked: false };
}

export type LockedIdentifier = "email" | "phone" | "registration";

/**
 * Which identifiers a PUT actually changes on a contact. Keys absent from
 * the patch are untouched; values that normalise to the stored value
 * (case, spacing, national vs E.164) are NOT changes. Used to lock the
 * identifiers of a linked contact — a changed email would otherwise leave
 * `linkedUserId` (the E2EE share recipient) pointing at the old account.
 */
export function lockedIdentifierChanges(
  existing: ContactIdentifiers,
  patch: Partial<{
    email: string | null;
    phone: string | null;
    registrationNumber: string | null;
    registrationJurisdiction: string | null;
  }>,
  region?: PhoneRegion,
): LockedIdentifier[] {
  const changes: LockedIdentifier[] = [];
  // JSON can't carry `undefined`, but callers building patches in code can;
  // treat it exactly like an absent key.
  const has = (key: keyof typeof patch): boolean =>
    key in patch && patch[key] !== undefined;

  if (has("email")) {
    const next = patch.email ? normalizeEmail(patch.email) : null;
    const prev = existing.email ? normalizeEmail(existing.email) : null;
    if (next !== prev) changes.push("email");
  }

  if (has("phone")) {
    const canon = (v: string | null | undefined) =>
      v ? (normalizePhoneE164(v, region) ?? v.trim() ?? null) : null;
    if (canon(patch.phone) !== canon(existing.phone)) changes.push("phone");
  }

  if (has("registrationNumber") || has("registrationJurisdiction")) {
    const nextJur = has("registrationJurisdiction")
      ? (patch.registrationJurisdiction ?? null)
      : existing.registrationJurisdiction;
    const nextNum = has("registrationNumber")
      ? (patch.registrationNumber ?? null)
      : existing.registrationNumber;
    const nextKey =
      buildRegistrationLookupKey(nextJur, nextNum) ??
      (nextNum?.trim() ? `${nextJur ?? ""}:${nextNum.trim()}` : null);
    const prevKey =
      buildRegistrationLookupKey(
        existing.registrationJurisdiction,
        existing.registrationNumber,
      ) ??
      (existing.registrationNumber?.trim()
        ? `${existing.registrationJurisdiction ?? ""}:${existing.registrationNumber.trim()}`
        : null);
    if (nextKey !== prevKey) changes.push("registration");
  }

  return changes;
}
