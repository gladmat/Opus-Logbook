import { describe, expect, it } from "vitest";

import {
  restoreDraftOperativeMedia,
  restoreDraftProcedureDate,
  serializeDraftOperativeMedia,
} from "@/lib/caseDraftFields";
import type { OperativeMediaItem } from "@/types/case";

describe("case draft persistence", () => {
  it("preserves operative media and historical procedure dates in drafts", () => {
    const operativeMedia: OperativeMediaItem[] = [
      {
        id: "media-1",
        localUri: "encrypted-media:media-1",
        mimeType: "image/jpeg",
        mediaType: "intraoperative_photo",
        createdAt: "2026-03-09T00:00:00Z",
        caption: "Inset",
      },
    ];

    const serializedMedia = serializeDraftOperativeMedia(operativeMedia);
    const restoredDate = restoreDraftProcedureDate("1988-06-14T09:00:00.000Z");
    const restoredMedia = restoreDraftOperativeMedia(serializedMedia);

    expect(restoredDate).toBe("1988-06-14");
    expect(serializedMedia).toHaveLength(1);
    expect(restoredMedia).toEqual(operativeMedia);
  });
});
