import { describe, expect, it } from "vitest";

import { toUtcNoonIsoTimestamp } from "@/lib/dateValues";
import { buildDefaultMediaAttachment } from "@/lib/mediaAttachmentDefaults";

describe("buildDefaultMediaAttachment", () => {
  const savedMedia = {
    localUri: "opus-media:test",
    mimeType: "image/jpeg",
  };

  it("builds discharge-photo defaults for capture flows", () => {
    const attachment = buildDefaultMediaAttachment({
      id: "capture-1",
      savedMedia,
      createdAt: "2026-03-10T08:00:00.000Z",
      eventType: "discharge_photo",
      procedureDate: "2026-03-01",
      mediaDate: "2026-03-10",
    });

    expect(attachment).toMatchObject({
      id: "capture-1",
      localUri: "opus-media:test",
      tag: "discharge",
      category: "discharge_wound",
      timestamp: toUtcNoonIsoTimestamp("2026-03-10"),
    });
  });

  it("builds imaging defaults for media-manager imports", () => {
    const attachment = buildDefaultMediaAttachment({
      id: "manager-1",
      savedMedia,
      createdAt: "2026-03-10T08:00:00.000Z",
      eventType: "imaging",
      procedureDate: "2026-03-01",
      mediaDate: "2026-03-20",
    });

    expect(attachment.tag).toBe("xray_followup");
    expect(attachment.category).toBeUndefined();
    expect(attachment.timestamp).toBe(toUtcNoonIsoTimestamp("2026-03-20"));
  });

  it("uses temporal follow-up defaults when event date is provided as a Date", () => {
    const attachment = buildDefaultMediaAttachment({
      id: "followup-1",
      savedMedia,
      createdAt: "2026-03-10T08:00:00.000Z",
      eventType: "follow_up_visit",
      procedureDate: "2026-01-01",
      mediaDate: new Date("2026-04-15T09:00:00.000Z"),
    });

    expect(attachment.tag).toBe("followup_3m");
    expect(attachment.timestamp).toBe(toUtcNoonIsoTimestamp("2026-04-15"));
  });

  it("falls back to temporal photo defaults when no event type is supplied", () => {
    const attachment = buildDefaultMediaAttachment({
      id: "photo-1",
      savedMedia,
      createdAt: "2026-03-10T08:00:00.000Z",
      procedureDate: "2026-03-10",
      mediaDate: "2026-03-10",
    });

    expect(attachment.tag).toBe("intraop");
    expect(attachment.category).toBe("immediate_postop");
  });
});
