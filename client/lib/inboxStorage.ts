import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { bytesToHex } from "@noble/hashes/utils.js";
import { createMMKV, type MMKV } from "react-native-mmkv";
import { v4 as uuidv4 } from "uuid";
import {
  saveEncryptedMediaFromUri,
  deleteEncryptedMedia,
} from "./mediaStorage";
import type { InboxItem, InboxState } from "@/types/inbox";
import { hashPatientIdentifier } from "@/lib/patientIdentifierHash";
import { syncNativeInboxCount } from "@/lib/nativeExtensionBridge";

const INBOX_STORAGE_KEY = "opus_inbox_state";
const INBOX_MMKV_ID = "opus-inbox";
const INBOX_MMKV_KEY_ALIAS = "opus_inbox_mmkv_key";
const INBOX_STATE_VERSION = 2;
const DEFAULT_AUTO_DELETE_DAYS = 90;
const DEFAULT_STALE_RESERVATION_HOURS = 24;

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

  const existing = await SecureStore.getItemAsync(INBOX_MMKV_KEY_ALIAS);
  if (existing) {
    return existing;
  }

  const generated = bytesToHex(await Crypto.getRandomBytesAsync(16));
  await SecureStore.setItemAsync(INBOX_MMKV_KEY_ALIAS, generated);
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
  mmkv.set(
    INBOX_STORAGE_KEY,
    JSON.stringify({
      ...state,
      version: INBOX_STATE_VERSION,
      items: sortedItems,
    }),
  );
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
          : hashPatientIdentifier(patientIdentifier);

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

  if (!_initializationPromise) {
    _initializationPromise = (async () => {
      const encryptionKey = await getInboxEncryptionKey();

      if (encryptionKey && Platform.OS !== "web") {
        // Try opening with encryption key (normal path after first run).
        // If the file was previously encrypted with this key, this succeeds.
        try {
          const encrypted = createMMKV({
            id: INBOX_MMKV_ID,
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
          const unencrypted = createMMKV({ id: INBOX_MMKV_ID });
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
        _mmkv = createMMKV({ id: INBOX_MMKV_ID });
      }

      await migrateStateIfNeeded();
      _initialized = true;
    })().finally(() => {
      _initializationPromise = null;
    });
  }

  await _initializationPromise;
}

function buildInboxItem(args: {
  id: string;
  localUri: string;
  mimeType: string;
  sourceType: InboxItem["sourceType"];
  metadata?: InboxItemMetadata;
}): InboxItem {
  const now = new Date().toISOString();
  const importedAt = args.metadata?.importedAt ?? now;
  const capturedAt = args.metadata?.capturedAt ?? importedAt;

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
    patientIdentifier: args.metadata?.patientIdentifier?.trim() || undefined,
    patientIdentifierHash: hashPatientIdentifier(
      args.metadata?.patientIdentifier ?? undefined,
    ),
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
  const item = buildInboxItem({
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
  _mmkv = createMMKV({ id: INBOX_MMKV_ID });
  pendingSelectionIds = [];
  _initializationPromise = null;
  _initialized = true;
}
