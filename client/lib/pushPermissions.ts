/**
 * pushPermissions — the contextual notification-permission pre-prompt.
 *
 * The app never called Notifications.requestPermissionsAsync() anywhere,
 * so no push token was ever registered (AuthContext only registers when
 * permission is ALREADY granted) and every sharing/assessment push
 * silently no-oped. Rather than prompting cold at boot, we ask at the two
 * moments the value proposition is self-evident:
 *   - right after the first save that shares a case to a colleague
 *   - on first opening the shared inbox with entries in it
 *
 * iOS convention: an in-app pre-prompt Alert first; the one-shot OS dialog
 * only fires if the user taps Enable. Declining the pre-prompt records the
 * ask (per user) and never re-asks — Settings can always grant later,
 * after which the boot path registers the token.
 */

import { Alert, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userScopedAsyncKey } from "@/lib/activeUser";
import { registerPushToken } from "@/lib/pushRegistration";

const PROMPTED_KEY = "@opus_push_prompted";

export type PushPromptContext = "first-share" | "shared-inbox";

export type PushPromptResult =
  | "granted"
  | "denied"
  | "deferred" // user said "Not now" or was already asked before
  | "unavailable"; // web / already denied at OS level

/**
 * One-shot contextual pre-prompt. Resolves after the whole flow (including
 * token registration on grant) completes. Never throws.
 */
export async function ensurePushPermissionsWithPrompt(
  context: PushPromptContext,
): Promise<PushPromptResult> {
  if (Platform.OS === "web") return "unavailable";
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") {
      // Permission exists (granted elsewhere) — make sure the token is
      // registered; boot-path failures are retried here for free.
      await registerPushToken().catch(() => {});
      return "granted";
    }
    if (status === "denied") {
      // OS-level denied — re-prompting is impossible; Settings is the way.
      return "unavailable";
    }

    const promptedKey = userScopedAsyncKey(PROMPTED_KEY);
    const alreadyPrompted = await AsyncStorage.getItem(promptedKey);
    if (alreadyPrompted) return "deferred";
    await AsyncStorage.setItem(promptedKey, context);

    const enable = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Enable notifications?",
        "Get notified when colleagues share cases with you or submit assessments for you.",
        [
          { text: "Not now", style: "cancel", onPress: () => resolve(false) },
          { text: "Enable", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!enable) return "deferred";

    const request = await Notifications.requestPermissionsAsync();
    if (request.status !== "granted") return "denied";
    await registerPushToken().catch(() => {});
    return "granted";
  } catch {
    return "unavailable";
  }
}
