import Expo, { type ExpoPushMessage } from "expo-server-sdk";
import { storage } from "./storage";

const expo = new Expo();

/**
 * Send push notifications to all registered devices for a user.
 * Non-critical path — errors are logged but never thrown.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    const tokens = await storage.getPushTokensForUser(userId);
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = [];
    const invalidDeviceIds: string[] = [];

    for (const token of tokens) {
      if (!Expo.isExpoPushToken(token.expoPushToken)) {
        console.warn(
          `Invalid Expo push token for user ${userId}, device ${token.deviceId}`,
        );
        invalidDeviceIds.push(token.deviceId);
        continue;
      }

      messages.push({
        to: token.expoPushToken,
        sound: "default",
        title,
        body,
        data: data ?? {},
      });
    }

    // Clean up invalid tokens
    for (const deviceId of invalidDeviceIds) {
      await storage.deletePushToken(userId, deviceId).catch((err) => {
        console.error(`Failed to delete invalid push token: ${err}`);
      });
    }

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        for (const receipt of receipts) {
          if (receipt.status === "error") {
            console.error(
              `Push notification error: ${receipt.message}`,
              receipt.details,
            );
          }
        }
      } catch (err) {
        console.error("Failed to send push notification chunk:", err);
      }
    }
  } catch (err) {
    console.error("Failed to send push notifications:", err);
  }
}
