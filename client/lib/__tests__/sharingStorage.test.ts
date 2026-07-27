/**
 * sharingStorage — version-stamped decrypted-share cache.
 *
 * Edit-saves update a share row IN PLACE (same id, bumped blobVersion), so
 * the cached decrypt must carry the version it was made from: a server
 * version ahead of the cache means stale content. Legacy records (bare
 * SharedCaseData, pre-versioning) read back as version null so callers
 * treat them as stale-once-online and self-upgrade them.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import type { SharedCaseData } from "@/types/sharing";

vi.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: vi.fn(async (key: string) => store.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      __store: store,
    },
  };
});

vi.mock("../encryption", () => ({
  encryptData: vi.fn(async (plain: string) => `enc:test:${plain}`),
  decryptData: vi.fn(async (cipher: string) => {
    if (!cipher.startsWith("enc:test:")) {
      throw new Error("Invalid envelope");
    }
    return cipher.slice("enc:test:".length);
  }),
}));

vi.mock("../activeUser", () => ({
  userScopedAsyncKey: (key: string) => `user-test:${key}`,
  userScopedSecureKey: (key: string) => `user-test:${key}`,
}));

vi.mock("../secureStorage", () => ({
  getSecureItem: vi.fn(async () => null),
  setSecureItem: vi.fn(async () => undefined),
}));

const AsyncStorage = (await import("@react-native-async-storage/async-storage"))
  .default as unknown as { __store: Map<string, string> };

const {
  saveDecryptedSharedCase,
  getDecryptedSharedCase,
  getDecryptedSharedCaseWithVersion,
  removeDecryptedSharedCase,
} = await import("../sharingStorage");

const SHARE_ID = "share-1";
const CACHE_KEY = `user-test:@opus_shared_case_${SHARE_ID}`;

function makeBlob(): SharedCaseData {
  return { caseId: "case-1" } as unknown as SharedCaseData;
}

beforeEach(() => {
  AsyncStorage.__store.clear();
  vi.clearAllMocks();
});

describe("versioned decrypted-share cache", () => {
  it("round-trips data + blobVersion", async () => {
    await saveDecryptedSharedCase(SHARE_ID, makeBlob(), 4);
    const record = await getDecryptedSharedCaseWithVersion(SHARE_ID);
    expect(record?.blobVersion).toBe(4);
    expect(record?.data).toEqual(makeBlob());
  });

  it("getDecryptedSharedCase unwraps the versioned record", async () => {
    await saveDecryptedSharedCase(SHARE_ID, makeBlob(), 2);
    expect(await getDecryptedSharedCase(SHARE_ID)).toEqual(makeBlob());
  });

  it("stores an unversioned record when no version is passed and reads it back as version null", async () => {
    await saveDecryptedSharedCase(SHARE_ID, makeBlob());
    const record = await getDecryptedSharedCaseWithVersion(SHARE_ID);
    expect(record?.blobVersion).toBeNull();
    expect(record?.data).toEqual(makeBlob());
  });

  it("reads a LEGACY bare-SharedCaseData record as version null (pre-versioning compat)", async () => {
    // Simulate a record written before versioning existed: bare data object.
    AsyncStorage.__store.set(
      CACHE_KEY,
      `enc:test:${JSON.stringify(makeBlob())}`,
    );
    const record = await getDecryptedSharedCaseWithVersion(SHARE_ID);
    expect(record?.blobVersion).toBeNull();
    expect(record?.data).toEqual(makeBlob());
    expect(await getDecryptedSharedCase(SHARE_ID)).toEqual(makeBlob());
  });

  it("a re-save under the same id replaces the record and version", async () => {
    await saveDecryptedSharedCase(SHARE_ID, makeBlob(), 1);
    await saveDecryptedSharedCase(SHARE_ID, makeBlob(), 2);
    const record = await getDecryptedSharedCaseWithVersion(SHARE_ID);
    expect(record?.blobVersion).toBe(2);
  });

  it("returns null for missing or tampered records", async () => {
    expect(await getDecryptedSharedCaseWithVersion(SHARE_ID)).toBeNull();
    AsyncStorage.__store.set(CACHE_KEY, "not-an-envelope");
    expect(await getDecryptedSharedCaseWithVersion(SHARE_ID)).toBeNull();
  });

  it("removeDecryptedSharedCase drops the record", async () => {
    await saveDecryptedSharedCase(SHARE_ID, makeBlob(), 1);
    await removeDecryptedSharedCase(SHARE_ID);
    expect(await getDecryptedSharedCase(SHARE_ID)).toBeNull();
  });
});
