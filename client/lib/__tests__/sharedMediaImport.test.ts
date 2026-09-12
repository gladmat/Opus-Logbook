/**
 * sharedMediaImport / importEncryptedMediaV2 — the recipient side. The
 * owner's ciphertext + the DEK from the blob must become a normal local
 * media item that decrypts under the RECIPIENT's master key, thumb-first.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createExpoFileSystemMock,
  resetMockExpoFileSystem,
  writeMockFile,
  readMockFileBytes,
  mockFileExists,
} from "./helpers/mockExpoFileSystem";

vi.mock("expo-file-system", () => createExpoFileSystemMock());
vi.mock("expo-crypto", () => ({
  getRandomBytes: (n: number) =>
    globalThis.crypto.getRandomValues(new Uint8Array(n)),
  getRandomBytesAsync: async (n: number) =>
    globalThis.crypto.getRandomValues(new Uint8Array(n)),
}));

const RECIPIENT_MASTER = new Uint8Array(32).fill(42);
vi.mock("../encryption", () => ({
  getMasterKeyBytes: async () => RECIPIENT_MASTER,
}));

// Download = copy a pre-seeded "server" file into the destination.
const serverFiles = new Map<string, Uint8Array>();
const downloadSharedMediaVariant = vi.fn(
  async (
    _sharedCaseId: string,
    mediaId: string,
    variant: string,
    destination: { uri: string },
  ) => {
    const bytes = serverFiles.get(`${mediaId}:${variant}`);
    if (!bytes) throw new Error("UnableToDownload 404");
    writeMockFile(destination.uri, bytes);
    // Return the SAME object the caller passed (as the real transport
    // does) — `File.move` later mutates its `uri`, which is exactly the
    // trap a temp-cleanup step must not fall into.
    return destination;
  },
);
vi.mock("../sharedMediaApi", () => ({
  downloadSharedMediaVariant: (...args: unknown[]) =>
    (downloadSharedMediaVariant as unknown as (...a: unknown[]) => unknown)(
      ...args,
    ),
}));

const { File, Paths } = await import("expo-file-system");
const {
  saveMediaV2,
  readMeta,
  hasMediaVariantV2,
  hasMediaV2,
  decryptMediaVariantToFile,
  getMediaPaths,
  importEncryptedMediaV2,
} = await import("../mediaFileStorage");
const { buildSharedMediaDescriptors } = await import(
  "../sharedMediaDescriptors"
);
const {
  ensureSharedMediaVariant,
  importSharedThumbs,
  listLocalSharedThumbIds,
  deleteImportedSharedMedia,
  clearLocalSharedThumbCache,
} = await import("../sharedMediaImport");

const OWNER_MASTER = new Uint8Array(32).fill(7);
const PLAIN = new Uint8Array([10, 20, 30, 40, 50, 60]);
const THUMB = new Uint8Array([1, 2, 3]);

/** Owner encrypts a photo, publishes ciphertext to the fake server, and we
 *  return the descriptor that would ride in the blob. */
async function publishFromOwner() {
  writeMockFile("file:///cache/src.jpg", PLAIN);
  writeMockFile("file:///cache/thumb.jpg", THUMB);
  const uri = await saveMediaV2(
    "file:///cache/src.jpg",
    "file:///cache/thumb.jpg",
    "image/jpeg",
    OWNER_MASTER,
    100,
    80,
  );
  const mediaId = uri.slice("opus-media:".length);
  const paths = getMediaPaths(mediaId);
  serverFiles.set(`${mediaId}:image`, readMockFileBytes(paths.image.uri));
  serverFiles.set(`${mediaId}:thumb`, readMockFileBytes(paths.thumb.uri));
  const { descriptors } = await buildSharedMediaDescriptors(
    [
      {
        id: "x",
        localUri: uri,
        mimeType: "image/jpeg",
        createdAt: "x",
        tag: "preop",
      },
    ],
    OWNER_MASTER,
  );
  // Simulate a different device: wipe the owner's local store.
  paths.dir.delete();
  return descriptors[0]!;
}

async function decryptLocal(mediaId: string, variant: "thumb" | "full") {
  const out = new File(Paths.cache, `out-${variant}.jpg`);
  await decryptMediaVariantToFile(mediaId, RECIPIENT_MASTER, variant, out.uri);
  return readMockFileBytes(out.uri);
}

