import Expo, { type ExpoPushMessage } from "expo-server-sdk";
import { storage } from "./storage";
import { logger } from "./logger";

const expo = new Expo();
const log = logger.child({ module: "push" });

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
        log.warn(
          { userId, deviceId: token.deviceId },
          "invalid Expo push token",
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
        log.error(
          { err, userId, deviceId },
          "failed to delete invalid push token",
        );
      });
    }

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        for (const receipt of receipts) {
          if (receipt.status === "error") {
            log.error(
              { details: receipt.details, message: receipt.message },
              "push notification error",
            );
          }
        }
      } catch (err) {
        log.error({ err }, "failed to send push notification chunk");
      }
    }
  } catch (err) {
    log.error({ err, userId }, "failed to send push notifications");
  }
}
