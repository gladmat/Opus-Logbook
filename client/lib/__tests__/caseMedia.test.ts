import { describe, it, expect } from "vitest";
import { getAllCaseMediaItems, findCaseMediaIndexById } from "@/lib/caseMedia";
import type {
  OperativeMediaItem,
  MediaAttachment,
  TimelineEvent,
} from "@/types/case";

function opMedia(id: string): OperativeMediaItem {
  return {
    id,
    localUri: `opus-media:${id}`,
    mimeType: "image/jpeg",
    createdAt: "2026-05-01T12:00:00.000Z",
  };
}

function attachment(id: string): MediaAttachment {
  return {
    id,
    localUri: `opus-media:${id}`,
    mimeType: "image/jpeg",
    createdAt: "2026-05-02T12:00:00.000Z",
  };
}

function event(id: string, media: MediaAttachment[]): TimelineEvent {
  return {
    id,
    caseId: "case-1",
    eventType: "note",
    note: "",
    createdAt: "2026-05-02T12:00:00.000Z",
    mediaAttachments: media,
  } as TimelineEvent;
}

describe("getAllCaseMediaItems", () => {
  it("returns [] when there is no media", () => {
    expect(getAllCaseMediaItems(undefined, undefined)).toEqual([]);
    expect(getAllCaseMediaItems([], [])).toEqual([]);
  });

  it("lists operative media first, then timeline-event media in event order", () => {
    const operative = [opMedia("op1"), opMedia("op2")];
    const events = [
      event("e1", [attachment("a1"), attachment("a2")]),
      event("e2", [attachment("a3")]),
    ];
    const ids = getAllCaseMediaItems(operative, events).map((m) => m.id);
    expect(ids).toEqual(["op1", "op2", "a1", "a2", "a3"]);
  });

  it("skips events with no media", () => {
    const events = [event("e1", []), event("e2", [attachment("a1")])];
    expect(getAllCaseMediaItems(undefined, events).map((m) => m.id)).toEqual([
      "a1",
    ]);
  });

  it("works with only timeline media (no operative media)", () => {
    const events = [event("e1", [attachment("a1"), attachment("a2")])];
    expect(getAllCaseMediaItems(undefined, events)).toHaveLength(2);
  });
});

describe("findCaseMediaIndexById", () => {
  const items = getAllCaseMediaItems(
    [opMedia("op1")],
    [event("e1", [attachment("a1"), attachment("a2")])],
  );

  it("finds the global index of a tapped item", () => {
    expect(findCaseMediaIndexById(items, "op1")).toBe(0);
    expect(findCaseMediaIndexById(items, "a1")).toBe(1);
    expect(findCaseMediaIndexById(items, "a2")).toBe(2);
  });

  it("falls back to 0 when the id is missing", () => {
    expect(findCaseMediaIndexById(items, "nope")).toBe(0);
  });
});
