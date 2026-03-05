/**
 * Outcome sync utility — secondary server storage for flap outcomes (Part 8C).
 * Primary storage: local `CaseProcedure.clinicalDetails.flapOutcome` (encrypted, offline-capable).
 * Secondary: server `procedure_outcomes` table (for statistics aggregation).
 * Sync is fire-and-forget: failure is logged but does not block case save.
 */

import { getApiUrl } from "./query-client";
import { getAuthToken } from "./auth";
import type { FreeFlapOutcomeDetails } from "@/types/case";

async function authedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = getApiUrl();
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  return fetch(new URL(path, baseUrl).href, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

/**
 * Sync a single flap outcome to the server procedure_outcomes table.
 * Upserts: checks for existing outcome by caseProcedureId + type, creates or updates.
 * Non-blocking — caller should catch and log errors without propagating.
 */
export async function syncFlapOutcomeToServer(
  caseProcedureId: string,
  outcome: FreeFlapOutcomeDetails,
): Promise<void> {
  try {
    // Check for existing outcome
    const getRes = await authedFetch(
      `/api/procedure-outcomes/${caseProcedureId}`,
    );

    if (getRes.ok) {
      const existing = await getRes.json();
      const flapOutcome = existing.find(
        (o: { outcomeType: string }) => o.outcomeType === "free_flap",
      );

      if (flapOutcome) {
        // Update existing
        await authedFetch(`/api/procedure-outcomes/${flapOutcome.id}`, {
          method: "PUT",
          body: JSON.stringify({
            details: outcome,
            assessedAt: new Date().toISOString(),
          }),
        });
      } else {
        // Create new
        await authedFetch("/api/procedure-outcomes", {
          method: "POST",
          body: JSON.stringify({
            caseProcedureId,
            outcomeType: "free_flap",
            details: outcome,
            assessedAt: new Date().toISOString(),
          }),
        });
      }
    } else if (getRes.status === 404) {
      // No outcomes yet — create new
      await authedFetch("/api/procedure-outcomes", {
        method: "POST",
        body: JSON.stringify({
          caseProcedureId,
          outcomeType: "free_flap",
          details: outcome,
          assessedAt: new Date().toISOString(),
        }),
      });
    }
  } catch (err) {
    console.warn("[outcomeSync] Failed to sync flap outcome to server:", err);
  }
}
