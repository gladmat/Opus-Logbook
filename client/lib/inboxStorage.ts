import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { bytesToHex } from "@noble/hashes/utils.js";
import { createMMKV, type MMKV } from "react-native-mmkv";
import { getSecureItem, setSecureItem } from "./secureStorage";
import { v4 as uuidv4 } from "uuid";
import {
  saveEncryptedMediaFromUri,
  deleteEncryptedMedia,
} from "./mediaStorage";
import type { InboxItem, InboxState } from "@/types/inbox";
import { hashPatientIdentifierHmac } from "@/lib/patientIdentifierHmac";
import { syncNativeInboxCount } from "@/lib/nativeExtensionBridge";
import {
  getActiveUserIdOrNull,
  userScopedSecureKey,
  onActiveUserChange,
} from "./activeUser";

const INBOX_STORAGE_KEY = "opus_inbox_state";
const INBOX_BACKUP_KEY = "opus_inbox_state_backup";
export const INBOX_MMKV_BASE_ID = "opus-inbox";
export const INBOX_MMKV_KEY_ALIAS = "opus_inbox_mmkv_key";
const INBOX_STATE_VERSION = 2;
const DEFAULT_AUTO_DELETE_DAYS = 90;
const DEFAULT_STALE_RESERVATION_HOURS = 24;

function inboxMmkvId(): string {
  const userId = getActiveUserIdOrNull();
  if (!userId) return INBOX_MMKV_BASE_ID;
  return `${INBOX_MMKV_BASE_ID}-${userId.replace(/-/g, "")}`;
}

function inboxMmkvKeyAlias(): string {
  return userScopedSecureKey(INBOX_MMKV_KEY_ALIAS);
}

// Tear down MMKV instance on user switch so next init creates a fresh one
onActiveUserChange(() => {
  _mmkv = null;
  _initialized = Platform.OS === "web";
  _initializationPromise = null;
});

type LegacyInboxItem = {
  id: string;
  localUri: string;
  mimeType: string;
  capturedAt: string;
  sourceType: InboxItem["sourceType"];
  templateId?: string;
  templateStepIndex?: number;
  patientIdentifier?: string;
};

type LegacyInboxState = {
  items?: LegacyInboxItem[];
  version?: number;
};

export interface InboxItemMetadata {
  capturedAt?: string;
  importedAt?: string;
  sourceAssetId?: string;
  width?: number;
  height?: number;
  templateId?: string;
  templateStepIndex?: number;
  patientIdentifier?: string;
}

export interface InboxImportAsset {
  uri: string;
  mimeType?: string | null;
  assetId?: string | null;
  capturedAt?: string | null;
  width?: number;
  height?: number;
  patientIdentifier?: string;
  templateId?: string;
  templateStepIndex?: number;
}

let _mmkv: MMKV | null = null;
let _initializationPromise: Promise<void> | null = null;
let _initialized = Platform.OS === "web";
let pendingSelectionIds: string[] = [];

function baseState(): InboxState {
  return { items: [], version: INBOX_STATE_VERSION };
}

function sortItems(items: InboxItem[]): InboxItem[] {
  return [...items].sort((left, right) => {
    const byCaptured =
      new Date(right.capturedAt).getTime() -
      new Date(left.capturedAt).getTime();
    if (byCaptured !== 0) {
      return byCaptured;
    }

    return (
      new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime()
    );
  });
}

/**
 * Returns the initialised MMKV instance, or `null` before
 * `initializeInboxStorage()` has completed.  All read/write helpers
 * gracefully handle `null` so pre-init callers get empty state rather
 * than crashing or silently losing encrypted data.
 */
function getMMKV(): MMKV | null {
  return _mmkv;
}

async function getInboxEncryptionKey(): Promise<string | undefined> {
  if (Platform.OS === "web") {
    return undefined;
  }

  const alias = inboxMmkvKeyAlias();
  const existing = await getSecureItem(alias);
  if (existing) {
    // Existing installations may have a 32-char (16-byte) key from an older
    // build. MMKV accepts keys of any length, so we keep them as-is rather
    // than rotating — rotation would invalidate every already-stored inbox
    // item's encryption. New keys are 64 hex chars (32 bytes) for parity
    // with the rest of the app's 256-bit key material.
    return existing;
  }

  const generated = bytesToHex(await Crypto.getRandomBytesAsync(32));
  await setSecureItem(alias, generated);
  return generated;
}

