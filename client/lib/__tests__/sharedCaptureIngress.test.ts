/* eslint-disable import/first */

import { beforeEach, describe, expect, it, vi } from "vitest";

const deletedUris: string[] = [];
const selectedInboxIds: string[][] = [];
let pendingCaptures: Array<{
  id: string;
  sourceUri: string;
  mimeType?: string;
  capturedAt?: string;
}> = [];
let replacedCaptures: typeof pendingCaptures = [];
let clearedCount = 0;
let addToInboxImpl = vi.fn(
  async (sourceUri: string, mimeType: string, _sourceType: string) => ({
    id: `inbox-${sourceUri}`,
    localUri: `opus-media:${sourceUri}`,
    mimeType,
  }),
);
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

vi.mock("expo-file-system", () => ({
  File: class MockFile {
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    get exists() {
      return true;
    }

    delete() {
      deletedUris.push(this.uri);
    }
  },
}));

vi.mock("../inboxStorage", () => ({
  addToInbox: (...args: Parameters<typeof addToInboxImpl>) => addToInboxImpl(...args),
  setPendingInboxSelection: vi.fn((itemIds: string[]) => {
    selectedInboxIds.push(itemIds);
  }),
}));

vi.mock("../nativeExtensionBridge", () => ({
  readPendingLockedCameraCaptures: vi.fn(() => pendingCaptures),
  replacePendingLockedCameraCaptures: vi.fn((captures: typeof pendingCaptures) => {
    replacedCaptures = captures;
  }),
  clearPendingLockedCameraCaptures: vi.fn(() => {
    clearedCount += 1;
  }),
}));

import { ingestPendingLockedCameraCaptures } from "../sharedCaptureIngress";

beforeEach(() => {
  deletedUris.length = 0;
  selectedInboxIds.length = 0;
  pendingCaptures = [];
  replacedCaptures = [];
  clearedCount = 0;
  addToInboxImpl = vi.fn(
    async (sourceUri: string, mimeType: string, _sourceType: string) => ({
      id: `inbox-${sourceUri}`,
      localUri: `opus-media:${sourceUri}`,
      mimeType,
    }),
  );
  consoleWarnSpy.mockClear();
});

describe("sharedCaptureIngress", () => {
  it("imports pending locked-camera captures and clears the manifest", async () => {
    pendingCaptures = [
      {
        id: "capture-1",
        sourceUri: "file:///capture-1.jpg",
        mimeType: "image/jpeg",
        capturedAt: "2026-03-11T01:00:00.000Z",
      },
      {
        id: "capture-2",
        sourceUri: "file:///capture-2.jpg",
        mimeType: "image/jpeg",
        capturedAt: "2026-03-11T01:01:00.000Z",
      },
    ];

    const importedCount = await ingestPendingLockedCameraCaptures();

    expect(importedCount).toBe(2);
    expect(addToInboxImpl).toHaveBeenCalledTimes(2);
    expect(selectedInboxIds).toEqual([
      ["inbox-file:///capture-1.jpg", "inbox-file:///capture-2.jpg"],
    ]);
    expect(deletedUris).toEqual([
      "file:///capture-1.jpg",
      "file:///capture-2.jpg",
    ]);
    expect(clearedCount).toBe(1);
    expect(replacedCaptures).toEqual([]);
  });

  it("keeps failed pending captures in the manifest", async () => {
    pendingCaptures = [
      {
        id: "capture-ok",
        sourceUri: "file:///capture-ok.jpg",
        mimeType: "image/jpeg",
      },
      {
        id: "capture-fail",
        sourceUri: "file:///capture-fail.jpg",
        mimeType: "image/jpeg",
      },
    ];
    addToInboxImpl = vi.fn(async (sourceUri: string, mimeType: string) => {
      if (sourceUri.includes("fail")) {
        throw new Error("save failed");
      }

      return {
        id: `inbox-${sourceUri}`,
        localUri: `opus-media:${sourceUri}`,
        mimeType,
      };
    });

    const importedCount = await ingestPendingLockedCameraCaptures();

    expect(importedCount).toBe(1);
    expect(selectedInboxIds).toEqual([["inbox-file:///capture-ok.jpg"]]);
    expect(deletedUris).toEqual(["file:///capture-ok.jpg"]);
    expect(clearedCount).toBe(0);
    expect(replacedCaptures).toEqual([
      {
        id: "capture-fail",
        sourceUri: "file:///capture-fail.jpg",
        mimeType: "image/jpeg",
      },
    ]);
  });
});
