/**
 * Background contact discovery service.
 *
 * Checks whether unlinked team contacts have joined Opus.
 * Runs at most once per 24 hours, non-blocking after auth.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getTeamContacts,
  discoverContacts,
  type DiscoverContactInput,
  type DiscoverMatch,
} from "./teamContactsApi";

const LAST_RUN_KEY = "@opus_discovery_last_run";
const MATCHES_KEY = "@opus_discovery_matches";
const THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Run background discovery for unlinked contacts.
 * Returns the number of new matches found, or 0 if throttled/skipped.
 */
export async function discoverUnlinkedContacts(): Promise<number> {
  try {
    // Throttle: skip if last run was within 24h
    const lastRun = await AsyncStorage.getItem(LAST_RUN_KEY);
    if (lastRun && Date.now() - Number(lastRun) < THROTTLE_MS) {
      return 0;
    }

    // Fetch all team contacts
    const contacts = await getTeamContacts();

    // Filter to unlinked contacts with at least one identifier
    const unlinked = contacts.filter(
      (c) =>
        !c.linkedUserId &&
        (c.email || c.phone || c.registrationNumber),
    );

    if (unlinked.length === 0) {
      await AsyncStorage.setItem(LAST_RUN_KEY, String(Date.now()));
      return 0;
    }

    // Build discovery input
    const input: DiscoverContactInput[] = unlinked.map((c) => ({
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
    await AsyncStorage.setItem(MATCHES_KEY, JSON.stringify(allMatches));
    await AsyncStorage.setItem(LAST_RUN_KEY, String(Date.now()));

    return allMatches.length;
  } catch (error) {
    console.warn("Discovery check failed:", error);
    return 0;
  }
}

/**
 * Get cached discovery matches (from last successful run).
 */
export async function getDiscoveryMatches(): Promise<DiscoverMatch[]> {
  try {
    const raw = await AsyncStorage.getItem(MATCHES_KEY);
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
  await AsyncStorage.setItem(MATCHES_KEY, JSON.stringify(updated));
}

/**
 * Clear all discovery state (used on logout).
 */
export async function clearDiscoveryState(): Promise<void> {
  await AsyncStorage.multiRemove([LAST_RUN_KEY, MATCHES_KEY]);
}
