/* eslint-disable import/first */

import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

let mmkvStore: Record<string, string> = {};
let secureStore: Record<string, string> = {};

vi.mock("react-native-mmkv", () => ({
  createMMKV: (_opts?: { id?: string; encryptionKey?: string }) => ({
    getString(key: string) {
      return mmkvStore[key];
    },
    set(key: string, value: string) {
      mmkvStore[key] = value;
    },
    remove(key: string) {
      delete mmkvStore[key];
      return true;
    },
    recrypt: vi.fn(),
  }),
}));

vi.mock("expo-crypto", () => ({
  getRandomBytesAsync: vi.fn(async (length: number) =>
    Uint8Array.from({ length }, (_, index) => (index + 1) % 255),
  ),
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => secureStore[key] ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    secureStore[key] = value;
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    delete secureStore[key];
  }),
  WHEN_UNLOCKED: "WHEN_UNLOCKED",
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));

let uuidCounter = 0;
vi.mock("uuid", () => ({
  v4: () => `mock-uuid-${++uuidCounter}`,
}));

const deletedUris: string[] = [];

vi.mock("../mediaStorage", () => ({
  saveEncryptedMediaFromUri: vi.fn(async (uri: string, mimeType: string) => ({
    localUri: `opus-media:saved-${uri.replace(/[^a-z0-9]/gi, "")}`,
    mimeType,
  })),
  deleteEncryptedMedia: vi.fn(async (uri: string) => {
    deletedUris.push(uri);
  }),
}));

// Mock HMAC module — return deterministic hash without Keychain access
vi.mock("@/lib/patientIdentifierHmac", () => ({
  hashPatientIdentifierHmac: vi.fn(
    async (id: string) => `hmac:${id.toUpperCase().trim()}`,
  ),
}));

import {
  _resetInboxForTests,
  addMultipleToInbox,
  addToInbox,
  cleanupOrphanedInboxItems,
  consumePendingInboxSelection,
  discardFromInbox,
  finalizeInboxAssignment,
  getInboxCount,
  getInboxItems,
  getReservedInboxIdsFromMedia,
  releaseReservedInboxItems,
  reserveInboxItems,
  setPendingInboxSelection,
} from "../inboxStorage";

const INBOX_STORAGE_KEY = "opus_inbox_state";

function readRawState() {
  return JSON.parse(mmkvStore[INBOX_STORAGE_KEY] ?? '{"items":[],"version":2}');
}

beforeEach(() => {
  mmkvStore = {};
  secureStore = {};
  uuidCounter = 0;
  deletedUris.length = 0;
  _resetInboxForTests();
});