function parseState(raw?: string | null): InboxState {
  if (!raw) {
    return baseState();
  }

  try {
    const parsed = JSON.parse(raw) as InboxState | LegacyInboxState;
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return {
      items: items as InboxItem[],
      version:
        typeof parsed.version === "number"
          ? parsed.version
          : INBOX_STATE_VERSION - 1,
    };
  } catch {
    // Primary state corrupted — attempt to restore from backup
    const mmkv = getMMKV();
    if (mmkv) {
      const backup = mmkv.getString(INBOX_BACKUP_KEY);
      if (backup) {
        try {
          const parsed = JSON.parse(backup) as InboxState;
          const items = Array.isArray(parsed.items) ? parsed.items : [];
          console.warn(
            "Inbox state corrupted, restored from backup with",
            items.length,
            "items",
          );
          return {
            items: items as InboxItem[],
            version: parsed.version ?? INBOX_STATE_VERSION,
          };
        } catch {
          // Backup also corrupted — fall through to empty state
        }
      }
    }
    console.warn(
      "Inbox state corrupted and no backup available, resetting to empty",
    );
    return baseState();
  }
}

function readState(): InboxState {
  const mmkv = getMMKV();
  if (!mmkv) return baseState();
  return parseState(mmkv.getString(INBOX_STORAGE_KEY));
}

function writeState(state: InboxState): void {
  const mmkv = getMMKV();
  if (!mmkv) return;
  const sortedItems = sortItems(state.items);
  const serialized = JSON.stringify({
    ...state,
    version: INBOX_STATE_VERSION,
    items: sortedItems,
  });
  mmkv.set(INBOX_STORAGE_KEY, serialized);

  // Keep a backup copy for corruption recovery
  mmkv.set(INBOX_BACKUP_KEY, serialized);

  syncNativeInboxCount(
    sortedItems.filter(
      (item) => item.status === "unassigned" || item.status === undefined,
    ).length,
  );
}

async function migrateStateIfNeeded(): Promise<void> {
  const state = readState();
  if (state.version >= INBOX_STATE_VERSION) {
    return;
  }

  const migratedItems = await Promise.all(
    state.items.map(async (item) => {
      const candidate = item as InboxItem | LegacyInboxItem;
      const importedAt =
        "importedAt" in candidate && candidate.importedAt
          ? candidate.importedAt
          : candidate.capturedAt;
      const patientIdentifier =
        "patientIdentifier" in candidate
          ? candidate.patientIdentifier
          : undefined;
      const patientIdentifierHash =
        "patientIdentifierHash" in candidate && candidate.patientIdentifierHash
          ? candidate.patientIdentifierHash
          : patientIdentifier
            ? await hashPatientIdentifierHmac(patientIdentifier)
            : undefined;

      return {
        id: candidate.id,
        localUri: candidate.localUri,
        mimeType: candidate.mimeType,
        capturedAt: candidate.capturedAt,
        importedAt,
        status:
          "status" in candidate && candidate.status
            ? candidate.status
            : "unassigned",
        sourceType: candidate.sourceType,
        sourceAssetId:
          "sourceAssetId" in candidate ? candidate.sourceAssetId : undefined,
        width: "width" in candidate ? candidate.width : undefined,
        height: "height" in candidate ? candidate.height : undefined,
        templateId: candidate.templateId,
        templateStepIndex: candidate.templateStepIndex,
        patientIdentifier,
        patientIdentifierHash,
        reservationKey:
          "reservationKey" in candidate ? candidate.reservationKey : undefined,
        reservedAt:
          "reservedAt" in candidate ? candidate.reservedAt : undefined,
        assignedCaseId:
          "assignedCaseId" in candidate ? candidate.assignedCaseId : undefined,
        assignedAt:
          "assignedAt" in candidate ? candidate.assignedAt : undefined,
      } satisfies InboxItem;
    }),
  );

  writeState({
    version: INBOX_STATE_VERSION,
    items: migratedItems,
  });
}

function updateState(mutator: (state: InboxState) => InboxState): InboxState {
  const current = readState();
  const updated = mutator(current);
  writeState(updated);
  return updated;
}

