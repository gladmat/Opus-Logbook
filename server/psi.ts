/**
 * Server half of the PSI contact-discovery protocol (RFC 9497 OPRF over
 * ristretto255, via @noble/curves). See client/lib/psiDiscovery.ts for the
 * full protocol description.
 *
 * The OPRF key is EPHEMERAL — generated fresh for every request and never
 * persisted. Within one request the same key evaluates both the client's
 * blinded contacts and the server's member identifiers, which is all the
 * matching requires. Ephemerality means responses can't be correlated
 * across requests and there is no long-lived key to manage or leak.
 */

import { ristretto255_oprf } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

const oprf = ristretto255_oprf.oprf;

export function generateEphemeralOprfKey(): Uint8Array {
  return oprf.generateKeyPair().secretKey;
}

/**
 * Evaluate one client-blinded element. Throws on a malformed point —
 * callers translate that into a 400.
 */
export function evaluateBlindedPoint(
  secretKey: Uint8Array,
  pointHex: string,
): string {
  return bytesToHex(oprf.blindEvaluate(secretKey, hexToBytes(pointHex)));
}

/**
 * Full PRF evaluation of a server-known plaintext identifier (member set
 * construction). Implemented as blind→evaluate→finalize with a throwaway
 * local blind — algebraically identical to direct evaluation while using
 * only the audited public API.
 */
export function evaluateIdentifier(
  secretKey: Uint8Array,
  identifier: string,
): string {
  const input = utf8ToBytes(identifier);
  const { blind, blinded } = oprf.blind(input);
  const evaluated = oprf.blindEvaluate(secretKey, blinded);
  return bytesToHex(oprf.finalize(input, blind, evaluated));
}
