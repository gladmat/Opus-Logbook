import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AssessmentStatusResponse } from "../assessmentApi";

vi.mock("expo-crypto", () => ({
  getRandomBytesAsync: vi.fn(async (length: number) =>
    Uint8Array.from({ length }, (_, i) => (i * 29 + 7) & 0xff),
  ),
}));

const getAssessmentStatus = vi.fn();
const revealAssessment = vi.fn();
vi.mock("../assessmentApi", () => ({
  getAssessmentStatus: (...args: unknown[]) => getAssessmentStatus(...args),
  revealAssessment: (...args: unknown[]) => revealAssessment(...args),
}));

const getPendingCommit = vi.fn();
const clearPendingCommit = vi.fn();
vi.mock("../assessmentStorage", () => ({
  getPendingCommit: (...args: unknown[]) => getPendingCommit(...args),
  clearPendingCommit: (...args: unknown[]) => clearPendingCommit(...args),
}));

vi.mock("../e2ee", () => ({
  generateCaseKeyHex: vi.fn(async () => "aa".repeat(32)),
  encryptPayloadWithCaseKey: vi.fn(
    async (plaintext: string) => `enc:v1:nonce:${plaintext.length}`,
  ),
  wrapCaseKeyForRecipient: vi.fn(async () => ({ wrapped: true })),
}));

const verifyAndPinRecipientKeys = vi.fn();
vi.mock("../keyPinningStore", () => ({
  verifyAndPinRecipientKeys: (...args: unknown[]) =>
    verifyAndPinRecipientKeys(...args),
}));

const { uploadPendingReveal } = await import("../assessmentReveal");

const PENDING = {
  sharedCaseId: "case-1",
  assessmentId: "assess-1",
  assessorRole: "supervisor" as const,
  shareableJson: '{"entrustmentRating":4}',
  nonceHex: "ab".repeat(24),
  commitment: "cd".repeat(32),
};

function status(
  overrides: Partial<AssessmentStatusResponse>,
): AssessmentStatusResponse {
  return {
    myAssessment: {
      id: "assess-1",
      assessorRole: "supervisor",
      submittedAt: new Date().toISOString(),
      revealedAt: null,
      committedAt: new Date().toISOString(),
      hasContent: false,
    },
    otherAssessment: null,
    ownerUserId: "me",
    recipientUserId: "them",
    otherPartyPublicKeys: [{ deviceId: "dev-t", publicKey: "pk-them" }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  verifyAndPinRecipientKeys.mockResolvedValue({
    kind: "ok",
    keys: [{ deviceId: "dev-t", publicKey: "pk-them" }],
    pinnedNew: 0,
  });
});

describe("uploadPendingReveal", () => {
  it("returns none when there is no pending commit", async () => {
    getPendingCommit.mockResolvedValue(null);
    expect(await uploadPendingReveal("case-1", "me")).toBe("none");
    expect(getAssessmentStatus).not.toHaveBeenCalled();
  });

  it("waits while the counterpart has not committed (within 72h)", async () => {
    getPendingCommit.mockResolvedValue(PENDING);
    getAssessmentStatus.mockResolvedValue(status({ otherAssessment: null }));

    expect(await uploadPendingReveal("case-1", "me")).toBe("waiting");
    expect(revealAssessment).not.toHaveBeenCalled();
  });

  it("uploads once the counterpart committed, wrapping to TOFU-verified keys", async () => {
    getPendingCommit.mockResolvedValue(PENDING);
    getAssessmentStatus.mockResolvedValue(
      status({
        otherAssessment: {
          id: "assess-2",
          assessorRole: "trainee",
          submittedAt: new Date().toISOString(),
          revealedAt: null,
          committedAt: new Date().toISOString(),
          hasContent: false,
          keyEnvelopes: [],
        },
      }),
    );
    revealAssessment.mockResolvedValue({ id: "assess-1", revealed: true });

    expect(await uploadPendingReveal("case-1", "me")).toBe("revealed");

    expect(verifyAndPinRecipientKeys).toHaveBeenCalledWith("them", [
      { deviceId: "dev-t", publicKey: "pk-them" },
    ]);
    expect(revealAssessment).toHaveBeenCalledWith(
      "assess-1",
      expect.objectContaining({
        encryptedAssessment: expect.stringMatching(/^enc:v1:/),
        keyEnvelopes: [
          expect.objectContaining({
            recipientUserId: "them",
            recipientDeviceId: "dev-t",
          }),
        ],
      }),
    );
    expect(clearPendingCommit).toHaveBeenCalledWith("case-1");
  });

  it("refuses to upload on a TOFU key mismatch", async () => {
    getPendingCommit.mockResolvedValue(PENDING);
    getAssessmentStatus.mockResolvedValue(
      status({
        otherAssessment: {
          id: "assess-2",
          assessorRole: "trainee",
          submittedAt: new Date().toISOString(),
          revealedAt: null,
          committedAt: new Date().toISOString(),
          hasContent: false,
          keyEnvelopes: [],
        },
      }),
    );
    verifyAndPinRecipientKeys.mockResolvedValue({
      kind: "mismatch",
      mismatches: [
        {
          deviceId: "dev-t",
          storedPublicKey: "pk-old",
          receivedPublicKey: "pk-them",
        },
      ],
    });

    expect(await uploadPendingReveal("case-1", "me")).toBe("key-mismatch");
    expect(revealAssessment).not.toHaveBeenCalled();
    expect(clearPendingCommit).not.toHaveBeenCalled();
  });

  it("clears pending state when content was already uploaded elsewhere", async () => {
    getPendingCommit.mockResolvedValue(PENDING);
    getAssessmentStatus.mockResolvedValue(
      status({
        myAssessment: {
          id: "assess-1",
          assessorRole: "supervisor",
          submittedAt: new Date().toISOString(),
          revealedAt: new Date().toISOString(),
          committedAt: new Date().toISOString(),
          hasContent: true,
        },
      }),
    );

    expect(await uploadPendingReveal("case-1", "me")).toBe("revealed");
    expect(clearPendingCommit).toHaveBeenCalledWith("case-1");
    expect(revealAssessment).not.toHaveBeenCalled();
  });

  it("uploads after 72h even without counterpart engagement", async () => {
    getPendingCommit.mockResolvedValue(PENDING);
    const old = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
    getAssessmentStatus.mockResolvedValue(
      status({
        myAssessment: {
          id: "assess-1",
          assessorRole: "supervisor",
          submittedAt: old,
          revealedAt: null,
          committedAt: old,
          hasContent: false,
        },
        otherAssessment: null,
      }),
    );
    revealAssessment.mockResolvedValue({ id: "assess-1", revealed: true });

    expect(await uploadPendingReveal("case-1", "me")).toBe("revealed");
  });
});
