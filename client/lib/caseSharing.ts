/**
 * Case-sharing pipeline — extracted from `useCaseForm.handleSave` so the
 * share/link logic is unit-testable and every silent failure mode is
 * recorded instead of swallowed.
 *
 * Design notes:
 * - This module performs NO UI work: no Alert, no navigation. Callers render
 *   `TeamShareOutcome` however they like (useCaseForm shows the TOFU alert
 *   and the post-save limitations alert from it).
 * - `shared_cases` has UNIQUE(caseId, recipientUserId) server-side and
 *   POST /api/share is a plain insert — re-sharing to a recipient who
 *   already holds a row throws 23505 → 500. Because every save generates a
 *   fresh case key, delivering updated content to a still-present recipient
 *   requires revoke-then-reshare (key envelopes cascade-delete with the
 *   row). `shareCaseWithTeam` does exactly that on the edit path; before
 *   this module existed the re-POST 500 was swallowed and edited case
 *   content never reached existing recipients.
 */

import type { Case } from "@/types/case";
import type { CaseTeamMember, TeamContact } from "@/types/teamContacts";
import type { UserSearchResult } from "@/types/sharing";
import { buildShareableBlob } from "./buildShareableBlob";
import {
  generateCaseKeyHex,
  encryptPayloadWithCaseKey,
  wrapCaseKeyForRecipient,
} from "./e2ee";
import { verifyAndPinRecipientKeys } from "./keyPinningStore";
import {
  getSharedOutbox,
  revokeSharedCase,
  searchUserByEmail,
  shareCase,
} from "./sharingApi";
import { getUserDeviceKeys, linkContact } from "./teamContactsApi";
import { getCase, updateCase } from "./storage";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShareRecipient {
  userId: string;
  displayName: string;
  role: string;
  publicKeys: { deviceId: string; publicKey: string }[];
}

export interface TofuMismatch {
  userId: string;
  displayName: string;
  mismatches: {
    deviceId: string;
    storedPublicKey: string;
    receivedPublicKey: string;
  }[];
}

export interface NamedUser {
  userId: string;
  displayName: string;
}

export interface ShareFlowError {
  stage: "collect" | "revoke" | "share";
  userId?: string;
  message: string;
}

export interface CollectResult {
  recipients: ShareRecipient[];
  tofuMismatches: TofuMismatch[];
  zeroKeyRecipients: NamedUser[];
  errors: ShareFlowError[];
}

export interface TeamShareOutcome {
  /** Recipients the share POST succeeded for. */
  shared: NamedUser[];
  /** Subset of `shared`: still-present recipients revoked + re-shared on edit. */
  resharedOnEdit: NamedUser[];
  /** Skipped: fetched device keys don't match the local TOFU pins. */
  tofuMismatches: TofuMismatch[];
  /** Skipped: linked but no device keys registered (never signed in on a device). */
  zeroKeyRecipients: NamedUser[];
  revokedShareIds: string[];
  /** Everything that previously vanished into bare catches. */
  errors: ShareFlowError[];
}

export interface UnlinkedTaggedMember {
  contactId: string;
  displayName: string;
  email: string | null;
}

export interface RescueHit {
  contactId: string;
  displayName: string;
  email: string;
  user: UserSearchResult;
}

export interface RescueSearchResult {
  hits: RescueHit[];
  /** Searched and not found (or search failed) — candidates for an email invite. */
  misses: UnlinkedTaggedMember[];
  /** Not searched: no email, beyond the cap, or resolved to the owner themselves. */
  skipped: UnlinkedTaggedMember[];
}

/**
 * /api/users/search shares a 10/min/user rate bucket with the discovery
 * endpoints — keep the per-save rescue search well under it.
 */
export const RESCUE_SEARCH_CAP = 3;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ── 1B pure helpers ──────────────────────────────────────────────────────────

/**
 * Refresh `operativeTeam` snapshots from the live team-contacts list.
 *
 * - `linkedUserId` is always refreshed — including an explicit unlink
 *   propagating back to null (which correctly stops sharing to a mis-linked
 *   person via the edit-mode revocation diff).
 * - `careerStage` is fill-gap only: a null/undefined snapshot picks up the
 *   contact's current stage, but a non-null historical snapshot is never
 *   overwritten (stages change over time; old cases keep the stage held at
 *   case time).
 * - Members whose contact no longer exists are left untouched.
 * - Never mutates the input (storage's caseCache hands out live references);
 *   returns the original array when nothing changed.
 */
