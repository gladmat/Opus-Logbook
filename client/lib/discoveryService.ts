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

/**
 * Run background discovery for unlinked contacts.
 * Returns the number of new matches found, or 0 if throttled/skipped.
 */
export async function discoverUnlinkedContacts(): Promise<number> {
  try {
    // Throttle: skip if last run was within 24h
    const lastRun = await AsyncStorage.getItem(lastRunKey());
    if (lastRun && Date.now() - Number(lastRun) < THROTTLE_MS) {
      return 0;
    }

    // Fetch all team contacts
    const contacts = await getTeamContacts();

    // Filter to unlinked contacts with at least one identifier
    const unlinked = contacts.filter(
      (c) => !c.linkedUserId && (c.email || c.phone || c.registrationNumber),
    );

    if (unlinked.length === 0) {
      await AsyncStorage.setItem(lastRunKey(), String(Date.now()));
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
        : unlinked.filter((c) => psiMatched.has(c.id));

    if (candidates.length === 0) {
      await AsyncStorage.setItem(matchesKey(), JSON.stringify([]));
      await AsyncStorage.setItem(lastRunKey(), String(Date.now()));
      return 0;
    }

    // Build discovery input
    const input: DiscoverContactInput[] = candidates.map((c) => ({
      contactId: c.id,
      ...(c.email ? { email: c.email } : {}),
      ...(c.phone ? { phone: c.phone } : {}),
      ...(c.registrationNumber
        ? {
            registrationNumber: c.registrationNumber,
            registrationJurisdiction: c.registrationJurisdiction ?? undefined,
          }
        : {}),
    }));

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
  unlinked: TeamContact[],
): Promise<Set<string> | null> {
  const identifiers: IdentifierInput[] = [];
  for (const contact of unlinked) {
    if (contact.email) {
      identifiers.push({
        ref: `${contact.id}|email`,
        value: normalizeDiscoveryEmail(contact.email),
      });
    }
    if (contact.phone) {
      identifiers.push({
        ref: `${contact.id}|phone`,
        value: normalizeDiscoveryPhone(contact.phone),
      });
    }
  }
  // Registration-number-only contacts have no PSI-matchable identifier;
  // the legacy endpoint defers registration lookups too, so parity holds.
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
  const matches = await getDiscoveryMatches();
  const updated = matches.filter((m) => m.contactId !== contactId);
  await AsyncStorage.setItem(matchesKey(), JSON.stringify(updated));
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
