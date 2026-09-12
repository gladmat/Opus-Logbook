import { getApiUrl } from "./query-client";
import { getAuthToken } from "./auth";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { SharedCaseInboxEntry, UserSearchResult } from "@/types/sharing";
import { normalizePhoneE164, type PhoneRegion } from "@shared/phone";
import { buildRegistrationLookupKey } from "@shared/professionalRegistrations";

// ── Internal fetch helper ────────────────────────────────────────────────────

async function sharingFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = getApiUrl();
  const token = await getAuthToken();

  return fetchWithTimeout(new URL(path, baseUrl).href, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

// ── User search ──────────────────────────────────────────────────────────────

async function searchUser(query: string): Promise<UserSearchResult | null> {
  const res = await sharingFetch(`/api/users/search?${query}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Search failed (${res.status})`,
    );
  }
  return res.json();
}

export async function searchUserByEmail(
  email: string,
): Promise<UserSearchResult | null> {
  return searchUser(`email=${encodeURIComponent(email)}`);
}

/** `phone` should already be E.164 (the server re-normalises with the caller's region). */
export async function searchUserByPhone(
  phone: string,
): Promise<UserSearchResult | null> {
  return searchUser(`phone=${encodeURIComponent(phone)}`);
}

export async function searchUserByRegistration(
  jurisdiction: string,
  registrationNumber: string,
): Promise<UserSearchResult | null> {
  return searchUser(
    `registration=${encodeURIComponent(registrationNumber)}&jurisdiction=${encodeURIComponent(jurisdiction)}`,
  );
}

export interface ContactSearchIdentifiers {
  email?: string | null;
  phone?: string | null;
  registrationNumber?: string | null;
  registrationJurisdiction?: string | null;
}

/**
 * Look a contact up on Opus by whatever identifiers it carries, in the
 * server's own priority (email → phone → registration); first hit wins.
 * Skips identifiers that can't be normalised. Resolves null when nothing
 * matches — and without any request when there is nothing to search on.
 */
export async function searchUserForContact(
  contact: ContactSearchIdentifiers,
  region?: PhoneRegion,
): Promise<UserSearchResult | null> {
  const email = contact.email?.trim();
  if (email) {
    const hit = await searchUserByEmail(email);
    if (hit) return hit;
  }
  const e164 = contact.phone ? normalizePhoneE164(contact.phone, region) : null;
  if (e164) {
    const hit = await searchUserByPhone(e164);
    if (hit) return hit;
  }
  if (
    contact.registrationNumber &&
    contact.registrationJurisdiction &&
    buildRegistrationLookupKey(
      contact.registrationJurisdiction,
      contact.registrationNumber,
    )
  ) {
    return searchUserByRegistration(
      contact.registrationJurisdiction,
      contact.registrationNumber,
    );
  }
  return null;
}

// ── Case sharing ─────────────────────────────────────────────────────────────

export interface ShareCaseParams {
  caseId: string;
  encryptedShareableBlob: string;
  recipients: {
    userId: string;
    role: string;
    keyEnvelopes: { deviceId: string; envelopeJson: string }[];
    /** Client-derived: an assessable EPA pair (trainee as Primary Surgeon)
     *  exists between the owner and this recipient. Drives the server's
     *  share-time "EPA Assessment" push; absent → server tier heuristic. */
    epaEligible?: boolean;
  }[];
}

export async function shareCase(
  params: ShareCaseParams,
): Promise<{ sharedCases: { id: string; recipientUserId: string }[] }> {
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

// ── Blob update (edit-reshare) ───────────────────────────────────────────────

export interface UpdateSharedCaseBlobParams {
  encryptedShareableBlob: string;
  /** Must be strictly greater than the row's current blobVersion. */
  blobVersion: number;
  /** Fresh wrapped case keys for the recipient's current devices. */
  keyEnvelopes: { deviceId: string; envelopeJson: string }[];
}

/**
 * Update an existing share row in place: new blob + replaced envelopes,
 * verification reset to pending server-side. Keeps the share id stable so
 * attached assessments survive the edit. 409 = version conflict or row gone.
 */
export async function updateSharedCaseBlobApi(
  id: string,
  params: UpdateSharedCaseBlobParams,
): Promise<void> {
  const res = await sharingFetch(`/api/shared/${id}/blob`, {
    method: "PUT",
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Blob update failed (${res.status})`,
    );
  }
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
