import { describe, it, expect, vi } from "vitest";

vi.mock("expo-crypto", () => ({
  getRandomBytesAsync: vi.fn(async (length: number) =>
    Uint8Array.from({ length }, (_, i) => (i * 37 + 11) & 0xff),
  ),
}));

const {
  generateCommitmentNonce,
  computeCommitment,
  verifyCommitment,
  buildRevealPayload,
  parseRevealPayload,
} = await import("../assessmentCommitment");

const SHAREABLE = JSON.stringify({
  entrustmentRating: 4,
  narrativeFeedback: "Solid anastomosis technique",
});

describe("assessment commitment", () => {
  it("round-trips: commit then verify the exact serialized string", async () => {
    const nonce = await generateCommitmentNonce();
    const commitment = computeCommitment(SHAREABLE, nonce);

    expect(commitment).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyCommitment(SHAREABLE, nonce, commitment)).toBe(true);
  });

  it("detects post-commit content tampering", async () => {
    const nonce = await generateCommitmentNonce();
    const commitment = computeCommitment(SHAREABLE, nonce);

    const tampered = JSON.stringify({
      entrustmentRating: 5,
      narrativeFeedback: "Solid anastomosis technique",
    });
    expect(verifyCommitment(tampered, nonce, commitment)).toBe(false);
  });

  it("detects a swapped nonce", async () => {
    const nonce = await generateCommitmentNonce();
    const commitment = computeCommitment(SHAREABLE, nonce);
    expect(verifyCommitment(SHAREABLE, "ab".repeat(24), commitment)).toBe(
      false,
    );
  });

  it("reveal payload carries the exact string + nonce and parses back", async () => {
    const nonce = await generateCommitmentNonce();
    const wire = buildRevealPayload(SHAREABLE, nonce);

    const parsed = parseRevealPayload(wire);
    expect(parsed.shareableJson).toBe(SHAREABLE);
    expect(parsed.commitmentNonce).toBe(nonce);

    // End-to-end: recipient recomputes the commitment from the wire payload.
    const commitment = computeCommitment(SHAREABLE, nonce);
    expect(
      verifyCommitment(
        parsed.shareableJson,
        parsed.commitmentNonce!,
        commitment,
      ),
    ).toBe(true);
  });

  it("treats legacy plain-assessment JSON as a payload without a nonce", () => {
    const parsed = parseRevealPayload(SHAREABLE);
    expect(parsed.shareableJson).toBe(SHAREABLE);
    expect(parsed.commitmentNonce).toBeNull();
  });

  it("treats non-JSON plaintext as legacy too", () => {
    const parsed = parseRevealPayload("not json");
    expect(parsed.shareableJson).toBe("not json");
    expect(parsed.commitmentNonce).toBeNull();
  });
});