describe("recipient import", () => {
  beforeEach(() => {
    resetMockExpoFileSystem();
    serverFiles.clear();
    downloadSharedMediaVariant.mockClear();
    clearLocalSharedThumbCache();
  });

  it("listLocalSharedThumbIds caches positives only and forgets deleted media", async () => {
    const a = await publishFromOwner();
    const b = await publishFromOwner();
    // Nothing imported yet → nothing cached, nothing listed.
    expect([...(await listLocalSharedThumbIds([a, b]))]).toEqual([]);
    await importSharedThumbs("share-1", [a]);
    // A negative result was not cached: the import is visible immediately.
    expect([...(await listLocalSharedThumbIds([a, b]))]).toEqual([a.mediaId]);
    // Positive result survives the file going away (cached) …
    resetMockExpoFileSystem();
    expect([...(await listLocalSharedThumbIds([a]))]).toEqual([a.mediaId]);
    // … until the media is deleted through this module.
    await deleteImportedSharedMedia([a]);
    expect([...(await listLocalSharedThumbIds([a]))]).toEqual([]);
  });

  it("thumb-first import writes a valid meta, decrypts the thumb under the recipient key, and serves the thumb for the full variant until the image arrives", async () => {
    const d = await publishFromOwner();
    expect(await ensureSharedMediaVariant("share-1", d, "thumb")).toBe(true);

    const meta = await readMeta(d.mediaId);
    expect(meta).not.toBeNull();
    expect(meta!.hasThumb).toBe(true);
    expect(meta!.originalNonce).toBe(d.image.nonce);
    expect(meta!.thumbTag).toBe(d.thumb!.tag);
    // Re-wrapped under OUR master key, not the owner's.
    expect(await hasMediaVariantV2(d.mediaId, "thumb")).toBe(true);
    // The moved ciphertext must survive temp cleanup.
    expect(getMediaPaths(d.mediaId).thumb.exists).toBe(true);
    expect(await hasMediaVariantV2(d.mediaId, "full")).toBe(false);
    expect(await hasMediaV2(d.mediaId)).toBe(false);
    expect(await decryptLocal(d.mediaId, "thumb")).toEqual(THUMB);
    // full → thumb fallback (viewer shows the thumb instead of an error).
    expect(await decryptLocal(d.mediaId, "full")).toEqual(THUMB);
    // Temp download removed.
    expect(
      mockFileExists(`file:///cache/opus-shared-dl/${d.mediaId}.thumb.enc`),
    ).toBe(false);
  });

  it("image import after thumb keeps the wrapped key and now decrypts full-res", async () => {
    const d = await publishFromOwner();
    await ensureSharedMediaVariant("share-1", d, "thumb");
    const before = (await readMeta(d.mediaId))!.wrappedDEK;
    expect(await ensureSharedMediaVariant("share-1", d, "image")).toBe(true);
    expect((await readMeta(d.mediaId))!.wrappedDEK).toBe(before);
    expect(await hasMediaVariantV2(d.mediaId, "full")).toBe(true);
    expect(await decryptLocal(d.mediaId, "full")).toEqual(PLAIN);
    expect(await decryptLocal(d.mediaId, "thumb")).toEqual(THUMB);
  });

  it("is idempotent — a present variant is not downloaded again", async () => {
    const d = await publishFromOwner();
    await ensureSharedMediaVariant("share-1", d, "thumb");
    downloadSharedMediaVariant.mockClear();
    expect(await ensureSharedMediaVariant("share-1", d, "thumb")).toBe(false);
    expect(downloadSharedMediaVariant).not.toHaveBeenCalled();
  });

  it("createdAt on the recipient's plaintext meta is day-rounded from the descriptor", async () => {
    const d = await publishFromOwner();
    await ensureSharedMediaVariant("share-1", d, "thumb");
    const created = new Date((await readMeta(d.mediaId))!.createdAt);
    expect(created.getHours()).toBe(0);
    expect(created.getMinutes()).toBe(0);
  });

  it("tampered ciphertext fails to decrypt (auth tag) — never silently renders", async () => {
    const d = await publishFromOwner();
    const bytes = serverFiles.get(`${d.mediaId}:thumb`)!;
    const tampered = new Uint8Array(bytes);
    tampered[0] ^= 0xff;
    serverFiles.set(`${d.mediaId}:thumb`, tampered);
    await ensureSharedMediaVariant("share-1", d, "thumb");
    await expect(decryptLocal(d.mediaId, "thumb")).rejects.toThrow();
  });

  it("size mismatch against the descriptor is rejected and leaves nothing behind", async () => {
    const d = await publishFromOwner();
    serverFiles.set(`${d.mediaId}:thumb`, new Uint8Array([1]));
    await expect(
      ensureSharedMediaVariant("share-1", d, "thumb"),
    ).rejects.toThrow(/size mismatch/);
    expect(await readMeta(d.mediaId)).toBeNull();
  });

  it("importSharedThumbs imports every thumb, reports per-item failures, listLocalSharedThumbIds reflects it", async () => {
    const a = await publishFromOwner();
    const b = await publishFromOwner();
    serverFiles.delete(`${b.mediaId}:thumb`);
    const result = await importSharedThumbs("share-1", [a, b]);
    expect(result.imported).toBe(1);
    expect(result.failed.map((f) => f.mediaId)).toEqual([b.mediaId]);
    const local = await listLocalSharedThumbIds([a, b]);
    expect([...local]).toEqual([a.mediaId]);
  });

  it("importEncryptedMediaV2 rejects a malformed descriptor", async () => {
    await expect(
      importEncryptedMediaV2({
        mediaId: "bad",
        masterKey: RECIPIENT_MASTER,
        dekHex: "00".repeat(32),
        mimeType: "image/jpeg",
        width: 1,
        height: 1,
        image: { nonce: "aa", tag: "bb", size: 1, ciphertextSize: 1 },
        // hasThumb true but no thumb fields → invalid meta
        thumb: {
          nonce: undefined as unknown as string,
          tag: "x",
          size: 1,
          ciphertextSize: 1,
        },
        createdAt: "2026-01-01",
        sources: {},
      }),
    ).rejects.toThrow(/Invalid shared media descriptor/);
  });
});

