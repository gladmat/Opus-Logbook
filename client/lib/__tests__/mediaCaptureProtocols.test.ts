import { describe, expect, it } from "vitest";

import {
  ALL_PROTOCOLS,
  findProtocols,
  findProtocol,
  mergeProtocols,
  FREE_FLAP_PROTOCOL,
  SKIN_CANCER_EXCISION_PROTOCOL,
  AESTHETIC_FACE_PROTOCOL,
  AESTHETIC_RHINOPLASTY_PROTOCOL,
  AESTHETIC_BREAST_PROTOCOL,
  AESTHETIC_BODY_PROTOCOL,
  HAND_SURGERY_PROTOCOL,
} from "@/data/mediaCaptureProtocols";
import { MEDIA_TAG_REGISTRY } from "@/types/media";

// ═══════════════════════════════════════════════════════════
// Registry integrity
// ═══════════════════════════════════════════════════════════

describe("protocol registry integrity", () => {
  it("all protocol steps use valid MediaTags", () => {
    for (const protocol of ALL_PROTOCOLS) {
      for (const step of protocol.steps) {
        expect(
          step.tag in MEDIA_TAG_REGISTRY,
          `Protocol "${protocol.id}" step "${step.label}" uses invalid tag: ${step.tag}`,
        ).toBe(true);
      }
    }
  });

  it("all protocols have unique IDs", () => {
    const ids = ALL_PROTOCOLS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all protocols have non-empty steps", () => {
    for (const protocol of ALL_PROTOCOLS) {
      expect(protocol.steps.length).toBeGreaterThan(0);
    }
  });

  it("all protocols have labels and descriptions", () => {
    for (const protocol of ALL_PROTOCOLS) {
      expect(protocol.label.length).toBeGreaterThan(0);
      expect(protocol.description.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// findProtocols
// ═══════════════════════════════════════════════════════════

describe("findProtocols", () => {
  it("returns free flap protocol for microsurgery procedureTag", () => {
    const protocols = findProtocols({
      procedureTags: ["free_flap"],
    });
    expect(protocols).toContain(FREE_FLAP_PROTOCOL);
  });

  it("returns skin cancer protocol for hasSkinCancerAssessment", () => {
    const protocols = findProtocols({
      hasSkinCancerAssessment: true,
    });
    expect(protocols).toContain(SKIN_CANCER_EXCISION_PROTOCOL);
  });

  it("returns skin cancer protocol for skin_cancer specialty", () => {
    const protocols = findProtocols({
      specialties: ["skin_cancer"],
    });
    expect(protocols).toContain(SKIN_CANCER_EXCISION_PROTOCOL);
  });

  it("returns aesthetic face protocol for aesthetics specialty", () => {
    const protocols = findProtocols({
      specialties: ["aesthetics"],
    });
    expect(protocols).toContain(AESTHETIC_FACE_PROTOCOL);
  });

  it("returns rhinoplasty protocol for rhinoplasty diagnosis", () => {
    const protocols = findProtocols({
      diagnosisPicklistIds: ["aes_rhinoplasty_open"],
    });
    expect(protocols).toContain(AESTHETIC_RHINOPLASTY_PROTOCOL);
  });

  it("returns breast protocol for breast specialty", () => {
    const protocols = findProtocols({
      specialties: ["breast"],
    });
    expect(protocols).toContain(AESTHETIC_BREAST_PROTOCOL);
  });

  it("returns body protocol for body_contouring specialty", () => {
    const protocols = findProtocols({
      specialties: ["body_contouring"],
    });
    expect(protocols).toContain(AESTHETIC_BODY_PROTOCOL);
  });

  it("returns hand protocol for hand_wrist specialty", () => {
    const protocols = findProtocols({
      specialties: ["hand_wrist"],
    });
    expect(protocols).toContain(HAND_SURGERY_PROTOCOL);
  });

  it("returns empty for specialties without protocols", () => {
    const protocols = findProtocols({
      specialties: ["burns"],
    });
    expect(protocols).toHaveLength(0);
  });

  it("returns multiple protocols for combined contexts", () => {
    const protocols = findProtocols({
      procedureTags: ["free_flap"],
      hasSkinCancerAssessment: true,
    });
    expect(protocols).toContain(FREE_FLAP_PROTOCOL);
    expect(protocols).toContain(SKIN_CANCER_EXCISION_PROTOCOL);
    expect(protocols.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty for empty context", () => {
    const protocols = findProtocols({});
    expect(protocols).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
// findProtocol (convenience)
// ═══════════════════════════════════════════════════════════

describe("findProtocol", () => {
  it("returns first match", () => {
    const protocol = findProtocol({
      procedureTags: ["free_flap"],
    });
    expect(protocol).toBe(FREE_FLAP_PROTOCOL);
  });

  it("returns undefined for no match", () => {
    const protocol = findProtocol({
      specialties: ["burns"],
    });
    expect(protocol).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// mergeProtocols
// ═══════════════════════════════════════════════════════════

describe("mergeProtocols", () => {
  it("returns empty for no protocols", () => {
    const result = mergeProtocols([]);
    expect(result.steps).toHaveLength(0);
    expect(result.label).toBe("");
  });

  it("returns single protocol unchanged", () => {
    const result = mergeProtocols([HAND_SURGERY_PROTOCOL]);
    expect(result.label).toBe(HAND_SURGERY_PROTOCOL.label);
    expect(result.steps.length).toBe(HAND_SURGERY_PROTOCOL.steps.length);
    expect(result.steps[0]?.sourceProtocolId).toBe(HAND_SURGERY_PROTOCOL.id);
  });

  it("deduplicates tags across protocols", () => {
    // Both skin cancer and free flap might share some tags — but even if they
    // don't, the merged total should be <= sum of individual steps
    const result = mergeProtocols([
      SKIN_CANCER_EXCISION_PROTOCOL,
      FREE_FLAP_PROTOCOL,
    ]);
    const totalUnmerged =
      SKIN_CANCER_EXCISION_PROTOCOL.steps.length +
      FREE_FLAP_PROTOCOL.steps.length;
    expect(result.steps.length).toBeLessThanOrEqual(totalUnmerged);

    // All tags should be unique
    const tags = result.steps.map((s) => s.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it("preserves per-protocol order", () => {
    const result = mergeProtocols([
      SKIN_CANCER_EXCISION_PROTOCOL,
      FREE_FLAP_PROTOCOL,
    ]);

    // All skin cancer steps should appear before free flap steps
    // (unless deduplicated away)
    const skinCancerSteps = result.steps.filter(
      (s) => s.sourceProtocolId === "skin_cancer_excision",
    );
    const flapSteps = result.steps.filter(
      (s) => s.sourceProtocolId === "free_flap",
    );

    if (skinCancerSteps.length > 0 && flapSteps.length > 0) {
      const lastSkinCancerIdx = result.steps.lastIndexOf(
        skinCancerSteps[skinCancerSteps.length - 1]!,
      );
      const firstFlapIdx = result.steps.indexOf(flapSteps[0]!);
      expect(lastSkinCancerIdx).toBeLessThan(firstFlapIdx);
    }
  });

  it("adds section labels on first step of each protocol", () => {
    const result = mergeProtocols([
      SKIN_CANCER_EXCISION_PROTOCOL,
      FREE_FLAP_PROTOCOL,
    ]);

    // First step of first protocol should have sectionLabel
    const firstSkinCancer = result.steps.find(
      (s) => s.sourceProtocolId === "skin_cancer_excision",
    );
    expect(firstSkinCancer?.sectionLabel).toBe(
      SKIN_CANCER_EXCISION_PROTOCOL.label,
    );

    // First step of second protocol should have sectionLabel
    const firstFlap = result.steps.find(
      (s) => s.sourceProtocolId === "free_flap",
    );
    expect(firstFlap?.sectionLabel).toBe(FREE_FLAP_PROTOCOL.label);
  });

  it("combines labels with + separator", () => {
    const result = mergeProtocols([
      SKIN_CANCER_EXCISION_PROTOCOL,
      FREE_FLAP_PROTOCOL,
    ]);
    expect(result.label).toContain("+");
    expect(result.label).toContain(SKIN_CANCER_EXCISION_PROTOCOL.label);
    expect(result.label).toContain(FREE_FLAP_PROTOCOL.label);
  });

  it("merges 3+ protocols with deduplication and section labels", () => {
    const result = mergeProtocols([
      FREE_FLAP_PROTOCOL,
      SKIN_CANCER_EXCISION_PROTOCOL,
      HAND_SURGERY_PROTOCOL,
    ]);

    // All tags should be unique after dedup
    const tags = result.steps.map((s) => s.tag);
    expect(new Set(tags).size).toBe(tags.length);

    // Total should be <= sum of all three
    const maxTotal =
      FREE_FLAP_PROTOCOL.steps.length +
      SKIN_CANCER_EXCISION_PROTOCOL.steps.length +
      HAND_SURGERY_PROTOCOL.steps.length;
    expect(result.steps.length).toBeLessThanOrEqual(maxTotal);
    expect(result.steps.length).toBeGreaterThan(0);

    // All three protocol IDs should appear
    const sourceIds = new Set(result.steps.map((s) => s.sourceProtocolId));
    expect(sourceIds.has("free_flap")).toBe(true);
    expect(sourceIds.has("skin_cancer_excision")).toBe(true);
    expect(sourceIds.has("hand_surgery")).toBe(true);

    // Label should contain all three
    expect(result.label).toContain(FREE_FLAP_PROTOCOL.label);
    expect(result.label).toContain(SKIN_CANCER_EXCISION_PROTOCOL.label);
    expect(result.label).toContain(HAND_SURGERY_PROTOCOL.label);
  });

  it("sectionLabel only appears on first step of each protocol", () => {
    const result = mergeProtocols([
      SKIN_CANCER_EXCISION_PROTOCOL,
      FREE_FLAP_PROTOCOL,
    ]);

    // Count how many steps per protocol have sectionLabel
    const skinCancerWithLabel = result.steps.filter(
      (s) =>
        s.sourceProtocolId === "skin_cancer_excision" && s.sectionLabel,
    );
    const flapWithLabel = result.steps.filter(
      (s) =>
        s.sourceProtocolId === "free_flap" && s.sectionLabel,
    );

    expect(skinCancerWithLabel).toHaveLength(1);
    expect(flapWithLabel).toHaveLength(1);
  });

  it("all merged steps have sourceProtocolId set", () => {
    const result = mergeProtocols([
      AESTHETIC_BREAST_PROTOCOL,
      AESTHETIC_BODY_PROTOCOL,
    ]);

    for (const step of result.steps) {
      expect(step.sourceProtocolId).toBeDefined();
      expect(step.sourceProtocolId!.length).toBeGreaterThan(0);
    }
  });

  it("step count is correct for single protocol after merge", () => {
    const result = mergeProtocols([FREE_FLAP_PROTOCOL]);
    expect(result.steps.length).toBe(FREE_FLAP_PROTOCOL.steps.length);
  });
});
