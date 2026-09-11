/**
 * Alert glue for the contact-linking flows (1A link-on-contact-save, 2B
 * retro-share offers, and the Team Contacts link path). All three link
 * paths chain through `offerRetroShareForContact` so earlier tagged cases
 * are offered for sharing the moment a contact becomes linked.
 *
 * Names are always rendered from the LOCAL contact — the server's
 * `UserSearchResult.displayName` is nullable at runtime.
 */

import { Alert } from "react-native";
import type { Case } from "@/types/case";
import type { TeamContact } from "@/types/teamContacts";
import { searchUserForContact } from "./sharingApi";
import { linkContact, sendInvitation } from "./teamContactsApi";
import { TeamContactApiError } from "./teamContactErrors";
import { removeDiscoveryMatch } from "./discoveryService";
import { hasLinkIdentifier } from "./contactIdentifiers";
import {
  linkAndShareCaseWithHit,
  searchUnlinkedMembersOnOpus,
  type RescueHit,
  type UnlinkedTaggedMember,
} from "./caseSharing";
import type { PhoneRegion } from "@shared/phone";
import {
  findRetroShareCandidates,
  retroShareCasesForContact,
  RETRO_SHARE_CAP,
  type RetroShareContact,
} from "./retroShare";

export interface AlertButtonSpec<T extends string> {
  text: string;
  style?: "cancel" | "destructive" | "default";
  value: T;
}

/** Promise-wrapped Alert.alert. Exported for tests. */
export function alertAsync<T extends string>(
  title: string,
  message: string,
  buttons: AlertButtonSpec<T>[],
): Promise<T> {
  return new Promise((resolve) => {
    const cancelValue = (buttons.find((b) => b.style === "cancel") ??
      buttons[0])!.value;
    Alert.alert(
      title,
      message,
      buttons.map((b) => ({
        text: b.text,
        style: b.style,
        onPress: () => resolve(b.value),
      })),
      // Android back-button dismissal must still settle the promise.
      { cancelable: true, onDismiss: () => resolve(cancelValue) },
    );
  });
}

/**
 * Link a contact to an Opus account with user-facing feedback. Shared by
 * every link path (contact save, Team Contacts, invitee link). Guards
 * self-link before any request, maps the server's typed 4xx codes to named
 * alerts, drops the cached discovery match, and — on success — chains the
 * retro-share offer. Resolves true only when the link was made.
 */
export async function linkContactWithFeedback(
  contact: Pick<TeamContact, "id" | "displayName">,
  user: { id: string },
  opts: {
    ownUserId?: string;
    successTitle?: string;
    successMessage?: string;
    silentWhenNoCandidates?: boolean;
  } = {},
): Promise<boolean> {
  if (opts.ownUserId && user.id === opts.ownUserId) {
    Alert.alert(
      "That's your own account",
      `${contact.displayName} matches the account you're signed in with. A contact can't be linked to yourself.`,
    );
    return false;
  }

  try {
    await linkContact(contact.id, user.id);
  } catch (error) {
    const err = error instanceof TeamContactApiError ? error : null;
    if (err?.code === "DUPLICATE_LINK") {
      Alert.alert(
        "Already linked",
        `${err.conflictingDisplayName ?? "Another contact"} is already linked to this Opus account. Unlink that contact first if ${contact.displayName} is the right entry.`,
      );
    } else if (err?.code === "NO_IDENTIFIER_MATCH") {
      Alert.alert(
        "Details don't match",
        `${contact.displayName}'s email, phone or registration doesn't match that Opus account. Check the contact's details and try again.`,
      );
    } else if (err?.code === "CONTACT_ALREADY_LINKED") {
      Alert.alert(
        "Already linked",
        `${contact.displayName} is linked to a different Opus account. Unlink them first.`,
      );
    } else if (err?.code === "SELF_LINK") {
      Alert.alert(
        "That's your own account",
        "A contact can't be linked to yourself.",
      );
    } else {
      Alert.alert(
        "Link Failed",
        error instanceof Error ? error.message : "Failed to link contact.",
      );
    }
    return false;
  }

  await removeDiscoveryMatch(contact.id);

  await offerRetroShareForContact(
    {
      contactId: contact.id,
      linkedUserId: user.id,
      displayName: contact.displayName,
    },
    {
      successTitle: opts.successTitle,
      successMessage: opts.successMessage,
      silentWhenNoCandidates: opts.silentWhenNoCandidates,
    },
  );
  return true;
}

/**
 * 1A: after saving an unlinked contact with any identifier, look them up on
 * Opus (email → phone → registration) and offer a one-tap link. Silent on
 * 404 / errors / self-hits. A confirmed link chains straight into the
 * retro-share offer.
 */
