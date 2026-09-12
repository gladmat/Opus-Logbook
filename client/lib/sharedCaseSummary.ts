/**
 * sharedCaseSummary — a dashboard-ready summary for a case shared WITH the
 * current user (2.25.0).
 *
 * Structurally a `CaseSummary` (so every dashboard selector, the case
 * card and search work unchanged) plus a `shared` block carrying the
 * share-row metadata. `id` is the SHARED CASE id — that is what the
 * detail screen, verification and assessment surfaces are keyed on.
 */

import type { Specialty } from "@/types/case";
import { getPatientDisplayName } from "@/types/case";
import type { CaseSummary } from "@/types/caseSummary";
import type {
  SharedCaseData,
  SharedCaseInboxEntry,
  SharedMediaDescriptor,
} from "@/types/sharing";
import {
  buildSearchableText,
  deriveCaseSummaryFields,
} from "./caseSummaryFields";

export interface SharedCaseMeta {
  sharedCaseId: string;
  ownerUserId: string;
  ownerDisplayName: string;
  recipientRole: string;
  verificationStatus: SharedCaseInboxEntry["verificationStatus"];
  blobVersion: number;
  /** False until the blob has been decrypted at least once on this device. */
  hydrated: boolean;
}

export interface SharedCaseSummary extends CaseSummary {
  shared: SharedCaseMeta;
  /** Photo descriptors from the blob (keys included) — needed to fetch the
   *  full-resolution variant on demand. */
  mediaDescriptors?: SharedMediaDescriptor[];
}

export function isSharedCaseSummary(
  value: unknown,
): value is SharedCaseSummary {
  return (
    typeof value === "object" &&
    value !== null &&
    "shared" in value &&
    typeof (value as { shared?: unknown }).shared === "object"
  );
}

export const UNHYDRATED_DIAGNOSIS_TITLE = "Shared case";
export const UNHYDRATED_PROCEDURE_NAME = "Tap to open";

/**
 * @param entry   inbox row (metadata, no PHI)
 * @param blob    decrypted share blob, or null when not yet hydrated / offline
 * @param localThumbIds  mediaIds whose thumbnail ciphertext is already
 *                imported locally — only those can drive a card thumbnail
 */
export function buildSharedCaseSummary(
  entry: SharedCaseInboxEntry,
  blob: SharedCaseData | null,
  localThumbIds: Set<string> = new Set(),
): SharedCaseSummary {
  const ownerDisplayName = entry.ownerDisplayName || "a colleague";
  const shared: SharedCaseMeta = {
    sharedCaseId: entry.id,
    ownerUserId: entry.ownerUserId,
    ownerDisplayName,
    recipientRole: entry.recipientRole,
    verificationStatus: entry.verificationStatus,
    blobVersion: entry.blobVersion,
    hydrated: blob != null,
  };

  if (!blob) {
    return {
      id: entry.id,
      procedureDate: entry.createdAt.slice(0, 10),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      patientIdentifier: "",
      specialty: "general",
      specialties: ["general"],
      outcomeRecorded: false,
      diagnosisTitle: UNHYDRATED_DIAGNOSIS_TITLE,
      primaryProcedureName: UNHYDRATED_PROCEDURE_NAME,
      procedureNames: [],
      operativeMediaCount: 0,
      canAddHistology: false,
      needsHistology: false,
      hasSevereHandInfection: false,
      searchableText: buildSearchableText([ownerDisplayName, "shared case"]),
      shared,
    };
  }

  const groups = blob.diagnosisGroups ?? [];
  const specialty: Specialty = groups[0]?.specialty ?? "general";
  const specialties = Array.from(
    new Set<Specialty>(groups.map((g) => g.specialty).filter(Boolean)),
  );
  if (specialties.length === 0) specialties.push(specialty);

  const fields = deriveCaseSummaryFields({
    diagnosisGroups: groups,
    procedureType: undefined,
  });
  const patientDisplayName = getPatientDisplayName(blob);
  const media = blob.media ?? [];
  const firstWithThumb = media.find((m) => localThumbIds.has(m.mediaId));

  return {
    id: entry.id,
    procedureDate: blob.procedureDate,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    patientIdentifier: blob.patientNhi ?? "",
    patientFirstName: blob.patientFirstName,
    patientLastName: blob.patientLastName,
    patientDisplayName,
    patientNhi: blob.patientNhi,
    facility: blob.facility,
    specialty,
    specialties,
    stayType: blob.stayType,
    outcomeRecorded: blob.outcomes?.outcome != null,
    diagnosisTitle: fields.diagnosisTitle,
    primaryProcedureName: fields.primaryProcedureName,
    procedureNames: fields.procedureNames,
    operativeMediaCount: media.length,
    firstOperativeMediaUri: firstWithThumb
      ? `opus-media:${firstWithThumb.mediaId}`
      : undefined,
    canAddHistology: false,
    needsHistology: false,
    hasSevereHandInfection: fields.hasSevereHandInfection,
    operativeRole: undefined,
    skinCancerBadgeLabel: fields.skinCancerBadgeLabel,
    skinCancerBadgeColorKey: fields.skinCancerBadgeColorKey,
    siteLabel: fields.siteLabel,
    searchableText: buildSearchableText([
      blob.patientNhi,
      blob.patientFirstName,
      blob.patientLastName,
      patientDisplayName,
      fields.diagnosisTitle,
      fields.primaryProcedureName,
      ...fields.procedureNames,
      blob.facility,
      ownerDisplayName,
      "shared",
    ]),
    shared,
    ...(media.length > 0 ? { mediaDescriptors: media } : {}),
  };
}

/**
 * Cheap fingerprint of what a list surface renders for a set of shared
 * summaries. Two syncs that produce the same signature need no re-apply
 * (no re-render, no per-share EPA state resolution). Order-sensitive.
 */
export function sharedSummariesSignature(
  summaries: readonly SharedCaseSummary[],
): string {
  return summaries
    .map((s) =>
      [
        s.id,
        s.shared.blobVersion,
        s.shared.verificationStatus,
        s.shared.hydrated ? 1 : 0,
        s.shared.recipientRole,
        s.operativeMediaCount,
        s.firstOperativeMediaUri ?? "",
      ].join(":"),
    )
    .join("|");
}
