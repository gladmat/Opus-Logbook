/**
 * Retro-share (2B): when a team contact becomes linked to an Opus account,
 * previously saved cases that tagged them (with a null `linkedUserId`
 * snapshot) can be shared retroactively.
 *
 * Data layer only — no Alert, no navigation; `linkingPrompts.ts` owns the
 * offer/summary UI. Candidate discovery requires full case hydration:
 * neither CaseIndexEntry nor CaseSummary carries operativeTeam.
 */

import type { Case } from "@/types/case";
import type { CaseTeamMember } from "@/types/teamContacts";
import {
  collectShareRecipients,
  encryptAndShareCase,
  markSnapshotLinked,
  type ShareRecipient,
} from "./caseSharing";
import { getSharedOutbox } from "./sharingApi";
import { getCases } from "./storage";

export const RETRO_SHARE_CAP = 20;

export interface RetroShareContact {
  contactId: string;
  linkedUserId: string;
  displayName: string;
}

export interface RetroShareResult {
  candidates: number;
  shared: number;
  /** Pre-existing (caseId, recipient) share rows — POST skipped, snapshot still updated. */
  alreadyShared: number;
  failed: { caseId: string; message: string }[];
  /** Recipient has no registered device keys — nothing was attempted. */
  zeroKeys: boolean;
  tofuBlocked: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Cases whose operativeTeam tags this contact with a null linkedUserId
 * snapshot, most recent first, capped. Pass `cap = RETRO_SHARE_CAP + 1` to
 * detect overflow for the "more than N" offer copy.
 */
export async function findRetroShareCandidates(
  contactId: string,
  cap: number = RETRO_SHARE_CAP,
): Promise<Case[]> {
  const cases = await getCases();
  return cases
    .filter((c) =>
      c.operativeTeam?.some(
        (m) => m.contactId === contactId && !m.linkedUserId,
      ),
    )
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, cap);
}

/**
 * Share every qualifying case with the newly-linked contact.
 *
 * - Device keys are resolved (and TOFU-verified) ONCE for the recipient.
 * - The outbox is fetched ONCE; pre-existing (caseId, recipient) pairs are
 *   skipped — a duplicate POST would 23505 on the server's unique index —
 *   but their snapshot is still marked linked so they stop re-qualifying.
 * - Each case is shared under its own fresh case key, with the recipient's
 *   role taken from THAT case's operativeTeam entry.
 * - Snapshots update ON SUCCESS ONLY; a failed POST leaves the snapshot
 *   null so the case re-qualifies for a later retry.
 */
export async function retroShareCasesForContact(
  contact: RetroShareContact,
): Promise<RetroShareResult> {
  const candidates = await findRetroShareCandidates(contact.contactId);
  const result: RetroShareResult = {
    candidates: candidates.length,
    shared: 0,
    alreadyShared: 0,
    failed: [],
    zeroKeys: false,
    tofuBlocked: false,
  };
  if (candidates.length === 0) return result;

  // Resolve the recipient's keys once via a synthetic single-member team;
  // per-case role is applied below.
  const collect = await collectShareRecipients([
    {
      contactId: contact.contactId,
      linkedUserId: contact.linkedUserId,
      displayName: contact.displayName,
      abbreviatedName: contact.displayName,
      operativeRole: "FA",
    } as CaseTeamMember,
  ]);
  if (collect.zeroKeyRecipients.length > 0) {
    result.zeroKeys = true;
    return result;
  }
  if (collect.tofuMismatches.length > 0) {
    result.tofuBlocked = true;
    return result;
  }
  const baseRecipient = collect.recipients[0];
  if (!baseRecipient) {
    const message = collect.errors[0]?.message ?? "Could not fetch device keys";
    result.failed = candidates.map((c) => ({ caseId: c.id, message }));
    return result;
  }

  let alreadySharedCaseIds = new Set<string>();
  try {
    const outbox = await getSharedOutbox();
    alreadySharedCaseIds = new Set(
      outbox
        .filter((s) => s.recipientUserId === contact.linkedUserId)
        .map((s) => s.caseId),
    );
  } catch {
    // Can't enumerate — proceed; a duplicate POST fails per-case below.
  }

  for (const candidate of candidates) {
    if (alreadySharedCaseIds.has(candidate.id)) {
      result.alreadyShared += 1;
      try {
        await markSnapshotLinked(
          candidate.id,
          contact.contactId,
          contact.linkedUserId,
        );
      } catch {
        // Non-fatal — the case will simply re-qualify next time.
      }
      continue;
    }

    const member = candidate.operativeTeam?.find(
      (m) => m.contactId === contact.contactId,
    );
    const recipient: ShareRecipient = {
      ...baseRecipient,
      role: member?.operativeRole ?? baseRecipient.role,
    };
    // The stored snapshot predates the link — patch it into the blob so the
    // receiver's Team card shows themselves as linked, not "Not on Opus".
    const blobSource: Case = {
      ...candidate,
      operativeTeam: candidate.operativeTeam?.map((m) =>
        m.contactId === contact.contactId
          ? { ...m, linkedUserId: contact.linkedUserId }
          : m,
      ),
    };
    try {
      await encryptAndShareCase(blobSource, [recipient]);
      result.shared += 1;
      try {
        await markSnapshotLinked(
          candidate.id,
          contact.contactId,
          contact.linkedUserId,
        );
      } catch {
        // Share succeeded; a stale snapshot is caught by the outbox
        // pre-check on any later retro-share round.
      }
    } catch (error) {
      result.failed.push({
        caseId: candidate.id,
        message: errorMessage(error),
      });
    }
  }

  return result;
}