export async function promptLinkContact(
  contact: TeamContact,
  ownUserId: string | undefined,
  region?: PhoneRegion,
): Promise<"linked" | "declined" | "not-found" | "error"> {
  if (contact.linkedUserId || !hasLinkIdentifier(contact)) return "not-found";

  let user;
  try {
    user = await searchUserForContact(contact, region);
  } catch {
    return "error";
  }
  if (!user) return "not-found";
  if (ownUserId && user.id === ownUserId) return "not-found";

  const choice = await alertAsync(
    `${contact.displayName} is on Opus`,
    "Link this contact so cases can be shared with them securely.",
    [
      { text: "Not Now", style: "cancel", value: "declined" },
      { text: "Link Contact", value: "link" },
    ],
  );
  if (choice !== "link") return "declined";

  const linked = await linkContactWithFeedback(contact, user, { ownUserId });
  return linked ? "linked" : "error";
}

/**
 * 2B: after ANY successful link, offer to share earlier cases that tagged
 * this contact. With no candidates, shows just the success alert. Resolves
 * once the whole flow (offer → run → summary) is finished.
 */
export async function offerRetroShareForContact(
  contact: RetroShareContact,
  opts?: {
    successTitle?: string;
    successMessage?: string;
    /** Chained flows that already showed their own summary set this. */
    silentWhenNoCandidates?: boolean;
  },
): Promise<void> {
  const successTitle = opts?.successTitle ?? "Contact Linked";
  const successMessage =
    opts?.successMessage ??
    `${contact.displayName} will now receive cases you tag them on.`;

  let candidates: unknown[] = [];
  try {
    candidates = await findRetroShareCandidates(
      contact.contactId,
      RETRO_SHARE_CAP + 1,
    );
  } catch {
    candidates = [];
  }

  if (candidates.length === 0) {
    if (!opts?.silentWhenNoCandidates) {
      Alert.alert(successTitle, successMessage);
    }
    return;
  }

  const overflow = candidates.length > RETRO_SHARE_CAP;
  const count = Math.min(candidates.length, RETRO_SHARE_CAP);
  const plural = count === 1 ? "" : "s";
  const offerMessage = overflow
    ? `You have more than ${RETRO_SHARE_CAP} earlier cases tagging ${contact.displayName}. Share the ${RETRO_SHARE_CAP} most recent? They'll appear in their Opus inbox.`
    : `Share ${count} earlier case${plural} that tagged ${contact.displayName}? They'll appear in their Opus inbox.`;

  const choice = await alertAsync(successTitle, offerMessage, [
    { text: "Not Now", style: "cancel", value: "skip" },
    { text: `Share ${count} Case${plural}`, value: "share" },
  ]);
  if (choice !== "share") return;

  const run = await retroShareCasesForContact(contact);

  if (run.zeroKeys) {
    Alert.alert(
      "Can't share yet",
      `${contact.displayName} hasn't signed in to Opus on a device yet. Cases can be shared after they sign in once.`,
    );
    return;
  }
  if (run.tofuBlocked) {
    Alert.alert(
      "Sharing skipped",
      `${contact.displayName}'s device key doesn't match what the server returned. Review it in Settings → Device Key Verification before sharing.`,
    );
    return;
  }
  if (run.failed.length > 0) {
    const attempted = run.shared + run.failed.length;
    Alert.alert(
      "Partially shared",
      `Shared ${run.shared} of ${attempted} cases with ${contact.displayName}. Open and re-save the failed ones to retry.`,
    );
    return;
  }
  if (run.shared > 0) {
    const sharedPlural = run.shared === 1 ? "" : "s";
    Alert.alert(
      "Cases shared",
      `Shared ${run.shared} case${sharedPlural} with ${contact.displayName}.`,
    );
    return;
  }
  Alert.alert(
    "Already shared",
    `All earlier cases were already shared with ${contact.displayName}.`,
  );
}

// ── 1C save-time rescue ──────────────────────────────────────────────────────

export interface PostSaveTeamPromptParams {
  savedCase: Case;
  /** Informational bullets already composed by the save flow. */
  issues: string[];
  unlinked: UnlinkedTaggedMember[];
  /** null → contacts couldn't be fetched (offline); no rescue search runs. */
  liveContacts: TeamContact[] | null;
  ownUserId: string | undefined;
  /** Owner's default region for national-format contact phones. */
  phoneRegion?: PhoneRegion;
}

const INVITE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function invitableMisses(
  misses: UnlinkedTaggedMember[],
  contacts: TeamContact[] | null,
): (UnlinkedTaggedMember & { email: string })[] {
  if (!contacts) return [];
  return misses.filter((m): m is UnlinkedTaggedMember & { email: string } => {
    if (!m.email) return false;
    const sentAt = contacts.find((c) => c.id === m.contactId)?.invitationSentAt;
    return !(
      sentAt && Date.now() - new Date(sentAt).getTime() < INVITE_COOLDOWN_MS
    );
  });
}

async function sendInvites(
  targets: (UnlinkedTaggedMember & { email: string })[],
): Promise<void> {
  let sent = 0;
  for (const target of targets) {
    try {
      await sendInvitation(target.contactId, target.email);
      sent += 1;
    } catch {
      // Cooldown / rate-limit rejections shouldn't sink the batch.
    }
  }
  if (sent > 0) {
    Alert.alert(
      "Invitations Sent",
      `Invited ${sent} colleague${sent === 1 ? "" : "s"} to Opus.`,
    );
  } else {
    Alert.alert(
      "Invitations not sent",
      "Could not send invitations right now. Try again from the contact's page.",
    );
  }
}

