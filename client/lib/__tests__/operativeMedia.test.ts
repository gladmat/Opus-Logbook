import { describe, expect, it } from "vitest";

import {
  attachmentsToOperativeMedia,
  operativeMediaToAttachments,
} from "@/lib/operativeMedia";
import type { MediaAttachment, OperativeMediaItem } from "@/types/case";
import { MEDIA_TAG_REGISTRY } from "@/types/media";
import { resolveMediaTag } from "@/lib/mediaTagHelpers";

// ===============================================================
// operativeMediaToAttachments
// ===============================================================

describe("operativeMediaToAttachments", () => {
  it("maps a single item with all fields", () => {
    const media: OperativeMediaItem[] = [
      {
        id: "media-1",
        localUri: "opus-media:1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        caption: "Pre-fixation",
        tag: "xray_preop",
        thumbnailUri: "opus-media:1-thumb",
        timestamp: "2026-03-09T12:00:00Z",
      },
    ];

    const attachments = operativeMediaToAttachments(media);

    expect(attachments).toEqual<MediaAttachment[]>([
      {
        id: "media-1",
        localUri: "opus-media:1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        caption: "Pre-fixation",
        tag: "xray_preop",
        thumbnailUri: "opus-media:1-thumb",
        timestamp: "2026-03-09T12:00:00Z",
      },
    ]);
  });

  it("resolves tag to other when tag is missing", () => {
    const media: OperativeMediaItem[] = [
      {
        id: "media-2",
        localUri: "opus-media:2",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
      },
    ];

    const attachments = operativeMediaToAttachments(media);

    expect(attachments[0]?.tag).toBe("other");
  });

  it("returns empty array for empty input", () => {
    expect(operativeMediaToAttachments([])).toEqual([]);
  });

  it("maps multiple items preserving order", () => {
    const media: OperativeMediaItem[] = [
      {
        id: "m1",
        localUri: "opus-media:1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-08T00:00:00Z",
        tag: "preop_clinical",
      },
      {
        id: "m2",
        localUri: "opus-media:2",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        tag: "flap_harvest",
      },
      {
        id: "m3",
        localUri: "opus-media:3",
        mimeType: "image/png",
        createdAt: "2026-03-09T01:00:00Z",
        tag: "diagram",
      },
    ];

    const attachments = operativeMediaToAttachments(media);

    expect(attachments).toHaveLength(3);
    expect(attachments[0]?.id).toBe("m1");
    expect(attachments[1]?.id).toBe("m2");
    expect(attachments[1]?.tag).toBe("flap_harvest");
    expect(attachments[2]?.id).toBe("m3");
  });

  it("handles items without optional fields", () => {
    const media: OperativeMediaItem[] = [
      {
        id: "m1",
        localUri: "opus-media:1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        tag: "other",
      },
    ];

    const attachments = operativeMediaToAttachments(media);

    expect(attachments[0]?.caption).toBeUndefined();
    expect(attachments[0]?.thumbnailUri).toBeUndefined();
    expect(attachments[0]?.timestamp).toBeUndefined();
  });
});

// ===============================================================
// attachmentsToOperativeMedia
// ===============================================================

