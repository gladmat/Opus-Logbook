import { getApiUrl } from "./query-client";
import { getAuthToken } from "./auth";
import type { SharedCaseInboxEntry, UserSearchResult } from "@/types/sharing";

// ── Internal fetch helper ────────────────────────────────────────────────────

async function sharingFetch(
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

// ── User search ──────────────────────────────────────────────────────────────

export async function searchUserByEmail(
  email: string,
): Promise<UserSearchResult | null> {
  const res = await sharingFetch(
    `/api/users/search?email=${encodeURIComponent(email)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Search failed (${res.status})`,
    );
  }
  return res.json();
}

// ── Case sharing ─────────────────────────────────────────────────────────────

export interface ShareCaseParams {
  caseId: string;
  encryptedShareableBlob: string;
  recipients: {
    userId: string;
    role: string;
    keyEnvelopes: { deviceId: string; envelopeJson: string }[];
  }[];
}

export async function shareCase(
  params: ShareCaseParams,
): Promise<{ sharedCaseIds: string[] }> {
  const res = await sharingFetch("/api/share", {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Share failed (${res.status})`,
    );
  }
  return res.json();
}

// ── Shared inbox / outbox ────────────────────────────────────────────────────

export async function getSharedInbox(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<SharedCaseInboxEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  const res = await sharingFetch(`/api/shared/inbox${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Inbox fetch failed (${res.status})`,
    );
  }
  return res.json();
}

export async function getSharedCaseDetail(id: string): Promise<{
  encryptedShareableBlob: string;
  keyEnvelopes: { recipientDeviceId: string; envelopeJson: string }[];
  blobVersion: number;
  recipientRole: string;
  verificationStatus: string;
}> {
  const res = await sharingFetch(`/api/shared/inbox/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Shared case fetch failed (${res.status})`,
    );
  }
  return res.json();
}

export async function getSharedOutbox(): Promise<SharedCaseInboxEntry[]> {
  const res = await sharingFetch("/api/shared/outbox");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Outbox fetch failed (${res.status})`,
    );
  }
  return res.json();
}

// ── Verification ─────────────────────────────────────────────────────────────

export async function verifySharedCase(
  id: string,
  status: "verified" | "disputed",
  note?: string,
): Promise<void> {
  const res = await sharingFetch(`/api/shared/${id}/verify`, {
    method: "PUT",
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Verification failed (${res.status})`,
    );
  }
}

// ── Revoke ───────────────────────────────────────────────────────────────────

export async function revokeSharedCase(id: string): Promise<void> {
  const res = await sharingFetch(`/api/shared/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Revoke failed (${res.status})`,
    );
  }
}

// ── Push token registration ──────────────────────────────────────────────────

export async function registerPushTokenOnServer(
  expoPushToken: string,
  deviceId: string,
): Promise<void> {
  const res = await sharingFetch("/api/push-tokens", {
    method: "POST",
    body: JSON.stringify({
      expoPushToken,
      deviceId,
      platform: "ios",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Push token registration failed (${res.status})`,
    );
  }
}
