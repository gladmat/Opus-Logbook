/**
 * Background contact discovery service.
 *
 * Checks whether unlinked team contacts have joined Opus.
 * Runs at most once per 24 hours, non-blocking after auth.
 *
 * All cached state is user-scoped: an AsyncStorage key that identifies a
 * specific Opus user's discovery matches must never be readable by a
 * different user on the same device. Prior versions used the unscoped keys
 * `@opus_discovery_last_run` / `@opus_discovery_matches`, which would leak
 * cached matches + last-run timestamps across logout/login boundaries.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { userScopedAsyncKey } from "./activeUser";
import {
  getTeamContacts,
  discoverContacts,
  discoverContactsPsi,
  type DiscoverContactInput,
  type DiscoverMatch,
} from "./teamContactsApi";
import {
  blindIdentifiers,
  finalizeAndIntersect,
  normalizeDiscoveryEmail,
  normalizeDiscoveryPhone,
  type IdentifierInput,
} from "./psiDiscovery";
import { buildRegistrationLookupKey } from "@shared/professionalRegistrations";
import type { PhoneRegion } from "@shared/phone";
import type { TeamContact } from "@/types/teamContacts";

const LAST_RUN_BASE_KEY = "@opus_discovery_last_run";
const MATCHES_BASE_KEY = "@opus_discovery_matches";
const THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours

function lastRunKey(): string {
  return userScopedAsyncKey(LAST_RUN_BASE_KEY);
}
function matchesKey(): string {
  return userScopedAsyncKey(MATCHES_BASE_KEY);
}

export interface DiscoveryOptions {
  /** Owner's default region for national-format contact phones. */
  phoneRegion?: PhoneRegion;
}

/** A contact's matchable identifiers in the exact forms the server matches on. */
export interface ContactIdentifiers {
  email?: string;
  /** E.164 */
  phone?: string;
  /** `reg:<jurisdiction>:<NORM>` — PSI member-set form. */
  registrationKey?: string;
  registrationNumber?: string;
  registrationJurisdiction?: string;
}

/**
 * Single source of truth for BOTH the PSI pre-filter and the /discover
 * payload, so the two hops can never disagree (they used to: PSI trimmed
 * phones, /discover sent them raw).
 */
export function buildContactIdentifiers(
  contact: Pick<
    TeamContact,
    "email" | "phone" | "registrationNumber" | "registrationJurisdiction"
  >,
  region?: PhoneRegion,
): ContactIdentifiers {
  const ids: ContactIdentifiers = {};
  if (contact.email?.trim()) ids.email = normalizeDiscoveryEmail(contact.email);
  if (contact.phone) {
    const e164 = normalizeDiscoveryPhone(contact.phone, region);
    if (e164) ids.phone = e164;
  }
  const key = buildRegistrationLookupKey(
    contact.registrationJurisdiction,
    contact.registrationNumber,
  );
  if (key && contact.registrationNumber && contact.registrationJurisdiction) {
    ids.registrationKey = key;
    ids.registrationNumber = contact.registrationNumber;
    ids.registrationJurisdiction = contact.registrationJurisdiction;
  }
  return ids;
}

export function hasContactIdentifier(ids: ContactIdentifiers): boolean {
  return !!(ids.email || ids.phone || ids.registrationKey);
}

/**
 * Run background discovery for unlinked contacts.
 * Returns the number of new matches found, or 0 if throttled/skipped.
 */
