/**
 * PSI member-set construction (pure). The server evaluates every
 * discoverable user's matchable identifiers under the per-request OPRF key
 * and returns the PRF outputs; the client intersects locally.
 */
import { randomBytes } from "node:crypto";
import { isE164 } from "@shared/phone";
import { isSyntheticAppleEmail } from "./utils";

export interface DiscoverableIdentifierRow {
  email: string | null;
  phone: string | null;
  discoverable: boolean | null;
  registrationLookupKeys: string[] | null;
}

/**
 * Emails (already lowercase per the 20260425 migration), E.164 phones and
 * `reg:` lookup keys of every discoverable user. Skips opt-outs and the
 * synthetic Apple-relay placeholders (`apple_<sub>@private.opus.local`)
 * that can never equal a real contact email. Phones that somehow aren't
 * E.164 are skipped rather than emitted in a form no client can match.
 */
export function buildDiscoverableIdentifiers(
  rows: DiscoverableIdentifierRow[],
): string[] {
  const out = new Set<string>();
  for (const row of rows) {
    if (row.discoverable === false) continue;
    if (row.email && !isSyntheticAppleEmail(row.email)) out.add(row.email);
    if (row.phone && isE164(row.phone)) out.add(row.phone);
    for (const key of row.registrationLookupKeys ?? []) {
      if (key) out.add(key);
    }
  }
  return [...out];
}

/**
 * Hide the exact discoverable-identifier count from the PSI response by
 * padding the (sorted) member list with random hex strings of the same
 * length up to the next multiple of `multiple`. A dummy can't collide with
 * a real PRF output (256 bits of randomness), so intersection is unaffected.
 * Re-sorted after padding so dummies aren't distinguishable by position.
 */
export function padMemberSet(members: string[], multiple = 32): string[] {
  const width = members[0]?.length ?? 128;
  const target = Math.max(
    multiple,
    Math.ceil(members.length / multiple) * multiple,
  );
  const padded = [...members];
  while (padded.length < target) {
    padded.push(
      randomBytes(Math.ceil(width / 2))
        .toString("hex")
        .slice(0, width),
    );
  }
  return padded.sort();
}
