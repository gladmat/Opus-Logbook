/**
 * Private-set-intersection contact discovery (client-side protocol half).
 *
 * Problem this closes: the legacy `/api/users/discover` endpoint receives
 * the user's unlinked contacts' emails/phones in PLAINTEXT, so the server
 * learns the surgeon's address book — including colleagues who are not on
 * Opus and never consented to anything.
 *
 * Protocol (RFC 9497 OPRF over ristretto255, via @noble/curves —
 * `ristretto255_oprf`, audited implementation, already a dependency):
 *
 *   1. Client BLINDS each contact identifier and sends only the blinded
 *      group elements → the server learns nothing about the identifiers.
 *   2. Server picks a fresh random OPRF key k for THIS request, returns
 *      (a) each blinded element evaluated under k, and (b) the PRF_k
 *      outputs of every discoverable Opus user's identifiers.
 *      Because k is ephemeral and never reused, the member list cannot be
 *      correlated across requests, and the client cannot build an offline
 *      dictionary of the user base beyond this one response.
 *   3. Client UNBLINDS + finalizes locally and intersects with the member
 *      set. Only contacts that ARE Opus members are then sent (plaintext)
 *      to the legacy endpoint to fetch userId/displayName/device keys —
 *      a disclosure the server inherently gains at link time anyway.
 *
 * Net effect: the server never learns non-member contacts.
 */

import { ristretto255_oprf } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

const oprf = ristretto255_oprf.oprf;

/** Matches server-side normalizeEmail (lowercase + trim). */
export function normalizeDiscoveryEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Phone parity with the legacy exact-match semantics (profiles.phone is
 * compared as an exact string) — trim only, no reformatting.
 */
export function normalizeDiscoveryPhone(phone: string): string {
  return phone.trim();
}

export interface IdentifierInput {
  /** Caller-chosen reference, echoed back per blinded element. */
  ref: string;
  /** Normalized identifier string (email or phone). */
  value: string;
}

export interface BlindedIdentifier {
  ref: string;
  /** Hex-encoded blinded ristretto255 element (64 hex chars). */
  point: string;
}

export interface BlindContext {
  ref: string;
  input: Uint8Array;
  blind: Uint8Array;
}

/**
 * Step 1 — blind every identifier. Returns the wire payload and the
 * per-identifier secrets needed to finalize the server's response.
 */
export function blindIdentifiers(identifiers: IdentifierInput[]): {
  payload: BlindedIdentifier[];
  contexts: BlindContext[];
} {
  const payload: BlindedIdentifier[] = [];
  const contexts: BlindContext[] = [];
  for (const identifier of identifiers) {
    const input = utf8ToBytes(identifier.value);
    const { blind, blinded } = oprf.blind(input);
    payload.push({ ref: identifier.ref, point: bytesToHex(blinded) });
    contexts.push({ ref: identifier.ref, input, blind });
  }
  return { payload, contexts };
}

/**
 * Step 3 — finalize the server's evaluated elements and intersect with the
 * member PRF set. Returns the refs whose identifier is an Opus member.
 */
export function finalizeAndIntersect(
  contexts: BlindContext[],
  evaluated: { ref: string; point: string }[],
  members: string[],
): Set<string> {
  const evaluatedByRef = new Map(evaluated.map((e) => [e.ref, e.point]));
  const memberSet = new Set(members);
  const matchedRefs = new Set<string>();

  for (const context of contexts) {
    const evaluatedHex = evaluatedByRef.get(context.ref);
    if (!evaluatedHex) continue;
    try {
      const output = oprf.finalize(
        context.input,
        context.blind,
        hexToBytes(evaluatedHex),
      );
      if (memberSet.has(bytesToHex(output))) {
        matchedRefs.add(context.ref);
      }
    } catch {
      // Malformed evaluated element — treat as no-match rather than
      // failing the whole discovery round.
    }
  }
  return matchedRefs;
}
