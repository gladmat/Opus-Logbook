/**
 * sharedMediaUpload — owner-side reconciliation: upload what the server
 * lacks, skip what it has, delete what the case dropped, retry-safe.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SharedMediaDescriptor } from "@/types/sharing";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
  },
}));
vi.mock("../activeUser", () => ({
  userScopedAsyncKey: (k: string) => `u:${k}`,
}));

const existing = new Set<string>();
vi.mock("../mediaFileStorage", () => ({
  getMediaPaths: (mediaId: string) => ({
    image: {
      uri: `file:///doc/opus-media/${mediaId}/image.enc`,
      get exists() {
        return existing.has(`${mediaId}:image`);
      },
    },
    thumb: {
      uri: `file:///doc/opus-media/${mediaId}/thumb.enc`,
      get exists() {
        return existing.has(`${mediaId}:thumb`);
      },
    },
  }),
}));

const listUploadedSharedMedia = vi.fn();
const uploadSharedMediaVariant = vi.fn();
const deleteSharedMedia = vi.fn();
vi.mock("../sharedMediaApi", () => ({
  listUploadedSharedMedia: (...a: unknown[]) => listUploadedSharedMedia(...a),
  uploadSharedMediaVariant: (...a: unknown[]) => uploadSharedMediaVariant(...a),
  deleteSharedMedia: (...a: unknown[]) => deleteSharedMedia(...a),
}));

const { uploadCaseMediaForShare, planSharedMediaUploads } = await import(
  "../sharedMediaUpload"
);

function d(mediaId: string, withThumb = true): SharedMediaDescriptor {
  return {
    mediaId,
    dekHex: "ab".repeat(32),
    mimeType: "image/jpeg",
    width: 10,
    height: 10,
    image: {
      nonce: "n1",
      tag: "t-image-" + mediaId,
      size: 5,
      ciphertextSize: 5,
    },
    thumb: withThumb
      ? { nonce: "n2", tag: "t-thumb-" + mediaId, size: 2, ciphertextSize: 2 }
      : null,
    createdAt: "2026-09-10T00:00:00.000Z",
  };
}

describe("planSharedMediaUploads", () => {
  it("one task per missing variant; thumb-less descriptors only need the image", () => {
    const tasks = planSharedMediaUploads(
      [d("a"), d("b", false)],
      new Set(["a:thumb"]),
    );
    expect(tasks).toEqual([
      { mediaId: "a", variant: "image", authTag: "t-image-a" },
      { mediaId: "b", variant: "image", authTag: "t-image-b" },
    ]);
  });
});

describe("uploadCaseMediaForShare", () => {
  beforeEach(() => {
    store.clear();
    existing.clear();
    listUploadedSharedMedia.mockReset();
    uploadSharedMediaVariant.mockReset();
    deleteSharedMedia.mockReset();
    uploadSharedMediaVariant.mockResolvedValue({ byteSize: 5 });
    deleteSharedMedia.mockResolvedValue(undefined);
  });

  it("uploads missing variants from the local .enc files with the auth tag, skips present ones, deletes removed photos", async () => {
    existing.add("a:image").add("a:thumb").add("b:image").add("b:thumb");
    listUploadedSharedMedia.mockResolvedValue([
      { mediaId: "a", variant: "thumb", byteSize: 2, authTag: null },
      { mediaId: "gone", variant: "image", byteSize: 9, authTag: null },
    ]);
    const result = await uploadCaseMediaForShare({
      caseId: "case-1",
      descriptors: [d("a"), d("b")],
    });
    expect(result.uploaded).toBe(3);
    expect(result.alreadyPresent).toBe(1);
    expect(result.failed).toEqual([]);
    expect(result.deleted).toBe(1);
    const calls = uploadSharedMediaVariant.mock.calls.map((c) => [
      c[1],
      c[2],
      c[3],
      c[4],
    ]);
    expect(calls).toEqual(
      expect.arrayContaining([
        ["a", "image", "file:///doc/opus-media/a/image.enc", "t-image-a"],
        ["b", "thumb", "file:///doc/opus-media/b/thumb.enc", "t-thumb-b"],
        ["b", "image", "file:///doc/opus-media/b/image.enc", "t-image-b"],
      ]),
    );
    expect(deleteSharedMedia).toHaveBeenCalledWith("case-1", "gone");
    // Local set persisted for the offline fallback.
    expect(
      JSON.parse(store.get("u:@opus_shared_media_uploaded_case-1")!),
    ).toEqual(expect.arrayContaining(["a:image", "b:thumb", "b:image"]));
  });

  it("records per-variant failures without aborting the rest", async () => {
    existing.add("a:image").add("a:thumb");
    listUploadedSharedMedia.mockResolvedValue([]);
    uploadSharedMediaVariant.mockImplementation(async (_c, _m, variant) => {
      if (variant === "thumb") throw new Error("boom");
      return { byteSize: 5 };
    });
    const result = await uploadCaseMediaForShare({
      caseId: "c",
      descriptors: [d("a")],
    });
    expect(result.uploaded).toBe(1);
    expect(result.failed).toEqual([
      { mediaId: "a", variant: "thumb", message: "boom" },
    ]);
  });

  it("a missing local .enc file is a failure, not a crash", async () => {
    listUploadedSharedMedia.mockResolvedValue([]);
    const result = await uploadCaseMediaForShare({
      caseId: "c",
      descriptors: [d("a", false)],
    });
    expect(result.uploaded).toBe(0);
    expect(result.failed[0]!.message).toMatch(/missing on this device/);
    expect(uploadSharedMediaVariant).not.toHaveBeenCalled();
  });

  it("falls back to the local uploaded-set when the server list is unreachable (no deletes attempted)", async () => {
    existing.add("a:image").add("a:thumb");
    store.set("u:@opus_shared_media_uploaded_c", JSON.stringify(["a:image"]));
    listUploadedSharedMedia.mockRejectedValue(new Error("offline"));
    const result = await uploadCaseMediaForShare({
      caseId: "c",
      descriptors: [d("a")],
    });
    expect(result.alreadyPresent).toBe(1);
    expect(result.uploaded).toBe(1);
    expect(uploadSharedMediaVariant).toHaveBeenCalledTimes(1);
    expect(uploadSharedMediaVariant.mock.calls[0]![2]).toBe("thumb");
    expect(deleteSharedMedia).not.toHaveBeenCalled();
  });
});
