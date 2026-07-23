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
import type { TeamContact } from "@/types/teamContacts";
import { searchUserByEmail } from "./sharingApi";
import { linkContact } from "./teamContactsApi";
import { removeDiscoveryMatch } from "./discoveryService";
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
 * 1A: after saving a contact with an email and no link, look them up on
 * Opus and offer a one-tap link. Silent on 404 / errors / self-hits.
 * A confirmed link chains straight into the retro-share offer.
 */
export async function promptLinkContactByEmail(
  contact: TeamContact,
  ownUserId: string | undefined,
): Promise<"linked" | "declined" | "not-found" | "error"> {
  if (!contact.email || contact.linkedUserId) return "not-found";

  let user;
  try {
    user = await searchUserByEmail(contact.email);
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

  try {
    await linkContact(contact.id, user.id);
  } catch (error) {
    Alert.alert(
      "Link Failed",
      error instanceof Error ? error.message : "Failed to link contact.",
    );
    return "error";
  }
  try {
    await removeDiscoveryMatch(contact.id);
  } catch {
    // Cosmetic — a stale cached match just re-renders a Link button.
  }

  await offerRetroShareForContact({
    contactId: contact.id,
    linkedUserId: user.id,
    displayName: contact.displayName,
  });
  return "linked";
}

/**
 * 2B: after ANY successful link, offer to share earlier cases that tagged
 * this contact. With no candidates, shows just the success alert. Resolves
 * once the whole flow (offer → run → summary) is finished.
 */
export async function offerRetroShareForContact(
  contact: RetroShareContact,
  opts?: { successTitle?: string; successMessage?: string },
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
    Alert.alert(successTitle, successMessage);
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