export async function initializeInboxStorage(): Promise<void> {
  if (_initialized) {
    return;
  }

  // Guard: require active user before initializing user-scoped MMKV
  if (!getActiveUserIdOrNull()) {
    return;
  }

  if (!_initializationPromise) {
    _initializationPromise = (async () => {
      const encryptionKey = await getInboxEncryptionKey();
      const mmkvId = inboxMmkvId();

      if (encryptionKey && Platform.OS !== "web") {
        // Try opening with encryption key (normal path after first run).
        // If the file was previously encrypted with this key, this succeeds.
        try {
          const encrypted = createMMKV({
            id: mmkvId,
            encryptionKey,
          });
          // Verify the instance can read — getString returns undefined on
          // an empty store but does not throw.  If the key is wrong MMKV
          // will throw during construction above.
          encrypted.getString(INBOX_STORAGE_KEY);
          _mmkv = encrypted;
        } catch {
          // Fallback: store was previously unencrypted (first-time
          // migration) — open without key, then recrypt in-place.
          const unencrypted = createMMKV({ id: mmkvId });
          const storage = unencrypted as MMKV & {
            recrypt?: (key?: string) => void;
          };
          if (typeof storage.recrypt === "function") {
            storage.recrypt(encryptionKey);
          }
          _mmkv = unencrypted;
        }
      } else {
        // Web or no encryption key available — plain MMKV
        _mmkv = createMMKV({ id: mmkvId });
      }

      await migrateStateIfNeeded();
      _initialized = true;
    })().finally(() => {
      _initializationPromise = null;
    });
  }

  await _initializationPromise;
}

async function buildInboxItem(args: {
  id: string;
  localUri: string;
  mimeType: string;
  sourceType: InboxItem["sourceType"];
  metadata?: InboxItemMetadata;
}): Promise<InboxItem> {
  const now = new Date().toISOString();
  const importedAt = args.metadata?.importedAt ?? now;
  const capturedAt = args.metadata?.capturedAt ?? importedAt;
  const pid = args.metadata?.patientIdentifier?.trim() || undefined;

  return {
    id: args.id,
    localUri: args.localUri,
    mimeType: args.mimeType,
    capturedAt,
    importedAt,
    status: "unassigned",
    sourceType: args.sourceType,
    sourceAssetId: args.metadata?.sourceAssetId ?? undefined,
    width: args.metadata?.width,
    height: args.metadata?.height,
    templateId: args.metadata?.templateId,
    templateStepIndex: args.metadata?.templateStepIndex,
    patientIdentifier: pid,
    patientIdentifierHash: pid
      ? await hashPatientIdentifierHmac(pid)
      : undefined,
  };
}

export function getInboxItems(): InboxItem[] {
  if (!_initialized) return [];
  return sortItems(
    readState().items.filter(
      (item) => item.status === "unassigned" || item.status === undefined,
    ),
  );
}

export function getInboxCount(): number {
  if (!_initialized) return 0;
  return getInboxItems().length;
}

/**
 * Count of truly unassigned inbox photos — excludes items that already have
 * a patientIdentifier (captured via Guided Capture). Used for the dashboard
 * badge so NHI-tagged photos don't inflate the "needs attention" count.
 */
export function getUnassignedInboxCount(): number {
  if (!_initialized) return 0;
  return getInboxItems().filter((item) => !item.patientIdentifier).length;
}

export function getReservedInboxIdsFromMedia(
  mediaItems: { sourceInboxId?: string }[],
): string[] {
  return Array.from(
    new Set(
      mediaItems
        .map((item) => item.sourceInboxId)
        .filter((value): value is string => typeof value === "string"),
    ),
  );
}

export async function addToInbox(
  sourceUri: string,
  mimeType: string,
  sourceType: InboxItem["sourceType"],
  metadata?: InboxItemMetadata,
): Promise<InboxItem> {
  const saved = await saveEncryptedMediaFromUri(sourceUri, mimeType);
  const item = await buildInboxItem({
    id: uuidv4(),
    localUri: saved.localUri,
    mimeType: saved.mimeType,
    sourceType,
    metadata,
  });

  updateState((state) => ({
    ...state,
    items: [item, ...state.items],
  }));

  return item;
}

export async function addMultipleToInbox(
  assets: InboxImportAsset[],
  sourceType: InboxItem["sourceType"],
  onProgress?: (completed: number, total: number) => void,
): Promise<InboxItem[]> {
  const createdItems: InboxItem[] = [];

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    if (!asset) continue;

    const item = await addToInbox(
      asset.uri,
      asset.mimeType || "image/jpeg",
      sourceType,
      {
        capturedAt: asset.capturedAt ?? undefined,
        sourceAssetId: asset.assetId ?? undefined,
        width: asset.width,
        height: asset.height,
        patientIdentifier: asset.patientIdentifier,
        templateId: asset.templateId,
        templateStepIndex: asset.templateStepIndex,
      },
    );
    createdItems.push(item);
    onProgress?.(index + 1, assets.length);
  }

  return createdItems;
}

