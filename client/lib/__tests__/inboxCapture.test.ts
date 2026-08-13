import { describe, expect, it } from "vitest";

import {
  buildCapturedOperativeMediaItem,
  buildOperativeMediaItemFromInboxItem,
  resolveCapturedMediaTag,
} from "@/lib/inboxCapture";
import type { InboxItem } from "@/types/inbox";

function makeInboxItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "inbox-1",
    localUri: "opus-media:abc",
    mimeType: "image/jpeg",
    capturedAt: "2026-08-01T03:20:00.000Z",
    source: "quick_snap",
    status: "unassigned",
    ...overrides,
  } as InboxItem;
}

describe("buildOperativeMediaItemFromInboxItem", () => {
  it("carries capturedAt on BOTH timestamp and createdAt", () => {
    const item = makeInboxItem();
    const result = buildOperativeMediaItemFromInboxItem(item);
    expect(result.timestamp).toBe("2026-08-01T03:20:00.000Z");
    expect(result.createdAt).toBe("2026-08-01T03:20:00.000Z");
  });

  it("keeps id / uri / mime and links back to the inbox item", () => {
    const item = makeInboxItem({ id: "xyz", localUri: "opus-media:zzz" });
    const result = buildOperativeMediaItemFromInboxItem(item);
    expect(result.id).toBe("xyz");
    expect(result.localUri).toBe("opus-media:zzz");
    expect(result.sourceInboxId).toBe("xyz");
  });
});

describe("buildCapturedOperativeMediaItem", () => {
  it("carries capturedAt on BOTH timestamp and createdAt", () => {
    const result = buildCapturedOperativeMediaItem({
      id: "m1",
      localUri: "opus-media:abc",
      mimeType: "image/jpeg",
      capturedAt: "2026-07-20T21:00:00.000Z",
      procedureDate: "2026-07-20",
    });
    expect(result.timestamp).toBe("2026-07-20T21:00:00.000Z");
    expect(result.createdAt).toBe("2026-07-20T21:00:00.000Z");
  });

  it("resolves a temporal tag from the procedure date and capture instant", () => {
    const result = buildCapturedOperativeMediaItem({
      id: "m2",
      localUri: "opus-media:def",
      mimeType: "image/jpeg",
      capturedAt: "2026-07-25T02:00:00.000Z",
      procedureDate: "2026-07-20",
    });
    expect(result.tag).toBe("postop_early");
  });
});

describe("resolveCapturedMediaTag", () => {
  it("falls back to 'other' without protocol or procedure date", () => {
    expect(
      resolveCapturedMediaTag({ capturedAt: "2026-08-01T00:00:00.000Z" }),
    ).toBe("other");
  });
});
