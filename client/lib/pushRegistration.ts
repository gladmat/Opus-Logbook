/**
 * pushRegistration — obtains the Expo push token and registers it with the
 * server. Extracted from AuthContext so the boot path (register only when
 * permission is already granted) and the contextual permission prompt
 * (register immediately after a fresh grant) share one implementation.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushTokenOnServer } from "@/lib/sharingApi";
import { getOrCreateDeviceIdentity } from "@/lib/e2ee";

/**
 * Fetch the Expo push token for this device and register it with the
 * server. Assumes notification permission is already granted — callers
 * check/request permission first. Throws on failure (callers decide how
 * loud to be).
 */
export async function registerPushToken(deviceId?: string): Promise<void> {
  if (Platform.OS === "web") return;
  const resolvedDeviceId =
    deviceId ?? (await getOrCreateDeviceIdentity()).deviceId;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? undefined;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerPushTokenOnServer(tokenData.data, resolvedDeviceId);
}
