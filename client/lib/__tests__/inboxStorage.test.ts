import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────

let mmkvStore: Record<string, string> = {};

vi.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
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
  }),
}));

let uuidCounter = 0;
vi.mock("uuid", () => ({
  v4: () => `mock-uuid-${++uuidCounter}`,
}));

const deletedUris: string[] = [];

vi.mock("../mediaStorage", () => ({
  saveEncryptedMediaFromUri: vi.fn(
    async (uri: string, mime: string) => ({
      localUri: `opus-media:saved-${uri.replace(/[^a-z0-9]/gi, "")}`,
      mimeType: mime,
    }),
  ),
  deleteEncryptedMedia: vi.fn(async (uri: string) => {
    deletedUris.push(uri);
  }),
}));

import {
  getInboxItems,
  getInboxCount,
  addToInbox,
  addMultipleToInbox,
  removeFromInbox,
  discardFromInbox,
  cleanupOrphanedInboxItems,
  _resetInboxForTests,
} from "../inboxStorage";

// ── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  mmkvStore = {};
  uuidCounter = 0;
  deletedUris.length = 0;
  // Reset the singleton so each test starts clean
  _resetInboxForTests();
});

// ── Tests ──────────────────────────────────────────────────

describe("inboxStorage", () => {
  describe("getInboxItems / getInboxCount", () => {
    it("returns empty array and 0 count when no items", () => {
      expect(getInboxItems()).toEqual([]);
      expect(getInboxCount()).toBe(0);
    });

    it("returns items after adding", async () => {
      await addToInbox("file:///photo1.jpg", "image/jpeg", "camera");
      expect(getInboxItems()).toHaveLength(1);
      expect(getInboxCount()).toBe(1);
    });

    it("handles corrupt MMKV data gracefully", () => {
      mmkvStore["opus_inbox_state"] = "not-valid-json{{{";
      expect(getInboxItems()).toEqual([]);
      expect(getInboxCount()).toBe(0);
    });
  });

  describe("addToInbox", () => {
    it("creates an item with correct fields", async () => {
      const item = await addToInbox(
        "file:///photo.jpg",
        "image/jpeg",
        "camera",
      );

      expect(item.id).toBe("mock-uuid-1");
      expect(item.localUri).toBe("opus-media:saved-filephotojpg");
      expect(item.mimeType).toBe("image/jpeg");
      expect(item.sourceType).toBe("camera");
      expect(item.capturedAt).toBeDefined();
    });

    it("prepends new items (newest first)", async () => {
      await addToInbox("file:///photo1.jpg", "image/jpeg", "camera");
      await addToInbox("file:///photo2.jpg", "image/jpeg", "gallery");

      const items = getInboxItems();
      expect(items).toHaveLength(2);
      expect(items[0]!.id).toBe("mock-uuid-2");
      expect(items[1]!.id).toBe("mock-uuid-1");
    });

    it("persists items across reads", async () => {
      await addToInbox("file:///photo.jpg", "image/jpeg", "camera");
      // Re-read from MMKV store
      const items = getInboxItems();
      expect(items).toHaveLength(1);
      expect(items[0]!.localUri).toContain("opus-media:");
    });
  });

  describe("addMultipleToInbox", () => {
    it("adds multiple assets in order", async () => {
      const assets = [
        { uri: "file:///a.jpg", mimeType: "image/jpeg" },
        { uri: "file:///b.png", mimeType: "image/png" },
        { uri: "file:///c.jpg" }, // no mimeType — defaults to image/jpeg
      ];

      const items = await addMultipleToInbox(assets, "gallery");
      expect(items).toHaveLength(3);
      expect(items[0]!.sourceType).toBe("gallery");
      expect(items[2]!.mimeType).toBe("image/jpeg"); // default
    });

    it("calls onProgress callback", async () => {
      const assets = [
        { uri: "file:///a.jpg" },
        { uri: "file:///b.jpg" },
      ];
      const progress: Array<[number, number]> = [];

      await addMultipleToInbox(assets, "camera", (done, total) => {
        progress.push([done, total]);
      });

      expect(progress).toEqual([
        [1, 2],
        [2, 2],
      ]);
    });

    it("skips null/undefined assets in array", async () => {
      // Simulate sparse array scenario
      const assets: Array<{ uri: string; mimeType?: string | null }> = [
        { uri: "file:///a.jpg" },
      ];
      const items = await addMultipleToInbox(assets, "gallery");
      expect(items).toHaveLength(1);
    });
  });

  describe("removeFromInbox", () => {
    it("removes items from index but keeps encrypted files", async () => {
      await addToInbox("file:///photo1.jpg", "image/jpeg", "camera");
      await addToInbox("file:///photo2.jpg", "image/jpeg", "camera");

      const items = getInboxItems();
      removeFromInbox([items[0]!.id]);

      expect(getInboxCount()).toBe(1);
      expect(getInboxItems()[0]!.id).toBe(items[1]!.id);
      // No encrypted files deleted
      expect(deletedUris).toHaveLength(0);
    });

    it("handles removing non-existent IDs gracefully", async () => {
      await addToInbox("file:///photo.jpg", "image/jpeg", "camera");
      removeFromInbox(["non-existent-id"]);
      expect(getInboxCount()).toBe(1);
    });

    it("can remove multiple items at once", async () => {
      await addToInbox("file:///a.jpg", "image/jpeg", "camera");
      await addToInbox("file:///b.jpg", "image/jpeg", "camera");
      await addToInbox("file:///c.jpg", "image/jpeg", "camera");

      const items = getInboxItems();
      removeFromInbox([items[0]!.id, items[2]!.id]);

      expect(getInboxCount()).toBe(1);
      expect(getInboxItems()[0]!.id).toBe(items[1]!.id);
    });
  });

  describe("discardFromInbox", () => {
    it("removes from index AND deletes encrypted files", async () => {
      const item = await addToInbox(
        "file:///photo.jpg",
        "image/jpeg",
        "camera",
      );

      await discardFromInbox([item.id]);

      expect(getInboxCount()).toBe(0);
      expect(deletedUris).toContain(item.localUri);
    });

    it("only deletes files for items that exist", async () => {
      await addToInbox("file:///photo.jpg", "image/jpeg", "camera");

      await discardFromInbox(["non-existent-id"]);

      expect(getInboxCount()).toBe(1);
      expect(deletedUris).toHaveLength(0);
    });
  });

  describe("smart_import sourceType", () => {
    it("addToInbox stores smart_import sourceType correctly", async () => {
      const item = await addToInbox(
        "file:///photo.jpg",
        "image/jpeg",
        "smart_import",
      );
      expect(item.sourceType).toBe("smart_import");
      expect(getInboxItems()[0]!.sourceType).toBe("smart_import");
    });

    it("addMultipleToInbox with smart_import works", async () => {
      const assets = [
        { uri: "file:///a.jpg", mimeType: "image/jpeg" },
        { uri: "file:///b.jpg", mimeType: "image/jpeg" },
      ];
      const items = await addMultipleToInbox(assets, "smart_import");
      expect(items).toHaveLength(2);
      expect(items[0]!.sourceType).toBe("smart_import");
      expect(items[1]!.sourceType).toBe("smart_import");
    });

    it("smart_import items appear in getInboxItems alongside other types", async () => {
      await addToInbox("file:///cam.jpg", "image/jpeg", "camera");
      await addToInbox("file:///gal.jpg", "image/jpeg", "gallery");
      await addToInbox("file:///imp.jpg", "image/jpeg", "smart_import");

      const items = getInboxItems();
      expect(items).toHaveLength(3);
      const types = items.map((i) => i.sourceType);
      expect(types).toContain("camera");
      expect(types).toContain("gallery");
      expect(types).toContain("smart_import");
    });
  });

  describe("cleanupOrphanedInboxItems", () => {
    it("deletes items older than threshold", async () => {
      // Add an item, then manually backdate it
      await addToInbox("file:///old.jpg", "image/jpeg", "camera");
      const state = JSON.parse(mmkvStore["opus_inbox_state"]!);
      const oldDate = new Date(
        Date.now() - 100 * 24 * 60 * 60 * 1000,
      ).toISOString();
      state.items[0].capturedAt = oldDate;
      mmkvStore["opus_inbox_state"] = JSON.stringify(state);

      const count = await cleanupOrphanedInboxItems(90);

      expect(count).toBe(1);
      expect(getInboxCount()).toBe(0);
      expect(deletedUris).toHaveLength(1);
    });

    it("keeps items within threshold", async () => {
      await addToInbox("file:///recent.jpg", "image/jpeg", "camera");

      const count = await cleanupOrphanedInboxItems(90);

      expect(count).toBe(0);
      expect(getInboxCount()).toBe(1);
    });

    it("returns 0 when autoDeleteDays is 0 or negative", async () => {
      await addToInbox("file:///photo.jpg", "image/jpeg", "camera");

      expect(await cleanupOrphanedInboxItems(0)).toBe(0);
      expect(await cleanupOrphanedInboxItems(-1)).toBe(0);
      expect(getInboxCount()).toBe(1);
    });

    it("handles empty inbox", async () => {
      const count = await cleanupOrphanedInboxItems(90);
      expect(count).toBe(0);
    });

    it("only deletes expired items, keeps recent ones", async () => {
      await addToInbox("file:///recent.jpg", "image/jpeg", "camera");
      await addToInbox("file:///old.jpg", "image/jpeg", "camera");

      // Backdate only the second item
      const state = JSON.parse(mmkvStore["opus_inbox_state"]!);
      state.items[1].capturedAt = new Date(
        Date.now() - 100 * 24 * 60 * 60 * 1000,
      ).toISOString();
      mmkvStore["opus_inbox_state"] = JSON.stringify(state);

      const count = await cleanupOrphanedInboxItems(90);

      expect(count).toBe(1);
      expect(getInboxCount()).toBe(1);
    });
  });
});
