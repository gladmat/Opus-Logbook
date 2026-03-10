/* eslint-disable import/first */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createExpoFileSystemMock,
  resetMockExpoFileSystem,
  writeMockFile,
} from "@/lib/__tests__/helpers/mockExpoFileSystem";

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

const asyncStorageState = new Map<string, string>();
const masterKey = new Uint8Array(32).fill(7);

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
vi.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: () => ({
      resize: vi.fn(),
      renderAsync: async () => ({
        saveAsync: async () => ({
          uri: "file:///cache/mock-image.jpg",
          width: 1,
          height: 1,
          base64: "",
        }),
      }),
    }),
  },
  SaveFormat: {
    JPEG: "jpeg",
    PNG: "png",
  },
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => asyncStorageState.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      asyncStorageState.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      asyncStorageState.delete(key);
    }),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const key of keys) {
        asyncStorageState.delete(key);
      }
    }),
    getAllKeys: vi.fn(async () => [...asyncStorageState.keys()]),
  },
}));
vi.mock("@/lib/encryption", () => ({
  decryptData: vi.fn(async (value: string) => value),
  encryptData: vi.fn(async (value: string) => value),
  getMasterKeyBytes: vi.fn(async () => new Uint8Array(masterKey)),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

import { saveMediaV2, hasMediaV2 } from "@/lib/mediaFileStorage";
import { migrateV1ToV2 } from "@/lib/mediaMigration";
import {
  canonicalizePersistedMediaUris,
  deleteEncryptedMedia,
  resolveMediaStorage,
} from "@/lib/mediaStorage";

function legacyMediaKey(id: string): string {
  return `@surgical_logbook_media_${id}`;
}

function legacyThumbKey(id: string): string {
  return `@surgical_logbook_thumb_${id}`;
}

function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

describe("media migration and storage resolution", () => {
  beforeEach(() => {
    asyncStorageState.clear();
    resetMockExpoFileSystem();
  });

  it("returns canonical opus-media URIs when v2 storage exists", async () => {
    const mediaId = "canonical";
    writeMockFile("file:///cache/canonical.jpg", new Uint8Array([1, 2, 3]));
    await saveMediaV2(
      "file:///cache/canonical.jpg",
      null,
      "image/jpeg",
      masterKey,
      100,
      200,
      mediaId,
    );

    const resolved = await resolveMediaStorage(`encrypted-media:${mediaId}`);
    expect(resolved.kind).toBe("v2");
    expect(resolved.canonicalUri).toBe(`opus-media:${mediaId}`);
  });

  it("deletes both legacy AsyncStorage blobs and migrated v2 files", async () => {
    const mediaId = "dual-delete";
    writeMockFile("file:///cache/delete.jpg", new Uint8Array([3, 2, 1]));
    await saveMediaV2(
      "file:///cache/delete.jpg",
      null,
      "image/jpeg",
      masterKey,
      10,
      10,
      mediaId,
    );
    await AsyncStorage.setItem(
      legacyMediaKey(mediaId),
      JSON.stringify({
        m: "image/jpeg",
        d: encodeBase64(new Uint8Array([3, 2, 1])),
      }),
    );
    await AsyncStorage.setItem(
      legacyThumbKey(mediaId),
      encodeBase64(new Uint8Array([1])),
    );

    await deleteEncryptedMedia(`encrypted-media:${mediaId}`);

    expect(await AsyncStorage.getItem(legacyMediaKey(mediaId))).toBeNull();
    expect(await AsyncStorage.getItem(legacyThumbKey(mediaId))).toBeNull();
    expect(await hasMediaV2(mediaId)).toBe(false);
  });

  it("canonicalizes nested persisted media references without forcing migration", async () => {
    const mediaId = "nested";
    writeMockFile("file:///cache/nested.jpg", new Uint8Array([8, 9]));
    await saveMediaV2(
      "file:///cache/nested.jpg",
      null,
      "image/jpeg",
      masterKey,
      50,
      60,
      mediaId,
    );

    const payload = await canonicalizePersistedMediaUris({
      operativeMedia: [{ localUri: `encrypted-media:${mediaId}` }],
      lesionPhotos: [{ uri: `encrypted-media:${mediaId}` }],
      nested: {
        mediaAttachments: [{ localUri: `encrypted-media:${mediaId}` }],
      },
    });

    expect(payload).toEqual({
      operativeMedia: [{ localUri: `opus-media:${mediaId}` }],
      lesionPhotos: [{ uri: `opus-media:${mediaId}` }],
      nested: {
        mediaAttachments: [{ localUri: `opus-media:${mediaId}` }],
      },
    });
  });

  it("recovers from a stale migrated-set entry by re-migrating legacy storage", async () => {
    const mediaId = "recover";
    const legacyPayload = JSON.stringify({
      m: "image/jpeg",
      d: encodeBase64(new Uint8Array([4, 5, 6, 7])),
    });

    await AsyncStorage.setItem(legacyMediaKey(mediaId), legacyPayload);
    await AsyncStorage.setItem(
      "@opus_media_migrated",
      JSON.stringify([mediaId]),
    );

    const migratedUri = await migrateV1ToV2(mediaId);

    expect(migratedUri).toBe(`opus-media:${mediaId}`);
    expect(await hasMediaV2(mediaId)).toBe(true);
  });
});
