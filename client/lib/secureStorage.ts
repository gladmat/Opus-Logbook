/**
 * Thin wrapper around expo-secure-store + AsyncStorage (web fallback) that
 * centralises the iOS data-protection class for every secret the app stores.
 *
 * Why this exists: iOS Keychain defaults to `kSecAttrAccessibleAfterFirstUnlock`,
 * which means once the user has unlocked the device at least once since boot,
 * the secret stays readable even while the device is currently locked. That
 * is the vulnerable state exploited by AFU-mode forensic tools (Cellebrite,
 * GrayKey). For Opus — which stores the master encryption key, the per-user
 * HMAC key, the device E2EE private key, the JWT, and the inbox MMKV key —
 * we want `WHEN_UNLOCKED_THIS_DEVICE_ONLY`:
 *
 *   - Readable only while the device is currently unlocked (not just AFU)
 *   - Not synced to iCloud Keychain (no iCloud exfil path)
 *   - Bound to this device (device-to-device migration requires re-setup)
 *
 * Every new secret MUST use this wrapper. Direct `expo-secure-store` imports
 * are the exception, never the default. On web we still fall back to
 * AsyncStorage (SecureStore is unavailable there) — web builds are not the
 * primary deployment target and the iOS protection class is irrelevant.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NATIVE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key, NATIVE_OPTIONS);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, NATIVE_OPTIONS);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key, NATIVE_OPTIONS);
}
