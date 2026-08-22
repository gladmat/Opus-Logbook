import { describe, it, expect } from "vitest";
import { resolveEpaEntryState } from "../epaGate";
import type { RecipientEpaView } from "../epaFromBlob";
import type { EpaAssessmentTarget, EpaExposureRecord } from "../epaDerivation";

const TARGET = {
  version: 3,
  supervisorContactId: "self",
  supervisorDisplayName: "You",
  supervisorLinkedUserId: "u-s",
  supervisorTier: 5,
  traineeContactId: "c-t",
  traineeDisplayName: "T",
  traineeLinkedUserId: "u-t",
  traineeTier: 3,
  units: [],
} as EpaAssessmentTarget;

const EXPOSURE = {
  version: 3,
  participantContactId: "c-t",
  participantDisplayName: "T",
  participantLinkedUserId: "u-t",
  participantTier: 3,
  units: [],
} as EpaExposureRecord;

function view(overrides: Partial<RecipientEpaView>): RecipientEpaView {
  return {
    targets: [],
    exposures: [],
    myTarget: null,
    myRole: null,
    myExposure: null,
    ...overrides,
  };
}

describe("resolveEpaEntryState", () => {
  it("committed work is never hidden (myCommitted → assess), even when exposure-only", () => {
    expect(
      resolveEpaEntryState({
        view: view({ myExposure: EXPOSURE, reason: "viewer-exposure-only" }),
        counterpartCommitted: false,
        myCommitted: true,
      }),
    ).toBe("assess");
  });

  it("a derived pair → assess", () => {
    expect(
      resolveEpaEntryState({
        view: view({ myTarget: TARGET, myRole: "supervisor" }),
        counterpartCommitted: false,
        myCommitted: false,
      }),
    ).toBe("assess");
  });

  it("counterpart already committed → assess (version-skew rescue) even when the viewer is exposure-only", () => {
    expect(
      resolveEpaEntryState({
        view: view({ myExposure: EXPOSURE, reason: "viewer-exposure-only" }),
        counterpartCommitted: true,
        myCommitted: false,
      }),
    ).toBe("assess");
  });

  it("exposure-only viewer with nothing committed → exposure-only", () => {
    expect(
      resolveEpaEntryState({
        view: view({ myExposure: EXPOSURE, reason: "viewer-exposure-only" }),
        counterpartCommitted: false,
        myCommitted: false,
      }),
    ).toBe("exposure-only");
  });

  it("no view / legacy blob without ownerParticipant → legacy-fallback (heuristic CTA)", () => {
    expect(
      resolveEpaEntryState({
        view: null,
        counterpartCommitted: false,
        myCommitted: false,
      }),
    ).toBe("legacy-fallback");
    expect(
      resolveEpaEntryState({
        view: view({ reason: "no-owner-participant" }),
        counterpartCommitted: false,
        myCommitted: false,
      }),
    ).toBe("legacy-fallback");
  });

  it("derivable pairs exist but none involve the viewer → none", () => {
    expect(
      resolveEpaEntryState({
        view: view({ targets: [TARGET], reason: "viewer-not-paired" }),
        counterpartCommitted: false,
        myCommitted: false,
      }),
    ).toBe("none");
    expect(
      resolveEpaEntryState({
        view: view({ reason: "no-procedures" }),
        counterpartCommitted: false,
        myCommitted: false,
      }),
    ).toBe("none");
  });
});