describe("inboxStorage", () => {
  it("returns an empty inbox when no items exist", () => {
    expect(getInboxItems()).toEqual([]);
    expect(getInboxCount()).toBe(0);
  });

  it("handles corrupt MMKV payloads gracefully", () => {
    mmkvStore[INBOX_STORAGE_KEY] = "not-json";

    expect(getInboxItems()).toEqual([]);
    expect(getInboxCount()).toBe(0);
  });

  it("stores capturedAt, importedAt, metadata, status, and patient hash", async () => {
    const item = await addToInbox(
      "file:///photo.jpg",
      "image/jpeg",
      "opus_camera",
      {
        capturedAt: "2025-06-01T09:00:00.000Z",
        importedAt: "2025-06-01T09:05:00.000Z",
        patientIdentifier: " nhi 123 ",
        templateId: "free_flap",
        templateStepIndex: 2,
        sourceAssetId: "asset-1",
        width: 1200,
        height: 900,
      },
    );

    expect(item).toMatchObject({
      id: "mock-uuid-1",
      localUri: "opus-media:saved-filephotojpg",
      mimeType: "image/jpeg",
      capturedAt: "2025-06-01T09:00:00.000Z",
      importedAt: "2025-06-01T09:05:00.000Z",
      status: "unassigned",
      sourceType: "opus_camera",
      sourceAssetId: "asset-1",
      width: 1200,
      height: 900,
      patientIdentifier: "nhi 123",
      templateId: "free_flap",
      templateStepIndex: 2,
    });
    // HMAC hash is mocked to return `hmac:` + uppercased/trimmed identifier
    expect(item.patientIdentifierHash).toBe("hmac:NHI 123");

    const persisted = getInboxItems()[0];
    expect(persisted).toBeDefined();
    expect(persisted?.patientIdentifierHash).toBe(item.patientIdentifierHash);
  });

  it("sorts active items by capturedAt desc then importedAt desc", async () => {
    await addToInbox("file:///a.jpg", "image/jpeg", "camera", {
      capturedAt: "2025-06-01T10:00:00.000Z",
      importedAt: "2025-06-01T10:05:00.000Z",
    });
    await addToInbox("file:///b.jpg", "image/jpeg", "camera", {
      capturedAt: "2025-06-01T11:00:00.000Z",
      importedAt: "2025-06-01T11:05:00.000Z",
    });
    await addToInbox("file:///c.jpg", "image/jpeg", "camera", {
      capturedAt: "2025-06-01T10:00:00.000Z",
      importedAt: "2025-06-01T10:10:00.000Z",
    });

    expect(getInboxItems().map((item) => item.id)).toEqual([
      "mock-uuid-2",
      "mock-uuid-3",
      "mock-uuid-1",
    ]);
  });

  it("adds multiple assets and preserves smart import provenance", async () => {
    const progress: [number, number][] = [];
    const items = await addMultipleToInbox(
      [
        {
          uri: "file:///a.jpg",
          mimeType: "image/jpeg",
          assetId: "asset-a",
          capturedAt: "2025-06-01T08:00:00.000Z",
          width: 100,
          height: 200,
        },
        {
          uri: "file:///b.png",
          mimeType: "image/png",
          assetId: "asset-b",
          capturedAt: "2025-06-01T08:10:00.000Z",
        },
      ],
      "smart_import",
      (completed, total) => {
        progress.push([completed, total]);
      },
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      sourceType: "smart_import",
      sourceAssetId: "asset-a",
      width: 100,
      height: 200,
    });
    expect(items[1]).toMatchObject({
      sourceType: "smart_import",
      sourceAssetId: "asset-b",
      mimeType: "image/png",
    });
    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  it("reserves items transactionally and hides them from the active inbox", async () => {
    await addToInbox("file:///a.jpg", "image/jpeg", "camera");
    await addToInbox("file:///b.jpg", "image/jpeg", "camera");

    const [first] = getInboxItems();
    const reserved = reserveInboxItems([first!.id], "draft:case-form");

    expect(reserved).toHaveLength(1);
    expect(reserved[0]).toMatchObject({
      id: first!.id,
      status: "reserved",
      reservationKey: "draft:case-form",
    });
    expect(getInboxItems()).toHaveLength(1);
    expect(getInboxCount()).toBe(1);

    const raw = readRawState();
    const persisted = raw.items.find(
      (item: { id: string }) => item.id === first!.id,
    );
    expect(persisted).toMatchObject({
      status: "reserved",
      reservationKey: "draft:case-form",
    });
    expect(typeof persisted.reservedAt).toBe("string");
  });

  it("releases reserved items only for the matching reservation key", async () => {
    await addToInbox("file:///photo.jpg", "image/jpeg", "camera");
    const [item] = getInboxItems();
    reserveInboxItems([item!.id], "draft:one");

    releaseReservedInboxItems([item!.id], "draft:two");
    expect(getInboxItems()).toHaveLength(0);

    releaseReservedInboxItems([item!.id], "draft:one");
    expect(getInboxItems()).toHaveLength(1);
    expect(getInboxItems()[0]).toMatchObject({
      id: item!.id,
      status: "unassigned",
    });
  });

  it("finalizes assignment after case persistence and keeps encrypted files", async () => {
    await addToInbox("file:///photo.jpg", "image/jpeg", "camera");
    const [item] = getInboxItems();
    reserveInboxItems([item!.id], "draft:case");

    finalizeInboxAssignment([item!.id], "case-123");

    expect(getInboxCount()).toBe(0);
    expect(getInboxItems()).toEqual([]);
    expect(deletedUris).toEqual([]);

    const persisted = readRawState().items[0];
    expect(persisted).toMatchObject({
      id: item!.id,
      status: "assigned",
      assignedCaseId: "case-123",
    });
    expect(typeof persisted.assignedAt).toBe("string");
  });

  it("discards inbox items and deletes encrypted files", async () => {
    const item = await addToInbox("file:///photo.jpg", "image/jpeg", "camera");

    await discardFromInbox([item.id]);

    expect(getInboxItems()).toEqual([]);
    expect(deletedUris).toEqual([item.localUri]);
  });

  it("auto-deletes expired unassigned items using importedAt", async () => {
    const oldItem = await addToInbox(
      "file:///old.jpg",
      "image/jpeg",
      "camera",
      {
        capturedAt: "2025-01-01T10:00:00.000Z",
        importedAt: "2025-01-01T10:00:00.000Z",
      },
    );
    await addToInbox("file:///recent.jpg", "image/jpeg", "camera");

    const deletedCount = await cleanupOrphanedInboxItems(90);

    expect(deletedCount).toBe(1);
    expect(getInboxItems()).toHaveLength(1);
    expect(deletedUris).toEqual([oldItem.localUri]);
  });

  it("releases stale reservations during cleanup without deleting media", async () => {
    await addToInbox("file:///reserved.jpg", "image/jpeg", "camera");
    const [item] = getInboxItems();
    reserveInboxItems([item!.id], "draft:stale");

    const raw = readRawState();
    raw.items[0].reservedAt = new Date(
      Date.now() - 26 * 60 * 60 * 1000,
    ).toISOString();
    mmkvStore[INBOX_STORAGE_KEY] = JSON.stringify(raw);

    const deletedCount = await cleanupOrphanedInboxItems(90, 24);

    expect(deletedCount).toBe(0);
    expect(deletedUris).toEqual([]);
    expect(getInboxItems()).toHaveLength(1);
    expect(getInboxItems()[0]).toMatchObject({
      id: item!.id,
      status: "unassigned",
    });
  });

  it("stores and consumes pending inbox selections", () => {
    setPendingInboxSelection(["a", "b"]);

    expect(consumePendingInboxSelection()).toEqual(["a", "b"]);
    expect(consumePendingInboxSelection()).toEqual([]);
  });

  it("extracts reserved inbox provenance from draft operative media", () => {
    expect(
      getReservedInboxIdsFromMedia([
        { sourceInboxId: "one" },
        {},
        { sourceInboxId: "two" },
        { sourceInboxId: "one" },
      ]),
    ).toEqual(["one", "two"]);
  });
});