export function rehydrateTeamSnapshots(
  team: CaseTeamMember[],
  contacts: Pick<TeamContact, "id" | "linkedUserId" | "careerStage">[],
): { team: CaseTeamMember[]; changed: boolean } {
  if (team.length === 0) return { team, changed: false };
  const byId = new Map(contacts.map((c) => [c.id, c]));
  let changed = false;
  const next = team.map((member) => {
    const contact = byId.get(member.contactId);
    if (!contact) return member;
    const nextLinked = contact.linkedUserId ?? null;
    const currentLinked = member.linkedUserId ?? null;
    const currentStage = member.careerStage ?? null;
    const nextStage = currentStage ?? contact.careerStage ?? null;
    if (nextLinked === currentLinked && nextStage === currentStage) {
      return member;
    }
    changed = true;
    return { ...member, linkedUserId: nextLinked, careerStage: nextStage };
  });
  return changed ? { team: next, changed } : { team, changed: false };
}

/**
 * Tagged members without a linked Opus account, joined with their contact's
 * email (the case snapshot deliberately carries no email). Pass `null`
 * contacts when the live list couldn't be fetched — emails come back null.
 */
export function listUnlinkedTaggedMembers(
  team: CaseTeamMember[],
  contacts: Pick<TeamContact, "id" | "email">[] | null,
): UnlinkedTaggedMember[] {
  return team
    .filter((member) => !member.linkedUserId)
    .map((member) => ({
      contactId: member.contactId,
      displayName: member.displayName,
      email: contacts?.find((c) => c.id === member.contactId)?.email ?? null,
    }));
}

// ── Key resolution ───────────────────────────────────────────────────────────

/**
 * Resolve linked team members to share recipients: fetch device keys, run
 * TOFU verification, and record — rather than swallow — every member that
 * can't be shared to (zero keys, key mismatch, fetch failure).
 */
export async function collectShareRecipients(
  team: CaseTeamMember[],
  preResolved?: ShareRecipient[],
): Promise<CollectResult> {
  const recipients: ShareRecipient[] = [...(preResolved ?? [])];
  const tofuMismatches: TofuMismatch[] = [];
  const zeroKeyRecipients: NamedUser[] = [];
  const errors: ShareFlowError[] = [];

  const linkedMembers = team.filter((m) => m.linkedUserId);
  for (const member of linkedMembers) {
    const userId = member.linkedUserId!;
    // Skip if already resolved (legacy email-tagged list, or two contacts
    // linked to the same account) — avoids double-sharing.
    if (recipients.some((r) => r.userId === userId)) continue;
    try {
      const keys = await getUserDeviceKeys(userId);
      if (keys.length === 0) {
        zeroKeyRecipients.push({ userId, displayName: member.displayName });
        continue;
      }
      const verification = await verifyAndPinRecipientKeys(userId, keys);
      if (verification.kind === "mismatch") {
        tofuMismatches.push({
          userId,
          displayName: member.displayName,
          mismatches: verification.mismatches,
        });
        if (__DEV__) {
          console.warn(
            "[caseSharing] TOFU mismatch for",
            member.displayName,
            verification.mismatches,
          );
        }
        continue;
      }
      recipients.push({
        userId,
        displayName: member.displayName,
        role: member.operativeRole,
        publicKeys: verification.keys,
      });
    } catch (error) {
      errors.push({ stage: "collect", userId, message: errorMessage(error) });
    }
  }

  return { recipients, tofuMismatches, zeroKeyRecipients, errors };
}

// ── Encrypt + POST ───────────────────────────────────────────────────────────

/**
 * Encrypt one case under a fresh case key and POST it to the given
 * recipients. Throws on failure — callers record the error.
 */
export async function encryptAndShareCase(
  caseData: Case,
  recipients: ShareRecipient[],
): Promise<{ sharedCases: { id: string; recipientUserId: string }[] }> {
  const caseKeyHex = await generateCaseKeyHex();
  const teamRoles = recipients.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    role: m.role,
  }));
  const blob = buildShareableBlob(caseData, teamRoles);
  const encryptedBlob = await encryptPayloadWithCaseKey(
    JSON.stringify(blob),
    caseKeyHex,
  );

  const recipientPayloads = [];
  for (const member of recipients) {
    const keyEnvelopes = [];
    for (const pk of member.publicKeys) {
      const envelope = await wrapCaseKeyForRecipient(caseKeyHex, pk.publicKey);
      keyEnvelopes.push({
        deviceId: pk.deviceId,
        envelopeJson: JSON.stringify(envelope),
      });
    }
    recipientPayloads.push({
      userId: member.userId,
      role: member.role,
      keyEnvelopes,
    });
  }

  return shareCase({
    caseId: caseData.id,
    encryptedShareableBlob: encryptedBlob,
    recipients: recipientPayloads,
  });
}