export async function discoverUnlinkedContacts(
  opts: DiscoveryOptions = {},
): Promise<number> {
  try {
    // Throttle: skip if last run was within 24h
    const lastRun = await AsyncStorage.getItem(lastRunKey());
    if (lastRun && Date.now() - Number(lastRun) < THROTTLE_MS) {
      return 0;
    }

    // Fetch all team contacts
    const contacts = await getTeamContacts();

    // Unlinked contacts that carry at least one MATCHABLE identifier (a
    // phone that can't be normalised, or a registration without a
    // jurisdiction, is not one).
    const unlinked = contacts
      .filter((c) => !c.linkedUserId)
      .map((contact) => ({
        contact,
        ids: buildContactIdentifiers(contact, opts.phoneRegion),
      }))
      .filter((entry) => hasContactIdentifier(entry.ids));

    // Deliberately NOT stamping lastRun here: a zero-candidate round costs
    // one contacts fetch and nothing else, and stamping it used to consume
    // the 24h window right before the user added an email to a contact.
    // Cost-bearing rounds (PSI ran) stamp below.
    if (unlinked.length === 0) {
      return 0;
    }

    // PSI pre-filter: determine which unlinked contacts are Opus members
    // WITHOUT revealing the others to the server. Only the matched subset
    // proceeds to the legacy /discover endpoint for details — a disclosure
    // the server inherently gains at link time anyway. `null` = the server
    // doesn't support PSI yet (older deployment) → legacy full-batch path.
    const psiMatched = await psiPreFilter(unlinked);
    const candidates =
      psiMatched === null
        ? unlinked
        : unlinked.filter((entry) => psiMatched.has(entry.contact.id));

    if (candidates.length === 0) {
      await AsyncStorage.setItem(matchesKey(), JSON.stringify([]));
      await AsyncStorage.setItem(lastRunKey(), String(Date.now()));
      return 0;
    }

    // Build discovery input from the SAME normalised identifiers.
    const input: DiscoverContactInput[] = candidates.map(
      ({ contact, ids }) => ({
        contactId: contact.id,
        ...(ids.email ? { email: ids.email } : {}),
        ...(ids.phone ? { phone: ids.phone } : {}),
        ...(ids.registrationNumber && ids.registrationJurisdiction
          ? {
              registrationNumber: ids.registrationNumber,
              registrationJurisdiction: ids.registrationJurisdiction,
            }
          : {}),
      }),
    );

    // Batch discover (max 50 per request)
    const allMatches: DiscoverMatch[] = [];
    for (let i = 0; i < input.length; i += 50) {
      const batch = input.slice(i, i + 50);
      const matches = await discoverContacts(batch);
      allMatches.push(...matches);
    }

    // Store matches and timestamp
    await AsyncStorage.setItem(matchesKey(), JSON.stringify(allMatches));
    await AsyncStorage.setItem(lastRunKey(), String(Date.now()));

    return allMatches.length;
  } catch (error) {
    if (__DEV__) console.warn("Discovery check failed:", error);
    return 0;
  }
}

/**
 * Run the OPRF membership pre-filter over every contact identifier.
 * Returns the set of matched contactIds, or `null` when the server has no
 * PSI endpoint (legacy fallback). Throws on protocol errors — the caller's
 * catch aborts the whole discovery round rather than degrading to the
 * plaintext path, so a flaky PSI never silently leaks the address book.
 */
async function psiPreFilter(
  unlinked: { contact: TeamContact; ids: ContactIdentifiers }[],
): Promise<Set<string> | null> {
  const identifiers: IdentifierInput[] = [];
  for (const { contact, ids } of unlinked) {
    if (ids.email)
      identifiers.push({ ref: `${contact.id}|email`, value: ids.email });
    if (ids.phone)
      identifiers.push({ ref: `${contact.id}|phone`, value: ids.phone });
    if (ids.registrationKey) {
      identifiers.push({
        ref: `${contact.id}|reg`,
        value: ids.registrationKey,
      });
    }
  }
  if (identifiers.length === 0) return new Set();

  const matched = new Set<string>();
  for (let i = 0; i < identifiers.length; i += 50) {
    const slice = identifiers.slice(i, i + 50);
    const { payload, contexts } = blindIdentifiers(slice);
    const response = await discoverContactsPsi(payload);
    if (response === null) return null;
    const refs = finalizeAndIntersect(
      contexts,
      response.evaluated,
      response.members,
    );
    for (const ref of refs) {
      const contactId = ref.split("|")[0];
      if (contactId) matched.add(contactId);
    }
  }
  return matched;
}

/**
 * Drop the 24h throttle stamp so the next `discoverUnlinkedContacts()` runs
 * immediately. Called when a contact gains/changes an identifier — the
 * moment discovery is most likely to find something new. Cached matches
 * stay valid. Best-effort, never throws.
 */
export async function markDiscoveryStale(): Promise<void> {
  try {
    await AsyncStorage.removeItem(lastRunKey());
  } catch {
    // Non-fatal — the regular 24h cycle still applies.
  }
}

/**
 * Get cached discovery matches (from last successful run).
 */
export async function getDiscoveryMatches(): Promise<DiscoverMatch[]> {
  try {
    const raw = await AsyncStorage.getItem(matchesKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a match after it has been acted on (linked or dismissed).
 */
export async function removeDiscoveryMatch(contactId: string): Promise<void> {
  try {
    const matches = await getDiscoveryMatches();
    const updated = matches.filter((m) => m.contactId !== contactId);
    await AsyncStorage.setItem(matchesKey(), JSON.stringify(updated));
  } catch {
    // Cosmetic cache — must never turn a successful link into "Link Failed"
    // (matchesKey() throws when no active user is set).
  }
}

/**
 * Clear all discovery state (used on logout).
 * Best-effort — failures here should not block logout.
 */
export async function clearDiscoveryState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([lastRunKey(), matchesKey()]);
  } catch {
    // Ignore — logout proceeds even if cache clear fails.
  }
}
