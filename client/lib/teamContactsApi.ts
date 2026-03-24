/**
 * API helpers for team contacts CRUD operations.
 */

import { getAuthToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/query-client";
import type { TeamContact } from "@/types/teamContacts";

async function authFetch(
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

export async function getTeamContacts(
  facilityId?: string,
): Promise<TeamContact[]> {
  const query = facilityId ? `?facilityId=${facilityId}` : "";
  const res = await authFetch(`/api/team-contacts${query}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to load team contacts");
  }
  return res.json();
}

export async function getTeamContact(id: string): Promise<TeamContact> {
  const res = await authFetch(`/api/team-contacts/${id}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to load team contact");
  }
  return res.json();
}

export interface CreateTeamContactData {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  registrationNumber?: string | null;
  registrationJurisdiction?: string | null;
  careerStage?: string | null;
  defaultRole?: string | null;
  notes?: string | null;
  facilityIds?: string[];
}

export async function createTeamContact(
  data: CreateTeamContactData,
): Promise<TeamContact> {
  const res = await authFetch("/api/team-contacts", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create team contact");
  }
  return res.json();
}

export async function updateTeamContact(
  id: string,
  data: Partial<CreateTeamContactData>,
): Promise<TeamContact> {
  const res = await authFetch(`/api/team-contacts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update team contact");
  }
  return res.json();
}

export async function deleteTeamContact(id: string): Promise<void> {
  const res = await authFetch(`/api/team-contacts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete team contact");
  }
}

export async function linkContact(
  id: string,
  linkedUserId: string,
): Promise<TeamContact> {
  const res = await authFetch(`/api/team-contacts/${id}/link`, {
    method: "PUT",
    body: JSON.stringify({ linkedUserId }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to link contact");
  }
  return res.json();
}

export async function unlinkContact(id: string): Promise<TeamContact> {
  const res = await authFetch(`/api/team-contacts/${id}/unlink`, {
    method: "PUT",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to unlink contact");
  }
  return res.json();
}

export interface DiscoverContactInput {
  contactId: string;
  email?: string;
  phone?: string;
  registrationNumber?: string;
  registrationJurisdiction?: string;
}

export interface DiscoverMatch {
  contactId: string;
  userId: string;
  displayName: string | null;
  publicKeys: { deviceId: string; publicKey: string }[];
}

export async function discoverContacts(
  contacts: DiscoverContactInput[],
): Promise<DiscoverMatch[]> {
  const res = await authFetch("/api/users/discover", {
    method: "POST",
    body: JSON.stringify({ contacts }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to discover contacts");
  }
  const data = await res.json();
  return data.matches;
}

/**
 * Send an invitation email to an unlinked contact.
 */
export async function sendInvitation(
  contactId: string,
  email: string,
): Promise<{ success: boolean; invitedAt: string }> {
  const res = await authFetch("/api/invitations", {
    method: "POST",
    body: JSON.stringify({ contactId, email }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to send invitation");
  }
  return res.json();
}

/**
 * Fetch device public keys for a specific Opus user (for E2EE sharing).
 */
export async function getUserDeviceKeys(
  userId: string,
): Promise<{ deviceId: string; publicKey: string }[]> {
  const res = await authFetch(`/api/users/${userId}/keys`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to get user device keys");
  }
  const data = await res.json();
  return data.publicKeys ?? [];
}
