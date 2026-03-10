/* eslint-disable import/first */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createExpoFileSystemMock,
  mockFileExists,
  readMockFileText,
  resetMockExpoFileSystem,
  writeMockFile,
} from "@/lib/__tests__/helpers/mockExpoFileSystem";

vi.mock("expo-file-system", () => createExpoFileSystemMock());
vi.mock("expo-crypto", () => ({
  getRandomBytes: (length: number) => {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  },
  getRandomBytesAsync: async (length: number) => {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  },
}));

import {
  deleteMediaV2,
  getMediaPaths,
  hasMediaV2,
  loadDecryptedImageV2,
  loadDecryptedThumbV2,
  readMeta,
  saveMediaV2,
} from "@/lib/mediaFileStorage";

function makeMasterKey(): Uint8Array {
  const key = new Uint8Array(32);
  globalThis.crypto.getRandomValues(key);
  return key;
}

describe("mediaFileStorage", () => {
  beforeEach(() => {
    resetMockExpoFileSystem();
  });

  it("saves encrypted v2 media and loads image/thumb payloads back", async () => {
    const mediaId = "media-storage-roundtrip";
    const sourceUri = "file:///cache/source.jpg";
    const thumbUri = "file:///cache/thumb.jpg";
    const imageBytes = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const thumbBytes = new Uint8Array([9, 8, 7]);

    writeMockFile(sourceUri, imageBytes);
    writeMockFile(thumbUri, thumbBytes);

    const localUri = await saveMediaV2(
      sourceUri,
      thumbUri,
      "image/jpeg",
      makeMasterKey(),
      1024,
      768,
      mediaId,
    );

    expect(localUri).toBe(`opus-media:${mediaId}`);
    expect(await hasMediaV2(mediaId)).toBe(true);

    const meta = await readMeta(mediaId);
    expect(meta).toMatchObject({
      version: 2,
      mediaId,
      mimeType: "image/jpeg",
      width: 1024,
      height: 768,
      hasThumb: true,
      originalSize: imageBytes.length,
      thumbSize: thumbBytes.length,
    });
    expect(meta?.originalNonce).toHaveLength(24);
    expect(meta?.originalTag).toHaveLength(32);
    expect(meta?.thumbNonce).toHaveLength(24);
    expect(meta?.thumbTag).toHaveLength(32);

    const masterKey = makeMasterKey();
    const secondMediaId = "same-key";
    writeMockFile("file:///cache/source-2.jpg", imageBytes);
    await saveMediaV2(
      "file:///cache/source-2.jpg",
      null,
      "image/jpeg",
      masterKey,
      640,
      480,
      secondMediaId,
    );
    const roundtripMeta = await readMeta(secondMediaId);
    expect(roundtripMeta?.hasThumb).toBe(false);

    const roundtripImage = await loadDecryptedImageV2(secondMediaId, masterKey);
    expect(roundtripImage.mimeType).toBe("image/jpeg");
    expect(roundtripImage.bytes).toEqual(imageBytes);
  });

  it("falls back to the full image when no encrypted thumbnail exists", async () => {
    const mediaId = "no-thumb";
    const sourceUri = "file:///cache/no-thumb.jpg";
    const imageBytes = new Uint8Array([10, 11, 12]);
    const masterKey = makeMasterKey();

    writeMockFile(sourceUri, imageBytes);
    await saveMediaV2(
      sourceUri,
      null,
      "image/jpeg",
      masterKey,
      200,
      100,
      mediaId,
    );

    const thumbPayload = await loadDecryptedThumbV2(mediaId, masterKey);
    expect(thumbPayload.mimeType).toBe("image/jpeg");
    expect(thumbPayload.bytes).toEqual(imageBytes);
  });

  it("writes expanded metadata and deletes the v2 directory", async () => {
    const mediaId = "delete-me";
    const sourceUri = "file:///cache/delete.jpg";
    const masterKey = makeMasterKey();

    writeMockFile(sourceUri, new Uint8Array([1, 2, 3]));
    await saveMediaV2(sourceUri, null, "image/png", masterKey, 50, 60, mediaId);

    const paths = getMediaPaths(mediaId);
    expect(JSON.parse(readMockFileText(paths.meta.uri))).toMatchObject({
      mediaId,
      mimeType: "image/png",
      originalSize: 3,
    });

    await deleteMediaV2(mediaId);

    expect(mockFileExists(paths.image.uri)).toBe(false);
    expect(mockFileExists(paths.meta.uri)).toBe(false);
    expect(await hasMediaV2(mediaId)).toBe(false);
  });
});
