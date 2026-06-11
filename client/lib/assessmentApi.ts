import { getApiUrl } from "./query-client";
import { getAuthToken } from "./auth";

// ── Internal fetch helper ────────────────────────────────────────────────────

async function assessmentFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = getApiUrl();
  const token = await getAuthToken();

  return fetch(new URL(path, baseUrl).href, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface AssessmentStatusResponse {
  myAssessment: {
    id: string;
    assessorRole: string;
    submittedAt: string;
    revealedAt: string | null;
    /** Commit-reveal: when the hash commitment landed (null on legacy rows). */
    committedAt?: string | null;
    /** Whether the E2EE ciphertext has been uploaded yet. */
    hasContent?: boolean;
  } | null;
  otherAssessment: {
    id: string;
    assessorRole: string;
    submittedAt: string;
    revealedAt: string | null;
    committedAt?: string | null;
    hasContent?: boolean;
    /** Counterpart's commitment hash — verified on-device after decrypt. */
    commitment?: string | null;
    encryptedAssessment?: string;
    keyEnvelopes: { recipientDeviceId: string; envelopeJson: string }[];
  } | null;
  ownerUserId: string;
  recipientUserId: string;
  otherPartyPublicKeys: { deviceId: string; publicKey: string }[];
}

export interface AssessmentHistoryEntry {
  id: string;
  sharedCaseId: string;
  assessorRole: string;
  submittedAt: string;
  revealedAt: string;
}

// ── Submit assessment ────────────────────────────────────────────────────────

export async function submitAssessment(params: {
  sharedCaseId: string;
  assessorRole: "supervisor" | "trainee";
  encryptedAssessment: string;
  keyEnvelopes: {
    recipientUserId: string;
    recipientDeviceId: string;
    envelopeJson: string;
  }[];
}): Promise<{ id: string; revealed: boolean }> {
  const res = await assessmentFetch("/api/assessments", {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Assessment submit failed (${res.status})`,
    );
  }
  return res.json();
}

// ── Commit-reveal endpoints ──────────────────────────────────────────────────

/** Phase 1 — submit the hash commitment only. */
export async function commitAssessment(params: {
  sharedCaseId: string;
  assessorRole: "supervisor" | "trainee";
  commitment: string;
}): Promise<{ id: string; bothCommitted: boolean }> {
  const res = await assessmentFetch("/api/assessments/commit", {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Assessment commit failed (${res.status})`,
    );
  }
  return res.json();
}

/** Phase 2 — upload the E2EE ciphertext + envelopes for own commitment. */
export async function revealAssessment(
  assessmentId: string,
  params: {
    encryptedAssessment: string;
    keyEnvelopes: {
      recipientUserId: string;
      recipientDeviceId: string;
      envelopeJson: string;
    }[];
  },
): Promise<{ id: string; revealed: boolean }> {
  const res = await assessmentFetch(`/api/assessments/${assessmentId}/reveal`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Assessment reveal failed (${res.status})`,
    );
  }
  return res.json();
}

// ── Get assessment status ────────────────────────────────────────────────────

export async function getAssessmentStatus(
  sharedCaseId: string,
): Promise<AssessmentStatusResponse> {
  const res = await assessmentFetch(`/api/assessments/${sharedCaseId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Assessment status failed (${res.status})`,
    );
  }
  return res.json();
}

// ── Get assessment history ───────────────────────────────────────────────────

export async function getAssessmentHistory(params?: {
  role?: string;
  limit?: number;
  offset?: number;
}): Promise<AssessmentHistoryEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set("role", params.role);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  const res = await assessmentFetch(
    `/api/assessments/history${qs ? `?${qs}` : ""}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Assessment history failed (${res.status})`,
    );
  }
  return res.json();
}