/**
 * 1C: replaces the dead-end "team features limited" alert. When tagged but
 * unlinked members' emails resolve to Opus accounts, offers a one-tap
 * "Link & Share" for the just-saved case (chaining into retro-share for
 * their earlier cases); members not on Opus can be invited by email.
 * Fire-and-forget from the save flow — never throws.
 */
export async function runPostSaveTeamPrompt(
  params: PostSaveTeamPromptParams,
): Promise<void> {
  try {
    const { savedCase, issues, unlinked, liveContacts, ownUserId } = params;

    let rescue: {
      hits: RescueHit[];
      misses: UnlinkedTaggedMember[];
    } | null = null;
    const searchable = unlinked.filter(hasLinkIdentifier);
    if (liveContacts && searchable.length > 0) {
      try {
        rescue = await searchUnlinkedMembersOnOpus(
          searchable,
          ownUserId,
          undefined,
          params.phoneRegion,
        );
      } catch {
        rescue = null;
      }
    }

    const hits = rescue?.hits ?? [];
    const invitable = invitableMisses(rescue?.misses ?? [], liveContacts);

    if (hits.length === 0) {
      if (issues.length === 0) return;
      if (invitable.length === 0) {
        Alert.alert("Case saved — team features limited", issues.join("\n"));
        return;
      }
      const choice = await alertAsync(
        "Case saved — team features limited",
        issues.join("\n"),
        [
          { text: "OK", style: "cancel", value: "ok" },
          { text: "Invite by Email", value: "invite" },
        ],
      );
      if (choice === "invite") await sendInvites(invitable);
      return;
    }

    // Actionable path — colleagues found on Opus.
    const hitNames = hits.map((h) => h.displayName);
    const namesLine =
      hitNames.length === 1
        ? `${hitNames[0]} is on Opus but isn't linked to your contacts.`
        : hitNames.length === 2
          ? `${joinNames(hitNames)} are on Opus but aren't linked to your contacts.`
          : `${hitNames.length} tagged members are on Opus but aren't linked to your contacts.`;
    const messageParts = [namesLine];
    const missCount = rescue?.misses.length ?? 0;
    if (missCount > 0) {
      messageParts.push(
        `${missCount} other tagged member${missCount === 1 ? " isn't" : "s aren't"} on Opus yet.`,
      );
    }
    if (issues.length > 0) messageParts.push(issues.join("\n"));

    const buttons: AlertButtonSpec<"skip" | "invite" | "link">[] = [
      { text: "Not Now", style: "cancel", value: "skip" },
    ];
    if (invitable.length > 0) {
      buttons.push({ text: "Invite by Email", value: "invite" });
    }
    buttons.push({ text: "Link & Share", value: "link" });

    const choice = await alertAsync(
      "Case saved — colleagues found on Opus",
      messageParts.join("\n\n"),
      buttons,
    );
    if (choice === "invite") {
      await sendInvites(invitable);
      return;
    }
    if (choice !== "link") return;

    const linkedHits: RescueHit[] = [];
    const sharedNames: string[] = [];
    const zeroKeyNames: string[] = [];
    const problemNames: string[] = [];
    for (const hit of hits) {
      const result = await linkAndShareCaseWithHit({ savedCase, hit });
      if (!result.linked) {
        problemNames.push(hit.displayName);
        continue;
      }
      linkedHits.push(hit);
      if (result.shared) sharedNames.push(hit.displayName);
      else if (result.zeroKeys) zeroKeyNames.push(hit.displayName);
      else problemNames.push(hit.displayName);
    }

    const summaryParts: string[] = [];
    if (sharedNames.length > 0) {
      summaryParts.push(`Linked and shared with ${joinNames(sharedNames)}.`);
    }
    if (zeroKeyNames.length > 0) {
      summaryParts.push(
        `${joinNames(zeroKeyNames)} ${zeroKeyNames.length === 1 ? "hasn't" : "haven't"} signed in to Opus on a device yet — re-save the case after they sign in.`,
      );
    }
    if (problemNames.length > 0) {
      summaryParts.push(
        `Couldn't share with ${joinNames(problemNames)} — try again from Team Contacts.`,
      );
    }
    Alert.alert(
      sharedNames.length > 0 ? "Case shared" : "Linking finished",
      summaryParts.join("\n\n"),
    );

    // Earlier cases tagging the now-linked contacts — the just-saved case no
    // longer qualifies (its snapshot was updated on success).
    for (const hit of linkedHits) {
      await offerRetroShareForContact(
        {
          contactId: hit.contactId,
          linkedUserId: hit.user.id,
          displayName: hit.displayName,
        },
        {
          successTitle: "Linked",
          successMessage: `${hit.displayName} will receive future tagged cases.`,
          silentWhenNoCandidates: true,
        },
      );
    }
  } catch {
    // Fire-and-forget: the rescue flow must never surface as a save error.
  }
}
