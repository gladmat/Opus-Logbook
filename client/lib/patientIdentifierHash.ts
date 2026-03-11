import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export function normalizePatientIdentifier(
  patientIdentifier?: string | null,
): string | undefined {
  if (!patientIdentifier) return undefined;

  const normalized = patientIdentifier.toUpperCase().replace(/\s/g, "");
  return normalized.length > 0 ? normalized : undefined;
}

export function hashPatientIdentifier(
  patientIdentifier?: string | null,
): string | undefined {
  const normalized = normalizePatientIdentifier(patientIdentifier);
  if (!normalized) return undefined;

  return bytesToHex(sha256(utf8ToBytes(normalized)));
}
