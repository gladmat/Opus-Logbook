/**
 * sharedMediaDescriptors — the owner-side bridge from the on-device
 * encrypted media store to the key-bearing descriptors inside the share
 * blob. The DEK that comes out must be the SAME key the local meta.json
 * wraps, and nothing plaintext must be touched.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { hexToBytes } from "@noble/hashes/utils.js";
import {
  createExpoFileSystemMock,
  resetMockExpoFileSystem,
  writeMockFile,
} from "./helpers/mockExpoFileSystem";

vi.mock("expo-file-system", () => createExpoFileSystemMock());
vi.mock("expo-crypto", () => ({
  getRandomBytes: (n: number) =>
    globalThis.crypto.getRandomValues(new Uint8Array(n)),
  getRandomBytesAsync: async (n: number) =>
    globalThis.crypto.getRandomValues(new Uint8Array(n)),
}));

const { saveMediaV2, readMeta } = await import("../mediaFileStorage");
const { unwrapDek } = await import("../mediaEncryption");
const { buildSharedMediaDescriptors } = await import(
  "../sharedMediaDescriptors"
);

const MASTER = new Uint8Array(32).fill(7);

async function seedMedia(withThumb = true): Promise<string> {
  writeMockFile("file:///cache/src.jpg", new Uint8Array([1, 2, 3, 4, 5]));
  if (withThumb) {
    writeMockFile("file:///cache/thumb.jpg", new Uint8Array([9, 8]));
  }
  const uri = await saveMediaV2(
    "file:///cache/src.jpg",
    withThumb ? "file:///cache/thumb.jpg" : null,
    "image/jpeg",
    MASTER,
    640,
    480,
  );
  return uri.slice("opus-media:".length);
}

describe("buildSharedMediaDescriptors", () => {
  beforeEach(() => resetMockExpoFileSystem());

  it("emits one descriptor per encrypted item with the unwrapped DEK and cipher metadata", async () => {
    const mediaId = await seedMedia();
    const meta = (await readMeta(mediaId))!;
    const result = await buildSharedMediaDescriptors(
      [
        {
          id: "m1",
          localUri: `opus-media:${mediaId}`,
          mimeType: "image/jpeg",
          createdAt: "2026-09-10T00:00:00.000Z",
          tag: "intraop",
          caption: "Flap inset",
          timestamp: "2026-09-09T03:15:00.000Z",
        },
      ],
      MASTER,
    );
    expect(result.skippedUnencrypted).toBe(0);
    expect(result.skippedUnreadable).toBe(0);
    expect(result.descriptors).toHaveLength(1);
    const d = result.descriptors[0]!;
    expect(d.mediaId).toBe(mediaId);
    expect(d.dekHex).toMatch(/^[0-9a-f]{64}$/);
    // Same key the local meta wraps.
    const localDek = await unwrapDek(hexToBytes(meta.wrappedDEK), MASTER);
    expect(hexToBytes(d.dekHex)).toEqual(localDek);
    expect(d.image).toEqual({
      nonce: meta.originalNonce,
      tag: meta.originalTag,
      size: meta.originalSize,
      ciphertextSize: meta.originalCiphertextSize,
    });
    expect(d.thumb).toEqual({
      nonce: meta.thumbNonce,
      tag: meta.thumbTag,
      size: meta.thumbSize,
      ciphertextSize: meta.thumbCiphertextSize,
    });
    expect(d.width).toBe(640);
    expect(d.height).toBe(480);
    expect(d.tag).toBe("intraop");
    expect(d.caption).toBe("Flap inset");
    expect(d.timestamp).toBe("2026-09-09T03:15:00.000Z");
    // Day-rounded createdAt is taken from meta, never the item.
    expect(d.createdAt).toBe(meta.createdAt);
  });

  it("thumb is null when the item has no thumbnail", async () => {
    const mediaId = await seedMedia(false);
    const result = await buildSharedMediaDescriptors(
      [
        {
          id: "m1",
          localUri: `opus-media:${mediaId}`,
          mimeType: "image/jpeg",
          createdAt: "x",
        },
      ],
      MASTER,
    );
    expect(result.descriptors[0]!.thumb).toBeNull();
  });

  it("skips plain file:// items and unreadable ids, counting each", async () => {
    const mediaId = await seedMedia();
    const result = await buildSharedMediaDescriptors(
      [
        {
          id: "a",
          localUri: "file:///old.jpg",
          mimeType: "image/jpeg",
          createdAt: "x",
        },
        {
          id: "b",
          localUri: "opus-media:does-not-exist",
          mimeType: "image/jpeg",
          createdAt: "x",
        },
        {
          id: "c",
          localUri: `opus-media:${mediaId}`,
          mimeType: "image/jpeg",
          createdAt: "x",
        },
      ],
      MASTER,
    );
    expect(result.skippedUnencrypted).toBe(1);
    expect(result.skippedUnreadable).toBe(1);
    expect(result.descriptors.map((d) => d.mediaId)).toEqual([mediaId]);
  });

  it("wrong master key → unreadable, never a throw", async () => {
    const mediaId = await seedMedia();
    const result = await buildSharedMediaDescriptors(
      [
        {
          id: "a",
          localUri: `opus-media:${mediaId}`,
          mimeType: "image/jpeg",
          createdAt: "x",
        },
      ],
      new Uint8Array(32).fill(1),
    );
    expect(result.descriptors).toHaveLength(0);
    expect(result.skippedUnreadable).toBe(1);
  });

  it("empty / undefined media → empty result", async () => {
    expect(await buildSharedMediaDescriptors(undefined, MASTER)).toEqual({
      descriptors: [],
      skippedUnencrypted: 0,
      skippedUnreadable: 0,
    });
  });
});
