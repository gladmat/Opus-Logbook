import { describe, expect, it } from "vitest";

import {
  attachmentsToOperativeMedia,
  getLegacyCategoryForTag,
  operativeMediaToAttachments,
  TAG_TO_MEDIA_TYPE,
} from "@/lib/operativeMedia";
import type { MediaAttachment, OperativeMediaItem } from "@/types/case";
import { MEDIA_TAG_REGISTRY } from "@/types/media";
import type { MediaTag } from "@/types/media";
import { resolveMediaTag } from "@/lib/mediaTagMigration";

// ═══════════════════════════════════════════════════════════
// TAG_TO_MEDIA_TYPE completeness
// ═══════════════════════════════════════════════════════════

describe("TAG_TO_MEDIA_TYPE completeness", () => {
  it("covers all 64 MediaTags", () => {
    const registryTags = Object.keys(MEDIA_TAG_REGISTRY);
    expect(registryTags.length).toBe(64);
    for (const tag of registryTags) {
      expect(
        TAG_TO_MEDIA_TYPE[tag as MediaTag],
        `Missing TAG_TO_MEDIA_TYPE entry for: ${tag}`,
      ).toBeDefined();
    }
  });

  it("all values are valid OperativeMediaType values", () => {
    const validTypes = [
      "preoperative_photo",
      "intraoperative_photo",
      "xray",
      "ct_scan",
      "mri",
      "diagram",
      "document",
      "other",
    ];
    for (const [tag, mediaType] of Object.entries(TAG_TO_MEDIA_TYPE)) {
      expect(
        validTypes.includes(mediaType),
        `TAG_TO_MEDIA_TYPE[${tag}] = "${mediaType}" is not a valid OperativeMediaType`,
      ).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// operativeMediaToAttachments
// ═══════════════════════════════════════════════════════════

describe("operativeMediaToAttachments", () => {
  it("maps a single item with all fields", () => {
    const media: OperativeMediaItem[] = [
      {
        id: "media-1",
        localUri: "encrypted-media:1",
        mimeType: "image/jpeg",
        mediaType: "xray",
        createdAt: "2026-03-09T00:00:00Z",
        caption: "Pre-fixation",
        tag: "xray_preop",
        thumbnailUri: "encrypted-media:1-thumb",
        timestamp: "2026-03-09T12:00:00Z",
      },
    ];

    const attachments = operativeMediaToAttachments(media);

    expect(attachments).toEqual<MediaAttachment[]>([
      {
        id: "media-1",
        localUri: "encrypted-media:1",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        caption: "Pre-fixation",
        tag: "xray_preop",
        category: "preop_xray",
        thumbnailUri: "encrypted-media:1-thumb",
        timestamp: "2026-03-09T12:00:00Z",
      },
    ]);
  });

  it("resolves tag from mediaType when tag is missing", () => {
    const media: OperativeMediaItem[] = [
      {
        id: "media-2",
        localUri: "opus-media:2",
        mimeType: "image/jpeg",
        mediaType: "ct_scan",
        createdAt: "2026-03-09T00:00:00Z",
      },
    ];

    const attachments = operativeMediaToAttachments(media);

    expect(attachments[0]?.tag).toBe("ct_scan");
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
        mediaType: "preoperative_photo",
        createdAt: "2026-03-08T00:00:00Z",
      },
      {
        id: "m2",
        localUri: "opus-media:2",
        mimeType: "image/jpeg",
        mediaType: "intraoperative_photo",
        createdAt: "2026-03-09T00:00:00Z",
        tag: "flap_harvest",
      },
      {
        id: "m3",
        localUri: "opus-media:3",
        mimeType: "image/png",
        mediaType: "diagram",
        createdAt: "2026-03-09T01:00:00Z",
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
        mediaType: "other",
        createdAt: "2026-03-09T00:00:00Z",
      },
    ];

    const attachments = operativeMediaToAttachments(media);

    expect(attachments[0]?.caption).toBeUndefined();
    expect(attachments[0]?.thumbnailUri).toBeUndefined();
    expect(attachments[0]?.timestamp).toBeUndefined();
  });

  it("maps all 8 OperativeMediaType values", () => {
    const types = [
      "preoperative_photo",
      "intraoperative_photo",
      "xray",
      "ct_scan",
      "mri",
      "diagram",
      "document",
      "other",
    ] as const;

    for (const type of types) {
      const media: OperativeMediaItem[] = [
        {
          id: `m-${type}`,
          localUri: `opus-media:${type}`,
          mimeType: "image/jpeg",
          mediaType: type,
          createdAt: "2026-03-09T00:00:00Z",
        },
      ];

      const attachments = operativeMediaToAttachments(media);
      expect(attachments).toHaveLength(1);
      expect(attachments[0]?.tag).toBeDefined();
      expect(attachments[0]?.tag! in MEDIA_TAG_REGISTRY).toBe(true);
    }
  });

  it("derives legacy category from the specific tag when present", () => {
    const media: OperativeMediaItem[] = [
      {
        id: "precise",
        localUri: "opus-media:precise",
        mimeType: "image/jpeg",
        mediaType: "intraoperative_photo",
        createdAt: "2026-03-09T00:00:00Z",
        tag: "flap_harvest",
      },
    ];

    const attachments = operativeMediaToAttachments(media);
    expect(attachments[0]?.category).toBe("flap_harvest");
  });
});

// ═══════════════════════════════════════════════════════════
// attachmentsToOperativeMedia
// ═══════════════════════════════════════════════════════════

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

    expect(media[0]?.mediaType).toBe("intraoperative_photo");
    expect(media[0]?.tag).toBe("flap_harvest");
  });

  it("maps attachment with category (no tag) to operative media", () => {
    const attachments: MediaAttachment[] = [
      {
        id: "a1",
        localUri: "encrypted-media:2",
        mimeType: "image/jpeg",
        createdAt: "2026-03-09T00:00:00Z",
        category: "preop",
      },
    ];

    const media = attachmentsToOperativeMedia(attachments);

    expect(media[0]?.mediaType).toBe("preoperative_photo");
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
    expect(media[0]?.mediaType).toBe("intraoperative_photo");
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

// ═══════════════════════════════════════════════════════════
// Roundtrip integrity
// ═══════════════════════════════════════════════════════════

describe("roundtrip mapping", () => {
  it("media → attachments → media preserves core fields", () => {
    const original: OperativeMediaItem[] = [
      {
        id: "rt1",
        localUri: "opus-media:rt1",
        mimeType: "image/jpeg",
        mediaType: "intraoperative_photo",
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
        mediaType: "preoperative_photo",
        createdAt: "2026-03-08T00:00:00Z",
        tag: "preop_clinical",
      },
      {
        id: "rt2",
        localUri: "opus-media:rt2",
        mimeType: "image/jpeg",
        mediaType: "xray",
        createdAt: "2026-03-09T00:00:00Z",
        tag: "xray_preop",
      },
      {
        id: "rt3",
        localUri: "opus-media:rt3",
        mimeType: "image/png",
        mediaType: "diagram",
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
  it("prefers the specific tag label over the coarse legacy media type", () => {
    const item: OperativeMediaItem = {
      id: "media-display",
      localUri: "opus-media:display",
      mimeType: "image/jpeg",
      mediaType: "intraoperative_photo",
      createdAt: "2026-03-09T00:00:00Z",
      tag: "flap_perfusion",
    };

    const resolved = resolveMediaTag(item);
    expect(resolved).toBe("flap_perfusion");
    expect(MEDIA_TAG_REGISTRY[resolved].label).toBe("Perfusion check");
  });

  it("returns the expected legacy category for a tag when available", () => {
    expect(getLegacyCategoryForTag("xray_preop")).toBe("preop_xray");
    expect(getLegacyCategoryForTag("flap_perfusion")).toBeUndefined();
  });
});
