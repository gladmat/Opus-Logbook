import { createMMKV, type MMKV } from "react-native-mmkv";
import { v4 as uuidv4 } from "uuid";
import {
  saveEncryptedMediaFromUri,
  deleteEncryptedMedia,
} from "./mediaStorage";
import type { InboxItem, InboxState } from "@/types/inbox";

// ═══════════════════════════════════════════════════════════
// MMKV Instance
// ═══════════════════════════════════════════════════════════

const INBOX_STORAGE_KEY = "opus_inbox_state";
const DEFAULT_AUTO_DELETE_DAYS = 90;

let _mmkv: MMKV | null = null;

function getMMKV(): MMKV {
  if (!_mmkv) {
    _mmkv = createMMKV({ id: "opus-inbox" });
  }
  return _mmkv;
}

// ═══════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════

function readState(): InboxState {
  const raw = getMMKV().getString(INBOX_STORAGE_KEY);
  if (!raw) return { items: [], version: 1 };
  try {
    return JSON.parse(raw) as InboxState;
  } catch {
    return { items: [], version: 1 };
  }
}

function writeState(state: InboxState): void {
  getMMKV().set(INBOX_STORAGE_KEY, JSON.stringify(state));
}

// ═══════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════

/** Synchronous read — returns all inbox items, newest first. */
export function getInboxItems(): InboxItem[] {
  return readState().items;
}

/** Synchronous read — returns number of unassigned inbox photos. */
export function getInboxCount(): number {
  return readState().items.length;
}

/**
 * Add a single photo to the Inbox.
 * Encrypts the image via the existing saveEncryptedMediaFromUri pipeline.
 */
export async function addToInbox(
  sourceUri: string,
  mimeType: string,
  sourceType: InboxItem["sourceType"],
): Promise<InboxItem> {
  const saved = await saveEncryptedMediaFromUri(sourceUri, mimeType);
  const item: InboxItem = {
    id: uuidv4(),
    localUri: saved.localUri,
    mimeType: saved.mimeType,
    capturedAt: new Date().toISOString(),
    sourceType,
  };
  const state = readState();
  state.items.unshift(item);
  writeState(state);
  return item;
}

/**
 * Batch-add multiple photos to the Inbox.
 * Calls onProgress after each item for UI feedback.
 */
export async function addMultipleToInbox(
  assets: Array<{ uri: string; mimeType?: string | null }>,
  sourceType: InboxItem["sourceType"],
  onProgress?: (completed: number, total: number) => void,
): Promise<InboxItem[]> {
  const newItems: InboxItem[] = [];
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    if (!asset) continue;
    const item = await addToInbox(
      asset.uri,
      asset.mimeType || "image/jpeg",
      sourceType,
    );
    newItems.push(item);
    onProgress?.(i + 1, assets.length);
  }
  return newItems;
}

/**
 * Remove items from the inbox index only. Encrypted files are KEPT —
 * used when assigning photos to a case (the case now owns the file URI).
 */
export function removeFromInbox(itemIds: string[]): void {
  const idsToRemove = new Set(itemIds);
  const state = readState();
  state.items = state.items.filter((item) => !idsToRemove.has(item.id));
  writeState(state);
}

/**
 * Discard items from the inbox — removes from index AND deletes encrypted files.
 * Used for manual delete and orphan cleanup.
 */
export async function discardFromInbox(itemIds: string[]): Promise<void> {
  const idsToRemove = new Set(itemIds);
  const state = readState();
  const itemsToDelete = state.items.filter((item) => idsToRemove.has(item.id));
  state.items = state.items.filter((item) => !idsToRemove.has(item.id));
  writeState(state);
  for (const item of itemsToDelete) {
    await deleteEncryptedMedia(item.localUri);
  }
}

/**
 * Delete unassigned items older than the threshold.
 * Runs on app launch. Returns the number of items deleted.
 */
export async function cleanupOrphanedInboxItems(
  autoDeleteDays: number = DEFAULT_AUTO_DELETE_DAYS,
): Promise<number> {
  if (autoDeleteDays <= 0) return 0;
  const state = readState();
  const cutoff = Date.now() - autoDeleteDays * 24 * 60 * 60 * 1000;
  const expired = state.items.filter(
    (item) => new Date(item.capturedAt).getTime() < cutoff,
  );
  if (expired.length === 0) return 0;

  for (const item of expired) {
    await deleteEncryptedMedia(item.localUri);
  }
  state.items = state.items.filter(
    (item) => new Date(item.capturedAt).getTime() >= cutoff,
  );
  writeState(state);
  return expired.length;
}

// ═══════════════════════════════════════════════════════════
// Test-only helpers
// ═══════════════════════════════════════════════════════════

/** Reset the MMKV instance — only use in tests. */
export function _resetInboxForTests(): void {
  getMMKV().remove(INBOX_STORAGE_KEY);
}