export function reserveInboxItems(
  itemIds: string[],
  reservationKey: string,
): InboxItem[] {
  if (itemIds.length === 0) {
    return [];
  }

  const ids = new Set(itemIds);
  const reservedAt = new Date().toISOString();
  let reservedItems: InboxItem[] = [];

  updateState((state) => {
    const nextItems = state.items.map((item) => {
      if (!ids.has(item.id) || item.status === "assigned") {
        return item;
      }

      const reservedItem: InboxItem = {
        ...item,
        status: "reserved",
        reservationKey,
        reservedAt,
      };
      reservedItems.push(reservedItem);
      return reservedItem;
    });

    return {
      ...state,
      items: nextItems,
    };
  });

  return sortItems(reservedItems);
}

export function releaseReservedInboxItems(
  itemIds: string[],
  reservationKey?: string,
): void {
  if (itemIds.length === 0) {
    return;
  }

  const ids = new Set(itemIds);
  updateState((state) => ({
    ...state,
    items: state.items.map((item) => {
      if (!ids.has(item.id) || item.status !== "reserved") {
        return item;
      }
      if (reservationKey && item.reservationKey !== reservationKey) {
        return item;
      }

      return {
        ...item,
        status: "unassigned",
        reservationKey: undefined,
        reservedAt: undefined,
      };
    }),
  }));
}

export function finalizeInboxAssignment(
  itemIds: string[],
  caseId: string,
): void {
  if (itemIds.length === 0) {
    return;
  }

  const ids = new Set(itemIds);
  const assignedAt = new Date().toISOString();
  updateState((state) => ({
    ...state,
    items: state.items.map((item) =>
      ids.has(item.id)
        ? {
            ...item,
            status: "assigned",
            reservationKey: undefined,
            reservedAt: undefined,
            assignedCaseId: caseId,
            assignedAt,
          }
        : item,
    ),
  }));
}

export async function discardFromInbox(itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) {
    return;
  }

  const ids = new Set(itemIds);
  const state = readState();
  const itemsToDelete = state.items.filter((item) => ids.has(item.id));

  writeState({
    ...state,
    items: state.items.filter((item) => !ids.has(item.id)),
  });

  for (const item of itemsToDelete) {
    await deleteEncryptedMedia(item.localUri);
  }
}

export async function cleanupOrphanedInboxItems(
  autoDeleteDays: number = DEFAULT_AUTO_DELETE_DAYS,
  staleReservationHours: number = DEFAULT_STALE_RESERVATION_HOURS,
): Promise<number> {
  const state = readState();
  const now = Date.now();
  const deleteCutoff =
    autoDeleteDays > 0
      ? now - autoDeleteDays * 24 * 60 * 60 * 1000
      : Number.NEGATIVE_INFINITY;
  const releaseCutoff =
    staleReservationHours > 0
      ? now - staleReservationHours * 60 * 60 * 1000
      : Number.NEGATIVE_INFINITY;

  const itemsToDelete =
    autoDeleteDays > 0
      ? state.items.filter(
          (item) =>
            item.status === "unassigned" &&
            new Date(item.importedAt).getTime() < deleteCutoff,
        )
      : [];

  const nextItems = state.items
    .filter(
      (item) => !itemsToDelete.some((candidate) => candidate.id === item.id),
    )
    .map((item) => {
      if (
        item.status === "reserved" &&
        item.reservedAt &&
        new Date(item.reservedAt).getTime() < releaseCutoff
      ) {
        return {
          ...item,
          status: "unassigned" as const,
          reservationKey: undefined,
          reservedAt: undefined,
        };
      }
      return item;
    });

  writeState({
    ...state,
    items: nextItems,
  });

  for (const item of itemsToDelete) {
    await deleteEncryptedMedia(item.localUri);
  }

  return itemsToDelete.length;
}

export function setPendingInboxSelection(itemIds: string[]): void {
  pendingSelectionIds = itemIds;
}

export function consumePendingInboxSelection(): string[] {
  const selection = pendingSelectionIds;
  pendingSelectionIds = [];
  return selection;
}

export function _resetInboxForTests(): void {
  if (_mmkv) {
    _mmkv.remove(INBOX_STORAGE_KEY);
  }
  // Create a fresh unencrypted instance for tests (skips async init flow)
  _mmkv = createMMKV({ id: inboxMmkvId() });
  pendingSelectionIds = [];
  _initializationPromise = null;
  _initialized = true;
}