describe("attachmentsToOperativeMedia", () => {
  it("maps attachment with tag to operative media", () => {
    const attachments: MediaAttachment[] = [
      {
        id: "a1",
        localUri: "opus-media:1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        tag: "flap_harvest",
      },
    ];

    const media = attachmentsToOperativeMedia(attachments);

    expect(media[0]?.tag).toBe("flap_harvest");
  });

  it("maps attachment without tag to other", () => {
    const attachments: MediaAttachment[] = [
      {
        id: "a1",
        localUri: "opus-media:2",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
      },
    ];

    const media = attachmentsToOperativeMedia(attachments);

    expect(media[0]?.tag).toBe("other");
  });

  it("returns empty array for empty input", () => {
    expect(attachmentsToOperativeMedia([])).toEqual([]);
  });

  it("preserves all fields through mapping", () => {
    const attachments: MediaAttachment[] = [
      {
        id: "a1",
        localUri: "opus-media:1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        caption: "Test caption",
        thumbnailUri: "opus-media:1-thumb",
        timestamp: "2026-03-09T14:00:00Z",
        tag: "anastomosis",
      },
    ];

    const media = attachmentsToOperativeMedia(attachments);

    expect(media[0]?.id).toBe("a1");
    expect(media[0]?.localUri).toBe("opus-media:1");
    expect(media[0]?.mimeType).toBe("image/jpeg");
    expect(media[0]?.createdAt).toBe("2026-03-09T00:00:00Z");
    expect(media[0]?.caption).toBe("Test caption");
    expect(media[0]?.thumbnailUri).toBe("opus-media:1-thumb");
    expect(media[0]?.timestamp).toBe("2026-03-09T14:00:00Z");
    expect(media[0]?.tag).toBe("anastomosis");
  });

  it("maps multiple items preserving order", () => {
    const attachments: MediaAttachment[] = [
      {
        id: "a1",
        localUri: "opus-media:1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-08T00:00:00Z",
        tag: "preop_clinical",
      },
      {
        id: "a2",
        localUri: "opus-media:2",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        tag: "intraop",
      },
    ];

    const media = attachmentsToOperativeMedia(attachments);

    expect(media).toHaveLength(2);
    expect(media[0]?.id).toBe("a1");
    expect(media[1]?.id).toBe("a2");
  });
});

// ===============================================================
// Roundtrip integrity
// ===============================================================

describe("roundtrip mapping", () => {
  it("media -> attachments -> media preserves core fields", () => {
    const original: OperativeMediaItem[] = [
      {
        id: "rt1",
        localUri: "opus-media:rt1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        tag: "flap_inset",
        caption: "Inset complete",
        timestamp: "2026-03-09T14:30:00Z",
      },
    ];

    const attachments = operativeMediaToAttachments(original);
    const roundtripped = attachmentsToOperativeMedia(attachments);

    expect(roundtripped[0]?.id).toBe(original[0]!.id);
    expect(roundtripped[0]?.localUri).toBe(original[0]!.localUri);
    expect(roundtripped[0]?.mimeType).toBe(original[0]!.mimeType);
    expect(roundtripped[0]?.tag).toBe(original[0]!.tag);
    expect(roundtripped[0]?.caption).toBe(original[0]!.caption);
    expect(roundtripped[0]?.timestamp).toBe(original[0]!.timestamp);
    expect(roundtripped[0]?.createdAt).toBe(original[0]!.createdAt);
  });

  it("roundtrip preserves all items in multi-item array", () => {
    const original: OperativeMediaItem[] = [
      {
        id: "rt1",
        localUri: "opus-media:rt1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-08T00:00:00Z",
        tag: "preop_clinical",
      },
      {
        id: "rt2",
        localUri: "opus-media:rt2",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        tag: "xray_preop",
      },
      {
        id: "rt3",
        localUri: "opus-media:rt3",
        mimeType: "image/png",
        createdAt: "2026-03-09T01:00:00Z",
        tag: "diagram",
      },
    ];

    const attachments = operativeMediaToAttachments(original);
    const roundtripped = attachmentsToOperativeMedia(attachments);

    expect(roundtripped).toHaveLength(3);
    for (let i = 0; i < original.length; i++) {
      expect(roundtripped[i]?.id).toBe(original[i]!.id);
      expect(roundtripped[i]?.tag).toBe(original[i]!.tag);
    }
  });

  it("roundtrip for empty array", () => {
    const roundtripped = attachmentsToOperativeMedia(
      operativeMediaToAttachments([]),
    );
    expect(roundtripped).toEqual([]);
  });
});

describe("resolved display tag behaviour", () => {
  it("prefers the specific tag label over other", () => {
    const item: OperativeMediaItem = {
      id: "media-display",
      localUri: "opus-media:display",
      mimeType: "image/jpeg",
      createdAt: "2026-03-09T00:00:00Z",
      tag: "flap_perfusion",
    };

    const resolved = resolveMediaTag(item);
    expect(resolved).toBe("flap_perfusion");
    expect(MEDIA_TAG_REGISTRY[resolved].label).toBe("Perfusion check");
  });
});