// ── Save-time orchestration ──────────────────────────────────────────────────

export interface ShareCaseWithTeamParams {
  savedCase: Case;
  /** Pass the ALREADY-rehydrated team (see rehydrateTeamSnapshots). */
  operativeTeam: CaseTeamMember[];
  isEdit: boolean;
  /** Legacy email-tagged members that already carry public keys. */
  preResolved?: ShareRecipient[];
}

/**
 * The save-time share pipeline. Never throws — a successful case save must
 * never be blocked by sharing; every failure lands in `outcome.errors`.
 *
 * Edit path: every existing share row for this case is revoked. Recipients
 * no longer tagged simply lose access (existing behaviour); still-present
 * recipients are revoked FIRST and then included in the fresh POST
 * (revoke-then-reshare) so they receive the updated blob — re-POSTing over
 * a live row would 23505 on the server's UNIQUE(caseId, recipientUserId).
 */
export async function shareCaseWithTeam(
  params: ShareCaseWithTeamParams,
): Promise<TeamShareOutcome> {
  const { savedCase, operativeTeam, isEdit, preResolved } = params;
  const collect = await collectShareRecipients(operativeTeam, preResolved);
  const outcome: TeamShareOutcome = {
    shared: [],
    resharedOnEdit: [],
    tofuMismatches: collect.tofuMismatches,
    zeroKeyRecipients: collect.zeroKeyRecipients,
    revokedShareIds: [],
    errors: [...collect.errors],
  };

  let recipients = collect.recipients;
  const previouslySharedUserIds = new Set<string>();

  if (isEdit) {
    try {
      const outbox = await getSharedOutbox();
      const existingSharesForCase = outbox.filter(
        (s) => s.caseId === savedCase.id,
      );
      const currentIds = new Set(recipients.map((r) => r.userId));
      const reshareRevokeFailed = new Set<string>();
      for (const share of existingSharesForCase) {
        // Defensive: outbox entries carry recipientUserId; if missing, skip
        // rather than revoke something we can't classify.
        if (!share.recipientUserId) continue;
        const stillPresent = currentIds.has(share.recipientUserId);
        try {
          await revokeSharedCase(share.id);
          outcome.revokedShareIds.push(share.id);
          if (stillPresent) {
            previouslySharedUserIds.add(share.recipientUserId);
          }
        } catch (revokeError) {
          outcome.errors.push({
            stage: "revoke",
            userId: share.recipientUserId,
            message: errorMessage(revokeError),
          });
          if (stillPresent) reshareRevokeFailed.add(share.recipientUserId);
        }
      }
      // A still-present recipient whose old row couldn't be revoked would
      // 23505 the whole POST and poison the batch for everyone — exclude
      // them; they keep the previous version of the case.
      if (reshareRevokeFailed.size > 0) {
        recipients = recipients.filter(
          (r) => !reshareRevokeFailed.has(r.userId),
        );
      }
    } catch (outboxError) {
      // Couldn't enumerate existing shares — leave them in place and still
      // attempt the POST (succeeds when the case was never shared before).
      outcome.errors.push({
        stage: "revoke",
        message: errorMessage(outboxError),
      });
    }
  }

  if (recipients.length > 0) {
    try {
      await encryptAndShareCase(savedCase, recipients);
      for (const recipient of recipients) {
        const named = {
          userId: recipient.userId,
          displayName: recipient.displayName,
        };
        outcome.shared.push(named);
        if (previouslySharedUserIds.has(recipient.userId)) {
          outcome.resharedOnEdit.push(named);
        }
      }
    } catch (shareError) {
      outcome.errors.push({
        stage: "share",
        message: errorMessage(shareError),
      });
    }
  }

  return outcome;
}

// ── 1C save-time rescue ──────────────────────────────────────────────────────