describe("shared device / stale meta (2.25.0 hardening)", () => {
  const OTHER_ACCOUNT = new Uint8Array(32).fill(99);

  beforeEach(() => {
    resetMockExpoFileSystem();
    serverFiles.clear();
    downloadSharedMediaVariant.mockClear();
  });

  it("another account's OWNED copy on the same device is never re-keyed; the thumb is not offered for cards", async () => {
    // Owner saves the photo on this device (has image.enc) under a
    // different master key, then shares it — the recipient account signs
    // in on the SAME device.
    writeMockFile("file:///cache/src.jpg", PLAIN);
    writeMockFile("file:///cache/thumb.jpg", THUMB);
    const uri = await saveMediaV2(
      "file:///cache/src.jpg",
      "file:///cache/thumb.jpg",
      "image/jpeg",
      OTHER_ACCOUNT,
      100,
      80,
    );
    const mediaId = uri.slice("opus-media:".length);
    const { descriptors } = await buildSharedMediaDescriptors(
      [{ id: "x", localUri: uri, mimeType: "image/jpeg", createdAt: "x" }],
      OTHER_ACCOUNT,
    );
    const d = descriptors[0]!;
    serverFiles.set(
      `${mediaId}:thumb`,
      readMockFileBytes(getMediaPaths(mediaId).thumb.uri),
    );
    const before = (await readMeta(mediaId))!.wrappedDEK;

    await expect(
      ensureSharedMediaVariant("share-1", d, "thumb"),
    ).rejects.toThrow(/another account/);
    expect((await readMeta(mediaId))!.wrappedDEK).toBe(before);
    expect(await listLocalSharedThumbIds([d])).toEqual(new Set());
  });

  it("a stale partial import keyed to the wrong key is re-keyed from the descriptor", async () => {
    const d = await publishFromOwner();
    // Simulate a bad earlier import: thumb present, meta wrapped under a key
    // this account does not hold.
    await importEncryptedMediaV2({
      mediaId: d.mediaId,
      masterKey: OTHER_ACCOUNT,
      dekHex: d.dekHex,
      mimeType: d.mimeType,
      width: d.width,
      height: d.height,
      image: d.image,
      thumb: d.thumb,
      createdAt: d.createdAt,
      sources: {},
    });
    writeMockFile(
      getMediaPaths(d.mediaId).thumb.uri,
      serverFiles.get(`${d.mediaId}:thumb`)!,
    );
    expect(await listLocalSharedThumbIds([d])).toEqual(new Set());

    expect(await ensureSharedMediaVariant("share-1", d, "thumb")).toBe(true);
    expect(await listLocalSharedThumbIds([d])).toEqual(new Set([d.mediaId]));
    expect(await decryptLocal(d.mediaId, "thumb")).toEqual(THUMB);
  });
});
