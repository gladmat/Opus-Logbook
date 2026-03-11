import { Platform } from "react-native";

export const OPUS_APP_GROUP = "group.com.drgladysz.opus";
export const OPUS_SHARED_INBOX_COUNT_KEY = "opus.inbox.count";
export const OPUS_PENDING_LOCKED_CAPTURES_KEY =
  "opus.lockedCamera.pendingCaptures";
export const OPUS_CAPTURE_CONTROL_KIND = "com.drgladysz.opus.capture.control";
export const OPUS_INBOX_WIDGET_KIND = "com.drgladysz.opus.inbox.widget";

export interface PendingLockedCameraCapture {
  id: string;
  sourceUri: string;
  mimeType?: string;
  capturedAt?: string;
  width?: number;
  height?: number;
  templateId?: string;
  templateStepIndex?: number;
  patientIdentifier?: string;
}

type ExtensionStorageValue =
  | string
  | number
  | Record<string, string | number>
  | Array<Record<string, string | number>>
  | undefined;

interface ExtensionStorageInstance {
  get(key: string): string | null;
  set(key: string, value: ExtensionStorageValue): void;
  remove(key: string): void;
}

interface ExtensionStorageConstructor {
  new (suiteName: string): ExtensionStorageInstance;
  reloadControls(name?: string): void;
  reloadWidget(name?: string): void;
}

let extensionStorageCtor: ExtensionStorageConstructor | null | undefined;
let sharedStorage: ExtensionStorageInstance | null | undefined;

function getExtensionStorageCtor(): ExtensionStorageConstructor | null {
  if (Platform.OS !== "ios") {
    return null;
  }

  if (extensionStorageCtor !== undefined) {
    return extensionStorageCtor;
  }

  try {
    const { ExtensionStorage } = require("@bacons/apple-targets") as {
      ExtensionStorage: ExtensionStorageConstructor;
    };
    extensionStorageCtor = ExtensionStorage;
  } catch {
    extensionStorageCtor = null;
  }

  return extensionStorageCtor;
}

function getSharedStorage(): ExtensionStorageInstance | null {
  const ctor = getExtensionStorageCtor();
  if (!ctor) {
    return null;
  }

  if (sharedStorage !== undefined) {
    return sharedStorage;
  }

  try {
    sharedStorage = new ctor(OPUS_APP_GROUP);
  } catch {
    sharedStorage = null;
  }

  return sharedStorage;
}

export function syncNativeInboxCount(count: number): void {
  const storage = getSharedStorage();
  const ctor = getExtensionStorageCtor();
  if (!storage || !ctor) {
    return;
  }

  try {
    storage.set(OPUS_SHARED_INBOX_COUNT_KEY, count);
    ctor.reloadControls(OPUS_CAPTURE_CONTROL_KIND);
    ctor.reloadWidget(OPUS_INBOX_WIDGET_KIND);
  } catch {
    // Ignore extension sync failures in the app runtime.
  }
}

export function readPendingLockedCameraCaptures(): PendingLockedCameraCapture[] {
  const storage = getSharedStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.get(OPUS_PENDING_LOCKED_CAPTURES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PendingLockedCameraCapture[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function replacePendingLockedCameraCaptures(
  captures: PendingLockedCameraCapture[],
): void {
  const storage = getSharedStorage();
  if (!storage) {
    return;
  }

  if (captures.length === 0) {
    storage.remove(OPUS_PENDING_LOCKED_CAPTURES_KEY);
    return;
  }

  storage.set(OPUS_PENDING_LOCKED_CAPTURES_KEY, JSON.stringify(captures));
}

export function clearPendingLockedCameraCaptures(): void {
  const storage = getSharedStorage();
  if (!storage) {
    return;
  }

  storage.remove(OPUS_PENDING_LOCKED_CAPTURES_KEY);
}