/**
 * Bounded lookup of unlinked tagged members on Opus. Members without an
 * email or beyond the cap are skipped (never searched); hits resolving to
 * the owner themselves are skipped too (the server rejects self-shares).
 */
export async function searchUnlinkedMembersOnOpus(
  unlinked: UnlinkedTaggedMember[],
  ownUserId: string | undefined,
  cap: number = RESCUE_SEARCH_CAP,
): Promise<RescueSearchResult> {
  const hits: RescueHit[] = [];
  const misses: UnlinkedTaggedMember[] = [];
  const skipped: UnlinkedTaggedMember[] = [];
  let searches = 0;

  for (const member of unlinked) {
    if (!member.email) {
      skipped.push(member);
      continue;
    }
    if (searches >= cap) {
      skipped.push(member);
      continue;
    }
    searches += 1;
    try {
      const user = await searchUserByEmail(member.email);
      if (!user) {
        misses.push(member);
        continue;
      }
      if (ownUserId && user.id === ownUserId) {
        skipped.push(member);
        continue;
      }
      hits.push({
        contactId: member.contactId,
        displayName: member.displayName,
        email: member.email,
        user,
      });
    } catch {
      misses.push(member);
    }
  }

  return { hits, misses, skipped };
}

/**
 * Link one rescue hit and share the just-saved case with them (a NEW
 * recipient row — no conflict with the case's existing shares).
 *
 * The link is real regardless of the share outcome, so the stored snapshot
 * is updated for zero-keys / TOFU / key-fetch failures too; only a failed
 * share POST leaves it null so the case re-qualifies for retro-share.
 */
export async function linkAndShareCaseWithHit(params: {
  savedCase: Case;
  hit: Pick<RescueHit, "contactId" | "displayName" | "user">;
}): Promise<{
  /** linkContact succeeded — false only when the link call itself failed. */
  linked: boolean;
  shared: boolean;
  zeroKeys: boolean;
  tofuBlocked: boolean;
  error?: string;
}> {
  const { savedCase, hit } = params;
  try {
    await linkContact(hit.contactId, hit.user.id);
  } catch (error) {
    return {
      linked: false,
      shared: false,
      zeroKeys: false,
      tofuBlocked: false,
      error: errorMessage(error),
    };
  }

  const member = savedCase.operativeTeam?.find(
    (m) => m.contactId === hit.contactId,
  );
  const role = member?.operativeRole ?? "FA";

  try {
    const keys = await getUserDeviceKeys(hit.user.id);
    if (keys.length === 0) {
      await markSnapshotLinked(savedCase.id, hit.contactId, hit.user.id);
      return {
        linked: true,
        shared: false,
        zeroKeys: true,
        tofuBlocked: false,
      };
    }
    const verification = await verifyAndPinRecipientKeys(hit.user.id, keys);
    if (verification.kind === "mismatch") {
      await markSnapshotLinked(savedCase.id, hit.contactId, hit.user.id);
      return {
        linked: true,
        shared: false,
        zeroKeys: false,
        tofuBlocked: true,
      };
    }
    await encryptAndShareCase(savedCase, [
      {
        userId: hit.user.id,
        displayName: hit.displayName,
        role,
        publicKeys: verification.keys,
      },
    ]);
    await markSnapshotLinked(savedCase.id, hit.contactId, hit.user.id);
    return { linked: true, shared: true, zeroKeys: false, tofuBlocked: false };
  } catch (error) {
    return {
      linked: true,
      shared: false,
      zeroKeys: false,
      tofuBlocked: false,
      error: errorMessage(error),
    };
  }
}

// ── Stored-snapshot updater (shared by 1C and retro-share) ───────────────────

/**
 * Set `linkedUserId` on one stored case's operativeTeam snapshot. No-op when
 * the case is missing or the member is already linked. Always builds fresh
 * arrays/objects — `getCase` hands out live caseCache references.
 */
export async function markSnapshotLinked(
  caseId: string,
  contactId: string,
  linkedUserId: string,
): Promise<void> {
  const existing = await getCase(caseId);
  if (!existing?.operativeTeam?.length) return;
  const target = existing.operativeTeam.find((m) => m.contactId === contactId);
  if (!target || target.linkedUserId) return;
  const operativeTeam = existing.operativeTeam.map((m) =>
    m.contactId === contactId ? { ...m, linkedUserId } : m,
  );
  await updateCase(caseId, { operativeTeam });
}
